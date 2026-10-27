import { DAYS, overlappingCells } from './grid';
import type {
  Conflict,
  PlacedOffering,
  TimetableConstraints,
  Violation,
} from './types';

const dayIndex = (day: (typeof DAYS)[number]) => DAYS.indexOf(day);

/** Every pair of placed offerings that share real time on the same day. */
export function findConflicts(entries: PlacedOffering[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      for (const [left, right] of overlappingCells(entries[i].cells, entries[j].cells)) {
        conflicts.push({
          a: entries[i].id,
          b: entries[j].id,
          day: left.day,
          start: Math.max(left.start, right.start),
          end: Math.min(left.end, right.end),
        });
      }
    }
  }

  return conflicts;
}

export function constraintViolations(
  entry: PlacedOffering,
  constraints: TimetableConstraints,
): Violation[] {
  const violations: Violation[] = [];

  const faculty = entry.faculty.trim().toLowerCase();
  if (constraints.avoidedFaculty.some((name) => name.trim().toLowerCase() === faculty)) {
    violations.push({ kind: 'avoided-faculty', offeringId: entry.id, faculty: entry.faculty });
  }

  for (const cell of entry.cells) {
    const day = dayIndex(cell.day);

    if (constraints.avoidDays.includes(day)) {
      violations.push({ kind: 'avoided-day', offeringId: entry.id, day });
    }

    for (const window of constraints.avoidWindows) {
      if (cell.start < window.end && window.start < cell.end) {
        violations.push({
          kind: 'avoided-window',
          offeringId: entry.id,
          day,
          start: Math.max(cell.start, window.start),
          end: Math.min(cell.end, window.end),
        });
      }
    }
  }

  return violations;
}

export function isAllowed(entry: PlacedOffering, constraints: TimetableConstraints): boolean {
  return constraintViolations(entry, constraints).length === 0;
}

/** Idle minutes between the first and last class of each day. */
export function gapMinutes(entries: PlacedOffering[]): number {
  const byDay = new Map<string, { start: number; end: number }[]>();

  for (const entry of entries) {
    for (const cell of entry.cells) {
      const blocks = byDay.get(cell.day) ?? [];
      blocks.push({ start: cell.start, end: cell.end });
      byDay.set(cell.day, blocks);
    }
  }

  let gaps = 0;

  for (const blocks of byDay.values()) {
    blocks.sort((a, b) => a.start - b.start);
    let cursor = blocks[0].end;
    for (const block of blocks.slice(1)) {
      if (block.start > cursor) gaps += block.start - cursor;
      cursor = Math.max(cursor, block.end);
    }
  }

  return gaps;
}
