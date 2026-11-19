// Victory rewards (pure): EXP and gold for defeated enemies, kill deeds, level-ups. Returns lines to show.
import { DEMONS } from '../data/index.js';
import { SKILLS } from '../data/skills.js';
import { partyDemons } from '../game/demons.js';
import { gainDemonExp, gainPlayerExp, expFor } from './leveling.js';

export const GOLD_PER_LEVEL = 15;

export function victoryRewards(enemies) {
  return {
    exp: enemies.reduce((n, e) => n + expFor(e.level, e.boss), 0),
    gold: enemies.reduce((n, e) => n + e.level * GOLD_PER_LEVEL, 0),
  };
}

// `enemies` are battle combatants; those that left through talk (`gone`) give nothing.
export function awardVictory(player, enemies) {
  const killed = enemies.filter((e) => !e.gone);
  if (!killed.length) return ['The fight is over.'];
  for (const e of killed) {
    const fam = DEMONS[e.demonId]?.family ?? 'demon';
    player.deeds.killed[fam] = (player.deeds.killed[fam] || 0) + 1;
  }
  const { exp, gold } = victoryRewards(killed);
  player.gold += gold;
  const lines = [`Victory! +${exp} EXP, +${gold} gold.`];
  for (const ev of gainPlayerExp(player, exp)) lines.push(`You reached Lv ${ev.level}! (+3 stat points)`);
  for (const d of partyDemons(player)) {
    if (d.hp === 0) continue; // fallen demons get no EXP
    const name = DEMONS[d.id].name;
    for (const ev of gainDemonExp(player, d, exp)) {
      if (ev.type === 'level') lines.push(`${name} reached Lv ${ev.level}.`);
      if (ev.type === 'learn') lines.push(`${name} learned ${SKILLS[ev.skill].name}!`);
      if (ev.type === 'pending') lines.push(`${name} wants to learn ${SKILLS[ev.skill].name}, but his slots are full (see Party).`);
    }
  }
  return lines;
}
