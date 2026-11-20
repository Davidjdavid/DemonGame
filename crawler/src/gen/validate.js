// Floor validator: proves a floor is solvable with no softlocks. Pure.
// State = (cell, keys picked up, shortcuts opened). Explores every reachable state from the start, then checks that
// from each one you can still reach the up stairs (or the boss) and get back to the down stairs / exit.
import { cellAt } from '../world/floor.js';
import { tryMove, arrive, newFlags } from '../world/move.js';

function keyChests(floor) {
  return floor.cells.filter((c) => c.feature?.type === 'chest' && /key/.test(c.feature.item));
}

export function validateFloor(floor, { start = floor.start, goals = null, homes = null } = {}) {
  const shortcuts = [...floor.hEdges, ...floor.vEdges].filter((e) => e.type === 'shortcut');
  const kChests = keyChests(floor);
  const isGoal = goals ?? ((c) => c.feature?.type === 'boss' || (c.feature?.type === 'stairs' && c.feature.dir === 'up'));
  const isHome = homes ?? ((c) => c.feature?.type === 'exit' || (c.feature?.type === 'stairs' && c.feature.dir === 'down'));
  const enc = (x, y, km, sm) => `${x},${y},${km},${sm}`;
  const flagsFor = (sm) => {
    const f = newFlags();
    shortcuts.forEach((e, i) => { if (sm & (1 << i)) f.opened[e.id] = true; });
    return f;
  };
  const invFor = (km) => {
    const inv = {};
    kChests.forEach((c, i) => { if (km & (1 << i)) inv[c.feature.item] = 1; });
    return inv;
  };
  const pickup = (x, y, km) => {
    const i = kChests.findIndex((c) => c.x === x && c.y === y);
    return i >= 0 ? km | (1 << i) : km;
  };
  const [sx, sy] = start;
  const first = enc(sx, sy, pickup(sx, sy, 0), 0);
  const graph = new Map(); // state -> [next states]
  const queue = [first];
  graph.set(first, null);
  while (queue.length) {
    const s = queue.shift();
    const [x, y, km, sm] = s.split(',').map(Number);
    const nexts = [];
    for (let d = 0; d < 4; d++) {
      const flags = flagsFor(sm);
      const r = tryMove(floor, flags, invFor(km), x, y, d);
      if (!r.ok) continue;
      let nsm = sm;
      shortcuts.forEach((e, i) => { if (flags.opened[e.id]) nsm |= 1 << i; });
      const a = arrive(floor, flags, r.x, r.y);
      // Picking up a key on the cell you land on (and on any cell you slide over).
      let nkm = pickup(r.x, r.y, km);
      for (const m of a.moves) nkm = pickup(m.x, m.y, nkm);
      const n = enc(a.x, a.y, nkm, nsm);
      nexts.push(n);
      if (!graph.has(n)) { graph.set(n, null); queue.push(n); }
    }
    graph.set(s, nexts);
  }
  const states = [...graph.keys()];
  const cellOf = (s) => { const [x, y] = s.split(',').map(Number); return cellAt(floor, x, y); };
  // Reverse reachability to a set of target states.
  const rev = new Map(states.map((s) => [s, []]));
  for (const [s, ns] of graph) for (const n of ns) rev.get(n).push(s);
  const canReach = (pred) => {
    const ok = new Set(states.filter((s) => pred(cellOf(s))));
    const q = [...ok];
    while (q.length) {
      const s = q.shift();
      for (const p of rev.get(s)) if (!ok.has(p)) { ok.add(p); q.push(p); }
    }
    return ok;
  };
  const toGoal = canReach(isGoal);
  const toHome = canReach(isHome);
  const problems = [];
  const reachedCells = new Set(states.map((s) => s.split(',').slice(0, 2).join(',')));
  if (!states.some((s) => isGoal(cellOf(s)))) problems.push('goal (up stairs / boss) unreachable');
  const stuckGoal = states.filter((s) => !toGoal.has(s));
  const stuckHome = states.filter((s) => !toHome.has(s));
  if (stuckGoal.length) problems.push(`softlock: ${stuckGoal.length} states can't reach the goal, e.g. ${stuckGoal[0]}`);
  if (stuckHome.length) problems.push(`trap: ${stuckHome.length} states can't get back down, e.g. ${stuckHome[0]}`);
  for (const c of floor.cells) {
    if (c.feature?.type === 'chest' && !reachedCells.has(`${c.x},${c.y}`)) problems.push(`chest at ${c.x},${c.y} unreachable`);
  }
  const walkable = floor.cells.filter((c) => !c.solid).length;
  return { ok: problems.length === 0, problems, states: states.length, reachedCells: reachedCells.size, walkable };
}

// Shortest walking path length in steps between two cells, ignoring keys (locks count as passable) — for metrics.
export function shortestPath(floor, from, to, { passLocks = true } = {}) {
  const inv = new Proxy({}, { get: () => (passLocks ? 1 : 0) });
  const flags = newFlags();
  const key = (x, y) => `${x},${y}`;
  const dist = new Map([[key(...from), 0]]);
  const q = [from];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === to[0] && y === to[1]) return dist.get(key(x, y));
    for (let d = 0; d < 4; d++) {
      const r = tryMove(floor, { ...flags, opened: { ...flags.opened }, unlocked: {} }, inv, x, y, d);
      if (!r.ok) continue;
      const a = arrive(floor, flags, r.x, r.y);
      const k = key(a.x, a.y);
      if (!dist.has(k)) { dist.set(k, dist.get(key(x, y)) + 1); q.push([a.x, a.y]); }
    }
  }
  return Infinity;
}

