// Freeze a generated (and hand-tuned) candidate into the game's floor data.
//   node scripts/freeze-floor.mjs gen-out/3F-1.js f3
// Writes src/data/floors/<id>.js with the name/depth/links from floors/meta.js and the encounter table from
// data/encounters.js, after validating it (stairs reachable, keys before doors, no one-way traps).
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseFloor } from '../src/world/floor.js';
import { validateFloor } from '../src/gen/validate.js';
import { FLOOR_META, linksFor } from '../src/data/floors/meta.js';

const [src, id] = process.argv.slice(2);
if (!src || !id || !FLOOR_META[id]) { console.error('usage: freeze-floor.mjs <candidate.js> <f1..f7>'); process.exit(1); }
const cand = (await import(pathToFileURL(path.resolve(src)).href)).default;
const floor = {
  ...cand,
  id,
  name: FLOOR_META[id].name,
  depth: FLOOR_META[id].depth,
  links: linksFor(id),
};
delete floor.encounters;
// Hand-tuned loot: the generator's chest contents are placeholders. Key chests stay; the others get this floor's loot
// in reading order (a number = a gold chest).
const LOOT = {
  f1: [['medicine', 2], ['fire_shard', 1], 120],
  f2: [['bolt_shard', 2], ['revival_bead', 1], 250, ['ward_incense', 1]],
  f3: [['holy_shard', 2], ['exit_charm', 1], ['mana_drop', 2], 450],
  f4: [['salve', 2], ['revival_bead', 1], 700, ['mana_drop', 2], ['dusk_shard', 2]],
  f5: [['mana_vial', 1], ['balm', 1], 1000, ['salve', 3], ['exit_charm', 1]],
  f6: [['revival_bead', 2], ['mana_vial', 2], 1400, ['balm', 1], ['salve', 3]],
  f7: [['balm', 2], ['mana_vial', 2], ['revival_bead', 2], 1800, ['salve', 4]],
};
const loot = [...(LOOT[id] || [])];
const legend = {};
for (const [ch, f] of Object.entries(floor.legend || {})) {
  if (f.type === 'chest' && !/key/.test(f.item || '') && loot.length) {
    const l = loot.shift();
    legend[ch] = typeof l === 'number' ? { type: 'chest', gold: l } : { type: 'chest', item: l[0], count: l[1] };
  } else legend[ch] = f;
}
floor.legend = legend;
// Area names by where the area sits on the floor (placeholder theme), so each region is recognisable.
const W = (floor.map[0].length - 1) / 2;
const H = (floor.map.length - 1) / 2;
const used = new Set();
floor.areas = (floor.areas || []).map((a) => {
  const cx = (a.rect[0] + a.rect[2]) / 2 / W;
  const cy = (a.rect[1] + a.rect[3]) / 2 / H;
  const ns = cy < 0.36 ? 'North' : cy > 0.64 ? 'South' : '';
  const ew = cx < 0.36 ? 'west' : cx > 0.64 ? 'east' : '';
  let name = ns && ew ? `${ns}-${ew}` : ns || (ew ? ew[0].toUpperCase() + ew.slice(1) : 'Central');
  for (const suffix of [' Wing', ' Rooms', ' Halls', ' Ward']) { if (!used.has(name + suffix)) { name += suffix; break; } }
  used.add(name);
  return { ...a, name };
});
const parsed = parseFloor(floor);
const v = validateFloor(parsed);
if (!v.ok) { console.error(`${id}: invalid —`, v.problems.join('; ')); process.exit(1); }
const q = (x) => JSON.stringify(x);
const body = [
  `// ${floor.name} — frozen from ${path.basename(src)} (generated, then hand-tuned). Format: src/world/README.md.`,
  "import { ENCOUNTERS } from '../encounters.js';",
  '',
  'export default {',
  `  id: ${q(id)},`,
  `  name: ${q(floor.name)},`,
  `  depth: ${floor.depth},`,
  `  start: ${q(floor.start)},`,
  `  links: ${q(floor.links)},`,
  `  color: ${q(floor.color || '#6b6f78')},`,
  `  encounters: ENCOUNTERS.${id},`,
  '  map: [',
  ...floor.map.map((l) => `    ${q(l)},`),
  '  ],',
  ...['legend', 'locks', 'warps', 'dark', 'areas'].filter((k) => floor[k] && Object.keys(floor[k]).length).map((k) => `  ${k}: ${JSON.stringify(floor[k])},`),
  '};',
  '',
].join('\n');
await writeFile(path.resolve('src/data/floors', `${id}.js`), body);
console.log(`wrote src/data/floors/${id}.js (${parsed.w}x${parsed.h}, ${v.states} states, ${v.reachedCells}/${v.walkable} cells reachable)`);
