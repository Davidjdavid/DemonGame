// Battle effects: floating damage numbers, WEAK/NULL/MISS popups, hit flashes and shakes.
// Purely visual; reads a battle event and decorates the freshly rendered cards.
import { SKILLS } from '../data/skills.js';
import { play } from './sfx.js';

const TAG = { weak: 'WEAK', crit: 'CRITICAL', null: 'NULL', miss: 'MISS', absorb: 'ABSORB', reflect: 'REPEL' };
const FX_ELEMENTS = new Set(['fire', 'ice', 'elec', 'wind', 'light', 'dark', 'phys', 'heal', 'almighty']);

// An element burst over a card: the CC0 effect image if present, a CSS burst otherwise.
function burst(card, element, delay = 0) {
  const el = FX_ELEMENTS.has(element) ? element : 'phys';
  const img = document.createElement('img');
  img.className = `fx-burst fx-${el}`;
  img.alt = '';
  img.src = `assets/fx/${el === 'almighty' ? 'light' : el}.png`;
  img.style.animationDelay = `${delay}ms`;
  img.addEventListener('error', () => { const d = document.createElement('span'); d.className = `fx-burst fx-css fx-${el}`; d.style.animationDelay = `${delay}ms`; img.replaceWith(d); setTimeout(() => d.remove(), 900 + delay); });
  card.append(img);
  setTimeout(() => img.remove(), 900 + delay);
}

export function banner(root, text, cls = '') {
  const host = root.querySelector('.battle');
  if (!host) return;
  host.querySelector('.b-banner')?.remove();
  const b = document.createElement('div');
  b.className = `b-banner ${cls}`;
  b.textContent = text;
  host.append(b);
  setTimeout(() => b.remove(), 1100);
}

function cardFor(root, key) {
  return root.querySelector(`[data-key="${CSS.escape(key)}"]`);
}

function popup(card, text, cls, delay = 0) {
  const el = document.createElement('span');
  el.className = `fx-pop ${cls}`;
  el.textContent = text;
  el.style.animationDelay = `${delay}ms`;
  card.append(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 2000 + delay);
}

function pulse(card, cls) {
  card.classList.remove(cls);
  void card.offsetWidth; // restart the animation
  card.classList.add(cls);
  card.addEventListener('animationend', () => card.classList.remove(cls), { once: true });
}

export function playEvent(root, ev) {
  if (!ev || ev.type !== 'action') return;
  const skill = SKILLS[ev.skill];
  if (skill && !skill.basic) banner(root, skill.name, `el-${skill.element}`);
  const actor = cardFor(root, ev.actor);
  if (actor && (ev.hits?.length || ev.effects?.length)) pulse(actor, actor.closest('.b-enemies') ? 'fx-lunge-down' : 'fx-lunge-up');
  if (ev.hits?.some((x) => x.result === 'weak' || x.crit)) { pulse(root.querySelector('.battle') ?? root, 'fx-jolt'); play('weak', 0.6); }
  else if (ev.hits?.some((x) => x.result === 'miss' || x.result === 'null')) play('miss', 0.5);
  else if (ev.hits?.length) play('hit', 0.5);
  let i = 0;
  for (const hit of ev.hits || []) {
    const card = cardFor(root, hit.target);
    if (!card) continue;
    const d = i++ * 140;
    if (hit.result !== 'miss') burst(card, skill?.element === 'phys' ? 'phys' : skill?.element ?? 'phys', d);
    if (hit.killed) setTimeout(() => card.classList.add('fx-die'), d + 250);
    const tag = TAG[hit.result];
    if (tag) popup(card, tag, `tag tag-${hit.result}`, d);
    if (hit.amount && hit.result !== 'absorb' && hit.result !== 'reflect') {
      popup(card, String(hit.amount), `dmg${hit.result === 'weak' || hit.crit ? ' big' : ''}`, d + 60);
      pulse(card, hit.result === 'weak' || hit.crit ? 'fx-shake-hard' : 'fx-shake');
      pulse(card, 'fx-flash');
    }
    if (hit.result === 'absorb') popup(card, `+${hit.amount}`, 'heal', d + 60);
    if (hit.result === 'reflect' && hit.reflectedTo) {
      const back = cardFor(root, hit.reflectedTo);
      if (back && hit.amount) { popup(back, String(hit.amount), 'dmg', d + 200); pulse(back, 'fx-shake'); }
    }
  }
  for (const e of ev.effects || []) {
    const card = e.target ? cardFor(root, e.target) : null;
    if (card && (e.heal || e.revived)) burst(card, 'heal');
    if (card && e.heal) popup(card, `+${e.heal}`, 'heal');
    if (card && e.mp) popup(card, `+${e.mp} MP`, 'heal');
    if (card && e.revived) popup(card, 'REVIVED', 'heal');
    if (e.buff || e.debuff) {
      for (const k of e.targets || []) {
        const c = cardFor(root, k);
        if (c) popup(c, `${(e.buff || e.debuff).toUpperCase()} ${e.buff ? '▲' : '▼'}`, e.buff ? 'buff' : 'debuff');
      }
    }
    if (e.debuff && e.missed) {
      const actor = cardFor(root, ev.actor);
      if (actor) popup(actor, 'MISS', 'tag tag-miss');
    }
  }
  if (ev.counter) {
    const c = cardFor(root, ev.counter.target);
    if (c && ev.counter.amount) { popup(c, `COUNTER ${ev.counter.amount}`, 'dmg', 300); pulse(c, 'fx-shake'); }
  }
}
