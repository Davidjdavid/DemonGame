// Battle engine (DESIGN: Combat, Elements and tiers, Stats). Pure: no DOM; all randomness via state.rng.
import { newIcons, spend, worstResult, iconsLeft, RESULT } from './pressTurn.js';
import { hitClass, damageTakenMult, ownSkillMult, supportDuration, debuffHitChance, healChance } from './affinity.js';
import { statsFor, maxHpFor, maxMpFor } from './stats.js';
import { SKILLS } from '../data/skills.js';
import { ITEM_EFFECTS, applyItem } from './items.js';

export const BUFF_STATS = ['atk', 'def', 'agi'];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Tunables for the damage formula (the sim adjusts these through `options.tuning`).
export const TUNING = {
  defBase: 20,          // flat defense added to the target's
  atkBuff: 0.2,         // damage per attack stack
  defBuff: 0.15,        // damage reduction per defense stack
  agiBuff: 0.1,         // accuracy/evasion per agility stack
  critBase: 0.05,
  critMult: 1.5,
  healScale: 10,
};

export function makeCombatant({ key, name, side, level, def, isProtagonist = false, boss = null, demonId = null, statsOverride = null }) {
  const stats = statsOverride ?? statsFor(def.profile, level);
  const all = def.skills.map((id) => SKILLS[id]).filter(Boolean);
  const passives = all.filter((s) => s.kind === 'passive');
  const repel = new Set(passives.map((s) => s.passive.repel).filter(Boolean));
  const counter = Math.max(0, ...passives.map((s) => s.passive.counter || 0));
  const hpBonus = passives.reduce((a, s) => a + (s.passive.hpBonus || 0), 0);
  const mpBonus = passives.reduce((a, s) => a + (s.passive.mpBonus || 0), 0);
  const maxHp = Math.round(maxHpFor(level, stats, hpBonus) * (boss?.hpMult ?? 1));
  const maxMp = Math.round(maxMpFor(level, stats, mpBonus) * (boss?.mpMult ?? 1));
  return {
    key, name, side, level, stats, demonId,
    tiers: { ...(def.tiers || {}) },
    skills: all.filter((s) => s.kind !== 'passive').map((s) => s.id),
    repel, counter,
    hp: maxHp, maxHp, mp: maxMp, maxMp,
    buffs: Object.fromEntries(BUFF_STATS.map((k) => [k, { stacks: 0, turns: 0 }])),
    isProtagonist,
    icons: boss?.icons ?? 1,
    dmgMult: boss?.dmgMult ?? 1,
    boss: !!boss,
  };
}

export function createBattle({ party, enemies, first = 'player', rng, known = {}, tuning = {}, inventory = null }) {
  const state = {
    rng,
    inventory, // the player's items object (consumed by Item actions); null = no items
    tuning: { ...TUNING, ...tuning },
    sides: { player: party, enemy: enemies },
    turnSide: null,
    icons: newIcons(0),
    actorPtr: { player: 0, enemy: 0 },
    round: 0,
    enemyHasActed: false,
    // What the player knows about each enemy's tiers (element -> true), and what enemies know of the player's weaknesses.
    known: Object.fromEntries(enemies.map((e) => [e.key, new Set(known[e.demonId] || [])])),
    revealed: Object.fromEntries(party.map((p) => [p.key, new Set()])),
    log: [],
    outcome: null,
  };
  startSideTurn(state, first);
  return state;
}

export const alive = (c) => c.hp > 0;
export const opponents = (state, c) => state.sides[c.side === 'player' ? 'enemy' : 'player'];
export const allies = (state, c) => state.sides[c.side];

function log(state, ev) {
  state.log.push({ round: state.round, side: state.turnSide, ...ev });
}

