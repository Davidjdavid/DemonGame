// Build battle combatants from the hero, recruits and monster types. Pure.
// A combatant: { key, name, side, type, level, stats, hp, maxHp, mp, maxMp, aff, skills, buffs, atkBonus, defBonus,
//   icons, boss, isHero, knows (player side: persistent knowledge object, shared by reference), ref, auto }
import { MONSTERS, skillsAt } from '../data/monsters.js';
import { WEAPONS, ARMORS } from '../data/equipment.js';
import { monsterStats, maxHpFor, maxMpFor } from './stats.js';
import { TUNING, enemyHpMult } from './tuning.js';

export const BUFF_STATS = ['atk', 'def', 'agi'];
const freshBuffs = () => Object.fromEntries(BUFF_STATS.map((k) => [k, { stacks: 0, turns: 0 }]));

// Effective stats of the hero (base + equipment).
export function heroDerived(hero) {
  const w = WEAPONS[hero.equip.weapon] || { atk: 0 };
  const a = ARMORS[hero.equip.armor] || { def: 0, aff: {} };
  return {
    maxHp: maxHpFor(hero.level, hero.stats.vi),
    maxMp: maxMpFor(hero.level, hero.stats.ma),
    atkBonus: w.atk || 0,
    defBonus: a.def || 0,
    aff: { ...(a.aff || {}) },
    weaponElement: w.element || 'phys',
    skills: [...(hero.skills || []), ...(w.skill ? [w.skill] : [])],
  };
}

export function heroCombatant(hero) {
  const d = heroDerived(hero);
  return {
    key: 'hero', name: hero.name, side: 'player', type: 'hero', level: hero.level, stats: { ...hero.stats },
    hp: Math.min(hero.hp, d.maxHp), maxHp: d.maxHp, mp: Math.min(hero.mp, d.maxMp), maxMp: d.maxMp,
    aff: d.aff, skills: d.skills, attackElement: d.weaponElement, buffs: freshBuffs(),
    atkBonus: d.atkBonus, defBonus: d.defBonus, icons: 1, boss: false, isHero: true,
    knows: hero.knows, ref: hero, auto: false,
  };
}

// A recruit (persistent monster instance: { uid, type, level, exp, hp, mp, skills, knows, auto }).
export function recruitCombatant(r, T = TUNING) {
  const m = MONSTERS[r.type];
  const stats = r.stats || monsterStats(m.profile, r.level, T);
  const maxHp = maxHpFor(r.level, stats.vi, T);
  const maxMp = maxMpFor(r.level, stats.ma, T);
  return {
    key: `r${r.uid}`, name: m.name, side: 'player', type: r.type, level: r.level, stats,
    hp: Math.min(r.hp, maxHp), maxHp, mp: Math.min(r.mp, maxMp), maxMp,
    aff: { ...m.aff }, skills: [...r.skills], attackElement: 'phys', buffs: freshBuffs(),
    atkBonus: 0, defBonus: 0, icons: 1, boss: false, isHero: false,
    knows: r.knows, ref: r, auto: !!r.auto,
  };
}

export function recruitMax(r, T = TUNING) {
  const m = MONSTERS[r.type];
  const stats = r.stats || monsterStats(m.profile, r.level, T);
  return { maxHp: maxHpFor(r.level, stats.vi, T), maxMp: maxMpFor(r.level, stats.ma, T), stats };
}

// An enemy of `type` at `level`. boss = { hpMult, icons, ... } for bosses.
export function enemyCombatant(type, level, key, { T = TUNING, boss = null } = {}) {
  const m = MONSTERS[type];
  const stats = monsterStats(m.profile, level, T);
  const hpMult = boss?.hpMult ?? (m.hpMult || enemyHpMult(level, T));
  const maxHp = Math.round(maxHpFor(level, stats.vi, T) * hpMult);
  const maxMp = maxMpFor(level, stats.ma, T) * (boss ? 3 : 1);
  return {
    key, name: m.name, side: 'enemy', type, level, stats, hp: maxHp, maxHp, mp: maxMp, maxMp,
    aff: { ...m.aff }, skills: skillsAt(type, level).filter((s) => s !== 'attack'), attackElement: 'phys',
    buffs: freshBuffs(), atkBonus: m.atkBonus || 0, defBonus: m.defBonus || 0, icons: boss?.icons ?? 1, boss: !!boss,
    isHero: false, knows: null, ref: null, auto: true, bossDef: boss,
  };
}
