// Builds the CC0 Kenney art and sounds used by the world and battle screens, and writes src/data/tiles.json.
//
//   node scripts/assets/fetch-kenney.mjs <dir>          (download + unzip the packs, see that file)
//   node scripts/assets/build-tiles.mjs <dir> [--check <out.png>] [--no-sfx] [--no-fx]
//
// <dir> holds one unzipped folder per pack (tiny-town/, tiny-dungeon/, ...). Outputs:
//   assets/tiles/{town,dungeon,farm}.png   Kenney packed tilemaps, copied byte for byte (16px, no spacing/margin)
//   assets/tiles/water.png                 Tiny Battle water/shore tiles (cols 0-4, rows 0-5 of its sheet)
//   assets/tiles/extra.png                 tiles derived here from the packs (rotations, blends, recolours, levers)
//   assets/fx/<element>.png                Particle Pack textures tinted per element, 128px
//   assets/sfx/<name>.ogg                  Kenney sound packs (a few joined with ffmpeg)
//   src/data/tiles.json                    names -> { sheet, col, row } (+ notes and autotile rules)
//   assets/credits.json                    one entry per pack (upserted; other entries untouched)
// --check renders a sample map with the names (and the autotiler in ./autotile.mjs) to eyeball coordinates.
import sharp from 'sharp';
import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { autotileName } from './autotile.mjs';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const KDIR = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv[0]) : null;
if (!KDIR) {
  console.error('usage: node scripts/assets/build-tiles.mjs <kenney-dir> [--check out.png] [--no-sfx] [--no-fx]');
  process.exit(1);
}
const T = 16;
const out = (...p) => path.join(root, ...p);
const pack = (...p) => path.join(KDIR, ...p);

