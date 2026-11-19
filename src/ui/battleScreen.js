// Battle screen: enemies (HP bars, known affinities), press-turn icons, party, commands, log.
import { h } from './dom.js';
import { portrait } from './portrait.js';
import { act, currentActor, usableSkills, validTargets, alive, skillCost } from '../combat/battle.js';
import { enemyChoose } from '../combat/ai.js';
import { describeEvent } from '../combat/describe.js';
import { ELEMENT_NAMES, DAMAGE_ELEMENTS, hitClass } from '../combat/affinity.js';
import { DEMONS, ITEMS } from '../data/index.js';
import { usableItems } from '../combat/items.js';
import { playEvent } from './fx.js';

const AFF_LABEL = { weak: 'Weak', normal: '–', null: 'Null', absorb: 'Absorb' };
const SHORT = { phys: 'Phys', fire: 'Fire', ice: 'Ice', elec: 'Elec', wind: 'Wind', light: 'Light', dark: 'Dark' };

// DESIGN: each demon has a display scale (a living fireball fills the screen, a pixie is tiny).
function scaled(el, scale) {
  const hgt = Math.round(56 + 150 * Math.max(0, Math.min(1, scale)));
  el.style.height = `${hgt}px`;
  el.style.width = `${Math.round(hgt * 0.8)}px`;
  return el;
}

function tierLabel(tier) {
  if (tier === null) return '?';
  if (tier === 0) return '–';
  const c = hitClass(tier);
  if (c === 'normal') return 'Resist';
  return AFF_LABEL[c];
}

/**
 * Render a battle into `root`. opts: { state, onEnd(outcome), delay }.
 */
