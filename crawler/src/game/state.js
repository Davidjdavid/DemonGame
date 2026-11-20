// Game state for exploration (pure): position, per-floor flags + map memory, inventory, step counters.
import { newFlags } from '../world/move.js';
import { newMemory, serializeMemory, loadMemory } from '../world/mapMemory.js';

export function newGame({ floor, seed = 1 }) {
  const [x, y, dir] = floor.start;
  return {
    version: 1,
    seed,
    pos: { floor: floor.id, x, y, dir },
    floors: {},
    inv: {},
    steps: 0,
    settings: { minimap: false },
  };
}

export function floorState(game, id) {
  return (game.floors[id] ||= { flags: newFlags(), mem: newMemory() });
}

export function addItem(game, id, n = 1) {
  game.inv[id] = (game.inv[id] || 0) + n;
}

export function serializeGame(game) {
  const floors = {};
  for (const [id, f] of Object.entries(game.floors)) floors[id] = { flags: f.flags, mem: serializeMemory(f.mem) };
  return JSON.parse(JSON.stringify({ ...game, floors }));
}

export function loadGame(data) {
  const game = JSON.parse(JSON.stringify(data));
  for (const f of Object.values(game.floors)) f.mem = loadMemory(f.mem);
  return game;
}
