// Walking a floor: movement, step-count random encounters, features. Pure; rng passed in.
import { isFloor } from './generator.js';

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function startFloor(floor, rng, { opened = [], bossDefeated = false } = {}) {
  return {
    floorId: floor.id,
    x: floor.start.x,
    y: floor.start.y,
    steps: 0,
    nextEncounter: rollRate(floor, rng),
    opened: [...opened],
    bossDefeated,
    seen: [],
  };
}

function rollRate(floor, rng) {
  const [lo, hi] = floor.encounters.rate;
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function featureAt(floor, x, y) {
  return floor.features.find((f) => f.x === x && f.y === y) ?? null;
}

/**
 * Try to move. Returns { moved, event } where event is null or one of:
 *   { type: 'encounter', group: [{ id, level }] } | { type: 'treasure'|'heal'|'shop'|'stairs'|'boss', feature }
 */
export function move(floor, ex, dir, rng) {
  const [dx, dy] = DIRS[dir] ?? [0, 0];
  const nx = ex.x + dx, ny = ex.y + dy;
  if (!isFloor(floor, nx, ny)) return { moved: false, event: null };
  ex.x = nx;
  ex.y = ny;
  ex.steps += 1;
  const f = featureAt(floor, nx, ny);
  if (f) {
    if (f.type === 'treasure' && ex.opened.includes(f.id)) return { moved: true, event: null };
    if (f.type === 'boss' && ex.bossDefeated) return { moved: true, event: { type: 'stairs', feature: f } };
    return { moved: true, event: { type: f.type, feature: f } };
  }
  if (ex.steps >= ex.nextEncounter) {
    ex.steps = 0;
    ex.nextEncounter = rollRate(floor, rng);
    return { moved: true, event: { type: 'encounter', group: rollEncounter(floor, rng) } };
  }
  return { moved: true, event: null };
}

export function rollEncounter(floor, rng) {
  const table = floor.encounters.table;
  const total = table.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  let row = table[table.length - 1];
  for (const e of table) {
    if ((r -= e.weight) <= 0) { row = e; break; }
  }
  return row.ids.map((id) => ({ id, level: row.level[0] + Math.floor(rng() * (row.level[1] - row.level[0] + 1)) }));
}
