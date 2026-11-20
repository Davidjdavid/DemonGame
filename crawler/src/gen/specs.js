// Example floor specs for the generator (one gimmick introduced per floor, then combined). Pure data.
// Fields: see generator.js normalizeSpec. `key` is the short label used by `gen-floors.mjs --only=3F`.
// Encounters are a placeholder copied from the test floor so a candidate can be dropped in and played.
const ENC = { table: ['slime', 'gnawer', 'wisp', 'dustmoth', 'husk', 'imp'], level: [1, 3], size: [1, 2], rate: [15, 30] };

export const FLOOR_SPECS = [
  { key: '1F', id: 'f1', name: '1F Draft', depth: 1, w: 10, h: 10, gimmicks: ['door'],
    shortcuts: 1, chests: 3, loops: 1, deadEnds: 3 },
  { key: '2F', id: 'f2', name: '2F Draft', depth: 2, w: 12, h: 12, gimmicks: ['door', 'oneway'],
    oneways: 2, shortcuts: 1, chests: 4, loops: 2, deadEnds: 4 },
  { key: '3F', id: 'f3', name: '3F Draft', depth: 3, w: 13, h: 13, gimmicks: ['door', 'oneway', 'dark'],
    oneways: 1, shortcuts: 1, chests: 4, loops: 2, deadEnds: 4 },
  { key: '4F', id: 'f4', name: '4F Draft', depth: 4, w: 15, h: 15, gimmicks: ['door', 'warp'],
    warpPairs: 2, shortcuts: 2, chests: 5, loops: 2, deadEnds: 5 },
  { key: '5F', id: 'f5', name: '5F Draft', depth: 5, w: 16, h: 16, gimmicks: ['door', 'launch', 'oneway'],
    lanes: 2, oneways: 1, shortcuts: 2, chests: 5, loops: 3, deadEnds: 5 },
  { key: '6F', id: 'f6', name: '6F Draft', depth: 6, w: 18, h: 18, gimmicks: ['door', 'oneway', 'dark', 'warp', 'launch', 'lock'],
    oneways: 2, warpPairs: 1, lanes: 1, keys: ['brass_key'], shortcuts: 2, chests: 6, loops: 3, deadEnds: 6 },
  { key: '7F', id: 'f7', name: '7F Draft', depth: 7, w: 20, h: 20, boss: true,
    gimmicks: ['door', 'oneway', 'dark', 'warp', 'lock'],
    oneways: 2, warpPairs: 1, keys: ['iron_key'], shortcuts: 2, chests: 6, loops: 3, deadEnds: 6 },
].map((s) => ({ ...s, encounters: ENC }));

export const specByKey = (k) => FLOOR_SPECS.find((s) => s.key.toLowerCase() === String(k).toLowerCase() || s.id === k);
