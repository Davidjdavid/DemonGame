// Whole-climb sim: walks the floors in order with a smart party, fighting the floor's random encounters, recruiting
// sometimes, buying the best affordable gear at each hub visit, resting when low. Reports hero level, gold and
// gear per floor, fights, wipes and restock trips. Checks the level curve (1 -> 15-20 by the boss) and pricing.
// Usage: node scripts/sim-dungeon.mjs [--runs=20] [--seed=1]
import { createBattle, act, currentActor } from '../src/combat/battle.js';
import { enemyChoose, smartChoose } from '../src/combat/ai.js';
import { heroCombatant, recruitCombatant, enemyCombatant, heroDerived, recruitMax } from '../src/combat/units.js';
import { newHero, newRecruit, gainHeroExp, gainRecruitExp, expFor, moneyFor, spendPoint } from '../src/growth/leveling.js';
import { rollGroup, newEncounters } from '../src/world/encounters.js';
import { ENCOUNTERS } from '../src/data/encounters.js';
import { MONSTERS, BOSS } from '../src/data/monsters.js';
import { WEAPONS, ARMORS } from '../src/data/equipment.js';
import { fusionResult, inheritCandidates, inheritSlots } from '../src/growth/fusion.js';
import { skillsAt } from '../src/data/monsters.js';
import { makeRng } from '../src/core/rng.js';

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const RUNS = Number(args.runs || 20);
// Steps walked per floor on the first climb (exploring, not the shortest path). The generator's metrics refine these.
const STEPS = { f1: 170, f2: 220, f3: 260, f4: 300, f5: 330, f6: 360, f7: 260 };
const FLOORS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'];
const minLevel = Object.fromEntries(Object.entries(MONSTERS).map(([id, m]) => [id, m.level]));
const BUILD = ['st', 'vi', 'st', 'ag', 'vi', 'lu', 'st', 'vi', 'ma'];

function fullHeal(game) {
  const h = heroDerived(game.hero);
  game.hero.hp = h.maxHp; game.hero.mp = h.maxMp;
  for (const r of game.party) { const m = recruitMax(r); r.hp = m.maxHp; r.mp = m.maxMp; }
}

function shop(game, depth) {
  const best = (table, slot) => {
    const cur = table[game.hero.equip[slot]];
    const opts = Object.entries(table).filter(([, it]) => it.unlock <= depth && it.price > cur.price).sort((a, b) => b[1].price - a[1].price);
    for (const [id, it] of opts) {
      const cost = it.price - Math.floor(cur.price / 2);
      if (game.money >= cost) { game.money -= cost; game.hero.equip[slot] = id; return id; }
    }
    return null;
  };
  best(ARMORS, 'armor');
  best(WEAPONS, 'weapon');
  const meds = game.money > 300 ? Math.min(3, Math.floor((game.money - 300) / 40)) : 0;
  game.inv.medicine = (game.inv.medicine || 0) + meds;
  game.money -= meds * 40;
}

// Fuse the two lowest recruits when that makes something stronger than both (a rough stand-in for player fusion).
function maybeFuse(game, rng) {
  if (game.party.length < 3) return;
  const sorted = [...game.party].sort((a, b) => a.level - b.level);
  const [a, b] = sorted;
  const res = fusionResult(a, b, game.hero.level);
  if (!res || res.locked || res.level <= Math.max(a.level, b.level)) return;
  const inh = inheritCandidates(a, b, res).slice(0, inheritSlots(res));
  game.party = game.party.filter((r) => r !== a && r !== b);
  const child = newRecruit(res.type, res.level, { skills: [...skillsAt(res.type, res.level), ...inh] });
  game.party.push(child);
  game.fusions++;
}

function battle(game, group, rng, boss = null) {
  const party = [heroCombatant(game.hero), ...game.party.map((r) => recruitCombatant(r))];
  const enemies = group.map((g, i) => enemyCombatant(g.type, g.level, `e${i}`, { boss }));
  const state = createBattle({ party, enemies, rng, inventory: game.inv });
  while (!state.outcome && state.round < 40) {
    const actor = currentActor(state);
    act(state, actor.side === 'enemy' ? enemyChoose(state, actor) : smartChoose(state, actor));
  }
  for (const c of party) if (c.ref) { c.ref.hp = c.hp; c.ref.mp = c.mp; }
  if (state.outcome === 'win') {
    const exp = enemies.reduce((s, e) => s + expFor(e.level, e.boss), 0);
    const gold = enemies.reduce((s, e) => s + moneyFor(e.level, e.boss), 0);
    game.money += gold;
    game.earned = (game.earned || 0) + gold;
    if (game.hero.hp <= 0) game.hero.hp = 1;
    for (const ev of gainHeroExp(game.hero, exp)) if (ev.type === 'level') for (let i = 0; i < 3; i++) spendPoint(game.hero, BUILD[(game.hero.level * 3 + i) % BUILD.length]);
    for (const r of game.party) if (r.hp > 0) gainRecruitExp(r, exp);
    // Recruit: a talkable enemy at or below your level joins sometimes (talking costs a turn; the sim just rolls).
    const cand = group.filter((g) => MONSTERS[g.type].personality !== 'mindless' && g.level <= game.hero.level);
    if (cand.length && rng() < 0.35) {
      const g = cand[Math.floor(rng() * cand.length)];
      const weakest = [...game.party].sort((a, b) => a.level - b.level)[0];
      if (game.party.length < 3) game.party.push(newRecruit(g.type, g.level));
      else if (weakest && weakest.level < g.level - 1) game.party[game.party.indexOf(weakest)] = newRecruit(g.type, g.level);
      game.recruits = (game.recruits || 0) + 1;
    }
  }
  return state;
}

