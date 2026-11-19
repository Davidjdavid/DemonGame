// Compendium: registered demons (re-summon for gold) and field notes for every demon you've met.
import { h, mount } from './dom.js';
import { portrait } from './portrait.js';
import { ui } from './context.js';
import { DEMONS } from '../data/index.js';
import { SKILLS } from '../data/skills.js';
import { resummon, summonCost } from '../growth/compendium.js';
import { fieldNoteTexts } from '../talk/engine.js';
import { affinitySummary } from './affinityText.js';
import { BATTLE } from '../data/battleData.js';

export function renderCompendium(message = '') {
  const p = ui.game.player;
  const entries = Object.values(DEMONS).sort((x, y) => x.level - y.level).map((card) => {
    const reg = p.compendium[card.id];
    const notes = fieldNoteTexts(p, card);
    if (!reg && !notes.length && !p.metDemons?.includes(card.id)) {
      return h('article', { class: 'comp-row unknown' }, h('div', { class: 'portrait portrait-sm locked-ph' }, h('span', {}, '?')), h('div', {}, h('h3', {}, '???'), h('p', { class: 'muted' }, 'Not met yet.')));
    }
    const cost = reg ? summonCost(reg) : 0;
    return h('article', { class: 'comp-row', 'data-demon': card.id },
      portrait(card, { size: 'sm' }),
      h('div', { class: 'stock-main' },
        h('h3', {}, card.name, h('span', { class: 'muted' }, ` ${card.family} · ${reg ? `Lv ${reg.level}` : `base Lv ${card.level}`}`)),
        reg ? h('ul', { class: 'chips' }, reg.skills.map((s) => h('li', { class: 'chip-skill' }, SKILLS[s]?.name ?? s))) : h('p', { class: 'muted' }, 'Not registered (never owned).'),
        h('p', { class: 'muted small' }, affinitySummary(BATTLE[card.id]?.tiers ?? {}, reg ? 'all' : (p.knownAffinities?.[card.id] ?? []))),
        notes.length ? h('ul', { class: 'notes-list' }, notes.map((n) => h('li', {}, n))) : null,
        reg ? h('button', { type: 'button', class: 'mini', id: `summon-${card.id}`, onclick: () => {
          const r = resummon(p, card.id);
          renderCompendium(r.ok ? `${card.name} answers your call (${r.cost} gold).` : r.reason);
        } }, `Summon · ${cost} gold`) : null));
  });
  mount(ui.root, 
    ui.statusBar(),
    h('div', { class: 'screen-head' }, h('h1', {}, 'Compendium'), h('button', { type: 'button', class: 'secondary', id: 'back-hub', onclick: ui.goHub }, 'Back')),
    message ? h('p', { class: 'notice', id: 'comp-msg' }, message) : null,
    h('section', { class: 'comp-list' }, entries));
}