export function battleScreen(root, { state, onEnd, delay = 650, header = null, onTalk = null }) {
  const nameOf = (key) => [...state.sides.player, ...state.sides.enemy].find((c) => c.key === key)?.name ?? key;
  const lines = (state.uiLines ||= []);
  let picking = null; // { skill, groups } | { item, groups } | { talk: true, groups }
  let busy = false;

  const enemyRow = h('section', { class: 'b-enemies', id: 'b-enemies' });
  const icons = h('div', { class: 'b-icons', id: 'b-icons', 'aria-live': 'polite' });
  const logEl = h('ol', { class: 'b-log', id: 'b-log' });
  const partyRow = h('section', { class: 'b-party', id: 'b-party' });
  const commands = h('section', { class: 'b-commands', id: 'b-commands' });

  function affinityRow(enemy) {
    const known = state.known[enemy.key] ?? new Set();
    return h('ul', { class: 'b-aff' }, DAMAGE_ELEMENTS.map((el) => {
      const t = known.has(el) ? (enemy.tiers[el] || 0) : null;
      const label = enemy.repel.has(el) && known.has(el) ? 'Repel' : tierLabel(t);
      const cls = t === null ? 'unknown' : (label === 'Weak' ? 'weak' : label === '–' ? 'plain' : 'strong');
      return h('li', { class: `aff aff-${cls}`, title: ELEMENT_NAMES[el] }, h('span', { class: 'aff-el' }, SHORT[el]), h('span', {}, label));
    }));
  }

  function targetButton(c) {
    if (!picking) return null;
    const group = picking.groups.find((g) => g.length === 1 && g[0] === c);
    if (!group) return null;
    const label = picking.talk ? 'Talk' : picking.item ? 'Use' : 'Target';
    const run = () => {
      if (picking.talk) return talkTo(c);
      if (picking.item) return useItem(picking.item, c);
      return choose(picking.skill, group);
    };
    return h('button', { type: 'button', class: 'target-btn', id: `target-${c.key}`, onclick: run }, label);
  }

  function bar(c, cls) {
    const pct = Math.max(0, Math.round((100 * c.hp) / c.maxHp));
    return h('div', { class: `bar ${cls}`, role: 'meter', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': `${c.name} HP` }, h('span', { style: `width:${pct}%` }));
  }

  function render() {
    const actor = state.outcome ? null : currentActor(state);
    enemyRow.replaceChildren(...state.sides.enemy.map((e) => {
      const card = DEMONS[e.demonId];
      return h('article', { class: `b-enemy${alive(e) ? '' : ' down'}${actor === e ? ' acting' : ''}`, 'data-key': e.key },
        card ? scaled(portrait(card, { size: 'sm' }), card.displayScale ?? 0.6) : null,
        h('h3', {}, e.name, e.boss ? ' (boss)' : ''),
        h('p', { class: 'muted' }, `Lv ${e.level}`),
        bar(e, 'hp'),
        affinityRow(e),
        alive(e) ? targetButton(e) : h('p', { class: 'muted' }, 'Down'));
    }));
    const ic = state.icons;
    icons.replaceChildren(
      h('span', { class: 'b-side' }, state.outcome ? '' : state.turnSide === 'player' ? 'Your turn' : 'Enemy turn'),
      ...Array.from({ length: ic.full }, () => h('span', { class: `icon full ${state.turnSide}` })),
      ...Array.from({ length: ic.half }, () => h('span', { class: `icon half ${state.turnSide}` })));
    partyRow.replaceChildren(...state.sides.player.map((p) => h('article', { class: `b-member${alive(p) ? '' : ' down'}${actor === p ? ' acting' : ''}`, 'data-key': p.key },
      h('h3', {}, p.name),
      h('p', { class: 'num' }, `HP ${p.hp}/${p.maxHp}`), bar(p, 'hp'),
      h('p', { class: 'num' }, `MP ${p.mp}/${p.maxMp}`),
      targetButton(p))));
    logEl.replaceChildren(...lines.slice(-7).map((l) => h('li', {}, l)));
    renderCommands(actor);
  }

  function renderCommands(actor) {
    if (state.outcome) {
      commands.replaceChildren(
        h('h2', { id: 'b-outcome' }, state.outcome === 'win' ? 'Victory!' : state.outcome === 'escaped' ? 'You got away.' : 'Defeat...'),
        h('button', { type: 'button', id: 'b-done', onclick: () => onEnd?.(state.outcome) }, 'Continue'));
      return;
    }
    if (state.turnSide !== 'player' || busy) {
      commands.replaceChildren(h('p', { class: 'muted' }, 'The enemy acts...'));
      return;
    }
    if (picking) {
      const what = picking.talk ? 'Talk' : picking.item ? ITEMS[picking.item].name : picking.skill.name;
      commands.replaceChildren(
        h('p', {}, `${actor.name}: ${what}. Choose ${picking.talk ? 'who to talk to' : 'a target'}.`),
        h('button', { type: 'button', class: 'secondary', id: 'b-cancel', onclick: () => { picking = null; render(); } }, 'Back'));
      return;
    }
    const skills = usableSkills(state, actor);
    const all = ['attack', ...actor.skills];
    commands.replaceChildren(
      h('p', { class: 'b-actor' }, h('strong', {}, actor.name), ' acts.'),
      h('div', { class: 'b-skill-list' }, all.map((id) => {
        const s = skills.find((x) => x.id === id) ?? null;
        const ref = s ?? { id, name: id };
        const sk = s ?? null;
        const cost = sk ? skillCost(actor, sk) : null;
        const costText = cost ? (cost.mp ? `${cost.mp} MP` : cost.hp ? `${cost.hp} HP` : '') : '';
        return h('button', { type: 'button', class: 'skill-btn', id: `skill-${id}`, disabled: !sk || null, onclick: () => pickSkill(sk) },
          h('span', {}, sk?.name ?? labelFor(id)),
          h('span', { class: 'skill-meta' }, sk ? `${ELEMENT_NAMES[sk.element] ?? ''} ${costText}`.trim() : 'no MP/HP'));
      })),
      actor.isProtagonist ? h('div', { class: 'b-extra' },
        ...usableItems(state.inventory).map((id) => h('button', { type: 'button', class: 'secondary mini', id: `item-${id}`, onclick: () => { picking = { item: id, groups: state.sides.player.filter(alive).map((c) => [c]) }; render(); } }, `${ITEMS[id].name} ×${state.inventory[id]}`)),
        onTalk ? h('button', { type: 'button', class: 'secondary mini', id: 'b-talk', onclick: () => { picking = { talk: true, groups: state.sides.enemy.filter(alive).map((c) => [c]) }; render(); } }, 'Talk') : null,
        state.sides.enemy.some((e) => e.boss && alive(e)) ? null : h('button', { type: 'button', class: 'secondary mini', id: 'b-escape', onclick: () => doAct({ type: 'escape' }) }, 'Escape')) : null,
      h('button', { type: 'button', class: 'secondary', id: 'b-pass', onclick: () => choose(null, null) }, 'Pass'));
  }

  function doAct(action) {
    picking = null;
    const ev = act(state, action);
    push(ev);
    if (state.outcome === 'escaped') { onEnd?.('escaped'); return; }
    render();
    playEvent(root, ev);
    runEnemies();
  }

  function useItem(id, target) {
    doAct({ type: 'item', item: id, targets: [target.key] });
  }

  function talkTo(enemy) {
    picking = null;
    onTalk(enemy, (outcome) => {
      const ev = act(state, { type: 'talk', target: enemy.key, outcome });
      push(ev);
      if (state.outcome === 'escaped') { onEnd?.('escaped'); return; }
      battleScreen(root, { state, onEnd, delay, header, onTalk });
    });
  }

  function labelFor(id) {
    return id.replace(/_/g, ' ');
  }

  function pickSkill(skill) {
    const actor = currentActor(state);
    const groups = validTargets(state, actor, skill);
    if (groups.length === 1 || !['one', 'ally', 'dead_ally'].includes(skill.target)) {
      choose(skill, groups[0]);
      return;
    }
    picking = { skill, groups };
    render();
  }

  function push(ev) {
    const line = describeEvent(ev, nameOf);
    if (line) lines.push(line);
  }

  function choose(skill, group) {
    picking = null;
    const ev = act(state, skill ? { type: 'skill', skill: skill.id, targets: group.map((t) => t.key) } : { type: 'pass' });
    push(ev);
    render();
    playEvent(root, ev);
    runEnemies();
  }

  function runEnemies() {
    if (state.outcome || state.turnSide !== 'enemy') return;
    busy = true;
    render();
    setTimeout(function step() {
      if (state.outcome || state.turnSide !== 'enemy') {
        busy = false;
        render();
        return;
      }
      const ev = act(state, enemyChoose(state, currentActor(state)));
      push(ev);
      render();
      playEvent(root, ev);
      setTimeout(step, delay);
    }, delay);
  }

  root.replaceChildren(
    ...(header ? [header] : []),
    h('section', { class: 'battle' }, enemyRow, icons, logEl, partyRow, commands));
  render();
  runEnemies();
  return { render };
}
