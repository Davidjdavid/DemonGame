// Battle engine: press turns, affinities, knowledge on both sides. Pure: no DOM; randomness via state.rng.
// Adapted from DemonGame's engine (string affinity tiers, analyze, items with elements, battle-wide enemy memory).
import { newIcons, spend, worstResult, iconsLeft, RESULT } from './pressTurn.js';
import { TAKEN, tierOf, ELEMENTS } from './affinity.js';
import { SKILLS } from '../data/skills.js';
import { ITEMS } from '../data/items.js';
import { TUNING, enemyDmgMult } from './tuning.js';
import { BUFF_STATS } from './units.js';
import { MONSTERS } from '../data/monsters.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const alive = (c) => c.hp > 0 && !c.gone;

export function createBattle({ party, enemies, rng, first = 'player', inventory = null, tuning = {}, canEscape = true }) {
  const state = {
    rng,
    tuning: { ...TUNING, ...tuning },
    inventory,
    sides: { player: party, enemy: enemies },
    turnSide: null,
    icons: newIcons(0),
    actorPtr: { player: 0, enemy: 0 },
    round: 0,
    enemyKnows: Object.fromEntries(party.map((p) => [p.key, {}])), // what the enemies have seen of your party
    canEscape,
    log: [],
    outcome: null,
  };
  startSideTurn(state, first);
  return state;
}

export const opponents = (state, c) => state.sides[c.side === 'player' ? 'enemy' : 'player'];
export const allies = (state, c) => state.sides[c.side];
export const findUnit = (state, key) => [...state.sides.player, ...state.sides.enemy].find((c) => c.key === key);

function startSideTurn(state, side) {
  state.turnSide = side;
  state.actorPtr[side] = 0;
  if (side === 'player') state.round++;
  const icons = state.sides[side].filter(alive).reduce((n, c) => n + c.icons, 0);
  state.icons = newIcons(icons);
  state.log.push({ type: 'turn', side, round: state.round, icons });
}

function endSideTurn(state) {
  for (const c of state.sides[state.turnSide]) {
    for (const k of BUFF_STATS) {
      const b = c.buffs[k];
      if (b.turns > 0 && --b.turns === 0) b.stacks = 0;
    }
  }
  if (!state.outcome) startSideTurn(state, state.turnSide === 'player' ? 'enemy' : 'player');
}

// Whose action is next on the current side (skips the fallen, cycles).
export function currentActor(state) {
  const list = state.sides[state.turnSide];
  const n = list.length;
  for (let i = 0; i < n; i++) {
    const idx = (state.actorPtr[state.turnSide] + i) % n;
    if (alive(list[idx])) {
      state.actorPtr[state.turnSide] = idx;
      return list[idx];
    }
  }
  return null;
}

function advanceActor(state, actor) {
  // A unit with several icons (a boss) acts again only when it's alone on its side.
  if (actor.icons > 1 && state.sides[actor.side].filter(alive).length === 1) return;
  const list = state.sides[state.turnSide];
  state.actorPtr[state.turnSide] = (list.indexOf(actor) + 1) % list.length;
}

export function skillCost(c, skill) {
  if (skill.cost?.mp) return { mp: skill.cost.mp, hp: 0 };
  if (skill.cost?.hpPct) return { mp: 0, hp: Math.max(1, Math.floor((c.maxHp * skill.cost.hpPct) / 100)) };
  return { mp: 0, hp: 0 };
}

export function canAfford(c, skill) {
  const { mp, hp } = skillCost(c, skill);
  return c.mp >= mp && (hp === 0 || c.hp > hp);
}

export function unitSkills(c) {
  return ['attack', ...c.skills].map((id) => SKILLS[id]).filter(Boolean);
}

export function usableSkills(state, c) {
  return unitSkills(c).filter((s) => canAfford(c, s) && validTargets(state, c, s).length > 0);
}

// Possible target groups for a skill or item target type: arrays of combatants (one entry per choice).
export function targetsFor(state, c, target) {
  const foes = opponents(state, c).filter(alive);
  const friends = allies(state, c).filter(alive);
  switch (target) {
    case 'one': return foes.map((f) => [f]);
    case 'all': case 'random': return foes.length ? [foes] : [];
    case 'ally': return friends.map((f) => [f]);
    case 'allies': return friends.length ? [friends] : [];
    case 'dead_ally': return allies(state, c).filter((a) => a.hp <= 0 && !a.gone).map((a) => [a]);
    case 'self': return [[c]];
    default: return [];
  }
}
export const validTargets = (state, c, skill) => targetsFor(state, c, skill.target);

