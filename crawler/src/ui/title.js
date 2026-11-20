// Title screen: continue from the newest save, or start a new game.
import { el, clear } from './dom.js';

export function showTitle(app, { saves, onNew, onLoad }) {
  clear(app);
  const when = (s) => new Date(s.at).toLocaleString();
  const box = el('div', { class: 'title-screen' },
    el('h1', {}, 'Hollow Spire'),
    el('p', { class: 'muted' }, 'A first-person dungeon crawl. Climb the spire, talk monsters into joining you, fuse them, and come back stronger.'),
    el('div', { class: 'title-buttons' },
      ...saves.map((s) => el('button', { class: 'primary', onclick: () => onLoad(s) }, `Continue — ${s.label} (${when(s)})`)),
      el('button', { id: 'new-game', onclick: onNew }, 'New game')),
    el('p', { class: 'muted small' }, 'WASD / arrows move and strafe · Q / E turn · M map · Esc menu · mouse for menus and targets'));
  app.append(box);
}
