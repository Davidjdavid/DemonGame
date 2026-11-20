// Balance sim: runs many battles per scenario with a policy for each side and prints a table.
// Usage: node scripts/sim.mjs [scenarioName] [--n=400] [--policy=smart|random]
import { createBattle, act, currentActor, alive } from '../src/combat/battle.js';
import { enemyChoose, smartChoose, randomChoose } from '../src/combat/ai.js';
import { heroCombatant, recruitCombatant, enemyCombatant } from '../src/combat/units.js';
import { newHero, newRecruit, spendPoint } from '../src/growth/leveling.js';
import { rollGroup } from '../src/world/encounters.js';
import { makeRng } from '../src/core/rng.js';
import { SCENARIOS } from './sim-scenarios.mjs';

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
const N = Number(args.n || 400);

// Hero at a level with points spread by a build (default: balanced St/Vi/Ag).
export function heroAt(level, build = { st: 0.4, vi: 0.35, ag: 0.15, lu: 0.1 }, equip = null) {
  const h = newHero();
  h.level = level;
  h.points = (level - 1) * 3;
  const order = Object.entries(build);
  let acc = Object.fromEntries(order.map(([k]) => [k, 0]));
  while (h.points > 0) {
    // Give the point to the stat furthest below its share.
    const spent = Object.values(acc).reduce((a, b) => a + b, 0) + 1;
    const [k] = order.reduce((best, [kk, w]) => ((w * spent - acc[kk]) > (best[1] * spent - acc[best[0]]) ? [kk, w] : best), order[0]);
    acc[k] += 1;
    spendPoint(h, k);
  }
  if (equip) h.equip = { ...h.equip, ...equip };
  const c = heroCombatant(h);
  h.hp = c.maxHp;
  h.mp = c.maxMp;
  return h;
}

export function runBattle({ hero, recruits = [], group, rng, policy = smartChoose, inventory = {}, maxRounds = 40, boss = null }) {
  const party = [heroCombatant(hero), ...recruits.map((r) => recruitCombatant(r))];
  party.forEach((p) => { p.hp = p.maxHp; p.mp = p.maxMp; });
  const enemies = group.map((g, i) => enemyCombatant(g.type, g.level, `e${i}`, { boss: g.boss || boss }));
  const state = createBattle({ party, enemies, rng, inventory: { ...inventory } });
  let actions = 0;
  const hitsToKill = [];
  const hitsOn = Object.fromEntries(enemies.map((e) => [e.key, 0]));
  while (!state.outcome && state.round <= maxRounds) {
    const actor = currentActor(state);
    const action = actor.side === 'enemy' ? enemyChoose(state, actor) : policy(state, actor);
    const ev = act(state, action);
    actions++;
    if (actor.side === 'player' && ev.skill === 'attack') {
      for (const h of ev.hits) {
        if (hitsOn[h.target] !== undefined) {
          hitsOn[h.target] += 1;
          if (h.killed) hitsToKill.push(hitsOn[h.target]);
        }
      }
    }
  }
  const hpLost = party.reduce((s, p) => s + (p.maxHp - p.hp), 0) / party.reduce((s, p) => s + p.maxHp, 0);
  const mpUsed = party.reduce((s, p) => s + (p.maxMp - p.mp), 0) / Math.max(1, party.reduce((s, p) => s + p.maxMp, 0));
  return { outcome: state.outcome || 'timeout', rounds: state.round, hpLost, mpUsed, hitsToKill, heroDown: party[0].hp <= 0, state, actions };
}

function summarize(results) {
  const n = results.length;
  const avg = (f) => results.reduce((s, r) => s + f(r), 0) / n;
  const allHits = results.flatMap((r) => r.hitsToKill);
  const pct = (x) => `${Math.round(x * 100)}%`;
  return {
    win: pct(avg((r) => (r.outcome === 'win' ? 1 : 0))),
    rounds: avg((r) => r.rounds).toFixed(1),
    'rounds p90': [...results.map((r) => r.rounds)].sort((a, b) => a - b)[Math.floor(n * 0.9)],
    'hp lost': pct(avg((r) => r.hpLost)),
    'mp used': pct(avg((r) => r.mpUsed)),
    'hits/kill': allHits.length ? (allHits.reduce((a, b) => a + b, 0) / allHits.length).toFixed(1) : '-',
  };
}

export function runScenario(sc, n = N, policyName = args.policy || 'smart') {
  const policy = policyName === 'random' ? randomChoose : smartChoose;
  const rng = makeRng(sc.seed || 7);
  const results = [];
  for (let i = 0; i < n; i++) {
    const hero = heroAt(sc.heroLevel, sc.build, sc.equip);
    const recruits = (sc.recruits || []).map(([type, level]) => newRecruit(type, level));
    const group = sc.group ? sc.group : rollGroup(sc.enc, rng);
    results.push(runBattle({ hero, recruits, group, rng, policy, inventory: sc.inventory || {} }));
  }
  return summarize(results);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = [];
  for (const [name, sc] of Object.entries(SCENARIOS)) {
    if (only && !name.includes(only)) continue;
    rows.push({ scenario: name, target: sc.target || '', ...runScenario(sc) });
    if (args.both) rows.push({ scenario: `${name} (random)`, target: '', ...runScenario(sc, N, 'random') });
  }
  console.table(rows);
}
