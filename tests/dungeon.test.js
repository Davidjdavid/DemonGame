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

test('the same encounter group never comes up twice in a row', () => {
  const f = generateFloor(params);
  const rng = makeRng(5);
  let last = -1;
  for (let i = 0; i < 200; i++) {
    const g = rollEncounter(f, rng, last);
    assert.notEqual(g.row, last);
    last = g.row;
  }
});

import { openTreasure, useSpring, clearBoss } from '../src/dungeon/events.js';
import { newPlayer } from '../src/game/player.js';
test('review fix: a chest opens once, and a beaten boss stays beaten', () => {
  const f = generateFloor({ ...params, stairs: false, boss: { id: 'gonggong', level: 12 } });
  const rng = makeRng(2);
  const run = { ex: startFloor(f, rng), opened: {}, bossDefeated: false };
  const player = newPlayer();
  const chest = f.features.find((x) => x.type === 'treasure');
  const gold = player.gold;
  assert.ok(openTreasure(run, f, chest, player));
  assert.equal(openTreasure(run, f, chest, player), null);
  run.ex.x = chest.x - 1 >= 0 && f.tiles[chest.y][chest.x - 1] !== '#' ? chest.x - 1 : chest.x + 1;
  run.ex.y = chest.y;
  const dir = run.ex.x < chest.x ? 'right' : 'left';
  assert.equal(move(f, run.ex, dir, rng).event, null, 'stepping on an opened chest does nothing');
  assert.ok(player.gold >= gold);
  const boss = f.features.find((x) => x.type === 'boss');
  clearBoss(run);
  run.ex.x = boss.x; run.ex.y = boss.y;
  const near = [[1, 0, 'left'], [-1, 0, 'right'], [0, 1, 'up'], [0, -1, 'down']].find(([dx, dy]) => f.tiles[boss.y + dy]?.[boss.x + dx] === '.');
  run.ex.x = boss.x + near[0]; run.ex.y = boss.y + near[1];
  assert.notEqual(move(f, run.ex, near[2], rng).event?.type, 'boss');
  player.hp = 1;
  useSpring(player);
  assert.equal(player.hp, player.maxHp);
});
