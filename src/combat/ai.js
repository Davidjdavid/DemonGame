// Enemy AI: weighted random over usable skills. Favors a player weakness once revealed.
import { usableSkills, validTargets, alive } from './battle.js';

export function enemyChoose(state, actor) {
  const options = [];
  for (const skill of usableSkills(state, actor)) {
    for (const group of validTargets(state, actor, skill)) {
      let w = 1;
      if (skill.kind === 'attack') {
        const weakHits = group.filter((t) => state.revealed[t.key]?.has(skill.element)).length;
        if (weakHits) w *= 1 + 4 * weakHits;
        if (skill.id === 'attack') w *= 0.6;
        if (group.length === 1) w *= 1 + (1 - group[0].hp / group[0].maxHp) * 0.5;
      } else if (skill.kind === 'heal') {
        const hurt = group.filter((t) => t.hp / t.maxHp < 0.5).length;
        w = hurt ? 2 + hurt : 0.05;
      } else if (skill.kind === 'revive') {
        w = 3;
      } else if (skill.kind === 'buff') {
        w = group.every((t) => t.buffs[skill.stat].stacks >= 2) ? 0.02 : 0.5;
      } else if (skill.kind === 'debuff') {
        w = group.every((t) => t.buffs[skill.stat].stacks <= -2) ? 0.02 : 0.5;
      }
      options.push({ w, action: { type: 'skill', skill: skill.id, targets: group.map((t) => t.key) } });
    }
  }
  const total = options.reduce((s, o) => s + o.w, 0);
  let r = state.rng() * total;
  for (const o of options) {
    if ((r -= o.w) <= 0) return o.action;
  }
  return options.length ? options[options.length - 1].action : { type: 'pass' };
}

export function isAliveSide(state, side) {
  return state.sides[side].some(alive);
}
