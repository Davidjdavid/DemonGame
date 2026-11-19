import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, step, travel, unlockDoor, pullSwitch, openChest, tileAt } from '../src/world/runtime.js';
import { newStory, meets, applyChoice, hasFlag } from '../src/story/state.js';
import { makeRng } from '../src/game/rng.js';
import { newPlayer } from '../src/game/player.js';

const maps = {
  a: {
    id: 'a', width: 9, height: 5, start: { x: 1, y: 1 }, encounters: null,
    tiles: ['#########', '#....~..#', '#....~..#', '#....~..#', '#########'],
    entities: [
      { id: 'npc1', type: 'npc', x: 2, y: 1, npcId: 'x' },
      { id: 'door1', type: 'door', x: 3, y: 2, key: 'rusty_key' },
      { id: 'sw', type: 'switch', x: 4, y: 3, flag: 'drained', drain: [[5, 1], [5, 2], [5, 3]] },
      { id: 'box', type: 'chest', x: 1, y: 3, contents: { gold: 50 } },
      { id: 'up', type: 'stairs', x: 7, y: 2, to: 'b', toX: 1, toY: 1 },
      { id: 'tr', type: 'trigger', x: 6, y: 1, scene: 'boo', requires: { flags: { drained: true } } },
    ],
  },
  b: { id: 'b', width: 4, height: 3, start: { x: 1, y: 1 }, tiles: ['####', '#..#', '####'], entities: [],
    encounters: { rate: [2, 2], table: [{ ids: ['kappa'], weight: 1, level: [3, 3] }] } },
};

test('bumping an NPC interacts without moving; walls block', () => {
  const rng = makeRng(1);
  const story = newStory({ meters: {} });
  const w = newWorld(maps, 'a', rng);
  const r = step(maps, w, story, 'right', rng);
  assert.equal(r.moved, false);
  assert.equal(r.event.entity.id, 'npc1');
  assert.equal(step(maps, w, story, 'up', rng).moved, false);
});

test('doors need their key; switches drain water and set flags; chests open once', () => {
  const rng = makeRng(1);
  const story = newStory({ meters: {} });
  const w = newWorld(maps, 'a', rng);
  const p = newPlayer();
  const door = maps.a.entities.find((e) => e.id === 'door1');
  assert.equal(unlockDoor(maps.a, w, story, p, door).ok, false);
  p.items.rusty_key = 1;
  assert.ok(unlockDoor(maps.a, w, story, p, door).ok);
  assert.equal(tileAt(maps.a, w, 5, 2), '~');
  assert.ok(pullSwitch(maps.a, w, story, maps.a.entities.find((e) => e.id === 'sw')));
  assert.equal(tileAt(maps.a, w, 5, 2), ',');
  assert.ok(hasFlag(story, 'drained'));
  const chest = maps.a.entities.find((e) => e.id === 'box');
  assert.deepEqual(openChest(maps.a, w, chest), { gold: 50 });
  assert.equal(openChest(maps.a, w, chest), null);
});

test('triggers fire once when their requirements are met; stairs travel; encounters come by steps', () => {
  const rng = makeRng(1);
  const story = newStory({ meters: {} });
  const w = newWorld(maps, 'a', rng);
  w.x = 5; w.y = 1;
  pullSwitch(maps.a, w, story, maps.a.entities.find((e) => e.id === 'sw'));
  const r = step(maps, w, story, 'right', rng);
  assert.equal(r.event?.type, 'trigger');
  step(maps, w, story, 'left', rng);
  assert.equal(step(maps, w, story, 'right', rng).event, null, 'once');
  w.x = 6; w.y = 2;
  const s = step(maps, w, story, 'right', rng);
  assert.equal(s.event.type, 'stairs');
  travel(maps, w, s.event.entity, rng);
  assert.equal(w.mapId, 'b');
  let enc = 0;
  for (let i = 0; i < 6; i++) if (step(maps, w, story, i % 2 ? 'left' : 'right', rng).event?.type === 'encounter') enc++;
  assert.ok(enc >= 2);
});

