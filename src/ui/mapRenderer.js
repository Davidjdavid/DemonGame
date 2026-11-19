// Draws a floor onto a canvas: walls, floors seen so far (fog of war), features, the player.
// Rendering only — map data lives in the floor JSON, so the view can change later.
const COLORS = {
  void: '#0d0b12', wall: '#2b2633', floor: '#4a4356', floorDim: '#352f3f',
  player: '#c9a24a', treasure: '#d8b45a', heal: '#5fa58a', shop: '#7fa6d6', stairs: '#e9e1cf', boss: '#b8494a',
};
const GLYPH = { treasure: '¤', heal: '+', shop: '$', stairs: '>', boss: '!' };

export function drawMap(canvas, floor, ex, seen, opened, { tile = 22, view = [21, 13] } = {}) {
  const [vw, vh] = view;
  canvas.width = vw * tile;
  canvas.height = vh * tile;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const ox = ex.x - Math.floor(vw / 2);
  const oy = ex.y - Math.floor(vh / 2);
  ctx.font = `${Math.round(tile * 0.75)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let vy = 0; vy < vh; vy++) {
    for (let vx = 0; vx < vw; vx++) {
      const x = ox + vx, y = oy + vy;
      if (y < 0 || y >= floor.height || x < 0 || x >= floor.width) continue;
      const k = `${x},${y}`;
      if (!seen.has(k)) continue;
      const wall = floor.tiles[y][x] === '#';
      const near = Math.abs(x - ex.x) <= 4 && Math.abs(y - ex.y) <= 4;
      ctx.fillStyle = wall ? COLORS.wall : near ? COLORS.floor : COLORS.floorDim;
      ctx.fillRect(vx * tile, vy * tile, tile - (wall ? 0 : 1), tile - (wall ? 0 : 1));
    }
  }
  for (const f of floor.features) {
    if (!seen.has(`${f.x},${f.y}`)) continue;
    if (f.type === 'treasure' && opened.includes(f.id)) continue;
    const vx = f.x - ox, vy = f.y - oy;
    if (vx < 0 || vy < 0 || vx >= vw || vy >= vh) continue;
    ctx.fillStyle = COLORS[f.type] ?? COLORS.stairs;
    ctx.fillText(GLYPH[f.type] ?? '?', vx * tile + tile / 2, vy * tile + tile / 2 + 1);
  }
  const px = (ex.x - ox) * tile + tile / 2, py = (ex.y - oy) * tile + tile / 2;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(px, py, tile * 0.36, 0, Math.PI * 2);
  ctx.fill();
}

// Reveal tiles around the player (and the room he stands in).
export function reveal(floor, ex, seen, radius = 3) {
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    const x = ex.x + dx, y = ex.y + dy;
    if (y >= 0 && y < floor.height && x >= 0 && x < floor.width) seen.add(`${x},${y}`);
  }
  const room = floor.rooms.find((r) => ex.x >= r.x && ex.x < r.x + r.w && ex.y >= r.y && ex.y < r.y + r.h);
  if (room) for (let y = room.y - 1; y <= room.y + room.h; y++) for (let x = room.x - 1; x <= room.x + room.w; x++) seen.add(`${x},${y}`);
}
