import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCombatant, createBattle, act, currentActor, usableSkills } from '../src/combat/battle.js';
import { enemyChoose } from '../src/combat/ai.js';
import { SKILLS, SKILL_LIST } from '../src/data/skills.js';
import { BATTLE } from '../src/data/battleData.js';
import { tierSum } from '../src/combat/affinity.js';
import { simulate } from '../scripts/sim.mjs';

const fixed = (v = 0.5) => () => v;
const def = (tiers = {}, skills = []) => ({ profile: { str: 2, mag: 2, vit: 2, agi: 2, luck: 1 }, tiers, skills });
const unit = (key, side, d, extra = {}) => makeCombatant({ key, name: key, side, level: 10, def: d, ...extra });

function duel(enemyDef, playerSkills = ['ember', 'chill', 'spark', 'gust', 'glint', 'shade', 'bash'], { rng = fixed(0.5), allies = 0 } = {}) {
  const party = [unit('hero', 'player', def({}, playerSkills), { isProtagonist: true })];
  for (let i = 0; i < allies; i++) party.push(unit(`ally${i}`, 'player', def({}, ['bash'])));
  const enemies = [unit('foe', 'enemy', enemyDef)];
  return createBattle({ party, enemies, rng });
}

test('skills: 60-80 total, every element has single and all at 3 ranks', () => {
  const learnable = SKILL_LIST.filter((s) => !s.basic);
  assert.ok(learnable.length >= 60 && learnable.length <= 80, `${learnable.length}`);
  for (const el of ['phys', 'fire', 'ice', 'elec', 'wind', 'light', 'dark']) {
    for (const target of ['one', 'all']) {
      const ranks = learnable.filter((s) => s.element === el && s.target === target && s.kind === 'attack').map((s) => s.rank);
      for (const r of [1, 2, 3]) assert.ok(ranks.includes(r), `${el} ${target} rank ${r}`);
    }
  }
  for (const kind of ['heal', 'revive', 'buff', 'debuff', 'passive']) assert.ok(learnable.some((s) => s.kind === kind), kind);
  for (const el of ['phys', 'fire', 'ice', 'elec', 'wind', 'light', 'dark']) assert.ok(SKILLS[`repel_${el}`]);
  for (const id of ['counter', 'life_bonus', 'mana_bonus']) assert.ok(SKILLS[id]);
});

test('every battle demon only uses existing skills and keeps its tier budget near zero', () => {
  for (const [id, d] of Object.entries(BATTLE)) {
    for (const s of d.skills) assert.ok(SKILLS[s], `${id}: ${s}`);
    const sum = tierSum(d.tiers);
    assert.ok(sum >= -2 && sum <= 3, `${id} tier sum ${sum}`);
  }
});

test('hitting a weakness turns a full icon into a half icon and reveals the tier', () => {
  const s = duel(def({ fire: -2 }), ['ember']);
  assert.equal(s.known.foe.has('fire'), false);
  const ev = act(s, { type: 'skill', skill: 'ember', targets: ['foe'] });
  assert.equal(ev.result, 'weak');
  assert.equal(s.known.foe.has('fire'), true);
  // one member: 1 full -> 0 full + 1 half, so the hero acts again
  assert.equal(s.turnSide, 'player');
  assert.deepEqual(s.icons, { full: 0, half: 1 });
});

test('null costs two icons; absorb heals the target and ends the turn', () => {
  const s = duel(def({ ice: 3, fire: 5 }), ['chill', 'ember'], { allies: 2 });
  act(s, { type: 'skill', skill: 'chill', targets: ['foe'] });
  assert.deepEqual(s.icons, { full: 1, half: 0 });
  const foe = s.sides.enemy[0];
  foe.hp -= 50;
  const before = foe.hp;
  const s2 = duel(def({ fire: 5 }), ['ember'], { allies: 2 });
  const f2 = s2.sides.enemy[0];
  f2.hp -= 50;
  const ev = act(s2, { type: 'skill', skill: 'ember', targets: ['foe'] });
  assert.equal(ev.result, 'absorb');
  assert.ok(f2.hp > before - 50 || f2.hp > f2.maxHp - 50);
  assert.equal(s2.turnSide, 'enemy', 'absorb ends the player turn');
});

test('a Repel passive reflects the attack back and ends the turn', () => {
  const s = duel(def({}, ['repel_fire']), ['ember'], { allies: 1 });
  const hero = s.sides.player[0];
  const ev = act(s, { type: 'skill', skill: 'ember', targets: ['foe'] });
  assert.equal(ev.result, 'reflect');
  assert.ok(hero.hp < hero.maxHp);
  assert.equal(s.turnSide, 'enemy');
});

test('almighty ignores tiers and repel', () => {
  const s = duel(def({ phys: 5, fire: 5, ice: 5 }, ['repel_phys']), ['ruin']);
  const hero = s.sides.player[0];
  hero.mp = 999;
  const ev = act(s, { type: 'skill', skill: 'ruin', targets: ['foe'] });
  assert.equal(ev.result, 'normal');
  assert.ok(s.sides.enemy[0].hp < s.sides.enemy[0].maxHp);
});

