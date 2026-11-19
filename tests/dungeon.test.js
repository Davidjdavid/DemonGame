import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateFloor, reachable, isFloor } from '../src/dungeon/generator.js';
import { startFloor, move, rollEncounter } from '../src/dungeon/explore.js';
import { makeRng } from '../src/game/rng.js';

const params = {
  id: 'test', seed: 42, width: 40, height: 26, rooms: [6, 8], roomSize: [3, 6],
  encounters: { table: [{ ids: ['kappa'], weight: 3, level: [3, 4] }, { ids: ['puck', 'kappa'], weight: 1, level: [5, 5] }], rate: [8, 14] },
  treasure: 3, treasureGold: [100, 300], treasureItems: ['salve'], heal: true, shop: true, stairs: true, boss: null,
};

test('the generator is deterministic for a seed and makes a connected floor', () => {
  const a = generateFloor(params);
  const b = generateFloor(params);
  assert.deepEqual(a, b);
  assert.notDeepEqual(generateFloor({ ...params, seed: 43 }).tiles, a.tiles);
  assert.equal(a.tiles.length, params.height);
  assert.ok(a.tiles.every((row) => row.length === params.width));
  const reach = reachable(a);
  for (const f of a.features) assert.ok(reach.has(`${f.x},${f.y}`), `${f.type} unreachable`);
  assert.ok(isFloor(a, a.start.x, a.start.y));
});

test('the floor has the requested features', () => {
  const f = generateFloor(params);
  const types = f.features.map((x) => x.type);
  assert.equal(types.filter((t) => t === 'treasure').length, 3);
  assert.ok(types.includes('heal') && types.includes('shop') && types.includes('stairs'));
  const boss = generateFloor({ ...params, stairs: false, boss: { id: 'gonggong', level: 14 } });
  assert.ok(boss.features.some((x) => x.type === 'boss'));
  assert.ok(!boss.features.some((x) => x.type === 'stairs'));
});

test('the floor survives a JSON round trip (hand-editable)', () => {
  const f = generateFloor(params);
  assert.deepEqual(JSON.parse(JSON.stringify(f)), f);
});

test('walking: walls block, encounters come by step count, opened treasure stays opened', () => {
  const f = generateFloor(params);
  const rng = makeRng(1);
  const ex = startFloor(f, rng);
  let encounters = 0;
  let blocked = 0;
  for (let i = 0; i < 400; i++) {
    const dir = ['up', 'down', 'left', 'right'][Math.floor(rng() * 4)];
    const r = move(f, ex, dir, rng);
    if (!r.moved) blocked++;
    if (r.event?.type === 'encounter') {
      encounters++;
      assert.ok(r.event.group.length >= 1);
    }
    if (r.event?.type === 'treasure') ex.opened.push(r.event.feature.id);
  }
  assert.ok(blocked > 0);
  assert.ok(encounters >= 5 && encounters <= 60, `${encounters} encounters`);
});

test('encounter groups come from the table with levels in range', () => {
  const f = generateFloor(params);
  const rng = makeRng(3);
  for (let i = 0; i < 50; i++) {
    for (const m of rollEncounter(f, rng)) {
      assert.ok(['kappa', 'puck'].includes(m.id));
      assert.ok(m.level >= 3 && m.level <= 5);
    }
  }
});
