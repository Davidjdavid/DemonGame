import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFloor, edgeAt, cellAt } from '../src/world/floor.js';
import { tryMove, arrive, newFlags } from '../src/world/move.js';
import { newMemory, visit, known } from '../src/world/mapMemory.js';
import { validateFloor } from '../src/gen/validate.js';
import testFloor from '../src/data/floors/test.js';

const F = parseFloor(testFloor);

test('test floor parses to 10x10 with features', () => {
  assert.equal(F.w, 10);
  assert.equal(F.h, 10);
  assert.equal(cellAt(F, 9, 0).feature.type, 'stairs');
  assert.equal(cellAt(F, 0, 9).feature.dir, 'down');
  assert.equal(cellAt(F, 3, 0).solid, true);
  assert.equal(cellAt(F, 4, 8).feature.type, 'launch');
  assert.deepEqual(cellAt(F, 9, 2).feature.to, [4, 9]);
  assert.equal(cellAt(F, 6, 6).dark, true);
});

test('edges next to rock and the border are walls; edges are shared', () => {
  assert.equal(edgeAt(F, 0, 0, 0).type, 'wall');
  assert.equal(edgeAt(F, 2, 0, 1).type, 'wall'); // (3,0) is rock
  assert.equal(edgeAt(F, 0, 0, 2), edgeAt(F, 0, 1, 0));
  assert.equal(edgeAt(F, 2, 2, 1).type, 'door');
  assert.equal(edgeAt(F, 9, 0, 2).type, 'wall');
});

test('one-way door only opens in its direction', () => {
  const flags = newFlags();
  assert.equal(tryMove(F, flags, {}, 2, 8, 1).ok, true);
  const back = tryMove(F, flags, {}, 3, 8, 3);
  assert.equal(back.ok, false);
  assert.match(back.msg, /won't open/);
});

test('shortcut opens from one side, then works both ways', () => {
  const flags = newFlags();
  assert.equal(tryMove(F, flags, {}, 2, 5, 0).ok, false);
  const open = tryMove(F, flags, {}, 2, 4, 2);
  assert.equal(open.ok, true);
  assert.equal(open.opened, true);
  assert.equal(tryMove(F, flags, {}, 2, 5, 0).ok, true);
});

test('locked door needs its key and stays unlocked', () => {
  const flags = newFlags();
  assert.match(tryMove(F, flags, {}, 8, 0, 1).msg, /needs the brass key/);
  assert.equal(tryMove(F, flags, { brass_key: 1 }, 8, 0, 1).unlocked, true);
  assert.equal(tryMove(F, flags, {}, 8, 0, 1).ok, true);
});

test('warps and launchers move you on', () => {
  const flags = newFlags();
  const w = arrive(F, flags, 9, 2);
  assert.deepEqual([w.x, w.y], [4, 9]);
  const l = arrive(F, flags, 4, 8);
  assert.deepEqual([l.x, l.y], [9, 8]);
  assert.equal(l.moves.length, 5);
});

test('map memory records visits but not dark cells', () => {
  const m = newMemory();
  assert.equal(visit(m, F, 1, 9), true);
  assert.equal(visit(m, F, 1, 9), false);
  assert.equal(visit(m, F, 6, 6), false);
  assert.equal(known(m, 6, 6), false);
  assert.ok(m.edges.has(edgeAt(F, 1, 9, 0).id));
});

test('validator: test floor is solvable without softlocks', () => {
  const r = validateFloor(F);
  assert.deepEqual(r.problems, []);
  assert.ok(r.ok);
});

test('validator catches a one-way trap', () => {
  const src = { id: 'trap', start: [0, 0, 1], map: ['     ', ' D>. ', '     ', ' # U ', '     '] };
  // D(0,0) -> one-way east -> (1,0) -> (1,1) U. From U you can't get back down.
  const r = validateFloor(parseFloor(src));
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => /trap/.test(p)));
});
