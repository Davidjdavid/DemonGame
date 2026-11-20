// Floor metrics and scoring for generated candidates. Pure.
// floorMetrics(floor | src) -> numbers (see README); scoreFloor(metrics, spec) -> number, higher is better.
import { parseFloor, cellAt } from '../world/floor.js';
import { newFlags } from '../world/move.js';
import {
  stepGraph, bfs, pathSteps, allShortcutsOpen, structure, bridges, goalCell, downCell, cellIndex, stepFrom,
} from './graph.js';
import { exploreWalk, returnTrip } from './walk.js';

const asFloor = (f) => (f.cells ? f : parseFloor(f));
const DEST = new Set(['stairs', 'boss', 'warp', 'exit']);

// Cyclomatic number of the open-cell graph (E - N + C, warp pairs count as edges).
export function cyclomatic(floorIn) {
  const floor = asFloor(floorIn);
  const st = structure(floor);
  const seen = new Uint8Array(floor.cells.length);
  let C = 0;
  for (const i of st.nodes) {
    if (seen[i]) continue;
    C++;
    const q = [i];
    seen[i] = 1;
    for (let h = 0; h < q.length; h++) for (const { to } of st.nbrs[q[h]]) if (!seen[to]) { seen[to] = 1; q.push(to); }
  }
  return st.edges.length - st.nodes.length + C;
}

// Open 2x2 blocks (room floor): each is a trivial 4-cell cycle.
export function openSquares(floorIn) {
  const floor = asFloor(floorIn);
  const open = (x, y, d) => {
    const a = cellAt(floor, x, y);
    const b = cellAt(floor, x + (d === 1 ? 1 : 0), y + (d === 2 ? 1 : 0));
    if (!a || !b || a.solid || b.solid) return false;
    const e = d === 1 ? floor.vEdges[y * (floor.w + 1) + x + 1] : floor.hEdges[(y + 1) * floor.w + x];
    return e.type !== 'wall';
  };
  let n = 0;
  for (let y = 0; y < floor.h - 1; y++) {
    for (let x = 0; x < floor.w - 1; x++) if (open(x, y, 1) && open(x, y, 2) && open(x + 1, y, 2) && open(x, y + 1, 1)) n++;
  }
  return n;
}

// Loops you can actually walk around: cyclomatic number minus the trivial 2x2 cycles inside rooms.
export function floorLoops(floorIn) {
  const floor = asFloor(floorIn);
  return Math.max(0, cyclomatic(floor) - openSquares(floor));
}

// Dead ends: open cells with exactly one way in (stairs, warps, boss and exits don't count).
export function floorDeadEnds(floorIn) {
  const floor = asFloor(floorIn);
  const st = structure(floor);
  let n = 0;
  for (const i of st.nodes) {
    const f = floor.cells[i].feature;
    const deg = st.nbrs[i].filter((e) => !(f?.type === 'warp' && floor.cells[e.to].feature?.type === 'warp')).length;
    if (deg === 1 && !DEST.has(f?.type)) n++;
  }
  return n;
}

// Cells off the D-goal spine: separated from both by a bridge (dead-end branches and side rooms).
function offSpine(floor, st, di, gi) {
  const br = bridges(st.nbrs, st.nodes);
  const comp = new Int32Array(floor.cells.length).fill(-1);
  let k = 0;
  for (const i of st.nodes) {
    if (comp[i] >= 0) continue;
    const q = [i];
    comp[i] = k;
    for (let h = 0; h < q.length; h++) {
      for (const { to, eid } of st.nbrs[q[h]]) if (!br.has(eid) && comp[to] < 0) { comp[to] = k; q.push(to); }
    }
    k++;
  }
  const tree = Array.from({ length: k }, () => []);
  for (const eid of br) {
    const [a, b] = st.edges[eid];
    tree[comp[a]].push(comp[b]);
    tree[comp[b]].push(comp[a]);
  }
  const prev = new Int32Array(k).fill(-2);
  const q = [comp[di]];
  prev[comp[di]] = -1;
  for (let h = 0; h < q.length; h++) for (const c of tree[q[h]]) if (prev[c] === -2) { prev[c] = q[h]; q.push(c); }
  const spine = new Set();
  if (prev[comp[gi]] !== -2) for (let c = comp[gi]; c >= 0; c = prev[c]) spine.add(c);
  else spine.add(comp[di]);
  return (i) => !spine.has(comp[i]);
}

