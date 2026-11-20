// Victory screen after the boss: a short summary of the run. Resolves when dismissed.
import { el } from './dom.js';
import { MONSTERS } from '../data/monsters.js';

export function showEnding(root, game) {
  return new Promise((resolve) => {
    const mins = Math.round((game.playMs || 0) / 60000);
    const s = game.stats || {};
    const box = el('div', { class: 'overlay ending' },
      el('div', { class: 'menu' },
        el('h2', {}, 'The spire is cleared'),
        el('p', {}, '[Ending placeholder]'),
        el('ul', {},
          el('li', {}, `Hero level ${game.hero.level}`),
          el('li', {}, `Party: ${game.party.map((r) => `${MONSTERS[r.type].name} Lv ${r.level}`).join(', ') || 'just you'}`),
          el('li', {}, `${s.battles || 0} battles, ${s.fled || 0} escapes, ${s.recruited || 0} recruited, ${s.fused || 0} fused`),
          el('li', {}, `Play time about ${mins} minutes`)),
        el('button', { id: 'ending-close', class: 'primary', onclick: () => { box.remove(); resolve(); } }, 'Keep exploring')));
    root.append(box);
  });
}
