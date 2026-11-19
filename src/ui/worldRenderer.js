// Draws a hand-designed map with CC0 tilesheets (src/data/tiles.json via tiles-index.js). Falls back to flat
// colored blocks for anything not mapped yet. Rendering only: map data and rules live in src/world/runtime.js.
import { TILES } from '../data/tiles-index.js';
import { tileAt, visibleEntities, isDone } from '../world/runtime.js';
import { hasFlag } from '../story/state.js';
import { autotileName, underName } from '../world/autotile.js';
import { DEMONS } from '../data/index.js';

export const SCALE = 3;
const T = TILES?.tileSize ?? 16;
export const CELL = T * SCALE;

// Map legend → tile names per tileset (first name that exists wins).
const LEGEND = {
  town: {
    '.': ['path', 'grass'], '"': ['grass'], '#': ['fence', 'rock', 'tree'], '~': ['water'], ',': ['water_shallow', 'water'],
    '=': ['bridge', 'path'], T: ['tree'], H: ['house_wall', 'fence'], D: ['house_door', 'path'], ':': ['rock', 'crate'],
  },
  dungeon: {
    '.': ['floor'], '"': ['floor2', 'floor'], '#': ['wall'], '~': ['water'], ',': ['water_shallow', 'floor2', 'floor'],
    '=': ['bridge', 'floor2', 'floor'], T: ['rubble', 'wall'], H: ['wall'], D: ['door_open', 'floor'], ':': ['rubble', 'skull'],
  },
};
// Base layer drawn under transparent tiles (trees, doors, decorations).
const UNDER = { town: ['grass'], dungeon: ['floor'] };
const FALLBACK = {
  '#': '#2b2633', '.': '#4a4356', '"': '#3e5a3a', '~': '#21456b', ',': '#3d6f8f', '=': '#7a5a3a', T: '#2f5530', H: '#6b4f3f', D: '#8a6a4a', ':': '#55505e',
};
const ENTITY_TILE = {
  chest: (e, done) => (done ? ['chest_open', 'chest_closed'] : ['chest_closed']),
  door: (e, done) => (done ? ['door_open'] : ['door_closed']),
  switch: (e, done) => (done ? ['lever_on', 'lever', 'switch'] : ['lever', 'switch']),
  stairs: (e) => (e.dir === 'up' ? ['stairs_up', 'stairs_down'] : ['stairs_down', 'stairs_up']),
  spring: (e, done, ts) => (ts === 'town' ? ['well', 'fountain'] : ['fountain', 'spring', 'well']),
  shop: () => ['shopkeeper', 'npc_1'],
  save: () => ['altar', 'torch'],
  sign: () => ['sign'],
  boss: (e) => [e.sprite ?? 'monster_8', 'monster_1'],
  demon: (e) => [e.sprite ?? FAMILY_SPRITE[DEMONS[e.demon]?.family] ?? 'monster_3', 'monster_3'],
  trigger: () => [],
};
const FAMILY_SPRITE = { Trickster: 'monster_7', Fairy: 'monster_5', Fiend: 'monster_1', Spirit: 'monster_4', Serpent: 'monster_8', Brute: 'monster_2', Construct: 'monster_6', Underworld: 'monster_4' };
const ENTITY_COLOR = { npc: '#d8c27a', chest: '#d8b45a', door: '#8a5a3a', switch: '#b8b8b8', stairs: '#e9e1cf', spring: '#5fa58a', shop: '#7fa6d6', save: '#c9a24a', sign: '#a08060', boss: '#b8494a' };

const images = {};
export function loadSheets() {
  if (!TILES) return Promise.resolve(false);
  return Promise.all(Object.entries(TILES.sheets).map(([name, sh]) => new Promise((resolve) => {
    if (images[name]) return resolve(true);
    const img = new Image();
    img.onload = () => { images[name] = img; resolve(true); };
    img.onerror = () => resolve(false);
    img.src = sh.src;
  }))).then((r) => r.every(Boolean));
}

function pick(names) {
  if (!TILES) return null;
  for (const n of names) if (TILES.tiles[n] && images[TILES.tiles[n].sheet]) return TILES.tiles[n];
  return null;
}

function drawTile(ctx, t, dx, dy, size = CELL) {
  const sh = TILES.sheets[t.sheet];
  const sp = sh.spacing ?? 0, mg = sh.margin ?? 0;
  ctx.drawImage(images[t.sheet], mg + t.col * (T + sp), mg + t.row * (T + sp), T, T, dx, dy, size, size);
}

export function spriteFor(name) {
  return pick([name]);
}

/**
 * Draw the view. `cam` is the (fractional) tile the camera centers on (the hero's tweened position).
 * opts: { viewW, viewH, heroSprite, npcSprite(e) }
 */
