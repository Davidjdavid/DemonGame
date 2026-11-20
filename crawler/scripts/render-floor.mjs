// Top-down PNG preview of a floor (classic SMT/Wizardry floor-map look), for reviewing generated candidates.
// Pure JS: a tiny RGBA raster, a 3x5 bitmap font and a PNG encoder on node:zlib. No dependencies.
//
//   import { renderFloorPng } from './render-floor.mjs';
//   renderFloorPng(floorSrc, 'out.png', { cell: 28, metrics, score, title, path: true });
// CLI: node scripts/render-floor.mjs <floor-module.js> [out.png]   (renders a frozen or hand-tuned floor file)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { parseFloor } from '../src/world/floor.js';
import { stepGraph, pathSteps, allShortcutsOpen, cellIndex, goalCell, downCell } from '../src/gen/graph.js';
import { floorMetrics } from '../src/gen/metrics.js';

// ---- raster -------------------------------------------------------------------------------------------------
function hex(c) {
  const v = parseInt(c.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));

class Canvas {
  constructor(w, h, bg) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 4);
    this.rect(0, 0, w, h, bg);
  }
  set(x, y, c, a = 1) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const k = (y * this.w + x) * 4;
    const p = this.px;
    p[k] = Math.round(p[k] * (1 - a) + c[0] * a);
    p[k + 1] = Math.round(p[k + 1] * (1 - a) + c[1] * a);
    p[k + 2] = Math.round(p[k + 2] * (1 - a) + c[2] * a);
    p[k + 3] = 255;
  }
  rect(x, y, w, h, c, a = 1) {
    for (let j = Math.floor(y); j < Math.floor(y + h); j++) for (let i = Math.floor(x); i < Math.floor(x + w); i++) this.set(i, j, c, a);
  }
  tri(p, q, r, c, a = 1) {
    const minX = Math.floor(Math.min(p[0], q[0], r[0]));
    const maxX = Math.ceil(Math.max(p[0], q[0], r[0]));
    const minY = Math.floor(Math.min(p[1], q[1], r[1]));
    const maxY = Math.ceil(Math.max(p[1], q[1], r[1]));
    const s = (a1, b1, c1) => (a1[0] - c1[0]) * (b1[1] - c1[1]) - (b1[0] - c1[0]) * (a1[1] - c1[1]);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const pt = [x + 0.5, y + 0.5];
        const d1 = s(pt, p, q);
        const d2 = s(pt, q, r);
        const d3 = s(pt, r, p);
        const neg = d1 < 0 || d2 < 0 || d3 < 0;
        const pos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(neg && pos)) this.set(x, y, c, a);
      }
    }
  }
  ring(cx, cy, r0, r1, c) {
    for (let y = Math.floor(cy - r1); y <= cy + r1; y++) {
      for (let x = Math.floor(cx - r1); x <= cx + r1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d >= r0 && d <= r1) this.set(x, y, c);
      }
    }
  }
  png() {
    const raw = Buffer.alloc((this.w * 4 + 1) * this.h);
    for (let y = 0; y < this.h; y++) {
      raw[y * (this.w * 4 + 1)] = 0;
      Buffer.from(this.px.buffer, y * this.w * 4, this.w * 4).copy(raw, y * (this.w * 4 + 1) + 1);
    }
    const chunk = (type, data) => {
      const len = Buffer.alloc(4);
      len.writeUInt32BE(data.length);
      const td = Buffer.concat([Buffer.from(type), data]);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(td));
      return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.w, 0);
    ihdr.writeUInt32BE(this.h, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---- 3x5 font -----------------------------------------------------------------------------------------------
const GLYPHS = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
  9: '111101111001110', ' ': '000000000000000', '.': '000000000000010', ',': '000000000010100', ':': '000010000010000',
  '-': '000000111000000', '+': '000010111010000', '/': '001001010100100', '=': '000111000111000', '(': '010100100100010',
  ')': '010001001001010', '%': '101001010100101', '>': '100010001010100', '<': '001010100010001', '!': '010010010000010',
  '?': '110001010000010', '#': '101111101111101', '|': '010010010010010', _: '000000000000111', '*': '000101010101000',
  "'": '010010000000000', '^': '010101000000000',
};
function text(cv, x, y, str, c, scale = 2) {
  let cx = x;
  for (const ch of String(str).toUpperCase()) {
    const g = GLYPHS[ch] || GLYPHS['?'];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r * 3 + k] === '1') cv.rect(cx + k * scale, y + r * scale, scale, scale, c);
    cx += 4 * scale;
  }
  return cx;
}
const textWidth = (str, scale = 2) => String(str).length * 4 * scale - scale;

