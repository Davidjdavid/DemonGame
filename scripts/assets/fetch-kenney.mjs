// Downloads the Kenney CC0 packs used for tiles, effects and sounds, and unzips each into its own folder.
//
//   node scripts/assets/fetch-kenney.mjs <dir>
//   then: node scripts/assets/build-tiles.mjs <dir>
//
// kenney.nl hands out a fresh signed link per download (GET /download-link/<id> -> {url}); the id is in the
// asset page's data-download-id attribute. The site refuses the default curl/node user agent, so a browser-like
// one is sent. Downloads are untrusted data: they are only unzipped (with the system `unzip`, no shell) and read
// as images/sounds by build-tiles.mjs, never executed. Every pack's License.txt must say CC0.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

export const PACKS = [
  'tiny-town', // town tilesheet
  'tiny-dungeon', // dungeon tilesheet + characters + monsters
  'tiny-battle', // water / shore tiles (same 16px style)
  'tiny-farm', // farmers, crates, barrels, rocks
  'pixel-platformer', // lever sprites (cropped to 16px)
  'particle-pack', // battle effects (tinted)
  'impact-sounds', // hit sounds
  'rpg-audio', // door, chest, coins, lever
  'interface-sounds', // menu, encounter, level up
];

const UA = 'Mozilla/5.0 (X11; Linux x86_64) DemonGamePrototype';
const run = promisify(execFile);

async function get(url, referer) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...(referer ? { Referer: referer } : {}) } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

async function fetchPack(slug, dir) {
  const page = `https://kenney.nl/assets/${slug}`;
  const html = await (await get(page)).text();
  const id = html.match(/data-download-id='([0-9a-f]+)'/)?.[1];
  if (!id) throw new Error(`${slug}: no download id on the asset page`);
  const { url } = await (await get(`https://kenney.nl/download-link/${id}`, page)).json();
  if (!url) throw new Error(`${slug}: no signed download url`);
  const zip = Buffer.from(await (await get(url, page)).arrayBuffer());
  await mkdir(path.join(dir, 'zip'), { recursive: true });
  const zipPath = path.join(dir, 'zip', `${slug}.zip`);
  await writeFile(zipPath, zip);
  const out = path.join(dir, slug);
  await mkdir(out, { recursive: true });
  await run('unzip', ['-q', '-o', zipPath, '-d', out]);
  const license = await readFile(path.join(out, 'License.txt'), 'utf8');
  if (!/CC0|Creative Commons Zero/i.test(license)) throw new Error(`${slug}: License.txt does not say CC0`);
  console.log(`${slug}: ${zip.length} bytes, CC0 ok`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: node scripts/assets/fetch-kenney.mjs <dir>');
    process.exit(1);
  }
  for (const slug of PACKS) await fetchPack(slug, path.resolve(dir));
}
