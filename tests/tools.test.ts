import assert from 'node:assert/strict';
import test from 'node:test';

import { catalog } from '../src/lib/ffcs/catalog-data';
import type { Catalog, CatalogCourse } from '../src/lib/ffcs/catalog';
import { categoriesIn, listByCategory } from '../src/lib/ffcs/search';
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
    creditsEstimated: false,
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
  const all = run('search_courses', { query: 'cryptography' }, emptyState(), catalog);
  const payload = JSON.parse(all.text) as { code: string; schools: string[] }[];

  const crypto = payload.find((course) => course.code === 'BACSE319');
  assert.deepEqual(crypto?.schools, ["SCORE ('25 Batch)"]);

  const filtered = run(
    'search_courses',
    { query: 'cryptography', school: 'SCORE' },
    emptyState(),
    catalog,
  );
  const only = JSON.parse(filtered.text) as { code: string }[];
  assert.ok(only.some((course) => course.code === 'BACSE319'));

  const wrongSchool = run(
    'search_courses',
    { query: 'cryptography', school: 'SCOPE' },
    emptyState(),
    catalog,
  );
  assert.doesNotMatch(wrongSchool.text, /BACSE319/);
});

test('add_course refuses a course from another school and names the right one', () => {
  const result = run(
    'add_course',
    { code: 'BACSE319', school: 'SCOPE' },
    emptyState(),
    catalog,
  );

  assert.equal(result.ops.length, 0);
  assert.equal(result.state.requirements.length, 0);
  assert.match(result.text, /SCORE/);
});

test('add_course accepts the course when the school matches', () => {
  const result = run(
    'add_course',
    { code: 'BACSE319', school: 'SCORE' },
    emptyState(),
    catalog,
  );
  assert.equal(result.state.requirements.length, 1);
  assert.match(result.text, /SCORE/);
});

test('add_course reserves an exact slot when one is given', () => {
  const result = run('add_course', { code: 'BCSE202L', slot: 'B1+TB1' });
  assert.deepEqual(result.state.requirements[0].slots, ['B1', 'TB1']);
  assert.equal(result.state.requirements[0].offeringId, undefined);
  assert.match(result.text, /B1\+TB1/);
});

test('add_course rejects a slot the course does not run', () => {
  const result = run('add_course', { code: 'BCSE202L', slot: 'Z9+Z10' });
  assert.equal(result.ops.length, 0);
  assert.match(result.text, /no Z9\+Z10 offering/);
});

test('add_courses adds many at once and reports what it skipped', () => {
  const result = run(
    'add_courses',
    {
      courses: [
        { code: 'BCSE202L', slot: 'B1+TB1' },
        { code: 'NOPE999' },
        { code: 'BITE303L', slot: 'ZZ9' },
        { code: 'BITE305L' },
      ],
    },
    emptyState(),
    catalog,
  );

  assert.deepEqual(
    result.state.requirements.map((requirement) => requirement.courseCode).sort(),
    ['BCSE202L', 'BITE305L'],
  );
  assert.match(result.text, /Unknown codes: NOPE999/);
  assert.match(result.text, /Slot not offered: BITE303L ZZ9/);
});

test('add_custom_course stores a manual entry for a code the catalog lacks', () => {
  const result = run(
    'add_custom_course',
    { code: 'BITE410L', title: 'Machine Learning', faculty: 'PROF X', slots: 'B1+TB1' },
    emptyState(),
    catalog,
  );

  assert.equal(result.state.requirements.length, 1);
  assert.deepEqual(result.state.requirements[0].custom, {
    title: 'Machine Learning',
    faculty: 'PROF X',
    slots: ['B1', 'TB1'],
  });
  assert.match(result.text, /manual entry/);
});

test('add_custom_course refuses an unknown slot', () => {
  const result = run(
    'add_custom_course',
    { code: 'NEW101', title: 'X', faculty: 'Y', slots: 'ZZ9' },
    emptyState(),
    catalog,
  );

  assert.equal(result.ops.length, 0);
  assert.match(result.text, /Unknown slot/);
});

