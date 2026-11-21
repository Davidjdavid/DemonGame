// Hub service panels: weapons, armor, items, healer, inn (rest + save), fusion (+ registry).
import { el, clear } from './dom.js';
import { WEAPONS, ARMORS } from '../data/equipment.js';
import { ITEMS, itemName } from '../data/items.js';
import { MONSTERS } from '../data/monsters.js';
import { SKILLS, skillDesc } from '../data/skills.js';
import { ELEMENT_NAMES } from '../combat/affinity.js';
import { heroDerived } from '../combat/units.js';
import { stock, buyGear, gearCost, buyItem, sellItem, healerQuote, heal, innCost, rest, SELL_RATE } from '../game/shop.js';
import { fusionResult, inheritCandidates, inheritSlots, fuse, summon, summonCost, FUSION_REACH } from '../growth/fusion.js';
import { skillsAt } from '../data/monsters.js';
import { drawFigure } from './figures.js';
import { MAX_RECRUITS } from './talk.js';

const affText = (aff) => Object.entries(aff || {}).map(([e, t]) => `${t} ${ELEMENT_NAMES[e]}`).join(', ');

/** Open a service panel over `root`. Resolves when closed. hooks.save(label) -> Promise<where>. */
export function openService(root, game, feature, hooks = {}) {
  return new Promise((resolve) => {
    const overlay = el('div', { class: 'overlay service' });
    const box = el('div', { class: 'menu svc' });
    overlay.append(box);
    root.append(overlay);
    const msg = el('p', { class: 'fm-msg' });
    let fuseSel = [];
    let inheritSel = new Set();
    let fusionTab = 'fuse';
    const close = () => { window.removeEventListener('keydown', onKey); overlay.remove(); hooks.onChange?.(); resolve(); };
    const onKey = (e) => { if (e.code === 'Escape') { e.preventDefault(); close(); } };
    window.addEventListener('keydown', onKey);
    const say = (t) => { msg.textContent = t; };

    function header(title) {
      return el('div', { class: 'svc-head' }, el('h2', {}, title), el('span', { class: 'gold' }, `${game.money} gold`));
    }

    function gearRows(kind) {
      const table = kind === 'weapons' ? WEAPONS : ARMORS;
      const slot = kind === 'weapons' ? 'weapon' : 'armor';
      const d = heroDerived(game.hero);
      const cur = table[game.hero.equip[slot]];
      const out = [el('p', { class: 'muted' }, `Equipped: ${cur.name} (${kind === 'weapons' ? `ATK ${cur.atk}${cur.element ? `, ${ELEMENT_NAMES[cur.element]}` : ''}` : `DEF ${cur.def}${Object.keys(cur.aff).length ? `, ${affText(cur.aff)}` : ''}`}) · Hero ATK +${d.atkBonus} DEF +${d.defBonus}`)];
      const ids = stock(kind, game.deepest);
      if (!ids.length) out.push(el('p', { class: 'muted' }, 'Nothing new yet. Come back after you climb higher.'));
      for (const id of ids) {
        const it = table[id];
        const owned = game.hero.equip[slot] === id;
        const cost = gearCost(game, kind, id);
        const stat = kind === 'weapons' ? `ATK ${it.atk} (${it.atk - cur.atk >= 0 ? '+' : ''}${it.atk - cur.atk})${it.element ? ` · attacks are ${ELEMENT_NAMES[it.element]}` : ''}${it.skill ? ` · skill: ${SKILLS[it.skill].name}` : ''}`
          : `DEF ${it.def} (${it.def - cur.def >= 0 ? '+' : ''}${it.def - cur.def})${Object.keys(it.aff).length ? ` · ${affText(it.aff)}` : ''}`;
        out.push(el('div', { class: 'item-row' }, el('b', {}, it.name), el('span', { class: 'small' }, stat), el('span', { class: 'price' }, `${it.price} g`),
          el('button', { id: `buy-${id}`, disabled: owned || game.money < cost, onclick: () => { const r = buyGear(game, kind, id); say(r.msg); draw(); } }, owned ? 'Equipped' : cost === it.price ? 'Buy & equip' : `Buy & equip (${cost} g after trade-in)`)));
      }
      return out;
    }

    function itemRows() {
      const out = [el('h3', {}, 'Buy')];
      for (const id of stock('items', game.deepest)) {
        const it = ITEMS[id];
        out.push(el('div', { class: 'item-row' }, el('b', {}, it.name), el('span', { class: 'small muted' }, it.desc), el('span', { class: 'price' }, `${it.price} g`),
          el('span', { class: 'muted small' }, `have ${game.inv[id] || 0}`),
          el('button', { id: `buy-${id}`, disabled: game.money < it.price, onclick: () => { say(buyItem(game, id, 1).msg); draw(); } }, 'Buy 1'),
          el('button', { disabled: game.money < it.price * 5, onclick: () => { say(buyItem(game, id, 5).msg); draw(); } }, 'Buy 5')));
      }
      const sellable = Object.keys(game.inv).filter((id) => ITEMS[id] && ITEMS[id].use !== 'key' && game.inv[id] > 0);
      if (sellable.length) out.push(el('h3', {}, 'Sell'));
      for (const id of sellable) {
        out.push(el('div', { class: 'item-row' }, el('b', {}, `${itemName(id)} ×${game.inv[id]}`), el('span', { class: 'price' }, `${Math.floor(ITEMS[id].price * SELL_RATE)} g`),
          el('button', { onclick: () => { say(sellItem(game, id, 1).msg); draw(); } }, 'Sell 1')));
      }
      return out;
    }

    function healerRows() {
      const q = healerQuote(game);
      return [
        el('p', {}, q.cost ? `Missing ${q.hp} HP and ${q.mp} MP${q.revives ? `, ${q.revives} fallen` : ''} (stock included).` : 'Everyone is in full health.'),
        el('p', { class: 'muted small' }, 'Price: 1 gold per HP, 2 per MP, revival by level.'),
        el('button', { id: 'heal-all', disabled: !q.cost || game.money < q.cost, onclick: () => { say(heal(game).msg); draw(); } }, `Heal everyone (${q.cost} g)`),
      ];
    }

    function innRows() {
      const c = innCost(game);
      return [
        el('p', {}, 'Rest to restore everyone, then your game is saved.'),
        el('div', { class: 'row left' },
          el('button', { id: 'inn-rest', disabled: game.money < c, onclick: async () => {
            const r = rest(game);
            say(r.msg);
            if (r.ok && hooks.save) say(`${r.msg} ${await saveText()}`);
            draw();
          } }, `Rest & save (${c} g)`),
          el('button', { id: 'inn-save', onclick: async () => { say(await saveText()); } }, 'Save only (free)')),
      ];
    }

    async function saveText() {
      const where = await hooks.save?.('Inn');
      return where ? `Saved (${where === 'cloud' ? 'to your account' : 'in this browser'}).` : 'Saving is not available here.';
    }

    function recruitLabel(r) {
      const inParty = game.party.includes(r);
      return `${MONSTERS[r.type].name} Lv ${r.level}${inParty ? '' : ' (stock)'}`;
    }

    function fusionRows() {
      const out = [el('div', { class: 'tabs' },
        el('button', { class: `tab${fusionTab === 'fuse' ? ' on' : ''}`, onclick: () => { fusionTab = 'fuse'; draw(); } }, 'Fuse'),
        el('button', { class: `tab${fusionTab === 'registry' ? ' on' : ''}`, id: 'tab-registry', onclick: () => { fusionTab = 'registry'; draw(); } }, 'Registry'))];
      if (fusionTab === 'registry') {
        const types = Object.keys(game.registry);
        out.push(el('p', { class: 'muted small' }, 'Monsters you have recruited or fused, at their best recorded level. Summon a copy for gold.'));
        if (!types.length) out.push(el('p', { class: 'muted' }, 'Nothing registered yet.'));
        for (const t of types) {
          const reg = game.registry[t];
          const cost = summonCost(reg.level);
          out.push(el('div', { class: 'item-row' }, el('b', {}, `${MONSTERS[t].name} Lv ${reg.level}`), el('span', { class: 'small muted' }, reg.skills.map((s) => SKILLS[s]?.name).join(', ')),
            el('button', { disabled: game.money < cost || reg.level > game.hero.level + FUSION_REACH, onclick: () => { const r = summon(game, t, MAX_RECRUITS); say(r.ok ? `${MONSTERS[t].name} joins you (${r.cost} g).` : r.reason); draw(); } }, `Summon (${cost} g)`)));
        }
        return out;
      }
      const all = [...game.party, ...game.stock];
      if (all.length < 2) { out.push(el('p', { class: 'muted' }, 'You need two recruited monsters to fuse.')); return out; }
      out.push(el('p', { class: 'muted small' }, 'Pick two monsters. The result comes from their families and average level; it inherits skills you choose and everything both parents knew.'));
      const list = el('div', { class: 'pick' });
      for (const r of all) {
        const on = fuseSel.includes(r.uid);
        list.append(el('button', { class: `pick-btn${on ? ' on' : ''}`, 'data-uid': r.uid, onclick: () => {
          fuseSel = on ? fuseSel.filter((u) => u !== r.uid) : [...fuseSel, r.uid].slice(-2);
          inheritSel = new Set();
          draw();
        } }, recruitLabel(r), el('small', { class: 'muted' }, ` ${MONSTERS[r.type].family}`)));
      }
      out.push(list);
      if (fuseSel.length === 2) {
        const [a, b] = fuseSel.map((u) => all.find((r) => r.uid === u));
        const res = fusionResult(a, b, game.hero.level);
        if (!res) {
          out.push(el('p', { class: 'bad' }, "Two of the same family can't be fused."));
        } else {
          const m = MONSTERS[res.type];
          const fig = el('canvas', { class: 'fig small-fig', width: 110, height: 110 });
          drawFigure(fig, m.shape, m.color);
          const base = skillsAt(res.type, res.level);
          const cands = inheritCandidates(a, b, res);
          const slots = inheritSlots(res);
          const prev = el('div', { class: 'fusion-preview' }, fig, el('div', {},
            el('div', { class: 'e-name' }, `${m.name}`, el('span', { class: 'lv' }, ` Lv ${res.level} · ${res.family}${m.fusionOnly ? ' · fusion only' : ''}`)),
            el('div', { class: 'small' }, `Affinities: ${affText(m.aff) || 'none special'}`),
            el('div', { class: 'small' }, `Skills: ${base.map((s) => SKILLS[s].name).join(', ') || 'none'}`),
            res.locked ? el('p', { class: 'bad' }, `Too strong for you to command (needs hero Lv ${res.level - FUSION_REACH}).`) : null));
          out.push(prev);
          if (!res.locked && cands.length) {
            out.push(el('p', { class: 'small' }, `Inherit up to ${slots} skill${slots === 1 ? '' : 's'}:`));
            const box = el('div', { class: 'pick' });
            for (const s of cands) {
              const on = inheritSel.has(s);
              box.append(el('button', { class: `pick-btn${on ? ' on' : ''}`, title: skillDesc(SKILLS[s]), disabled: !on && inheritSel.size >= slots, onclick: () => { if (on) inheritSel.delete(s); else inheritSel.add(s); draw(); } }, SKILLS[s].name));
            }
            out.push(box);
          }
          out.push(el('button', { id: 'do-fuse', class: 'primary', disabled: res.locked, onclick: () => {
            const r = fuse(game, a.uid, b.uid, [...inheritSel]);
            if (r.ok) { game.stats.fused++; say(`${MONSTERS[r.child.type].name} is born!`); fuseSel = []; inheritSel = new Set(); } else say(r.reason);
            draw();
          } }, 'Fuse'));
        }
      }
      return out;
    }

    const TITLES = { weapons: 'Weapon Shop', armor: 'Armor Shop', items: 'Item Shop', healer: 'Healer', inn: 'Inn', fusion: 'Fusion Room' };

    function draw() {
      hooks.onChange?.(); // keep the HUD party strip in step with healer / inn / shop actions
      clear(box);
      box.append(header(TITLES[feature.service] || feature.label));
      const rows = feature.service === 'weapons' || feature.service === 'armor' ? gearRows(feature.service)
        : feature.service === 'items' ? itemRows()
          : feature.service === 'healer' ? healerRows()
            : feature.service === 'inn' ? innRows()
              : feature.service === 'fusion' ? fusionRows() : [el('p', {}, '[Closed]')];
      box.append(el('div', { class: 'svc-body' }, ...rows), msg, el('button', { id: 'svc-close', onclick: close }, 'Leave (Esc)'));
    }
    draw();
  });
}
