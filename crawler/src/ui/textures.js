// Placeholder textures drawn on canvases: flat fills with dark borders so edges read clearly.
import * as THREE from 'three';

const cache = new Map();

function canvasTex(key, w, h, draw, { repeat = false } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  cache.set(key, t);
  return t;
}

// Wall panel: light fill (tinted per area by instance color), dark outline, a baseboard and a top rail.
export function wallTexture() {
  return canvasTex('wall', 128, 128, (g, w, h) => {
    g.fillStyle = '#d8d8d8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#c4c4c4';
    for (let y = 16; y < h - 20; y += 22) g.fillRect(6, y, w - 12, 2);
    g.fillStyle = '#9a9a9a';
    g.fillRect(0, h - 18, w, 12); // baseboard
    g.fillRect(0, 6, w, 5); // top rail
    g.strokeStyle = '#1b1b1b';
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
  });
}

export function floorTexture() {
  return canvasTex('floor', 128, 128, (g, w, h) => {
    g.fillStyle = '#bdbdbd';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b0b0b0';
    g.fillRect(w / 2 - 1, 8, 2, h - 16);
    g.fillRect(8, h / 2 - 1, w - 16, 2);
    g.strokeStyle = '#2a2a2a';
    g.lineWidth = 5;
    g.strokeRect(2, 2, w - 4, h - 4);
  });
}

export function ceilTexture() {
  return canvasTex('ceil', 64, 64, (g, w, h) => {
    g.fillStyle = '#5a5a5a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1a1a1a';
    g.lineWidth = 4;
    g.strokeRect(2, 2, w - 4, h - 4);
  });
}

function drawArrow(g, cx, cy, size, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(cx - size, cy - size * 0.35);
  g.lineTo(cx + size * 0.1, cy - size * 0.35);
  g.lineTo(cx + size * 0.1, cy - size * 0.8);
  g.lineTo(cx + size, cy);
  g.lineTo(cx + size * 0.1, cy + size * 0.8);
  g.lineTo(cx + size * 0.1, cy + size * 0.35);
  g.lineTo(cx - size, cy + size * 0.35);
  g.closePath();
  g.fill();
  g.strokeStyle = '#111';
  g.lineWidth = 3;
  g.stroke();
}

/**
 * Door faces. variant: 'door' | 'lock' | 'oneway' (passable side, arrow) | 'noentry' (one-way back side) |
 * 'barred' (shortcut, far side) | 'lift' (shortcut, side that opens it).
 */
export function doorTexture(variant) {
  return canvasTex(`door-${variant}`, 128, 160, (g, w, h) => {
    const slab = { door: '#8a5a2b', lock: '#7a4a22', oneway: '#2f6f8f', noentry: '#5a5a5a', barred: '#6a5a4a', lift: '#6f5a2b' }[variant];
    g.fillStyle = '#2a2018'; // frame
    g.fillRect(0, 0, w, h);
    g.fillStyle = slab;
    g.fillRect(14, 14, w - 28, h - 14);
    g.strokeStyle = '#120c06';
    g.lineWidth = 4;
    g.strokeRect(14, 14, w - 28, h - 14);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 2;
    g.strokeRect(26, 28, w - 52, 44);
    g.strokeRect(26, 84, w - 52, 60);
    if (variant === 'door' || variant === 'lift') {
      g.fillStyle = '#e8c15a';
      g.beginPath();
      g.arc(w - 30, 92, 6, 0, Math.PI * 2);
      g.fill();
    }
    if (variant === 'lock') {
      g.fillStyle = '#f2c230';
      g.fillRect(w / 2 - 16, 78, 32, 26);
      g.strokeStyle = '#f2c230';
      g.lineWidth = 6;
      g.beginPath();
      g.arc(w / 2, 78, 11, Math.PI, 0);
      g.stroke();
      g.fillStyle = '#222';
      g.fillRect(w / 2 - 3, 86, 6, 10);
    }
    if (variant === 'oneway') drawArrow(g, w / 2, 86, 36, '#f4f4f4');
    if (variant === 'noentry') {
      g.strokeStyle = '#d33';
      g.lineWidth = 12;
      g.beginPath();
      g.moveTo(34, 50); g.lineTo(w - 34, 126);
      g.moveTo(w - 34, 50); g.lineTo(34, 126);
      g.stroke();
    }
    if (variant === 'barred' || variant === 'lift') {
      g.fillStyle = '#3b2a16';
      g.fillRect(6, 82, w - 12, 18);
      g.strokeStyle = '#111';
      g.lineWidth = 2;
      g.strokeRect(6, 82, w - 12, 18);
      if (variant === 'lift') {
        g.fillStyle = '#9fe870';
        g.font = 'bold 22px sans-serif';
        g.textAlign = 'center';
        g.fillText('▲ LIFT', w / 2, 60);
      }
    }
  });
}

// A text sign for sprites: big readable label on a dark plate.
export function signTexture(text, color = '#ffd84a') {
  return canvasTex(`sign-${text}-${color}`, 256, 80, (g, w, h) => {
    g.fillStyle = 'rgba(12,12,16,0.85)';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = color;
    g.lineWidth = 5;
    g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = color;
    g.font = 'bold 44px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

export function stripeTexture() {
  return canvasTex('stripe', 128, 128, (g, w, h) => {
    g.fillStyle = '#1a1a1a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8c020';
    for (let i = -w; i < w * 2; i += 32) {
      g.beginPath();
      g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 + h, h); g.lineTo(i + h, h);
      g.closePath();
      g.fill();
    }
  });
}

export function arrowFloorTexture() {
  return canvasTex('arrowfloor', 128, 128, (g, w, h) => {
    g.fillStyle = '#0f3a44';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#46e0ff';
    g.lineWidth = 6;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.save();
    g.translate(w / 2, h / 2);
    g.rotate(-Math.PI / 2); // arrow points "up" in texture space = forward on the floor
    drawArrow(g, 0, 0, 44, '#46e0ff');
    g.restore();
  });
}
