import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseFloor, edgeCells, DX, DY } from '../src/world/floor.js';
import { validateFloor, shortestPath } from '../src/gen/validate.js';
import { generateFloor, normalizeSpec, sourceToModule, stairsRule } from '../src/gen/generator.js';
import { floorMetrics, scoreFloor } from '../src/gen/metrics.js';
import { exploreWalk, returnTrip } from '../src/gen/walk.js';
import { stepGraph, bfs, cellIndex, downCell } from '../src/gen/graph.js';
import { FLOOR_SPECS } from '../src/gen/specs.js';
import { ITEMS } from '../src/data/items.js';
import { renderFloorPng } from '../scripts/render-floor.mjs';
import testFloor from '../src/data/floors/test.js';

const SEEDS = [1, 2, 3, 977];
const allEdges = (f) => [...f.hEdges, ...f.vEdges];

for (const spec of FLOOR_SPECS) {
  test(`generator ${spec.key}: floors parse, validate and meet the spec`, () => {
    const rule = stairsRule(spec);
    for (const seed of SEEDS) {
      const src = generateFloor(spec, seed);
      const at = `${spec.key} seed ${seed}`;
      assert.equal(src.map.length, 2 * spec.h + 1, at);
      assert.ok(src.map.every((l) => l.length === 2 * spec.w + 1), at);
      const floor = parseFloor(src);
      assert.equal(floor.w, spec.w);
      assert.equal(floor.h, spec.h);
      const v = validateFloor(floor);
      assert.deepEqual(v.problems, [], at);
      const m = floorMetrics(floor, { walk: seed === SEEDS[0] });
      if (seed === SEEDS[0]) {
        assert.equal(m.walkFound, true, `${at}: explorer got lost`);
        assert.ok(m.returnSteps <= m.pathLength, `${at}: run back up longer than the first trip`);
      }
      assert.ok(m.pathLength >= rule.minPath, `${at}: path ${m.pathLength} < ${rule.minPath}`);
      assert.ok(m.stairsManhattan >= rule.minManhattan, `${at}: stairs too close`);
      assert.ok(m.loops >= spec.loops, `${at}: loops ${m.loops}`);
      assert.ok(m.deadEnds >= spec.deadEnds, `${at}: dead ends ${m.deadEnds}`);
      assert.equal(m.shortcuts, spec.shortcuts, at);
      assert.ok(m.pathWithShortcuts < m.pathLength, `${at}: shortcuts don't cut the route`);

      // Start next to the down stairs; areas; chests with real items (keys match their locks).
      const D = downCell(floor);
      assert.equal(Math.abs(src.start[0] - D.x) + Math.abs(src.start[1] - D.y), 1, at);
      assert.ok(src.areas.length >= 2 && src.areas.length <= 4, at);
      assert.equal(new Set(src.areas.map((a) => a.color)).size, src.areas.length, at);
      const chests = floor.cells.filter((c) => c.feature?.type === 'chest');
      const keys = chests.filter((c) => /key/.test(c.feature.item));
      assert.equal(chests.length - keys.length, spec.chests, at);
      for (const c of chests) if (!/key/.test(c.feature.item)) assert.ok(ITEMS[c.feature.item], `${at}: item ${c.feature.item}`);
      const locks = allEdges(floor).filter((e) => e.type === 'lock');
      assert.equal(locks.length, spec.gimmicks.includes('lock') ? 1 : 0, at);
      for (const l of locks) assert.ok(keys.some((k) => k.feature.item === l.key), `${at}: no key for lock`);

      // Gimmicks asked for are present.
      const ns = normalizeSpec(spec);
      if (ns.g.has('door')) assert.ok(m.doors > 0, at);
      assert.ok(m.oneways >= ns.oneways, `${at}: one-way doors ${m.oneways}`);
      assert.ok(m.launchers >= ns.lanes, `${at}: launchers ${m.launchers}`);
      assert.ok(m.warps >= ns.warpPairs, `${at}: warp pairs ${m.warps}`);
      if (ns.dark) assert.ok(m.darkCells > 0, at);
      if (spec.boss) {
        for (const t of ['boss', 'warn', 'heal', 'save']) assert.ok(floor.cells.some((c) => c.feature?.type === t), `${at}: ${t}`);
        assert.ok(!floor.cells.some((c) => c.feature?.type === 'stairs' && c.feature.dir === 'up'), at);
      }

      // Each shortcut opens from the far side into a cell nearer the down stairs (first trip, bars closed).
      const d0 = bfs(stepGraph(floor), cellIndex(floor, D.x, D.y)).dist;
      for (const e of allEdges(floor).filter((x) => x.type === 'shortcut')) {
        const [p, q] = edgeCells(floor, e);
        const [a, b] = p[0] + DX[e.dir] === q[0] && p[1] + DY[e.dir] === q[1] ? [p, q] : [q, p];
        assert.ok(d0[cellIndex(floor, ...b)] < d0[cellIndex(floor, ...a)], `${at}: shortcut ${e.id} opens away from D`);
      }
    }
  });
}

