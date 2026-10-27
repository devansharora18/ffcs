/**
 * Verifies the OpenCode inference setup: key, model id, and tool calling.
 * Run with: npm run agent:check
 */
import OpenAI from 'openai';

async function main() {
  const apiKey = process.env.OPENCODE_API_KEY;
  const baseURL = process.env.OPENCODE_BASE_URL ?? 'https://opencode.ai/inference/openai/v1';
  const model = process.env.OPENCODE_MODEL ?? 'deepseek-v4.1-flash';

  if (!apiKey) {
    console.error('OPENCODE_API_KEY is not set');
    process.exitCode = 1;
    return;
  }

  console.log(`baseURL  ${baseURL}`);
  console.log(`model    ${model}`);
  console.log(`key      ${apiKey.slice(0, 6)}… (${apiKey.length} chars)`);

  const client = new OpenAI({ apiKey, baseURL, timeout: 60_000 });

  const models = await client.models.list().catch((error: Error) => {
    console.log(`models.list failed: ${error.message}`);
    return null;
  });

  if (models) {
    const ids = models.data.map((item) => item.id).sort();
    console.log(`models   ${ids.length} available`);
    console.log(`         ${ids.slice(0, 12).join(', ')}`);
  }

  const started = Date.now();
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
    max_tokens: 20,
  });

  console.log(`reply    ${JSON.stringify(response.choices[0]?.message?.content)}`);
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