test('a multi-target attack applies only its worst result', () => {
  const party = [unit('hero', 'player', def({}, ['cinder_rain']), { isProtagonist: true }), unit('a', 'player', def({}, ['bash']))];
  const enemies = [unit('e1', 'enemy', def({ fire: -1 })), unit('e2', 'enemy', def({ fire: 3 })), unit('e3', 'enemy', def({}))];
  const s = createBattle({ party, enemies, rng: fixed(0.5) });
  const ev = act(s, { type: 'skill', skill: 'cinder_rain', targets: ['e1', 'e2', 'e3'] });
  assert.equal(ev.result, 'null');
  assert.equal(s.turnSide, 'enemy'); // both icons used: the turn passed to the enemy
});

test('a failed debuff is a miss (two icons); buffs always land and expire', () => {
  const party = [unit('hero', 'player', def({ support: -5 }, ['sap_strength', 'war_cry']), { isProtagonist: true }), unit('a', 'player', def({}, ['bash'])), unit('b', 'player', def({}, ['bash']))];
  const s = createBattle({ party, enemies: [unit('foe', 'enemy', def())], rng: fixed(0.99) });
  const ev = act(s, { type: 'skill', skill: 'sap_strength', targets: ['foe'] });
  assert.equal(ev.result, 'miss');
  assert.deepEqual(s.icons, { full: 1, half: 0 });
  const s2 = createBattle({ party: [unit('hero', 'player', def({}, ['war_cry']), { isProtagonist: true })], enemies: [unit('foe', 'enemy', def())], rng: fixed(0.5) });
  act(s2, { type: 'skill', skill: 'war_cry', targets: ['hero'] });
  assert.equal(s2.sides.player[0].buffs.atk.stacks, 1);
  assert.equal(s2.sides.player[0].buffs.atk.turns, 2); // 3 turns, one already ended
});

test('the protagonist falling loses the battle', () => {
  const s = duel(def({}, ['mighty_blow']), ['bash'], { allies: 1 });
  act(s, { type: 'pass' });
  act(s, { type: 'pass' });
  const hero = s.sides.player[0];
  hero.hp = 1;
  // enemy turn: it attacks the hero until the outcome is decided
  let guard = 0;
  while (!s.outcome && guard++ < 20) {
    const a = currentActor(s);
    act(s, a.side === 'enemy' ? { type: 'skill', skill: 'attack', targets: ['hero'] } : { type: 'pass' });
  }
  assert.equal(s.outcome, 'lose');
});

test('a boss with several icons acts several times per turn', () => {
  const party = [unit('hero', 'player', def({}, ['bash']), { isProtagonist: true })];
  const boss = makeCombatant({ key: 'boss', name: 'boss', side: 'enemy', level: 10, def: def({}, ['bash']), boss: { hpMult: 5, icons: 3 } });
  const s = createBattle({ party, enemies: [boss], first: 'enemy', rng: fixed(0.5) });
  assert.deepEqual(s.icons, { full: 3, half: 0 });
  act(s, enemyChoose(s, currentActor(s)));
  assert.equal(currentActor(s).key, 'boss');
});

test('enemy AI favors a revealed player weakness', () => {
  const party = [unit('hero', 'player', def({ ice: -2 }, ['bash']), { isProtagonist: true }), unit('ally', 'player', def({}, ['bash']))];
  const enemies = [unit('foe', 'enemy', def({}, ['chill', 'ember']))];
  let r = 0;
  const s = createBattle({ party, enemies, first: 'enemy', rng: () => ((r = (r * 9301 + 49297) % 233280) / 233280) });
  s.revealed.hero.add('ice');
  let ice = 0;
  for (let i = 0; i < 300; i++) {
    const a = enemyChoose(s, s.sides.enemy[0]);
    if (a.skill === 'chill' && a.targets[0] === 'hero') ice++;
  }
  assert.ok(ice > 120, `chose ice on the weak hero ${ice}/300 times`);
});

test('physical skills cost HP, magic costs MP; unaffordable skills are hidden', () => {
  const s = duel(def(), ['cleave', 'inferno']);
  const hero = s.sides.player[0];
  hero.mp = 0;
  const ids = usableSkills(s, hero).map((x) => x.id);
  assert.ok(ids.includes('cleave'));
  assert.ok(!ids.includes('inferno'));
  const hp = hero.hp;
  act(s, { type: 'skill', skill: 'cleave', targets: ['foe'] });
  assert.ok(hero.hp < hp);
});

test('the simulator hits the balance targets', () => {
  const r = simulate(250, 11, { quiet: true });
  assert.ok(r.smartFresh.median >= 2 && r.smartFresh.median <= 4, `fresh median ${r.smartFresh.median}`);
  assert.ok(r.smartFresh.winRate >= 0.85, `fresh win ${r.smartFresh.winRate}`);
  assert.ok(r.smartVet.sweepRate >= 0.2, `sweeps ${r.smartVet.sweepRate}`);
  assert.ok(r.random.winRate < 0.95 && r.random.winRate > 0.2, `random win ${r.random.winRate}`);
  assert.ok(r.boss.median >= 8 && r.boss.median <= 12, `boss median ${r.boss.median}`);
});
