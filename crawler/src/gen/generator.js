// Seeded floor generator: a design tool that drafts candidate floors in the floor source format (world/README.md).
// Pure (no DOM). generateFloor(spec, seed) -> floor source object that always passes validateFloor(parseFloor(src)).
//
// Pipeline (one attempt; a failed attempt retries with the next sub-seed):
//   boss room + antechamber (boss floors) -> launcher lanes -> rooms -> maze over the rest (thin walls, growing tree)
//   -> room doors -> join components -> prune some dead ends to rock -> stairs far apart -> lock / warp cuts on the
//   D->U route -> loops (within each cut section) -> dark zone -> one-way doors -> launchers -> extra doors
//   -> shortcuts (barred from the far side, greedy by route saving) -> chests (key first) -> areas -> emit + validate.
import { makeRng } from '../core/rng.js';
import { parseFloor } from '../world/floor.js';
import { ITEMS } from '../data/items.js';
import { validateFloor, shortestPath } from './validate.js';
import { stepGraph, reverseGraph, bfs, allShortcutsOpen } from './graph.js';
import { floorLoops, floorDeadEnds } from './metrics.js';

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const ARROW = ['^', '>', 'v', '<'];
const SHORTCUT = ['n', 'e', 's', 'w'];
const CHEST_LETTERS = ['a', 'b', 'c', 'f', 'g', 'i', 'j', 'm', 'o', 'p', 'q', 't', 'u', 'y', 'z'];
const PALETTE = ['#5a6d8a', '#8f7d58', '#5f8a6a', '#8f5f6c', '#6f6a92', '#6b8a8a', '#8a6f52', '#7d8a5a'];
// Placeholder loot by depth (ids from data/items.js; hand-tune later).
const LOOT = [
  [1, ['medicine', 2], ['medicine', 1], ['mana_drop', 1], ['fire_shard', 1], ['ice_shard', 1], ['bolt_shard', 1],
    ['wind_shard', 1], ['ward_incense', 1], ['exit_charm', 1]],
  [3, ['salve', 1], ['revival_bead', 1], ['holy_shard', 1], ['dusk_shard', 1], ['mana_drop', 2]],
  [5, ['balm', 1], ['mana_vial', 1], ['salve', 2], ['revival_bead', 1]],
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function normalizeSpec(spec) {
  const w = clamp(spec.w ?? 10, 10, 20);
  const h = clamp(spec.h ?? w, 10, 20);
  const g = new Set(spec.gimmicks || ['door']);
  return {
    id: spec.id || 'gen',
    name: spec.name || spec.id || 'Generated',
    depth: spec.depth ?? 1,
    w, h, g,
    shortcuts: spec.shortcuts ?? 1,
    chests: spec.chests ?? 3,
    loops: spec.loops ?? 1,
    deadEnds: spec.deadEnds ?? 2,
    boss: !!spec.boss,
    keys: spec.keys || ['brass_key'],
    oneways: g.has('oneway') ? (spec.oneways ?? 2) : 0,
    warpPairs: g.has('warp') ? (spec.warpPairs ?? 1) : 0,
    lanes: g.has('launch') ? (spec.lanes ?? 1) : 0,
    dark: g.has('dark'),
    minPath: Math.ceil((1.5 * (w + h)) / 2),
    minManhattan: Math.ceil((w + h) / 2),
    encounters: spec.encounters,
    color: spec.color || '#6b6f78',
  };
}

// The stairs-distance rule every generated floor meets.
export function stairsRule(spec) {
  const s = normalizeSpec(spec);
  return { minPath: s.minPath, minManhattan: s.minManhattan };
}

export function generateFloor(spec, seed = 1) {
  const s = normalizeSpec(spec);
  const fails = {};
  for (let attempt = 0; attempt < 150; attempt++) {
    const rng = makeRng((Math.imul(seed >>> 0, 2654435761) + Math.imul(attempt + 1, 40503) + 0x9e3779b9) >>> 0);
    const out = attemptFloor(s, rng);
    if (out.src) {
      out.src.gen = { seed, attempt, gimmicks: [...s.g] };
      return out.src;
    }
    fails[out.fail] = (fails[out.fail] || 0) + 1;
  }
  throw new Error(`${s.id}: no valid floor for seed ${seed} (${JSON.stringify(fails)})`);
}

// ---------------------------------------------------------------------------------------------------------------
// Draft: cells with chars + kinds, edges with abstract values
// edge values: 'wall' | 'open' | 'door' | 'ow<dir>' (one-way, passable travelling dir) | 'sc<dir>' (shortcut,
// opens travelling dir) | 'lock:<char>'.  kinds: corr | room | lane | boss | ante | rock.

class Draft {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.n = w * h;
    this.ch = new Array(this.n).fill('.');
    this.kind = new Array(this.n).fill('corr');
    this.prot = new Uint8Array(this.n); // never pruned to rock / never given a feature
    this.hE = new Array((h + 1) * w).fill('wall');
    this.vE = new Array(h * (w + 1)).fill('wall');
    this.rooms = [];
    this.lanes = [];
    this.dark = [];
    this.legend = {};
    this.locks = {};
  }

  x(i) { return i % this.w; }
  y(i) { return Math.floor(i / this.w); }
  at(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? y * this.w + x : -1; }
  nb(i, d) { return this.at(this.x(i) + DX[d], this.y(i) + DY[d]); }
  slot(i, d) {
    const x = this.x(i);
    const y = this.y(i);
    switch (d) {
      case 0: return [this.hE, y * this.w + x];
      case 2: return [this.hE, (y + 1) * this.w + x];
      case 3: return [this.vE, y * (this.w + 1) + x];
      default: return [this.vE, y * (this.w + 1) + x + 1];
    }
  }
  e(i, d) { const [a, k] = this.slot(i, d); return a[k]; }
  setE(i, d, v) { const [a, k] = this.slot(i, d); a[k] = v; }
  rock(i) { return this.kind[i] === 'rock'; }
  // Base passability (undirected): any non-wall edge between two open cells.
  link(i, d) {
    const j = this.nb(i, d);
    return j >= 0 && !this.rock(i) && !this.rock(j) && this.e(i, d) !== 'wall' ? j : -1;
  }
  degree(i) {
    let k = 0;
    for (let d = 0; d < 4; d++) if (this.link(i, d) >= 0) k++;
    return k;
  }
  plain(i) { return this.ch[i] === '.' && !this.prot[i]; }
  man(a, b) { return Math.abs(this.x(a) - this.x(b)) + Math.abs(this.y(a) - this.y(b)); }
  inDark(i) {
    const x = this.x(i);
    const y = this.y(i);
    return this.dark.some((r) => x >= r[0] && y >= r[1] && x <= r[2] && y <= r[3]);
  }
  makeRock(i) {
    for (let d = 0; d < 4; d++) this.setE(i, d, 'wall');
    this.kind[i] = 'rock';
    this.ch[i] = '#';
  }
}

