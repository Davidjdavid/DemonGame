// Party screen: you (stats, points, skills) and your demons (EXP, skills, pending learns, teaching).
import { h, mount } from './dom.js';
import { portrait } from './portrait.js';
import { ui } from './context.js';
import { DEMONS } from '../data/index.js';
import { SKILLS } from '../data/skills.js';
import { STOCK_MAX, PARTY_MAX, SKILL_SLOTS, setInParty, partyDemons } from '../game/demons.js';
import { expToNext, primeLevel, canTeach, teachProtagonist, spendStatPoint, resolvePending } from '../growth/leveling.js';
import { STAT_KEYS } from '../combat/stats.js';
import { affinitySummary } from './affinityText.js';
import { BATTLE } from '../data/battleData.js';
import { ARMOR, armorTiers } from '../game/shop.js';

const STAT_NAMES = { str: 'Strength', mag: 'Magic', vit: 'Vitality', agi: 'Agility', luck: 'Luck' };

function skillChip(id) {
  const s = SKILLS[id];
  return h('li', { class: 'chip-skill', title: s ? `${s.element} ${s.kind}` : id }, s?.name ?? id);
}

function expBar(exp, need) {
  const pct = Math.min(100, Math.round((100 * exp) / need));
  return h('div', { class: 'bar exp', role: 'meter', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'EXP' }, h('span', { style: `width:${pct}%` }));
}

export function renderParty(message = '') {
  const { game } = ui;
  const p = game.player;
  const rerender = (msg) => renderParty(msg);

  const you = h('section', { class: 'panel' },
    h('h2', {}, 'You'),
    h('p', { class: 'num' }, `Lv ${p.level} · HP ${p.hp}/${p.maxHp} · MP ${p.mp}/${p.maxMp} · EXP ${p.exp}/${expToNext(p.level)}`),
    expBar(p.exp, expToNext(p.level)),
    p.statPoints ? h('p', { class: 'gold', id: 'stat-points' }, `${p.statPoints} stat point${p.statPoints === 1 ? '' : 's'} to spend`) : null,
    h('ul', { class: 'stats' }, STAT_KEYS.map((k) => h('li', {},
      h('span', {}, STAT_NAMES[k]), h('strong', { class: 'num' }, String(p.stats[k])),
      p.statPoints ? h('button', { type: 'button', class: 'mini', id: `plus-${k}`, 'aria-label': `Add a point to ${STAT_NAMES[k]}`, onclick: () => { spendStatPoint(p, k); rerender(); } }, '+') : null))),
    h('h3', {}, `Skills (${p.skills.length}/${SKILL_SLOTS})`),
    h('ul', { class: 'chips' }, p.skills.map(skillChip)),
    h('h3', {}, 'Armor'),
    h('p', { class: 'muted', id: 'your-affinities' }, `${ARMOR[p.armor]?.name ?? 'None'} — ${affinitySummary(armorTiers(p))}`),
    (p.armorOwned ?? []).length > 1 ? h('div', { class: 'chips-row' }, (p.armorOwned ?? []).filter((id) => id !== p.armor).map((id) => h('button', {
      type: 'button', class: 'mini secondary', id: `wear-${id}`, onclick: () => { p.armor = id; rerender(`You put on the ${ARMOR[id].name}.`); },
    }, `Wear ${ARMOR[id].name}`))) : null);

  const demons = h('section', { class: 'panel' },
    h('h2', {}, `Demons (${p.stock.length}/${STOCK_MAX})`),
    h('p', { class: 'muted' }, `Up to ${PARTY_MAX} fight beside you. Demons stop learning at their prime level, and leveling past it gets slow.`),
    p.stock.length ? null : h('p', { class: 'muted' }, 'No demons yet. Talk some into joining.'),
    ...p.stock.map((d) => {
      const card = DEMONS[d.id];
      const prime = primeLevel(d.id);
      const need = expToNext(d.level, prime);
      const pending = d.pendingLearn.map((skill) => h('div', { class: 'pending' },
        h('p', {}, `${card.name} wants to learn ${SKILLS[skill].name}, but ${card.gender === 'female' ? 'her' : 'his'} slots are full. Replace:`),
        h('div', { class: 'chips-row' },
          d.skills.map((old) => h('button', { type: 'button', class: 'mini', onclick: () => { resolvePending(p, d, skill, old); rerender(); } }, SKILLS[old].name)),
          h('button', { type: 'button', class: 'mini secondary', onclick: () => { resolvePending(p, d, skill, null); rerender(); } }, `Don't learn it`))));
      const teach = canTeach(d) ? h('div', { class: 'pending' },
        h('p', {}, `${card.name} has learned everything. ${card.gender === 'female' ? 'She' : 'He'} can teach you one skill:`),
        h('div', { class: 'chips-row' }, d.skills.filter((s) => !p.skills.includes(s)).map((s) => h('button', { type: 'button', class: 'mini', id: `teach-${d.id}-${s}`, onclick: () => {
          const r = teachProtagonist(p, d, s);
          rerender(r.ok ? `You learned ${SKILLS[s].name} from ${card.name}.` : r.reason);
        } }, SKILLS[s].name)))) : null;
      return h('article', { class: 'stock-row', 'data-demon': d.id },
        portrait(card, { size: 'sm' }),
        h('div', { class: 'stock-main' },
          h('h3', {}, `${card.name}`, h('span', { class: 'muted' }, ` ${card.family} · Lv ${d.level}${d.level >= prime ? ' · past prime' : ` · prime Lv ${prime}`}`)),
          h('p', { class: 'num muted' }, `EXP ${d.exp}/${need}`), expBar(d.exp, need),
          h('ul', { class: 'chips' }, d.skills.map(skillChip)),
          h('p', { class: 'muted small' }, affinitySummary(BATTLE[d.id].tiers)),
          h('label', { class: 'check' },
            h('input', { type: 'checkbox', id: `party-${d.id}`, checked: d.inParty || null, onchange: (e) => {
              if (!setInParty(p, d.uid, e.target.checked)) rerender(`Only ${PARTY_MAX} demons can be in the party.`);
              else rerender();
            } }), ' In party'),
          ...pending, teach));
    }));

  mount(ui.root, 
    ui.statusBar(),
    h('div', { class: 'screen-head' }, h('h1', {}, 'Party'), h('button', { type: 'button', class: 'secondary', id: 'back-hub', onclick: ui.goHub }, 'Back')),
    message ? h('p', { class: 'notice', id: 'party-msg' }, message) : null,
    h('div', { class: 'cols' }, you, demons));
  void partyDemons;
}
