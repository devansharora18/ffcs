import type { Catalog, CatalogCourse } from './catalog';
import { findConflicts, gapMinutes, isAllowed } from './conflicts';
import { DAYS, slotCells } from './grid';
import type {
  PlacedOffering,
  Requirement,
  ScoreParts,
  Solution,
  SolveResult,
  TimetableConstraints,
  TimetableState,
} from './types';

/**
 * Soft-constraint weights. A 130-minute gap (−19.5) is treated as worse than
 * one extra day on campus (−12) and worse than a 60-minute 8am start (−15).
 */
export const WEIGHTS = {
  preferredFaculty: 50,
  gapMinute: 0.15,
  dayUsed: 12,
  earlyMinute: 0.25,
  lateMinute: 0.25,
  /** Same teacher for the theory and lab of one subject. */
  sameTeacher: 80,
  /** Theory in one half of the day, lab in the other. */
  splitDay: 30,
  /** Penalty when theory and lab land in the same half. */
  sameHalf: 20,
  /** Courses on the A1/B1 side vs the A2/B2 side (FAT exam days collide). */
  sideConflict: 18,
  /** Each extra building the week sends you to. */
  venueSpread: 6,
} as const;

const EARLY_CUTOFF = 9 * 60;
const LATE_CUTOFF = 17 * 60;
const DEFAULT_LIMIT = 5;
const DEFAULT_MAX_NODES = 200_000;

export type SolverGroup = {
  courseCode: string;
  /** One per distinct slot pattern, already filtered by hard constraints. */
  candidates: PlacedOffering[];
};

export type SolveOptions = {
  limit?: number;
  maxNodes?: number;
};

export function toPlaced(course: CatalogCourse, offeringId: string): PlacedOffering | undefined {
  const offering = course.offerings.find((candidate) => candidate.id === offeringId);
  if (!offering) return undefined;

  return {
    id: offering.id,
    code: course.code,
    title: course.title,
    kind: course.kind === 'unscheduled' ? 'theory' : course.kind,
    faculty: offering.faculty,
    venue: offering.venue,
    slots: offering.slots,
    cells: offering.slots.flatMap(slotCells),
  };
}

function signature(entry: PlacedOffering): string {
  return entry.cells
    .map((cell) => `${cell.day}:${cell.start}-${cell.end}`)
    .sort()
    .join(',');
}

/**
 * Builds the search groups: offerings that occupy identical time are collapsed
 * to the best-scoring one, so the search branches on slot patterns instead of
 * on the hundreds of faculty variants that share a pattern.
 */
