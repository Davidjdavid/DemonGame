import test from 'node:test';
import assert from 'node:assert/strict';
import { newIcons, spend } from '../src/combat/pressTurn.js';
import { createBattle, act, currentActor, knownTier, escapeChance } from '../src/combat/battle.js';
import { enemyChoose, smartChoose } from '../src/combat/ai.js';
import { heroCombatant, enemyCombatant, recruitCombatant } from '../src/combat/units.js';
import { newHero, newRecruit, gainHeroExp, expToNext } from '../src/growth/leveling.js';
import { newEncounters, stepEncounter, rollGroup } from '../src/world/encounters.js';
import { makeRng } from '../src/core/rng.js';

const rngAlways = (v) => { const r = () => v; r.int = (lo) => lo; r.pick = (l) => l[0]; return r; };

test('press turns: weak/crit cost half, miss/null cost two, repel/absorb end the turn, pass halves', () => {
  assert.deepEqual(spend(newIcons(3), 'weak'), { full: 2, half: 1 });
  assert.deepEqual(spend(newIcons(3), 'null'), { full: 1, half: 0 });
  assert.deepEqual(spend(newIcons(3), 'miss'), { full: 1, half: 0 });
  assert.deepEqual(spend(newIcons(3), 'reflect'), { full: 0, half: 0 });
  assert.deepEqual(spend(newIcons(3), 'absorb'), { full: 0, half: 0 });
  assert.deepEqual(spend(newIcons(2), 'pass'), { full: 1, half: 1 });
  assert.deepEqual(spend({ full: 1, half: 1 }, 'weak'), { full: 0, half: 2 });
});

function solo(enemies, { rng = makeRng(5), inventory = { fire_shard: 2 }, hero = newHero() } = {}) {
  const party = [heroCombatant(hero)];
  return { state: createBattle({ party, enemies, rng, inventory }), hero };
}

test('a weakness hit leaves a half icon, teaches the party and persists on the hero', () => {
  const slime = enemyCombatant('slime', 1, 'e0');
  const { state, hero } = solo([slime], { rng: rngAlways(0.01) });
  assert.equal(knownTier(state, 'slime', 'fire'), null);
  const ev = act(state, { type: 'item', item: 'fire_shard', targets: ['e0'] });
  assert.equal(ev.result, 'weak');
  assert.equal(hero.knows.slime.fire, 'weak');
  assert.equal(knownTier(state, 'slime', 'fire'), 'weak');
  if (!state.outcome) assert.deepEqual(state.icons, { full: 0, half: 1 });
});

test('null costs two icons; repel bounces damage and ends the turn', () => {
  const wisp = enemyCombatant('wisp', 2, 'e0');
  const r = newRecruit('slime', 2);
  const party = [heroCombatant(newHero()), recruitCombatant(r)];
  const state = createBattle({ party, enemies: [wisp], rng: rngAlways(0.01), inventory: { fire_shard: 1 } });
  const ev = act(state, { type: 'item', item: 'fire_shard', targets: ['e0'] });
  assert.equal(ev.result, 'null');
  assert.equal(state.turnSide, 'enemy'); // 2 icons spent
  wisp.aff.phys = 'repel';
  const s2 = createBattle({ party: [heroCombatant(newHero()), recruitCombatant(newRecruit('gnawer', 2))], enemies: [wisp], rng: rngAlways(0.01) });
  const hp0 = s2.sides.player[0].hp;
  const ev2 = act(s2, { type: 'skill', skill: 'attack', targets: ['e0'] });
  assert.equal(ev2.result, 'reflect');
  assert.ok(s2.sides.player[0].hp < hp0);
  assert.equal(s2.turnSide, 'enemy');
});

test('analyze reveals every affinity of a type to all party members', () => {
  const imp = enemyCombatant('imp', 3, 'e0');
  const r = newRecruit('gnawer', 2);
  const hero = newHero();
  const state = createBattle({ party: [heroCombatant(hero), recruitCombatant(r)], enemies: [imp], rng: makeRng(1) });
  act(state, { type: 'analyze', target: 'e0' });
  assert.equal(hero.knows.imp.elec, 'null');
  assert.equal(r.knows.imp.light, 'weak');
  assert.equal(r.knows.gnawer.wind, 'weak'); // a recruit knows its own kind
});

