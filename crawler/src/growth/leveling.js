// EXP, levels and skill learning for the hero and recruits. Pure.
import { MONSTERS } from '../data/monsters.js';
import { recruitMax, heroDerived } from '../combat/units.js';
import { monsterStats } from '../combat/stats.js';

export const HERO_POINTS_PER_LEVEL = 3;
export const MAX_SKILLS = 6;

export function expToNext(level) {
  return Math.round(14 * level ** 1.55 + 16);
}

// EXP and money for defeating an enemy (the sim tunes these).
export function expFor(level, boss = false) {
  return Math.round((5 + level * 3.2) * (boss ? 6 : 1));
}
export function moneyFor(level, boss = false) {
  return Math.round((4 + level * 4) * (boss ? 5 : 1));
}

export function newHero(name = 'Hero') {
  const hero = {
    name, level: 1, exp: 0, points: 0,
    stats: { st: 5, ma: 3, vi: 5, ag: 4, lu: 3 },
    equip: { weapon: 'shortsword', armor: 'cloth' },
    skills: [], knows: {}, hp: 0, mp: 0,
  };
  const d = heroDerived(hero);
  hero.hp = d.maxHp;
  hero.mp = d.maxMp;
  return hero;
}

/** Hero EXP: +3 stat points per level to place; HP/MP grow with the new maxima. Returns level-up events. */
export function gainHeroExp(hero, amount) {
  const events = [];
  hero.exp += amount;
  let guard = 0;
  while (hero.exp >= expToNext(hero.level) && guard++ < 99) {
    const before = heroDerived(hero);
    hero.exp -= expToNext(hero.level);
    hero.level += 1;
    hero.points += HERO_POINTS_PER_LEVEL;
    const after = heroDerived(hero);
    if (hero.hp > 0) hero.hp += after.maxHp - before.maxHp;
    hero.mp += after.maxMp - before.maxMp;
    events.push({ who: hero.name, type: 'level', level: hero.level });
  }
  return events;
}

export function spendPoint(hero, stat) {
  if (hero.points <= 0 || !(stat in hero.stats)) return false;
  const before = heroDerived(hero);
  hero.stats[stat] += 1;
  hero.points -= 1;
  const after = heroDerived(hero);
  if (hero.hp > 0) hero.hp += after.maxHp - before.maxHp;
  hero.mp += after.maxMp - before.maxMp;
  return true;
}

// A new recruit instance at a level (stats grow with level by the type's profile).
let uidSeq = 1;
export function setUidSeq(n) { uidSeq = n; }
export function newRecruit(type, level, { skills = null, knows = null, uid = null } = {}) {
  const m = MONSTERS[type];
  const learned = [...m.skills, ...(m.learns || []).filter(([lv]) => lv <= level).map(([, s]) => s)].filter((s) => s !== 'attack');
  const r = {
    uid: uid ?? uidSeq++, type, level, exp: 0,
    skills: (skills ?? [...new Set(learned)]).slice(-MAX_SKILLS),
    knows: knows ?? { [type]: { ...fullAff(type) } }, // a monster knows its own kind
    hp: 0, mp: 0, auto: true,
  };
  r.stats = monsterStats(m.profile, level);
  const mx = recruitMax(r);
  r.hp = mx.maxHp;
  r.mp = mx.maxMp;
  return r;
}

function fullAff(type) {
  const out = {};
  for (const el of ['phys', 'fire', 'ice', 'elec', 'wind', 'light', 'dark']) out[el] = MONSTERS[type].aff[el] || 'normal';
  return out;
}

/** Recruit EXP: levels grow stats by profile; learns set skills (oldest dropped past 6). */
export function gainRecruitExp(r, amount) {
  const events = [];
  const m = MONSTERS[r.type];
  r.exp += amount;
  let guard = 0;
  while (r.exp >= expToNext(r.level) && guard++ < 99) {
    const before = recruitMax(r);
    r.exp -= expToNext(r.level);
    r.level += 1;
    r.stats = monsterStats(m.profile, r.level);
    const after = recruitMax(r);
    if (r.hp > 0) r.hp += after.maxHp - before.maxHp;
    r.mp += after.maxMp - before.maxMp;
    events.push({ who: m.name, type: 'level', level: r.level });
    for (const [lv, s] of m.learns || []) {
      if (lv === r.level && !r.skills.includes(s)) {
        r.skills.push(s);
        if (r.skills.length > MAX_SKILLS) r.skills.shift();
        events.push({ who: m.name, type: 'learn', skill: s });
      }
    }
  }
  return events;
}
