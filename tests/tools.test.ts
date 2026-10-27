import assert from 'node:assert/strict';
import test from 'node:test';

import { catalog } from '../src/lib/ffcs/catalog-data';
import type { Catalog, CatalogCourse } from '../src/lib/ffcs/catalog';
import { applyOps } from '../src/lib/ffcs/ops';
import { emptyState } from '../src/lib/ffcs/types';
import { executeTool } from '../src/lib/agent/tools';

function fixtureCourse(
  code: string,
  title: string,
  offers: { slots: string[]; faculty: string }[],
): CatalogCourse {
  return {
    code,
    title,
    kind: 'theory',
    credits: null,
    schools: [],
    categories: [],
    offerings: offers.map((offer) => ({
      id: `${code}~${offer.slots.join('+')}~${offer.faculty}~`,
      faculty: offer.faculty,
      venue: null,
      slots: offer.slots,
    })),
  };
}

const fixture: Catalog = {
  campus: 'Vellore',
  term: null,
  source: 'test',
  stats: { courses: 3, offerings: 4, faculties: 4 },
  courses: [
    fixtureCourse('BCSE202L', 'Data Structures and Algorithms', [
      { slots: ['B1', 'TB1'], faculty: 'IYAPPAN P' },
      { slots: ['B2', 'TB2'], faculty: 'SIVAPRASAD DARLA' },
    ]),
    fixtureCourse('CLASH1', 'Only A1', [{ slots: ['A1'], faculty: 'A TEACHER' }]),
    fixtureCourse('CLASH2', 'Also A1', [{ slots: ['A1'], faculty: 'B TEACHER' }]),
  ],
};

const run = (name: string, args: unknown, state = emptyState(), cat = fixture) =>
  executeTool(name, args, { catalog: cat, state });

test('search matches the real catalog by title', () => {
  const result = run('search_courses', { query: 'data structures' }, emptyState(), catalog);
  assert.match(result.text, /BCSE202L/);
});

test('search matches faculty names', () => {
  const result = run('search_courses', { query: 'IYAPPAN' }, emptyState(), catalog);
  assert.match(result.text, /IYAPPAN/);
});

test('search results carry the school, and the school filter is authoritative', () => {
  const all = run('search_courses', { query: 'theory of computation' }, emptyState(), catalog);
  const payload = JSON.parse(all.text) as { code: string; schools: string[] }[];

  const scope = payload.find((course) => course.code === 'BCSE304L');
  const score = payload.find((course) => course.code === 'BITE306L');
  assert.deepEqual(scope?.schools, ['SCOPE']);
  assert.deepEqual(score?.schools, ['SCORE']);

  const filtered = run(
    'search_courses',
    { query: 'theory of computation', school: 'SCORE' },
    emptyState(),
    catalog,
  );
  const only = JSON.parse(filtered.text) as { code: string }[];
  assert.ok(only.every((course) => course.code !== 'BCSE304L'));
  assert.ok(only.some((course) => course.code === 'BITE306L'));
});

test('add_course refuses a course from another school and names the right one', () => {
  const result = run(
    'add_course',
    { code: 'BCSE304L', school: 'SCORE' },
    emptyState(),
    catalog,
  );

  assert.equal(result.ops.length, 0);
  assert.equal(result.state.requirements.length, 0);
  assert.match(result.text, /SCOPE/);
  assert.match(result.text, /BITE306L/);
});

test('add_course accepts the course when the school matches', () => {
  const result = run(
    'add_course',
    { code: 'BITE306L', school: 'SCORE' },
    emptyState(),
    catalog,
  );
  assert.equal(result.state.requirements.length, 1);
  assert.match(result.text, /SCORE/);
});

test('who_teaches returns real faculty for a real slot', () => {
  const result = run('who_teaches', { slot: 'A1' }, emptyState(), catalog);
  const payload = JSON.parse(result.text) as { count: number; faculty: { faculty: string }[] };
  assert.ok(payload.count > 0);
  assert.ok(payload.faculty.length > 0);
});

test('who_teaches rejects a slot that does not exist', () => {
  const result = run('who_teaches', { slot: 'ZZ9' });
  assert.match(result.text, /Unknown slot/);
});

test('list_offerings shows faculty and slots', () => {
  const result = run('list_offerings', { code: 'BCSE202L' });
  const payload = JSON.parse(result.text) as { offerings: { faculty: string; slots: string }[] };
  assert.equal(payload.offerings.length, 2);
  assert.equal(payload.offerings[0].slots, 'B1+TB1');
});

test('add_course pins the offering when the faculty is unambiguous', () => {
  const result = run('add_course', { code: 'BCSE202L', faculty: 'IYAPPAN' });
  assert.equal(result.ops.length, 1);
  assert.equal(result.state.requirements.length, 1);
  assert.match(result.state.requirements[0].offeringId ?? '', /IYAPPAN/);
});

test('add_course asks instead of guessing when several faculty match', () => {
  const result = run('add_course', { code: 'BCSE202L', faculty: 'A' });
  assert.equal(result.ops.length, 0);
  assert.match(result.text, /Several/);
});

test('adding the same course twice is a no-op', () => {
  const first = run('add_course', { code: 'BCSE202L', faculty: 'IYAPPAN' });
  const second = run('add_course', { code: 'BCSE202L' }, first.state);
  assert.equal(second.ops.length, 0);
  assert.match(second.text, /already in the timetable/);
});

test('remove_course drops the requirement', () => {
  const added = run('add_course', { code: 'BCSE202L', faculty: 'IYAPPAN' });
  const removed = run('remove_course', { code: 'BCSE202L' }, added.state);
  assert.equal(removed.state.requirements.length, 0);
});

test('set_constraints parses day names and HH:MM windows', () => {
  const result = run('set_constraints', {
    avoidDays: ['mon', 'tue'],
    avoidWindows: [{ start: '08:00', end: '09:00' }],
  });

  assert.deepEqual(result.state.constraints.avoidDays, [0, 1]);
  assert.deepEqual(result.state.constraints.avoidWindows, [{ start: 480, end: 540 }]);
});

test('add_course reports the clash when two courses only share one slot', () => {
  const first = run('add_course', { code: 'CLASH1' });
  const second = run('add_course', { code: 'CLASH2' }, first.state);

  assert.match(second.text, /No clash-free|Forced clashes|could not/i);
});

test('ops from a tool reproduce the same state on the client', () => {
  const result = run('add_course', { code: 'BCSE202L', faculty: 'IYAPPAN' });
  const replayed = applyOps(emptyState(), result.ops);
  assert.deepEqual(replayed, result.state);
});
