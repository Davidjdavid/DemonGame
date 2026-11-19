// Use consumables outside battle on you or your demons.
import { h } from './dom.js';
import { ui } from './context.js';
import { DEMONS, ITEMS } from '../data/index.js';
import { usableItems } from '../combat/items.js';
import { useItemOn, demonVitals } from '../game/fieldItems.js';

export function renderItems(message = '') {
  const p = ui.game.player;
  const usable = usableItems(p.items);
  const again = (msg) => renderItems(msg);
  const targets = [{ id: 'you', name: 'You', hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp },
    ...p.stock.map((d) => ({ id: d.uid, name: DEMONS[d.id].name, ...demonVitals(d) }))];
  ui.root.replaceChildren(
    ui.statusBar(),
    h('div', { class: 'screen-head' }, h('h1', {}, 'Items'), h('button', { type: 'button', class: 'secondary', id: 'back-hub', onclick: ui.goHub }, 'Back')),
    message ? h('p', { class: 'notice', id: 'items-msg' }, message) : null,
    usable.length ? null : h('p', { class: 'muted' }, 'Nothing usable right now. Healing Salves and Mana Tonics are sold in shops.'),
    h('section', { class: 'panel' }, h('ul', { class: 'shop-list' }, targets.map((t) => h('li', {},
      h('span', {}, h('strong', {}, t.name), h('span', { class: 'muted num' }, ` HP ${t.hp}/${t.maxHp} · MP ${t.mp}/${t.maxMp}${t.hp <= 0 ? ' · fallen' : ''}`)),
      h('span', { class: 'chips-row' }, usable.map((id) => h('button', {
        type: 'button', class: 'mini', id: `use-${id}-${t.id}`,
        onclick: () => { const r = useItemOn(p, id, t.id); again(r.ok ? `Used ${ITEMS[id].name} on ${t.name}.` : r.reason); },
      }, `${ITEMS[id].name} ×${p.items[id]}`))))))));
}
