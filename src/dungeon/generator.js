// Dungeon floor generator (DESIGN: Dungeon). Pure and seeded. Output is plain JSON meant to be hand-edited:
//   tiles: array of strings, '#' wall, '.' floor. Features live in `features` (not in the tiles) so the
//   renderer stays separate from map data.
import { makeRng } from '../game/rng.js';

/**
 * params: {
 *   id, seed, width, height, rooms: [min, max], roomSize: [min, max],
 *   encounters: { table: [{ ids: [demonId...], weight, level: [min, max] }], rate: [minSteps, maxSteps] },
 *   treasure: n, treasureGold: [min, max], treasureItems: [itemIds], heal: bool, shop: bool, stairs: bool,
 *   boss: null | { id, level, hpMult, icons, dmgMult }
 * }
 */
export function generateFloor(params) {
  const rng = makeRng(params.seed);
  const ri = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const W = params.width, H = params.height;
  const grid = Array.from({ length: H }, () => Array(W).fill('#'));
  const rooms = [];
  const want = ri(params.rooms[0], params.rooms[1]);
  for (let tries = 0; rooms.length < want && tries < 500; tries++) {
    const w = ri(params.roomSize[0], params.roomSize[1]);
    const h = ri(params.roomSize[0], params.roomSize[1]);
    const x = ri(1, W - w - 2);
    const y = ri(1, H - h - 2);
    const r = { x, y, w, h };
    if (rooms.some((o) => x <= o.x + o.w + 1 && o.x <= x + w + 1 && y <= o.y + o.h + 1 && o.y <= y + h + 1)) continue;
    rooms.push(r);
  }
  // Order rooms left-to-right-ish so corridors make a winding path, then carve.
  rooms.sort((a, b) => (a.x + a.y * 0.5) - (b.x + b.y * 0.5));
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) grid[y][x] = '.';
  const center = (r) => ({ x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) });
  const carve = (a, b) => {
    let { x, y } = a;
    const horizFirst = rng() < 0.5;
    const stepX = () => { while (x !== b.x) { x += Math.sign(b.x - x); grid[y][x] = '.'; } };
    const stepY = () => { while (y !== b.y) { y += Math.sign(b.y - y); grid[y][x] = '.'; } };
    if (horizFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
  };
  for (let i = 1; i < rooms.length; i++) carve(center(rooms[i - 1]), center(rooms[i]));
  // A couple of extra loops so it isn't a single line.
  for (let i = 0; i < Math.floor(rooms.length / 3); i++) carve(center(rooms[ri(0, rooms.length - 1)]), center(rooms[ri(0, rooms.length - 1)]));

  const start = center(rooms[0]);
  const last = rooms[rooms.length - 1];
  const features = [];
  const used = new Set([`${start.x},${start.y}`]);
  const spotIn = (r) => {
    for (let t = 0; t < 50; t++) {
      const p = { x: ri(r.x, r.x + r.w - 1), y: ri(r.y, r.y + r.h - 1) };
      if (!used.has(`${p.x},${p.y}`)) { used.add(`${p.x},${p.y}`); return p; }
    }
    return null;
  };
  let n = 0;
  const add = (type, r, extra = {}) => {
    const p = spotIn(r);
    if (p) features.push({ id: `${type}-${++n}`, type, ...p, ...extra });
  };
  if (params.boss) add('boss', last, { boss: params.boss });
  else if (params.stairs) add('stairs', last);
  if (params.heal) add('heal', rooms[Math.min(1, rooms.length - 1)]);
  if (params.shop) add('shop', rooms[0]);
  const middle = rooms.slice(1, -1).length ? rooms.slice(1, -1) : rooms;
  for (let i = 0; i < params.treasure; i++) {
    const r = middle[ri(0, middle.length - 1)];
    const items = params.treasureItems || [];
    const contents = items.length && rng() < 0.5
      ? { item: items[ri(0, items.length - 1)] }
      : { gold: ri(params.treasureGold[0], params.treasureGold[1]) };
    add('treasure', r, { contents });
  }
  return {
    id: params.id,
    name: params.name ?? params.id,
    width: W,
    height: H,
    tiles: grid.map((row) => row.join('')),
    start,
    rooms,
    features,
    encounters: params.encounters,
  };
}

export function isFloor(floor, x, y) {
  return y >= 0 && y < floor.height && x >= 0 && x < floor.width && floor.tiles[y][x] !== '#';
}

// Every floor tile reachable from the start (used by tests and to validate hand edits).
export function reachable(floor) {
  const seen = new Set([`${floor.start.x},${floor.start.y}`]);
  const queue = [floor.start];
  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!seen.has(k) && isFloor(floor, nx, ny)) { seen.add(k); queue.push({ x: nx, y: ny }); }
    }
  }
  return seen;
}