// Undirected neighbour lists of the draft (warp pairs linked), optionally skipping edges by predicate.
function baseAdj(dr, skip = null) {
  const adj = Array.from({ length: dr.n }, () => []);
  for (let i = 0; i < dr.n; i++) {
    if (dr.rock(i)) continue;
    for (let d = 0; d < 4; d++) {
      const j = dr.link(i, d);
      if (j >= 0 && !(skip && skip(i, d))) adj[i].push(j);
    }
  }
  const warps = {};
  for (let i = 0; i < dr.n; i++) if (/[1-9]/.test(dr.ch[i])) (warps[dr.ch[i]] ||= []).push(i);
  for (const list of Object.values(warps)) {
    if (list.length === 2) { adj[list[0]].push(list[1]); adj[list[1]].push(list[0]); }
  }
  return adj;
}

function bfsU(adj, from) {
  const dist = new Int32Array(adj.length).fill(-1);
  const prev = new Int32Array(adj.length).fill(-1);
  const q = [from];
  dist[from] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    for (const j of adj[i]) if (dist[j] < 0) { dist[j] = dist[i] + 1; prev[j] = i; q.push(j); }
  }
  return { dist, prev };
}

function pathCells(prev, from, to) {
  const out = [];
  for (let i = to; i >= 0; i = prev[i]) { out.push(i); if (i === from) break; }
  return out.reverse();
}

function dirBetween(dr, a, b) {
  for (let d = 0; d < 4; d++) if (dr.nb(a, d) === b) return d;
  return -1;
}

function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// ---------------------------------------------------------------------------------------------------------------

function attemptFloor(s, rng) {
  const dr = new Draft(s.w, s.h);
  if (s.boss) placeBoss(dr, rng);
  for (let k = 0; k < s.lanes; k++) placeLane(dr, rng);
  placeRooms(dr, rng);
  carveMaze(dr, rng);
  connectRooms(dr, rng, s);
  connectAll(dr, rng);
  sparsify(dr, rng, s);
  const st = placeStairs(dr, rng, s);
  if (!st) return { fail: 'stairs' };
  if (!placeStart(dr, st)) return { fail: 'start' };
  const rank = placeCuts(dr, rng, s, st);
  if (!rank) return { fail: 'cuts' };
  addLoops(dr, rng, s, st, rank);
  if (s.dark) placeDark(dr, rng, s, st);
  placeOneways(dr, rng, s, st, rank);
  placeLaunchers(dr, s, st);
  if (s.g.has('door')) addDoors(dr, rng);
  if (!placeShortcuts(dr, rng, s, st, rank)) return { fail: 'shortcuts' };
  if (!placeChests(dr, rng, s, st, rank)) return { fail: 'chests' };
  const src = emit(dr, s, st, makeAreas(dr, rng, s));
  return finalCheck(src, s, st, dr);
}

// Boss room (3x3 in a corner, B in the middle) behind a door, with a 3-cell antechamber: ! (at the door), H, R.
function placeBoss(dr, rng) {
  const { w, h } = dr;
  const right = rng() < 0.5;
  const bottom = rng() < 0.5;
  const x0 = right ? w - 3 : 0;
  const y0 = bottom ? h - 3 : 0;
  for (let y = y0; y < y0 + 3; y++) {
    for (let x = x0; x < x0 + 3; x++) {
      const i = dr.at(x, y);
      dr.kind[i] = 'boss';
      dr.prot[i] = 1;
      if (x < x0 + 2) dr.setE(i, 1, 'open');
      if (y < y0 + 2) dr.setE(i, 2, 'open');
    }
  }
  dr.ch[dr.at(x0 + 1, y0 + 1)] = 'B';
  const horiz = rng() < 0.5;
  const dir = horiz ? (right ? 3 : 1) : (bottom ? 0 : 2);
  let c = horiz ? dr.at(right ? x0 : x0 + 2, y0 + 1) : dr.at(x0 + 1, bottom ? y0 : y0 + 2);
  dr.setE(c, dir, 'door');
  const ante = [];
  for (const ch of ['!', 'H', 'R']) {
    c = dr.nb(c, dir);
    dr.kind[c] = 'ante';
    dr.prot[c] = 1;
    dr.ch[c] = ch;
    dr.setE(c, dir, 'open');
    ante.push(c);
  }
  const entry = dr.nb(c, dir);
  dr.prot[entry] = 1;
  dr.boss = { rect: [x0, y0, x0 + 2, y0 + 2], ante, entry, dir };
}

// A straight 1-wide lane (4-7 cells) for a launcher: open behind its first cell, a door after its last.
function placeLane(dr, rng) {
  for (let t = 0; t < 80; t++) {
    const horiz = rng() < 0.5;
    const dim = horiz ? dr.w : dr.h;
    const L = rng.int(4, Math.min(7, dim - 4));
    const dir = horiz ? (rng() < 0.5 ? 1 : 3) : (rng() < 0.5 ? 2 : 0);
    const x0 = rng.int(0, dr.w - 1);
    const y0 = rng.int(0, dr.h - 1);
    const start = dr.at(x0, y0);
    const cells = [];
    let c = dr.nb(start, (dir + 2) % 4); // P, the cell behind
    if (c < 0) continue;
    const P = c;
    let ok = true;
    for (let k = 0; k <= L && ok; k++) {
      c = dr.nb(c, dir);
      if (c < 0) ok = false;
      else if (k < L) cells.push(c);
    }
    if (!ok) continue;
    const Q = c;
    const all = [P, ...cells, Q];
    if (all.some((i) => dr.kind[i] !== 'corr' || dr.prot[i])) continue;
    // Keep a free ring around the lane cells.
    const clear = cells.every((i) => [0, 1, 2, 3].every((d) => { const j = dr.nb(i, d); return j < 0 || dr.kind[j] === 'corr'; }));
    if (!clear) continue;
    cells.forEach((i, k) => { dr.kind[i] = 'lane'; dr.prot[i] = 1; if (k < L - 1) dr.setE(i, dir, 'open'); });
    dr.setE(P, dir, 'open');
    dr.setE(cells[L - 1], dir, 'door');
    dr.prot[P] = 1;
    dr.prot[Q] = 1;
    dr.lanes.push({ cells, dir, P, Q });
    return true;
  }
  return false;
}

