/**
 * Writes public/ads.txt from NEXT_PUBLIC_ADSENSE_CLIENT so the publisher id
 * cannot drift between the site and the crawler file.
 *
 *   NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-1234567890123456 -> public/ads.txt
 *
 * With no valid client the file is removed, so a stale id never ships.
 */
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGET = resolve('public/ads.txt');
const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '';
const match = /^ca-pub-(\d{10,20})$/.exec(client.trim());

if (!match) {
  if (existsSync(TARGET)) rmSync(TARGET);
  console.log('ads.txt  skipped (set NEXT_PUBLIC_ADSENSE_CLIENT to enable AdSense)');
} else {
  writeFileSync(TARGET, `google.com, pub-${match[1]}, DIRECT, f08c47fec0942fa0\n`);
  console.log(`ads.txt  written for pub-${match[1]}`);
}
