import assert from 'node:assert/strict';
import test from 'node:test';

import { findConflicts, gapMinutes, isAllowed } from '../src/lib/ffcs/conflicts';
import { offeringCells } from '../src/lib/ffcs/grid';
import { emptyConstraints, type PlacedOffering } from '../src/lib/ffcs/types';

function place(code: string, slots: string[], faculty = 'SOMEONE'): PlacedOffering {
  return {
    id: `${code}~${slots.join('+')}~${faculty}`,
    code,
    title: code,
    kind: 'theory',
    faculty,
    venue: null,
    slots,
    cells: offeringCells(slots),
    credits: null,
  };
}

test('theory slots on different cells do not clash', () => {
  assert.equal(findConflicts([place('A', ['A1']), place('B', ['B1'])]).length, 0);
});

test('the same slot clashes', () => {
  const conflicts = findConflicts([place('A', ['A1']), place('B', ['A1'])]);
  assert.equal(conflicts.length, 2);
  assert.deepEqual(
    conflicts.map((c) => [c.day, c.start, c.end]),
    [
      ['MON', 480, 530],
      ['WED', 540, 590],
    ],
  );
});

test('a lab running to 9:40 clashes with a 9:00 theory hour', () => {
  // This is the case a period-index model misses: L1+L2 ends at 9:40 and F1 starts at 9:00.
  const conflicts = findConflicts([place('LAB', ['L1', 'L2']), place('THEORY', ['F1'])]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].day, 'MON');
  assert.equal(conflicts[0].start, 540);
  assert.equal(conflicts[0].end, 580);
});

test('an afternoon lab and a morning theory slot coexist', () => {
  assert.equal(findConflicts([place('LAB', ['L3', 'L4']), place('THEORY', ['A1'])]).length, 0);
});

test('an embedded course occupies its theory and lab blocks', () => {
  const theory = place('BCSE101E', ['TBB2']);
  const lab = place('BCSE101E', ['L5', 'L6', 'L27', 'L28']);
  assert.equal(findConflicts([theory, lab]).length, 0);
  assert.equal(theory.cells.length + lab.cells.length, 5);
});

test('a course with no scheduled hours never clashes', () => {
  const unscheduled = place('BSSC102N', []);
  assert.equal(findConflicts([unscheduled, place('A', ['A1'])]).length, 0);
});

test('avoided faculty is a hard filter, case and spacing insensitive', () => {
  const constraints = { ...emptyConstraints(), avoidedFaculty: ['  vasanthi p '] };
  const entry = place('BCSE101E', ['TBB2'], 'VASANTHI P');
  assert.equal(isAllowed(entry, constraints), false);
});

test('avoided day rejects every offering touching that day', () => {
  const constraints = { ...emptyConstraints(), avoidDays: [0] };
  assert.equal(isAllowed(place('A', ['A1']), constraints), false);
  assert.equal(isAllowed(place('B', ['B1']), constraints), true);
});

test('avoided window is applied to the real interval, not the period index', () => {
  const constraints = {
    ...emptyConstraints(),
    avoidWindows: [{ start: 8 * 60, end: 9 * 60 }],
  };
  assert.equal(isAllowed(place('LAB', ['L1', 'L2']), constraints), false);
  assert.equal(isAllowed(place('LAB', ['L3', 'L4']), constraints), true);
});

test('gaps count only idle time between classes on the same day', () => {
  // A1 = Mon 08:00-08:50 and Wed 09:00-09:50; F1 = Mon 09:00-09:50.
  assert.equal(gapMinutes([place('A', ['A1'])]), 0);
  assert.equal(gapMinutes([place('A', ['A1']), place('B', ['TB1'])]), 130);
});