export function buildGroups(
  catalog: Catalog,
  requirements: Requirement[],
  constraints: TimetableConstraints,
): { groups: SolverGroup[]; unsolved: string[] } {
  const byCode = new Map(catalog.courses.map((course) => [course.code, course]));
  const preferred = new Set(
    constraints.preferredFaculty.map((name) => name.trim().toLowerCase()),
  );
  const seen = new Set<string>();
  const groups: SolverGroup[] = [];
  const unsolved: string[] = [];

  for (const requirement of requirements) {
    if (seen.has(requirement.courseCode)) continue;
    seen.add(requirement.courseCode);

    // Manual entry: no catalog lookup, the user supplied the slots.
    if (requirement.custom) {
      const custom = requirement.custom;
      const slots = custom.slots.map((slot) => slot.trim().toUpperCase()).filter(Boolean);
      const cells = slots.flatMap(slotCells);

      if (slots.length === 0 || cells.length === 0) {
        unsolved.push(requirement.courseCode);
        continue;
      }

      const entry: PlacedOffering = {
        id: `custom~${requirement.courseCode}~${slots.join('+')}~${custom.faculty}`,
        code: requirement.courseCode,
        title: custom.title || requirement.courseCode,
        kind: slots.every((slot) => /^L\d+$/.test(slot)) ? 'lab' : 'theory',
        faculty: custom.faculty || 'MANUAL',
        venue: null,
        slots,
        cells,
      };

      if (!isAllowed(entry, constraints)) {
        unsolved.push(requirement.courseCode);
      } else {
        groups.push({ courseCode: requirement.courseCode, candidates: [entry] });
      }
      continue;
    }

    const course = byCode.get(requirement.courseCode);
    if (!course) {
      unsolved.push(requirement.courseCode);
      continue;
    }

    const ids = requirement.offeringId
      ? [requirement.offeringId]
      : course.offerings
          .filter(
            (offering) =>
              !requirement.slots ||
              offering.slots.join('+').toUpperCase() === requirement.slots.join('+').toUpperCase(),
          )
          .map((offering) => offering.id);

    const allowed = ids
      .map((id) => toPlaced(course, id))
      .filter((entry): entry is PlacedOffering => entry !== undefined)
      .filter((entry) => isAllowed(entry, constraints));

    const bestPerSignature = new Map<string, PlacedOffering>();
    for (const entry of allowed) {
      const key = signature(entry);
      const current = bestPerSignature.get(key);
      const rank = preferred.has(entry.faculty.trim().toLowerCase()) ? 1 : 0;
      const currentRank =
        current && preferred.has(current.faculty.trim().toLowerCase()) ? 1 : 0;
      if (!current || rank > currentRank) bestPerSignature.set(key, entry);
    }

    const candidates = [...bestPerSignature.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, entry]) => entry);

    if (candidates.length === 0) unsolved.push(requirement.courseCode);
    else groups.push({ courseCode: requirement.courseCode, candidates });
  }

  groups.sort(
    (a, b) => a.candidates.length - b.candidates.length || a.courseCode.localeCompare(b.courseCode),
  );

  return { groups, unsolved };
}

const round = (value: number) => (Object.is(value, -0) ? 0 : Number(value.toFixed(3)));

const baseCode = (code: string) => code.replace(/[LPE]$/, '');
const isLabEntry = (entry: PlacedOffering) =>
  entry.slots.length > 0 && entry.slots.every((slot) => /^L\d+$/.test(slot));

type Half = 'morning' | 'afternoon' | 'mixed';

function halfOf(entry: PlacedOffering): Half {
  if (entry.cells.length === 0) return 'mixed';
  if (entry.cells.every((cell) => cell.start < 13 * 60)) return 'morning';
  if (entry.cells.every((cell) => cell.start >= 13 * 60)) return 'afternoon';
  return 'mixed';
}

function sideOf(entry: PlacedOffering): '1' | '2' | null {
  const slot = entry.slots.find((code) => /[12]$/.test(code));
  if (!slot) return null;
  return slot.endsWith('1') ? '1' : '2';
}

function venuePrefix(venue: string | null): string | null {
  return venue?.match(/^[A-Z]+/)?.[0] ?? null;
}

