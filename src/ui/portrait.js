import { h } from './dom.js';
import { spriteCanvas } from './worldRenderer.js';

// A demon portrait: the image if it loads, otherwise a plain named frame (placeholder art).
export function portrait(card, { size = 'md' } = {}) {
  const frame = h('figure', { class: `portrait portrait-${size}`, 'data-demon': card.id });
  const ph = h('div', { class: 'portrait-ph' }, h('span', {}, card.name));
  // Story NPCs (and demons without art) can use a pixel sprite from the CC0 tilesheets.
  const sprite = !card.image && (card.portrait || card.sprite) ? spriteCanvas(card.portrait || card.sprite) : null;
  if (sprite) {
    frame.append(sprite);
  } else if (card.image) {
    const img = h('img', { src: card.image, alt: `${card.name}`, loading: 'lazy' });
    img.addEventListener('error', () => { img.replaceWith(ph); });
    frame.append(img);
  } else {
    frame.append(ph);
  }
  return frame;
}

const FACES = {
  furious: { mouth: 'M9 23 Q16 17 23 23', brows: 'M8 10 L13 12 M24 10 L19 12', color: 'var(--blood)' },
  annoyed: { mouth: 'M10 22 Q16 19 22 22', brows: 'M9 11 L13 11.5 M23 11 L19 11.5', color: 'var(--ember)' },
  neutral: { mouth: 'M10 21 L22 21', brows: '', color: 'var(--muted)' },
  pleased: { mouth: 'M10 20 Q16 24 22 20', brows: '', color: 'var(--jade)' },
  delighted: { mouth: 'M9 19 Q16 27 23 19 Z', brows: '', color: 'var(--jade)' },
};

export function moodFaceSvg(bucket) {
  const f = FACES[bucket] ?? FACES.neutral;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('class', `mood-face mood-${bucket}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Mood: ${bucket}`);
  const add = (tag, attrs) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.append(el);
  };
  add('circle', { cx: 16, cy: 16, r: 14, fill: 'none', stroke: f.color, 'stroke-width': 2 });
  add('circle', { cx: 11.5, cy: 14, r: 1.6, fill: f.color });
  add('circle', { cx: 20.5, cy: 14, r: 1.6, fill: f.color });
  if (f.brows) add('path', { d: f.brows, stroke: f.color, 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' });
  add('path', { d: f.mouth, stroke: f.color, 'stroke-width': 2, fill: bucket === 'delighted' ? f.color : 'none', 'stroke-linecap': 'round' });
  return svg;
}

export function moodArrow(delta) {
  if (!delta) return h('span', { class: 'mood-arrow flat', 'aria-label': 'Mood unchanged' }, '–');
  const up = delta > 0;
  const big = Math.abs(delta) >= 2;
  return h('span', { class: `mood-arrow ${up ? 'up' : 'down'}`, 'aria-label': `Mood ${up ? 'rose' : 'fell'}${big ? ' a lot' : ''}` }, (up ? '▲' : '▼').repeat(big ? 2 : 1));
}