test('generator is deterministic per seed and varies across seeds', () => {
  const spec = FLOOR_SPECS[2];
  assert.deepEqual(generateFloor(spec, 11), generateFloor(spec, 11));
  assert.notDeepEqual(generateFloor(spec, 11).map, generateFloor(spec, 12).map);
});

test('sourceToModule round-trips a generated floor', async () => {
  const src = generateFloor(FLOOR_SPECS[5], 4);
  const text = sourceToModule(src, 'test draft');
  const mod = await import(`data:text/javascript,${encodeURIComponent(text)}`);
  assert.deepEqual(mod.default, JSON.parse(JSON.stringify(src)));
});

test('metrics are sane on the hand-made test floor', () => {
  const F = parseFloor(testFloor);
  const m = floorMetrics(F);
  assert.equal(m.pathLength, shortestPath(F, [0, 9], [9, 0]));
  assert.equal(m.pathLength, 15);
  assert.ok(m.firstTrip >= m.pathLength); // must fetch the brass key first
  assert.ok(m.pathWithShortcuts <= m.pathLength);
  assert.equal(m.stairsManhattan, 18);
  assert.ok(m.loops >= 1 && m.loops <= m.cyclomatic);
  assert.ok(m.deadEnds >= 1);
  assert.equal(m.chests, 2);
  assert.ok(m.chestsInDeadEnds <= m.chests);
  assert.ok(m.longestStraightRun >= 1 && m.longestStraightRun <= m.pathLength);
  assert.ok(m.turnsOnMainPath < m.pathLength);
  assert.ok(m.coverageOfMainPath > 0 && m.coverageOfMainPath <= 1);
  assert.equal(m.cells, F.cells.filter((c) => !c.solid).length);
  assert.equal(m.walkFound, true);
  assert.ok(m.walkSteps >= m.firstTrip);
  assert.ok(m.returnSteps <= m.pathLength);
  assert.ok(Number.isFinite(scoreFloor(m, { w: 10, h: 10, loops: 1, deadEnds: 1 })));
});

test('walk: explorer finds the stairs down a corridor, also through the dark', () => {
  const lit = parseFloor({ id: 'c', start: [1, 0, 1], map: ['+-+-+-+-+', '|D . . U|', '+-+-+-+-+'] });
  const w = exploreWalk(lit);
  assert.equal(w.found, true);
  assert.equal(w.steps, 3);
  assert.deepEqual(returnTrip(lit), { up: 3, down: 3 });
  const dark = parseFloor({ id: 'c2', start: [1, 1, 1], dark: [[1, 0, 3, 1]], map: [
    '+-+-+-+-+-+',
    '|. . . . .|',
    '+ + + + + +',
    '|D . . . U|',
    '+-+-+-+-+-+',
  ] });
  const wd = exploreWalk(dark);
  assert.equal(wd.found, true);
  assert.ok(wd.forays >= 1);
  assert.ok(wd.steps >= 4);
});

test('walk: explorer lifts a barred shortcut on its way and the run back up uses it', () => {
  // D (0,2) -> east -> north -> west to (1,1), which has a bar opening west into (0,1) next to D; U is north of (1,1).
  const F = parseFloor({ id: 's', start: [0, 2, 1], map: [
    '+-+-+-+',
    '|#|U|#|',
    '+-+ +-+',
    '|.w. .|',
    '+ +-+ +',
    '|D . .|',
    '+-+-+-+',
  ] });
  assert.equal(floorMetrics(F, { walk: false }).pathLength, 5);
  const w = exploreWalk(F);
  assert.equal(w.found, true);
  assert.equal(w.opened.length, 1);
  assert.equal(returnTrip(F, w.flags, w.inv).up, 3);
});

test('renderer writes a PNG of the test floor', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'floorpng-')), 'test.png');
  const r = renderFloorPng(testFloor, out, { cell: 24 });
  const buf = fs.readFileSync(out);
  assert.deepEqual([...buf.subarray(1, 4)].map((c) => String.fromCharCode(c)).join(''), 'PNG');
  assert.equal(buf.readUInt32BE(16), r.width);
  assert.equal(buf.readUInt32BE(20), r.height);
  fs.rmSync(path.dirname(out), { recursive: true });
});
