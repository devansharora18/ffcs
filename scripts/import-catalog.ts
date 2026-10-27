/**
 * Turns the vendored FFCS dataset into data/catalog.vellore.json.
 *
 * Run with: npm run catalog:import
 *
 * Anything the slot grid does not recognise is reported rather than silently
 * dropped — that report is how bad rows get found before students do.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { isKnownSlot } from '../src/lib/ffcs/grid';
import type {
  Catalog,
  CatalogCourse,
  CatalogOffering,
  OfferingKind,
} from '../src/lib/ffcs/catalog';
import { data } from '../vendor/ffcs-data/faculty';

const SOURCE = 'codechefvit/ffcs@b2bafad';
const OUTPUT = resolve('data/catalog.vellore.json');

type RawOffering = { slot: string; venue: string; faculty: string };
type RawCatalog = Record<string, Record<string, Record<string, RawOffering[]>>>;

const LAB_SLOT = /^L\d+$/;
const isNil = (value: string) => value.trim().toUpperCase() === 'NIL';
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

function parseSlots(raw: string): string[] {
  return raw
    .split('+')
    .map((slot) => slot.trim().toUpperCase())
    .filter((slot) => slot.length > 0 && slot !== 'NIL');
}

function offeringKind(slots: string[]): OfferingKind {
  const labSlots = slots.filter((slot) => LAB_SLOT.test(slot)).length;
  if (labSlots === 0) return 'theory';
  if (labSlots === slots.length) return 'lab';
  return 'embedded';
}

type Acc = {
  titles: Map<string, number>;
  offerings: Map<string, CatalogOffering>;
  schools: Set<string>;
  categories: Set<string>;
  kinds: Set<OfferingKind>;
};

const courses = new Map<string, Acc>();
const unknownSlots = new Map<string, { count: number; samples: Set<string> }>();
const titleConflicts = new Map<string, Set<string>>();
const nilOfferings: string[] = [];
const malformedKeys: string[] = [];

for (const [school, categories] of Object.entries(data as RawCatalog)) {
  for (const [category, subjects] of Object.entries(categories)) {
    for (const [key, rawOfferings] of Object.entries(subjects)) {
      const separator = key.indexOf(' - ');
      if (separator === -1) {
        malformedKeys.push(`${school}/${category}: ${key}`);
        continue;
      }

      const code = key.slice(0, separator).trim();
      const title = clean(key.slice(separator + 3));

      const acc =
        courses.get(code) ??
        {
          titles: new Map(),
          offerings: new Map(),
          schools: new Set(),
          categories: new Set(),
          kinds: new Set(),
        };

      acc.titles.set(title, (acc.titles.get(title) ?? 0) + 1);
      acc.schools.add(school);
      acc.categories.add(category);

      for (const raw of rawOfferings) {
        const slots = parseSlots(raw.slot);

        if (slots.length === 0) {
          nilOfferings.push(`${code} (${clean(raw.faculty)})`);
          continue;
        }

        for (const slot of slots) {
          if (isKnownSlot(slot)) continue;
          const entry = unknownSlots.get(slot) ?? { count: 0, samples: new Set<string>() };
          entry.count += 1;
          if (entry.samples.size < 3) entry.samples.add(code);
          unknownSlots.set(slot, entry);
        }

        const faculty = clean(raw.faculty);
        const venue = clean(raw.venue);
        const kind = offeringKind(slots);

        acc.kinds.add(kind);
        acc.offerings.set(`${faculty}|${venue}|${slots.join('+')}`, {
          id: `${code}~${slots.join('+')}~${faculty}~${venue}`,
          faculty,
          venue: isNil(venue) || venue.length === 0 ? null : venue,
          slots,
        });
      }

      courses.set(code, acc);
    }
  }
}

function courseKind(kinds: Set<OfferingKind>): CatalogCourse['kind'] {
  if (kinds.size === 0) return 'unscheduled';
  if (kinds.size > 1 || kinds.has('embedded')) return 'embedded';
  return kinds.has('lab') ? 'lab' : 'theory';
}

function primaryTitle(titles: Map<string, number>): string {
  return [...titles.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

const output: CatalogCourse[] = [...courses.entries()]
  .map(([code, acc]) => {
    if (acc.titles.size > 1) titleConflicts.set(code, new Set(acc.titles.keys()));

    return {
      code,
      title: primaryTitle(acc.titles),
      kind: courseKind(acc.kinds),
      credits: null,
      schools: [...acc.schools].sort(),
      categories: [...acc.categories].sort(),
      offerings: [...acc.offerings.values()].sort(
        (a, b) => a.faculty.localeCompare(b.faculty) || a.slots.join().localeCompare(b.slots.join()),
      ),
    };
  })
  .sort((a, b) => a.code.localeCompare(b.code));

const offeringCount = output.reduce((sum, course) => sum + course.offerings.length, 0);
const faculties = new Set(output.flatMap((course) => course.offerings.map((o) => o.faculty)));
const unscheduled = output.filter((course) => course.kind === 'unscheduled').length;

const catalog: Catalog = {
  campus: 'Vellore',
  term: null,
  source: SOURCE,
  stats: { courses: output.length, offerings: offeringCount, faculties: faculties.size },
  courses: output,
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(catalog, null, 2)}\n`);

console.log(`courses        ${catalog.stats.courses}`);
console.log(`offerings      ${catalog.stats.offerings}`);
console.log(`faculties      ${catalog.stats.faculties}`);
console.log(`unscheduled    ${unscheduled}`);
console.log(`nil offerings  ${nilOfferings.length}`);
console.log(`malformed keys ${malformedKeys.length}`);
console.log(`title conflicts ${titleConflicts.size}`);
console.log(`unknown slots  ${unknownSlots.size}`);

if (unknownSlots.size > 0) {
  console.log('\nunknown slot codes:');
  for (const [slot, { count, samples }] of [...unknownSlots].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  ${slot.padEnd(8)} ${String(count).padStart(5)}  e.g. ${[...samples].join(', ')}`);
  }
}

if (titleConflicts.size > 0) {
  console.log('\nduplicate titles:');
  for (const [code, titles] of [...titleConflicts].slice(0, 10)) {
    console.log(`  ${code}: ${[...titles].join(' | ')}`);
  }
}
