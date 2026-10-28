/**
 * Unions several allotment data trees into one source file.
 *
 *   npx tsx scripts/build-catalog-source.ts <dataDir> [dataDir…]
 *
 * Nothing is ever removed: courses and offerings from every tree are merged,
 * de-duplicated by faculty + venue + slot. This is how "keep the previous
 * courses" is guaranteed even though some upstream PRs delete stale data.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

type RawOffering = { slot: string; venue: string; faculty: string };
type RawSchool = Record<string, Record<string, RawOffering[]>>;
type RawData = Record<string, RawSchool>;

const ROOTS = process.argv.slice(2);
if (ROOTS.length === 0) {
  console.error('usage: tsx scripts/build-catalog-source.ts <dataDir> [dataDir…]');
  process.exit(1);
}

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

const union: RawData = {};
let sources = 0;

async function main() {
  for (const root of ROOTS) {
    // A `.json` root is an already-extracted dataset (the deployed site bundle);
    // a directory root is an allotment data tree.
    const source: RawData = root.endsWith('.json')
      ? (JSON.parse(readFileSync(root, 'utf8')) as RawData)
      : ((await import(pathToFileURL(resolve(root, 'faculty.ts')).href)) as { data: RawData }).data;

    for (const [school, categories] of Object.entries(source)) {
      if (!categories) {
        console.warn(`skipping empty school ${school}`);
        continue;
      }
      for (const [category, subjects] of Object.entries(categories)) {
        if (!subjects) {
          console.warn(`skipping empty category ${school} / ${category}`);
          continue;
        }
        for (const [key, offerings] of Object.entries(subjects)) {
          union[school] ??= {};
          union[school][category] ??= {};
          const target = (union[school][category][key] ??= []);
          const seen = new Set(
            target.map((item) => `${clean(item.faculty)}|${clean(item.venue)}|${clean(item.slot)}`),
          );

          for (const offering of offerings) {
            const id = `${clean(offering.faculty)}|${clean(offering.venue)}|${clean(offering.slot)}`;
            if (seen.has(id)) continue;
            seen.add(id);
            target.push(offering);
          }
        }
      }
    }

    sources += 1;
    console.log(`merged ${root}`);
  }

  mkdirSync('vendor', { recursive: true });
  writeFileSync('vendor/catalog-source.json', JSON.stringify(union));

  const courses = new Set<string>();
  let offerings = 0;
  for (const categories of Object.values(union)) {
    for (const subjects of Object.values(categories)) {
      for (const [key, list] of Object.entries(subjects)) {
        courses.add(key.split(' - ')[0]);
        offerings += list.length;
      }
    }
  }

  console.log(`sources   ${sources}`);
  console.log(`courses   ${courses.size}`);
  console.log(`offerings ${offerings}`);
}

void main();