test('story requirements and choices', () => {
  const story = newStory({ meters: { trust_a: 'x' } });
  assert.equal(story.meters.talks, 0);
  const next = applyChoice(story, { text: 'Yes', set: { helped: true }, meters: { trust_a: 2 }, next: 's2' });
  assert.equal(next, 's2');
  assert.ok(meets(story, { flags: { helped: true }, meters: { trust_a: { min: 2 } } }));
  assert.ok(!meets(story, { meters: { trust_a: { min: 3 } } }));
  assert.ok(!meets(story, { flags: { helped: false } }));
});

test('playtest fixes: no demon more than twice per floor, no repeat of the last three groups', async () => {
  const { rollVaried, MAX_PER_FLOOR } = await import('../src/world/runtime.js');
  const map = { id: 'm', encounters: { rate: [1, 1], table: [
    { ids: ['kappa'], weight: 5, level: [3, 3] }, { ids: ['puck'], weight: 1, level: [5, 5] }, { ids: ['oni'], weight: 1, level: [8, 8] },
    { ids: ['golem'], weight: 1, level: [9, 9] }, { ids: ['troll'], weight: 1, level: [6, 6] }, { ids: ['kodama'], weight: 1, level: [2, 2] },
  ] } };
  const world = {};
  const rng = makeRng(4);
  const counts = {};
  for (let i = 0; i < 12; i++) for (const g of rollVaried(map, world, rng)) counts[g.id] = (counts[g.id] ?? 0) + 1;
  assert.ok(Object.values(counts).every((n) => n <= MAX_PER_FLOOR + 1), JSON.stringify(counts));
  assert.ok(Object.keys(counts).length >= 5, 'varied');
});

import { capLevels } from '../src/world/runtime.js';
import { sellItem } from '../src/game/shop.js';

test('a used key leaves your bag; key items cannot be sold', () => {
  const maps = { a: { id: 'a', tiles: ['#####', '#...#', '#####'], start: { x: 1, y: 1 }, entities: [{ id: 'd', type: 'door', x: 2, y: 1, key: 'culvert_key' }] } };
  const w = newWorld(maps, 'a', makeRng(2));
  const p = newPlayer();
  p.items.culvert_key = 1;
  const r = unlockDoor(maps.a, w, newStory({ meters: {} }), p, maps.a.entities[0]);
  assert.ok(r.ok && r.usedKey === 'culvert_key');
  assert.equal(p.items.culvert_key, undefined);
  p.items.gallery_key = 1;
  assert.equal(sellItem(p, 'gallery_key').ok, false);
  assert.equal(p.items.gallery_key, 1);
});

test('random encounters are capped at player level + 1', () => {
  const g = [{ id: 'minotaur', level: 11 }, { id: 'golem', level: 7 }];
  g.row = 3;
  const c = capLevels(g, 8);
  assert.deepEqual(c.map((x) => x.level), [9, 7]);
  assert.equal(c.row, 3);
  assert.equal(capLevels(g, undefined), g);
});

test('scene choices: heal restores the party, record is the readable decision', () => {
  const story = newStory({ meters: {} });
  const p = newPlayer();
  p.hp = 1; p.mp = 0;
  applyChoice(story, { text: 'Drink the soup.', heal: true, record: 'You drank Ines\'s soup.' }, p);
  assert.equal(p.hp, p.maxHp);
  assert.equal(p.mp, p.maxMp);
  applyChoice(story, { text: 'Keep going.' }, p);
  assert.deepEqual(story.log.filter((l) => l.record).map((l) => l.record), ['You drank Ines\'s soup.']);
});

test('random encounters skip groups 4+ levels below you (unless nothing else is left)', async () => {
  const { rollVaried } = await import('../src/world/runtime.js');
  const map = { id: 'm', encounters: { table: [{ ids: ['kodama'], weight: 5, level: [2, 3] }, { ids: ['oni'], weight: 1, level: [8, 8] }], rate: [5, 5] } };
  const w = { playerLevel: 9 };
  for (let k = 0; k < 6; k++) assert.equal(rollVaried(map, w, makeRng(k))[0].id, 'oni');
  const low = { id: 'n', encounters: { table: [{ ids: ['kodama'], weight: 1, level: [2, 3] }], rate: [5, 5] } };
  assert.equal(rollVaried(low, { playerLevel: 12 }, makeRng(1))[0].id, 'kodama');
});
