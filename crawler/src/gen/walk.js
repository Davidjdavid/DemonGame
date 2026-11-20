// Walk simulation for generated floors. Pure.
//
// exploreWalk(floor): an explorer that starts on the down stairs with no map and walks (real tryMove/arrive) until it
// stands on the goal (up stairs / boss). It only knows what it has seen: the four edges of each lit cell it stood on
// (like the automap), the tile it stepped onto, and where warps/launchers took it. Policy: walk to the nearest
// frontier (an untried step into an unmapped cell, an unknown warp/launcher tile, or a barred shortcut it can lift —
// doors make you curious). Dark cells are never mapped: it crosses them with a hand-on-the-wall depth-first walk that
// forgets everything once it is out, but it remembers where entering the dark at a given spot (right or left hand)
// led, and plans with those "forays" like any other move.
//
// returnTrip(floor, flags, inv): steps for the run back up (D -> goal) and down (goal -> D) with full knowledge, the
// shortcuts/locks the explorer opened and the keys it carries.
import { DX, DY, cellAt, edgeAt } from '../world/floor.js';
import { tryMove, arrive, newFlags, edgeState } from '../world/move.js';
import { stepGraph, bfs, cellIndex, goalCell, downCell } from './graph.js';

export function exploreWalk(floor, { maxSteps } = {}) {
  const { w } = floor;
  const n = floor.cells.length;
  const D = downCell(floor);
  const G = goalCell(floor);
  const goal = cellIndex(floor, G.x, G.y);
  const xy = (i) => [i % w, Math.floor(i / w)];
  const nb = (i, d) => { const [x, y] = xy(i); return cellIndex(floor, x + DX[d], y + DY[d]); };
  const walkable = floor.cells.filter((c) => !c.solid).length;
  const darkCount = floor.cells.filter((c) => c.dark).length;
  const cap = maxSteps ?? 40 * walkable + 200;
  const flags = newFlags();
  const inv = {};
  const rec = new Uint8Array(n); // mapped cells (stood on, lit)
  const arr = new Int32Array(n).fill(-1); // learned: stepping onto cell j ends at arr[j]
  const macros = new Map(); // `${i},${d}` -> [{ hand, to, cost }]
  const triedDark = new Set();
  const opened = [];
  let pos = cellIndex(floor, D.x, D.y);
  let facing = floor.start?.[2] ?? 0;
  let steps = 0;
  let forays = 0;

  const isDark = (i) => floor.cells[i].dark;
  const special = (i) => ['warp', 'launch'].includes(floor.cells[i].feature?.type);
  const record = (i) => { if (!isDark(i)) rec[i] = 1; };
  const pickup = (i) => {
    const f = floor.cells[i].feature;
    if (f?.type === 'chest' && /key/.test(f.item) && !inv[f.item]) {
      inv[f.item] = 1;
      // A new key: locked doors seen in the dark are worth another look, so dark forays can be retried.
      triedDark.clear();
      macros.clear();
    }
  };

  // Can it step that way, judging by what it sees (door arrows, bars and locks are visible)?
  const looksPassable = (i, d) => {
    const [x, y] = xy(i);
    const there = cellAt(floor, x + DX[d], y + DY[d]);
    if (!there || there.solid) return false;
    const e = edgeAt(floor, x, y, d);
    switch (edgeState(e, flags)) {
      case 'open': case 'door': return true;
      case 'oneway': case 'shortcut': return d === e.dir;
      case 'lock': return (inv[e.key] || 0) > 0;
      default: return false;
    }
  };

  const step = (d) => {
    const [x, y] = xy(pos);
    const r = tryMove(floor, flags, inv, x, y, d);
    steps++;
    if (!r.ok) return false;
    if (r.opened) opened.push(r.edge.id);
    const a = arrive(floor, flags, r.x, r.y);
    const via = cellIndex(floor, r.x, r.y);
    pickup(via);
    for (const m of a.moves) pickup(cellIndex(floor, m.x, m.y));
    const to = cellIndex(floor, a.x, a.y);
    if (!isDark(via)) arr[via] = to;
    const slide = a.moves.filter((m) => m.kind === 'slide');
    facing = slide.length ? slide[slide.length - 1].dir : d;
    pos = to;
    record(pos);
    return true;
  };

  // Hand-on-the-wall depth-first walk through the dark until it stands on a lit cell (or the goal).
  const foray = (d0, hand) => {
    const from = pos;
    const before = steps;
    forays++;
    if (d0 >= 0) { triedDark.add(`${from},${d0},${hand}`); if (!step(d0)) return; }
    const local = new Set([pos]);
    const trail = [pos];
    const order = hand === 0 ? [1, 0, 3] : [3, 0, 1];
    for (let k = 0; isDark(pos) && pos !== goal && k < 6 * darkCount + 30 && steps < cap; k++) {
      let moved = false;
      for (const rel of order) {
        const d = (facing + rel) % 4;
        if (!looksPassable(pos, d) || local.has(nb(pos, d))) continue;
        step(d);
        local.add(pos);
        trail.push(pos);
        moved = true;
        break;
      }
      if (moved) continue;
      trail.pop();
      const back = trail[trail.length - 1];
      let d = [0, 1, 2, 3].find((dd) => back !== undefined && nb(pos, dd) === back && looksPassable(pos, dd));
      if (d === undefined) d = [2, ...order].map((rel) => (facing + rel) % 4).find((dd) => looksPassable(pos, dd));
      if (d === undefined) break;
      step(d);
      if (back === undefined) trail.push(pos);
    }
    if (d0 >= 0 && !isDark(pos)) {
      const key = `${from},${d0}`;
      const list = macros.get(key) || [];
      if (!list.some((m) => m.hand === hand)) list.push({ hand, to: pos, cost: steps - before });
      macros.set(key, list);
    }
  };

  // Moves from a mapped cell: known ones ({ d, to, cost, hand? }) and frontier ones ({ d, frontier, hand? }).
  const options = (i) => {
    const out = [];
    for (let d = 0; d < 4; d++) {
      if (!looksPassable(i, d)) continue;
      const j = nb(i, d);
      const [x, y] = xy(i);
      const e = edgeAt(floor, x, y, d);
      if (isDark(j)) {
        for (const m of macros.get(`${i},${d}`) || []) out.push({ d, to: m.to, cost: m.cost, hand: m.hand });
        for (const hand of [0, 1]) if (!triedDark.has(`${i},${d},${hand}`)) out.push({ d, frontier: true, hand });
        continue;
      }
      if (e.type === 'shortcut' && !flags.opened[e.id]) { out.push({ d, frontier: true, bar: true }); continue; }
      if (arr[j] >= 0) out.push({ d, to: arr[j], cost: 1 });
      else if (rec[j] && !special(j)) out.push({ d, to: j, cost: 1 });
      else out.push({ d, frontier: true });
    }
    return out;
  };

  // Dijkstra over known moves to the nearest cell with a frontier move. Returns { path: [opt], go: opt } or null.
  const plan = () => {
    const dist = new Map([[pos, 0]]);
    const prev = new Map();
    const heap = new MinHeap();
    heap.push(0, pos);
    const done = new Set();
    while (heap.size) {
      const [du, u] = heap.pop();
      if (done.has(u)) continue;
      done.add(u);
      const opts = options(u);
      // Among equally near frontiers: lift a bar you're standing at first (a visible barred door), then straight on.
      const rankOf = (o) => (o.bar ? 0 : o.d === facing ? 1 : 2);
      const ahead = opts.filter((o) => o.frontier).sort((a, b) => rankOf(a) - rankOf(b));
      if (ahead.length) {
        const path = [];
        for (let v = u; v !== pos; v = prev.get(v).from) path.push(prev.get(v).opt);
        return { path: path.reverse(), go: ahead[0], at: u };
      }
      for (const o of opts) {
        const nd = du + o.cost;
        if (!dist.has(o.to) || nd < dist.get(o.to)) { dist.set(o.to, nd); prev.set(o.to, { from: u, opt: o }); heap.push(nd, o.to); }
      }
    }
    return null;
  };

  const take = (o) => (o.hand !== undefined ? foray(o.d, o.hand) : step(o.d));

  record(pos);
  pickup(pos);
  while (pos !== goal && steps < cap) {
    if (isDark(pos)) { foray(-1, 0); continue; }
    const p = plan();
    if (!p) break;
    let ok = true;
    for (const o of p.path) {
      take(o);
      if (pos === goal || pos !== o.to) { ok = false; break; }
    }
    if (ok && pos === p.at) take(p.go);
  }
  return {
    found: pos === goal,
    steps,
    visited: rec.reduce((a, b) => a + b, 0),
    forays,
    opened,
    flags,
    inv,
  };
}

export function returnTrip(floor, flags = newFlags(), inv = {}) {
  const D = downCell(floor);
  const G = goalCell(floor);
  const di = cellIndex(floor, D.x, D.y);
  const gi = cellIndex(floor, G.x, G.y);
  const adj = stepGraph(floor, { flags, inv });
  const up = bfs(adj, di).dist[gi];
  const down = bfs(adj, gi).dist[di];
  return { up: up >= 0 ? up : Infinity, down: down >= 0 ? down : Infinity };
}

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(k, v) {
    const a = this.a;
    a.push([k, v]);
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}
