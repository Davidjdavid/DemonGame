// Battle simulator: reports fight lengths and win rates against the DESIGN balance targets.
//   node scripts/sim.mjs [fights=400] [seed=1]
import { makeCombatant, createBattle, act, currentActor } from '../src/combat/battle.js';
import { enemyChoose } from '../src/combat/ai.js';
import { smartPolicy, randomPolicy } from '../src/combat/policies.js';
import { BATTLE } from '../src/data/battleData.js';
import { makeRng } from '../src/game/rng.js';

const N = Number(process.argv[2] || 400);
const SEED = Number(process.argv[3] || 1);
const NAMES = { protagonist: 'You' };
const PARTY = ['ares', 'hephaestus', 'kappa'];
// Every demon except the party (all scaled to the fight's level).
const ENEMY_POOL = Object.keys(BATTLE).filter((id) => id !== 'protagonist' && !['ares', 'hephaestus', 'kappa'].includes(id));

function unit(id, side, level, i, boss = null) {
  return makeCombatant({ key: `${side}${i}`, name: NAMES[id] ?? id, side, level, def: BATTLE[id], isProtagonist: id === 'protagonist', boss, demonId: id });
}

function party(level) {
  return [unit('protagonist', 'player', level, 0), ...PARTY.map((id, i) => unit(id, 'player', level, i + 1))];
}

export function runFight({ rng, policy, enemies, level, first = 'player', maxRounds = 40 }) {
  const state = createBattle({ party: party(level), enemies, first, rng });
  let guard = 0;
  while (!state.outcome && state.round <= maxRounds && guard++ < 5000) {
    const actor = currentActor(state);
    const action = actor.side === 'player' ? policy(state) : enemyChoose(state, actor);
    act(state, action);
  }
  return { outcome: state.outcome ?? 'timeout', rounds: state.round, sweep: state.outcome === 'win' && !state.enemyHasActed };
}

let QUIET = false;
function summarize(label, results, target) {
  const wins = results.filter((r) => r.outcome === 'win');
  const rounds = wins.map((r) => r.rounds).sort((a, b) => a - b);
  const pct = (n) => `${Math.round((100 * n) / results.length)}%`;
  const median = rounds.length ? rounds[Math.floor(rounds.length / 2)] : '-';
  const mean = rounds.length ? (rounds.reduce((a, b) => a + b, 0) / rounds.length).toFixed(1) : '-';
  const sweeps = results.filter((r) => r.sweep).length;
  if (!QUIET) console.log(`${label.padEnd(34)} win ${pct(wins.length).padStart(4)}  rounds median ${String(median).padStart(2)} mean ${String(mean).padStart(4)}  ended before enemy acted ${pct(sweeps).padStart(4)}   target: ${target}`);
  return { winRate: wins.length / results.length, median, mean: Number(mean), sweepRate: sweeps / results.length };
}

function normalEnemies(rng, level) {
  const size = rng() < 0.5 ? 2 : 3; // normal encounters: 2-3 demons
  const ids = [...ENEMY_POOL].sort(() => rng() - 0.5).slice(0, size);
  return ids.map((id, i) => unit(id, 'enemy', level, i));
}

export function simulate(n = N, seed = SEED, { quiet = false } = {}) {
  QUIET = quiet;
  const rng = makeRng(seed);
  const run = (policy, mk, opts = {}) => Array.from({ length: n }, () => runFight({ rng, policy, enemies: mk(), ...opts }));
  const L = 10;
  const out = {};
  if (!quiet) console.log(`Simulating ${n} fights per row (seed ${seed}). Party: You + ${PARTY.join(', ')} at Lv ${L}.`);
  out.smartFresh = summarize('Normal, smart, unknown affinities', run((s) => smartPolicy(s), () => normalEnemies(rng, L), { level: L }), '2-4 rounds');
  out.smartVet = summarize('Normal, smart, known affinities', run((s) => smartPolicy(s, { veteran: true }), () => normalEnemies(rng, L), { level: L }), 'often ends before enemy acts');
  out.random = summarize('Normal, random play', run(randomPolicy, () => normalEnemies(rng, L), { level: L }), 'loses some fights');
  out.ambush = summarize('Normal, smart, enemy strikes first', run((s) => smartPolicy(s), () => normalEnemies(rng, L), { level: L, first: 'enemy' }), '(info)');
  const boss = () => [unit('gonggong', 'enemy', 14, 0, { hpMult: 10, mpMult: 3, icons: 3, dmgMult: 0.55 })];
  out.boss = summarize('Boss (Gonggong Lv14), smart, party Lv12', run((s) => smartPolicy(s, { veteran: true }), boss, { level: 12, maxRounds: 40 }), '8-12 rounds');
  out.bossRandom = summarize('Boss, random play', run(randomPolicy, boss, { level: 12, maxRounds: 40 }), '(info)');
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) simulate();
