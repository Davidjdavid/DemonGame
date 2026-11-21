// Save format: the game object with map memory packed as bitmaps (keeps a full-dungeon save small). Pure.
import { serializeGame, loadGame } from './state.js';

export const SAVE_VERSION = 1;

function pack(list, all) {
  const set = new Set(list);
  let bits = '';
  for (const k of all) bits += set.has(k) ? '1' : '0';
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4).padEnd(4, '0'), 2).toString(16);
  return hex;
}

function unpack(hex, all) {
  const out = [];
  for (let i = 0; i < all.length; i++) {
    const nib = parseInt(hex[i >> 2] || '0', 16);
    if (nib & (8 >> (i & 3))) out.push(all[i]);
  }
  return out;
}

const cellKeys = (f) => f.cells.map((c) => `${c.x},${c.y}`);
const edgeKeys = (f) => [...f.hEdges, ...f.vEdges].map((e) => e.id);

/** game -> plain JSON-safe object. getFloor(id) gives parsed floors for packing. */
export function packSave(game, getFloor) {
  const data = serializeGame(game);
  for (const [id, f] of Object.entries(data.floors)) {
    const fl = getFloor(id);
    f.mem = { c: pack(f.mem.cells, cellKeys(fl)), e: pack(f.mem.edges, edgeKeys(fl)), s: pack(f.mem.seen || [], cellKeys(fl)) };
  }
  data.saveVersion = SAVE_VERSION;
  return data;
}

export function unpackSave(data, getFloor) {
  const copy = JSON.parse(JSON.stringify(data));
  for (const [id, f] of Object.entries(copy.floors)) {
    const fl = getFloor(id);
    if (f.mem && 'c' in f.mem) f.mem = { cells: unpack(f.mem.c, cellKeys(fl)), edges: unpack(f.mem.e, edgeKeys(fl)), seen: unpack(f.mem.s || '', cellKeys(fl)) };
  }
  return loadGame(copy);
}
