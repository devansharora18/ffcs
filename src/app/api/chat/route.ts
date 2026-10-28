import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { agentConfig, type AgentConfig } from '@/lib/agent/config';
import { SYSTEM_PROMPT } from '@/lib/agent/prompt';
import {
  MAX_HISTORY_CHARS,
  chatRequestSchema,
  type ChatRequest,
} from '@/lib/agent/schema';
import { issueSession, readSession, sameOrigin } from '@/lib/agent/session';
import { executeTool } from '@/lib/agent/tools';
import { toolDefinitions } from '@/lib/agent/tools-schema';
import { catalog } from '@/lib/ffcs/catalog-data';
import { solveTimetable } from '@/lib/ffcs/solver';
import type { StateOp } from '@/lib/ffcs/ops';
import type { TimetableState } from '@/lib/ffcs/types';

export const runtime = 'nodejs';

const MAX_ROUNDS = 4;
const MAX_TOOL_CHARS = 4000;
const MAX_OUTPUT_TOKENS = 1200;
const MAX_BODY_BYTES = 3_000_000;
const WINDOW_MS = 10 * 60 * 1000;
/** Per session cookie, and a second ceiling for the whole isolate. */
const MAX_REQUESTS = 15;
const MAX_REQUESTS_PER_ISOLATE = 120;

// Best effort only: one process, one bucket. Swap for a shared store before
// this runs on more than one instance.
const buckets = new Map<string, { count: number; resetAt: number }>();

function overLimit(key: string, max: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > max;
}

type Send = (event: string, data: unknown) => void;

type BodyResult = { ok: true; value: unknown } | { ok: false; tooLarge: boolean };

/**
 * Reads the body with a byte cap instead of trusting Content-Length, which is
 * absent on chunked requests and trivially forged.
 */
async function readBody(request: Request, max: number): Promise<BodyResult> {
  if (!request.body) return { ok: false, tooLarge: false };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;
      if (total > max) {
        await reader.cancel();
        return { ok: false, tooLarge: true };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, tooLarge: false };
  }

  try {
    return { ok: true, value: JSON.parse(Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8')) };
  } catch {
    return { ok: false, tooLarge: false };
  }
}

function describeAgentError(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'agent failed';

  if (/insufficient account funds/i.test(raw)) {
    return 'The inference account is out of credit. Top up OpenCode, then try again.';
  }
  if (/model is unavailable/i.test(raw)) {
    return 'That model is not available on this account. Set OPENCODE_MODEL in .env.';
  }
  if (/401|invalid api key/i.test(raw)) {
    return 'The API key was rejected. Check OPENCODE_API_KEY in .env.';
  }
  if (/429|rate limit/i.test(raw)) {
    return 'The model is rate limited right now. Wait a minute and retry.';
  }
  if (/connection error|fetch failed|econnreset|etimedout|socket hang up|other side closed/i.test(raw)) {
    return 'Lost the connection to the model provider. Retry in a moment.';
  }
  if (/timed out|timeout|aborted/i.test(raw)) {
    return 'The model took too long to answer. Retry, or ask for less at once.';
  }

  return raw.slice(0, 300);
}

async function runAgent(
  config: AgentConfig,
  body: ChatRequest,
  send: Send,
): Promise<void> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: 60_000,
    defaultHeaders: { 'x-opencode-session': config.sessionId },
  });
  // Keep the newest turns within a character budget; the last message always
  // survives so a large pasted table is never cut in half.
  const history: typeof body.messages = [];
  let budget = MAX_HISTORY_CHARS;
  for (let index = body.messages.length - 1; index >= 0; index -= 1) {
    const message = body.messages[index];
    if (history.length > 0 && message.content.length > budget) break;
    history.unshift(message);
    budget -= message.content.length;
  }
  const lastUserIndex = history.map((message) => message.role).lastIndexOf('user');

  let state: TimetableState = body.state;
  const ops: StateOp[] = [];
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((message, index): ChatCompletionMessageParam => {
      // Images are expensive; only the newest user turn carries them.
      if (message.role === 'user' && message.images?.length && index === lastUserIndex) {
        return {
          role: 'user',
          content: [
            { type: 'text', text: message.content.trim() || 'Read this screenshot.' },
            ...message.images.map((url) => ({
              type: 'image_url' as const,
              image_url: { url },
            })),
          ],
        };
      }

      return { role: message.role, content: message.content };
    }),
  ];

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const stream = await client.chat.completions.create({
      model: config.model,
      messages,
      tools: toolDefinitions,
      temperature: 0.2,
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: true,
    });

    let content = '';
    const calls: { id: string; name: string; args: string }[] = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        content += delta.content;
        send('text', { delta: delta.content });
      }

      for (const call of delta.tool_calls ?? []) {
        const index = call.index ?? 0;
        calls[index] ??= { id: '', name: '', args: '' };
        if (call.id) calls[index].id = call.id;
        if (call.function?.name) calls[index].name += call.function.name;
        if (call.function?.arguments) calls[index].args += call.function.arguments;
      }
    }

    if (calls.length === 0) break;

    // Separate any pre-tool narration from the answer that follows the tool round.
    if (content.trim().length > 0) send('text', { delta: '\n\n' });

    messages.push({
      role: 'assistant',
      content: content || null,
      tool_calls: calls.map((call) => ({
        id: call.id,
        type: 'function' as const,
        function: { name: call.name, arguments: call.args },
      })),
    });

    for (const call of calls) {
      let args: unknown = {};
      try {
        args = JSON.parse(call.args || '{}');
      } catch {
        args = {};
      }

      const outcome = executeTool(call.name, args, { catalog, state });
      state = outcome.state;
      ops.push(...outcome.ops);

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: outcome.text.slice(0, MAX_TOOL_CHARS),
      });
    }
  }

  send('done', {
    state,
    ops,
    result: solveTimetable(catalog, state, { limit: 5 }),
  });
}

export async function POST(request: Request): Promise<Response> {
  const config = agentConfig();
  if (!config) {
    return Response.json(
      {
        error: 'agent_unavailable',
        message: 'Set OPENCODE_API_KEY in .env to enable the agent.',
      },
      { status: 503 },
    );
  }

  // The endpoint spends real credit, so it is not open to the world.
  if (!sameOrigin(request)) {
    return Response.json({ error: 'bad_origin' }, { status: 403 });
  }

  const session = readSession(request);
  if (!session) {
    return Response.json({ error: 'no_session' }, { status: 401 });
  }

  // Cheap reject, then a streamed read so a lying or missing length cannot
  // force the whole body into memory.
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return Response.json({ error: 'payload_too_large' }, { status: 413 });
  }

  if (overLimit(session, MAX_REQUESTS) || overLimit('isolate', MAX_REQUESTS_PER_ISOLATE)) {
    return Response.json({ error: 'rate_limited' }, { status: 429 });
  }

  const raw = await readBody(request, MAX_BODY_BYTES);
  if (!raw.ok) {
    return Response.json(
      { error: raw.tooLarge ? 'payload_too_large' : 'bad_request' },
      { status: raw.tooLarge ? 413 : 400 },
    );
  }

  const parsed = chatRequestSchema.safeParse(raw.value);
  if (!parsed.success) {
    return Response.json({ error: 'bad_request', issues: parsed.error.issues }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send: Send = (event, data) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await runAgent(config, parsed.data, send);
      } catch (error) {
        send('error', { message: describeAgentError(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}

/** Hands out the signed session cookie the POST endpoint requires. */
export function GET(): Response {
  const session = issueSession();
  return Response.json(
    { configured: agentConfig() !== null },
    { headers: { 'set-cookie': session.header } },
  );
}
