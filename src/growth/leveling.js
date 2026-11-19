// Leveling (DESIGN: Growth). Demons learn set skills up to their prime level (base + 6); past prime they
// learn nothing and each level needs 1.5x more EXP. The protagonist grows normally and gets stat points.
import { DEMONS } from '../data/index.js';
import { BATTLE } from '../data/battleData.js';
import { SKILL_SLOTS } from '../game/demons.js';
import { register } from './compendium.js';
import { maxHpFor, maxMpFor } from '../combat/stats.js';

export const PRIME_OFFSET = 6;
export const STAT_POINTS_PER_LEVEL = 3;

export function primeLevel(id) {
  return DEMONS[id].level + PRIME_OFFSET;
}

export function expToNext(level, prime = Infinity) {
  const base = 30 + level * 12;
  return Math.round(level >= prime ? base * 1.5 ** (level - prime + 1) : base);
}

// EXP for defeating an enemy at a level (bosses give more).
export function expFor(level, boss = false) {
  return Math.round((level * 2 + 8) * 1.6 * (boss ? 5 : 1));
}

export function learnsAt(id, level) {
  return (BATTLE[id].learns || []).filter((l) => l.level === level).map((l) => l.skill);
}

export function finalLearnLevel(id) {
  const ls = BATTLE[id].learns || [];
  return ls.length ? Math.max(...ls.map((l) => l.level)) : DEMONS[id].level;
}

// Has this demon learned its last learnable skill (so the protagonist may copy one of its skills)?
export function canTeach(demon) {
  return !demon.taught && demon.level >= finalLearnLevel(demon.id);
}

/** Give a demon EXP. Returns events: {type:'level', level}, {type:'learn', skill}, {type:'pending', skill}. */
export function gainDemonExp(player, demon, amount) {
  const events = [];
  const prime = primeLevel(demon.id);
  demon.exp += amount;
  let guard = 0;
  while (demon.exp >= expToNext(demon.level, prime) && guard++ < 99) {
    demon.exp -= expToNext(demon.level, prime);
    demon.level += 1;
    events.push({ type: 'level', level: demon.level });
    if (demon.level <= prime) {
      for (const skill of learnsAt(demon.id, demon.level)) {
        if (demon.skills.includes(skill)) continue;
        if (demon.skills.length < SKILL_SLOTS) {
          demon.skills.push(skill);
          events.push({ type: 'learn', skill });
        } else {
          demon.pendingLearn.push(skill);
          events.push({ type: 'pending', skill });
        }
      }
    }
  }
  register(player, demon);
  return events;
}

// Resolve a pending skill when slots are full: replace `oldSkill`, or pass null to forget the new one.
export function resolvePending(player, demon, newSkill, oldSkill) {
  demon.pendingLearn = demon.pendingLearn.filter((s) => s !== newSkill);
  if (oldSkill) {
    const i = demon.skills.indexOf(oldSkill);
    if (i >= 0) demon.skills[i] = newSkill;
  }
  register(player, demon);
}

/** Protagonist EXP: normal growth (no prime), +3 stat points per level, HP/MP max recomputed. */
export function gainPlayerExp(player, amount) {
  const events = [];
  player.exp += amount;
  let guard = 0;
  while (player.exp >= expToNext(player.level) && guard++ < 99) {
    player.exp -= expToNext(player.level);
    player.level += 1;
    player.statPoints += STAT_POINTS_PER_LEVEL;
    recomputeMax(player);
    events.push({ type: 'level', level: player.level });
    for (const skill of learnsAt('protagonist', player.level)) {
      if (player.skills.includes(skill) || player.skills.length >= SKILL_SLOTS) continue;
      player.skills.push(skill);
      events.push({ type: 'learn', skill });
    }
  }
  return events;
}

export function recomputeMax(player) {
  const hp = maxHpFor(player.level, player.stats);
  const mp = maxMpFor(player.level, player.stats);
  player.hp += Math.max(0, hp - player.maxHp);
  player.mp += Math.max(0, mp - player.maxMp);
  player.maxHp = hp;
  player.maxMp = mp;
  player.hp = Math.min(player.hp, player.maxHp);
  player.mp = Math.min(player.mp, player.maxMp);
}

export function spendStatPoint(player, stat) {
  if (player.statPoints <= 0 || !(stat in player.stats)) return false;
  player.stats[stat] += 1;
  player.statPoints -= 1;
  recomputeMax(player);
  return true;
}

// The protagonist copies one skill from a demon that has learned its final skill.
export function teachProtagonist(player, demon, skill) {
  if (!canTeach(demon)) return { ok: false, reason: `${DEMONS[demon.id].name} hasn't learned everything yet.` };
  if (!demon.skills.includes(skill)) return { ok: false, reason: 'He doesn\'t know that skill.' };
  if (player.skills.includes(skill)) return { ok: false, reason: 'You already know it.' };
  if (player.skills.length >= SKILL_SLOTS) return { ok: false, reason: 'Your skill slots are full.' };
  player.skills.push(skill);
  demon.taught = true;
  return { ok: true };
}