export function drawWorld(canvas, map, world, story, cam, opts = {}) {
  const vw = opts.viewW ?? 15, vh = opts.viewH ?? 11;
  if (canvas.width !== vw * CELL) canvas.width = vw * CELL;
  if (canvas.height !== vh * CELL) canvas.height = vh * CELL;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0d0b12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const set = LEGEND[map.tileset] ?? LEGEND.dungeon;
  // Follow the hero, but stop at the map's edges (no black void past the walls); center maps smaller than the view.
  const fit = (c, v, size) => (size <= v ? (size - v) / 2 : Math.max(0, Math.min(size - v, c - (v - 1) / 2)));
  const ox = fit(cam.x, vw, map.width), oy = fit(cam.y, vh, map.height);
  const x0 = Math.floor(ox) - 1, y0 = Math.floor(oy) - 1;
  for (let y = y0; y <= y0 + vh + 2; y++) {
    for (let x = x0; x <= x0 + vw + 2; x++) {
      if (y < 0 || x < 0 || y >= map.height || x >= map.width) continue;
      const ch = tileAt(map, world, x, y);
      const dx = Math.round((x - ox) * CELL), dy = Math.round((y - oy) * CELL);
      const get = (gx, gy) => (gy < 0 || gx < 0 || gy >= map.height || gx >= map.width ? null : tileAt(map, world, gx, gy));
      const auto = TILES ? autotileName(get, x, y, map.tileset) : null;
      const tile = pick([...(auto ? [auto] : []), ...(set[ch] ?? [])]);
      if (tile) {
        const underN = TILES ? underName(get, x, y, map.tileset) : null;
        const under = pick([...(underN ? [underN] : []), ...(ch === '~' ? [] : (UNDER[map.tileset] ?? []))]);
        if (under && under !== tile && !(map.tileset === 'dungeon' && ch === '#')) drawTile(ctx, under, dx, dy);
        drawTile(ctx, tile, dx, dy);
      } else {
        ctx.fillStyle = FALLBACK[ch] ?? '#333';
        ctx.fillRect(dx, dy, CELL, CELL);
      }
    }
  }
  for (const e of visibleEntities(map, story)) {
    if (e.type === 'trigger') continue;
    const dx = Math.round((e.x - ox) * CELL), dy = Math.round((e.y - oy) * CELL);
    if (dx < -CELL || dy < -CELL || dx > canvas.width || dy > canvas.height) continue;
    const done = isDone(world, map.id, e.id) || (e.type === 'door' && e.flag && hasFlag(story, e.flag));
    const names = e.type === 'npc' ? [opts.npcSprite?.(e) ?? 'npc_1', 'npc_1'] : e.sprite ? [e.sprite] : (ENTITY_TILE[e.type]?.(e, done, map.tileset) ?? []);
    const tile = pick(names);
    const multi = TILES?.multi?.[names.find((n) => TILES.multi?.[n] && pick([n]))];
    if (multi) {
      // Objects taller than one tile: the last row sits on the entity's cell, earlier rows above it.
      multi.forEach((row, ri) => row.forEach((part, ci) => {
        const t = pick([part]);
        if (t) drawTile(ctx, t, dx + ci * CELL, dy - (multi.length - 1 - ri) * CELL);
      }));
    } else if (tile && e.type === 'boss') {
      // Bosses loom: double size, standing on their cell.
      drawTile(ctx, tile, dx - CELL / 2, dy - CELL, CELL * 2);
    } else if (tile) drawTile(ctx, tile, dx, dy);
    else {
      ctx.fillStyle = ENTITY_COLOR[e.type] ?? '#ccc';
      ctx.fillRect(dx + CELL * 0.2, dy + CELL * 0.2, CELL * 0.6, CELL * 0.6);
    }
  }
  // The hero, with a small bob while moving.
  const hx = Math.round((cam.x - ox) * CELL), hy = Math.round((cam.y - oy) * CELL) - (opts.moving ? Math.round(CELL * 0.06) : 0);
  const hero = pick([opts.heroSprite ?? 'hero', 'hero']);
  if (hero) {
    ctx.save();
    if (world.facing === 'left') { ctx.translate(hx + CELL, hy); ctx.scale(-1, 1); drawTile(ctx, hero, 0, 0); } else drawTile(ctx, hero, hx, hy);
    ctx.restore();
  } else {
    ctx.fillStyle = '#c9a24a';
    ctx.beginPath();
    ctx.arc(hx + CELL / 2, hy + CELL / 2, CELL * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A small canvas showing one named sprite (for talk-screen portraits of NPCs). Null if not available.
export function spriteCanvas(name, size = 96) {
  if (!TILES?.tiles?.[name] || typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const draw = () => {
    const t = TILES.tiles[name];
    const img = images[t.sheet];
    if (!img) return;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const sh = TILES.sheets[t.sheet];
    const sp = sh.spacing ?? 0, mg = sh.margin ?? 0;
    ctx.drawImage(img, mg + t.col * (T + sp), mg + t.row * (T + sp), T, T, 0, 0, size, size);
  };
  loadSheets().then(draw);
  return c;
}
