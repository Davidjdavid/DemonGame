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
    const group = rollEncounter(floor, rng, ex.lastRow ?? -1);
    ex.lastRow = group.row;
    return { moved: true, event: { type: 'encounter', group } };
  }
  return { moved: true, event: null };
}

// Pick a row of the floor's encounter table by weight, never the same row twice in a row (variety).
// Returns the group (an array of { id, level }) with a non-enumerable-ish `row` index attached.
export function rollEncounter(floor, rng, avoidRow = -1) {
  const table = floor.encounters.table;
  const rows = table.map((e, i) => ({ e, i })).filter(({ i }) => table.length < 2 || i !== avoidRow);
  const total = rows.reduce((s, r) => s + r.e.weight, 0);
  let r = rng() * total;
  let pick = rows[rows.length - 1];
  for (const row of rows) {
    if ((r -= row.e.weight) <= 0) { pick = row; break; }
  }
  const group = pick.e.ids.map((id) => ({ id, level: pick.e.level[0] + Math.floor(rng() * (pick.e.level[1] - pick.e.level[0] + 1)) }));
  Object.defineProperty(group, 'row', { value: pick.i, enumerable: false });
  return group;
}
