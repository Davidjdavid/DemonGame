// Battle effects on an overlay canvas: one distinct placeholder animation per element, drawn over a target's rect,
// plus floating numbers/labels (DOM). speed: 1 normal, 2 fast, 4 faster; fast (tests) = instant.
import { el } from './dom.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

function center(r) { return { cx: r.x + r.w / 2, cy: r.y + r.h / 2, s: Math.min(r.w, r.h) }; }

const EFFECTS = {
  fire: { dur: 650, init(r) { return { ps: Array.from({ length: 34 }, () => ({ x: rand(-0.32, 0.32), v: rand(0.5, 1.1), r: rand(6, 16), ph: rand(0, 6) })) }; },
    draw(g, t, r, d) {
      const { cx, cy, s } = center(r);
      if (t < 0.35) { const k = t / 0.35; const gr = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.55 * k + 1); gr.addColorStop(0, 'rgba(255,240,150,0.95)'); gr.addColorStop(1, 'rgba(255,90,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, s * 0.55 * k + 1, 0, TAU); g.fill(); }
      for (const p of d.ps) {
        const y = cy + s * 0.4 - t * p.v * s * 0.9;
        const x = cx + p.x * s + Math.sin(t * 18 + p.ph) * 5;
        const a = (1 - t) * (0.6 + 0.4 * Math.sin(t * 40 + p.ph));
        g.fillStyle = `rgba(255,${Math.round(200 - t * 150)},${Math.round(60 - t * 60)},${a})`;
        g.beginPath(); g.arc(x, y, p.r * (1 - t * 0.5), 0, TAU); g.fill();
      }
    } },
  ice: { dur: 650, init() { return { sh: Array.from({ length: 11 }, (_, i) => ({ a: (i / 11) * TAU + rand(-0.2, 0.2), l: rand(14, 26) })) }; },
    draw(g, t, r, d) {
      const { cx, cy, s } = center(r);
      for (const p of d.sh) {
        const k = t < 0.55 ? 1 - t / 0.55 : (t - 0.55) / 0.45 * 0.6;
        const dist = s * 0.75 * k + 6;
        const x = cx + Math.cos(p.a) * dist; const y = cy + Math.sin(p.a) * dist;
        g.save(); g.translate(x, y); g.rotate(p.a + Math.PI / 2);
        g.globalAlpha = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
        g.beginPath(); g.moveTo(0, -p.l); g.lineTo(p.l * 0.35, 0); g.lineTo(0, p.l); g.lineTo(-p.l * 0.35, 0); g.closePath();
        g.fillStyle = '#9ff4ff'; g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.stroke();
        g.restore();
      }
      if (t > 0.5 && t < 0.75) { g.fillStyle = `rgba(200,250,255,${0.5 - Math.abs(t - 0.62) * 3})`; g.beginPath(); g.arc(cx, cy, s * 0.35, 0, TAU); g.fill(); }
    } },
  elec: { dur: 600, init() { return { seed: 0 }; },
    draw(g, t, r) {
      const { cx, cy, s } = center(r);
      if (Math.floor(t * 12) % 2 === 1 && t > 0.2) return; // flicker
      for (let b = 0; b < 3; b++) {
        g.beginPath();
        let x = cx + rand(-s * 0.3, s * 0.3); let y = r.y - s * 0.4;
        g.moveTo(x, y);
        while (y < cy) { x += rand(-s * 0.16, s * 0.16); y += rand(s * 0.08, s * 0.16); g.lineTo(x, Math.min(y, cy)); }
        g.strokeStyle = '#fff36a'; g.lineWidth = 7; g.stroke();
        g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; g.stroke();
      }
      g.fillStyle = 'rgba(255,250,150,0.35)'; g.beginPath(); g.arc(cx, cy, s * 0.4, 0, TAU); g.fill();
    } },
  wind: { dur: 700, init() { return {}; },
    draw(g, t, r) {
      const { cx, cy, s } = center(r);
      g.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const rad = s * (0.55 - t * 0.3) * (0.5 + i * 0.13);
        const a0 = t * 9 + i * 1.3;
        g.strokeStyle = `rgba(110,255,140,${(1 - t) * 0.9})`;
        g.lineWidth = 6 - i * 0.6;
        g.beginPath(); g.arc(cx, cy, Math.max(4, rad), a0, a0 + 2.2); g.stroke();
      }
    } },
  light: { dur: 650, init() { return { rays: Array.from({ length: 14 }, (_, i) => (i / 14) * TAU) }; },
    draw(g, t, r, d) {
      const { cx, cy, s } = center(r);
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.5);
      gr.addColorStop(0, `rgba(255,255,240,${1 - t})`); gr.addColorStop(1, 'rgba(255,255,200,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, s * 0.5, 0, TAU); g.fill();
      g.strokeStyle = `rgba(255,255,230,${1 - t})`; g.lineWidth = 4;
      for (const a of d.rays) {
        const l0 = s * 0.12; const l1 = s * (0.2 + t * 0.6);
        g.beginPath(); g.moveTo(cx + Math.cos(a + t) * l0, cy + Math.sin(a + t) * l0); g.lineTo(cx + Math.cos(a + t) * l1, cy + Math.sin(a + t) * l1); g.stroke();
      }
    } },
  dark: { dur: 700, init() { return { bl: Array.from({ length: 9 }, () => ({ x: rand(-0.25, 0.25), y: rand(-0.25, 0.25), r: rand(0.18, 0.3) })) }; },
    draw(g, t, r, d) {
      const { cx, cy, s } = center(r);
      const k = t < 0.5 ? t / 0.5 : 1 - (t - 0.5) / 0.5 * 0.7;
      for (const b of d.bl) {
        g.fillStyle = `rgba(90,20,140,${0.75 * (1 - t * 0.6)})`;
        g.beginPath(); g.arc(cx + b.x * s * k, cy + b.y * s * k, b.r * s * k + 2, 0, TAU); g.fill();
      }
      g.fillStyle = `rgba(10,0,20,${0.85 * (1 - t)})`; g.beginPath(); g.arc(cx, cy, s * 0.18 * k + 2, 0, TAU); g.fill();
    } },
  phys: { dur: 380, init() { return { dir: Math.random() < 0.5 ? 1 : -1 }; },
    draw(g, t, r, d) {
      const { cx, cy, s } = center(r);
      const k = Math.min(1, t / 0.45);
      g.lineCap = 'round';
      for (const [off, w] of [[0, 9], [s * 0.12, 4]]) {
        g.strokeStyle = `rgba(255,255,255,${1 - Math.max(0, t - 0.45) / 0.55})`; g.lineWidth = w;
        g.beginPath();
        const x0 = cx - d.dir * s * 0.45; const y0 = cy - s * 0.45 + off;
        g.moveTo(x0, y0); g.lineTo(x0 + d.dir * s * 0.9 * k, y0 + s * 0.9 * k);
        g.stroke();
      }
    } },
  almighty: { dur: 700, init() { return {}; },
    draw(g, t, r) {
      const { cx, cy, s } = center(r);
      for (const lag of [0, 0.22]) {
        const k = Math.max(0, t - lag) / (1 - lag);
        if (k <= 0) continue;
        g.strokeStyle = `rgba(255,74,216,${1 - k})`; g.lineWidth = 12 * (1 - k) + 2;
        g.beginPath(); g.arc(cx, cy, s * 0.7 * k + 4, 0, TAU); g.stroke();
      }
    } },
  heal: { dur: 650, init() { return { ps: Array.from({ length: 12 }, () => ({ x: rand(-0.4, 0.4), y: rand(0, 0.5), v: rand(0.3, 0.7) })) }; },
    draw(g, t, r, d) {
      const { cx, cy, s } = center(r);
      g.fillStyle = `rgba(120,255,160,${1 - t})`;
      for (const p of d.ps) {
        const x = cx + p.x * s; const y = cy + p.y * s - t * p.v * s;
        g.fillRect(x - 7, y - 2, 14, 4); g.fillRect(x - 2, y - 7, 4, 14);
      }
    } },
  buff: { dur: 600, init() { return {}; },
    draw(g, t, r, d) {
      const { cx, cy, s } = center(r);
      const up = d.up !== false;
      g.fillStyle = up ? `rgba(110,190,255,${1 - t})` : `rgba(255,90,90,${1 - t})`;
      for (const dx of [-0.25, 0, 0.25]) {
        const x = cx + dx * s; const y = cy + (up ? 0.2 - t * 0.5 : -0.2 + t * 0.5) * s;
        g.beginPath();
        if (up) { g.moveTo(x, y - 14); g.lineTo(x + 12, y + 4); g.lineTo(x - 12, y + 4); } else { g.moveTo(x, y + 14); g.lineTo(x + 12, y - 4); g.lineTo(x - 12, y - 4); }
        g.closePath(); g.fill();
      }
    } },
  analyze: { dur: 600, init() { return {}; },
    draw(g, t, r) {
      g.strokeStyle = `rgba(90,230,255,${1 - t * 0.6})`; g.lineWidth = 3;
      g.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
      const y = r.y + r.h * t; g.beginPath(); g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); g.stroke();
    } },
};

