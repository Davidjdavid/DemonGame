// Generates the demo dungeon's floors into src/data/dungeon/floors.json (hand-editable afterwards).
//   node scripts/gen-dungeon.mjs
import { writeFile } from 'node:fs/promises';
import { generateFloor, reachable } from '../src/dungeon/generator.js';
import { DEMONS } from '../src/data/index.js';
import { BATTLE } from '../src/data/battleData.js';

const FLOORS = [
  {
    id: 'f1', name: 'Upper Cellars', seed: 1101, width: 46, height: 28, rooms: [8, 10], roomSize: [3, 7],
    encounters: { rate: [11, 18], table: [
      { ids: ['kappa'], weight: 3, level: [3, 4] },
      { ids: ['kodama'], weight: 3, level: [2, 3] },
      { ids: ['kodama', 'kappa'], weight: 2, level: [3, 3] },
      { ids: ['leprechaun'], weight: 2, level: [3, 4] },
      { ids: ['brokkr'], weight: 2, level: [3, 4] },
      { ids: ['puck'], weight: 2, level: [5, 5] },
      { ids: ['gargoyle'], weight: 2, level: [5, 5] },
    ] },
    treasure: 4, treasureGold: [80, 200], treasureItems: ['salve', 'cucumber', 'tonic'], heal: true, shop: true, stairs: true, boss: null,
  },
  {
    id: 'f2', name: 'Flooded Halls', seed: 2202, width: 50, height: 30, rooms: [9, 11], roomSize: [3, 7],
    encounters: { rate: [9, 15], table: [
      { ids: ['willowisp'], weight: 2, level: [6, 7] },
      { ids: ['tanuki'], weight: 2, level: [6, 6] },
      { ids: ['basilisk'], weight: 2, level: [6, 7] },
      { ids: ['troll'], weight: 2, level: [6, 7] },
      { ids: ['troll', 'basilisk'], weight: 1, level: [6, 6] },
      { ids: ['valkyrie'], weight: 2, level: [7, 7] },
      { ids: ['charon'], weight: 2, level: [7, 7] },
      { ids: ['furfur'], weight: 2, level: [7, 7] },
      { ids: ['oni'], weight: 2, level: [8, 8] },
      { ids: ['hephaestus'], weight: 1, level: [8, 8] },
      { ids: ['golem'], weight: 1, level: [9, 9] },
    ] },
    treasure: 4, treasureGold: [150, 350], treasureItems: ['salve', 'tonic', 'bronze', 'wine'], heal: true, shop: true, stairs: true, boss: null,
  },
  {
    id: 'f3', name: 'Deep Vault', seed: 3303, width: 50, height: 30, rooms: [8, 10], roomSize: [3, 7],
    encounters: { rate: [10, 16], table: [
      { ids: ['oni', 'golem'], weight: 2, level: [9, 9] },
      { ids: ['ares'], weight: 2, level: [10, 10] },
      { ids: ['amduscias'], weight: 2, level: [11, 11] },
      { ids: ['banshee'], weight: 2, level: [11, 11] },
      { ids: ['anubis'], weight: 1, level: [11, 12] },
      { ids: ['minotaur'], weight: 2, level: [11, 12] },
      { ids: ['valkyrie', 'furfur'], weight: 1, level: [9, 9] },
    ] },
    treasure: 3, treasureGold: [250, 500], treasureItems: ['tonic', 'kappasalve'], heal: true, shop: false, stairs: false,
    boss: { id: 'gonggong', level: 12, hpMult: 9, mpMult: 3, icons: 3, dmgMult: 0.5 },
  },
];

for (const p of FLOORS) for (const row of p.encounters.table) for (const id of row.ids) {
  if (!DEMONS[id] || !BATTLE[id]) throw new Error(`${p.id}: ${id} has no card or battle data yet`);
}
const floors = FLOORS.map((p) => {
  const f = generateFloor(p);
  const reach = reachable(f);
  for (const feat of f.features) if (!reach.has(`${feat.x},${feat.y}`)) throw new Error(`${p.id}: ${feat.type} unreachable`);
  return f;
});
await writeFile(new URL('../src/data/dungeon/floors.json', import.meta.url), JSON.stringify(floors, null, 1) + '\n');
console.log(floors.map((f) => `${f.id} ${f.name}: ${f.rooms.length} rooms, ${f.features.map((x) => x.type).join(', ')}`).join('\n'));