function startSideTurn(state, side) {
  state.turnSide = side;
  state.actorPtr[side] = 0; // each turn starts with the side's first member (the protagonist leads)
  if (side === 'player') state.round++;
  const icons = state.sides[side].filter(alive).reduce((n, c) => n + c.icons, 0);
  state.icons = newIcons(icons);
  log(state, { type: 'turn', icons });
  if (side === 'enemy' && icons > 0) state.enemyHasActed = true;
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

// The member whose action is next on the current side (skips the dead, cycles).
export function currentActor(state) {
  const list = state.sides[state.turnSide];
  const n = list.length;
  for (let i = 0; i < n; i++) {
    const c = list[(state.actorPtr[state.turnSide] + i) % n];
    if (alive(c)) {
      state.actorPtr[state.turnSide] = (state.actorPtr[state.turnSide] + i) % n;
      return c;
    }
  }
  return null;
}

function advanceActor(state, actor) {
  // A boss with several icons keeps acting; otherwise the next living member is up.
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

export function usableSkills(state, c) {
  const ids = ['attack', ...c.skills];
  return ids.map((id) => SKILLS[id]).filter((s) => s && canAfford(c, s) && validTargets(state, c, s).length > 0);
}

// Possible target groups for a skill: arrays of combatants (one entry per choice).
export function validTargets(state, c, skill) {
  const foes = opponents(state, c).filter(alive);
  const friends = allies(state, c).filter(alive);
  switch (skill.target) {
    case 'one': return foes.map((f) => [f]);
    case 'all': case 'enemies': case 'random': return foes.length ? [foes] : [];
    case 'ally': return friends.map((f) => [f]);
    case 'allies': return friends.length ? [friends] : [];
    case 'dead_ally': return allies(state, c).filter((a) => !alive(a) && !a.gone).map((a) => [a]);
    case 'self': return [[c]];
    default: return [];
  }
}

function tierOf(c, element) {
  return c.tiers[element] || 0;
}

export function rawDamage(state, user, target, skill) {
  const T = state.tuning;
  const atk = skill.stat === 'mag' ? user.stats.mag : user.stats.str;
  const own = skill.element === 'almighty' ? 1 : ownSkillMult(tierOf(user, skill.element));
  const atkPow = atk + user.level;
  const def = target.stats.vit + target.level / 2 + T.defBase;
  let dmg = (skill.power * atkPow) / def;
  dmg *= own * (user.dmgMult ?? 1);
  dmg *= 1 + T.atkBuff * user.buffs.atk.stacks;
  dmg *= 1 - T.defBuff * target.buffs.def.stacks;
  dmg *= 0.9 + state.rng() * 0.2;
  return Math.max(1, dmg);
}

function hitChance(state, user, target, skill) {
  if (skill.element === 'almighty') return 1;
  const T = state.tuning;
  const agi = (user.stats.agi - target.stats.agi) * 0.01;
  const buff = (user.buffs.agi.stacks - target.buffs.agi.stacks) * T.agiBuff;
  return clamp(skill.accuracy + agi + buff, 0.3, 1);
}

function reveal(state, user, target, element) {
  if (element === 'almighty') return;
  if (user.side === 'player' && state.known[target.key]) state.known[target.key].add(element);
  if (user.side === 'enemy' && state.revealed[target.key] && tierOf(target, element) < 0) state.revealed[target.key].add(element);
}

function damage(state, target, amount) {
  target.hp = clamp(Math.round(target.hp - amount), 0, target.maxHp);
}

// One hit of an attack skill on one target. Returns the press-turn result.
function attackHit(state, user, target, skill, ev) {
  if (state.rng() > hitChance(state, user, target, skill)) {
    ev.hits.push({ target: target.key, result: 'miss' });
    return 'miss';
  }
  const el = skill.element;
  if (el !== 'almighty' && target.repel.has(el)) {
    const back = rawDamage(state, user, user, skill) * damageTakenMult(tierOf(user, el));
    if (back > 0) damage(state, user, back);
    ev.hits.push({ target: target.key, result: 'reflect', amount: Math.round(back), reflectedTo: user.key });
    reveal(state, user, target, el);
    return 'reflect';
  }
  const tier = el === 'almighty' ? 0 : tierOf(target, el);
  const cls = el === 'almighty' ? 'normal' : hitClass(tier);
  reveal(state, user, target, el);
  if (cls === 'null') {
    ev.hits.push({ target: target.key, result: 'null' });
    return 'null';
  }
  let dmg = rawDamage(state, user, target, skill);
  if (cls === 'absorb') {
    const heal = Math.round(dmg);
    target.hp = clamp(target.hp + heal, 0, target.maxHp);
    ev.hits.push({ target: target.key, result: 'absorb', amount: heal });
    return 'absorb';
  }
  let crit = false;
  if (skill.stat === 'str') {
    const chance = state.tuning.critBase + (user.stats.luck - target.stats.luck) * 0.005;
    crit = state.rng() < clamp(chance, 0.01, 0.3);
    if (crit) dmg *= state.tuning.critMult;
  }
  if (el !== 'almighty') dmg *= damageTakenMult(tier);
  damage(state, target, dmg);
  const result = cls === 'weak' ? 'weak' : crit ? 'crit' : 'normal';
  ev.hits.push({ target: target.key, result, amount: Math.round(dmg), crit, killed: target.hp === 0 });
  return result;
}

function counterAttack(state, defender, attacker, ev) {
  if (!defender.counter || !alive(defender) || !alive(attacker)) return;
  if (state.rng() >= defender.counter) return;
  const basic = SKILLS.attack;
  const cev = { hits: [] };
  attackHit(state, defender, attacker, basic, cev);
  ev.counter = { by: defender.key, ...cev.hits[0] };
}

function healAmount(state, user, skill) {
  const base = (skill.power * (user.stats.mag * 0.6 + user.level * 0.4)) / state.tuning.healScale;
  return Math.round(base * ownSkillMult(tierOf(user, 'healing')) * (0.9 + state.rng() * 0.2));
}

function applyBuff(c, stat, stacks, turns) {
  const b = c.buffs[stat];
  b.stacks = clamp(b.stacks + stacks, -2, 2);
  b.turns = b.stacks === 0 ? 0 : Math.max(b.turns, turns);
}

function resolveSkill(state, user, skill, targets) {
  const ev = { type: 'action', actor: user.key, skill: skill.id, hits: [], effects: [] };
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
        if (!pool.length || !alive(user)) break; // a repelled hit can kill the attacker
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
        if (skill.element === 'phys' && skill.target === 'one') counterAttack(state, t, user, ev);
      }
    }
  } else if (skill.kind === 'heal') {
    for (const t of targets) {
      const amt = healAmount(state, user, skill);
      t.hp = clamp(t.hp + amt, 0, t.maxHp);
      ev.effects.push({ target: t.key, heal: amt });
    }
    results.push('normal');
  } else if (skill.kind === 'revive') {
    const t = targets[0];
    if (state.rng() < healChance(skill.chance, tierOf(user, 'healing'))) {
      t.hp = Math.max(1, Math.round((t.maxHp * skill.hpPct) / 100));
      ev.effects.push({ target: t.key, revived: true });
    } else {
      ev.effects.push({ target: t.key, revived: false });
    }
    results.push('normal');
  } else if (skill.kind === 'buff') {
    const turns = supportDuration(tierOf(user, 'support'));
    for (const t of targets) applyBuff(t, skill.stat, skill.stacks, turns);
    ev.effects.push({ buff: skill.stat, stacks: skill.stacks, turns, targets: targets.map((t) => t.key) });
    results.push('normal');
  } else if (skill.kind === 'debuff') {
    if (state.rng() < debuffHitChance(tierOf(user, 'support'))) {
      const turns = supportDuration(tierOf(user, 'support'));
      for (const t of targets) applyBuff(t, skill.stat, skill.stacks, turns);
      ev.effects.push({ debuff: skill.stat, stacks: skill.stacks, turns, targets: targets.map((t) => t.key) });
      results.push('normal');
    } else {
      ev.effects.push({ debuff: skill.stat, missed: true });
      results.push('miss');
    }
  }
  // Signature-move riders: a debuff that rides on a damaging hit, and life drain.
  if (skill.kind === 'attack' && alive(user)) {
    const landed = ev.hits.filter((x) => x.amount > 0 && ['normal', 'weak', 'crit'].includes(x.result));
    if (skill.rider && landed.length && state.rng() < debuffHitChance(tierOf(user, 'support'))) {
      const turns = supportDuration(tierOf(user, 'support'));
      const keys = [...new Set(landed.map((x) => x.target))];
      for (const k of keys) {
        const t = [...state.sides.player, ...state.sides.enemy].find((c) => c.key === k);
        if (t && alive(t)) applyBuff(t, skill.rider.stat, skill.rider.stacks, turns);
      }
      ev.effects.push({ debuff: skill.rider.stat, stacks: skill.rider.stacks, turns, targets: keys });
    }
    if (skill.drain && landed.length) {
      const heal = Math.round(landed.reduce((n, x) => n + x.amount, 0) * skill.drain);
      user.hp = clamp(user.hp + heal, 0, user.maxHp);
      ev.effects.push({ target: user.key, heal });
    }
  }
  ev.result = worstResult(results.length ? results : ['normal']);
  return ev;
}