function score(entries: PlacedOffering[], constraints: TimetableConstraints): Solution {
  const preferred = new Set(constraints.preferredFaculty.map((name) => name.trim().toLowerCase()));
  const days = new Set<number>();
  let preferredHits = 0;
  let early = 0;
  let late = 0;

  for (const entry of entries) {
    if (preferred.has(entry.faculty.trim().toLowerCase())) preferredHits += 1;
    for (const cell of entry.cells) {
      days.add(DAYS.indexOf(cell.day));
      if (cell.start < EARLY_CUTOFF) early += EARLY_CUTOFF - cell.start;
      if (cell.end > LATE_CUTOFF) late += cell.end - LATE_CUTOFF;
    }
  }

  // Theory/lab pairs of the same subject, matched by base code.
  const pairs = new Map<string, { theory?: PlacedOffering; lab?: PlacedOffering }>();
  for (const entry of entries) {
    const bucket = pairs.get(baseCode(entry.code)) ?? {};
    if (isLabEntry(entry)) bucket.lab = entry;
    else bucket.theory = entry;
    pairs.set(baseCode(entry.code), bucket);
  }

  let sameTeacher = 0;
  let splitDay = 0;
  for (const { theory, lab } of pairs.values()) {
    if (!theory || !lab) continue;

    if (theory.faculty.trim().toLowerCase() === lab.faculty.trim().toLowerCase()) {
      sameTeacher += WEIGHTS.sameTeacher;
    }

    const theoryHalf = halfOf(theory);
    const labHalf = halfOf(lab);
    if (theoryHalf !== 'mixed' && labHalf !== 'mixed') {
      splitDay += theoryHalf === labHalf ? -WEIGHTS.sameHalf : WEIGHTS.splitDay;
    }
  }

  // FAT exams follow the slot family: mixing A1 with A2 stacks exams on one day.
  const sides = { '1': 0, '2': 0 };
  for (const entry of entries) {
    if (isLabEntry(entry)) continue;
    const side = sideOf(entry);
    if (side) sides[side] += 1;
  }
  const examSide = -Math.min(sides['1'], sides['2']) * WEIGHTS.sideConflict;

  const venues = new Set(entries.map((entry) => venuePrefix(entry.venue)).filter(Boolean));
  const venue = -Math.max(0, venues.size - 1) * WEIGHTS.venueSpread;

  const parts: ScoreParts = {
    preferredFaculty: round(preferredHits * WEIGHTS.preferredFaculty),
    gaps: round(-gapMinutes(entries) * WEIGHTS.gapMinute),
    days: round(-days.size * WEIGHTS.dayUsed),
    earliness: round(-early * WEIGHTS.earlyMinute),
    lateness: round(-late * WEIGHTS.lateMinute),
    sameTeacher: round(sameTeacher),
    splitDay: round(splitDay),
    examSide: round(examSide),
    venue: round(venue),
  };

  const total = Object.values(parts).reduce((sum, value) => sum + value, 0);
  // Copy: the DFS mutates its working array, and the solution must survive it.
  return { entries: [...entries], score: round(total), parts };
}

export function solveGroups(
  groups: SolverGroup[],
  constraints: TimetableConstraints,
  options: SolveOptions = {},
): SolveResult {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
  const solutions: Solution[] = [];
  const seen = new Set<string>();
  let nodes = 0;

  const keyOf = (solution: Solution) =>
    solution.entries
      .map((entry) => entry.id)
      .sort()
      .join('|');

  const keep = (solution: Solution) => {
    const key = keyOf(solution);
    if (seen.has(key)) return;
    seen.add(key);

    solutions.push(solution);
    solutions.sort((a, b) => b.score - a.score || keyOf(a).localeCompare(keyOf(b)));

    if (solutions.length > limit) {
      const dropped = solutions.pop();
      if (dropped) seen.delete(keyOf(dropped));
    }
  };

  const visit = (index: number, placed: PlacedOffering[]) => {
    nodes += 1;
    if (nodes > maxNodes) return;

    if (index === groups.length) {
      keep(score(placed, constraints));
      return;
    }

    for (const candidate of groups[index].candidates) {
      if (placed.some((entry) => findConflicts([entry, candidate]).length > 0)) continue;
      placed.push(candidate);
      visit(index + 1, placed);
      placed.pop();
    }
  };

  visit(0, []);

  // A timetable with no courses is only a valid answer when nothing was asked for.
  const empty = groups.length === 0;
  const solutionsOut = empty ? [] : solutions;

  return {
    solutions: solutionsOut,
    unsolved: [],
    conflicts:
      solutionsOut.length === 0 && !empty
        ? findConflicts(groups.map((group) => group.candidates[0]).filter(Boolean))
        : [],
    nodes,
  };
}

export function solveTimetable(
  catalog: Catalog,
  state: TimetableState,
  options: SolveOptions = {},
): SolveResult {
  const { groups, unsolved } = buildGroups(catalog, state.requirements, state.constraints);
  const result = solveGroups(groups, state.constraints, options);
  return { ...result, unsolved };
}
