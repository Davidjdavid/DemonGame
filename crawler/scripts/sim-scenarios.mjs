// Balance scenarios per floor: the curve targets from DESIGN ("The difficulty curve to aim for"), with the expected
// party on a first visit (no knowledge of the floor's new types, previous gear) and on a return trip (+3 levels,
// a fusion, next gear, full knowledge). Keep the table in PROGRESS.md in sync.
import { ENCOUNTERS } from '../src/data/encounters.js';
import { BOSS } from '../src/data/monsters.js';

const types = (f) => ENCOUNTERS[f].table.map(([t]) => t);

export const SCENARIOS = {
  'F1 first, solo L1': { heroLevel: 1, enc: { ...ENCOUNTERS.f1, level: [1, 2] }, target: '2-4 hits, 2-4 rds, low risk' },
  'F1, L3 + 1 recruit': { heroLevel: 3, recruits: [['wisp', 3]], enc: ENCOUNTERS.f1, knows: types('f1'), target: '1-3 rds' },
  'F1 return, L5 + 2 recruits': { heroLevel: 5, recruits: [['wisp', 5], ['imp', 5]], enc: ENCOUNTERS.f1, knows: types('f1'), equip: { weapon: 'bronze_sword', armor: 'leather' }, target: '1-2 rds' },
  'F2 first, L4 + 2': { heroLevel: 4, recruits: [['wisp', 4], ['imp', 4]], enc: ENCOUNTERS.f2, knows: types('f1'), equip: { weapon: 'bronze_sword', armor: 'leather' }, target: '3-5 rds, real risk' },
  'F2 return, L9 + 3': { heroLevel: 9, recruits: [['wisp', 9], ['imp', 9], ['hound', 8]], enc: ENCOUNTERS.f2, knows: [...types('f1'), ...types('f2')], equip: { weapon: 'iron_sword', armor: 'chain' }, target: '1-2 rds, little dmg' },
  'F3 first, L7 + 3': { heroLevel: 7, recruits: [['wisp', 7], ['imp', 7], ['thornling', 6]], enc: ENCOUNTERS.f3, knows: types('f2'), equip: { weapon: 'iron_sword', armor: 'chain' }, target: '3-5 rds, real risk' },
  'F3 return, L14 + 3': { heroLevel: 14, recruits: [['bloomwitch', 13], ['harpy', 13], ['naga', 13]], enc: ENCOUNTERS.f3, knows: [...types('f2'), ...types('f3')], equip: { weapon: 'steel_sword', armor: 'scale' }, target: '1-2 rds (restock run)' },
  'F4 first, L10 + 3': { heroLevel: 10, recruits: [['bogjelly', 9], ['shrike', 9], ['thornling', 9]], enc: ENCOUNTERS.f4, knows: types('f3'), equip: { weapon: 'flame_brand', armor: 'warded_coat' }, target: '3-5 rds, real risk' },
  'F4 return, L15 + 3': { heroLevel: 15, recruits: [['bloomwitch', 14], ['naga', 14], ['lich', 16]], enc: ENCOUNTERS.f4, knows: [...types('f3'), ...types('f4')], equip: { weapon: 'frost_edge', armor: 'mystic_robe' }, target: '1-2 rds (restock run)' },
  'F5 first, L13 + 3': { heroLevel: 13, recruits: [['bloomwitch', 12], ['harpy', 12], ['watcher', 12]], enc: ENCOUNTERS.f5, knows: types('f4'), equip: { weapon: 'steel_sword', armor: 'scale' }, target: '3-5 rds, real risk' },
  'F5 return, L16 + 3': { heroLevel: 16, recruits: [['bloomwitch', 15], ['thunderbird', 15], ['lich', 16]], enc: ENCOUNTERS.f5, knows: [...types('f4'), ...types('f5')], equip: { weapon: 'frost_edge', armor: 'mystic_robe' }, target: '1-2 rds (restock run)' },
  'F6 first, L15 + 3': { heroLevel: 15, recruits: [['bloomwitch', 15], ['naga', 15], ['lich', 16]], enc: ENCOUNTERS.f6, knows: types('f5'), equip: { weapon: 'frost_edge', armor: 'mystic_robe' }, target: '3-5 rds, real risk' },
  'F6 return, L18 + 3': { heroLevel: 18, recruits: [['seraph', 18], ['thunderbird', 17], ['lich', 18]], enc: ENCOUNTERS.f6, knows: [...types('f5'), ...types('f6')], equip: { weapon: 'knight_sword', armor: 'knight_plate' }, target: '1-2 rds' },
  'Boss, L18 + 3': { heroLevel: 18, recruits: [['seraph', 18], ['thunderbird', 17], ['lich', 18]], group: [{ type: BOSS.type, level: BOSS.level, boss: BOSS }], equip: { weapon: 'knight_sword', armor: 'knight_plate' }, inventory: { medicine: 4, salve: 4, revival_bead: 2, mana_drop: 3 }, target: '8-12 rds, winnable' },
};