function placeRooms(dr, rng) {
  const target = Math.round((dr.w * dr.h) / 40) + rng.int(0, 2);
  const maxR = dr.w >= 16 ? 5 : 4;
  for (let t = 0; t < 400 && dr.rooms.length < target; t++) {
    const rw = rng.int(2, maxR);
    const rh = rng.int(2, maxR);
    if (rw * rh > 16) continue;
    const x0 = rng.int(0, dr.w - rw);
    const y0 = rng.int(0, dr.h - rh);
    let ok = true;
    for (let y = y0 - 1; y <= y0 + rh && ok; y++) {
      for (let x = x0 - 1; x <= x0 + rw && ok; x++) {
        const i = dr.at(x, y);
        if (i < 0) continue;
        const inside = x >= x0 && y >= y0 && x < x0 + rw && y < y0 + rh;
        if (dr.kind[i] !== 'corr' || (inside && dr.prot[i])) ok = false;
      }
    }
    if (!ok) continue;
    const id = dr.rooms.length;
    for (let y = y0; y < y0 + rh; y++) {
      for (let x = x0; x < x0 + rw; x++) {
        const i = dr.at(x, y);
        dr.kind[i] = 'room';
        if (x < x0 + rw - 1) dr.setE(i, 1, 'open');
        if (y < y0 + rh - 1) dr.setE(i, 2, 'open');
      }
    }
    dr.rooms.push({ id, rect: [x0, y0, x0 + rw - 1, y0 + rh - 1] });
  }
}

// Growing-tree maze over the corridor cells: mostly newest-first (winding corridors), sometimes random (branches).
function carveMaze(dr, rng) {
  const vis = new Uint8Array(dr.n);
  const last = new Int8Array(dr.n).fill(-1);
  const corr = [];
  for (let i = 0; i < dr.n; i++) if (dr.kind[i] === 'corr') corr.push(i);
  if (!corr.length) return;
  const active = [];
  const newest = 0.85;
  const straight = 0.3;
  let next = 0;
  const root = rng.pick(corr);
  vis[root] = 1;
  active.push(root);
  for (;;) {
    while (active.length) {
      const ai = rng() < newest ? active.length - 1 : rng.int(0, active.length - 1);
      const c = active[ai];
      const opts = [0, 1, 2, 3].filter((d) => { const j = dr.nb(c, d); return j >= 0 && dr.kind[j] === 'corr' && !vis[j]; });
      if (!opts.length) { active.splice(ai, 1); continue; }
      const d = last[c] >= 0 && opts.includes(last[c]) && rng() < straight ? last[c] : rng.pick(opts);
      const j = dr.nb(c, d);
      dr.setE(c, d, 'open');
      vis[j] = 1;
      last[j] = d;
      active.push(j);
    }
    while (next < corr.length && vis[corr[next]]) next++;
    if (next >= corr.length) break;
    vis[corr[next]] = 1; // a pocket walled in by rooms: its own tree, joined later
    active.push(corr[next]);
  }
}

function connectRooms(dr, rng, s) {
  for (const room of dr.rooms) {
    const [x0, y0, x1, y1] = room.rect;
    const bySide = [[], [], [], []];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = dr.at(x, y);
        for (let d = 0; d < 4; d++) {
          const j = dr.nb(i, d);
          if (j >= 0 && dr.kind[j] === 'corr') bySide[d].push(i);
        }
      }
    }
    const sides = shuffle(rng, [0, 1, 2, 3].filter((d) => bySide[d].length));
    const k = Math.min(sides.length, rng.pick([1, 1, 2, 2, 2, 3]));
    for (let t = 0; t < k; t++) {
      const d = sides[t];
      const i = rng.pick(bySide[d]);
      dr.setE(i, d, s.g.has('door') && rng() < 0.75 ? 'door' : 'open');
    }
  }
}

function components(dr) {
  const comp = new Int32Array(dr.n).fill(-1);
  let k = 0;
  for (let i = 0; i < dr.n; i++) {
    if (dr.rock(i) || comp[i] >= 0) continue;
    const q = [i];
    comp[i] = k;
    for (let h = 0; h < q.length; h++) {
      for (let d = 0; d < 4; d++) {
        const j = dr.link(q[h], d);
        if (j >= 0 && comp[j] < 0) { comp[j] = k; q.push(j); }
      }
    }
    k++;
  }
  return { comp, count: k };
}

// Join every component into one by opening walls between them (never into the boss complex or a lane).
function connectAll(dr, rng) {
  for (let guard = 0; guard < 200; guard++) {
    const { comp, count } = components(dr);
    if (count <= 1) return;
    const cands = [];
    for (let i = 0; i < dr.n; i++) {
      if (dr.rock(i) || !['corr', 'room'].includes(dr.kind[i])) continue;
      for (const d of [1, 2]) {
        const j = dr.nb(i, d);
        if (j < 0 || dr.rock(j) || !['corr', 'room'].includes(dr.kind[j]) || comp[i] === comp[j]) continue;
        if (dr.e(i, d) !== 'wall') continue;
        cands.push([i, d, dr.kind[i] === 'room' || dr.kind[j] === 'room']);
      }
    }
    if (!cands.length) return;
    const corrOnly = cands.filter((c) => !c[2]);
    const [i, d, roomy] = rng.pick(corrOnly.length && rng() < 0.7 ? corrOnly : cands);
    dr.setE(i, d, roomy ? 'door' : 'open');
  }
}

