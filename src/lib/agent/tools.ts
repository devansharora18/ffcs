import type { Catalog, CatalogCourse } from '../ffcs/catalog';
import { DAY_LABEL, clock, formatSlots } from '../ffcs/format';
import { DAYS, isKnownSlot } from '../ffcs/grid';
import { applyOps, type StateOp } from '../ffcs/ops';
import { searchCourses } from '../ffcs/search';
import { WEIGHTS, solveTimetable } from '../ffcs/solver';
import {
  emptyConstraints,
  type PlacedOffering,
  type Solution,
  type TimetableConstraints,
  type TimetableState,
} from '../ffcs/types';

export type AgentContext = {
  catalog: Catalog;
  state: TimetableState;
};

export type ToolOutcome = {
  /** Text handed back to the model. Keep it small and factual. */
  text: string;
  ops: StateOp[];
  state: TimetableState;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const asMinutes = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const text = asString(value);
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

function parseDays(value: unknown): number[] {
  const days: number[] = [];
  for (const item of Array.isArray(value) ? value : []) {
    if (typeof item === 'number' && item >= 0 && item <= 4) {
      days.push(item);
      continue;
    }
    const text = asString(item).slice(0, 3).toUpperCase();
    const index = DAYS.findIndex((day) => day === text);
    if (index !== -1) days.push(index);
  }
  return [...new Set(days)].sort();
}

function parseWindows(value: unknown): { start: number; end: number }[] {
  const windows: { start: number; end: number }[] = [];
  for (const item of Array.isArray(value) ? value : []) {
    const record = asRecord(item);
    const start = asMinutes(record.start);
    const end = asMinutes(record.end);
    if (start !== null && end !== null && start < end) windows.push({ start, end });
  }
  return windows;
}

function findCourse(catalog: Catalog, code: string): CatalogCourse | undefined {
  const needle = code.trim().toLowerCase();
  return catalog.courses.find((course) => course.code.toLowerCase() === needle);
}

function describeEntry(entry: PlacedOffering): string {
  const cells = entry.cells
    .map((cell) => `${DAY_LABEL[cell.day]} ${clock(cell.start)}`)
    .join(', ');
  return `${entry.code} ${entry.title} — ${entry.faculty} — ${formatSlots(entry.slots)}${cells ? ` (${cells})` : ''}`;
}

function describeSolution(solution: Solution): string {
  const lines = solution.entries.map(describeEntry);
  const unscheduled = solution.entries.filter((entry) => entry.cells.length === 0);
  const parts = solution.parts;
  const score = `score ${solution.score} (days ${Math.round(-parts.days / WEIGHTS.dayUsed)}, gaps ${Math.round(-parts.gaps / WEIGHTS.gapMinute)} min)`;
  return [...lines, ...(unscheduled.length ? ['no scheduled hours: ' + unscheduled.map((e) => e.code).join(', ')] : []), score].join('\n');
}

function solveAndDescribe(catalog: Catalog, state: TimetableState): string {
  if (state.requirements.length === 0) return 'No courses in the timetable yet.';

  const result = solveTimetable(catalog, state, { limit: 3 });
  const lines: string[] = [];

  if (result.unsolved.length > 0) {
    lines.push(`Could not place: ${result.unsolved.join(', ')} (no offering fits the constraints).`);
  }

  if (result.solutions.length === 0) {
    if (result.conflicts.length > 0) {
      const pairs = new Set(result.conflicts.map((conflict) => `${conflict.a} × ${conflict.b}`));
      lines.push(`No clash-free arrangement. Forced clashes: ${[...pairs].slice(0, 3).join('; ')}.`);
    } else if (result.unsolved.length === 0) {
      lines.push('No clash-free arrangement found.');
    }
    return lines.join(' ');
  }

  lines.push(`Best of ${result.solutions.length} arrangements:`);
  lines.push(describeSolution(result.solutions[0]));

  if (result.solutions[1]) {
    lines.push(
      `Alternative: ${result.solutions[1].entries.map((entry) => `${entry.code} ${formatSlots(entry.slots)}`).join(', ')}`,
    );
  }

  return lines.join('\n');
}

export function executeTool(name: string, rawArgs: unknown, context: AgentContext): ToolOutcome {
  const args = asRecord(rawArgs);
  const state = context.state;
  const catalog = context.catalog;

  switch (name) {
    case 'search_courses': {
      const query = asString(args.query);
      const limit = Math.min(Math.max(Number(args.limit) || 8, 1), 20);
      if (query.length === 0) return { text: 'Give me something to search for.', ops: [], state };

      const matches = searchCourses(catalog, query, limit);

      return {
        text: matches.length
          ? JSON.stringify(matches)
          : 'No course matches that. Try a shorter query or a course code.',
        ops: [],
        state,
      };
    }

    case 'list_offerings': {
      const course = findCourse(catalog, asString(args.code));
      if (!course) return { text: `No course with code ${asString(args.code)}.`, ops: [], state };

      const offerings = course.offerings.slice(0, 40).map((offering) => ({
        faculty: offering.faculty,
        slots: formatSlots(offering.slots),
        venue: offering.venue,
      }));

      return {
        text: JSON.stringify({
          code: course.code,
          title: course.title,
          totalOfferings: course.offerings.length,
          shown: offerings.length,
          offerings,
        }),
        ops: [],
        state,
      };
    }

    case 'who_teaches': {
      const slot = asString(args.slot).toUpperCase();
      if (!isKnownSlot(slot)) {
        return {
          text: `Unknown slot ${slot}. Theory slots look like A1, TA1; labs look like L3.`,
          ops: [],
          state,
        };
      }

      const byFaculty = new Map<string, { courses: string[]; slots: Set<string> }>();
      for (const course of catalog.courses) {
        for (const offering of course.offerings) {
          if (!offering.slots.includes(slot)) continue;
          const entry = byFaculty.get(offering.faculty) ?? { courses: [], slots: new Set<string>() };
          entry.courses.push(`${course.code} ${course.title}`);
          offering.slots.forEach((code) => entry.slots.add(code));
          byFaculty.set(offering.faculty, entry);
        }
      }

      const rows = [...byFaculty.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, 40)
        .map(([faculty, entry]) => ({
          faculty,
          courses: [...new Set(entry.courses)].slice(0, 3),
          slots: [...entry.slots].sort().join('+'),
        }));

      return {
        text: rows.length
          ? JSON.stringify({ slot, count: byFaculty.size, faculty: rows })
          : `Nobody teaches ${slot} in this catalog.`,
        ops: [],
        state,
      };
    }

    case 'add_course': {
      const code = asString(args.code);
      const course = findCourse(catalog, code);
      if (!course) return { text: `No course with code ${code}.`, ops: [], state };

      if (state.requirements.some((requirement) => requirement.courseCode === course.code)) {
        return { text: `${course.code} is already in the timetable.`, ops: [], state };
      }

      const facultyQuery = asString(args.faculty).toLowerCase();
      let offeringId: string | undefined;

      if (facultyQuery) {
        const matches = course.offerings.filter((offering) =>
          offering.faculty.toLowerCase().includes(facultyQuery),
        );
        if (matches.length === 0) {
          return {
            text: `${course.code} has no offering by "${facultyQuery}". Faculty: ${[
              ...new Set(course.offerings.map((offering) => offering.faculty)),
            ].slice(0, 10).join(', ')}.`,
            ops: [],
            state,
          };
        }
        if (matches.length > 1) {
          return {
            text: `Several ${course.code} offerings match "${facultyQuery}": ${matches
              .map((offering) => `${offering.faculty} ${formatSlots(offering.slots)}`)
              .join('; ')}. Ask which one, or call add_course again with the exact faculty name.`,
            ops: [],
            state,
          };
        }
        offeringId = matches[0].id;
      } else if (course.offerings.length === 1) {
        offeringId = course.offerings[0].id;
      }

      const ops: StateOp[] = [{ op: 'add', courseCode: course.code, offeringId }];
      const next = applyOps(state, ops);

      return {
        text: `Added ${course.code} ${course.title}${offeringId ? ` pinned to one offering` : ' (solver picks the offering)'}.\n${solveAndDescribe(catalog, next)}`,
        ops,
        state: next,
      };
    }

    case 'remove_course': {
      const course = findCourse(catalog, asString(args.code));
      if (!course) return { text: `No course with code ${asString(args.code)}.`, ops: [], state };
      if (!state.requirements.some((requirement) => requirement.courseCode === course.code)) {
        return { text: `${course.code} is not in the timetable.`, ops: [], state };
      }

      const ops: StateOp[] = [{ op: 'remove', courseCode: course.code }];
      const next = applyOps(state, ops);
      return { text: `Removed ${course.code}.\n${solveAndDescribe(catalog, next)}`, ops, state: next };
    }

    case 'set_constraints': {
      if (args.clear === true) {
        const ops: StateOp[] = [{ op: 'constraints', constraints: emptyConstraints() }];
        return { text: 'Cleared all constraints.', ops, state: applyOps(state, ops) };
      }

      const patch: Partial<TimetableConstraints> = {};
      if (args.avoidDays !== undefined) patch.avoidDays = parseDays(args.avoidDays);
      if (args.avoidWindows !== undefined) patch.avoidWindows = parseWindows(args.avoidWindows);
      if (args.preferredFaculty !== undefined) patch.preferredFaculty = asStringArray(args.preferredFaculty);
      if (args.avoidedFaculty !== undefined) patch.avoidedFaculty = asStringArray(args.avoidedFaculty);
      if (args.maxCredits !== undefined && Number.isFinite(Number(args.maxCredits))) {
        patch.maxCredits = Number(args.maxCredits);
      }

      if (Object.keys(patch).length === 0) {
        return { text: 'No constraint recognised.', ops: [], state };
      }

      const ops: StateOp[] = [{ op: 'constraints', constraints: patch }];
      const next = applyOps(state, ops);
      return {
        text: `Constraints updated: ${JSON.stringify(patch)}.\n${solveAndDescribe(catalog, next)}`,
        ops,
        state: next,
      };
    }

    case 'solve':
      return { text: solveAndDescribe(catalog, state), ops: [], state };

    default:
      return { text: `Unknown tool ${name}.`, ops: [], state };
  }
}
