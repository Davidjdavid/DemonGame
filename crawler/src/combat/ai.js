// Battle policies. Pure.
// enemyChoose: enemies don't know your affinities at first and try varied elements; once any of them has seen a
// weakness (or a null/repel/absorb) they all exploit (or avoid) it for the rest of the battle.
// smartChoose: the auto-battle / sim policy for your side: revive, heal when needed, press known weaknesses, avoid
// known nulls/repels/absorbs, pass to a partner who can hit a weakness.
// randomChoose: any usable action (sim baseline).
import { usableSkills, validTargets, alive, knownTier, allies, opponents } from './battle.js';
import { ITEMS } from '../data/items.js';
import { SKILLS } from '../data/skills.js';

const SKILL_KIND = Object.fromEntries(Object.entries(SKILLS).map(([id, s]) => [id, s.kind]));

function pickWeighted(rng, options) {
  const total = options.reduce((s, o) => s + o.w, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const o of options) if ((r -= o.w) <= 0) return o.action;
  return options[options.length - 1].action;
}

const BAD = new Set(['null', 'repel', 'absorb']);

export function enemyChoose(state, actor) {
  const tried = (state.enemyTried ||= {});
  const options = [];
  for (const skill of usableSkills(state, actor)) {
    for (const group of validTargets(state, actor, skill)) {
      let w = 1;
      if (skill.kind === 'attack') {
        const el = skill.id === 'attack' ? actor.attackElement : skill.element;
        let sum = 0;
        for (const t of group) {
          const k = state.enemyKnows[t.key]?.[el];
          let tw = 1;
          if (k === 'weak') tw = 7;
          else if (BAD.has(k)) tw = 0;
          else if (k === 'resist') tw = 0.4;
          else if (!k && !(tried[t.key]?.has(el))) tw = 1.7; // try something new on this target
          if (group.length === 1) tw *= 1 + (1 - t.hp / t.maxHp) * 0.6;
          sum += tw;
        }
        w = group.length > 1 ? (sum / group.length) * 1.2 : sum;
        if (group.some((t) => BAD.has(state.enemyKnows[t.key]?.[el]))) w *= 0.15;
        if (skill.id === 'attack') w *= 0.7;
      } else if (skill.kind === 'heal') {
        const hurt = group.filter((t) => t.hp / t.maxHp < 0.5).length;
        w = hurt ? 2.5 + hurt : 0;
      } else if (skill.kind === 'revive') {
        w = 3;
      } else if (skill.kind === 'buff') {
        w = group.every((t) => t.buffs[skill.buff.stat].stacks >= 2) ? 0 : 0.45;
      } else if (skill.kind === 'debuff') {
        w = group.every((t) => t.buffs[skill.buff.stat].stacks <= -2) ? 0 : 0.45;
      } else if (skill.kind === 'dispel') {
        w = group.some((t) => Object.values(t.buffs).some((b) => b.stacks > 0)) ? 1.5 : 0;
      }
      options.push({ w, action: { type: 'skill', skill: skill.id, targets: group.map((t) => t.key) }, skill, group });
    }
  }
  const choice = pickWeighted(state.rng, options) ?? { type: 'pass' };
  // Remember which elements were tried on whom (drives the variety bonus).
  const o = options.find((x) => x.action === choice);
  if (o?.skill?.kind === 'attack') {
    const el = o.skill.id === 'attack' ? actor.attackElement : o.skill.element;
    for (const t of o.group) (tried[t.key] ||= new Set()).add(el);
  }
  return choice;
}

// Rough expected damage (no randomness) for ranking choices.
function estimate(state, user, target, skill) {
  const T = state.tuning;
  const magic = skill.stat === 'ma';
  const A = (magic ? user.stats.ma : user.stats.st) * 1.5 + user.level + (magic ? 0 : user.atkBonus);
  const D = target.stats.vi + target.level * 0.5 + target.defBonus * (magic ? 0.5 : 1) + T.defBase;
  const hits = (skill.hits[0] + skill.hits[1]) / 2;
  return ((skill.power * A) / D) * T.dmgK * (1 + T.atkBuff * user.buffs.atk.stacks) * hits;
}

const TIER_MULT = { weak: 1.5, normal: 1, resist: 0.5, null: 0, repel: -1, absorb: -1 };

// Best attack for `actor` against the current enemies: { action, score, weak }.
function bestAttack(state, actor) {
  let best = null;
  for (const skill of usableSkills(state, actor)) {
    if (skill.kind !== 'attack') continue;
    const el = skill.id === 'attack' ? actor.attackElement : skill.element;
    for (const group of validTargets(state, actor, skill)) {
      let score = 0;
      let weak = false;
      let bad = false;
      for (const t of group) {
        const k = knownTier(state, t.type, el);
        if (k && BAD.has(k)) { bad = true; break; }
        const m = k ? TIER_MULT[k] : 0.9;
        const dmg = Math.min(t.hp, estimate(state, actor, t, skill) * m);
        score += dmg + (dmg >= t.hp ? 15 : 0);
        if (k === 'weak') weak = true;
      }
      if (bad) continue;
      if (weak) score *= 1.6; // half an icon: worth a lot
      const cost = skill.cost?.mp || 0;
      score -= cost * 0.6 * (actor.mp < actor.maxMp * 0.3 ? 2 : 1);
      if (skill.cost?.hpPct) score -= (actor.maxHp * skill.cost.hpPct) / 100 * 0.5;
      if (!best || score > best.score) best = { action: { type: 'skill', skill: skill.id, targets: group.map((t) => t.key) }, score, weak };
    }
  }
  return best;
}

