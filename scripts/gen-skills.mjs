// Generates src/data/skills.json. Edit the tables here and rerun (`node scripts/gen-skills.mjs`);
// the sim reads the generated file. Power numbers are placeholders tuned by scripts/sim.mjs.
import { writeFile } from 'node:fs/promises';

const skills = [];
const add = (s) => skills.push({ accuracy: 0.98, hits: [1, 1], ...s });
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// Magic elements: single and all-target at three power levels.
const MAGIC = {
  fire: { one: ['Ember', 'Blaze', 'Inferno'], all: ['Cinder Rain', 'Firestorm', 'Conflagration'] },
  ice: { one: ['Chill', 'Torrent', 'Glacier'], all: ['Hail', 'Deluge', 'Whiteout'] },
  elec: { one: ['Spark', 'Bolt', 'Thunderclap'], all: ['Static', 'Storm Front', "Heaven's Anvil"] },
  wind: { one: ['Gust', 'Gale', 'Cyclone'], all: ['Squall', 'Tempest', 'Hurricane'] },
  light: { one: ['Glint', 'Radiance', 'Judgment'], all: ['Dazzle', 'Sunburst', 'Daybreak'] },
  dark: { one: ['Shade', 'Curse', 'Oblivion'], all: ['Gloom', 'Night Terror', 'Eclipse'] },
};
const ONE_POW = [60, 100, 160], ALL_POW = [46, 76, 120];
const ONE_MP = [4, 9, 16], ALL_MP = [8, 16, 28];
for (const [el, names] of Object.entries(MAGIC)) {
  names.one.forEach((n, i) => add({ id: slug(n), name: n, element: el, kind: 'attack', target: 'one', stat: 'mag', power: ONE_POW[i], rank: i + 1, cost: { mp: ONE_MP[i] } }));
  names.all.forEach((n, i) => add({ id: slug(n), name: n, element: el, kind: 'attack', target: 'all', stat: 'mag', power: ALL_POW[i], rank: i + 1, cost: { mp: ALL_MP[i] } }));
}

// Physical: single and all-target, paid in HP.
const PHYS = { one: ['Bash', 'Cleave', 'Mighty Blow'], all: ['Sweep', 'Rampage', 'Earthshaker'] };
const P_ONE = [70, 115, 180], P_ALL = [45, 75, 120], HP_ONE = [6, 10, 14], HP_ALL = [10, 15, 20];
PHYS.one.forEach((n, i) => add({ id: slug(n), name: n, element: 'phys', kind: 'attack', target: 'one', stat: 'str', power: P_ONE[i], rank: i + 1, cost: { hpPct: HP_ONE[i] }, accuracy: 0.92 }));
PHYS.all.forEach((n, i) => add({ id: slug(n), name: n, element: 'phys', kind: 'attack', target: 'all', stat: 'str', power: P_ALL[i], rank: i + 1, cost: { hpPct: HP_ALL[i] }, accuracy: 0.9 }));
add({ id: 'twin_slash', name: 'Twin Slash', element: 'phys', kind: 'attack', target: 'one', stat: 'str', power: 45, hits: [2, 2], rank: 1, cost: { hpPct: 9 }, accuracy: 0.92 });
add({ id: 'flurry', name: 'Flurry', element: 'phys', kind: 'attack', target: 'random', stat: 'str', power: 40, hits: [2, 4], rank: 2, cost: { hpPct: 12 }, accuracy: 0.9 });

// Elemental strikes (Strength-scaled, can crit) and physical spells (Magic-scaled).
for (const [el, n] of [['fire', 'Flame Edge'], ['ice', 'Frost Edge'], ['elec', 'Thunder Edge'], ['wind', 'Gale Edge']]) {
  add({ id: slug(n), name: n, element: el, kind: 'attack', target: 'one', stat: 'str', power: 75, rank: 1, cost: { hpPct: 9 }, accuracy: 0.92 });
}
add({ id: 'crushing_will', name: 'Crushing Will', element: 'phys', kind: 'attack', target: 'one', stat: 'mag', power: 80, rank: 2, cost: { mp: 8 } });
add({ id: 'stone_rain', name: 'Stone Rain', element: 'phys', kind: 'attack', target: 'all', stat: 'mag', power: 50, rank: 2, cost: { mp: 14 } });

