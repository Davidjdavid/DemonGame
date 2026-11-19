// Shop: buy items and armor (armor sets your weaknesses and strengths), sell items.
import { h } from './dom.js';
import { ui } from './context.js';
import { ITEMS } from '../data/index.js';
import { inventoryList } from '../game/player.js';
import { SHOP_ITEMS, ARMOR, buyItem, sellItem, buyArmor } from '../game/shop.js';
import { ELEMENT_NAMES } from '../combat/affinity.js';

function tierText(tiers) {
  const parts = Object.entries(tiers).map(([el, t]) => `${ELEMENT_NAMES[el]} ${t > 0 ? `+${t} (resist)` : `${t} (weak)`}`);
  return parts.length ? parts.join(', ') : 'no strengths or weaknesses';
}

export function renderShop(back, message = '') {
  const p = ui.game.player;
  const again = (msg) => renderShop(back, msg);
  ui.root.replaceChildren(
    ui.statusBar(),
    h('div', { class: 'screen-head' }, h('h1', {}, 'Shop'), h('button', { type: 'button', class: 'secondary', id: 'shop-leave', onclick: back }, 'Leave')),
    message ? h('p', { class: 'notice', id: 'shop-msg' }, message) : null,
    h('div', { class: 'cols' },
      h('section', { class: 'panel' },
        h('h2', {}, 'Items'),
        h('ul', { class: 'shop-list' }, SHOP_ITEMS.filter((id) => ITEMS[id]).map((id) => h('li', {},
          h('span', {}, h('strong', {}, ITEMS[id].name), h('span', { class: 'muted' }, ` ${ITEMS[id].desc}`)),
          h('button', { type: 'button', class: 'mini', id: `buy-${id}`, onclick: () => { const r = buyItem(p, id); again(r.ok ? `Bought ${ITEMS[id].name}.` : r.reason); } }, `${ITEMS[id].value} gold`)))),
        h('h2', {}, 'Sell'),
        h('ul', { class: 'shop-list' }, inventoryList(p).map((i) => h('li', {},
          h('span', {}, `${i.name} ×${i.count}`),
          h('button', { type: 'button', class: 'mini secondary', id: `sell-${i.id}`, onclick: () => { const r = sellItem(p, i.id); again(r.ok ? `Sold for ${r.price} gold.` : r.reason); } }, `Sell ${Math.floor(ITEMS[i.id].value / 2)}`))))),
      h('section', { class: 'panel' },
        h('h2', {}, 'Armor'),
        h('p', { class: 'muted' }, 'Your armor sets your own weaknesses and strengths.'),
        h('ul', { class: 'shop-list' }, Object.values(ARMOR).map((a) => {
          const owned = p.armorOwned?.includes(a.id);
          const worn = p.armor === a.id;
          return h('li', {},
            h('span', {}, h('strong', {}, a.name), h('span', { class: 'muted' }, ` ${a.desc} ${tierText(a.tiers)}.`)),
            worn ? h('span', { class: 'gold' }, 'Wearing')
              : h('button', { type: 'button', class: 'mini', id: `armor-${a.id}`, onclick: () => { const r = buyArmor(p, a.id); again(r.ok ? `You put on the ${a.name}.` : r.reason); } }, owned ? 'Wear' : `${a.price} gold`));
        })))));
}