// Prune some corridor dead ends to rock (gives the floor a shape), keeping enough dead ends for treasure.
function sparsify(dr, rng, s) {
  let corr = 0;
  for (let i = 0; i < dr.n; i++) if (dr.kind[i] === 'corr') corr++;
  let budget = Math.round(corr * (0.06 + rng() * 0.16));
  const need = s.deadEnds + s.chests + 2 * s.warpPairs + 4;
  while (budget-- > 0) {
    const ends = [];
    for (let i = 0; i < dr.n; i++) if (dr.kind[i] === 'corr' && !dr.prot[i] && dr.degree(i) === 1) ends.push(i);
    let pool = ends;
    if (ends.length <= need) {
      // Only prune leaves whose removal leaves a new dead end behind (keeps the count).
      pool = ends.filter((i) => {
        for (let d = 0; d < 4; d++) { const j = dr.link(i, d); if (j >= 0) return dr.degree(j) === 2 && dr.kind[j] === 'corr'; }
        return false;
      });
    }
    if (!pool.length) break;
    dr.makeRock(rng.pick(pool));
  }
}

function placeStairs(dr, rng, s) {
  const adj = baseAdj(dr);
  const ok = (i) => dr.kind[i] === 'corr' && dr.plain(i);
  const cands = [];
  for (let i = 0; i < dr.n; i++) if (ok(i)) cands.push(i);
  if (cands.length < 2) return null;
  const deg1 = cands.filter((i) => dr.degree(i) === 1);
  let best = null;
  if (s.boss) {
    const g = dr.ch.indexOf('B');
    const { dist } = bfsU(adj, g);
    for (const i of cands) {
      if (dist[i] < 0) continue;
      const sc = dist[i] + 0.5 * dr.man(i, g) + (dr.degree(i) === 1 ? 3 : 0) + rng() * 4;
      if (!best || sc > best.sc) best = { D: i, G: g, sc, path: dist[i] };
    }
  } else {
    const pool = deg1.length >= 4 ? deg1 : cands;
    for (let t = 0; t < 14; t++) {
      const a = rng.pick(pool);
      const { dist } = bfsU(adj, a);
      for (const b of cands) {
        if (b === a || dist[b] < 0) continue;
        const sc = dist[b] + 0.5 * dr.man(a, b) + (dr.degree(b) === 1 ? 3 : 0) + rng() * 4;
        if (!best || sc > best.sc) best = rng() < 0.5 ? { D: a, G: b, sc, path: dist[b] } : { D: b, G: a, sc, path: dist[b] };
      }
    }
  }
  if (!best || best.path < s.minPath + 2 || dr.man(best.D, best.G) < s.minManhattan) return null;
  dr.ch[best.D] = 'D';
  if (!s.boss) dr.ch[best.G] = 'U';
  dr.prot[best.D] = 1;
  dr.prot[best.G] = 1;
  return { D: best.D, G: best.G };
}

// Start: a plain cell next to the down stairs, facing away from them if that way is open.
function placeStart(dr, st) {
  let best = null;
  for (let d = 0; d < 4; d++) {
    const j = dr.link(st.D, d);
    if (j < 0 || dr.ch[j] !== '.' || dr.prot[j] || !['corr', 'room'].includes(dr.kind[j])) continue;
    if (!['open', 'door'].includes(dr.e(st.D, d))) continue;
    const sc = (dr.e(st.D, d) === 'open' ? 2 : 0) + dr.degree(j);
    if (!best || sc > best.sc) best = { j, d, sc };
  }
  if (!best) return false;
  const { j, d } = best;
  let face = d;
  if (dr.link(j, d) < 0) face = [(d + 1) % 4, (d + 3) % 4].find((f) => dr.link(j, f) >= 0) ?? d;
  dr.prot[j] = 1;
  st.start = j;
  st.face = face;
  return true;
}

// Lock and warp cuts: bridges on the D->goal route. Returns rank per cell (0 = D's section, then 1, 2 past each
// cut) or null. The lock edge becomes 'lock:L'; the warp cut becomes a wall bridged by warp pair 1.
function placeCuts(dr, rng, s, st) {
  const lockOn = s.g.has('lock');
  const warpOn = s.warpPairs > 0;
  const rank = new Int8Array(dr.n);
  if (!lockOn && !warpOn) return rank;
  const { prev } = bfsU(baseAdj(dr), st.D);
  const path = pathCells(prev, st.D, st.G);
  if (path[0] !== st.D) return null;
  const br = draftBridges(dr);
  const n = path.length - 1;
  const cuttable = (k) => {
    const a = path[k];
    const b = path[k + 1];
    const d = dirBetween(dr, a, b);
    if (d < 0 || !br.has(edgeKey(dr, a, d))) return false;
    if (![a, b].every((i) => ['corr', 'room'].includes(dr.kind[i]) && !dr.prot[i])) return false;
    return ['open', 'door'].includes(dr.e(a, d));
  };
  const pickK = (lo, hi) => {
    const ks = [];
    for (let k = Math.max(1, Math.floor(lo)); k <= Math.min(n - 2, Math.floor(hi)); k++) if (cuttable(k)) ks.push(k);
    return ks.length ? rng.pick(ks) : -1;
  };
  let lockK = -1;
  if (lockOn) {
    lockK = pickK(0.5 * n, 0.8 * n);
    if (lockK < 0) return null;
  }
  let warpK = -1;
  if (warpOn) {
    warpK = pickK(0.22 * n, lockOn ? lockK - 3 : 0.55 * n);
    if (warpK < 0) return null;
  }
  const cutAt = (k) => [path[k], dirBetween(dr, path[k], path[k + 1]), path[k + 1]];
  let lockEdge = null;
  if (lockOn) {
    lockEdge = cutAt(lockK);
    dr.setE(lockEdge[0], lockEdge[1], 'lock:L');
    dr.locks.L = s.keys[0];
  }
  let warpEdge = null;
  if (warpOn) {
    warpEdge = cutAt(warpK);
    dr.setE(warpEdge[0], warpEdge[1], 'wall');
  }
  // Sections: components without the lock edge (the warp cut is already a wall).
  const comp = new Int32Array(dr.n).fill(-1);
  let k = 0;
  for (let i = 0; i < dr.n; i++) {
    if (dr.rock(i) || comp[i] >= 0) continue;
    const q = [i];
    comp[i] = k;
    for (let h = 0; h < q.length; h++) {
      for (let d = 0; d < 4; d++) {
        const j = dr.link(q[h], d);
        if (j >= 0 && comp[j] < 0 && !dr.e(q[h], d).startsWith('lock')) { comp[j] = k; q.push(j); }
      }
    }
    k++;
  }
  const rankOf = new Map([[comp[st.D], 0]]);
  if (warpEdge) rankOf.set(comp[warpEdge[2]], 1);
  if (lockEdge) rankOf.set(comp[lockEdge[2]], warpEdge ? 2 : 1);
  if (rankOf.size !== 1 + (warpEdge ? 1 : 0) + (lockEdge ? 1 : 0)) return null;
  for (let i = 0; i < dr.n; i++) rank[i] = dr.rock(i) ? 0 : (rankOf.get(comp[i]) ?? 0);
  st.lockRank = lockEdge ? rank[lockEdge[2]] : 99;
  if (warpEdge) {
    // Warp pair 1: a dead end deep in D's section -> a dead end in the next section.
    const adj = baseAdj(dr);
    const dD = bfsU(adj, st.D).dist;
    const ends = (r) => {
      const out = [];
      for (let i = 0; i < dr.n; i++) {
        if (rank[i] === r && dr.kind[i] === 'corr' && dr.plain(i) && dr.degree(i) === 1) out.push(i);
      }
      return out;
    };
    const a = ends(0).filter((i) => dD[i] >= 4).sort((p, q) => dD[q] - dD[p]);
    const exitCell = lockEdge ? lockEdge[0] : st.G;
    const dExit = bfsU(adj, exitCell).dist;
    const b = ends(1).filter((i) => dExit[i] >= 3).sort((p, q) => dExit[q] - dExit[p]);
    if (!a.length || !b.length) return null;
    const A = a[rng.int(0, Math.max(0, Math.ceil(a.length * 0.4) - 1))];
    const B = b[rng.int(0, Math.max(0, Math.ceil(b.length * 0.5) - 1))];
    dr.ch[A] = '1';
    dr.ch[B] = '1';
    // Extra pairs: two far-apart dead ends in the same section (a teleport loop).
    for (let p = 2; p <= s.warpPairs; p++) {
      const r = rng.int(0, warpEdge && lockEdge ? 2 : 1);
      const pool = ends(r);
      if (pool.length < 2) continue;
      const x = rng.pick(pool);
      const dx = bfsU(baseAdj(dr), x).dist;
      const far = pool.filter((y) => y !== x && dx[y] >= 8);
      if (!far.length) continue;
      const y = rng.pick(far);
      dr.ch[x] = String(p);
      dr.ch[y] = String(p);
    }
  }
  return rank;
}

