// Map runtime (pure): walking a hand-designed map, bumping into entities, doors and keys, switches that drain
// water, stairs between maps, story triggers and random encounters. Rendering lives in src/ui/worldRenderer.js.
import { rollEncounter } from '../dungeon/explore.js';
import { meets, setFlag, hasFlag } from '../story/state.js';

export const WALKABLE = new Set(['.', ',', '=', '"', 'D']);
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const BLOCKING = new Set(['npc', 'demon', 'chest', 'door', 'switch', 'sign', 'spring', 'shop', 'save', 'boss']);

// Persistent per-run world state (plain JSON, saved).
export function newWorld(maps, startMap, rng) {
  const m = maps[startMap];
  return {
    mapId: startMap, x: m.start.x, y: m.start.y, facing: 'down',
    steps: 0, nextEncounter: rollRate(m, rng), lastRow: -1,
    opened: {},   // mapId -> [entity ids] chests opened, doors unlocked, switches pulled
    drained: {},  // mapId -> ["x,y"] water tiles drained to shallow
  };
}

function rollRate(map, rng) {
  if (!map.encounters) return Infinity;
  const [lo, hi] = map.encounters.rate;
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function tileAt(map, world, x, y) {
  if (y < 0 || y >= map.height || x < 0 || x >= map.width) return '#';
  const t = map.tiles[y][x];
  if (t === '~' && (world.drained[map.id] ?? []).includes(`${x},${y}`)) return ',';
  return t;
}

export function isDone(world, mapId, entityId) {
  return (world.opened[mapId] ?? []).includes(entityId);
}

function markDone(world, mapId, entityId) {
  (world.opened[mapId] ||= []);
  if (!world.opened[mapId].includes(entityId)) world.opened[mapId].push(entityId);
}

export function entityAt(map, x, y) {
  return map.entities.find((e) => e.x === x && e.y === y) ?? null;
}

// Does this entity currently block movement? (Open doors and opened chests' tiles stay blocked except doors.)
export function blocks(map, world, e, story) {
  if (!e || !BLOCKING.has(e.type)) return false;
  if (e.type === 'door') return !(isDone(world, map.id, e.id) || (e.flag && hasFlag(story, e.flag)));
  if (e.type === 'npc' && e.hideIf && meets(story, e.hideIf)) return false;
  return true;
}

export function visibleEntities(map, story) {
  return map.entities.filter((e) => !(e.showIf && !meets(story, e.showIf)) && !(e.hideIf && meets(story, e.hideIf)));
}

/**
 * Try to step. Returns { moved, event } where event is null or:
 *  { type: 'interact', entity } (bumped an NPC, chest, door, switch, sign, spring, shop, save, boss)
 *  { type: 'stairs', entity } | { type: 'trigger', entity } | { type: 'encounter', group }
 */
export function step(maps, world, story, dir, rng) {
  const map = maps[world.mapId];
  const [dx, dy] = DIRS[dir];
  world.facing = dir;
  const nx = world.x + dx, ny = world.y + dy;
  const e = visibleEntities(map, story).find((x) => x.x === nx && x.y === ny) ?? null;
  if (e && blocks(map, world, e, story)) return { moved: false, event: { type: 'interact', entity: e } };
  if (!WALKABLE.has(tileAt(map, world, nx, ny))) return { moved: false, event: null };
  world.x = nx;
  world.y = ny;
  world.steps += 1;
  if (e?.type === 'stairs') return { moved: true, event: { type: 'stairs', entity: e } };
  if (e?.type === 'trigger' && !(e.once !== false && isDone(world, map.id, e.id)) && meets(story, e.requires)) {
    markDone(world, map.id, e.id);
    return { moved: true, event: { type: 'trigger', entity: e } };
  }
  if (map.encounters && world.steps >= world.nextEncounter) {
    world.steps = 0;
    world.nextEncounter = rollRate(map, rng);
    const group = rollEncounter({ encounters: map.encounters }, rng, world.lastRow);
    world.lastRow = group.row;
    return { moved: true, event: { type: 'encounter', group } };
  }
  return { moved: true, event: null };
}

// Go through stairs to another map.
export function travel(maps, world, entity, rng) {
  const to = maps[entity.to];
  if (!to) throw new Error(`stairs to unknown map ${entity.to}`);
  world.mapId = to.id;
  world.x = entity.toX ?? entity.x2 ?? to.start.x;
  world.y = entity.toY ?? entity.y2 ?? to.start.y;
  world.steps = 0;
  world.nextEncounter = rollRate(to, rng);
  world.lastRow = -1;
}

// Unlock a door with a key item (player.items) or a flag. Returns { ok, reason }.
export function unlockDoor(map, world, story, player, door) {
  if (isDone(world, map.id, door.id) || (door.flag && hasFlag(story, door.flag))) return { ok: true, already: true };
  if (door.key && (player.items[door.key] ?? 0) > 0) { markDone(world, map.id, door.id); return { ok: true, usedKey: door.key }; }
  if (!door.key && !door.flag) { markDone(world, map.id, door.id); return { ok: true }; }
  return { ok: false, reason: door.lockedText ?? (door.key ? 'Locked. It needs a key.' : 'It won\'t budge. Something else must open it.') };
}

// Pull a switch: sets its flag and drains its water tiles. Returns true the first time.
export function pullSwitch(map, world, story, sw) {
  if (isDone(world, map.id, sw.id)) return false;
  markDone(world, map.id, sw.id);
  if (sw.flag) setFlag(story, sw.flag, true);
  const list = (world.drained[map.id] ||= []);
  for (const [x, y] of sw.drain ?? []) if (!list.includes(`${x},${y}`)) list.push(`${x},${y}`);
  return true;
}

// Open a chest once. Returns its contents, or null if already opened.
export function openChest(map, world, chest) {
  if (isDone(world, map.id, chest.id)) return null;
  markDone(world, map.id, chest.id);
  return chest.contents ?? {};
}
