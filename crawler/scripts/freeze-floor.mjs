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