// ---- colours ------------------------------------------------------------------------------------------------
const COL = {
  bg: hex('#15161a'), rock: hex('#24252b'), hatch: hex('#30313a'), wall: hex('#ece6d6'), ink: hex('#ece6d6'),
  dim: hex('#9a978e'), door: hex('#b07a3a'), lock: hex('#e0b030'), oneway: hex('#4a90e0'), shortcut: hex('#4ec46a'),
  warp: hex('#e070d0'), launch: hex('#50d8e8'), down: hex('#3fa060'), up: hex('#e0c040'), chest: hex('#8a5a2a'),
  gold: hex('#e0b030'), save: hex('#4a70d0'), heal: hex('#40c070'), warn: hex('#e04040'), boss: hex('#c03030'),
  path: hex('#fff2a0'), path2: hex('#7cf09a'), black: [0, 0, 0], white: [255, 255, 255],
};

// ---- the map ------------------------------------------------------------------------------------------------
export function renderFloorPng(floorSrc, outPath, opts = {}) {
  const floor = floorSrc.cells ? floorSrc : parseFloor(floorSrc);
  const src = floor.src;
  const C = opts.cell ?? 28;
  const m = opts.metrics ?? floorMetrics(floor);
  const L = 30;
  const T = 52;
  const PANEL = 290;
  const mapW = floor.w * C;
  const mapH = floor.h * C;
  const lines = panelLines(m, opts, src);
  const W = L + mapW + 16 + PANEL;
  const H = Math.max(T + mapH + 14, T + lines.length * 14 + 8 + 9 * 13 + 14);
  const cv = new Canvas(W, H, COL.bg);
  const X = (x) => L + x * C;
  const Y = (y) => T + y * C;

  // Title + axis labels.
  const title = opts.title ?? `${src.name || src.id}  (${src.id} ${floor.w}x${floor.h}${src.gen ? `  seed ${src.gen.seed}` : ''})`;
  text(cv, L, 8, title, COL.ink, 2);
  if (opts.score !== undefined) text(cv, L, 24, `score ${opts.score}`, COL.up, 2);
  for (let x = 0; x < floor.w; x++) text(cv, X(x) + C / 2 - textWidth(String(x), 1) / 2, T - 9, x, COL.dim, 1);
  for (let y = 0; y < floor.h; y++) text(cv, L - 6 - textWidth(String(y), 1), Y(y) + C / 2 - 2, y, COL.dim, 1);

  // Cells.
  for (const c of floor.cells) {
    const x0 = X(c.x);
    const y0 = Y(c.y);
    if (c.solid) {
      cv.rect(x0, y0, C, C, COL.rock);
      for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) if ((x0 + i + y0 + j) % 7 === 0) cv.set(x0 + i, y0 + j, COL.hatch);
      continue;
    }
    const base = mix(hex(c.color), COL.white, 0.08);
    cv.rect(x0, y0, C, C, base);
    if (c.dark) {
      cv.rect(x0, y0, C, C, COL.black, 0.6);
      for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) if ((i - j + 64) % 5 === 0) cv.set(x0 + i, y0 + j, COL.warp, 0.18);
    }
  }
  // Grid lines for open edges (thin, darker).
  for (const c of floor.cells) {
    if (c.solid) continue;
    const g = mix(hex(c.color), COL.black, 0.35);
    cv.rect(X(c.x), Y(c.y), C, 1, g);
    cv.rect(X(c.x), Y(c.y), 1, C, g);
  }

  // Main path (first trip) and the run with shortcuts open.
  if (opts.path !== false) {
    const D = downCell(floor);
    const G = goalCell(floor);
    if (D && G) {
      const di = cellIndex(floor, D.x, D.y);
      const gi = cellIndex(floor, G.x, G.y);
      const dots = (steps, col, off) => {
        for (const s of steps || []) {
          const x = s.to % floor.w;
          const y = Math.floor(s.to / floor.w);
          cv.rect(X(x) + C / 2 - 3 + off, Y(y) + C / 2 - 3 + off, 6, 6, COL.black, 0.75);
          cv.rect(X(x) + C / 2 - 2 + off, Y(y) + C / 2 - 2 + off, 4, 4, col);
        }
      };
      const first = pathSteps(stepGraph(floor), di, gi);
      const fast = pathSteps(stepGraph(floor, { flags: allShortcutsOpen(floor) }), di, gi);
      dots(first, COL.path, -3);
      if (fast && first && fast.length < first.length) dots(fast, COL.path2, 4);
    }
  }

  // Features.
  for (const c of floor.cells) if (!c.solid && c.feature) drawFeature(cv, c.feature, X(c.x), Y(c.y), C);
  if (floor.start) {
    const [sx, sy, sd] = floor.start;
    const cx = X(sx) + C / 2;
    const cy = Y(sy) + C / 2;
    const tip = [[0, -1], [1, 0], [0, 1], [-1, 0]][sd];
    const s = C * 0.28;
    cv.tri([cx + tip[0] * s, cy + tip[1] * s], [cx - tip[1] * s * 0.7 - tip[0] * s * 0.5, cy + tip[0] * s * 0.7 - tip[1] * s * 0.5],
      [cx + tip[1] * s * 0.7 - tip[0] * s * 0.5, cy - tip[0] * s * 0.7 - tip[1] * s * 0.5], COL.white, 0.9);
  }

  // Edges: walls, doors, one-way, shortcuts, locks.
  const TH = Math.max(3, Math.round(C / 9));
  const drawEdge = (e, horiz, x, y) => {
    const solidA = horiz ? floor.cells[(y - 1) * floor.w + x]?.solid ?? true : x > 0 ? floor.cells[y * floor.w + x - 1].solid : true;
    const solidB = horiz ? (y < floor.h ? floor.cells[y * floor.w + x].solid : true) : x < floor.w ? floor.cells[y * floor.w + x].solid : true;
    if (solidA && solidB) return;
    if (e.type === 'open') return;
    const x0 = X(x);
    const y0 = Y(y);
    const line = (col, t, from = 0, to = 1) => {
      if (horiz) cv.rect(x0 + from * C - (from === 0 ? TH / 2 : 0), y0 - t / 2, (to - from) * C + (from === 0 ? TH / 2 : 0) + (to === 1 ? TH / 2 : 0), t, col);
      else cv.rect(x0 - t / 2, y0 + from * C - (from === 0 ? TH / 2 : 0), t, (to - from) * C + (from === 0 ? TH / 2 : 0) + (to === 1 ? TH / 2 : 0), col);
    };
    line(COL.wall, TH);
    if (e.type === 'wall') return;
    const col = { door: COL.door, lock: COL.lock, oneway: COL.oneway, shortcut: COL.shortcut }[e.type];
    line(COL.bg, TH + 4, 0.2, 0.8);
    line(col, TH + 2, 0.22, 0.78);
    const mx = horiz ? x0 + C / 2 : x0;
    const my = horiz ? y0 : y0 + C / 2;
    if (e.type === 'oneway' || e.type === 'shortcut') {
      const d = e.dir;
      const v = [[0, -1], [1, 0], [0, 1], [-1, 0]][d];
      const len = C * 0.32;
      const half = C * 0.16;
      cv.tri([mx + v[0] * len, my + v[1] * len], [mx - v[1] * half, my + v[0] * half], [mx + v[1] * half, my - v[0] * half], col);
      if (e.type === 'shortcut') text(cv, mx - v[0] * C * 0.3 - 2, my - v[1] * C * 0.3 - 4, 'S', COL.shortcut, 1);
    }
    if (e.type === 'lock') {
      cv.rect(mx - 3, my - 3, 6, 6, COL.black);
      cv.rect(mx - 1, my - 2, 2, 4, COL.lock);
    }
  };
  floor.hEdges.forEach((e, k) => drawEdge(e, true, k % floor.w, Math.floor(k / floor.w)));
  floor.vEdges.forEach((e, k) => drawEdge(e, false, k % (floor.w + 1), Math.floor(k / (floor.w + 1))));

  // Side panel: metrics + legend.
  const px = L + mapW + 18;
  let py = T;
  for (const [s, col] of lines) { text(cv, px, py, s, col || COL.ink, 2); py += 14; }
  py += 8;
  const legend = [
    ['door', COL.door], ['one-way door', COL.oneway], ['shortcut (S)', COL.shortcut], ['locked door', COL.lock],
    ['warp', COL.warp], ['launcher', COL.launch], ['first trip', COL.path], ['with shortcuts', COL.path2],
  ];
  for (const [label, col] of legend) {
    cv.rect(px, py + 1, 14, 8, col);
    text(cv, px + 20, py, label, COL.dim, 2);
    py += 13;
  }
  cv.rect(px, py + 1, 14, 8, COL.black, 0.6);
  text(cv, px + 20, py, 'dark zone', COL.dim, 2);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, cv.png());
  return { width: W, height: H };
}