// ---- Knowledge -------------------------------------------------------------------------------------------------
// Your side: every party member present remembers what it saw (persistent `knows[type][el] = tier`).
function learn(state, ev, type, el, tier) {
  if (el === 'almighty' || !type) return;
  let fresh = false;
  for (const p of state.sides.player) {
    if (!p.knows || p.gone) continue;
    const k = (p.knows[type] ||= {});
    if (k[el] !== tier) { k[el] = tier; fresh = true; }
  }
  if (fresh) ev.learned.push({ type, el, tier });
}

// What your party (anyone present) knows about an enemy type's affinity to `el`: a tier or null.
export function knownTier(state, type, el) {
  if (el === 'almighty') return 'normal';
  for (const p of state.sides.player) {
    if (p.gone) continue;
    const t = p.knows?.[type]?.[el];
    if (t) return t;
  }
  return null;
}

// Enemy side: once any enemy sees one of your affinities, all of them know it for the rest of this battle.
function expose(state, ev, target, el, tier) {
  if (el === 'almighty' || target.side !== 'player') return;
  const k = (state.enemyKnows[target.key] ||= {});
  if (!k[el]) { k[el] = tier; if (tier !== 'normal') ev.exposed.push({ target: target.key, el, tier }); }
}

// ---- Damage ----------------------------------------------------------------------------------------------------
export function rawDamage(state, user, target, skill, fixedPower = null) {
  const T = state.tuning;
  let dmg;
  if (fixedPower !== null) {
    dmg = fixedPower * (1 + 0.05 * user.level);
  } else {
    const magic = skill.stat === 'ma';
    const A = (magic ? user.stats.ma : user.stats.st) * 1.5 + user.level + (magic ? 0 : user.atkBonus);
    const D = target.stats.vi + target.level * 0.5 + target.defBonus * (magic ? 0.5 : 1) + T.defBase;
    const sideK = user.side === 'enemy' ? (user.bossDef?.dmgMult ?? enemyDmgMult(user.level, T)) : 1;
    dmg = ((skill.power * A) / D) * T.dmgK * sideK;
    dmg *= 1 + T.atkBuff * user.buffs.atk.stacks;
  }
  dmg *= 1 - T.defBuff * target.buffs.def.stacks;
  dmg *= 0.9 + state.rng() * 0.2;
  return Math.max(1, dmg);
}

export function hitChance(state, user, target, skill) {
  if (skill.element === 'almighty') return 1;
  const T = state.tuning;
  const agi = (user.stats.ag - target.stats.ag) * 0.01;
  const buff = (user.buffs.agi.stacks - target.buffs.agi.stacks) * T.agiBuff;
  return clamp(skill.accuracy + agi + buff, 0.3, 0.99);
}

function hurt(target, amount) {
  target.hp = clamp(Math.round(target.hp - amount), 0, target.maxHp);
}

// One hit on one target. Returns the press-turn result.
function attackHit(state, user, target, skill, ev, fixedPower = null) {
  const el = skill.element;
  if (state.rng() > hitChance(state, user, target, skill)) {
    ev.hits.push({ target: target.key, result: 'miss' });
    return 'miss';
  }
  const tier = tierOf(target.aff, el);
  if (user.side === 'player') learn(state, ev, target.type, el, tier);
  else expose(state, ev, target, el, tier);
  if (tier === 'repel') {
    const backTier = tierOf(user.aff, el);
    const back = ['null', 'repel', 'absorb'].includes(backTier) ? 0 : rawDamage(state, user, user, skill, fixedPower) * TAKEN[backTier];
    hurt(user, back);
    ev.hits.push({ target: target.key, result: 'reflect', amount: Math.round(back), reflectedTo: user.key, killed: user.hp === 0 });
    return 'reflect';
  }
  if (tier === 'null') {
    ev.hits.push({ target: target.key, result: 'null' });
    return 'null';
  }
  let dmg = rawDamage(state, user, target, skill, fixedPower);
  if (tier === 'absorb') {
    const heal = Math.round(dmg);
    target.hp = clamp(target.hp + heal, 0, target.maxHp);
    ev.hits.push({ target: target.key, result: 'absorb', amount: heal });
    return 'absorb';
  }
  let crit = false;
  if (skill.stat === 'st' && fixedPower === null) {
    const chance = state.tuning.critBase + (user.stats.lu - target.stats.lu) * 0.005;
    crit = state.rng() < clamp(chance, 0.01, 0.3);
    if (crit) dmg *= state.tuning.critMult;
  }
  dmg *= TAKEN[tier];
  hurt(target, dmg);
  const result = tier === 'weak' ? 'weak' : crit ? 'crit' : 'normal';
  ev.hits.push({ target: target.key, result, amount: Math.max(1, Math.round(dmg)), crit, resist: tier === 'resist', killed: target.hp === 0 });
  return result;
}

function healAmount(state, user, target, power) {
  const k = clamp(0.7 + (user.stats.ma || 0) * 0.02, 0.7, 1.5) * state.tuning.healK;
  return Math.max(1, Math.round(((target.maxHp * power) / 100) * k * (0.92 + state.rng() * 0.16)));
}