const edgeKey = (dr, i, d) => {
  const [arr, k] = dr.slot(i, d);
  return `${arr === dr.hE ? 'h' : 'v'}${k}`;
};

// Bridges of the draft's base graph, as edge keys.
function draftBridges(dr) {
  const disc = new Int32Array(dr.n).fill(-1);
  const low = new Int32Array(dr.n);
  const out = new Set();
  let t = 0;
  for (let root = 0; root < dr.n; root++) {
    if (dr.rock(root) || disc[root] >= 0) continue;
    const stack = [[root, -1, 0]];
    disc[root] = low[root] = t++;
    while (stack.length) {
      const top = stack[stack.length - 1];
      const v = top[0];
      if (top[2] < 4) {
        const d = top[2]++;
        const j = dr.link(v, d);
        if (j < 0 || d === top[1]) continue;
        if (disc[j] < 0) { disc[j] = low[j] = t++; stack.push([j, (d + 2) % 4, 0]); } else low[v] = Math.min(low[v], disc[j]);
      } else {
        stack.pop();
        if (stack.length) {
          const p = stack[stack.length - 1][0];
          low[p] = Math.min(low[p], low[v]);
          if (low[v] > disc[p]) out.add(edgeKey(dr, v, top[1]));
        }
      }
    }
  }
  return out;
}

// Non-trivial loops of the draft: cyclomatic number minus open 2x2 blocks (room interiors).
function draftLoops(dr) {
  let E = 0;
  let N = 0;
  for (let i = 0; i < dr.n; i++) {
    if (dr.rock(i)) continue;
    N++;
    for (const d of [1, 2]) if (dr.link(i, d) >= 0) E++;
  }
  const warps = {};
  for (let i = 0; i < dr.n; i++) if (/[1-9]/.test(dr.ch[i])) warps[dr.ch[i]] = (warps[dr.ch[i]] || 0) + 1;
  E += Object.values(warps).filter((c) => c === 2).length;
  // Components with warp links: count via union over baseAdj.
  const adj = baseAdj(dr);
  const seen = new Uint8Array(dr.n);
  let C = 0;
  for (let i = 0; i < dr.n; i++) {
    if (dr.rock(i) || seen[i]) continue;
    C++;
    const q = [i];
    seen[i] = 1;
    for (let h = 0; h < q.length; h++) for (const j of adj[q[h]]) if (!seen[j]) { seen[j] = 1; q.push(j); }
  }
  let sq = 0;
  for (let y = 0; y < dr.h - 1; y++) {
    for (let x = 0; x < dr.w - 1; x++) {
      const a = dr.at(x, y);
      const b = dr.at(x + 1, y);
      const c = dr.at(x, y + 1);
      if (dr.link(a, 1) >= 0 && dr.link(a, 2) >= 0 && dr.link(b, 2) >= 0 && dr.link(c, 1) >= 0) sq++;
    }
  }
  return E - N + C - sq;
}

// Loops: open walls between far-apart cells of the same section that don't shorten the route much.
function addLoops(dr, rng, s, st, rank) {
  const target = s.loops + rng.int(0, 2);
  const okCell = (i) => ['corr', 'room'].includes(dr.kind[i]) && dr.ch[i] === '.';
  for (let guard = 0; guard < 30 && draftLoops(dr) < target; guard++) {
    const adj = baseAdj(dr);
    const dD = bfsU(adj, st.D);
    const dG = bfsU(adj, st.G).dist;
    const cur = dD.dist[st.G];
    const main = new Set(pathCells(dD.prev, st.D, st.G));
    const toMain = multiBfs(adj, [...main]);
    const cands = [];
    for (let i = 0; i < dr.n; i++) {
      if (dr.rock(i) || !okCell(i)) continue;
      for (const d of [1, 2]) {
        const j = dr.nb(i, d);
        if (j < 0 || dr.rock(j) || !okCell(j) || rank[i] !== rank[j] || dr.e(i, d) !== 'wall') continue;
        cands.push([i, d, j]);
      }
    }
    shuffle(rng, cands);
    let best = null;
    for (const [i, d, j] of cands.slice(0, 50)) {
      const cyc = bfsU(adj, i).dist[j];
      if (cyc < 5) continue;
      const np = Math.min(cur, dD.dist[i] + 1 + dG[j], dD.dist[j] + 1 + dG[i]);
      if (np < s.minPath + 2) continue;
      const sc = Math.min(cyc, 18) - 2.5 * (cur - np) + (Math.min(toMain[i], toMain[j]) <= 1 ? 4 : 0) + rng() * 3;
      if (!best || sc > best.sc) best = { i, d, sc };
    }
    if (!best) break;
    dr.setE(best.i, best.d, s.g.has('door') && rng() < 0.3 ? 'door' : 'open');
  }
}