export function smartChoose(state, actor) {
  const friends = allies(state, actor);
  const skills = usableSkills(state, actor);
  const inv = state.autoItems === false ? {} : state.inventory || {};
  // 1. Revive a fallen ally (the hero first).
  const isHealer = (f) => f.skills.some((s) => SKILL_KIND[s] === 'heal' || SKILL_KIND[s] === 'revive');
  const rank = (f) => (f.isHero ? 2 : isHealer(f) ? 1 : 0);
  const dead = friends.filter((f) => f.hp <= 0 && !f.gone).sort((a, b) => rank(b) - rank(a));
  if (dead.length) {
    const rev = skills.find((s) => s.kind === 'revive');
    if (rev) return { type: 'skill', skill: rev.id, targets: [dead[0].key] };
    if (inv.revival_bead > 0 && (dead[0].isHero || friends.filter(alive).length <= 1)) return { type: 'item', item: 'revival_bead', targets: [dead[0].key] };
  }
  // 2. Heal when someone is low.
  // Heal before it's too late: anyone under 55%, a healer under 65% (losing the healer starts a death spiral).
  const low = friends.filter((f) => alive(f) && f.hp / f.maxHp < (isHealer(f) ? 0.65 : 0.55));
  if (low.length) {
    const group = skills.find((s) => s.kind === 'heal' && s.target === 'allies');
    if (group && low.length >= 2) return { type: 'skill', skill: group.id, targets: friends.filter(alive).map((f) => f.key) };
    const single = skills.filter((s) => s.kind === 'heal' && s.target === 'ally').sort((a, b) => a.power - b.power);
    const worst = low.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (single.length) return { type: 'skill', skill: (worst.hp / worst.maxHp < 0.2 ? single[single.length - 1] : single[0]).id, targets: [worst.key] };
    const med = ['salve', 'medicine'].find((id) => inv[id] > 0);
    if (med && (worst === actor || worst.isHero) && worst.hp / worst.maxHp < 0.3) return { type: 'item', item: med, targets: [worst.key] };
  }
  const mine = bestAttack(state, actor);
  // 3. Pass to a partner who can hit a weakness when I can't (keeps the icon as a half icon).
  if ((!mine || !mine.weak) && state.icons.full > 0) {
    const others = friends.filter((f) => f !== actor && alive(f));
    if (others.some((o) => bestAttack(state, o)?.weak)) return { type: 'pass' };
  }
  // 4. Analyze an unknown, tough enemy if nothing useful is known and the party has spare icons.
  if (actor.isHero && mine && !mine.weak && state.round <= 1 && state.icons.full >= 2) {
    const unknown = opponents(state, actor).filter(alive).find((e) => !['fire', 'ice', 'elec', 'wind', 'light', 'dark', 'phys'].some((el) => knownTier(state, e.type, el)));
    const can = skills.some((s) => s.kind === 'analyze');
    if (unknown && can && unknown.maxHp > actor.maxHp * 0.6) return { type: 'skill', skill: 'analyze', targets: [unknown.key] };
  }
  // 5. Buffs when facing a boss.
  if (opponents(state, actor).some((e) => e.boss && alive(e))) {
    const buff = skills.find((s) => (s.kind === 'buff' && friends.filter(alive).some((f) => f.buffs[s.buff.stat].stacks < 1))
      || (s.kind === 'debuff' && opponents(state, actor).filter(alive).some((e) => e.buffs[s.buff.stat].stacks > -1)));
    if (buff && (!mine || !mine.weak) && state.rng() < 0.5) {
      return { type: 'skill', skill: buff.id, targets: validTargets(state, actor, buff)[0].map((t) => t.key) };
    }
    const dispel = skills.find((s) => s.kind === 'dispel');
    if (dispel && opponents(state, actor).some((e) => alive(e) && Object.values(e.buffs).some((b) => b.stacks > 0))) {
      return { type: 'skill', skill: dispel.id, targets: validTargets(state, actor, dispel)[0].map((t) => t.key) };
    }
  }
  if (mine) return mine.action;
  return { type: 'pass' };
}

export function randomChoose(state, actor) {
  const options = [];
  for (const skill of usableSkills(state, actor)) {
    for (const group of validTargets(state, actor, skill)) {
      if (skill.kind === 'heal' && !group.some((t) => t.hp < t.maxHp)) continue;
      options.push({ w: 1, action: { type: 'skill', skill: skill.id, targets: group.map((t) => t.key) } });
    }
  }
  return pickWeighted(state.rng, options) ?? { type: 'pass' };
}

export const usableItemIds = (inv, kinds = ['battle', 'both']) =>
  Object.keys(inv || {}).filter((id) => inv[id] > 0 && ITEMS[id] && kinds.includes(ITEMS[id].use));
