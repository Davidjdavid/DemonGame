// Automap drawing (2D canvas): walked cells in area colors, seen walls and doors, features, the player arrow.
import { edgeAt, cellAt } from '../world/floor.js';
import { edgeState } from '../world/move.js';

const FEATURE_GLYPH = {
  save: ['S', '#7cc4ff'], heal: ['+', '#7dffb0'], warn: ['!', '#ffcc33'], boss: ['B', '#ff4a4a'], exit: ['X', '#fff4c0'],
};

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

/**
 * Draw the map of `floor` into canvas `cv`.
 * opts: { mem, flags, pos: {x, y, dir}, inDark, window: null | radius (minimap centred on the player), reveal: bool }
 */
export function drawMap(cv, floor, opts) {
  const { mem, flags, pos, inDark = false, reveal = false } = opts;
  const g = cv.getContext('2d');
  const W = cv.width;
  const H = cv.height;
  g.fillStyle = '#0b0c10';
  g.fillRect(0, 0, W, H);
  let x0 = 0; let y0 = 0; let cols = floor.w; let rows = floor.h;
  if (opts.window) {
    const r = opts.window;
    x0 = pos.x - r; y0 = pos.y - r; cols = rows = 2 * r + 1;
  }
  const cs = Math.floor(Math.min((W - 16) / cols, (H - 16) / rows));
  const ox = Math.floor((W - cs * cols) / 2);
  const oy = Math.floor((H - cs * rows) / 2);
  const px = (x) => ox + (x - x0) * cs;
  const py = (y) => oy + (y - y0) * cs;
  const isKnown = (x, y) => reveal || mem.cells.has(`${x},${y}`);
  const isSeen = (x, y) => isKnown(x, y) || mem.seen?.has(`${x},${y}`);
  const VISIBLE_FROM_AFAR = new Set(['stairs', 'chest', 'service', 'shop', 'save', 'heal', 'boss', 'exit']);
  // Grid dots for orientation.
  g.fillStyle = '#23252e';
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) g.fillRect(ox + x * cs - 1, oy + y * cs - 1, 2, 2);
  for (let y = y0; y < y0 + rows; y++) {
    for (let x = x0; x < x0 + cols; x++) {
      const c = cellAt(floor, x, y);
      if (!c || c.solid || !isSeen(x, y)) continue;
      const walked = isKnown(x, y);
      g.fillStyle = walked ? shade(c.color, 0.55) : shade(c.color, 0.28);
      g.fillRect(px(x), py(y), cs, cs);
      const f = c.feature;
      if (!f) continue;
      // Seen from afar: objects you can see (stairs, chests, counters) show faded; floor gimmicks stay hidden.
      if (!walked && !VISIBLE_FROM_AFAR.has(f.type)) continue;
      g.globalAlpha = walked ? 1 : 0.5;
      const cx = px(x) + cs / 2;
      const cy = py(y) + cs / 2;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `bold ${Math.round(cs * 0.6)}px system-ui, sans-serif`;
      if (f.type === 'stairs') {
        g.fillStyle = f.dir === 'up' ? '#9fe8ff' : '#ffb36b';
        g.fillText(f.dir === 'up' ? '▲' : '▼', cx, cy + 1);
      } else if (f.type === 'chest') {
        const open = flags.chests[f.id];
        g.strokeStyle = '#e0b040';
        g.fillStyle = open ? 'transparent' : '#e0b040';
        g.lineWidth = 2;
        const s = cs * 0.5;
        if (!open) g.fillRect(cx - s / 2, cy - s / 3, s, s * 0.66);
        g.strokeRect(cx - s / 2, cy - s / 3, s, s * 0.66);
      } else if (f.type === 'warp') {
        g.strokeStyle = '#ff5cf0';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(cx, cy, cs * 0.28, 0, Math.PI * 2);
        g.stroke();
      } else if (f.type === 'launch') {
        g.fillStyle = '#46e0ff';
        g.fillText(['↑', '→', '↓', '←'][f.dir], cx, cy + 1);
      } else if (FEATURE_GLYPH[f.type]) {
        const [t, col] = FEATURE_GLYPH[f.type];
        g.fillStyle = col;
        g.fillText(t, cx, cy + 1);
      } else if (f.label) {
        g.fillStyle = f.signColor || '#ffd84a';
        g.font = `bold ${Math.round(cs * 0.42)}px system-ui, sans-serif`;
        g.fillText(f.label.slice(0, 2), cx, cy + 1);
      }
      g.globalAlpha = 1;
    }
  }
  // Edges: draw each seen edge once (from its known side).
  const lw = Math.max(2, Math.round(cs / 9));
  for (let y = y0; y < y0 + rows; y++) {
    for (let x = x0; x < x0 + cols; x++) {
      const c = cellAt(floor, x, y);
      if (!c || c.solid || !isSeen(x, y)) continue;
      g.globalAlpha = isKnown(x, y) ? 1 : 0.45;
      for (let d = 0; d < 4; d++) {
        const e = edgeAt(floor, x, y, d);
        const st = edgeState(e, flags);
        if (st === 'open') continue;
        const [ax, ay, bx, by] = [
          [px(x), py(y), px(x + 1), py(y)],
          [px(x + 1), py(y), px(x + 1), py(y + 1)],
          [px(x), py(y + 1), px(x + 1), py(y + 1)],
          [px(x), py(y), px(x), py(y + 1)],
        ][d];
        g.lineCap = 'square';
        if (st === 'wall') {
          g.strokeStyle = '#e6e6ea';
          g.lineWidth = lw;
          g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
          continue;
        }
        const color = { door: '#c07a3a', lock: '#f2c230', oneway: '#46b4ff', shortcut: '#9fe870' }[st];
        g.strokeStyle = '#e6e6ea';
        g.lineWidth = lw;
        const mx = (ax + bx) / 2; const my = (ay + by) / 2;
        const qx = (bx - ax) * 0.25; const qy = (by - ay) * 0.25;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(mx - qx, my - qy); g.moveTo(mx + qx, my + qy); g.lineTo(bx, by); g.stroke();
        g.strokeStyle = color;
        g.lineWidth = lw * 1.6;
        g.beginPath(); g.moveTo(mx - qx, my - qy); g.lineTo(mx + qx, my + qy); g.stroke();
        if (st === 'oneway' || st === 'shortcut') {
          // Small arrow showing the direction it opens / lets you through.
          const dir = e.dir;
          const vx = [0, 1, 0, -1][dir] * cs * 0.22;
          const vy = [-1, 0, 1, 0][dir] * cs * 0.22;
          g.fillStyle = color;
          g.beginPath();
          g.moveTo(mx + vx, my + vy);
          g.lineTo(mx - vy * 0.6, my + vx * 0.6);
          g.lineTo(mx + vy * 0.6, my - vx * 0.6);
          g.closePath();
          g.fill();
        }
      }
    }
  }
  g.globalAlpha = 1;
  // Player.
  if (pos && !inDark) {
    const cx = px(pos.x) + cs / 2;
    const cy = py(pos.y) + cs / 2;
    const a = (pos.dir * Math.PI) / 2;
    const r = cs * 0.36;
    g.save();
    g.translate(cx, cy);
    g.rotate(a);
    g.fillStyle = '#ff3b3b';
    g.strokeStyle = '#000';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, -r); g.lineTo(r * 0.75, r * 0.8); g.lineTo(0, r * 0.4); g.lineTo(-r * 0.75, r * 0.8);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  } else if (pos && inDark) {
    g.fillStyle = '#aaa';
    g.font = `bold ${Math.round(cs * 0.7)}px system-ui`;
    g.textAlign = 'left';
    g.fillText('?', 10, 20);
  }
}
