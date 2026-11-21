// Balance sim: runs many battles per scenario with a policy for each side and prints a table.
// Usage: node scripts/sim.mjs [scenarioName] [--n=400] [--policy=smart|random]
import { createBattle, act, currentActor, alive } from '../src/combat/battle.js';
import { enemyChoose, smartChoose, randomChoose } from '../src/combat/ai.js';
import { heroCombatant, recruitCombatant, enemyCombatant } from '../src/combat/units.js';
import { newHero, newRecruit, spendPoint, HERO_LEARNS } from '../src/growth/leveling.js';
import { rollGroup } from '../src/world/encounters.js';
import { makeRng } from '../src/core/rng.js';
import { SCENARIOS } from './sim-scenarios.mjs';
import { MONSTERS } from '../src/data/monsters.js';
import { ELEMENTS } from '../src/combat/affinity.js';
import { healPartyWithSkills, maxOf } from '../src/game/fieldItems.js';

const fullKnowledge = (t) => Object.fromEntries(ELEMENTS.map((e) => [e, MONSTERS[t].aff[e] || 'normal']));

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
  for (const [lv, sk] of HERO_LEARNS) if (level >= lv && !h.skills.includes(sk)) h.skills.push(sk);
  const c = heroCombatant(h);
  h.hp = c.maxHp;
  h.mp = c.maxMp;
  return h;
}

export function runBattle({ hero, recruits = [], group, rng, policy = smartChoose, inventory = {}, maxRounds = 40, boss = null, fresh = true, first = 'player', shareInventory = false }) {
  const party = [heroCombatant(hero), ...recruits.map((r) => recruitCombatant(r))];
  if (fresh) party.forEach((p) => { p.hp = p.maxHp; p.mp = p.maxMp; });
  const enemies = group.map((g, i) => enemyCombatant(g.type, g.level, `e${i}`, { boss: g.boss || boss }));
  const state = createBattle({ party, enemies, rng, inventory: shareInventory ? inventory : { ...inventory }, first });
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
  if (!fresh) for (const c of party) if (c.ref) { c.ref.hp = Math.max(0, c.hp); c.ref.mp = c.mp; }
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
    for (const t of sc.knows || []) hero.knows[t] = fullKnowledge(t);
    const group = sc.group ? sc.group : rollGroup(sc.enc, rng);
    results.push(runBattle({ hero, recruits, group, rng, policy, inventory: sc.inventory || {} }));
  }
  return summarize(results);
}

// Attrition: a first crossing is several fights in a row with HP, MP and items carried over (6% ambushes), healing
// between fights with the party's skills (the H key). Survival = won every fight of the chain.
export function runChain(sc, n = Math.round(N / 2), len = sc.chain || 5) {
  const rng = makeRng((sc.seed || 7) + 99);
  let survived = 0; let rounds = 0; let fights = 0; let hpEnd = 0; let mpEnd = 0;
  for (let i = 0; i < n; i++) {
    const hero = heroAt(sc.heroLevel, sc.build, sc.equip);
    const recruits = (sc.recruits || []).map(([type, level]) => newRecruit(type, level));
    for (const t of sc.knows || []) hero.knows[t] = fullKnowledge(t);
    const game = { hero, party: recruits, stock: [], inv: { medicine: 3, ...(sc.chainItems || {}) } };
    let ok = true;
    for (let f = 0; f < len && ok; f++) {
      const group = sc.group ? sc.group : rollGroup(sc.enc, rng);
      const r = runBattle({ hero, recruits, group, rng, inventory: game.inv, fresh: false, shareInventory: true, first: rng() < 0.06 ? 'enemy' : 'player' });
      rounds += r.rounds; fights++;
      if (r.outcome !== 'win') { ok = false; break; }
      if (hero.hp <= 0) hero.hp = 1;
      // ~22 steps to the next fight: MP trickles back (1 per 2 steps), then heal with skills.
      for (const m of [hero, ...recruits]) if (m.hp > 0) m.mp = Math.min(maxOf(game, m).maxMp, m.mp + 11);
      healPartyWithSkills(game);
    }
    if (ok) {
      survived++;
      const members = [hero, ...recruits];
      hpEnd += members.reduce((s, m) => s + m.hp / maxOf(game, m).maxHp, 0) / members.length;
      mpEnd += members.reduce((s, m) => s + m.mp / Math.max(1, maxOf(game, m).maxMp), 0) / members.length;
    }
  }
  const pct = (x) => `${Math.round(x * 100)}%`;
  return { [`survive ${len} fights`]: pct(survived / n), 'rounds/fight': (rounds / fights).toFixed(1), 'HP left': survived ? pct(hpEnd / survived) : '-', 'MP left': survived ? pct(mpEnd / survived) : '-' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = [];
  for (const [name, sc] of Object.entries(SCENARIOS)) {
    if (only && !name.includes(only)) continue;
    rows.push({ scenario: name, target: sc.target || '', ...runScenario(sc), ...(args.chain && !sc.group ? runChain(sc) : {}) });
    if (args.both) rows.push({ scenario: `${name} (random)`, target: '', ...runScenario(sc, N, 'random') });
  }
  console.table(rows);
}
