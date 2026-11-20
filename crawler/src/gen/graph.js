// Graph helpers over a parsed floor, built from the real movement rules (tryMove + arrive). Pure.
// Cells are indexed i = y * w + x. Used by the generator, metrics and the walk simulation.
import { DX, DY, cellAt, edgeAt } from '../world/floor.js';
import { tryMove, arrive, newFlags } from '../world/move.js';

export const cellIndex = (floor, x, y) => y * floor.w + x;
export const cellXY = (floor, i) => [i % floor.w, Math.floor(i / floor.w)];

// An inventory that holds every key (locks count as passable).
export const ALL_KEYS = new Proxy({}, { get: () => 1 });

export function cloneFlags(f) {
  return { opened: { ...f.opened }, unlocked: { ...f.unlocked }, chests: { ...f.chests } };
}

// Flags with every shortcut on the floor opened.
export function allShortcutsOpen(floor) {
  const f = newFlags();
  for (const e of [...floor.hEdges, ...floor.vEdges]) if (e.type === 'shortcut') f.opened[e.id] = true;
  return f;
}

// One step from (x, y) going d: where you end up after warps/launchers, or null if blocked.
export function stepFrom(floor, flags, inv, x, y, d) {
  const f = cloneFlags(flags);
  const r = tryMove(floor, f, inv, x, y, d);
  if (!r.ok) return null;
  const a = arrive(floor, f, r.x, r.y);
  return { x: a.x, y: a.y, via: [r.x, r.y], moves: a.moves, opened: r.opened ? r.edge.id : null, warp: a.moves.some((m) => m.kind === 'warp') };
}

// Directed step graph: adj[i] = [{ to, dir, warp }] for every successful step from cell i.
export function stepGraph(floor, { flags = newFlags(), inv = ALL_KEYS } = {}) {
  const adj = floor.cells.map(() => []);
  for (const c of floor.cells) {
    if (c.solid) continue;
    for (let d = 0; d < 4; d++) {
      const s = stepFrom(floor, flags, inv, c.x, c.y, d);
      if (s) adj[cellIndex(floor, c.x, c.y)].push({ to: cellIndex(floor, s.x, s.y), dir: d, warp: s.warp });
    }
  }
  return adj;
}

export function reverseGraph(adj) {
  const radj = adj.map(() => []);
  adj.forEach((list, i) => list.forEach((e) => radj[e.to].push({ to: i, dir: e.dir, warp: e.warp })));
  return radj;
}

// Unit-cost BFS. Returns { dist: Int32Array (-1 = unreachable), prev: Int32Array, prevEdge: [] }.
export function bfs(adj, from) {
  const n = adj.length;
  const dist = new Int32Array(n).fill(-1);
  const prev = new Int32Array(n).fill(-1);
  const prevEdge = new Array(n).fill(null);
  const q = [from];
  dist[from] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    for (const e of adj[i]) {
      if (dist[e.to] >= 0) continue;
      dist[e.to] = dist[i] + 1;
      prev[e.to] = i;
      prevEdge[e.to] = e;
      q.push(e.to);
    }
  }
  return { dist, prev, prevEdge };
}

// The path from `from` to `to` as a list of steps [{ from, to, dir, warp }] (null if unreachable).
export function pathSteps(adj, from, to) {
  const r = bfs(adj, from);
  if (r.dist[to] < 0) return null;
  const steps = [];
  for (let i = to; i !== from; i = r.prev[i]) steps.push({ from: r.prev[i], to: i, dir: r.prevEdge[i].dir, warp: r.prevEdge[i].warp });
  return steps.reverse();
}

// The cells that end a floor run: the up stairs, else the boss; and the cells you arrive on: the down stairs.
export function goalCell(floor) {
  return floor.cells.find((c) => c.feature?.type === 'stairs' && c.feature.dir === 'up')
    || floor.cells.find((c) => c.feature?.type === 'boss') || null;
}
export function downCell(floor) {
  return floor.cells.find((c) => c.feature?.type === 'stairs' && c.feature.dir === 'down')
    || floor.cells.find((c) => c.feature?.type === 'exit') || null;
}

// Undirected structural graph: every non-wall edge between two open cells, plus one link per warp pair.
// Returns { nbrs: [[{ to, eid }]], edges: [[a, b]], nodes: [i] }.
export function structure(floor) {
  const nbrs = floor.cells.map(() => []);
  const edges = [];
  const add = (a, b) => {
    const eid = edges.length;
    edges.push([a, b]);
    nbrs[a].push({ to: b, eid });
    nbrs[b].push({ to: a, eid });
  };
  for (const c of floor.cells) {
    if (c.solid) continue;
    for (const d of [1, 2]) {
      const n = cellAt(floor, c.x + DX[d], c.y + DY[d]);
      if (!n || n.solid) continue;
      if (edgeAt(floor, c.x, c.y, d).type === 'wall') continue;
      add(cellIndex(floor, c.x, c.y), cellIndex(floor, n.x, n.y));
    }
  }
  const seen = new Set();
  for (const c of floor.cells) {
    const f = c.feature;
    if (f?.type !== 'warp' || seen.has(f.id)) continue;
    seen.add(f.id);
    const other = floor.cells.find((o) => o !== c && o.feature?.type === 'warp' && o.feature.id === f.id);
    if (other) add(cellIndex(floor, c.x, c.y), cellIndex(floor, other.x, other.y));
  }
  const nodes = floor.cells.filter((c) => !c.solid).map((c) => cellIndex(floor, c.x, c.y));
  return { nbrs, edges, nodes };
}

// Bridges of an undirected multigraph (edge ids). Iterative Tarjan.
export function bridges(nbrs, nodes) {
  const n = nbrs.length;
  const disc = new Int32Array(n).fill(-1);
  const low = new Int32Array(n);
  const out = new Set();
  let t = 0;
  for (const root of nodes) {
    if (disc[root] >= 0) continue;
    const stack = [[root, -1, 0]];
    disc[root] = low[root] = t++;
    while (stack.length) {
      const top = stack[stack.length - 1];
      const [v, pe] = top;
      if (top[2] < nbrs[v].length) {
        const { to, eid } = nbrs[v][top[2]++];
        if (eid === pe) continue;
        if (disc[to] < 0) {
          disc[to] = low[to] = t++;
          stack.push([to, eid, 0]);
        } else low[v] = Math.min(low[v], disc[to]);
      } else {
        stack.pop();
        if (stack.length) {
          const p = stack[stack.length - 1][0];
          low[p] = Math.min(low[p], low[v]);
          if (low[v] > disc[p]) out.add(pe);
        }
      }
    }
  }
  return out;
}
