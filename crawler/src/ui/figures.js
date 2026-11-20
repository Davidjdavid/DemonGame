// Placeholder monster figures drawn with canvas shapes: flat colors, dark outlines, simple eyes. Readable, not pretty.
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function eyes(g, x, y, gap, r, color = '#fff', pupil = '#111') {
  for (const s of [-1, 1]) {
    g.fillStyle = color;
    g.beginPath(); g.arc(x + s * gap, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = pupil;
    g.beginPath(); g.arc(x + s * gap, y + r * 0.2, r * 0.5, 0, Math.PI * 2); g.fill();
  }
}

function fillStroke(g, fill, line = '#111', lw = 4) {
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = line;
  g.lineWidth = lw;
  g.stroke();
}

const SHAPES = {
  blob(g, w, h, c) {
    g.beginPath();
    g.moveTo(w * 0.12, h * 0.88);
    g.bezierCurveTo(w * 0.05, h * 0.35, w * 0.3, h * 0.18, w * 0.5, h * 0.18);
    g.bezierCurveTo(w * 0.7, h * 0.18, w * 0.95, h * 0.35, w * 0.88, h * 0.88);
    g.closePath();
    fillStroke(g, c);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.ellipse(w * 0.36, h * 0.36, w * 0.08, h * 0.05, -0.5, 0, Math.PI * 2); g.fill();
    eyes(g, w * 0.5, h * 0.5, w * 0.11, w * 0.06);
  },
  beast(g, w, h, c) {
    g.fillStyle = shade(c, 0.7);
    for (const x of [0.28, 0.4, 0.6, 0.72]) g.fillRect(w * x - 6, h * 0.62, 12, h * 0.26);
    g.beginPath(); g.ellipse(w * 0.5, h * 0.56, w * 0.32, h * 0.16, 0, 0, Math.PI * 2); fillStroke(g, c);
    g.beginPath(); g.moveTo(w * 0.82, h * 0.52); g.quadraticCurveTo(w * 0.98, h * 0.3, w * 0.92, h * 0.2); g.strokeStyle = shade(c, 0.6); g.lineWidth = 7; g.stroke();
    g.beginPath(); g.arc(w * 0.26, h * 0.4, w * 0.15, 0, Math.PI * 2); fillStroke(g, c);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w * (0.26 + s * 0.1), h * 0.3); g.lineTo(w * (0.26 + s * 0.15), h * 0.14); g.lineTo(w * (0.26 + s * 0.02), h * 0.27); fillStroke(g, shade(c, 0.8)); }
    eyes(g, w * 0.24, h * 0.39, w * 0.055, w * 0.035, '#ffe0a0');
  },
  wisp(g, w, h, c) {
    g.beginPath();
    g.moveTo(w * 0.5, h * 0.06);
    g.bezierCurveTo(w * 0.7, h * 0.3, w * 0.85, h * 0.5, w * 0.78, h * 0.68);
    g.bezierCurveTo(w * 0.7, h * 0.92, w * 0.3, h * 0.92, w * 0.22, h * 0.68);
    g.bezierCurveTo(w * 0.15, h * 0.5, w * 0.3, h * 0.3, w * 0.5, h * 0.06);
    fillStroke(g, c, shade(c, 0.4));
    g.beginPath(); g.ellipse(w * 0.5, h * 0.66, w * 0.16, h * 0.16, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,220,0.8)'; g.fill();
    eyes(g, w * 0.5, h * 0.62, w * 0.07, w * 0.035, '#222', '#fff');
  },
  moth(g, w, h, c) {
    for (const s of [-1, 1]) {
      g.beginPath(); g.ellipse(w * (0.5 + s * 0.22), h * 0.36, w * 0.22, h * 0.2, s * 0.5, 0, Math.PI * 2); fillStroke(g, c);
      g.beginPath(); g.ellipse(w * (0.5 + s * 0.18), h * 0.64, w * 0.15, h * 0.14, -s * 0.4, 0, Math.PI * 2); fillStroke(g, shade(c, 0.8));
      g.beginPath(); g.arc(w * (0.5 + s * 0.24), h * 0.36, w * 0.06, 0, Math.PI * 2); g.fillStyle = shade(c, 0.5); g.fill();
    }
    g.beginPath(); g.ellipse(w * 0.5, h * 0.5, w * 0.06, h * 0.26, 0, 0, Math.PI * 2); fillStroke(g, shade(c, 0.6));
    g.strokeStyle = '#111'; g.lineWidth = 3;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w * 0.5, h * 0.26); g.quadraticCurveTo(w * (0.5 + s * 0.1), h * 0.08, w * (0.5 + s * 0.18), h * 0.1); g.stroke(); }
    eyes(g, w * 0.5, h * 0.3, w * 0.035, w * 0.025, '#ff3');
  },
  humanoid(g, w, h, c) {
    g.fillStyle = shade(c, 0.7);
    g.fillRect(w * 0.36, h * 0.66, w * 0.1, h * 0.28);
    g.fillRect(w * 0.54, h * 0.66, w * 0.1, h * 0.28);
    g.beginPath(); g.moveTo(w * 0.3, h * 0.32); g.lineTo(w * 0.7, h * 0.32); g.lineTo(w * 0.64, h * 0.7); g.lineTo(w * 0.36, h * 0.7); g.closePath(); fillStroke(g, c);
    g.strokeStyle = shade(c, 0.6); g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.moveTo(w * 0.3, h * 0.36); g.lineTo(w * 0.2, h * 0.62); g.moveTo(w * 0.7, h * 0.36); g.lineTo(w * 0.8, h * 0.62); g.stroke();
    g.beginPath(); g.arc(w * 0.5, h * 0.22, w * 0.11, 0, Math.PI * 2); fillStroke(g, shade(c, 1.1));
    eyes(g, w * 0.5, h * 0.21, w * 0.04, w * 0.025, '#ddd', '#600');
  },
  imp(g, w, h, c) {
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w * 0.5, h * 0.45); g.lineTo(w * (0.5 + s * 0.42), h * 0.2); g.lineTo(w * (0.5 + s * 0.3), h * 0.55); g.closePath(); fillStroke(g, shade(c, 0.6)); }
    g.beginPath(); g.ellipse(w * 0.5, h * 0.62, w * 0.16, h * 0.2, 0, 0, Math.PI * 2); fillStroke(g, c);
    g.beginPath(); g.arc(w * 0.5, h * 0.36, w * 0.14, 0, Math.PI * 2); fillStroke(g, c);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w * (0.5 + s * 0.08), h * 0.25); g.lineTo(w * (0.5 + s * 0.14), h * 0.1); g.lineTo(w * (0.5 + s * 0.13), h * 0.28); fillStroke(g, '#f0e0c0', '#111', 3); }
    eyes(g, w * 0.5, h * 0.34, w * 0.055, w * 0.035, '#ff0', '#111');
    g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath(); g.arc(w * 0.5, h * 0.4, w * 0.06, 0.2, Math.PI - 0.2); g.stroke();
  },
  serpent(g, w, h, c) {
    g.strokeStyle = '#111'; g.lineWidth = w * 0.16 + 6; g.lineCap = 'round';
    const path = () => { g.beginPath(); g.moveTo(w * 0.15, h * 0.85); g.bezierCurveTo(w * 0.9, h * 0.9, w * 0.1, h * 0.5, w * 0.6, h * 0.35); g.lineTo(w * 0.62, h * 0.3); };
    path(); g.stroke();
    g.strokeStyle = c; g.lineWidth = w * 0.16; path(); g.stroke();
    g.beginPath(); g.ellipse(w * 0.64, h * 0.24, w * 0.14, h * 0.09, -0.2, 0, Math.PI * 2); fillStroke(g, c);
    eyes(g, w * 0.66, h * 0.22, w * 0.05, w * 0.025, '#ff4', '#111');
  },
  bird(g, w, h, c) {
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w * 0.5, h * 0.45); g.quadraticCurveTo(w * (0.5 + s * 0.5), h * 0.15, w * (0.5 + s * 0.45), h * 0.6); g.closePath(); fillStroke(g, shade(c, 0.8)); }
    g.beginPath(); g.ellipse(w * 0.5, h * 0.55, w * 0.14, h * 0.22, 0, 0, Math.PI * 2); fillStroke(g, c);
    g.beginPath(); g.arc(w * 0.5, h * 0.3, w * 0.1, 0, Math.PI * 2); fillStroke(g, c);
    g.beginPath(); g.moveTo(w * 0.46, h * 0.33); g.lineTo(w * 0.5, h * 0.44); g.lineTo(w * 0.54, h * 0.33); fillStroke(g, '#f0b030', '#111', 2);
    eyes(g, w * 0.5, h * 0.28, w * 0.045, w * 0.025);
  },
  golem(g, w, h, c) {
    g.beginPath(); g.rect(w * 0.25, h * 0.3, w * 0.5, h * 0.42); fillStroke(g, c);
    g.beginPath(); g.rect(w * 0.08, h * 0.32, w * 0.16, h * 0.4); fillStroke(g, shade(c, 0.85));
    g.beginPath(); g.rect(w * 0.76, h * 0.32, w * 0.16, h * 0.4); fillStroke(g, shade(c, 0.85));
    g.beginPath(); g.rect(w * 0.3, h * 0.72, w * 0.16, h * 0.2); fillStroke(g, shade(c, 0.7));
    g.beginPath(); g.rect(w * 0.54, h * 0.72, w * 0.16, h * 0.2); fillStroke(g, shade(c, 0.7));
    g.beginPath(); g.rect(w * 0.38, h * 0.12, w * 0.24, h * 0.18); fillStroke(g, c);
    g.fillStyle = '#4ff'; g.fillRect(w * 0.42, h * 0.18, w * 0.16, h * 0.04);
  },
  eye(g, w, h, c) {
    g.strokeStyle = shade(c, 0.6); g.lineWidth = 5;
    for (let i = 0; i < 6; i++) { const a = Math.PI * (0.15 + i * 0.14); g.beginPath(); g.moveTo(w * 0.5, h * 0.6); g.quadraticCurveTo(w * (0.5 + Math.cos(a) * 0.3), h * 0.95, w * (0.5 + Math.cos(a) * 0.45), h * 0.92); g.stroke(); }
    g.beginPath(); g.arc(w * 0.5, h * 0.45, w * 0.3, 0, Math.PI * 2); fillStroke(g, c);
    g.beginPath(); g.arc(w * 0.5, h * 0.45, w * 0.18, 0, Math.PI * 2); fillStroke(g, '#fff', '#111', 3);
    g.beginPath(); g.arc(w * 0.5, h * 0.47, w * 0.08, 0, Math.PI * 2); g.fillStyle = '#111'; g.fill();
  },
  knight(g, w, h, c) {
    g.beginPath(); g.moveTo(w * 0.32, h * 0.3); g.lineTo(w * 0.68, h * 0.3); g.lineTo(w * 0.7, h * 0.75); g.lineTo(w * 0.3, h * 0.75); g.closePath(); fillStroke(g, c);
    g.fillStyle = shade(c, 0.6); g.fillRect(w * 0.33, h * 0.75, w * 0.12, h * 0.18); g.fillRect(w * 0.55, h * 0.75, w * 0.12, h * 0.18);
    g.beginPath(); g.rect(w * 0.38, h * 0.08, w * 0.24, h * 0.22); fillStroke(g, shade(c, 1.15));
    g.fillStyle = '#111'; g.fillRect(w * 0.41, h * 0.16, w * 0.18, h * 0.03);
    g.beginPath(); g.moveTo(w * 0.78, h * 0.15); g.lineTo(w * 0.82, h * 0.15); g.lineTo(w * 0.82, h * 0.7); g.lineTo(w * 0.78, h * 0.7); fillStroke(g, '#ddd', '#111', 2);
    g.beginPath(); g.moveTo(w * 0.1, h * 0.38); g.lineTo(w * 0.28, h * 0.38); g.lineTo(w * 0.28, h * 0.6); g.lineTo(w * 0.19, h * 0.7); g.lineTo(w * 0.1, h * 0.6); g.closePath(); fillStroke(g, shade(c, 0.8));
  },
  plant(g, w, h, c) {
    g.fillStyle = '#6b4a2a'; g.fillRect(w * 0.3, h * 0.78, w * 0.4, h * 0.14);
    g.strokeStyle = '#3a6a2a'; g.lineWidth = 8; g.beginPath(); g.moveTo(w * 0.5, h * 0.8); g.quadraticCurveTo(w * 0.4, h * 0.55, w * 0.5, h * 0.4); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(w * (0.5 + s * 0.16), h * 0.62, w * 0.14, h * 0.05, s * 0.5, 0, Math.PI * 2); fillStroke(g, '#4a9a3a'); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.beginPath(); g.ellipse(w * 0.5 + Math.cos(a) * w * 0.14, h * 0.3 + Math.sin(a) * h * 0.14, w * 0.1, h * 0.06, a, 0, Math.PI * 2); fillStroke(g, c); }
    g.beginPath(); g.arc(w * 0.5, h * 0.3, w * 0.09, 0, Math.PI * 2); fillStroke(g, '#ffe040');
    eyes(g, w * 0.5, h * 0.3, w * 0.035, w * 0.02);
  },
  crab(g, w, h, c) {
    g.strokeStyle = shade(c, 0.6); g.lineWidth = 6;
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w * (0.5 + s * 0.2), h * (0.6 + i * 0.06)); g.lineTo(w * (0.5 + s * 0.42), h * (0.72 + i * 0.07)); g.stroke(); }
    g.beginPath(); g.ellipse(w * 0.5, h * 0.58, w * 0.28, h * 0.16, 0, 0, Math.PI * 2); fillStroke(g, c);
    for (const s of [-1, 1]) { g.beginPath(); g.arc(w * (0.5 + s * 0.34), h * 0.34, w * 0.1, 0, Math.PI * 2); fillStroke(g, shade(c, 1.1)); }
    eyes(g, w * 0.5, h * 0.46, w * 0.08, w * 0.035);
  },
};

export const SHAPE_NAMES = Object.keys(SHAPES);

/** Draw a monster figure into canvas `cv` (clears it). */
export function drawFigure(cv, shape, color) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  g.save();
  g.lineJoin = 'round';
  (SHAPES[shape] || SHAPES.blob)(g, cv.width, cv.height, color);
  g.restore();
}
