import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { agentConfig, type AgentConfig } from '@/lib/agent/config';
import { SYSTEM_PROMPT } from '@/lib/agent/prompt';
import { chatRequestSchema, type ChatRequest } from '@/lib/agent/schema';
import { executeTool } from '@/lib/agent/tools';
import { toolDefinitions } from '@/lib/agent/tools-schema';
import { catalog } from '@/lib/ffcs/catalog-data';
import type { StateOp } from '@/lib/ffcs/ops';
import type { TimetableState } from '@/lib/ffcs/types';

export const runtime = 'nodejs';

const MAX_ROUNDS = 6;
const MAX_TOOL_CHARS = 4000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;

// Best effort only: one process, one bucket. Swap for a shared store before
// this runs on more than one instance.
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_REQUESTS;
}

type Send = (event: string, data: unknown) => void;

async function runAgent(
  config: AgentConfig,
  body: ChatRequest,
  send: Send,
): Promise<void> {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 60_000 });
  const history = body.messages.slice(-12);

  let state: TimetableState = body.state;
  const ops: StateOp[] = [];
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((message) => ({ role: message.role, content: message.content })),
  ];

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const stream = await client.chat.completions.create({
      model: config.model,
      messages,
      tools: toolDefinitions,
      temperature: 0.2,
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

  send('done', { state, ops });
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

  const key =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (rateLimited(key)) {
    return Response.json({ error: 'rate_limited' }, { status: 429 });
  }

  const parsed = chatRequestSchema.safeParse(await request.json().catch(() => null));
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
        const message = error instanceof Error ? error.message : 'agent failed';
        send('error', { message: message.slice(0, 300) });
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

export function GET(): Response {
  return Response.json({ configured: agentConfig() !== null });
}
