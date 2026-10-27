/**
 * Verifies the OpenCode inference setup: key, model id, and tool calling.
 * Run with: npm run agent:check
 */
import { randomUUID } from 'node:crypto';

import OpenAI from 'openai';

async function main() {
  const apiKey = process.env.OPENCODE_API_KEY;
  const baseURL = process.env.OPENCODE_BASE_URL ?? 'https://opencode.ai/zen/go/v1';
  const model = process.env.OPENCODE_MODEL ?? 'deepseek-v4.1-flash';

  if (!apiKey) {
    console.error('OPENCODE_API_KEY is not set');
    process.exitCode = 1;
    return;
  }

  console.log(`baseURL  ${baseURL}`);
  console.log(`model    ${model}`);
  console.log(`key      ${apiKey.slice(0, 6)}… (${apiKey.length} chars)`);

  const client = new OpenAI({
    apiKey,
    baseURL,
    timeout: 60_000,
    defaultHeaders: { 'x-opencode-session': process.env.OPENCODE_SESSION ?? randomUUID() },
  });

  const started = Date.now();
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
    max_tokens: 500,
  });

  const message = response.choices[0]?.message;
  console.log(`reply    ${JSON.stringify(message?.content)}`);
  console.log(`finish   ${response.choices[0]?.finish_reason}`);
  console.log(`latency  ${Date.now() - started} ms`);
  console.log(`usage    ${JSON.stringify(response.usage)}`);

  const toolResponse = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: 'What is the weather in Vellore?' }],
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get current weather for a city',
          parameters: {
            type: 'object',
            properties: { city: { type: 'string' } },
            required: ['city'],
          },
        },
      },
    ],
    max_tokens: 500,
  });

  const call = toolResponse.choices[0]?.message?.tool_calls?.[0];
  const fn = call && call.type === 'function' ? call.function : null;
  console.log(`tools    ${fn ? `ok → ${fn.name} ${fn.arguments}` : 'NOT SUPPORTED'}`);
  if (!fn) process.exitCode = 1;
}

void main().catch((error: Error) => {
  console.error(`failed: ${error.message}`);
  process.exitCode = 1;
});