// Between fights a player casts heals from the menu (Esc -> Party -> skill): top everyone up to ~80% while MP lasts.
function fieldHeal(game) {
  const members = [game.hero, ...game.party];
  const maxOf = (m) => (m === game.hero ? heroDerived(game.hero) : recruitMax(m));
  for (const healer of game.party) {
    if (healer.hp <= 0) continue;
    const heal = healer.skills.includes('mend') ? 'mend' : healer.skills.includes('restore') ? 'restore' : null;
    const revive = healer.skills.includes('revive') ? 'revive' : null;
    for (const m of members) {
      const mx = maxOf(m);
      if (m.hp <= 0 && revive && healer.mp >= 14) { healer.mp -= 14; m.hp = Math.round(mx.maxHp / 2); }
      while (heal && m.hp > 0 && m.hp < mx.maxHp * 0.8 && healer.mp >= (heal === 'mend' ? 4 : 10)) {
        healer.mp -= heal === 'mend' ? 4 : 10;
        m.hp = Math.min(mx.maxHp, m.hp + Math.round(mx.maxHp * (heal === 'mend' ? 0.4 : 0.85)));
      }
    }
  }
}

function lowParty(game) {
  const h = heroDerived(game.hero);
  const healers = game.party.filter((r) => r.skills.some((s) => /mend|restore/.test(s)) && r.hp > 0);
  const mpOk = healers.some((r) => r.mp >= 10);
  return game.hero.hp / h.maxHp < 0.35 || (game.party.some((r) => r.hp <= 0) && !mpOk) || (!mpOk && game.hero.hp / h.maxHp < 0.6);
}

function runOnce(seed) {
  const rng = makeRng(seed);
  const game = { hero: newHero(), party: [], money: 0, inv: { medicine: 3 }, wipes: 0, restocks: 0, fusions: 0, fights: 0, floorWipes: {} };
  const rows = [];
  let depth = 0;
  for (const f of FLOORS) {
    depth++;
    const entry = game.hero.level;
    const enc = newEncounters(rng, ENCOUNTERS[f].rate);
    let steps = STEPS[f];
    let fights = 0;
    while (steps > 0) {
      const gap = rng.int(...ENCOUNTERS[f].rate);
      steps -= gap;
      if (steps <= 0) break;
      const group = rollGroup(ENCOUNTERS[f], rng, enc, minLevel);
      const st = battle(game, group, rng);
      fights++;
      game.fights++;
      if (st.outcome === 'lose') { game.wipes++; game.floorWipes[f] = (game.floorWipes[f] || 0) + 1; fullHeal(game); continue; }
      fieldHeal(game);
      if (lowParty(game)) {
        // Walk back down (the sim ignores the steps), heal at the hub, shop, maybe fuse, walk back up.
        game.restocks++;
        game.spentHeal = (game.spentHeal || 0) + Math.min(game.money, 30 + game.hero.level * 8);
        game.money -= Math.min(game.money, 30 + game.hero.level * 8);
        fullHeal(game);
        shop(game, depth);
        maybeFuse(game, rng);
      }
    }
    // Floor done: visit the hub once per floor (autosave/restock habit), shop, heal.
    fullHeal(game);
    shop(game, depth);
    maybeFuse(game, rng);
    rows.push({ floor: f, entry, exit: game.hero.level, fights, earned: game.earned || 0, size: game.party.length, recruits: game.recruits || 0, gold: game.money, weapon: game.hero.equip.weapon, armor: game.hero.equip.armor, party: game.party.map((r) => `${r.type}${r.level}`).join(' ') });
  }
  fullHeal(game);
  const boss = battle(game, [{ type: BOSS.type, level: BOSS.level }], rng, BOSS);
  return { rows, game, bossWin: boss.outcome === 'win', bossRounds: boss.round };
}

const all = Array.from({ length: RUNS }, (_, i) => runOnce(Number(args.seed || 1) * 1000 + i));
const table = FLOORS.map((f, i) => {
  const rs = all.map((r) => r.rows[i]);
  const avg = (k) => (rs.reduce((s, r) => s + r[k], 0) / rs.length).toFixed(1);
  return { floor: f, 'lv in': avg('entry'), 'lv out': avg('exit'), fights: avg('fights'), 'party size': avg('size'), 'gold earned (cum)': avg('earned'), 'recruited so far': avg('recruits'), 'gold after shop': avg('gold'), 'weapon (run 1)': rs[0].weapon, 'armor (run 1)': rs[0].armor, 'party (run 1)': rs[0].party };
});
console.table(table);
const pct = (k) => `${Math.round((all.filter((r) => r[k]).length / all.length) * 100)}%`;
console.log(`boss win ${pct('bossWin')}, rounds ${(all.reduce((s, r) => s + r.bossRounds, 0) / all.length).toFixed(1)}, ` +
  `wipes/run ${(all.reduce((s, r) => s + r.game.wipes, 0) / all.length).toFixed(2)}, restocks/run ${(all.reduce((s, r) => s + r.game.restocks, 0) / all.length).toFixed(1)}, ` +
  `wipes by floor ${JSON.stringify(Object.fromEntries(FLOORS.map((f) => [f, (all.reduce((s, r) => s + (r.game.floorWipes[f] || 0), 0) / all.length).toFixed(1)])))}, ` +
  `fusions/run ${(all.reduce((s, r) => s + r.game.fusions, 0) / all.length).toFixed(1)}, fights/run ${(all.reduce((s, r) => s + r.game.fights, 0) / all.length).toFixed(0)}`);
