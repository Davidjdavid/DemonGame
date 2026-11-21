// Automap memory: which cells you've walked and which edges you've seen. Pure; serializable as arrays.
import { cellAt, edgeAt, DX, DY } from './floor.js';
import { edgeState } from './move.js';

export function newMemory() {
  return { cells: new Set(), edges: new Set(), seen: new Set() };
}

export const SIGHT = 4;

/**
 * Record what you can see from (x, y): cells reachable through open edges (doors and walls block sight) within
 * SIGHT steps. The map draws them faded; you learn a room's size but not what's on its floor until you walk it.
 * Dark cells are never seen (and you see nothing from inside one).
 */
export function look(mem, floor, flags, x, y) {
  const start = cellAt(floor, x, y);
  if (!start || start.dark) return;
  const q = [[x, y, 0]];
  const done = new Set([`${x},${y}`]);
  while (q.length) {
    const [cx, cy, dist] = q.shift();
    mem.seen.add(`${cx},${cy}`);
    if (dist >= SIGHT) continue;
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d];
      const ny = cy + DY[d];
      const k = `${nx},${ny}`;
      if (done.has(k)) continue;
      const n = cellAt(floor, nx, ny);
      if (!n || n.solid || n.dark || edgeState(edgeAt(floor, cx, cy, d), flags) !== 'open') continue;
      done.add(k);
      q.push([nx, ny, dist + 1]);
    }
  }
}

// Record standing on (x, y): the cell and its four edges. Dark-zone cells are never mapped.
export function visit(mem, floor, x, y) {
  const c = cellAt(floor, x, y);
  if (!c || c.solid || c.dark) return false;
  const k = `${x},${y}`;
  const fresh = !mem.cells.has(k);
  mem.cells.add(k);
  for (let d = 0; d < 4; d++) mem.edges.add(edgeAt(floor, x, y, d).id);
  return fresh;
}

export const known = (mem, x, y) => mem.cells.has(`${x},${y}`);
export const seen = (mem, x, y) => mem.cells.has(`${x},${y}`) || mem.seen?.has(`${x},${y}`);

export function serializeMemory(mem) {
  return { cells: [...mem.cells], edges: [...mem.edges], seen: [...(mem.seen || [])] };
}

export function loadMemory(data) {
  return { cells: new Set(data?.cells || []), edges: new Set(data?.edges || []), seen: new Set(data?.seen || []) };
}

// Fraction of walkable, non-dark cells mapped (for the map screen).
export function coverage(mem, floor) {
  const total = floor.cells.filter((c) => !c.solid && !c.dark).length;
  return total ? mem.cells.size / total : 1;
}