function multiBfs(adj, sources) {
  const dist = new Int32Array(adj.length).fill(1e6);
  const q = [...sources];
  for (const i of sources) dist[i] = 0;
  for (let h = 0; h < q.length; h++) for (const j of adj[q[h]]) if (dist[j] > dist[q[h]] + 1) { dist[j] = dist[q[h]] + 1; q.push(j); }
  return dist;
}

// One dark rect over the middle of the route, preferably covering junctions.
function placeDark(dr, rng, s, st) {
  const adj = baseAdj(dr);
  const r = bfsU(adj, st.D);
  const path = pathCells(r.prev, st.D, st.G);
  const mid = new Set(path.slice(Math.floor(path.length * 0.25), Math.ceil(path.length * 0.8)));
  const big = s.w >= 16 ? 5 : 4;
  let best = null;
  for (let t = 0; t < 80; t++) {
    const dw = rng.int(3, big);
    const dh = rng.int(3, big);
    const x0 = rng.int(0, s.w - dw);
    const y0 = rng.int(0, s.h - dh);
    let bad = false;
    let open = 0;
    let onPath = 0;
    let junc = 0;
    for (let y = y0; y < y0 + dh && !bad; y++) {
      for (let x = x0; x < x0 + dw && !bad; x++) {
        const i = dr.at(x, y);
        if (dr.rock(i)) continue;
        if (dr.prot[i] || dr.ch[i] !== '.' || !['corr', 'room'].includes(dr.kind[i])) bad = true;
        if ([0, 1, 2, 3].some((d) => dr.e(i, d).startsWith('lock'))) bad = true; // no locked door in the dark
        open++;
        if (mid.has(i)) onPath++;
        if (dr.degree(i) >= 3) junc++;
      }
    }
    if (bad || onPath < 2 || open < dw * dh * 0.6) continue;
    const sc = onPath + 2 * junc + rng() * 3;
    if (!best || sc > best.sc) best = { rect: [x0, y0, x0 + dw - 1, y0 + dh - 1], sc };
  }
  if (best) dr.dark.push(best.rect);
}

// Build a parsed floor from the draft (start next to D) for checks with the real movement rules.
function draftFloor(dr, s, st) {
  return parseFloor(emit(dr, s, st, []));
}

// Every cell you can stand on from D can still reach D and the goal (keys assumed; shortcuts closed).
function safeAndPath(dr, s, st) {
  const floor = draftFloor(dr, s, st);
  const adj = stepGraph(floor);
  const fw = bfs(adj, st.D).dist;
  const radj = reverseGraph(adj);
  const toD = bfs(radj, st.D).dist;
  const toG = bfs(radj, st.G).dist;
  for (let i = 0; i < fw.length; i++) if (fw[i] >= 0 && (toD[i] < 0 || toG[i] < 0)) return { ok: false };
  return { ok: fw[st.G] >= 0, path: fw[st.G], floor, adj };
}

// One-way doors on loop edges (never bridges), half of them pointing back toward the down stairs.
function placeOneways(dr, rng, s, st, rank) {
  let placed = 0;
  const okCell = (i) => ['corr', 'room'].includes(dr.kind[i]) && dr.plain(i) && !dr.inDark(i);
  for (let tries = 0; tries < 40 && placed < s.oneways; tries++) {
    const br = draftBridges(dr);
    const adj = baseAdj(dr);
    const r = bfsU(adj, st.D);
    const main = pathCells(r.prev, st.D, st.G);
    const mainEdges = [];
    for (let k = 0; k + 1 < main.length; k++) {
      const d = dirBetween(dr, main[k], main[k + 1]);
      if (d >= 0) mainEdges.push([main[k], d]);
    }
    const all = [];
    for (let i = 0; i < dr.n; i++) {
      if (dr.rock(i)) continue;
      for (const d of [1, 2]) if (dr.link(i, d) >= 0) all.push([i, d]);
    }
    const pool = rng() < 0.5 ? mainEdges : all;
    const [i, d] = rng.pick(pool.length ? pool : all);
    const j = dr.nb(i, d);
    if (!okCell(i) || !okCell(j) || rank[i] !== rank[j] || br.has(edgeKey(dr, i, d))) continue;
    if (!['open', 'door'].includes(dr.e(i, d))) continue;
    // Toward D: from the cell farther from D into the nearer one.
    const towardD = rng() < 0.55;
    const [from, dir] = (r.dist[i] > r.dist[j]) === towardD ? [i, d] : [j, (d + 2) % 4];
    const old = dr.e(i, d);
    dr.setE(from, dir, `ow${dir}`);
    const c = safeAndPath(dr, s, st);
    if (!c.ok || c.path < s.minPath) { dr.setE(i, d, old); continue; }
    placed++;
  }
}

function placeLaunchers(dr, s, st) {
  for (const lane of dr.lanes) {
    const c = lane.cells[0];
    dr.ch[c] = ARROW[lane.dir];
    const r = safeAndPath(dr, s, st);
    if (!r.ok) dr.ch[c] = '.';
  }
}

function addDoors(dr, rng) {
  for (let i = 0; i < dr.n; i++) {
    if (dr.kind[i] !== 'corr' || dr.ch[i] !== '.') continue;
    for (const d of [1, 2]) {
      const j = dr.nb(i, d);
      if (j < 0 || dr.kind[j] !== 'corr' || dr.ch[j] !== '.' || dr.e(i, d) !== 'open') continue;
      if (rng() < 0.08) dr.setE(i, d, 'door');
    }
  }
}

