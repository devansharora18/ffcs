import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_MESSAGE_CHARS, chatRequestSchema } from '../src/lib/agent/schema';

const state = {
  requirements: [],
  constraints: {
    avoidDays: [],
    avoidWindows: [],
    preferredFaculty: [],
    avoidedFaculty: [],
  },
};

test('a full pasted allocation table fits inside the input limit', () => {
  const table = 'BITE311L\tHuman Computer Interaction\tTH\t3\t0\t0\t0\t3\tDE\tE1+TE1\n'.repeat(900);
  assert.ok(table.length > 50_000);

  const parsed = chatRequestSchema.safeParse({
    messages: [{ role: 'user', content: table }],
    state,
  });

  assert.equal(parsed.success, true);
});

test('a message above the ceiling is rejected', () => {
  const parsed = chatRequestSchema.safeParse({
    messages: [{ role: 'user', content: 'x'.repeat(MAX_MESSAGE_CHARS + 1) }],
    state,
  });

  assert.equal(parsed.success, false);
});