// Shortest first trip D -> goal with real keys (you must fetch each key before its lock).
function firstTripWithKeys(floor, di, gi) {
  const keys = floor.cells.filter((c) => c.feature?.type === 'chest' && /key/.test(c.feature.item));
  const K = 1 << keys.length;
  const n = floor.cells.length;
  const keyAt = new Map(keys.map((c, b) => [cellIndex(floor, c.x, c.y), b]));
  const pick = (i, km) => (keyAt.has(i) ? km | (1 << keyAt.get(i)) : km);
  const dist = new Int32Array(n * K).fill(-1);
  const s0 = di * K + pick(di, 0);
  dist[s0] = 0;
  const q = [s0];
  const flags = newFlags();
  for (let h = 0; h < q.length; h++) {
    const s = q[h];
    const i = Math.floor(s / K);
    const km = s % K;
    if (i === gi) return dist[s];
    const inv = {};
    keys.forEach((c, b) => { if (km & (1 << b)) inv[c.feature.item] = 1; });
    const c = floor.cells[i];
    for (let d = 0; d < 4; d++) {
      const r = stepFrom(floor, flags, inv, c.x, c.y, d);
      if (!r) continue;
      let nkm = pick(cellIndex(floor, ...r.via), km);
      for (const m of r.moves) nkm = pick(cellIndex(floor, m.x, m.y), nkm);
      const ns = cellIndex(floor, r.x, r.y) * K + nkm;
      if (dist[ns] < 0) { dist[ns] = dist[s] + 1; q.push(ns); }
    }
  }
  return Infinity;
}

export function floorMetrics(floorIn, { walk = true } = {}) {
  const floor = asFloor(floorIn);
  const D = downCell(floor);
  const G = goalCell(floor);
  if (!D || !G) throw new Error(`${floor.id}: needs down stairs and an up stairs / boss`);
  const di = cellIndex(floor, D.x, D.y);
  const gi = cellIndex(floor, G.x, G.y);
  const closed = stepGraph(floor);
  const steps = pathSteps(closed, di, gi) || [];
  const pathLength = steps.length || Infinity;
  const sc = bfs(stepGraph(floor, { flags: allShortcutsOpen(floor) }), di).dist[gi];
  const pathWithShortcuts = sc >= 0 ? sc : Infinity;
  // Straight runs and turns along the main path (a warp ends a run).
  let run = 0;
  let longestStraightRun = 0;
  let turnsOnMainPath = 0;
  let prevDir = -1;
  for (const s of steps) {
    if (s.dir === prevDir) run++;
    else { if (prevDir >= 0) turnsOnMainPath++; run = 1; }
    prevDir = s.dir;
    longestStraightRun = Math.max(longestStraightRun, run);
    if (s.warp) { prevDir = -1; run = 0; }
  }
  const pathCells = new Set([di, ...steps.map((s) => s.to)]);
  const st = structure(floor);
  const tucked = offSpine(floor, st, di, gi);
  const chestCells = floor.cells.filter((c) => c.feature?.type === 'chest');
  const chestsInDeadEnds = chestCells.filter((c) => tucked(cellIndex(floor, c.x, c.y))).length;
  const all = [...floor.hEdges, ...floor.vEdges];
  const count = (t) => all.filter((e) => e.type === t).length;
  const cells = st.nodes.length;
  const m = {
    pathLength,
    pathWithShortcuts,
    shortcutSaving: Number.isFinite(pathLength) && Number.isFinite(pathWithShortcuts) ? pathLength - pathWithShortcuts : 0,
    firstTrip: firstTripWithKeys(floor, di, gi),
    stairsManhattan: Math.abs(D.x - G.x) + Math.abs(D.y - G.y),
    loops: floorLoops(floor),
    cyclomatic: cyclomatic(floor),
    deadEnds: floorDeadEnds(floor),
    chests: chestCells.length,
    chestsInDeadEnds,
    longestStraightRun,
    turnsOnMainPath,
    cells,
    coverageOfMainPath: cells ? Math.round((pathCells.size / cells) * 1000) / 1000 : 0,
    doors: count('door'),
    oneways: count('oneway'),
    shortcuts: count('shortcut'),
    locks: count('lock'),
    warps: floor.cells.filter((c) => c.feature?.type === 'warp').length / 2,
    launchers: floor.cells.filter((c) => c.feature?.type === 'launch').length,
    darkCells: floor.cells.filter((c) => c.dark).length,
  };
  if (walk) {
    const w = exploreWalk(floor);
    const back = returnTrip(floor, w.flags, w.inv);
    Object.assign(m, {
      walkFound: w.found,
      walkSteps: w.steps,
      walkVisited: w.visited,
      walkDarkForays: w.forays,
      shortcutsOpenedByWalk: w.opened.length,
      returnSteps: back.up,
      descentSteps: back.down,
    });
  }
  return m;
}

