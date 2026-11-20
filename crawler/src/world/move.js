// Movement rules: edges, keys, one-way and shortcut doors, warps and launchers. Pure.
import { DX, DY, cellAt, edgeAt } from './floor.js';

export function newFlags() {
  return { opened: {}, unlocked: {}, chests: {} };
}

// How an edge behaves right now, given the saved flags: 'open' | 'wall' | 'door' | 'oneway' | 'shortcut' | 'lock'.
export function edgeState(edge, flags) {
  if (edge.type === 'lock' && flags.unlocked[edge.id]) return 'door';
  if (edge.type === 'shortcut' && flags.opened[edge.id]) return 'door';
  return edge.type;
}

/**
 * Try to step from (x, y) travelling `dir`. `inv` is the item bag ({ id: count }) for keys.
 * Mutates `flags` when a lock is opened or a shortcut is lifted.
 * Returns { ok, x, y, edge, door, opened, unlocked, msg }.
 */
export function tryMove(floor, flags, inv, x, y, dir) {
  const edge = edgeAt(floor, x, y, dir);
  const nx = x + DX[dir];
  const ny = y + DY[dir];
  const there = cellAt(floor, nx, ny);
  const blocked = (msg) => ({ ok: false, x, y, edge, msg });
  if (!there || there.solid) return blocked(null);
  switch (edgeState(edge, flags)) {
    case 'open': return { ok: true, x: nx, y: ny, edge };
    case 'wall': return blocked(null);
    case 'door': return { ok: true, x: nx, y: ny, edge, door: true };
    case 'oneway':
      if (dir === edge.dir) return { ok: true, x: nx, y: ny, edge, door: true };
      return blocked("It won't open from this side.");
    case 'shortcut':
      if (dir === edge.dir) {
        flags.opened[edge.id] = true;
        return { ok: true, x: nx, y: ny, edge, door: true, opened: true, msg: 'You lift the bar. A shortcut opens!' };
      }
      return blocked('Barred from the other side.');
    case 'lock':
      if ((inv?.[edge.key] || 0) > 0) {
        flags.unlocked[edge.id] = true;
        return { ok: true, x: nx, y: ny, edge, door: true, unlocked: true, msg: `Unlocked with the ${keyName(edge.key)}.` };
      }
      return blocked(`Locked. It needs the ${keyName(edge.key)}.`);
    default:
      return blocked(null);
  }
}

export const keyName = (id) => id.replace(/_/g, ' ');

/**
 * What happens on arriving at (x, y) on foot: warps and launchers move you on.
 * Returns { moves: [{ x, y, kind: 'warp' | 'slide', dir? }], x, y } — the final cell is (x, y).
 */
export function arrive(floor, flags, x, y) {
  const moves = [];
  let guard = 0;
  let cell = cellAt(floor, x, y);
  while (cell?.feature && guard++ < 64) {
    const f = cell.feature;
    if (f.type === 'warp' && f.to) {
      [x, y] = f.to;
      moves.push({ x, y, kind: 'warp' });
      break; // landing on the paired warp doesn't send you back
    }
    if (f.type !== 'launch') break;
    // Slide until the next edge isn't open floor (doors, walls and rock stop you).
    const d = f.dir;
    let slid = false;
    while (guard++ < 64) {
      const e = edgeAt(floor, x, y, d);
      const n = cellAt(floor, x + DX[d], y + DY[d]);
      if (!n || n.solid || edgeState(e, flags) !== 'open') break;
      x += DX[d];
      y += DY[d];
      slid = true;
      moves.push({ x, y, kind: 'slide', dir: d });
      if (n.feature?.type === 'launch' && n.feature.dir !== d) break; // a launcher turns you
    }
    cell = cellAt(floor, x, y);
    if (!slid || !['launch', 'warp'].includes(cell.feature?.type)) break;
  }
  return { moves, x, y };
}

// Can you see past this edge (for map memory and the "known affinities" of the view)? Doors block sight.
export const seeThrough = (edge, flags) => edgeState(edge, flags) === 'open';
