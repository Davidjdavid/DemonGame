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
    world.steps = 0; // a story beat buys a few quiet steps
    return { moved: true, event: { type: 'trigger', entity: e } };
  }
  if (map.encounters && world.steps >= world.nextEncounter) {
    world.steps = 0;
    world.nextEncounter = rollRate(map, rng);
    const group = capLevels(rollVaried(map, world, rng), world.playerLevel);
    return { moved: true, event: { type: 'encounter', group } };
  }
  return { moved: true, event: null };
}

export const MAX_PER_FLOOR = 2;
export const MAX_ABOVE_PLAYER = 1;
export const MAX_BELOW_PLAYER = 3;
// Random encounters are never more than MAX_ABOVE_PLAYER levels above the protagonist (set world.playerLevel).
export function capLevels(group, playerLevel) {
  if (!playerLevel) return group;
  const out = group.map((g) => ({ ...g, level: Math.min(g.level, playerLevel + MAX_ABOVE_PLAYER) }));
  out.row = group.row;
  return out;
}
// Pick an encounter row, avoiding the last three groups and any demon already met twice on this floor
// (falls back to the whole table when everything is used up).
export function rollVaried(map, world, rng) {
  const seen = ((world.encSeen ||= {})[map.id] ||= {});
  const recent = (world.recentRows ||= []);
  // Groups far below you (MAX_BELOW_PLAYER+ levels under) are skipped: no chores, unless nothing else is left.
  const all = map.encounters.table.map((row, i) => ({ row, i })); // i = the row's index in the map's table
  const fresh = world.playerLevel ? all.filter(({ row }) => Math.max(...row.level) >= world.playerLevel - MAX_BELOW_PLAYER) : all;
  const rows = fresh.length ? fresh : all;
  const ok = rows.filter(({ row, i }) => !recent.includes(`${map.id}:${i}`) && row.ids.every((id) => (seen[id] ?? 0) < MAX_PER_FLOOR));
  const pool = ok.length ? ok : rows.filter(({ i }) => !recent.includes(`${map.id}:${i}`));
  const use = pool.length ? pool : rows;
  const group = rollEncounter({ encounters: { table: use.map((u) => u.row) } }, rng, -1);
  const realRow = use[group.row].i;
  for (const g of group) seen[g.id] = (seen[g.id] ?? 0) + 1;
  recent.push(`${map.id}:${realRow}`);
  if (recent.length > 3) recent.shift();
  world.lastRow = realRow;
  return group;
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
  if (door.key && (player.items[door.key] ?? 0) > 0) {
    markDone(world, map.id, door.id);
    if (--player.items[door.key] <= 0) delete player.items[door.key]; // a used key leaves your bag
    return { ok: true, usedKey: door.key };
  }
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