// Higher is better. Rewards: a long D->goal route, several loops, treasure in dead ends, broken-up straight runs,
// a big shortcut saving that the explorer actually opens, and an exploration effort that is long but not a slog.
export function scoreFloor(m, spec = {}) {
  if (!Number.isFinite(m.pathLength)) return -1000;
  const S = ((spec.w || 10) + (spec.h || spec.w || 10)) / 2;
  const want = (k, d) => spec[k] ?? d;
  let s = 0;
  // Route length: best between 2x and 3.5x the mean side, a little less beyond 5x (a slog).
  const len = m.pathLength / S;
  s += 3 * Math.min(len, 3.5) - 2 * Math.max(0, len - 5);
  // Stairs far apart on the map too (fraction of the largest possible Manhattan distance).
  s += 4 * Math.min(1, m.stairsManhattan / Math.max(1, 2 * S - 2));
  // A key worth fetching: some detour (10-60% extra) is good, doubling the trip is not.
  if (m.locks && Number.isFinite(m.firstTrip)) {
    const extra = m.firstTrip / m.pathLength - 1;
    s += extra >= 0.1 && extra <= 0.6 ? 2 : -Math.min(6, 4 * Math.max(0.1 - extra, extra - 0.6));
  }
  const loops = want('loops', 1);
  s += m.loops >= loops ? 2 * Math.min(m.loops, loops + 3) : -5 * (loops - m.loops);
  const de = want('deadEnds', 2);
  s += m.deadEnds >= de ? 2 : -2 * (de - m.deadEnds);
  if (m.deadEnds > 3 * de + 4) s -= (m.deadEnds - 3 * de - 4) * 0.5;
  s += 4 * (m.chests ? m.chestsInDeadEnds / m.chests : 1);
  s -= 1.2 * Math.max(0, m.longestStraightRun - (3 + Math.round(S / 8)));
  s += 6 * Math.min(m.turnsOnMainPath / Math.max(1, m.pathLength), 0.6);
  const save = m.pathLength ? m.shortcutSaving / m.pathLength : 0;
  s += 10 * Math.min(save, 0.6);
  s += 2 * Math.min(m.coverageOfMainPath, 0.5);
  if (m.walkSteps !== undefined) {
    if (!m.walkFound) s -= 15;
    else {
      const ratio = m.walkSteps / m.pathLength;
      s += ratio >= 2 && ratio <= 6 ? 2 : -Math.min(4, Math.abs(ratio < 2 ? 2 - ratio : ratio - 6));
    }
    const sc = m.shortcuts || 0;
    if (sc) s += 3 * (m.shortcutsOpenedByWalk / sc);
    if (Number.isFinite(m.returnSteps) && m.pathLength) s += 3 * Math.min(1 - m.returnSteps / m.pathLength, 0.6);
  }
  return Math.round(s * 100) / 100;
}

export { goalCell, downCell };