function panelLines(m, opts, src) {
  const f = (v) => (Number.isFinite(v) ? v : '-');
  const out = [];
  if (src.gen) out.push([`seed ${src.gen.seed} try ${src.gen.attempt}`, COL.dim]);
  if (opts.score !== undefined) out.push([`score ${opts.score}`, COL.up]);
  out.push([`path d-u    ${f(m.pathLength)}`]);
  out.push([`w/ shortcut ${f(m.pathWithShortcuts)} (-${f(m.shortcutSaving)})`, COL.path2]);
  out.push([`with keys   ${f(m.firstTrip)}`]);
  out.push([`manhattan   ${m.stairsManhattan}`]);
  out.push([`loops ${m.loops}  dead ends ${m.deadEnds}`]);
  out.push([`chests ${m.chestsInDeadEnds}/${m.chests} tucked`]);
  out.push([`straight run ${m.longestStraightRun}`]);
  out.push([`turns ${m.turnsOnMainPath}`]);
  out.push([`path covers ${Math.round(m.coverageOfMainPath * 100)}% of ${m.cells}`]);
  if (m.walkSteps !== undefined) {
    out.push([`explore ${m.walkSteps}${m.walkFound ? '' : ' (lost)'}`, m.walkFound ? COL.ink : COL.warn]);
    out.push([`run back up ${f(m.returnSteps)}`]);
    out.push([`run down    ${f(m.descentSteps)}`]);
    out.push([`shortcuts opened ${m.shortcutsOpenedByWalk}/${m.shortcuts}`]);
  }
  const g = [];
  if (m.doors) g.push(`${m.doors}d`);
  if (m.oneways) g.push(`${m.oneways}ow`);
  if (m.locks) g.push(`${m.locks}lock`);
  if (m.warps) g.push(`${m.warps}warp`);
  if (m.launchers) g.push(`${m.launchers}launch`);
  if (m.darkCells) g.push(`${m.darkCells}dark`);
  out.push([g.join(' '), COL.dim]);
  return out;
}