export function createFx(container, { speed = () => 1, fast = false } = {}) {
  const cv = el('canvas', { class: 'fx' });
  container.append(cv);
  const g = cv.getContext('2d');
  const active = [];
  let running = true;

  function resize() {
    const r = container.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width));
    cv.height = Math.max(1, Math.round(r.height));
  }
  resize();
  window.addEventListener('resize', resize);

  function rectOf(node) {
    const a = node.getBoundingClientRect();
    const b = container.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
  }

  function play(kind, node, extra = {}) {
    const def = EFFECTS[kind] || EFFECTS.phys;
    if (fast) return Promise.resolve();
    const r = rectOf(node);
    const d = { ...def.init(r), ...extra };
    return new Promise((resolve) => active.push({ def, r, d, t0: performance.now(), dur: def.dur / speed(), resolve }));
  }

  function pop(node, text, cls = '') {
    const r = rectOf(node);
    const p = el('div', { class: `pop ${cls}` }, text);
    p.style.left = `${r.x + r.w / 2}px`;
    p.style.top = `${r.y + r.h * 0.35}px`;
    p.style.animationDuration = `${fast ? 1 : 1100 / speed()}ms`;
    container.append(p);
    setTimeout(() => p.remove(), fast ? 5 : 1200 / speed());
  }

  function loop(now) {
    if (!running) return;
    g.clearRect(0, 0, cv.width, cv.height);
    for (let i = active.length - 1; i >= 0; i--) {
      const a = active[i];
      const t = Math.max(0, Math.min(1, (now - a.t0) / a.dur));
      g.save();
      a.def.draw(g, t, a.r, a.d);
      g.restore();
      if (t >= 1) { active.splice(i, 1); a.resolve(); }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return {
    play, pop, resize,
    destroy() { running = false; window.removeEventListener('resize', resize); cv.remove(); },
  };
}