function applyBuff(c, stat, stacks, turns = 3) {
  const b = c.buffs[stat];
  b.stacks = clamp(b.stacks + stacks, -2, 2);
  b.turns = b.stacks === 0 ? 0 : Math.max(b.turns, turns);
}

function resolveSkill(state, user, skill, targets) {
  const ev = newEvent(user, { skill: skill.id, element: skill.element });
  const { mp, hp } = skillCost(user, skill);
  user.mp -= mp;
  user.hp -= hp;
  const results = [];
  if (skill.kind === 'attack') {
    const [lo, hi] = skill.hits;
    const n = lo + Math.floor(state.rng() * (hi - lo + 1));
    if (skill.target === 'random') {
      for (let i = 0; i < n; i++) {
        const pool = targets.filter(alive);
        if (!pool.length || !alive(user)) break;
        const t = pool[Math.floor(state.rng() * pool.length)];
        results.push(attackHit(state, user, t, skill, ev));
      }
    } else {
      for (const t of targets) {
        if (!alive(user)) break; // a repelled hit can kill the attacker
        for (let i = 0; i < n && alive(t); i++) {
          const r = attackHit(state, user, t, skill, ev);
          results.push(r);
          if (r === 'miss' || r === 'null' || r === 'absorb' || r === 'reflect') break;
        }
      }
    }
  } else if (skill.kind === 'heal') {
    for (const t of targets) {
      const amt = healAmount(state, user, t, skill.power);
      t.hp = clamp(t.hp + amt, 0, t.maxHp);
      ev.effects.push({ target: t.key, heal: amt });
    }
    results.push('normal');
  } else if (skill.kind === 'revive') {
    const t = targets[0];
    t.hp = Math.max(1, Math.round((t.maxHp * skill.power) / 100));
    ev.effects.push({ target: t.key, revived: true, heal: t.hp });
    results.push('normal');
  } else if (skill.kind === 'buff') {
    for (const t of targets) applyBuff(t, skill.buff.stat, skill.buff.stacks);
    ev.effects.push({ buff: skill.buff, targets: targets.map((t) => t.key) });
    results.push('normal');
  } else if (skill.kind === 'debuff') {
    const hit = targets.filter((t) => state.rng() < hitChance(state, user, t, skill) + 0.05);
    for (const t of hit) applyBuff(t, skill.buff.stat, skill.buff.stacks);
    ev.effects.push({ buff: skill.buff, targets: hit.map((t) => t.key), missed: targets.filter((t) => !hit.includes(t)).map((t) => t.key) });
    results.push(hit.length ? 'normal' : 'miss');
  } else if (skill.kind === 'dispel') {
    for (const t of targets) for (const k of BUFF_STATS) if (t.buffs[k].stacks > 0) { t.buffs[k].stacks = 0; t.buffs[k].turns = 0; }
    ev.effects.push({ dispel: true, targets: targets.map((t) => t.key) });
    results.push('normal');
  }
  ev.result = worstResult(results.length ? results : ['normal']);
  return ev;
}

function newEvent(actor, extra = {}) {
  return { type: 'action', actor: actor.key, side: actor.side, hits: [], effects: [], learned: [], exposed: [], ...extra };
}

function useItem(state, actor, action) {
  const item = ITEMS[action.item];
  if (!state.inventory || !(state.inventory[action.item] > 0) || !item || !['battle', 'both'].includes(item.use)) {
    throw new Error(`can't use ${action.item}`);
  }
  const e = item.effect;
  const group = targetsFor(state, actor, item.target).find((g) => g.some((t) => t.key === action.targets?.[0]))
    ?? (item.target === 'allies' ? targetsFor(state, actor, 'allies')[0] : null);
  if (!group) throw new Error('bad item target');
  state.inventory[action.item] -= 1;
  if (state.inventory[action.item] <= 0) delete state.inventory[action.item];
  if (e.damage) {
    const ev = newEvent(actor, { item: action.item, element: e.element });
    const fake = { element: e.element, accuracy: 0.98, stat: null };
    ev.result = attackHit(state, actor, group[0], fake, ev, e.damage);
    return ev;
  }
  const ev = newEvent(actor, { item: action.item, element: 'heal', result: RESULT.NORMAL });
  for (const t of group) {
    const fx = { target: t.key };
    if (e.revive) { t.hp = Math.max(1, Math.round((t.maxHp * e.revive) / 100)); fx.revived = true; fx.heal = t.hp; }
    if (e.hp) { const b = t.hp; t.hp = Math.min(t.maxHp, t.hp + e.hp); fx.heal = t.hp - b; }
    if (e.mp) { const b = t.mp; t.mp = Math.min(t.maxMp, t.mp + e.mp); fx.mp = t.mp - b; }
    ev.effects.push(fx);
  }
  return ev;
}