function drawFeature(cv, f, x0, y0, C) {
  const cx = x0 + C / 2;
  const cy = y0 + C / 2;
  const box = (col, letter, ink = COL.black, s = 0.62) => {
    const b = Math.round(C * s);
    cv.rect(cx - b / 2, cy - b / 2, b, b, col);
    if (letter) text(cv, cx - 2.5, cy - 4.5, letter, ink, 2);
  };
  switch (f.type) {
    case 'stairs': box(f.dir === 'up' ? COL.up : COL.down, f.dir === 'up' ? 'U' : 'D'); break;
    case 'exit': box(COL.down, 'X'); break;
    case 'boss': box(COL.boss, 'B', COL.white, 0.7); break;
    case 'save': box(COL.save, 'R', COL.white); break;
    case 'heal': box(COL.heal, '+', COL.black); break;
    case 'warn': text(cv, cx - 2.5, cy - 4.5, '!', COL.warn, 2); cv.ring(cx, cy, C * 0.3, C * 0.36, COL.warn); break;
    case 'warp': cv.ring(cx, cy, C * 0.26, C * 0.36, COL.warp); text(cv, cx - 2.5, cy - 4.5, f.id, COL.warp, 2); break;
    case 'launch': {
      const v = [[0, -1], [1, 0], [0, 1], [-1, 0]][f.dir];
      const s = C * 0.34;
      cv.tri([cx + v[0] * s, cy + v[1] * s], [cx - v[0] * s * 0.6 - v[1] * s * 0.8, cy - v[1] * s * 0.6 + v[0] * s * 0.8],
        [cx - v[0] * s * 0.6 + v[1] * s * 0.8, cy - v[1] * s * 0.6 - v[0] * s * 0.8], COL.launch);
      break;
    }
    case 'chest': {
      const key = /key/.test(f.item);
      const b = Math.round(C * 0.5);
      cv.rect(cx - b / 2 - 1, cy - b / 2 + 2, b + 2, b - 2, COL.gold);
      cv.rect(cx - b / 2 + 1, cy - b / 2 + 4, b - 2, b - 6, key ? COL.gold : COL.chest);
      if (key) text(cv, cx - 2.5, cy - 3.5, 'K', COL.black, 2);
      break;
    }
    default: text(cv, cx - 2.5, cy - 4.5, (f.type || '?')[0], COL.ink, 2);
  }
}

// CLI: render one floor module.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const file = process.argv[2];
  if (!file) {
    console.log('usage: node scripts/render-floor.mjs <floor-module.js> [out.png]');
    process.exit(1);
  }
  const mod = await import(pathToFileURL(path.resolve(file)).href);
  const out = process.argv[3] || file.replace(/\.m?js$/, '.png');
  const r = renderFloorPng(mod.default, out);
  console.log(`wrote ${out} (${r.width}x${r.height})`);
}

