// Reference autotiler for the CC0 Kenney sheets mapped in src/data/tiles.json. Pure (no DOM): given a way to
// read the map legend, it returns the tile NAME to draw for one cell, or null to fall back to the plain legend
// tile. The engine can copy this into src/ (e.g. src/world/autotile.js) or import it as is.
//
//   autotileName(get, x, y, tileset) -> string | null
//     get(x, y)  legend char at (x, y), or null outside the map (use the runtime char, so drained water updates)
//     tileset    "town" | "dungeon"
//
// Rules (see "autotile" in tiles.json for the same in words):
// - dungeon '#' (and 'H'): a wall with floor directly south is a FACE (brick); other walls are wall TOPS with a
//   stone rim drawn toward any "open" neighbour (floor or face); diagonal-only openings get the corner rims.
// - dungeon '.': shadow under a face (north) or beside a wall (west), else floor with a little variety.
// - town '~': lake shores from the 4 neighbours, inner corners from the diagonals, 1-wide rivers.
// - town 'H'/'D': house blocks: bottom row is the wall (ends, windows, doors), rows above are roof.
// - town '#': fences joined to their neighbours. '=' bridges turn to cross the water.

const hash = (x, y) => (((x * 73856093) ^ (y * 19349663) ^ 0x5bd1e995) >>> 0) % 100;

function dungeonWall(get, x, y) {
  const wall = (cx, cy) => { const c = get(cx, cy); return c === null || c === '#' || c === 'H'; };
  const face = (cx, cy) => wall(cx, cy) && !wall(cx, cy + 1) && get(cx, cy + 1) !== null;
  const open = (cx, cy) => !wall(cx, cy) || face(cx, cy);
  if (face(x, y)) {
    const w = !wall(x - 1, y), e = !wall(x + 1, y);
    if (w && e) return 'wall_face_single';
    if (w) return 'wall_face_l';
    if (e) return 'wall_face_r';
    return hash(x, y) < 6 ? 'wall_grate' : 'wall';
  }
  const n = open(x, y - 1), s = open(x, y + 1), e = open(x + 1, y), w = open(x - 1, y);
  if (n && w) return 'wall_inner_nw';
  if (n && e) return 'wall_inner_ne';
  if (s && w) return 'wall_inner_sw';
  if (s && e) return 'wall_inner_se';
  if (s) return 'wall_cap';
  if (n) return 'wall_edge_n';
  if (e) return 'wall_edge_e';
  if (w) return 'wall_edge_w';
  if (open(x + 1, y + 1)) return 'wall_corner_se';
  if (open(x - 1, y + 1)) return 'wall_corner_sw';
  if (open(x + 1, y - 1)) return 'wall_corner_ne';
  if (open(x - 1, y - 1)) return 'wall_corner_nw';
  return 'wall_top';
}

function dungeonFloor(get, x, y) {
  const wall = (cx, cy) => { const c = get(cx, cy); return c === null || c === '#' || c === 'H'; };
  if (wall(x, y - 1)) return 'floor_shadow';
  if (wall(x - 1, y)) return 'floor_shadow_w';
  if (wall(x - 1, y - 1)) return 'floor_shadow_corner';
  return hash(x, y) < 18 ? 'floor2' : 'floor';
}

function townWater(get, x, y) {
  const wet = (cx, cy) => { const c = get(cx, cy); return c === null || c === '~' || c === ',' || c === '='; };
  const n = !wet(x, y - 1), s = !wet(x, y + 1), e = !wet(x + 1, y), w = !wet(x - 1, y);
  if (n && s && !e && !w) return 'water_river_h';
  if (e && w && !n && !s) return 'water_river_v';
  if (n && w) return 'water_nw';
  if (n && e) return 'water_ne';
  if (s && w) return 'water_sw';
  if (s && e) return 'water_se';
  if (n) return 'water_n';
  if (s) return 'water_s';
  if (w) return 'water_w';
  if (e) return 'water_e';
  if (!wet(x + 1, y - 1)) return 'water_inner_ne';
  if (!wet(x - 1, y - 1)) return 'water_inner_nw';
  if (!wet(x + 1, y + 1)) return 'water_inner_se';
  if (!wet(x - 1, y + 1)) return 'water_inner_sw';
  return 'water';
}