test('add_custom_course defers when both the slot and the teacher are real', () => {
  const result = run(
    'add_custom_course',
    { code: 'BCSE202L', title: 'x', faculty: 'IYAPPAN P', slots: 'B1+TB1' },
    emptyState(),
    catalog,
  );

  assert.equal(result.ops.length, 0);
  assert.match(result.text, /Use add_course instead/);
});

test('add_custom_course allows a real slot with a teacher the catalog does not list', () => {
  const result = run(
    'add_custom_course',
    { code: 'BCSE202L', title: 'Data Structures', faculty: 'PROF X', slots: 'B1+TB1' },
    emptyState(),
    catalog,
  );

  assert.equal(result.state.requirements.length, 1);
  assert.equal(result.state.requirements[0].custom?.faculty, 'PROF X');
  assert.deepEqual(result.state.requirements[0].custom?.slots, ['B1', 'TB1']);
});

test('add_custom_course allows a real code with a slot only the user wants', () => {
  const result = run(
    'add_custom_course',
    { code: 'BITE311L', title: 'Software Engineering', faculty: 'PROF X', slots: 'E1+TE1' },
    emptyState(),
    catalog,
  );

  assert.equal(result.state.requirements.length, 1);
  assert.deepEqual(result.state.requirements[0].custom?.slots, ['E1', 'TE1']);
  assert.match(result.text, /catalog lists BITE311L with other slots/);
});

test('the solve summary reports credits against the 27.5 cap', () => {
  const result = run('add_course', { code: 'BCSE202L' }, emptyState(), catalog);
  assert.match(result.text, /Credits [\d.]+\+?\/27\.5/);
});

test('add_from_table parses a pasted allocation table once per code', () => {
  const table = [
    'COURSE CODE\tCOURSE TITLE\tTYPE\tL\tT\tP\tJ\tC\tCAT\tslot',
    'BITE306L\tTheory of Computation\tTH\t3\t0\t0\t0\t4\tDC\tA1+TA1+TAA1',
    'BITE306L\tTheory of Computation\tTH\t3\t0\t0\t0\t4\tDC\tA2+TA2+TAA2',
    'BITE303L\tOperating Systems\tTH\t3\t0\t0\t0\t3\tDC\tG1+TG1',
    'NOPE999\tUnknown Course\tTH\t3\t0\t0\t0\t3\tDC\tA1',
  ].join('\n');

  const result = run('add_from_table', { table }, emptyState(), catalog);

  assert.deepEqual(
    result.state.requirements.map((requirement) => requirement.courseCode).sort(),
    ['BITE303L', 'BITE306L'],
  );
  assert.deepEqual(result.state.requirements.find((r) => r.courseCode === 'BITE306L')?.slots, [
    'A1',
    'TA1',
    'TAA1',
  ]);
  assert.match(result.text, /Unknown codes: NOPE999/);
});

test('set_credits overrides an estimated value', () => {
  const added = run('add_course', { code: 'BCSE202L' }, emptyState(), catalog);
  const result = run('set_credits', { code: 'BCSE202L', credits: 4.5 }, added.state, catalog);

  assert.equal(result.state.requirements[0].credits, 4.5);
  assert.match(result.text, /4\.5 credits/);
});

test('set_credits refuses a course that is not in the timetable', () => {
  const result = run('set_credits', { code: 'BCSE202L', credits: 3 }, emptyState(), catalog);
  assert.equal(result.ops.length, 0);
  assert.match(result.text, /not in the timetable/);
});

test('domain facets and the subject list agree', () => {
  const categories = categoriesIn(catalog, 'SCORE');
  assert.ok(categories.length > 0);

  const courses = listByCategory(catalog, categories[0], 'SCORE');
  assert.ok(courses.length > 0);
  assert.ok(
    courses.every((course) =>
      course.schools.some((name) => name === 'SCORE' || name.startsWith('SCORE (')),
    ),
  );
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
