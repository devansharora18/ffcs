/**
 * Solves a timetable request from a JSON file and writes the result beside it.
 *
 *   npm run solve -- timetable.json
 *
 * The same engine the web app and the agent use; no API key required.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

import { catalog } from '../src/lib/ffcs/catalog-data';
import { DAY_LABEL, clock } from '../src/lib/ffcs/format';
import { DAYS } from '../src/lib/ffcs/grid';
import { solveTimetable } from '../src/lib/ffcs/solver';
import type { TimetableState } from '../src/lib/ffcs/types';

const input = resolve(process.argv[2] ?? 'timetable.json');

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

let request: TimetableState;
try {
  request = JSON.parse(readFileSync(input, 'utf8')) as TimetableState;
} catch (error) {
  fail(`Could not read ${input}: ${(error as Error).message}`);
}

if (!Array.isArray(request.requirements)) {
  fail('timetable.json needs a "requirements" array, e.g. [{"courseCode":"BCSE202L"}]');
}

const toMinutes = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const state: TimetableState = {
  requirements: request.requirements,
  constraints: {
    avoidDays: request.constraints?.avoidDays ?? [],
    avoidWindows: (request.constraints?.avoidWindows ?? []).map((window) => ({
      start: toMinutes(window.start),
      end: toMinutes(window.end),
    })),
    preferredFaculty: request.constraints?.preferredFaculty ?? [],
    avoidedFaculty: request.constraints?.avoidedFaculty ?? [],
  },
};

const result = solveTimetable(catalog, state, { limit: 5 });

const output = resolve(dirname(input), `${basename(input, '.json')}.solved.json`);
writeFileSync(output, `${JSON.stringify({ request: state, result }, null, 2)}\n`);

if (result.unsolved.length > 0) {
  console.log(`cannot place: ${result.unsolved.join(', ')}`);
}

if (result.solutions.length === 0) {
  if (result.conflicts.length > 0) {
    console.log('no clash-free arrangement. forced overlaps:');
    for (const conflict of result.conflicts.slice(0, 6)) {
      console.log(`  ${conflict.day} ${clock(conflict.start)}-${clock(conflict.end)}  ${conflict.a} x ${conflict.b}`);
    }
  } else {
    console.log('no clash-free arrangement.');
  }
  console.log(`wrote ${output}`);
  process.exit(1);
}

const best = result.solutions[0];
console.log(
  `${state.requirements.length} courses · ${result.solutions.length} arrangement(s) · score ${best.score} · ${result.nodes} nodes`,
);
console.log('');

for (const day of DAYS) {
  const blocks = best.entries
    .flatMap((entry) => entry.cells.filter((cell) => cell.day === day).map((cell) => ({ entry, cell })))
    .sort((a, b) => a.cell.start - b.cell.start);

  for (const { entry, cell } of blocks) {
    console.log(
      [
        DAY_LABEL[day],
        `${clock(cell.start)}-${clock(cell.end)}`.padEnd(11),
        entry.code.padEnd(11),
        entry.title.slice(0, 30).padEnd(31),
        entry.faculty.slice(0, 22).padEnd(23),
        entry.venue ?? '',
      ].join(' '),
    );
  }
}

console.log('');
console.log(`score parts: ${JSON.stringify(best.parts)}`);
console.log(`wrote ${output}`);