// Boss aspect changes: when a boss drops below a phase threshold it becomes another type (new affinities, skills
// and icons). Your party's knowledge is per type, so its chips go back to '?' until you learn the new aspect.
function checkPhases(state, ev) {
  for (const e of state.sides.enemy) {
    const phases = e.bossDef?.phases;
    if (!phases || e.hp <= 0) continue;
    e.phase ||= 0;
    while (e.phase < phases.length && e.hp / e.maxHp < phases[e.phase].below) {
      const p = phases[e.phase++];
      const m = MONSTERS[p.type];
      e.type = p.type;
      e.aff = { ...m.aff };
      e.skills = [...m.skills];
      e.icons = p.icons ?? e.icons;
      for (const b of Object.values(e.buffs)) { b.stacks = 0; b.turns = 0; }
      ev.effects.push({ phase: p.type, target: e.key, line: p.line });
    }
  }
}

function checkEnd(state) {
  if (!state.sides.player.some(alive)) state.outcome = 'lose';
  else if (!state.sides.enemy.some(alive)) state.outcome = 'win';
  return state.outcome;
}

export function escapeChance(state) {
  if (!state.canEscape || state.sides.enemy.some((e) => e.boss && alive(e))) return 0;
  const avg = (l) => l.reduce((n, c) => n + c.stats.ag + c.buffs.agi.stacks * 2, 0) / Math.max(1, l.length);
  return clamp(0.55 + (avg(state.sides.player.filter(alive)) - avg(state.sides.enemy.filter(alive))) * 0.03, 0.2, 0.92);
}

/**
 * The current actor takes an action:
 *   { type: 'skill', skill, targets: [keys] } | { type: 'item', item, targets: [key] } | { type: 'pass' } |
 *   { type: 'escape' } | { type: 'analyze', target: key } | { type: 'talk', target: key, outcome } (Stage 3)
 * Returns the event (also pushed to state.log). Advances turns automatically.
 */
export function act(state, action) {
  if (state.outcome) throw new Error('battle is over');
  const actor = currentActor(state);
  let ev;
  if (action.type === 'pass') {
    ev = newEvent(actor, { pass: true, result: RESULT.PASS });
  } else if (action.type === 'item') {
    ev = useItem(state, actor, action);
  } else if (action.type === 'escape') {
    const ok = state.rng() < escapeChance(state);
    ev = newEvent(actor, { escape: ok, result: RESULT.NORMAL });
    if (ok) state.outcome = 'escaped';
  } else if (action.type === 'analyze') {
    const t = findUnit(state, action.target);
    if (!t || !alive(t) || t.side === actor.side) throw new Error('bad analyze target');
    ev = newEvent(actor, { analyze: t.key, result: RESULT.NORMAL });
    for (const el of ELEMENTS) learn(state, ev, t.type, el, tierOf(t.aff, el));
  } else if (action.type === 'talk') {
    const t = findUnit(state, action.target);
    if (!t || !alive(t)) throw new Error('bad talk target');
    const o = action.outcome;
    ev = newEvent(actor, { talk: t.key, outcome: o, result: action.result || RESULT.NORMAL });
    if (['joined', 'left', 'fled', 'gift'].includes(o)) { t.gone = o; }
    if (action.endTurn) ev.result = RESULT.ABSORB; // the talk went badly: your turn ends
  } else {
    const skill = SKILLS[action.skill];
    if (!skill || (skill.id !== 'attack' && !actor.skills.includes(skill.id))) throw new Error(`${actor.name} can't use ${action.skill}`);
    if (!canAfford(actor, skill)) throw new Error(`${actor.name} can't afford ${skill.name}`);
    const pool = [...state.sides.player, ...state.sides.enemy];
    const targets = action.targets.map((k) => pool.find((c) => c.key === k)).filter(Boolean);
    const valid = validTargets(state, actor, skill).some((g) => g.length === targets.length && g.every((t) => targets.includes(t)));
    if (!valid) throw new Error(`bad targets for ${skill.name}`);
    const effective = skill.id === 'attack' && actor.attackElement !== 'phys' ? { ...skill, element: actor.attackElement } : skill;
    ev = resolveSkill(state, actor, effective, targets);
  }
  ev.round = state.round;
  if (state.outcome === 'escaped') {
    state.log.push(ev);
    return ev;
  }
  checkPhases(state, ev);
  spend(state.icons, ev.result);
  ev.icons = { ...state.icons };
  state.log.push(ev);
  if (checkEnd(state)) return ev;
  advanceActor(state, actor);
  if (iconsLeft(state.icons) === 0 || !state.sides[state.turnSide].some(alive)) {
    endSideTurn(state);
    ev.turnEnded = true;
  }
  return ev;
}
