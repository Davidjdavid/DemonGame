// Floor parser and edge lookup (format: world/README.md). Pure.
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export const DIR_NAMES = ['N', 'E', 'S', 'W'];
export const opposite = (d) => (d + 2) % 4;

const ARROW_DIR = { '^': 0, '>': 1, v: 2, '<': 3 };
const SHORTCUT_DIR = { n: 0, e: 1, s: 2, w: 3 };
const FIXED_CELLS = {
  '.': null,
  U: { type: 'stairs', dir: 'up' },
  D: { type: 'stairs', dir: 'down' },
  X: { type: 'exit' },
  R: { type: 'save' },
  H: { type: 'heal' },
  '!': { type: 'warn' },
  B: { type: 'boss' },
};

function parseEdge(ch, id, src, vertical) {
  if (ch === ' ' || ch === undefined) return { id, type: 'open' };
  if (ch === '-' || ch === '|' || ch === '+' || ch === '#') return { id, type: 'wall' };
  if (ch === 'd') return { id, type: 'door' };
  if (ch in ARROW_DIR) {
    const dir = ARROW_DIR[ch];
    if (vertical !== (dir === 1 || dir === 3)) throw new Error(`${src.id}: arrow ${ch} on wrong edge ${id}`);
    return { id, type: 'oneway', dir };
  }
  if (ch in SHORTCUT_DIR) {
    const dir = SHORTCUT_DIR[ch];
    if (vertical !== (dir === 1 || dir === 3)) throw new Error(`${src.id}: shortcut ${ch} on wrong edge ${id}`);
    return { id, type: 'shortcut', dir };
  }
  if (/[A-Z]/.test(ch)) {
    const key = src.locks?.[ch];
    if (!key) throw new Error(`${src.id}: lock ${ch} at ${id} has no key in locks`);
    return { id, type: 'lock', key };
  }
  throw new Error(`${src.id}: unknown edge char '${ch}' at ${id}`);
}

function inRect(x, y, r) {
  return x >= r[0] && y >= r[1] && x <= r[2] && y <= r[3];
}

export function parseFloor(src) {
  const lines = src.map;
  const h = (lines.length - 1) / 2;
  const w = (Math.max(...lines.map((l) => l.length)) - 1) / 2;
  if (!Number.isInteger(h) || !Number.isInteger(w)) throw new Error(`${src.id}: map must be (2h+1) x (2w+1)`);
  const at = (r, c) => (lines[r] ?? '')[c] ?? ' ';
  const cells = [];
  const warpCells = {};
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = at(2 * y + 1, 2 * x + 1);
      const solid = ch === ' ' || ch === '#';
      let feature = null;
      if (!solid) {
        if (ch in FIXED_CELLS) feature = FIXED_CELLS[ch] && { ...FIXED_CELLS[ch] };
        else if (/[1-9]/.test(ch)) {
          feature = { type: 'warp', id: ch, to: null };
          (warpCells[ch] ||= []).push([x, y]);
        } else if (ch in ARROW_DIR) feature = { type: 'launch', dir: ARROW_DIR[ch] };
        else if (src.legend?.[ch]) feature = { ...src.legend[ch] };
        else throw new Error(`${src.id}: unknown cell char '${ch}' at ${x},${y}`);
        if (feature && (feature.type === 'chest' || feature.type === 'key')) feature.id = `${src.id}:${x},${y}`;
      }
      let area = -1;
      (src.areas || []).forEach((a, i) => { if (inRect(x, y, a.rect)) area = i; });
      cells.push({
        x, y, solid, feature,
        dark: !solid && (src.dark || []).some((r) => inRect(x, y, r)),
        area,
        color: area >= 0 ? src.areas[area].color : (src.color || '#6b6f78'),
        areaName: area >= 0 ? src.areas[area].name : null,
      });
    }
  }
  // Warp pairs: two cells with the same digit lead to each other (warps[d].oneway: only the first leads to the second).
  for (const [d, list] of Object.entries(warpCells)) {
    if (list.length !== 2) throw new Error(`${src.id}: warp ${d} needs exactly 2 cells, has ${list.length}`);
    const [a, b] = list;
    cells[a[1] * w + a[0]].feature.to = b;
    cells[b[1] * w + b[0]].feature.to = src.warps?.[d]?.oneway ? null : a;
  }
  const hEdges = [];
  for (let y = 0; y <= h; y++) {
    for (let x = 0; x < w; x++) hEdges.push(parseEdge(at(2 * y, 2 * x + 1), `h${x},${y}`, src, false));
  }
  const vEdges = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x <= w; x++) vEdges.push(parseEdge(at(2 * y + 1, 2 * x), `v${x},${y}`, src, true));
  }
  const floor = { id: src.id, name: src.name, depth: src.depth ?? 0, w, h, start: src.start, cells, hEdges, vEdges, src };
  // Edges next to rock or the map border are walls whatever the map says.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d];
        const ny = y + DY[d];
        const here = cellAt(floor, x, y);
        const there = cellAt(floor, nx, ny);
        if (here.solid || !there || there.solid) {
          const e = edgeAt(floor, x, y, d);
          if (e.type !== 'wall') { e.type = 'wall'; delete e.dir; delete e.key; }
        }
      }
    }
  }
  return floor;
}

export function cellAt(floor, x, y) {
  if (x < 0 || y < 0 || x >= floor.w || y >= floor.h) return null;
  return floor.cells[y * floor.w + x];
}

export function edgeAt(floor, x, y, d) {
  const { w } = floor;
  switch (d) {
    case 0: return floor.hEdges[y * w + x];
    case 2: return floor.hEdges[(y + 1) * w + x];
    case 3: return floor.vEdges[y * (w + 1) + x];
    case 1: return floor.vEdges[y * (w + 1) + x + 1];
    default: throw new Error(`bad dir ${d}`);
  }
}

// Both cells an edge separates (either may be null at the border).
export function edgeCells(floor, edge) {
  const [x, y] = edge.id.slice(1).split(',').map(Number);
  if (edge.id[0] === 'h') return [[x, y - 1], [x, y]];
  return [[x - 1, y], [x, y]];
}

export const findFeature = (floor, pred) => floor.cells.filter((c) => c.feature && pred(c.feature));
