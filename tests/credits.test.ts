import assert from 'node:assert/strict';
import test from 'node:test';

import { CREDIT_LIMIT, creditSummary, formatCredits } from '../src/lib/ffcs/credits';
import type { PlacedOffering } from '../src/lib/ffcs/types';

function entry(credits: number | null): PlacedOffering {
  return {
    id: `C${credits}`,
    code: `C${credits}`,
    title: 'Course',
    kind: 'theory',
    faculty: 'X',
    venue: null,
    slots: ['A1'],
    cells: [{ day: 'MON', start: 480, end: 530 }],
    credits,
    creditsEstimated: false,
  };
}

test('the semester cap is 27.5 credits', () => {
  assert.equal(CREDIT_LIMIT, 27.5);
});

test('credits add up and the cap is a strict upper bound', () => {
  assert.equal(creditSummary([entry(20), entry(7.5)]).over, false);
  assert.equal(creditSummary([entry(20), entry(8)]).over, true);
  assert.deepEqual(creditSummary([]).total, 0);
});

test('an unknown credit is shown as a lower bound', () => {
  const summary = creditSummary([entry(20), entry(null)]);
  assert.equal(summary.complete, false);
  assert.equal(summary.total, 20);
  assert.equal(formatCredits(summary), '20+/27.5');
  assert.equal(summary.over, false);
});

test('complete totals format without the plus', () => {
  assert.equal(formatCredits(creditSummary([entry(27.5)])), '27.5/27.5');
});
