import assert from 'node:assert/strict';
import test from 'node:test';

import type { Catalog, CatalogCourse } from '../src/lib/ffcs/catalog';
import { solveTimetable } from '../src/lib/ffcs/solver';
import {
  emptyConstraints,
  type TimetableConstraints,
  type TimetableState,
} from '../src/lib/ffcs/types';

type FixtureOffer = { slots: string[]; faculty: string };

function course(
  code: string,
  offers: FixtureOffer[],
  kind: CatalogCourse['kind'] = 'theory',
): CatalogCourse {
  return {
    code,
    title: code,
    kind,
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

function catalogOf(...courses: CatalogCourse[]): Catalog {
  return {
    campus: 'Vellore',
    term: null,
    source: 'test',
    stats: { courses: courses.length, offerings: 0, faculties: 0 },
    courses,
  };
}

function stateWith(
  codes: (string | { courseCode: string; offeringId: string })[],
  constraints: TimetableConstraints = emptyConstraints(),
): TimetableState {
  return {
    requirements: codes.map((code) =>
      typeof code === 'string' ? { courseCode: code } : code,
    ),
    constraints,
  };
}

test('places courses that never meet', () => {
  const catalog = catalogOf(
    course('A', [{ slots: ['A1'], faculty: 'X' }]),
    course('B', [{ slots: ['B1'], faculty: 'Y' }]),
  );

  const result = solveTimetable(catalog, stateWith(['A', 'B']));
  assert.equal(result.solutions.length, 1);
  assert.equal(result.solutions[0].entries.length, 2);
  assert.equal(result.unsolved.length, 0);
});

test('reports conflicts when every option collides', () => {
  const catalog = catalogOf(
    course('A', [{ slots: ['A1'], faculty: 'X' }]),
    course('B', [{ slots: ['A1'], faculty: 'Y' }]),
  );

  const result = solveTimetable(catalog, stateWith(['A', 'B']));
  assert.equal(result.solutions.length, 0);
  assert.ok(result.conflicts.length > 0);
});

test('prefers a requested faculty over the same slot pattern', () => {
  const catalog = catalogOf(
    course('A', [
      { slots: ['A1'], faculty: 'PREFERRED' },
      { slots: ['A1'], faculty: 'OTHER' },
    ]),
  );

  const result = solveTimetable(
    catalog,
    stateWith(['A'], { ...emptyConstraints(), preferredFaculty: ['preferred'] }),
  );

  assert.equal(result.solutions[0].entries[0].faculty, 'PREFERRED');
});

test('avoiding a day makes the course unsolvable rather than silently placed', () => {
  const catalog = catalogOf(course('A', [{ slots: ['A1'], faculty: 'X' }]));

  const result = solveTimetable(
    catalog,
    stateWith(['A'], { ...emptyConstraints(), avoidDays: [0] }),
  );

  assert.equal(result.solutions.length, 0);
  assert.deepEqual(result.unsolved, ['A']);
});

test('a pinned offering is honoured exactly', () => {
  const catalog = catalogOf(
    course('A', [
      { slots: ['A1'], faculty: 'X' },
      { slots: ['C1'], faculty: 'Y' },
    ]),
  );
  const pinned = catalog.courses[0].offerings[1].id;

  const result = solveTimetable(
    catalog,
    stateWith([{ courseCode: 'A', offeringId: pinned }]),
  );

  assert.equal(result.solutions[0].entries[0].id, pinned);
});

test('an unknown course code is reported, not skipped', () => {
  const catalog = catalogOf(course('A', [{ slots: ['A1'], faculty: 'X' }]));

  const result = solveTimetable(catalog, stateWith(['A', 'NOPE']));
  assert.deepEqual(result.unsolved.sort(), ['NOPE']);
  assert.equal(result.solutions.length, 1);
});

test('an 8am slot loses to the same shape in the afternoon', () => {
  const catalog = catalogOf(
    course('A', [
      { slots: ['A1'], faculty: 'EARLY' },
      { slots: ['A2'], faculty: 'LATE' },
    ]),
  );

  const result = solveTimetable(catalog, stateWith(['A']));
  assert.equal(result.solutions[0].entries[0].faculty, 'LATE');
  assert.equal(result.solutions[0].parts.earliness, 0);
  assert.ok(result.solutions[1].parts.earliness < 0);
});

test('solutions are ranked by score and capped by the limit', () => {
  const catalog = catalogOf(
    course('A', [
      { slots: ['A1'], faculty: 'X' },
      { slots: ['A2'], faculty: 'X' },
    ]),
    course('B', [
      { slots: ['B1'], faculty: 'Y' },
      { slots: ['B2'], faculty: 'Y' },
    ]),
  );

  const result = solveTimetable(catalog, stateWith(['A', 'B']), { limit: 3 });
  assert.equal(result.solutions.length, 3);

  const keys = new Set(
    result.solutions.map((solution) =>
      solution.entries.map((entry) => entry.id).sort().join('|'),
    ),
  );
  assert.equal(keys.size, 3);

  for (let i = 1; i < result.solutions.length; i += 1) {
    assert.ok(result.solutions[i - 1].score >= result.solutions[i].score);
  }
});

test('an avoided window rejects a lab that overlaps it', () => {
  const catalog = catalogOf(course('A', [{ slots: ['L1', 'L2'], faculty: 'X' }]));

  const result = solveTimetable(
    catalog,
    stateWith(['A'], { ...emptyConstraints(), avoidWindows: [{ start: 8 * 60, end: 9 * 60 }] }),
  );

  assert.deepEqual(result.unsolved, ['A']);
});

test('the search stays bounded on a wide problem', () => {
  const slots = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'];
  const catalog = catalogOf(
    ...['A', 'B', 'C', 'D', 'E', 'F'].map((code) =>
      course(code, slots.map((slot) => ({ slots: [slot], faculty: `${code}-${slot}` }))),
    ),
  );

  const result = solveTimetable(catalog, stateWith(['A', 'B', 'C', 'D', 'E', 'F']));
  assert.ok(result.nodes <= 200_000);
  assert.ok(result.solutions.length > 0);
});
