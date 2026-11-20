// Automap memory: which cells you've walked and which edges you've seen. Pure; serializable as arrays.
import { cellAt, edgeAt } from './floor.js';

export function newMemory() {
  return { cells: new Set(), edges: new Set() };
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

export function serializeMemory(mem) {
  return { cells: [...mem.cells], edges: [...mem.edges] };
}

export function loadMemory(data) {
  return { cells: new Set(data?.cells || []), edges: new Set(data?.edges || []) };
}

// Fraction of walkable, non-dark cells mapped (for the map screen).
export function coverage(mem, floor) {
  const total = floor.cells.filter((c) => !c.solid && !c.dark).length;
  return total ? mem.cells.size / total : 1;
}
