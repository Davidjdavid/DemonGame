// Demo-dungeon balance: can a sensible player survive each floor's encounters at the expected level?
//   node scripts/sim-dungeon.mjs [fights=300]
import { makeCombatant, createBattle, act, currentActor } from '../src/combat/battle.js';
import { enemyChoose } from '../src/combat/ai.js';
import { smartPolicy } from '../src/combat/policies.js';
import { BATTLE } from '../src/data/battleData.js';
import { makeRng } from '../src/game/rng.js';
import { rollEncounter } from '../src/dungeon/explore.js';
import floors from '../src/data/dungeon/floors.json' with { type: 'json' };

const N = Number(process.argv[2] || 300);
const rng = makeRng(7);
const unit = (id, side, level, i, boss = null) => makeCombatant({ key: `${side}${i}`, name: id, side, level, def: BATTLE[id], isProtagonist: id === 'protagonist', demonId: id, boss });

function fight(partyIds, level, enemies, first = 'player') {
  const party = [unit('protagonist', 'player', level, 0), ...partyIds.map((id, i) => unit(id, 'player', level, i + 1))];
  const s = createBattle({ party, enemies, first, rng });
  let g = 0;
  while (!s.outcome && g++ < 3000) act(s, currentActor(s).side === 'player' ? smartPolicy(s) : enemyChoose(s, currentActor(s)));
  const hpLeft = party[0].hp / party[0].maxHp;
  return { win: s.outcome === 'win', rounds: s.round, hpLeft };
}

// Expected party per floor for a player who recruits along the way.
const PLANS = [
  { floor: 0, label: 'F1 alone, Lv 6 (start)', level: 6, party: [] },
  { floor: 0, label: 'F1 + kappa, Lv 6', level: 6, party: ['kappa'] },
  { floor: 1, label: 'F2 + kappa, puck, Lv 7', level: 7, party: ['kappa', 'puck'] },
  { floor: 1, label: 'F2 + kappa, puck, wisp, Lv 8', level: 8, party: ['kappa', 'puck', 'willowisp'] },
  { floor: 2, label: 'F3 + 3 demons, Lv 9', level: 9, party: ['hephaestus', 'puck', 'oni'] },
  { floor: 2, label: 'F3 + 3 demons, Lv 10', level: 10, party: ['hephaestus', 'golem', 'oni'] },
];

for (const plan of PLANS) {
  const res = Array.from({ length: N }, () => fight(plan.party, plan.level, rollEncounter(floors[plan.floor], rng).map((g, i) => unit(g.id, 'enemy', g.level, i))));
  const win = res.filter((r) => r.win).length / N;
  const hp = res.filter((r) => r.win).reduce((a, r) => a + r.hpLeft, 0) / Math.max(1, res.filter((r) => r.win).length);
  console.log(`${plan.label.padEnd(30)} win ${(win * 100).toFixed(0).padStart(3)}%   your HP left after a win ${(hp * 100).toFixed(0)}%`);
}
const boss = floors[2].features.find((f) => f.type === 'boss').boss;
for (const level of [10, 11, 12]) {
  const res = Array.from({ length: N }, () => fight(['hephaestus', 'kappa', 'oni'], level, [unit(boss.id, 'enemy', boss.level, 0, boss)]));
  const wins = res.filter((r) => r.win);
  const rounds = wins.map((r) => r.rounds).sort((a, b) => a - b);
  console.log(`Boss vs party Lv ${level}`.padEnd(30), `win ${Math.round((100 * wins.length) / N)}%  median rounds ${rounds[Math.floor(rounds.length / 2)] ?? '-'}`);
}
