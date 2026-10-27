import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { catalog } from '../src/lib/ffcs/catalog-data';
import { solveTimetable } from '../src/lib/ffcs/solver';
import type { TimetableState } from '../src/lib/ffcs/types';

const INPUT = 'skill/ffcs-planner/timetable.example.json';
const SCRIPT = 'skill/ffcs-planner/scripts/solve.py';
const OUTPUT = 'skill/ffcs-planner/timetable.example.solved.json';

function hasPython(): boolean {
  try {
    execFileSync('python3', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const toMinutes = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

test('the python solver returns the same arrangements as the typescript one', { skip: !hasPython() }, () => {
  const request = JSON.parse(readFileSync(INPUT, 'utf8')) as {
    requirements: TimetableState['requirements'];
    constraints: {
      avoidDays: number[];
      avoidWindows: { start: string | number; end: string | number }[];
      preferredFaculty: string[];
      avoidedFaculty: string[];
    };
  };

  const state: TimetableState = {
    requirements: request.requirements,
    constraints: {
      avoidDays: request.constraints.avoidDays,
      avoidWindows: request.constraints.avoidWindows.map((window) => ({
        start: toMinutes(window.start),
        end: toMinutes(window.end),
      })),
      preferredFaculty: request.constraints.preferredFaculty,
      avoidedFaculty: request.constraints.avoidedFaculty,
    },
  };

  const typescript = solveTimetable(catalog, state);
  execFileSync('python3', [SCRIPT, INPUT], { stdio: 'ignore' });

  const python = JSON.parse(readFileSync(OUTPUT, 'utf8')) as {
    result: { solutions: { entries: { id: string }[] }[]; unsolved: string[]; nodes: number };
  };

  const ids = (solutions: { entries: { id: string }[] }[]) =>
    solutions.map((solution) => solution.entries.map((entry) => entry.id).sort());

  assert.deepEqual(ids(python.result.solutions), ids(typescript.solutions));
  assert.deepEqual(python.result.unsolved, typescript.unsolved);
  assert.equal(python.result.nodes, typescript.nodes);
});
