import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/game/state.js';
import { packSave, unpackSave } from '../src/game/save.js';
import { getFloor } from '../src/data/floors/index.js';
import { visit } from '../src/world/mapMemory.js';
import { floorState } from '../src/game/state.js';
import { makeRng } from '../src/core/rng.js';
import { newRecruit } from '../src/growth/leveling.js';
import { fusionResult, fuse, resultFamily, FUSION_CHART, familyMembers, summon, register, inheritCandidates } from '../src/growth/fusion.js';
import { FAMILIES, MONSTERS } from '../src/data/monsters.js';
import { buyGear, buyItem, sellItem, heal, healerQuote, rest, stock } from '../src/game/shop.js';
import { heroDerived } from '../src/combat/units.js';

const fresh = () => newGame({ floor: getFloor('hub'), rng: makeRng(1) });

test('fusion chart covers every family pair and reaches every family', () => {
  const results = new Set();
  for (const a of FAMILIES) for (const b of FAMILIES) {
    if (a === b) { assert.equal(resultFamily(a, b), null); continue; }
    const r = resultFamily(a, b);
    assert.ok(r && r !== a && r !== b, `${a}+${b}`);
    results.add(r);
  }
  assert.equal(results.size, FAMILIES.length);
  assert.equal(Object.keys(FUSION_CHART).length, (FAMILIES.length * (FAMILIES.length - 1)) / 2);
});

test('every fusion-only monster can be fused from some pair of enemy types', () => {
  const enemies = Object.entries(MONSTERS).filter(([, m]) => !m.fusionOnly);
  for (const [id, m] of Object.entries(MONSTERS).filter(([, x]) => x.fusionOnly)) {
    let found = false;
    for (const [a, ma] of enemies) for (const [b, mb] of enemies) {
      if (found || ma.family === mb.family) continue;
      const res = fusionResult({ type: a, level: ma.level + 3 }, { type: b, level: mb.level + 3 }, 30);
      if (res?.type === id) found = true;
    }
    assert.ok(found, `${id} (${m.family}) reachable`);
  }
});

test('fuse: result by family + average level, inherits chosen skills and both parents\' knowledge, cap by hero level', () => {
  const g = fresh();
  g.hero.level = 5;
  const a = newRecruit('wisp', 4, { uid: 1 });
  const b = newRecruit('gnawer', 3, { uid: 2 });
  g.party.push(a, b);
  g.nextUid = 3;
  a.knows.imp = { elec: 'null' };
  const res = fusionResult(a, b, g.hero.level);
  assert.ok(res);
  const cands = inheritCandidates(a, b, res);
  const r = fuse(g, 1, 2, cands.slice(0, 1));
  assert.ok(r.ok, r.reason);
  assert.equal(g.party.length, 1);
  assert.equal(r.child.type, res.type);
  assert.equal(r.child.knows.imp.elec, 'null');
  assert.ok(r.child.knows.gnawer && r.child.knows.wisp);
  if (cands.length) assert.ok(r.child.skills.includes(cands[0]));
  assert.ok(g.registry[res.type]);
  // A result far above the hero is locked.
  const big = { type: 'naga', level: 14, skills: [] };
  const big2 = { type: 'harpy', level: 14, skills: [] };
  assert.equal(fusionResult(big, big2, 3).locked, true);
});

test('family members are sorted by level', () => {
  const m = familyMembers('ooze');
  assert.deepEqual(m, ['slime', 'bogjelly', 'acidooze', 'prismooze']);
});

test('registry summon costs gold and adds the monster', () => {
  const g = fresh();
  register(g, newRecruit('slime', 4, { uid: 9 }));
  g.money = 1000;
  const r = summon(g, 'slime');
  assert.ok(r.ok);
  assert.equal(g.party[0].level, 4);
  assert.ok(g.money < 1000);
});

test('shops: stock unlocks with depth, gear trade-in, items buy/sell', () => {
  const g = fresh();
  assert.equal(stock('weapons', 0).length, 0);
  assert.ok(stock('weapons', 2).includes('iron_sword'));
  g.money = 1000;
  const before = heroDerived(g.hero).atkBonus;
  const r = buyGear(g, 'weapons', 'bronze_sword');
  assert.ok(r.ok);
  assert.ok(heroDerived(g.hero).atkBonus > before);
  assert.equal(g.money, 840);
  const r2 = buyGear(g, 'armor', 'chain');
  assert.ok(r2.ok);
  assert.equal(heroDerived(g.hero).aff.elec, 'weak');
  assert.ok(buyItem(g, 'medicine', 2).ok);
  assert.ok(sellItem(g, 'medicine', 1).ok);
});

test('healer and inn restore everyone for gold', () => {
  const g = fresh();
  g.money = 500;
  g.hero.hp = 5;
  const r = newRecruit('wisp', 3, { uid: 1 });
  r.hp = 0;
  g.party.push(r);
  const q = healerQuote(g);
  assert.equal(q.revives, 1);
  assert.ok(heal(g).ok);
  assert.ok(g.hero.hp > 5 && r.hp > 0);
  g.hero.hp = 1;
  assert.ok(rest(g).ok);
  assert.equal(g.hero.hp, heroDerived(g.hero).maxHp);
});

test('save packs map memory and round-trips the game', () => {
  const g = fresh();
  const f = getFloor('test');
  const fs = floorState(g, 'test');
  visit(fs.mem, f, 1, 9);
  visit(fs.mem, f, 2, 9);
  fs.flags.opened['h2,5'] = true;
  g.party.push(newRecruit('imp', 3, { uid: 4 }));
  const packed = packSave(g, getFloor);
  const json = JSON.stringify(packed);
  assert.ok(json.length < 8000, `save ${json.length} bytes`);
  const back = unpackSave(JSON.parse(json), getFloor);
  assert.ok(back.floors.test.mem.cells.has('2,9'));
  assert.equal(back.floors.test.mem.cells.size, 2);
  assert.equal(back.floors.test.mem.edges.size, fs.mem.edges.size);
  assert.equal(back.party[0].type, 'imp');
  assert.equal(back.floors.test.flags.opened['h2,5'], true);
});
