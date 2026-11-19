// Journal (story mode): what you've learned (facts — cross-check them to catch lies), the choices you've made,
// and your field notes on demons.
import { h, mount } from './dom.js';
import { ui } from './context.js';
import { DEMONS, ITEMS } from '../data/index.js';
import { BIBLE, NPC_CARDS } from '../data/story/index.js';
import { fieldNoteTexts } from '../talk/engine.js';
import { activeObjectives } from '../story/objectives.js';

export function renderJournal() {
  const { player, run } = ui.game;
  const story = run.story;
  const learned = story.facts.map((id) => BIBLE?.facts?.find((f) => f.id === id)).filter(Boolean);
  const superseded = new Set(learned.flatMap((f) => (Array.isArray(f.supersedes) ? f.supersedes : f.supersedes ? [f.supersedes] : [])));
  const facts = learned.filter((f) => !superseded.has(f.id));
  const first = (c) => String(c?.name ?? '').split(' ')[0];
  const who = (id) => first(NPC_CARDS[story.claims?.[id]]) || null;
  const her = (c) => (c.gender === 'female' ? 'her' : c.gender === 'male' ? 'his' : 'their');
  // Lies you can now prove (you know the truth, haven't said so yet), and lies already caught.
  const lies = Object.values(NPC_CARDS).flatMap((c) => (c.lies ?? []).map((l) => ({ c, l, flag: `caught_${c.id}_${String(l.about).replace(/\W+/g, '_').toLowerCase()}` })));
  const provable = lies.filter(({ l, flag }) => l.truthFact && story.facts.includes(l.truthFact) && !story.flags[flag]);
  const caught = lies.filter(({ flag }) => story.flags[flag]);
  const choices = story.log.filter((l) => l.record).map((l) => l.record);
  const notes = Object.keys(player.fieldNotes).filter((id) => player.fieldNotes[id].length && DEMONS[id]);
  const carrying = Object.keys(player.items).filter((id) => ITEMS[id]?.kind === 'key').map((id) => ITEMS[id]);
  const promises = Object.entries(story.flags).filter(([f, v]) => v && f.startsWith('promised_')).map(([f]) => BIBLE?.flags?.[f] ?? f.replace('promised_', 'You promised '));
  mount(ui.root, 
    ui.statusBar(),
    h('div', { class: 'screen-head' }, h('h1', {}, 'Journal'), h('button', { type: 'button', class: 'secondary', id: 'back-hub', onclick: ui.goHub }, 'Back')),
    activeObjectives(BIBLE, story).length ? h('section', { class: 'panel', id: 'journal-todo' },
      h('h2', {}, 'Unfinished'),
      h('ul', { class: 'notes-list' }, activeObjectives(BIBLE, story).map((o) => h('li', {}, o.text)))) : null,
    h('div', { class: 'cols' },
      h('section', { class: 'panel', id: 'journal-facts' },
        h('h2', {}, 'What you\'ve learned'),
        h('p', { class: 'muted' }, 'People don\'t always tell the truth. If two things here can\'t both be true, someone lied — and you can say so to their face.'),
        facts.length ? h('ul', { class: 'notes-list' }, facts.map((f) => h('li', {}, who(f.id) ? h('span', { class: 'muted' }, `${who(f.id)}: `) : null, f.text))) : h('p', { class: 'muted' }, 'Nothing yet. Talk to people.'),
        provable.length ? h('div', { id: 'journal-provable' }, h('h3', {}, 'Something doesn\'t add up'),
          h('ul', { class: 'notes-list' }, provable.map(({ c, l }) => h('li', {}, `${first(c)} says: “${l.says ?? l.about}” What you know now doesn't fit. You could say so to ${her(c)} face.`)))) : null,
        caught.length ? h('div', { id: 'journal-caught' }, h('h3', {}, 'Lies you caught'),
          h('ul', { class: 'notes-list' }, caught.map(({ c, l }) => h('li', {}, `${first(c)}: “${l.says ?? l.about}” You called it.`)))) : null),
      h('section', { class: 'panel', id: 'journal-choices' },
        promises.length ? h('div', {}, h('h2', {}, 'Promises'), h('ul', { class: 'notes-list', id: 'journal-promises' }, promises.map((t) => h('li', {}, t)))) : null,
        carrying.length ? h('div', {}, h('h2', {}, 'Carrying'), h('ul', { class: 'notes-list', id: 'journal-items' }, carrying.map((i) => h('li', {}, h('strong', {}, i.name), i.desc ? ` — ${i.desc}` : '')))) : null,
        h('h2', {}, 'What you\'ve done'),
        choices.length ? h('ul', { class: 'notes-list' }, choices.map((c) => h('li', {}, c))) : h('p', { class: 'muted' }, 'No big choices yet.'),
        h('h2', {}, 'Field notes'),
        notes.length ? notes.map((id) => h('div', { class: 'notes' }, h('h4', {}, DEMONS[id].name), h('ul', {}, fieldNoteTexts(player, DEMONS[id]).map((n) => h('li', {}, n)))))
          : h('p', { class: 'muted' }, 'Talk to demons to learn what they like.'))));
}
