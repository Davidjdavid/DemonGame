// Field menu (Esc): party status and stat points, items, settings.
import { el, clear } from './dom.js';
import { ITEMS, itemName } from '../data/items.js';
import { MONSTERS } from '../data/monsters.js';
import { SKILLS } from '../data/skills.js';
import { spendPoint, expToNext } from '../growth/leveling.js';
import { useFieldItem, maxOf, partyMembers } from '../game/fieldItems.js';
import { STAT_KEYS } from '../combat/stats.js';

const STAT_NAMES = { st: 'Strength', ma: 'Magic', vi: 'Vitality', ag: 'Agility', lu: 'Luck' };
const nameOf = (game, who) => (who === game.hero ? game.hero.name : MONSTERS[who.type].name);

export function renderFieldMenu(box, game, { tab = 'party', onClose, onChange, onExit } = {}) {
  clear(box);
  const tabs = el('div', { class: 'tabs' });
  const body = el('div', { class: 'tab-body' });
  const msg = el('p', { class: 'muted fm-msg' });
  const setTab = (t) => { tab = t; draw(); };
  for (const [id, label] of [['party', 'Party'], ['items', 'Items'], ['settings', 'Settings']]) {
    tabs.append(el('button', { class: `tab${tab === id ? ' on' : ''}`, onclick: () => setTab(id), id: `tab-${id}` }, label));
  }
  box.append(el('h2', {}, 'Menu'), tabs, body, msg, el('button', { onclick: onClose, id: 'menu-close' }, 'Close (Esc)'));

  function bar(cls, v, max, label) {
    return el('div', { class: `bar ${cls}` }, el('i', { style: { width: `${(100 * v) / Math.max(1, max)}%` } }), el('span', {}, `${label} ${v}/${max}`));
  }

  function draw() {
    tabs.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.id === `tab-${tab}`));
    clear(body);
    if (tab === 'party') {
      for (const who of partyMembers(game)) {
        const mx = maxOf(game, who);
        const isHero = who === game.hero;
        const stats = isHero ? who.stats : mx.stats;
        const card = el('div', { class: 'fm-card' },
          el('div', { class: 'c-name' }, nameOf(game, who), el('span', { class: 'lv' }, ` Lv ${who.level}`),
            el('small', { class: 'muted' }, ` EXP ${who.exp}/${expToNext(who.level)}`)),
          bar('hp', who.hp, mx.maxHp, 'HP'), bar('mp', who.mp, mx.maxMp, 'MP'));
        const st = el('div', { class: 'stats' });
        for (const k of STAT_KEYS) {
          const plus = isHero && who.points > 0 ? el('button', { class: 'plus', id: `plus-${k}`, onclick: () => { spendPoint(who, k); onChange?.(); draw(); } }, '+') : null;
          st.append(el('span', { class: 'stat', title: STAT_NAMES[k] }, `${k.toUpperCase()} ${stats[k]}`, plus));
        }
        card.append(st);
        if (isHero && who.points > 0) card.append(el('p', { class: 'points' }, `${who.points} stat point${who.points > 1 ? 's' : ''} to place.`));
        if (!isHero) card.append(el('p', { class: 'muted small' }, `Skills: ${who.skills.map((s) => SKILLS[s]?.name).join(', ') || 'none'}`));
        body.append(card);
      }
    } else if (tab === 'items') {
      const ids = Object.keys(game.inv).filter((id) => game.inv[id] > 0);
      body.append(el('p', {}, `Gold: ${game.money}`));
      if (!ids.length) body.append(el('p', { class: 'muted' }, 'No items.'));
      for (const id of ids) {
        const it = ITEMS[id];
        const row = el('div', { class: 'item-row' }, el('span', {}, `${itemName(id)} ×${game.inv[id]}`), el('small', { class: 'muted' }, it?.desc || ''));
        if (it && ['field', 'both'].includes(it.use)) {
          if (it.target === 'ally' || it.target === 'dead_ally') {
            for (const who of partyMembers(game)) {
              row.append(el('button', { onclick: () => { const r = useFieldItem(game, id, who); msg.textContent = r.msg; onChange?.(); draw(); } }, `→ ${nameOf(game, who)}`));
            }
          } else {
            row.append(el('button', { onclick: () => {
              const r = useFieldItem(game, id);
              msg.textContent = r.msg;
              if (r.exit) onExit?.();
              onChange?.();
              draw();
            } }, 'Use'));
          }
        }
        body.append(row);
      }
    } else {
      const mm = el('input', { type: 'checkbox', id: 'opt-minimap' });
      mm.checked = game.settings.minimap;
      mm.onchange = () => { game.settings.minimap = mm.checked; onChange?.(); };
      const sp = el('select', { id: 'opt-speed' }, ...[1, 2, 4].map((v) => el('option', { value: v }, `${v}×`)));
      sp.value = String(game.settings.battleSpeed || 1);
      sp.onchange = () => { game.settings.battleSpeed = Number(sp.value); };
      body.append(
        el('label', {}, mm, ' Corner minimap'),
        el('label', {}, 'Battle speed ', sp),
        el('p', { class: 'muted' }, 'WASD or arrow keys move and strafe. Q / E turn. M opens the map. Enter confirms.'),
      );
    }
  }
  draw();
}