// Almighty: ignores all tiers.
add({ id: 'ruin', name: 'Ruin', element: 'almighty', kind: 'attack', target: 'one', stat: 'mag', power: 130, rank: 3, cost: { mp: 28 } });
add({ id: 'annihilation', name: 'Annihilation', element: 'almighty', kind: 'attack', target: 'all', stat: 'mag', power: 95, rank: 3, cost: { mp: 40 } });

// Healing (scaled by Magic and the caster's Healing tier).
add({ id: 'mend', name: 'Mend', element: 'healing', kind: 'heal', target: 'ally', power: 50, rank: 1, cost: { mp: 4 } });
add({ id: 'restore', name: 'Restore', element: 'healing', kind: 'heal', target: 'ally', power: 100, rank: 2, cost: { mp: 9 } });
add({ id: 'renewal', name: 'Renewal', element: 'healing', kind: 'heal', target: 'ally', power: 250, rank: 3, cost: { mp: 16 } });
add({ id: 'mend_all', name: 'Mend All', element: 'healing', kind: 'heal', target: 'allies', power: 40, rank: 1, cost: { mp: 12 } });
add({ id: 'restore_all', name: 'Restore All', element: 'healing', kind: 'heal', target: 'allies', power: 80, rank: 2, cost: { mp: 22 } });
add({ id: 'revive', name: 'Revive', element: 'healing', kind: 'revive', target: 'dead_ally', chance: 0.5, hpPct: 30, rank: 2, cost: { mp: 20 } });
add({ id: 'resurrect', name: 'Resurrect', element: 'healing', kind: 'revive', target: 'dead_ally', chance: 1, hpPct: 100, rank: 3, cost: { mp: 40 } });

// Buffs (allies, always land) and debuffs (enemies, roll to hit by Support tier).
for (const [id, name, stat] of [['war_cry', 'War Cry', 'atk'], ['iron_skin', 'Iron Skin', 'def'], ['quicken', 'Quicken', 'agi']]) {
  add({ id, name, element: 'support', kind: 'buff', target: 'allies', stat, stacks: 1, rank: 1, cost: { mp: 12 } });
}
for (const [id, name, stat] of [['sap_strength', 'Sap Strength', 'atk'], ['break_guard', 'Break Guard', 'def'], ['slow', 'Slow', 'agi']]) {
  add({ id, name, element: 'support', kind: 'debuff', target: 'enemies', stat, stacks: -1, rank: 1, cost: { mp: 12 } });
}

// Passives.
for (const [el, n] of [['phys', 'Physical'], ['fire', 'Fire'], ['ice', 'Ice'], ['elec', 'Electric'], ['wind', 'Wind'], ['light', 'Light'], ['dark', 'Dark']]) {
  add({ id: `repel_${el}`, name: `Repel ${n}`, element: 'passive', kind: 'passive', target: 'self', passive: { repel: el }, rank: 3, cost: {} });
}
add({ id: 'counter', name: 'Counter', element: 'passive', kind: 'passive', target: 'self', passive: { counter: 0.5 }, rank: 2, cost: {} });
add({ id: 'life_bonus', name: 'Life Bonus', element: 'passive', kind: 'passive', target: 'self', passive: { hpBonus: 0.1 }, rank: 1, cost: {} });
add({ id: 'mana_bonus', name: 'Mana Bonus', element: 'passive', kind: 'passive', target: 'self', passive: { mpBonus: 0.1 }, rank: 1, cost: {} });

// The basic attack every combatant has (not in skill slots).
add({ id: 'attack', name: 'Attack', element: 'phys', kind: 'attack', target: 'one', stat: 'str', power: 40, rank: 0, cost: {}, accuracy: 0.95, basic: true });

const ids = new Set();
for (const s of skills) { if (ids.has(s.id)) throw new Error(`duplicate ${s.id}`); ids.add(s.id); }
await writeFile(new URL('../src/data/skills.json', import.meta.url), JSON.stringify(skills, null, 1) + '\n');
console.log(`${skills.length} skills (${skills.filter((s) => !s.basic).length} learnable)`);