// ---------- raw RGBA image helpers ----------
async function load(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, d: Buffer.from(data) };
}
const blank = (w, h) => ({ w, h, d: Buffer.alloc(w * h * 4) });
function crop(img, x, y, w, h) {
  const o = blank(w, h);
  for (let j = 0; j < h; j++) img.d.copy(o.d, j * w * 4, ((y + j) * img.w + x) * 4, ((y + j) * img.w + x + w) * 4);
  return o;
}
const cell = (img, c, r, size = T) => crop(img, c * size, r * size, size, size);
function blit(dst, src, dx = 0, dy = 0, op = 1) {
  for (let j = 0; j < src.h; j++) {
    for (let i = 0; i < src.w; i++) {
      const x = dx + i, y = dy + j;
      if (x < 0 || y < 0 || x >= dst.w || y >= dst.h) continue;
      const s = (j * src.w + i) * 4, d = (y * dst.w + x) * 4;
      const a = (src.d[s + 3] / 255) * op;
      if (a <= 0) continue;
      const da = dst.d[d + 3] / 255, oa = a + da * (1 - a);
      for (let k = 0; k < 3; k++) dst.d[d + k] = Math.round((src.d[s + k] * a + dst.d[d + k] * da * (1 - a)) / oa);
      dst.d[d + 3] = Math.round(oa * 255);
    }
  }
  return dst;
}
function rotate(img, cw = true) {
  const o = blank(img.h, img.w);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const nx = cw ? img.h - 1 - y : y, ny = cw ? x : img.w - 1 - x;
      img.d.copy(o.d, (ny * o.w + nx) * 4, (y * img.w + x) * 4, (y * img.w + x) * 4 + 4);
    }
  }
  return o;
}
function mapPx(img, fn) {
  const o = blank(img.w, img.h);
  for (let p = 0; p < img.w * img.h; p++) {
    const v = fn(img.d[p * 4], img.d[p * 4 + 1], img.d[p * 4 + 2], img.d[p * 4 + 3], p % img.w, Math.floor(p / img.w));
    for (let k = 0; k < 4; k++) o.d[p * 4 + k] = Math.max(0, Math.min(255, Math.round(v[k])));
  }
  return o;
}
const clone = (img) => ({ w: img.w, h: img.h, d: Buffer.from(img.d) });
async function save(img, file) {
  await mkdir(path.dirname(file), { recursive: true });
  await sharp(img.d, { raw: { width: img.w, height: img.h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);
}
// Nearest colour of `palette` (RGB arrays), for recolouring borrowed sprites into the Tiny palette.
function nearest(palette, r, g, b) {
  let best = palette[0], bd = Infinity;
  for (const p of palette) {
    const dd = (p[0] - r) ** 2 * 0.3 + (p[1] - g) ** 2 * 0.59 + (p[2] - b) ** 2 * 0.11;
    if (dd < bd) { bd = dd; best = p; }
  }
  return best;
}
function paletteOf(img) {
  const seen = new Map();
  for (let p = 0; p < img.w * img.h; p++) {
    if (img.d[p * 4 + 3] < 255) continue;
    const key = (img.d[p * 4] << 16) | (img.d[p * 4 + 1] << 8) | img.d[p * 4 + 2];
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen].filter(([, n]) => n >= 4).map(([k]) => [k >> 16, (k >> 8) & 255, k & 255]);
}

// ---------- sheets ----------
const SRC = {
  town: pack('tiny-town/Tilemap/tilemap_packed.png'),
  dungeon: pack('tiny-dungeon/Tilemap/tilemap_packed.png'),
  farm: pack('tiny-farm/Tilemap/tilemap_packed.png'),
  battle: pack('tiny-battle/Tilemap/tilemap_packed.png'),
  platformer: pack('pixel-platformer/Tilemap/tilemap_packed.png'),
};
const img = {};
for (const [k, f] of Object.entries(SRC)) img[k] = await load(f);
img.water = crop(img.battle, 0, 0, 5 * T, 6 * T);

// ---------- names ----------
// [col, row] per sheet. Object tiles (trees, props, characters, doors on walls) have transparent backgrounds:
// draw the ground tile first.
const NAMES = {
  town: {
    grass: [0, 0], grass2: [1, 0], grass_flowers: [2, 0],
    dirt_nw: [0, 1], dirt_n: [1, 1], dirt_ne: [2, 1], dirt_w: [0, 2], dirt: [1, 2], dirt_e: [2, 2],
    dirt_sw: [0, 3], dirt_s: [1, 3], dirt_se: [2, 3],
    dirt_inner_nw: [3, 3], dirt_inner_ne: [4, 3], dirt_inner_se: [5, 3], dirt_inner_sw: [6, 3],
    path: [7, 3],
    tree: [4, 2], tree2: [3, 2], tree_tall_top: [4, 0], tree_tall: [4, 1], tree2_tall_top: [3, 0], tree2_tall: [3, 1],
    bush: [5, 0], sprout: [5, 1], mushrooms: [5, 2],
    roof2_l: [0, 4], roof2: [1, 4], roof2_r: [2, 4], roof2_dormer: [3, 4],
    roof2_low_l: [0, 5], roof2_low: [1, 5], roof2_low_r: [2, 5], roof2_gable: [3, 5],
    house_roof_l: [4, 4], house_roof: [5, 4], house_roof_r: [6, 4], house_roof_dormer: [7, 4],
    house_roof_low_l: [4, 5], house_roof_low: [5, 5], house_roof_low_r: [6, 5], house_roof_gable: [7, 5],
    house_wall_l: [0, 6], house_wall: [1, 6], house_doorway: [2, 6], house_wall_r: [3, 6],
    house_window: [0, 7], house_door: [1, 7],
    stone_house_wall_l: [4, 6], stone_house_wall: [5, 6], stone_house_doorway: [6, 6], stone_house_wall_r: [7, 6],
    stone_house_window: [4, 7], stone_house_door: [5, 7],
    fence_nw: [8, 3], fence_n: [9, 3], fence_ne: [10, 3], fence_w: [8, 4], fence_e: [10, 4],
    fence_sw: [8, 5], fence_gate: [9, 5], fence_se: [10, 5],
    fence_l: [8, 6], fence: [9, 6], fence_r: [10, 6], fence_v_top: [11, 3], fence_v: [11, 4], fence_v_bottom: [11, 5],
    sign: [11, 6], well_top: [8, 7], well: [8, 8],
    coin: [9, 7], beehive: [10, 7], target: [11, 7], bomb: [9, 8], log: [10, 8], sack: [11, 8],
    pickaxe: [7, 9], pitchfork: [8, 9], key: [9, 9], bow: [10, 9], arrow: [11, 9],
    axe: [7, 10], hammer: [8, 10], sickle: [9, 10], tub: [10, 10], tub_water: [11, 10],
    plaza_nw: [0, 8], plaza_n: [1, 8], plaza_ne: [2, 8], plaza_w: [0, 9], plaza: [1, 9], plaza_e: [2, 9],
    plaza_sw: [0, 10], plaza_s: [1, 10], plaza_se: [2, 10],
    bridge_h: [4, 8], battlement_l: [3, 8], battlement: [4, 8], battlement_r: [5, 8], battlement_single: [6, 8], tower_door: [7, 8],
    gate_tl: [3, 9], gate_tr: [4, 9], gate_bl: [3, 10], gate_br: [4, 10], arch_l: [5, 9], arch_r: [6, 9],
    castle_window: [5, 10], castle_wall: [6, 10],
  },
  water: {
    water: [1, 2], water_nw: [0, 1], water_n: [1, 1], water_ne: [2, 1], water_w: [0, 2], water_e: [2, 2],
    water_sw: [0, 3], water_s: [1, 3], water_se: [2, 3],
    water_inner_nw: [0, 5], water_inner_ne: [1, 5], water_inner_se: [2, 5], water_inner_sw: [3, 5],
    water_river_v: [3, 3],
    pond_nw: [3, 0], pond_ne: [4, 0], pond_sw: [3, 1], pond_se: [4, 1],
  },
  dungeon: {
    wall: [4, 3], wall2: [2, 1], wall_grate: [4, 2], wall_banner: [5, 2],
    wall_face_l: [9, 4], wall_face_single: [10, 4], wall_face_r: [11, 4],
    wall_top: [0, 0], wall_cap: [2, 0], wall_edge_e: [1, 1], wall_edge_w: [3, 1], wall_edge_n: [2, 2],
    wall_corner_se: [1, 0], wall_corner_sw: [3, 0], wall_corner_ne: [1, 2], wall_corner_nw: [3, 2],
    wall_inner_nw: [4, 0], wall_inner_ne: [5, 0], wall_inner_sw: [4, 1], wall_inner_se: [5, 1],
    wall_holes: [0, 1], wall_rubble: [0, 2],
    floor: [0, 4], floor2: [1, 4], floor_shadow: [2, 4], floor_shadow2: [3, 4], floor_shadow_corner: [5, 4],
    floor_pillar_base: [6, 2], rubble: [6, 3],
    stairs: [3, 3], stairs_up: [3, 3], stairs_wide_l: [0, 3], stairs_wide: [1, 3], stairs_wide_r: [2, 3],
    doorway: [9, 0], door_open: [9, 1], door_ajar: [9, 2], door_closed: [9, 3],
    double_doorway_l: [10, 0], double_doorway_r: [11, 0], double_door_open_l: [10, 1], double_door_open_r: [11, 1],
    double_door_l: [10, 3], double_door_r: [11, 3],
    chest_closed: [6, 7], chest_open: [7, 7], chest_closed2: [5, 7], mimic: [8, 7],
    statue_top: [6, 0], statue: [6, 1],
    spout: [7, 0], gargoyle: [7, 1], fountain_dry: [7, 2], fountain_dry_base: [7, 3],
    spout_water: [8, 0], gargoyle_water: [8, 1], fountain: [8, 2], spring: [8, 2], fountain_base: [8, 3],
    altar: [5, 3], coffin: [6, 5], grave_cross: [4, 5], gravestone: [5, 5], shelf_top: [3, 5], shelf: [3, 6],
    barrel: [7, 5], bars_l: [4, 6], bars: [5, 6], bars_r: [6, 6], table: [0, 6], stool: [1, 6], anvil: [2, 6],
    cursor: [0, 5],
    hero: [1, 8], shopkeeper: [2, 7],
    npc_1: [0, 7], npc_2: [4, 8], npc_3: [3, 8], npc_4: [0, 8], npc_5: [3, 7], npc_6: [4, 9], npc_8: [3, 9],
    npc_9: [1, 7], npc_10: [4, 7], npc_12: [2, 8],
    monster_1: [2, 9], monster_2: [1, 9], monster_3: [0, 9], monster_4: [1, 10], monster_5: [0, 10],
    monster_6: [2, 10], monster_7: [3, 10], monster_8: [4, 10],
    shield_round: [5, 8], shield: [6, 8], dagger: [7, 8], sword: [8, 8], sword_wide: [10, 8],
    potion_grey: [5, 9], potion_green: [6, 9], potion_red: [7, 9], potion_blue: [8, 9],
    vial_grey: [5, 10], vial_green: [6, 10], vial_red: [7, 10], vial_blue: [8, 10],
    war_hammer: [9, 9], battle_axe: [10, 9], staff: [9, 10], wand: [10, 10], spear: [11, 10],
  },
  farm: {
    npc_7: [1, 9], npc_11: [0, 9],
    crate: [4, 6], barrel2: [1, 7], bucket: [0, 6], bucket_water: [1, 6], sack2: [2, 6],
    hay: [0, 8], hay2: [1, 8], trough_l: [2, 8], trough_r: [3, 8], trough_water_l: [2, 9], trough_water_r: [3, 9],
    rock: [5, 7], rocks: [5, 6], pine: [3, 2], sunflower: [11, 6], sheep: [0, 10], cow: [1, 10], chicken: [2, 10],
    crate_carrots: [11, 0], crate_turnips: [11, 1], crate_corn: [11, 2], crate_tomatoes: [11, 3],
    crate_cabbage: [11, 4], crate_wheat: [11, 5],
  },
};

const NOTES = {
  hero: 'adult man, knight in steel armour with the visor up, brown hair; faces right, flip for left',
  shopkeeper: 'bald man with a bushy brown beard (merchant)',
  npc_1: 'old man, long grey beard, purple wizard hat and robe',
  npc_2: 'elderly woman, long silver hair, brown robe',
  npc_3: 'woman, long auburn hair with a flower, purple dress',
  npc_4: 'guard in a full steel helmet and armour (face hidden)',
  npc_5: 'bearded warrior in a horned steel helmet',
  npc_6: 'bearded man with a green headband and green tunic (ranger/smuggler look)',
  npc_7: 'farmer in a straw hat and blue overalls',
  npc_8: 'hooded figure, white beard, glowing red eyes (sinister cult look)',
  npc_9: 'clean-shaven man, short brown hair, grey work shirt (labourer)',
  npc_10: 'brawny bare-armed man, brown hair (dock worker/brawler)',
  npc_11: 'farmer, brown hair, blue overalls',
  npc_12: 'man in light armour, short brown hair (militia soldier); looks like npc_9 from afar',
  monster_1: 'red crab-like demon with big claws (default boss marker)',
  monster_2: 'one-eyed cyclops brute',
  monster_3: 'green slime spirit',
  monster_4: 'pale ghost',
  monster_5: 'brown bat',
  monster_6: 'giant spider',
  monster_7: 'brown rat',
  monster_8: 'grey rat',
  altar: 'ornate stone plinth/altar (also fine as a save point or the source)',
  fountain: 'stone basin with green water; with gargoyle_water above it (wall) it is a gargoyle fountain',
  well: 'town well (well_top goes on the tile above); use as the town spring: entity "sprite": "well"',
  lever: 'from Kenney Pixel Platformer, cropped to 16px and recoloured to the Tiny palette; lever_on = flipped',
  stairs_down: 'stone stairs darkening toward the bottom (derived); stairs_up = the plain stairs',
  water_dungeon: 'Tiny Battle water recoloured darker for the tunnels (derived)',
  water_shallow: 'floor with water blended over it, walkable (derived); water_shallow_grass is the town version (flooded stepping stones)',
  bridge: 'stone bridge crossing north-south (derived from the town plaza edges); bridge_h crosses east-west (town battlement)',
  torch: 'MISSING: no torch in these packs; wall_banner is the closest wall decoration',
  skull: 'MISSING: no skull in these packs; gravestone / grave_cross / coffin / wall_holes are the closest',
};

// ---------- derived tiles (extra.png) ----------
const D = (c, r) => cell(img.dungeon, c, r);
const W = (c, r) => cell(img.water, c, r);
const Tn = (c, r) => cell(img.town, c, r);
const tinyPalette = paletteOf(img.dungeon);
function lever(c) {
  const t = crop(img.platformer, c * 18 + 1, 3 * 18 + 2, 16, 16);
  return mapPx(t, (r, g, b, a) => (a === 0 ? [0, 0, 0, 0] : [...nearest(tinyPalette, r, g, b), a]));
}
const EXTRA = [
  ['water_dungeon', () => mapPx(W(1, 2), (r, g, b, a) => [r * 0.22 + 18, g * 0.42 + 22, b * 0.55 + 30, a])],
  ['water_shallow', () => blit(D(0, 4), W(1, 2), 0, 0, 0.55)],
  ['water_shallow_grass', () => blit(Tn(7, 3), W(1, 2), 0, 0, 0.5)],
  ['water_river_h', () => { const t = W(1, 1); blit(t, crop(img.water, 1 * T, 3 * T + 9, T, 7), 0, 9); return t; }],
  ['lever', () => lever(4)],
  ['lever_on', () => lever(6)],
  ['stairs_down', () => mapPx(D(3, 3), (r, g, b, a, x, y) => {
    const k = Math.min(1, Math.max(0, (y - 3) / 12)) ** 1.2 * 0.85;
    return [r + (38 - r) * k, g + (43 - g) * k, b + (68 - b) * k, a];
  })],
  ['bridge', () => { const t = Tn(0, 9); blit(t, crop(img.town, 2 * T + 8, 9 * T, 8, T), 8, 0); return t; }],
  ['water_dungeon_n', () => mapPx(W(1, 2), (r, g, b, a, x, y) => {
    const k = y < 4 ? (4 - y) / 5 : 0;
    const [dr, dg, db] = [r * 0.22 + 18, g * 0.42 + 22, b * 0.55 + 30];
    return [dr * (1 - k) + 38 * k, dg * (1 - k) + 43 * k, db * (1 - k) + 68 * k, a];
  })],
  ['floor_shadow_w', () => rotate(D(2, 4), false)],
  ['rubble_big', () => mapPx(D(0, 2), (r, g, b, a) => (r === 118 && g === 59 && b === 54 ? [0, 0, 0, 0] : [r, g, b, a]))],
];
const EXTRA_COLS = 8;
const extra = blank(EXTRA_COLS * T, Math.ceil(EXTRA.length / EXTRA_COLS) * T);
NAMES.extra = {};
EXTRA.forEach(([name, make], i) => {
  const c = i % EXTRA_COLS, r = Math.floor(i / EXTRA_COLS);
  blit(extra, make(), c * T, r * T);
  NAMES.extra[name] = [c, r];
});
NAMES.extra.switch = NAMES.extra.lever;
NAMES.extra.switch_on = NAMES.extra.lever_on;

// ---------- write sheets + tiles.json ----------
await mkdir(out('assets/tiles'), { recursive: true });
await copyFile(SRC.town, out('assets/tiles/town.png'));
await copyFile(SRC.dungeon, out('assets/tiles/dungeon.png'));
await copyFile(SRC.farm, out('assets/tiles/farm.png'));
await save(img.water, out('assets/tiles/water.png'));
await save(extra, out('assets/tiles/extra.png'));

const sheetInfo = { town: img.town, dungeon: img.dungeon, water: img.water, farm: img.farm, extra };
const tiles = {
  _about: 'Generated by scripts/assets/build-tiles.mjs (edit the NAMES table there). CC0 Kenney sheets, 16px cells, '
    + 'no spacing or margin. Names are global across sheets. Object tiles (trees, fences, props, characters, '
    + 'doors) are transparent: draw the ground (grass / floor) first. Characters face right; flip for left.',
  tileSize: T,
  sheets: Object.fromEntries(Object.entries(sheetInfo).map(([k, im]) => [k, {
    src: `assets/tiles/${k}.png`, cols: im.w / T, rows: im.h / T, spacing: 0, margin: 0,
  }])),
  tiles: {},
  notes: NOTES,
  multi: {
    well: [['well_top'], ['well']],
    tree_tall: [['tree_tall_top'], ['tree_tall']],
    statue: [['statue_top'], ['statue']],
    gargoyle_fountain: [['gargoyle_water'], ['fountain'], ['fountain_base']],
    shelf: [['shelf_top'], ['shelf']],
    ward_gate: [['gate_tl', 'gate_tr'], ['gate_bl', 'gate_br']],
    pond: [['pond_nw', 'pond_ne'], ['pond_sw', 'pond_se']],
    trough: [['trough_water_l', 'trough_water_r']],
    double_door: [['double_door_l', 'double_door_r']],
  },
  autotile: {
    code: 'scripts/assets/autotile.mjs exports autotileName(get, x, y, tileset) implementing all of this.',
    dungeonWalls: 'A "#" with floor directly south is a FACE: wall (wall_face_l / _r / _single when floor is west / '
      + 'east / both). Every other "#" is a wall TOP: call a neighbour "open" if it is floor or a face; then '
      + 'N+W open -> wall_inner_nw (likewise _ne, _sw, _se), S -> wall_cap, N -> wall_edge_n, E -> wall_edge_e, '
      + 'W -> wall_edge_w; only a diagonal open -> wall_corner_se / _sw / _ne / _nw; nothing open -> wall_top. '
      + 'Floor: wall to the north -> floor_shadow, wall to the west -> floor_shadow_w, wall only NW -> '
      + 'floor_shadow_corner. Rooms look best with north walls 2 thick (cap above the face).',
    townWater: 'For "~": land N+W -> water_nw (likewise _ne/_sw/_se), one side -> water_n/_s/_w/_e, land N+S -> '
      + 'water_river_h, land E+W -> water_river_v, land only diagonal -> water_inner_ne/_nw/_se/_sw, else water. '
      + 'Treat "," and "=" as water. In the dungeon "~" -> water_dungeon and "," -> water_shallow.',
    houses: 'An H/D block: bottom row is the wall (house_wall_l / house_wall / house_window / house_door / '
      + 'house_wall_r, or the stone_house_ set); the row above it is the low roof (house_roof_low_l / _low / '
      + 'house_roof_gable at the right end, or roof2_*); higher rows use house_roof_l / house_roof / '
      + 'house_roof_r. Houses look right 3 rows tall (2 roof + 1 wall).',
    bridges: '"=" with water north or south -> bridge_h (crossing east-west), else bridge.',
  },
};
for (const [sheet, names] of Object.entries(NAMES)) {
  for (const [name, [col, row]] of Object.entries(names)) {
    if (tiles.tiles[name]) throw new Error(`duplicate tile name ${name}`);
    const sh = tiles.sheets[sheet];
    if (col >= sh.cols || row >= sh.rows) throw new Error(`${name}: ${col},${row} outside ${sheet}`);
    tiles.tiles[name] = { sheet, col, row };
  }
}
await writeFile(out('src/data/tiles.json'), JSON.stringify(tiles, null, 1) + '\n');
console.log(`tiles.json: ${Object.keys(tiles.tiles).length} names on ${Object.keys(tiles.sheets).length} sheets`);

// ---------- battle effects ----------
const FX = {
  fire: { layers: [['muzzle_02', 1], ['fire_01', 0.55]], gain: 1.15, ramp: [[0, 120, 10, 0], [0.35, 230, 60, 10], [0.6, 255, 150, 30], [0.85, 255, 230, 120], [1, 255, 255, 235]] },
  ice: { layers: [['star_08', 1], ['scorch_02', 0.6]], gain: 1.2, ramp: [[0, 20, 60, 160], [0.4, 60, 150, 255], [0.75, 170, 230, 255], [1, 255, 255, 255]] },
  elec: { layers: [['spark_02', 1], ['spark_05', 0.8]], gain: 1.25, ramp: [[0, 90, 60, 0], [0.35, 230, 190, 20], [0.7, 255, 245, 120], [1, 255, 255, 255]] },
  wind: { layers: [['twirl_01', 1], ['twirl_02', 0.6]], gain: 1.2, ramp: [[0, 10, 90, 60], [0.4, 60, 200, 130], [0.75, 170, 245, 200], [1, 245, 255, 250]] },
  light: { layers: [['star_09', 1], ['light_01', 0.5]], gain: 1.1, ramp: [[0, 160, 110, 20], [0.4, 250, 210, 90], [0.75, 255, 245, 190], [1, 255, 255, 255]] },
  dark: { layers: [['twirl_03', 1], ['smoke_10', 0.7]], gain: 1.3, ramp: [[0, 20, 0, 30], [0.35, 90, 20, 130], [0.7, 180, 80, 230], [1, 240, 200, 255]] },
  phys: { layers: [['scratch_01', 1], ['star_04', 0.5]], gain: 1.1, ramp: [[0, 120, 20, 20], [0.4, 230, 110, 90], [0.75, 255, 225, 210], [1, 255, 255, 255]] },
  heal: { layers: [['circle_05', 0.35]], stamps: [['star_06', 0.55, 0.5, 0.45], ['star_06', 0.3, 0.27, 0.3], ['star_06', 0.32, 0.72, 0.28], ['star_06', 0.25, 0.3, 0.72], ['star_06', 0.28, 0.7, 0.7]], gain: 1.15, ramp: [[0, 10, 110, 50], [0.4, 70, 220, 120], [0.75, 190, 255, 200], [1, 255, 255, 255]] },
};
const PART = (n) => pack('particle-pack/PNG (Black background)', `${n}.png`);
async function gray(name) {
  const { data, info } = await sharp(PART(name)).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  const v = new Float32Array(info.width * info.height);
  for (let p = 0; p < v.length; p++) v[p] = data[p * info.channels] / 255;
  return { w: info.width, h: info.height, v };
}
function sample(g, x, y) {
  if (x < 0 || y < 0 || x > g.w - 1 || y > g.h - 1) return 0;
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(x0 + 1, g.w - 1), y1 = Math.min(y0 + 1, g.h - 1);
  const fx = x - x0, fy = y - y0, at = (xx, yy) => g.v[yy * g.w + xx];
  return (at(x0, y0) * (1 - fx) + at(x1, y0) * fx) * (1 - fy) + (at(x0, y1) * (1 - fx) + at(x1, y1) * fx) * fy;
}
function rampColor(ramp, t) {
  for (let i = 1; i < ramp.length; i++) {
    if (t <= ramp[i][0]) {
      const a = ramp[i - 1], b = ramp[i], k = (t - a[0]) / (b[0] - a[0] || 1);
      return [1, 2, 3].map((j) => a[j] + (b[j] - a[j]) * k);
    }
  }
  return ramp[ramp.length - 1].slice(1);
}
async function buildFx(name, spec) {
  const S = 512, acc = new Float32Array(S * S);
  const screen = (p, v) => { acc[p] = 1 - (1 - acc[p]) * (1 - Math.max(0, Math.min(1, v))); };
  for (const [src, k] of spec.layers) {
    const g = await gray(src);
    for (let p = 0; p < S * S; p++) screen(p, sample(g, ((p % S) * g.w) / S, (Math.floor(p / S) * g.h) / S) * k);
  }
  for (const [src, scale, cx, cy] of spec.stamps ?? []) {
    const g = await gray(src), size = S * scale;
    for (let p = 0; p < S * S; p++) {
      const u = ((p % S) - (cx * S - size / 2)) / size, w = (Math.floor(p / S) - (cy * S - size / 2)) / size;
      if (u >= 0 && u <= 1 && w >= 0 && w <= 1) screen(p, sample(g, u * (g.w - 1), w * (g.h - 1)));
    }
  }
  const small = await sharp(Buffer.from(acc.map((v) => Math.round(Math.min(1, v * spec.gain) * 255))), { raw: { width: S, height: S, channels: 1 } })
    .resize(128, 128, { kernel: 'lanczos3' }).extractChannel(0).raw().toBuffer();
  const o = blank(128, 128);
  for (let p = 0; p < 128 * 128; p++) {
    const t = small[p] / 255, [r, g, b] = rampColor(spec.ramp, t);
    o.d[p * 4] = r; o.d[p * 4 + 1] = g; o.d[p * 4 + 2] = b; o.d[p * 4 + 3] = Math.round(Math.min(1, t * 1.4) * 255);
  }
  await save(o, out('assets/fx', `${name}.png`));
}
if (!flag('--no-fx')) {
  for (const [name, spec] of Object.entries(FX)) await buildFx(name, spec);
  console.log(`fx: ${Object.keys(FX).join(', ')}`);
}

// ---------- sound effects ----------
const SFX = {
  hit: ['impact-sounds/Audio/impactPunch_medium_000.ogg'],
  weak: ['impact-sounds/Audio/impactPunch_heavy_000.ogg'],
  miss: ['impact-sounds/Audio/impactSoft_medium_000.ogg'],
  select: ['interface-sounds/Audio/select_001.ogg'],
  back: ['interface-sounds/Audio/back_001.ogg'],
  error: ['interface-sounds/Audio/error_006.ogg'],
  door: ['rpg-audio/Audio/doorOpen_1.ogg'],
  chest: ['rpg-audio/Audio/metalLatch.ogg', 'rpg-audio/Audio/creak3.ogg'],
  coin: ['rpg-audio/Audio/handleCoins2.ogg'],
  lever: ['rpg-audio/Audio/metalClick.ogg'],
  encounter: ['interface-sounds/Audio/glitch_002.ogg', 'interface-sounds/Audio/glitch_004.ogg', 'interface-sounds/Audio/glitch_001.ogg', 'interface-sounds/Audio/maximize_005.ogg'],
  levelup: ['interface-sounds/Audio/confirmation_004.ogg'],
  heal: ['interface-sounds/Audio/glass_004.ogg'],
};
if (!flag('--no-sfx')) {
  await mkdir(out('assets/sfx'), { recursive: true });
  let total = 0;
  for (const [name, files] of Object.entries(SFX)) {
    const dst = out('assets/sfx', `${name}.ogg`);
    if (files.length === 1) await copyFile(pack(files[0]), dst);
    else {
      const inputs = files.flatMap((f) => ['-i', pack(f)]);
      const chain = files.map((_, i) => `[${i}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`).join(';');
      const cat = files.map((_, i) => `[a${i}]`).join('') + `concat=n=${files.length}:v=0:a=1[out]`;
      await run('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${chain};${cat}`, '-map', '[out]', '-c:a', 'libvorbis', '-q:a', '4', dst]);
    }
    total += (await stat(dst)).size;
  }
  console.log(`sfx: ${Object.keys(SFX).length} files, ${Math.round(total / 1024)} KB`);
}

// ---------- credits (one entry per pack; upsert by id, keep everything else) ----------
const CREDITS = [
  ['tileset-tiny-town', 'assets/tiles/town.png', 'Tiny Town', '2023', 'tiny-town', 'tileset'],
  ['tileset-tiny-dungeon', 'assets/tiles/dungeon.png', 'Tiny Dungeon', '2022', 'tiny-dungeon', 'tileset (characters, monsters, dungeon); also recoloured/rotated tiles in assets/tiles/extra.png'],
  ['tileset-tiny-battle', 'assets/tiles/water.png', 'Tiny Battle', '2023', 'tiny-battle', 'tileset (water and shore tiles cropped)'],
  ['tileset-tiny-farm', 'assets/tiles/farm.png', 'Tiny Farm', '2026', 'tiny-farm', 'tileset'],
  ['sprites-pixel-platformer', 'assets/tiles/extra.png', 'Pixel Platformer', '2023', 'pixel-platformer', 'lever sprites cropped to 16px and recoloured'],
  ['fx-particle-pack', 'assets/fx/fire.png', 'Particle Pack', '', 'particle-pack', 'battle effects: textures combined, tinted per element, downscaled to 128px'],
  ['sfx-impact-sounds', 'assets/sfx/hit.ogg', 'Impact Sounds', '2019', 'impact-sounds', 'sound effects (hit, weak, miss)'],
  ['sfx-rpg-audio', 'assets/sfx/door.ogg', 'RPG Audio', '', 'rpg-audio', 'sound effects (door, chest, coin, lever)'],
  ['sfx-interface-sounds', 'assets/sfx/select.ogg', 'Interface Sounds', '2020', 'interface-sounds', 'sound effects (menus, encounter, level up, heal)'],
];
const credPath = out('assets/credits.json');
const credits = JSON.parse(await readFile(credPath, 'utf8'));
for (const [id, file, title, date, slug, treatment] of CREDITS) {
  if (!existsSync(out(file))) continue;
  const entry = { id, file, title, artist: 'Kenney (kenney.nl)', date, source: 'Kenney', sourceUrl: `https://kenney.nl/assets/${slug}`, imageUrl: `https://kenney.nl/assets/${slug}`, license: 'CC0', treatment };
  const i = credits.findIndex((c) => c.id === id);
  if (i >= 0) credits[i] = entry; else credits.push(entry);
}
await writeFile(credPath, JSON.stringify(credits, null, 2) + '\n');
console.log(`credits: ${credits.length} entries`);

// ---------- check render ----------
const checkOut = opt('--check');
if (checkOut) {
  const sheets = { town: img.town, dungeon: img.dungeon, water: img.water, farm: img.farm, extra };
  const draw = (canvas, name, x, y) => {
    const t = tiles.tiles[name];
    if (!t) throw new Error(`check: no tile ${name}`);
    blit(canvas, cell(sheets[t.sheet], t.col, t.row), x * T, y * T);
  };
  // 1) the 10x6 sample from the brief: town strip on top, dungeon room below, people on both.
  const sample10 = blank(10 * T, 6 * T);
  const layout = [
    ['grass', 'grass2', 'path', 'path', 'water_n', 'water_n', 'grass', 'house_roof_l', 'house_roof', 'house_roof_r'],
    ['grass', 'tree', 'path', 'bridge_h', 'water', 'water', 'grass_flowers', 'house_roof_low_l', 'house_roof_low', 'house_roof_gable'],
    ['bush', 'grass', 'path', 'grass', 'water_s', 'water_s', 'grass', 'house_wall_l', 'house_door', 'house_wall_r'],
    ['wall_corner_se', 'wall_cap', 'wall_cap', 'wall_cap', 'wall_cap', 'wall_cap', 'wall_cap', 'wall_cap', 'wall_cap', 'wall_corner_sw'],
    ['wall_edge_e', 'wall', 'door_closed', 'wall', 'wall_grate', 'wall', 'wall', 'wall_banner', 'wall', 'wall_edge_w'],
    ['wall_edge_e', 'floor_shadow', 'floor_shadow', 'floor_shadow', 'floor_shadow', 'floor_shadow', 'floor_shadow', 'floor_shadow', 'floor_shadow', 'wall_edge_w'],
  ];
  layout.forEach((row, y) => row.forEach((n, x) => {
    if (y < 3) draw(sample10, 'grass', x, y);
    draw(sample10, n, x, y);
  }));
  for (const [n, x, y] of [['hero', 2, 2], ['npc_1', 6, 1], ['npc_3', 6, 2], ['chest_closed', 3, 5], ['chest_open', 4, 5], ['stairs_down', 6, 5], ['lever', 7, 5], ['npc_2', 1, 5], ['monster_1', 8, 5]]) draw(sample10, n, x, y);
  // 2) an autotiled town + dungeon from legend strings, using autotile.mjs.
  const town = [
    '""""""""""~~""""""""',
    '"HHHHH""""~~""TT""""',
    '"HHHHH""""~~"TT""HHH',
    '"HHDHH""""~~"""""HHH',
    '".........==.....HDH',
    '""""""""""~~""""""."',
    '"""""""""~~~~"""""."',
    '~~~~~=~~~~~~~~~~~~=~',
    '~~~~~=~~~~,,~~~~~~=~',
    '""""".""""""""""""."',
    '"#####""""""""""TT.T',
    '"#"""#""""""""""""""',
    '"#####""""""""""""""',
  ];
  const dungeon = [
    '####################',
    '####################',
    '##......###.....####',
    '##......###.....####',
    '##..........~~~.####',
    '##......###.~~~..###',
    '#####.#####.,,,..###',
    '#####.#####......###',
    '####...####D########',
    '####...####.########',
  ];
  const renderMap = (rows, tileset) => {
    const c = blank(rows[0].length * T, rows.length * T);
    const get = (x, y) => (y < 0 || y >= rows.length || x < 0 || x >= rows[y].length ? null : rows[y][x]);
    const legend = tileset === 'town'
      ? { '.': 'path', '"': 'grass', '#': 'fence', '~': 'water', ',': 'water_shallow_grass', '=': 'bridge', T: 'tree', H: 'house_wall', D: 'house_door', ':': 'rock' }
      : { '.': 'floor', '"': 'floor2', '#': 'wall', '~': 'water_dungeon', ',': 'water_shallow', '=': 'bridge', T: 'rubble', H: 'wall', D: 'door_open', ':': 'rubble' };
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const ch = rows[y][x];
        const name = autotileName(get, x, y, tileset) ?? legend[ch] ?? (tileset === 'town' ? 'grass' : 'floor');
        if (ch !== '#' || tileset === 'town') draw(c, tileset === 'town' ? 'grass' : 'floor', x, y);
        draw(c, name, x, y);
      }
    }
    return c;
  };
  const tmap = renderMap(town, 'town'), dmap = renderMap(dungeon, 'dungeon');
  for (const [n, x, y] of [['hero', 7, 4], ['npc_4', 2, 5], ['shopkeeper', 15, 4], ['npc_7', 13, 5], ['well_top', 15, 9], ['well', 15, 10], ['sign', 9, 3], ['crate', 2, 11], ['chicken', 4, 11], ['npc_6', 6, 9]]) draw(tmap, n, x, y);
  for (const [n, x, y] of [['hero', 4, 3], ['chest_closed', 6, 2], ['lever', 14, 2], ['stairs_down', 5, 8], ['fountain', 13, 3], ['monster_2', 16, 5], ['npc_8', 3, 5], ['rubble', 7, 5], ['altar', 12, 2]]) draw(dmap, n, x, y);
  const W2 = Math.max(sample10.w, tmap.w, dmap.w), sheet = blank(W2, sample10.h + tmap.h + dmap.h + 2 * T);
  blit(sheet, sample10, 0, 0); blit(sheet, tmap, 0, sample10.h + T); blit(sheet, dmap, 0, sample10.h + tmap.h + 2 * T);
  const big = await sharp(sheet.d, { raw: { width: sheet.w, height: sheet.h, channels: 4 } }).resize(sheet.w * 3, sheet.h * 3, { kernel: 'nearest' }).png().toBuffer();
  await writeFile(path.resolve(checkOut), big);
  console.log(`check image -> ${checkOut}`);
}
