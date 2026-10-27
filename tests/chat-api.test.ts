import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

type CapturedRequest = { messages: { role: string; content?: string }[] };

function fakeOpenAI(requests: CapturedRequest[]) {
  return http.createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      const parsed = JSON.parse(body) as CapturedRequest;
      requests.push(parsed);
      const round = requests.length;

      response.writeHead(200, { 'content-type': 'text/event-stream' });
      const send = (delta: unknown, finish: string | null = null) => {
        response.write(
          `data: ${JSON.stringify({
            id: 'chatcmpl-test',
            object: 'chat.completion.chunk',
            created: 1,
            model: 'test-model',
            choices: [{ index: 0, delta, finish_reason: finish }],
          })}\n\n`,
        );
      };

      if (round === 1) {
        send({
          tool_calls: [
            {
              index: 0,
              id: 'call_1',
              type: 'function',
              function: { name: 'search_courses', arguments: '{"query":"data' },
            },
          ],
        });
        send({ tool_calls: [{ index: 0, function: { arguments: ' structures"}' } }] });
        send({}, 'tool_calls');
      } else {
        send({ content: 'Found BCSE202L.' });
        send({}, 'stop');
      }

      response.write('data: [DONE]\n\n');
      response.end();
    });
  });
}

const body = {
  messages: [{ role: 'user', content: 'find data structures' }],
  state: {
    requirements: [],
    constraints: {
      avoidDays: [],
      avoidWindows: [],
      preferredFaculty: [],
      avoidedFaculty: [],
    },
  },
};

test('chat streams a tool round, then the answer, then the state', async () => {
  const requests: CapturedRequest[] = [];
  const server = fakeOpenAI(requests);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;

  process.env.OPENCODE_API_KEY = 'test-key';
  process.env.OPENCODE_BASE_URL = `http://127.0.0.1:${port}/v1`;
  process.env.OPENCODE_MODEL = 'test-model';

  try {
    const { POST } = await import('../src/app/api/chat/route');
    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

    assert.equal(response.status, 200);
    const text = await response.text();

    assert.match(text, /event: text/);
    assert.match(text, /Found BCSE202L\./);
    assert.match(text, /event: done/);
    assert.match(text, /"state"/);
    assert.match(text, /"ops"/);

    assert.equal(requests.length, 2);
    const toolMessage = requests[1].messages.find((message) => message.role === 'tool');
    assert.ok(toolMessage, 'the second round must carry the tool result');
    assert.match(toolMessage.content ?? '', /BCSE202L/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('chat refuses without a key instead of failing mid-stream', async () => {
  delete process.env.OPENCODE_API_KEY;
  const { POST } = await import('../src/app/api/chat/route');

  const response = await POST(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

  assert.equal(response.status, 503);
});

test('chat rejects a malformed body', async () => {
  process.env.OPENCODE_API_KEY = 'test-key';
  const { POST } = await import('../src/app/api/chat/route');

  const response = await POST(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{}], state: {} }),
    }),
  );

  assert.equal(response.status, 400);
});