function checkEnd(state) {
  const p = state.sides.player;
  const prot = p.find((c) => c.isProtagonist);
  if ((prot && !alive(prot)) || !p.some(alive)) state.outcome = 'lose';
  else if (!state.sides.enemy.some(alive)) state.outcome = 'win';
  return state.outcome;
}

/**
 * Take the current actor's action. action = { type: 'skill', skill: id, targets: [keys] } | { type: 'pass' }.
 * Returns the logged event. Advances turns automatically.
 */
export function act(state, action) {
  if (state.outcome) throw new Error('battle is over');
  const actor = currentActor(state);
  let ev;
  if (action.type === 'pass') {
    ev = { type: 'action', actor: actor.key, pass: true, result: RESULT.PASS, hits: [], effects: [] };
  } else if (action.type === 'item') {
    if (!state.inventory || !(state.inventory[action.item] > 0) || !ITEM_EFFECTS[action.item]) throw new Error(`no ${action.item}`);
    const target = state.sides[actor.side].find((c) => c.key === action.targets?.[0] && alive(c));
    if (!target) throw new Error('bad item target');
    state.inventory[action.item] -= 1;
    if (state.inventory[action.item] === 0) delete state.inventory[action.item];
    ev = { type: 'action', actor: actor.key, item: action.item, result: RESULT.NORMAL, hits: [], effects: [{ target: target.key, ...applyItem(target, action.item) }] };
  } else if (action.type === 'escape') {
    if (state.sides.enemy.some((f) => f.boss && alive(f))) throw new Error("can't escape a boss");
    const ok = state.rng() < escapeChance(state);
    // A failed escape costs one action (not the whole turn).
    ev = { type: 'action', actor: actor.key, escape: ok, result: RESULT.NORMAL, hits: [], effects: [] };
    if (ok) state.outcome = 'escaped';
  } else if (action.type === 'talk') {
    // The talk itself happens in the talk screen; this applies its outcome to the battle.
    const target = state.sides.enemy.find((c) => c.key === action.target);
    if (!target || !alive(target)) throw new Error('bad talk target');
    const o = action.outcome;
    ev = { type: 'action', actor: actor.key, talk: target.key, outcome: o, result: RESULT.NORMAL, hits: [], effects: [] };
    if (['joined', 'left', 'fled', 'passed'].includes(o)) { target.hp = 0; target.gone = o; }
    if (o === 'player_left') state.outcome = 'escaped';
    if (o === 'fight_demon_first') ev.result = RESULT.ABSORB; // he seizes the initiative: your turn ends
  } else {
    const skill = SKILLS[action.skill];
    if (!skill || (skill.id !== 'attack' && !actor.skills.includes(skill.id))) throw new Error(`${actor.name} can't use ${action.skill}`);
    if (!canAfford(actor, skill)) throw new Error(`${actor.name} can't afford ${skill.name}`);
    const pool = [...state.sides.player, ...state.sides.enemy];
    const targets = action.targets.map((k) => pool.find((c) => c.key === k)).filter(Boolean);
    const valid = validTargets(state, actor, skill).some((g) => g.length === targets.length && g.every((t) => targets.includes(t)));
    if (!valid) throw new Error(`bad targets for ${skill.name}`);
    ev = resolveSkill(state, actor, skill, targets);
  }
  if (state.outcome === 'escaped') {
    ev.round = state.round;
    ev.side = state.turnSide;
    state.log.push(ev);
    return ev;
  }
  spend(state.icons, ev.result);
  ev.icons = { ...state.icons };
  ev.round = state.round;
  ev.side = state.turnSide;
  state.log.push(ev);
  if (checkEnd(state)) return ev;
  advanceActor(state, actor);
  if (iconsLeft(state.icons) === 0 || !state.sides[state.turnSide].some(alive)) endSideTurn(state);
  return ev;
}

export function escapeChance(state) {
  const avg = (l) => l.reduce((n, c) => n + c.stats.agi, 0) / Math.max(1, l.length);
  return clamp(0.55 + (avg(state.sides.player.filter(alive)) - avg(state.sides.enemy.filter(alive))) * 0.02, 0.25, 0.9);
}

// What the player knows about an enemy's tier for an element: a number, or null if unknown.
export function knownTier(state, enemy, element) {
  return state.known[enemy.key]?.has(element) ? tierOf(enemy, element) : null;
}
