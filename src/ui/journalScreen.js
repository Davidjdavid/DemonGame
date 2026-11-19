// Journal (story mode): what you've learned (facts — cross-check them to catch lies), the choices you've made,
// and your field notes on demons.
import { h } from './dom.js';
import { ui } from './context.js';
import { DEMONS } from '../data/index.js';
import { BIBLE } from '../data/story/index.js';
import { fieldNoteTexts } from '../talk/engine.js';

export function renderJournal() {
  const { player, run } = ui.game;
  const story = run.story;
  const facts = story.facts.map((id) => BIBLE?.facts?.find((f) => f.id === id)).filter(Boolean);
  const choices = story.log.filter((l) => l.choice).map((l) => l.choice);
  const notes = Object.keys(player.fieldNotes).filter((id) => player.fieldNotes[id].length && DEMONS[id]);
  ui.root.replaceChildren(
    ui.statusBar(),
    h('div', { class: 'screen-head' }, h('h1', {}, 'Journal'), h('button', { type: 'button', class: 'secondary', id: 'back-hub', onclick: ui.goHub }, 'Back')),
    h('div', { class: 'cols' },
      h('section', { class: 'panel', id: 'journal-facts' },
        h('h2', {}, 'What you\'ve learned'),
        h('p', { class: 'muted' }, 'People don\'t always tell the truth. If two things here can\'t both be true, someone lied — and you can say so to their face.'),
        facts.length ? h('ul', { class: 'notes-list' }, facts.map((f) => h('li', {}, f.text))) : h('p', { class: 'muted' }, 'Nothing yet. Talk to people.')),
      h('section', { class: 'panel', id: 'journal-choices' },
        h('h2', {}, 'What you\'ve done'),
        choices.length ? h('ul', { class: 'notes-list' }, choices.map((c) => h('li', {}, c))) : h('p', { class: 'muted' }, 'No big choices yet.'),
        h('h2', {}, 'Field notes'),
        notes.length ? notes.map((id) => h('div', { class: 'notes' }, h('h4', {}, DEMONS[id].name), h('ul', {}, fieldNoteTexts(player, DEMONS[id]).map((n) => h('li', {}, n)))))
          : h('p', { class: 'muted' }, 'Talk to demons to learn what they like.'))));
}
