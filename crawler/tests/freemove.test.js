import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFloor } from '../src/world/floor.js';
import { newFlags } from '../src/world/move.js';
import { slide, RADIUS, dirOfYaw, yawOfDir, forwardOf } from '../src/world/freeMove.js';
import testFloor from '../src/data/floors/test.js';

const F = parseFloor(testFloor);
const walk = (x, y, dx, dy, flags = newFlags(), inv = {}, steps = 20) => {
  let p = { x, y, blocked: null };
  let blocked = null;
  for (let i = 0; i < steps; i++) { p = slide(F, flags, inv, p.x, p.y, dx / steps, dy / steps); blocked ||= p.blocked; }
  return { ...p, blocked };
};

test('walls stop you a radius short of the edge', () => {
  const p = walk(1, 9, 0, -1); // (1,8) is rock
  assert.ok(Math.abs(p.y - (8.5 + RADIUS)) < 1e-6, `y ${p.y}`);
});

test('you can walk through a door gap but not its jambs', () => {
  const through = walk(2, 2, 1, 0);
  assert.ok(through.x > 2.9, `x ${through.x}`);
  const jamb = walk(2, 1.55, 1, 0);
  assert.ok(jamb.x < 2.5, `stopped by the jamb at x ${jamb.x}`);
});

test('one-way doors and barred shortcuts block from the wrong side and say which door', () => {
  assert.ok(walk(2, 8, 1, 0).x > 2.9);
  const back = walk(3, 8, -1, 0);
  assert.ok(back.x > 2.5, `x ${back.x}`);
  assert.equal(back.blocked.type, 'oneway');
  const barred = walk(2, 5, 0, -1);
  assert.ok(barred.y > 4.5);
  assert.equal(barred.blocked.type, 'shortcut');
  assert.ok(walk(2, 4, 0, 1).y > 4.9); // from the north it opens
});

test('a lock blocks without its key and lets you through with it', () => {
  assert.ok(walk(8, 0, 1, 0).x < 8.5);
  assert.ok(walk(8, 0, 1, 0, newFlags(), { brass_key: 1 }).x > 8.9);
});

test('sliding along a wall keeps the sideways part of the move', () => {
  const p = walk(2, 7, 1, -1); // east is rock at (3,7) and (3,6): slide north up the corridor
  assert.ok(p.y < 6.3 && p.x < 2.5, `${p.x},${p.y}`);
});

test('heading helpers agree with the grid directions', () => {
  for (let d = 0; d < 4; d++) assert.equal(dirOfYaw(yawOfDir(d)), d);
  const [fx, fy] = forwardOf(yawOfDir(1));
  assert.ok(Math.abs(fx - 1) < 1e-9 && Math.abs(fy) < 1e-9);
});