// Shortcuts: a wall between a cell `a` on (or near) the route late in the floor and a cell `b` close to the down
// stairs becomes a barred door that opens travelling a -> b. Greedy by how much it cuts the D->goal route.
function placeShortcuts(dr, rng, s, st, rank) {
  const okCell = (i) => ['corr', 'room'].includes(dr.kind[i]) && dr.ch[i] === '.' && !dr.inDark(i) && i !== st.start;
  for (let k = 0; k < s.shortcuts; k++) {
    const floor = draftFloor(dr, s, st);
    const closed = stepGraph(floor);
    const rclosed = reverseGraph(closed);
    const d0D = bfs(closed, st.D).dist;
    const d0G = bfs(rclosed, st.G).dist;
    const first = d0D[st.G];
    const open = stepGraph(floor, { flags: allShortcutsOpen(floor) });
    const dD = bfs(open, st.D).dist;
    const dG = bfs(reverseGraph(open), st.G).dist;
    const cur = dD[st.G];
    const cands = [];
    for (let a = 0; a < dr.n; a++) {
      if (dr.rock(a) || !okCell(a) || d0D[a] < 0 || dG[a] < 0) continue;
      const detour = d0D[a] + d0G[a] - first;
      if (detour > 4) continue; // the far side sits on (or right next to) the first-trip route
      for (let d = 0; d < 4; d++) {
        const b = dr.nb(a, d);
        if (b < 0 || dr.rock(b) || !okCell(b) || dr.e(a, d) !== 'wall' || rank[a] < rank[b] || dD[b] < 0) continue;
        const saving = cur - (dD[b] + 1 + dG[a]);
        if (saving < (k === 0 ? 3 : 2)) continue;
        // Prefer a far side right on the route (you walk past the bar and lift it) over a big saving off it.
        cands.push({ a, d, sc: saving - 2 * detour + rng() * 1.5 });
      }
    }
    cands.sort((p, q) => q.sc - p.sc);
    let done = false;
    for (const c of cands.slice(0, 8)) {
      dr.setE(c.a, c.d, `sc${c.d}`);
      const r = safeAndPath(dr, s, st);
      if (r.ok && r.path === first) { done = true; break; }
      dr.setE(c.a, c.d, 'wall');
    }
    if (!done) return false;
  }
  return true;
}

function lootPool(depth) {
  const out = [];
  for (const [minDepth, ...items] of LOOT) if (depth >= minDepth) out.push(...items.filter(([id]) => ITEMS[id]));
  return out;
}

// Chests: key chest first (before its lock), then treasure in dead ends / side branches away from the route.
function placeChests(dr, rng, s, st, rank) {
  const floor = draftFloor(dr, s, st);
  const adj = baseAdj(dr);
  const closed = stepGraph(floor);
  const r = bfs(closed, st.D);
  const main = [];
  for (let i = st.G; i >= 0 && i !== st.D; i = r.prev[i]) main.push(i);
  main.push(st.D);
  const toMain = multiBfs(adj, main);
  const laneCells = new Set(dr.lanes.flatMap((l) => l.cells));
  const cands = [];
  for (let i = 0; i < dr.n; i++) {
    if (dr.rock(i) || !dr.plain(i) || !['corr', 'room'].includes(dr.kind[i]) || laneCells.has(i) || r.dist[i] < 0) continue;
    if (dr.man(i, st.D) <= 1) continue;
    const deg = dr.degree(i);
    cands.push({ i, sc: (deg === 1 ? 6 : 0) + Math.min(toMain[i], 6) + (dr.kind[i] === 'room' && deg <= 2 ? 1 : 0) });
  }
  const placed = [];
  const pick = (filter) => {
    for (const spacing of [3, 2, 0]) {
      let best = null;
      for (const c of cands) {
        if (!filter(c) || placed.includes(c.i) || placed.some((p) => dr.man(p, c.i) < spacing)) continue;
        const sc = c.sc + rng() * 2;
        if (!best || sc > best.sc) best = { i: c.i, sc };
      }
      if (best) { placed.push(best.i); return best.i; }
    }
    return -1;
  };
  if (s.g.has('lock')) {
    // The key: before its lock, off the route, never in the dark.
    let k = pick((c) => rank[c.i] < st.lockRank && toMain[c.i] >= 2 && !dr.inDark(c.i));
    if (k < 0) k = pick((c) => rank[c.i] < st.lockRank && !dr.inDark(c.i));
    if (k < 0) return false;
    dr.ch[k] = 'k';
    dr.legend.k = { type: 'chest', item: s.keys[0], count: 1 };
  }
  const pool = shuffle(rng, lootPool(s.depth));
  for (let n = 0; n < s.chests; n++) {
    const i = pick(() => true);
    if (i < 0) return false;
    const letter = CHEST_LETTERS[n];
    const [item, count] = pool[n % pool.length];
    dr.ch[i] = letter;
    dr.legend[letter] = { type: 'chest', item, count };
  }
  return true;
}

function makeAreas(dr, rng, s) {
  const { w, h } = s;
  const n = w * h <= 144 ? 2 : w * h <= 256 ? 3 : 4;
  const colors = shuffle(rng, [...PALETTE]);
  const sx = rng.int(Math.floor(w * 0.4), Math.ceil(w * 0.6));
  const sy = rng.int(Math.floor(h * 0.4), Math.ceil(h * 0.6));
  let rects;
  if (n === 2) {
    rects = w >= h ? [[0, 0, sx - 1, h - 1], [sx, 0, w - 1, h - 1]] : [[0, 0, w - 1, sy - 1], [0, sy, w - 1, h - 1]];
  } else if (n === 3 || s.boss) {
    rects = rng() < 0.5
      ? [[0, 0, sx - 1, h - 1], [sx, 0, w - 1, sy - 1], [sx, sy, w - 1, h - 1]]
      : [[0, 0, w - 1, sy - 1], [0, sy, sx - 1, h - 1], [sx, sy, w - 1, h - 1]];
  } else {
    rects = [[0, 0, sx - 1, sy - 1], [sx, 0, w - 1, sy - 1], [0, sy, sx - 1, h - 1], [sx, sy, w - 1, h - 1]];
  }
  const areas = rects.map((rect, k) => ({ rect, color: colors[k], name: `Area ${'ABCD'[k]}` }));
  if (s.boss && dr.boss) areas.push({ rect: dr.boss.rect, color: colors[areas.length], name: 'Boss Room' });
  return areas;
}

