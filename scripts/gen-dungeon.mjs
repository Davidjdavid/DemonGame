// Generates the demo dungeon's floors into src/data/dungeon/floors.json (hand-editable afterwards).
//   node scripts/gen-dungeon.mjs
import { writeFile } from 'node:fs/promises';
import { generateFloor, reachable } from '../src/dungeon/generator.js';

const FLOORS = [
  {
    id: 'f1', name: 'Upper Cellars', seed: 1101, width: 46, height: 28, rooms: [8, 10], roomSize: [3, 7],
    encounters: { rate: [9, 16], table: [
      { ids: ['kappa'], weight: 4, level: [3, 4] },
      { ids: ['kappa', 'kappa'], weight: 2, level: [3, 3] },
      { ids: ['puck'], weight: 3, level: [5, 5] },
      { ids: ['willowisp'], weight: 2, level: [5, 6] },
    ] },
    treasure: 4, treasureGold: [80, 200], treasureItems: ['salve', 'cucumber', 'tonic'], heal: true, shop: true, stairs: true, boss: null,
  },
  {
    id: 'f2', name: 'Flooded Halls', seed: 2202, width: 50, height: 30, rooms: [9, 11], roomSize: [3, 7],
    encounters: { rate: [9, 15], table: [
      { ids: ['willowisp'], weight: 3, level: [6, 7] },
      { ids: ['puck', 'willowisp'], weight: 2, level: [6, 6] },
      { ids: ['oni'], weight: 3, level: [8, 8] },
      { ids: ['hephaestus'], weight: 2, level: [8, 8] },
      { ids: ['golem'], weight: 2, level: [9, 9] },
    ] },
    treasure: 4, treasureGold: [150, 350], treasureItems: ['salve', 'tonic', 'bronze', 'wine'], heal: true, shop: true, stairs: true, boss: null,
  },
  {
    id: 'f3', name: 'Deep Vault', seed: 3303, width: 50, height: 30, rooms: [8, 10], roomSize: [3, 7],
    encounters: { rate: [10, 16], table: [
      { ids: ['oni', 'golem'], weight: 2, level: [9, 9] },
      { ids: ['ares'], weight: 3, level: [10, 10] },
      { ids: ['anubis'], weight: 2, level: [11, 12] },
      { ids: ['golem'], weight: 2, level: [9, 10] },
    ] },
    treasure: 3, treasureGold: [250, 500], treasureItems: ['tonic', 'kappasalve'], heal: true, shop: false, stairs: false,
    boss: { id: 'gonggong', level: 12, hpMult: 8, mpMult: 3, icons: 3, dmgMult: 0.55 },
  },
];

const floors = FLOORS.map((p) => {
  const f = generateFloor(p);
  const reach = reachable(f);
  for (const feat of f.features) if (!reach.has(`${feat.x},${feat.y}`)) throw new Error(`${p.id}: ${feat.type} unreachable`);
  return f;
});
await writeFile(new URL('../src/data/dungeon/floors.json', import.meta.url), JSON.stringify(floors, null, 1) + '\n');
console.log(floors.map((f) => `${f.id} ${f.name}: ${f.rooms.length} rooms, ${f.features.map((x) => x.type).join(', ')}`).join('\n'));
