// Field menu (Esc): party status and stat points, items, settings.
import { el, clear } from './dom.js';
import { ITEMS, itemName } from '../data/items.js';
import { MONSTERS } from '../data/monsters.js';
import { SKILLS } from '../data/skills.js';
import { spendPoint, expToNext } from '../growth/leveling.js';
import { useFieldItem, maxOf, partyMembers, castField } from '../game/fieldItems.js';
import { STAT_KEYS } from '../combat/stats.js';
import { STANCES } from '../talk/negotiation.js';
import { ELEMENTS, ELEMENT_SHORT } from '../combat/affinity.js';

const STAT_NAMES = { st: 'Strength', ma: 'Magic', vi: 'Vitality', ag: 'Agility', lu: 'Luck' };
const nameOf = (game, who) => (who === game.hero ? game.hero.name : MONSTERS[who.type].name);

export function renderFieldMenu(box, game, { tab = 'party', onClose, onChange, onExit } = {}) {
  clear(box);
  const tabs = el('div', { class: 'tabs' });
  const body = el('div', { class: 'tab-body' });
  const msg = el('p', { class: 'muted fm-msg' });
  const setTab = (t) => { tab = t; draw(); };
  for (const [id, label] of [['party', 'Party'], ['items', 'Items'], ['notebook', 'Notebook'], ['settings', 'Settings']]) {
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
      const all = [...partyMembers(game), ...game.stock];
      if (game.stock.length) body.append(el('p', { class: 'muted small' }, `Party ${game.party.length}/3 · stock ${game.stock.length}`));
      for (const who of all) {
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
        if (!isHero) {
          card.append(el('p', { class: 'muted small' }, `Skills: ${who.skills.map((s) => SKILLS[s]?.name).join(', ') || 'none'}`));
          const inParty = game.party.includes(who);
          const row = el('div', { class: 'row left' },
            el('button', { class: 'swap', disabled: !inParty && game.party.length >= 3, onclick: () => {
              if (inParty) { game.party.splice(game.party.indexOf(who), 1); game.stock.push(who); } else { game.stock.splice(game.stock.indexOf(who), 1); game.party.push(who); }
              onChange?.(); draw();
            } }, inParty ? 'Move to stock' : 'Move to party'),
            el('button', { class: `auto${who.auto ? ' on' : ''}`, onclick: () => { who.auto = !who.auto; draw(); } }, `Auto ${who.auto ? 'on' : 'off'}`),
            el('button', { onclick: (e) => {
              if (e.currentTarget.dataset.armed) {
                for (const list of [game.party, game.stock]) { const i = list.indexOf(who); if (i >= 0) list.splice(i, 1); }
                onChange?.(); draw();
              } else { e.currentTarget.dataset.armed = '1'; e.currentTarget.textContent = 'Click again to release'; }
            } }, 'Release'));
          if (!inParty) card.classList.add('stocked');
          card.append(row);
          const castable = who.skills.filter((sid) => ['heal', 'revive'].includes(SKILLS[sid]?.kind));
          if (inParty && castable.length) {
            const crow = el('div', { class: 'row left small' });
            for (const sid of castable) {
              const sk = SKILLS[sid];
              if (sk.target === 'allies') {
                crow.append(el('button', { onclick: () => { const r = castField(game, who, sid); msg.textContent = r.msg; onChange?.(); draw(); } }, `${sk.name} (${sk.cost.mp} MP)`));
              } else {
                for (const t of partyMembers(game)) {
                  crow.append(el('button', { onclick: () => { const r = castField(game, who, sid, t); msg.textContent = r.msg; onChange?.(); draw(); } }, `${sk.name} → ${nameOf(game, t)}`));
                }
              }
            }
            card.append(crow);
          }
        }
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
    } else if (tab === 'notebook') {
      const nb = game.notebook;
      const pers = Object.keys(nb.stances);
      body.append(el('h3', {}, 'What worked in talks'));
      if (!pers.length) body.append(el('p', { class: 'muted' }, 'Talk to enemies (Talk in battle) to learn what each personality likes.'));
      for (const p of pers) {
        const types = Object.entries(nb.types).filter(([, v]) => v === p).map(([t]) => MONSTERS[t].name);
        const marks = STANCES.map((st) => { const d = nb.stances[p][st]; return `${st} ${d === undefined ? '?' : d >= 2 ? '▲▲' : d === 1 ? '▲' : d === 0 ? '–' : d === -1 ? '▼' : '▼▼'}`; });
        const dm = nb.demands[p] || {};
        body.append(el('div', { class: 'fm-card' }, el('b', {}, p[0].toUpperCase() + p.slice(1)), el('span', { class: 'muted small' }, `  ${types.join(', ')}`),
          el('div', { class: 'small' }, marks.join(' · ')),
          el('div', { class: 'small muted' }, `Paying: ${dm.pay === undefined ? '?' : dm.pay > 0 ? 'helps' : 'no help'} · refusing: ${dm.refuse === undefined ? '?' : dm.refuse < 0 ? 'angers it' : 'fine'}${dm.ran ? ' · has run off with payment' : ''}`)));
      }
      body.append(el('h3', {}, 'Known affinities (your party)'));
      const members = partyMembers(game);
      const types = [...new Set(members.flatMap((m) => Object.keys(m.knows || {})))].filter((t) => MONSTERS[t]);
      if (!types.length) body.append(el('p', { class: 'muted' }, 'Nothing yet. Hit enemies with elements or use Analyze.'));
      for (const t of types.sort()) {
        const cells = ELEMENTS.map((x) => {
          const k = members.map((m) => m.knows?.[t]?.[x]).find(Boolean);
          return `${ELEMENT_SHORT[x]} ${k ? { weak: 'Wk', normal: '·', resist: 'Rs', null: 'Nu', repel: 'Rp', absorb: 'Ab' }[k] : '?'}`;
        });
        body.append(el('div', { class: 'small aff-row' }, el('b', {}, MONSTERS[t].name), ` ${nb.types[t] ? `(${nb.types[t]}) ` : ''}`, cells.join('  ')));
      }
    } else {
      const mm = el('input', { type: 'checkbox', id: 'opt-minimap' });
      mm.checked = game.settings.minimap;
      mm.onchange = () => { game.settings.minimap = mm.checked; onChange?.(); };
      const sp = el('select', { id: 'opt-speed' }, ...[1, 2, 4].map((v) => el('option', { value: v }, `${v}×`)));
      sp.value = String(game.settings.battleSpeed || 1);
      sp.onchange = () => { game.settings.battleSpeed = Number(sp.value); };
      const mv = el('select', { id: 'opt-movement' }, el('option', { value: 'free' }, 'Free (mouse look)'), el('option', { value: 'grid' }, 'Grid steps (classic)'));
      mv.value = game.settings.movement ?? 'free';
      mv.onchange = () => { game.settings.movement = mv.value; onChange?.(); };
      const ai = el('input', { type: 'checkbox', id: 'opt-autoitems' });
      ai.checked = !!game.settings.autoItems;
      ai.onchange = () => { game.settings.autoItems = ai.checked; };
      body.append(
        el('label', {}, 'Movement ', mv),
        el('label', {}, mm, ' Corner minimap'),
        el('label', {}, ai, ' Auto battle may use items (Medicine, Revival Beads)'),
        el('label', {}, 'Battle speed ', sp),
        el('p', { class: 'muted' }, 'WASD or arrow keys move and strafe. Q / E turn. M opens the map. Enter confirms.'),
      );
    }
  }
  draw();
}
