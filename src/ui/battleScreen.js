// Battle screen: enemies (HP bars, known affinities), press-turn icons, party, commands, log.
import { h, mount } from './dom.js';
import { portrait } from './portrait.js';
import { act, currentActor, usableSkills, validTargets, alive, skillCost, escapeChance } from '../combat/battle.js';
import { enemyChoose } from '../combat/ai.js';
import { describeEvent } from '../combat/describe.js';
import { ELEMENT_NAMES, DAMAGE_ELEMENTS, hitClass } from '../combat/affinity.js';
import { DEMONS, ITEMS } from '../data/index.js';
import { SKILLS } from '../data/skills.js';
import { usableItems, ITEM_EFFECTS } from '../combat/items.js';
import { playEvent, banner } from './fx.js';

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
    let label = picking.talk ? 'Talk' : picking.item ? 'Use' : 'Target';
    // Show what you already know about this target's affinity to the chosen skill.
    if (picking.skill?.kind === 'attack' && c.side === 'enemy' && state.known[c.key]?.has(picking.skill.element)) {
      const tier = c.tiers[picking.skill.element] || 0;
      const cls = c.repel.has(picking.skill.element) ? 'repel' : hitClass(tier);
      label = { weak: 'Target · WEAK', null: 'Target · NULL', absorb: 'Target · ABSORBS', repel: 'Target · REPELS' }[cls] ?? label;
    }
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
    if (state.uiSide && state.uiSide !== state.turnSide && !state.outcome) banner(root, state.turnSide === 'player' ? 'Your turn' : 'Enemy turn', `turn-${state.turnSide}`);
    state.uiSide = state.turnSide;
    const actor = state.outcome ? null : currentActor(state);
    mount(enemyRow, ...state.sides.enemy.map((e) => {
      const card = DEMONS[e.demonId];
      return h('article', { class: `b-enemy${alive(e) ? '' : ' down'}${actor === e ? ' acting' : ''}`, 'data-key': e.key },
        card ? scaled(portrait(card, { size: 'sm' }), card.displayScale ?? 0.6) : null,
        h('h3', {}, e.name, e.boss ? ' (boss)' : ''),
        h('p', { class: 'muted' }, `Lv ${e.level}`),
        bar(e, 'hp'),
        affinityRow(e),
        alive(e) ? targetButton(e) : h('p', { class: 'muted' }, { joined: 'Joined you', left: 'Left', fled: 'Fled', passed: 'Stood aside' }[e.gone] ?? 'Down'));
    }));
    const ic = state.icons;
    mount(icons, 
      h('span', { class: 'b-side' }, state.outcome ? '' : state.turnSide === 'player' ? 'Your turn' : 'Enemy turn'),
      ...Array.from({ length: ic.full }, () => h('span', { class: `icon full ${state.turnSide}` })),
      ...Array.from({ length: ic.half }, () => h('span', { class: `icon half ${state.turnSide}` })));
    mount(partyRow, ...state.sides.player.map((p) => h('article', { class: `b-member${alive(p) ? '' : ' down'}${actor === p ? ' acting' : ''}`, 'data-key': p.key },
      h('h3', {}, p.name),
      h('p', { class: 'num' }, `HP ${p.hp}/${p.maxHp}`), bar(p, 'hp'),
      h('p', { class: 'num' }, `MP ${p.mp}/${p.maxMp}`),
      targetButton(p))));
    mount(logEl, ...lines.slice(-7).map((l) => h('li', {}, l)));
    renderCommands(actor);
  }

  function renderCommands(actor) {
    if (state.outcome) {
      mount(commands, 
        h('h2', { id: 'b-outcome' }, state.outcome === 'win' ? 'Victory!' : state.outcome === 'escaped' ? 'You got away.' : 'Defeat...'),
        h('button', { type: 'button', id: 'b-done', onclick: () => onEnd?.(state.outcome) }, 'Continue'));
      return;
    }
    if (state.turnSide !== 'player' || busy) {
      mount(commands, h('p', { class: 'muted' }, 'The enemy acts...'));
      return;
    }
    if (picking) {
      const what = picking.talk ? 'Talk' : picking.item ? ITEMS[picking.item].name : picking.skill.name;
      mount(commands, 
        h('p', {}, `${actor.name}: ${what}. Choose ${picking.talk ? 'who to talk to' : 'a target'}.`),
        h('button', { type: 'button', class: 'secondary', id: 'b-cancel', onclick: () => { picking = null; render(); } }, 'Back'));
      return;
    }
    const skills = usableSkills(state, actor);
    const all = ['attack', ...actor.skills];
    mount(commands, 
      h('p', { class: 'b-actor' }, h('strong', {}, actor.name), ' acts.'),
      h('div', { class: 'b-skill-list' }, all.map((id) => {
        const s = skills.find((x) => x.id === id) ?? null;
        const sk = s ?? null;
        const cost = sk ? skillCost(actor, sk) : null;
        const costText = cost ? (cost.mp ? `${cost.mp} MP` : cost.hp ? `${cost.hp} HP` : '') : '';
        return h('button', { type: 'button', class: `skill-btn${sk?.signature ? ' signature' : ''}`, id: `skill-${id}`, disabled: !sk || null, title: sk?.desc ?? '', onclick: () => pickSkill(sk) },
          h('span', {}, sk?.signature ? `★ ${sk.name}` : (sk?.name ?? labelFor(id))),
          h('span', { class: 'skill-meta' }, sk ? `${ELEMENT_NAMES[sk.element] ?? ''} ${costText}`.trim() : 'no MP/HP'));
      })),
      actor.side === 'player' ? h('div', { class: 'b-extra' },
        ...usableItems(state.inventory).map((id) => h('button', { type: 'button', class: 'secondary mini', id: `item-${id}`, onclick: () => { picking = { item: id, groups: state.sides.player.filter((c) => (ITEM_EFFECTS[id].revive ? !alive(c) && !c.gone : alive(c))).map((c) => [c]) }; render(); } }, `${ITEMS[id].name} ×${state.inventory[id]}`)),
        onTalk && actor.isProtagonist ? h('button', { type: 'button', class: 'secondary mini', id: 'b-talk', onclick: () => { picking = { talk: true, groups: state.sides.enemy.filter(alive).map((c) => [c]) }; render(); } }, 'Talk') : null,
        state.sides.enemy.some((e) => e.boss && alive(e)) ? null : h('button', { type: 'button', class: 'secondary mini', id: 'b-escape', onclick: () => doAct({ type: 'escape' }) }, `Escape (${Math.round(escapeChance(state) * 100)}%)`)) : null,
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
    return SKILLS[id]?.name ?? id.replace(/_/g, ' ');
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

  mount(root, 
    ...(header ? [header] : []),
    h('section', { class: `battle${state.uiStarted ? '' : ' entering'}` }, enemyRow, icons, logEl, partyRow, commands));
  render();
  if (!state.uiStarted) { state.uiStarted = true; banner(root, state.turnSide === 'player' ? 'Your turn' : 'Enemy turn', `turn-${state.turnSide}`); }
  runEnemies();
  return { render };
}
