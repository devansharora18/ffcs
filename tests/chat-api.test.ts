import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import test, { before } from 'node:test';

type CapturedRequest = { messages: { role: string; content?: unknown }[] };

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

/**
 * The chat route requires a signed session cookie. GET issues it.
 */
let cookie = '';

before(async () => {
  // Pin the signing key so the cookie survives the API-key changes below.
  process.env.SESSION_SECRET = 'test-secret';
  const { GET } = await import('../src/app/api/chat/route');
  cookie = (GET().headers.get('set-cookie') ?? '').split(';')[0];
});

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
        headers: { 'content-type': 'application/json', cookie },
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
    assert.match(String(toolMessage.content ?? ''), /BCSE202L/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('an attached image is forwarded as an image part on the newest turn only', async () => {
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
        headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'read this',
              images: ['data:image/png;base64,iVBORw0KGgo='],
            },
          ],
          state: body.state,
        }),
      }),
    );

    await response.text();

    const sent = requests[0].messages.find((message) => message.role === 'user');
    assert.ok(Array.isArray(sent?.content));
    const parts = sent.content as { type: string }[];
    assert.ok(parts.some((part) => part.type === 'image_url'));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('chat rejects a request without a session cookie', async () => {
  process.env.OPENCODE_API_KEY = 'test-key';
  const { POST } = await import('../src/app/api/chat/route');

  const response = await POST(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

  assert.equal(response.status, 401);
});

test('chat rejects a cross-site origin', async () => {
  process.env.OPENCODE_API_KEY = 'test-key';
  const { POST } = await import('../src/app/api/chat/route');

  const response = await POST(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
        origin: 'https://evil.example',
      },
      body: JSON.stringify(body),
    }),
  );

  assert.equal(response.status, 403);
});

test('chat rejects an oversized body before parsing it', async () => {
  process.env.OPENCODE_API_KEY = 'test-key';
  const { POST } = await import('../src/app/api/chat/route');

  const response = await POST(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'x'.repeat(3_100_000) }],
        state: body.state,
      }),
    }),
  );

  assert.equal(response.status, 413);
});

test('chat refuses without a key instead of failing mid-stream', async () => {
  delete process.env.OPENCODE_API_KEY;
  const { POST } = await import('../src/app/api/chat/route');

  const response = await POST(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
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
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ messages: [{}], state: {} }),
    }),
  );

  assert.equal(response.status, 400);
});