function edgeChar(dr, i, d, v) {
  const j = dr.nb(i, d);
  const horiz = d === 0 || d === 2; // a horizontal edge line (between rows)
  const rockA = dr.rock(i);
  const rockB = j < 0 || dr.rock(j);
  if (rockA && rockB) return ' ';
  if (rockA || rockB) return horiz ? '-' : '|';
  if (v === 'wall') return horiz ? '-' : '|';
  if (v === 'open') return ' ';
  if (v === 'door') return 'd';
  if (v.startsWith('ow')) return ARROW[Number(v[2])];
  if (v.startsWith('sc')) return SHORTCUT[Number(v[2])];
  if (v.startsWith('lock:')) return v.slice(5);
  throw new Error(`bad edge ${v}`);
}

function emitMap(dr) {
  const { w, h } = dr;
  const hChar = (x, y) => (y < h ? edgeChar(dr, dr.at(x, y), 0, dr.hE[y * w + x]) : edgeChar(dr, dr.at(x, h - 1), 2, dr.hE[y * w + x]));
  const vChar = (x, y) => (x < w ? edgeChar(dr, dr.at(x, y), 3, dr.vE[y * (w + 1) + x]) : edgeChar(dr, dr.at(w - 1, y), 1, dr.vE[y * (w + 1) + x]));
  const lines = [];
  for (let r = 0; r <= 2 * h; r++) {
    let line = '';
    for (let c = 0; c <= 2 * w; c++) {
      if (r % 2 === 0 && c % 2 === 0) {
        const x = c / 2;
        const y = r / 2;
        const around = [];
        if (x > 0) around.push(hChar(x - 1, y));
        if (x < w) around.push(hChar(x, y));
        if (y > 0) around.push(vChar(x, y - 1));
        if (y < h) around.push(vChar(x, y));
        line += around.some((ch) => ch !== ' ') ? '+' : ' ';
      } else if (r % 2 === 0) line += hChar((c - 1) / 2, r / 2);
      else if (c % 2 === 0) line += vChar(c / 2, (r - 1) / 2);
      else line += dr.ch[dr.at((c - 1) / 2, (r - 1) / 2)];
    }
    lines.push(line);
  }
  return lines;
}

function emit(dr, s, st, areas) {
  const src = {
    id: s.id,
    name: s.name,
    depth: s.depth,
    start: [dr.x(st.start), dr.y(st.start), st.face],
    color: s.color,
    map: emitMap(dr),
    legend: { ...dr.legend },
  };
  if (Object.keys(dr.locks).length) src.locks = { ...dr.locks };
  if (dr.dark.length) src.dark = dr.dark.map((r) => [...r]);
  if (areas.length) src.areas = areas;
  if (s.encounters) src.encounters = s.encounters;
  return src;
}

function finalCheck(src, s, st, dr) {
  let floor;
  try { floor = parseFloor(src); } catch { return { fail: 'parse' }; }
  const v = validateFloor(floor);
  if (!v.ok) return { fail: `validate:${v.problems[0].split(':')[0].split(' ')[0]}` };
  const launchers = floor.cells.filter((c) => c.feature?.type === 'launch').length;
  if (v.reachedCells < v.walkable - launchers) return { fail: 'unreachable cells' };
  const D = [dr.x(st.D), dr.y(st.D)];
  const G = [dr.x(st.G), dr.y(st.G)];
  if (shortestPath(floor, D, G) < s.minPath) return { fail: 'path' };
  if (Math.abs(D[0] - G[0]) + Math.abs(D[1] - G[1]) < s.minManhattan) return { fail: 'manhattan' };
  if (floorLoops(floor) < s.loops) return { fail: 'loops' };
  if (floorDeadEnds(floor) < s.deadEnds) return { fail: 'deadEnds' };
  const shortcuts = [...floor.hEdges, ...floor.vEdges].filter((e) => e.type === 'shortcut').length;
  if (shortcuts !== s.shortcuts) return { fail: 'shortcut count' };
  // Every requested gimmick is really on the floor, at its requested count.
  const edges = [...floor.hEdges, ...floor.vEdges];
  const count = (t) => edges.filter((e) => e.type === t).length;
  if (count('oneway') < s.oneways) return { fail: 'oneway count' };
  if (launchers < s.lanes) return { fail: 'launcher count' };
  if (floor.cells.filter((c) => c.feature?.type === 'warp').length < 2 * s.warpPairs) return { fail: 'warp count' };
  if (s.dark && !floor.cells.some((c) => c.dark)) return { fail: 'dark' };
  if (s.g.has('lock') && count('lock') !== 1) return { fail: 'lock' };
  if (s.g.has('door') && count('door') < 1) return { fail: 'door' };
  return { src };
}

// ---------------------------------------------------------------------------------------------------------------
// Source -> module text (`export default {...}`), one map row per line, for hand-tuning.

function lit(v) {
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (Array.isArray(v)) return `[${v.map(lit).join(', ')}]`;
  if (v && typeof v === 'object') {
    const parts = Object.entries(v).map(([k, x]) => `${/^[A-Za-z_$][\w$]*$|^\d+$/.test(k) ? k : lit(k)}: ${lit(x)}`);
    return parts.length ? `{ ${parts.join(', ')} }` : '{}';
  }
  return String(v);
}

export function sourceToModule(src, comment = '') {
  const out = [];
  if (comment) for (const line of comment.split('\n')) out.push(`// ${line}`);
  out.push('export default {');
  for (const [k, v] of Object.entries(src)) {
    if (k === 'map') {
      out.push('  map: [');
      for (const row of v) out.push(`    ${lit(row)},`);
      out.push('  ],');
    } else if ((k === 'legend' || k === 'locks') && Object.keys(v).length) {
      out.push(`  ${k}: {`);
      for (const [kk, vv] of Object.entries(v)) out.push(`    ${lit({ [kk]: vv }).slice(2, -2)},`);
      out.push('  },');
    } else if (k === 'areas' || k === 'dark') {
      out.push(`  ${k}: [`);
      for (const a of v) out.push(`    ${lit(a)},`);
      out.push('  ],');
    } else out.push(`  ${k}: ${lit(v)},`);
  }
  out.push('};');
  return `${out.join('\n')}\n`;
}