function house(get, x, y) {
  const isH = (cx, cy) => { const c = get(cx, cy); return c === 'H' || c === 'D'; };
  // Style per house block, from its top-left cell: red roof + stone walls, or grey roof + wood walls.
  let lx = x, ty = y;
  while (isH(lx - 1, y)) lx--;
  while (isH(lx, ty - 1)) ty--;
  const red = hash(lx, ty) % 2 === 0;
  const l = !isH(x - 1, y), r = !isH(x + 1, y);
  if (!isH(x, y + 1)) {
    const wallSet = red ? 'stone_house_' : 'house_';
    if (get(x, y) === 'D') return wallSet + 'door';
    if (l) return wallSet + 'wall_l';
    if (r) return wallSet + 'wall_r';
    const nearDoor = get(x - 1, y) === 'D' || get(x + 1, y) === 'D';
    return !nearDoor && (x - lx) % 3 === 1 ? wallSet + 'window' : wallSet + 'wall';
  }
  const roof = red ? 'house_roof' : 'roof2';
  const low = !isH(x, y + 2) ? '_low' : '';
  if (low && r) return roof + '_gable';
  return roof + low + (l ? '_l' : r ? '_r' : '');
}

function fence(get, x, y) {
  const f = (cx, cy) => get(cx, cy) === '#';
  const n = f(x, y - 1), s = f(x, y + 1), e = f(x + 1, y), w = f(x - 1, y);
  if (s && e && !n && !w) return 'fence_nw';
  if (s && w && !n && !e) return 'fence_ne';
  if (n && e && !s && !w) return 'fence_sw';
  if (n && w && !s && !e) return 'fence_se';
  if (e || w) return e && w ? 'fence' : e ? 'fence_l' : 'fence_r';
  if (n || s) return n && s ? 'fence_v' : s ? 'fence_v_top' : 'fence_v_bottom';
  return 'fence_v_top';
}

export function autotileName(get, x, y, tileset) {
  const c = get(x, y);
  const wet = (cx, cy) => { const k = get(cx, cy); return k === '~' || k === ','; };
  if (c === '=') return wet(x, y - 1) || wet(x, y + 1) ? 'bridge_h' : 'bridge';
  if (tileset === 'dungeon') {
    if (c === '#' || c === 'H') return dungeonWall(get, x, y);
    if (c === '.') return dungeonFloor(get, x, y);
    if (c === '~') return get(x, y - 1) !== '~' && get(x, y - 1) !== null ? 'water_dungeon_n' : 'water_dungeon';
    if (c === ',') return 'water_shallow';
    return null;
  }
  if (c === '~') return townWater(get, x, y);
  if (c === ',') return 'water_shallow_grass';
  if (c === 'H' || c === 'D') return house(get, x, y);
  if (c === '#') return fence(get, x, y);
  if (c === '"') { const h = hash(x, y); return h < 70 ? 'grass' : h < 92 ? 'grass2' : 'grass_flowers'; }
  if (c === 'T') return hash(x, y) < 85 ? 'tree' : 'bush';
  if (c === '.') return townDirt(get, x, y);
  return null;
}

// Town streets: dirt that blends into neighbouring grass (edges, outer and inner corners).
function townDirt(get, x, y) {
  const g = (cx, cy) => { const k = get(cx, cy); return k === '"' || k === 'T'; };
  const n = g(x, y - 1), s = g(x, y + 1), w = g(x - 1, y), e = g(x + 1, y);
  if (n && w) return 'dirt_nw';
  if (n && e) return 'dirt_ne';
  if (s && w) return 'dirt_sw';
  if (s && e) return 'dirt_se';
  if (n) return 'dirt_n';
  if (s) return 'dirt_s';
  if (w) return 'dirt_w';
  if (e) return 'dirt_e';
  if (g(x - 1, y - 1)) return 'dirt_inner_nw';
  if (g(x + 1, y - 1)) return 'dirt_inner_ne';
  if (g(x - 1, y + 1)) return 'dirt_inner_sw';
  if (g(x + 1, y + 1)) return 'dirt_inner_se';
  return 'dirt';
}

// What to draw under a cell's tile (transparent tiles: trees, fences, doorways, objects).
export function underName(get, x, y, tileset) {
  if (tileset === 'dungeon') return 'floor';
  return 'grass';
}
