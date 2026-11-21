// Free (off-grid) movement: the player is a small circle moving in cell units (cell (x, y) is centred on the point
// (x, y)); thin walls on cell edges block it, doors leave a gap between two jambs. Locked doors, one-way doors from
// the wrong side and barred shortcuts from the far side block like walls. Pure.
import { edgeState } from './move.js';

export const RADIUS = 0.2;      // player radius in cells
export const DOOR_HALF = 0.36;  // half-width of a door opening (matches the 3D door)
export const cellOf = (v) => Math.round(v);

// The edges near (cx, cy): [edge, ax, ay, bx, by, vertical] with the segment in cell units.
function nearEdges(floor, cx, cy) {
  const out = [];
  for (let y = cy - 1; y <= cy + 2; y++) {
    for (let x = cx - 1; x <= cx + 1; x++) {
      if (x < 0 || x >= floor.w || y < 0 || y > floor.h) continue;
      out.push([floor.hEdges[y * floor.w + x], x - 0.5, y - 0.5, x + 0.5, y - 0.5, false]);
    }
  }
  for (let y = cy - 1; y <= cy + 1; y++) {
    for (let x = cx - 1; x <= cx + 2; x++) {
      if (y < 0 || y >= floor.h || x < 0 || x > floor.w) continue;
      out.push([floor.vEdges[y * (floor.w + 1) + x], x - 0.5, y - 0.5, x - 0.5, y + 0.5, true]);
    }
  }
  return out;
}

/**
 * How an edge treats a player standing at (px, py): 'open' | 'door' (gap between jambs) | 'wall'.
 * Doors that only open one way are doors from the side that can pass and walls from the other.
 */
export function edgeBlock(edge, flags, inv, px, py, ax, ay, vertical) {
  const st = edgeState(edge, flags);
  if (st === 'open') return 'open';
  if (st === 'wall') return 'wall';
  if (st === 'door') return 'door';
  // Direction you'd cross it in from where you stand.
  const dir = vertical ? (px < ax ? 1 : 3) : (py < ay ? 2 : 0);
  if (st === 'oneway' || st === 'shortcut') return dir === edge.dir ? 'door' : 'wall';
  if (st === 'lock') return (inv?.[edge.key] || 0) > 0 ? 'door' : 'wall';
  return 'wall';
}

function segments(kind, ax, ay, bx, by, vertical) {
  if (kind === 'wall') return [[ax, ay, bx, by]];
  if (kind !== 'door') return [];
  // Two jambs either side of the opening.
  if (vertical) return [[ax, ay, ax, ay + 0.5 - DOOR_HALF], [ax, by - (0.5 - DOOR_HALF), ax, by]];
  return [[ax, ay, ax + 0.5 - DOOR_HALF, ay], [bx - (0.5 - DOOR_HALF), ay, bx, ay]];
}

/**
 * Move from (px, py) by (dx, dy) and push the circle out of anything blocking.
 * Returns { x, y, blocked: edge | null } — `blocked` is the closed door you bumped into (for its message).
 */
export function slide(floor, flags, inv, px, py, dx, dy) {
  let x = px + dx;
  let y = py + dy;
  let blocked = null;
  const cx = cellOf(px);
  const cy = cellOf(py);
  const edges = nearEdges(floor, cx, cy);
  for (let iter = 0; iter < 3; iter++) {
    for (const [edge, ax, ay, bx, by, vertical] of edges) {
      const kind = edgeBlock(edge, flags, inv, px, py, ax, ay, vertical);
      for (const [sx, sy, ex, ey] of segments(kind, ax, ay, bx, by, vertical)) {
        // Closest point on the segment to the circle centre.
        const vx = ex - sx; const vy = ey - sy;
        const len2 = vx * vx + vy * vy || 1;
        const t = Math.max(0, Math.min(1, ((x - sx) * vx + (y - sy) * vy) / len2));
        const qx = sx + t * vx; const qy = sy + t * vy;
        let ox = x - qx; let oy = y - qy;
        let d = Math.hypot(ox, oy);
        if (d >= RADIUS) continue;
        if (d < 1e-6) { ox = px - qx; oy = py - qy; d = Math.hypot(ox, oy) || 1; }
        x = qx + (ox / d) * RADIUS;
        y = qy + (oy / d) * RADIUS;
        if (kind === 'wall' && edge.type !== 'wall') blocked = edge;
      }
    }
  }
  return { x, y, blocked };
}

// Heading helpers. yaw follows the 3D view: 0 = facing north, -π/2 = east. Forward in cell units = (-sin, -cos).
export const forwardOf = (yaw) => [-Math.sin(yaw), -Math.cos(yaw)];
export const dirOfYaw = (yaw) => ((Math.round(-yaw / (Math.PI / 2)) % 4) + 4) % 4;
export const yawOfDir = (dir) => -dir * (Math.PI / 2);
