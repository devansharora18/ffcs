/**
 * Zips the standalone skill into public/ so the site can hand it out as-is.
 * The archive root is `ffcs-planner/`, which is the layout Claude and OpenCode
 * expect when a skill is uploaded.
 *
 * Run with: npm run skill:zip
 */
import { readdirSync, readFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { zipSync } from 'fflate';

const SOURCE = resolve('skill/ffcs-planner');
const TARGET = resolve('public/ffcs-planner-skill.zip');
const PREFIX = 'ffcs-planner';

const SKIP = /(^|\/)(\.DS_Store|__pycache__)(\/|$)|\.solved\.json$/;

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files: Record<string, Uint8Array> = {};

for (const path of walk(SOURCE)) {
  const name = relative(SOURCE, path);
  if (SKIP.test(name)) continue;
  files[`${PREFIX}/${name}`] = new Uint8Array(readFileSync(path));
}

mkdirSync(resolve('public'), { recursive: true });
writeFileSync(TARGET, zipSync(files, { level: 9 }));

const bytes = Object.values(files).reduce((total, file) => total + file.length, 0);
console.log(
  `skill zip   ${Object.keys(files).length} files, ${(bytes / 1024).toFixed(0)} KB raw → ${TARGET}`,
);