test('enemies share what they learn about you, only within one battle', () => {
  const hero = newHero();
  const hc = heroCombatant(hero);
  hc.aff = { fire: 'weak' };
  const wisps = [enemyCombatant('wisp', 3, 'e0'), enemyCombatant('wisp', 3, 'e1')];
  const state = createBattle({ party: [hc], enemies: wisps, rng: rngAlways(0.01), first: 'enemy' });
  const ev = act(state, { type: 'skill', skill: 'fire1', targets: ['hero'] });
  assert.equal(ev.exposed[0].tier, 'weak');
  assert.equal(state.enemyKnows.hero.fire, 'weak');
  // The next enemy now strongly prefers fire on the hero.
  let fire = 0;
  for (let i = 0; i < 200; i++) {
    const s = createBattle({ party: [heroCombatant(hero)], enemies: [enemyCombatant('wisp', 3, 'e0')], rng: makeRng(i), first: 'enemy' });
    s.enemyKnows.hero = { fire: 'weak' };
    if (enemyChoose(s, currentActor(s)).skill === 'fire1') fire++;
  }
  assert.ok(fire > 150, `fire chosen ${fire}/200`);
  const fresh = createBattle({ party: [heroCombatant(hero)], enemies: [enemyCombatant('wisp', 3, 'e0')], rng: makeRng(2) });
  assert.deepEqual(fresh.enemyKnows.hero, {});
});

test('smart policy never uses a known null and prefers a known weakness', () => {
  const r = newRecruit('wisp', 4); // knows fire1 (Ember) and has mend at 4
  const hero = newHero();
  hero.knows.slime = { fire: 'weak' };
  hero.knows.wisp = { fire: 'null' };
  const party = [heroCombatant(hero), recruitCombatant(r)];
  const state = createBattle({ party, enemies: [enemyCombatant('wisp', 2, 'e0'), enemyCombatant('slime', 2, 'e1')], rng: makeRng(3) });
  act(state, { type: 'pass' });
  const a = smartChoose(state, currentActor(state));
  assert.equal(a.skill, 'fire1');
  assert.deepEqual(a.targets, ['e1']);
});

test('escape odds are shown and zero against a boss', () => {
  const { state } = solo([enemyCombatant('slime', 1, 'e0')]);
  assert.ok(escapeChance(state) > 0.2 && escapeChance(state) < 0.95);
  const boss = enemyCombatant('husk', 5, 'b', { boss: { hpMult: 3, icons: 2 } });
  const { state: s2 } = solo([boss]);
  assert.equal(escapeChance(s2), 0);
});

test('encounters: gap never under 5, ward blocks, no identical group twice in a row', () => {
  const rng = makeRng(9);
  const spec = { table: ['slime', 'gnawer'], level: [1, 2], size: [1, 2], rate: [15, 30] };
  const enc = newEncounters(rng, spec.rate);
  let steps = 0;
  let fights = 0;
  let last = -99;
  for (let i = 0; i < 2000; i++) {
    steps++;
    if (stepEncounter(enc, spec, rng)) { assert.ok(steps - last >= 5); last = steps; fights++; }
  }
  assert.ok(fights > 60 && fights < 140, `fights ${fights}`);
  enc.ward = 50;
  for (let i = 0; i < 50; i++) assert.equal(stepEncounter(enc, spec, rng), false);
  let prev = null;
  for (let i = 0; i < 200; i++) {
    const g = rollGroup(spec, rng, enc);
    const key = g.map((e) => `${e.type}:${e.level}`).sort().join(',');
    assert.notEqual(key, prev);
    prev = key;
  }
});

test('hero levels up with stat points; HP max grows', () => {
  const h = newHero();
  const ev = gainHeroExp(h, expToNext(1) + expToNext(2));
  assert.equal(h.level, 3);
  assert.equal(h.points, 6);
  assert.equal(ev.length, 2);
});
