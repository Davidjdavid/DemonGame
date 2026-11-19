// Fusion screen: pick two demons, preview the result (??? if too strong), choose inherited skills, fuse.
import { h } from './dom.js';
import { portrait } from './portrait.js';
import { ui } from './context.js';
import { DEMONS } from '../data/index.js';
import { SKILLS } from '../data/skills.js';
import { fusionResult, inheritanceCandidates, freeSlots, fuse } from '../growth/fusion.js';

export function renderFusion(sel = { a: null, b: null, picks: [] }, message = '') {
  const p = ui.game.player;
  const again = (next, msg = '') => renderFusion(next, msg);
  const a = p.stock.find((d) => d.uid === sel.a);
  const b = p.stock.find((d) => d.uid === sel.b);

  const pickList = (slot) => h('div', { class: 'fuse-pick' },
    h('h3', {}, slot === 'a' ? 'First demon' : 'Second demon'),
    h('div', { class: 'chips-row' }, p.stock.map((d) => h('button', {
      type: 'button',
      class: `mini${sel[slot] === d.uid ? '' : ' secondary'}`,
      id: `fuse-${slot}-${d.id}`,
      disabled: (slot === 'a' ? sel.b : sel.a) === d.uid || null,
      onclick: () => again({ ...sel, [slot]: d.uid, picks: [] }),
    }, `${DEMONS[d.id].name} ${d.level}`))));

  let preview = h('p', { class: 'muted' }, 'Pick two demons to see what they make.');
  let fuseBtn = null;
  if (a && b) {
    const res = fusionResult(a, b, p.level);
    if (!res) preview = h('p', { class: 'warn', id: 'fuse-none' }, `${DEMONS[a.id].name} and ${DEMONS[b.id].name} can't be fused (same family or no result).`);
    else if (res.locked) {
      preview = h('article', { class: 'fuse-result locked', id: 'fuse-locked' },
        h('div', { class: 'portrait portrait-lg locked-ph' }, h('span', {}, '???')),
        h('h2', {}, '???'), h('p', { class: 'muted' }, 'Too strong for you to command yet. Come back when you are stronger.'));
    } else {
      const card = DEMONS[res.id];
      const cands = inheritanceCandidates(a, b, res.id);
      const slots = freeSlots(res.id);
      const auto = cands.length <= slots;
      const picks = auto ? cands : sel.picks;
      preview = h('article', { class: 'fuse-result', id: 'fuse-result' },
        portrait(card, { size: 'lg' }),
        h('h2', {}, card.name), h('p', { class: 'muted' }, `${card.family} · Lv ${res.level}`),
        h('h3', {}, auto ? `Inherits (${cands.length})` : `Choose up to ${slots} skills to inherit (${picks.length}/${slots})`),
        auto
          ? h('ul', { class: 'chips' }, cands.map((s) => h('li', { class: 'chip-skill' }, SKILLS[s].name)))
          : h('div', { class: 'chips-row' }, cands.map((s) => {
            const on = picks.includes(s);
            return h('button', { type: 'button', class: `mini${on ? '' : ' secondary'}`, id: `inherit-${s}`, onclick: () => {
              const next = on ? picks.filter((x) => x !== s) : picks.length < slots ? [...picks, s] : picks;
              again({ ...sel, picks: next });
            } }, SKILLS[s].name);
          })));
      fuseBtn = h('button', { type: 'button', id: 'fuse-go', onclick: () => {
        const r = fuse(p, a.uid, b.uid, auto ? null : picks);
        if (r.ok) again({ a: null, b: null, picks: [] }, `${DEMONS[r.child.id].name} is born!`);
        else again(sel, r.reason);
      } }, 'Fuse');
    }
  }

  // Every pair you could fuse right now (results above your level stay ???).
  const pairs = [];
  for (let i = 0; i < p.stock.length; i++) for (let j = i + 1; j < p.stock.length; j++) {
    const x = p.stock[i], y = p.stock[j];
    const r = fusionResult(x, y, p.level);
    if (r) pairs.push(h('li', {}, `${DEMONS[x.id].name} + ${DEMONS[y.id].name} = `, r.locked ? h('span', { class: 'muted' }, '???') : `${DEMONS[r.id].name} (Lv ${r.level})`));
  }

  ui.root.replaceChildren(
    ui.statusBar(),
    h('div', { class: 'screen-head' }, h('h1', {}, 'Fusion'), h('button', { type: 'button', class: 'secondary', id: 'back-hub', onclick: ui.goHub }, 'Back')),
    message ? h('p', { class: 'notice', id: 'fuse-msg' }, message) : null,
    p.stock.length < 2 ? h('p', { class: 'muted' }, 'You need at least two demons to fuse.') : null,
    h('div', { class: 'cols' },
      h('section', { class: 'panel' }, pickList('a'), pickList('b')),
      h('section', { class: 'panel' }, preview, fuseBtn)),
    pairs.length ? h('section', { class: 'panel' }, h('h3', {}, 'Possible fusions'), h('ul', { class: 'pairs' }, pairs)) : null);
}
