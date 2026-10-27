/**
 * Regenerates the data files the standalone skill ships with, from the same
 * sources the web app uses. Run with: npm run skill:sync
 *
 *   skill/ffcs-planner/data/catalog.json   full catalog, minified
 *   skill/ffcs-planner/data/slots.json     slot -> day/start/end cells
 *   skill/ffcs-planner/data/teachers.txt   one line per offering, greppable
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Catalog } from '../src/lib/ffcs/catalog';
import { LAB_ROWS, THEORY_ROWS, slotCells } from '../src/lib/ffcs/grid';

const OUT = resolve('skill/ffcs-planner/data');
mkdirSync(OUT, { recursive: true });

const catalog = JSON.parse(readFileSync('data/catalog.vellore.json', 'utf8')) as Catalog;

writeFileSync(resolve(OUT, 'catalog.json'), JSON.stringify(catalog));

const codes = new Set<string>();
for (const row of [...THEORY_ROWS, ...LAB_ROWS]) {
  for (const code of Object.values(row.slots)) {
    if (code) codes.add(code);
  }
}

const slots = Object.fromEntries(
  [...codes]
    .sort()
    .map((code) => [code, slotCells(code).map((cell) => [cell.day, cell.start, cell.end])]),
);

writeFileSync(resolve(OUT, 'slots.json'), JSON.stringify(slots));

const teacherLines = catalog.courses.flatMap((course) =>
  course.offerings.map(
    (offering) =>
      `${offering.faculty} | ${course.code} | ${course.title} | ${offering.slots.join('+')} | ${
        offering.venue ?? '-'
      }`,
  ),
);

teacherLines.sort((a, b) => a.localeCompare(b));
writeFileSync(resolve(OUT, 'teachers.txt'), `${teacherLines.join('\n')}\n`);

console.log(`catalog.json   ${catalog.courses.length} courses`);
console.log(`slots.json     ${codes.size} slot codes`);
console.log(`teachers.txt   ${teacherLines.length} offerings`);
