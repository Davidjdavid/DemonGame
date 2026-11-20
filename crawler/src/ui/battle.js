// Battle screen: enemy figures in a row (name, level, HP bar, known affinities), party cards (HP/MP), press-turn
// icons, command menu with targeting, element effects, damage numbers and result labels, auto modes, speed.
import { createBattle, act, currentActor, alive, usableSkills, targetsFor, knownTier, escapeChance, unitSkills, canAfford, skillCost, findUnit } from '../combat/battle.js';
import { enemyChoose, smartChoose, usableItemIds } from '../combat/ai.js';
import { SKILLS, skillDesc } from '../data/skills.js';
import { ITEMS, itemName } from '../data/items.js';
import { MONSTERS } from '../data/monsters.js';
import { ELEMENTS, ELEMENT_SHORT, ELEMENT_COLORS, ELEMENT_NAMES } from '../combat/affinity.js';
import { drawFigure } from './figures.js';
import { createFx } from './fx.js';
import { el, clear } from './dom.js';

const RESULT_LABEL = { weak: 'WEAK', crit: 'CRITICAL', miss: 'MISS', null: 'NULL', reflect: 'REPEL', absorb: 'ABSORB' };
const TIER_LABEL = { weak: 'Weak', resist: 'Resist', null: 'Null', repel: 'Repel', absorb: 'Absorb', normal: '-' };
const SPEEDS = [1, 2, 4];

/**
 * Run one battle. party/enemies are combatants (combat/units.js). Resolves { outcome, state } when the player
 * dismisses the result. hooks.talk(state, actor, target) -> Promise<talk action> (Stage 3).
 */
export function runBattleScreen(root, { party, enemies, rng, inventory, settings, fast = false, first = 'player', canEscape = true, hooks = {}, intro = null }) {
  const state = createBattle({ party, enemies, rng, inventory, first, canEscape });
  const speed = () => (fast ? 50 : settings.battleSpeed || 1);
  const wait = (ms) => new Promise((r) => setTimeout(r, fast ? 0 : ms / speed()));

  const wrap = el('div', { class: 'battle' });
  const turnLabel = el('div', { class: 'b-turn' });
  const iconsBox = el('div', { class: 'icons' });
  const speedBtn = el('button', { class: 'b-speed', onclick: () => { const i = SPEEDS.indexOf(settings.battleSpeed || 1); settings.battleSpeed = SPEEDS[(i + 1) % SPEEDS.length]; speedBtn.textContent = `Speed ${settings.battleSpeed}×`; } }, `Speed ${settings.battleSpeed || 1}×`);
  const top = el('div', { class: 'b-top' }, turnLabel, iconsBox, speedBtn);
  const row = el('div', { class: 'b-enemies' });
  const msg = el('div', { class: 'b-msg' });
  const cmd = el('div', { class: 'b-cmd' });
  const partyBox = el('div', { class: 'b-party' });
  const bottom = el('div', { class: 'b-bottom' }, cmd, partyBox);
  wrap.append(top, row, msg, bottom);
  root.append(wrap);
  const fx = createFx(wrap, { speed, fast });
  const nodes = new Map(); // combatant key -> DOM node

  // ---- Rendering ---------------------------------------------------------------------------------------------
  for (const e of enemies) {
    const m = MONSTERS[e.type];
    const fig = el('canvas', { class: 'fig', width: 180, height: 180 });
    drawFigure(fig, m.shape, m.color);
    const slot = el('div', { class: `slot${e.boss ? ' boss' : ''}`, 'data-key': e.key },
      el('div', { class: 'fig-wrap' }, fig),
      el('div', { class: 'e-name' }, e.name, el('span', { class: 'lv' }, ` Lv ${e.level}`)),
      el('div', { class: 'bar hp' }, el('i')),
      el('div', { class: 'aff' }),
      el('div', { class: 'tag' }));
    nodes.set(e.key, slot);
    row.append(slot);
  }
  for (const p of party) {
    const auto = p.isHero ? null : el('button', { class: 'auto', title: 'Let this ally choose its own actions', onclick: (ev) => { ev.stopPropagation(); p.auto = !p.auto; if (p.ref) p.ref.auto = p.auto; render(); } }, 'AUTO');
    const card = el('div', { class: 'card', 'data-key': p.key },
      el('div', { class: 'c-name' }, el('span', {}, p.name), el('span', { class: 'lv' }, ` Lv ${p.level}`), auto),
      el('div', { class: 'bar hp' }, el('i'), el('span')),
      el('div', { class: 'bar mp' }, el('i'), el('span')),
      el('div', { class: 'c-status' }));
    nodes.set(p.key, card);
    partyBox.append(card);
  }

  function buffText(c) {
    const out = [];
    for (const [k, b] of Object.entries(c.buffs)) if (b.stacks) out.push(`${k.toUpperCase()}${b.stacks > 0 ? '▲'.repeat(b.stacks) : '▼'.repeat(-b.stacks)}`);
    return out.join(' ');
  }

  function render() {
    const actor = state.outcome ? null : currentActor(state);
    turnLabel.textContent = state.outcome ? '' : `${state.turnSide === 'player' ? 'Your turn' : 'Enemy turn'} · Round ${Math.max(1, state.round)}`;
    turnLabel.className = `b-turn ${state.turnSide}`;
    clear(iconsBox);
    for (let i = 0; i < state.icons.full; i++) iconsBox.append(el('span', { class: `icon full ${state.turnSide}` }));
    for (let i = 0; i < state.icons.half; i++) iconsBox.append(el('span', { class: `icon half ${state.turnSide}` }));
    for (const e of enemies) {
      const n = nodes.get(e.key);
      n.classList.toggle('dead', e.hp <= 0 && !e.gone);
      n.classList.toggle('gone', !!e.gone);
      n.classList.toggle('acting', actor === e);
      n.querySelector('.bar.hp i').style.width = `${(100 * e.hp) / e.maxHp}%`;
      const aff = n.querySelector('.aff');
      clear(aff);
      for (const elx of ELEMENTS) {
        const k = knownTier(state, e.type, elx);
        aff.append(el('span', { class: `chip t-${k || 'unknown'}`, title: `${ELEMENT_NAMES[elx]}: ${k ? TIER_LABEL[k] : 'unknown'}`, style: { '--c': ELEMENT_COLORS[elx] } },
          ELEMENT_SHORT[elx], el('b', {}, k ? (k === 'normal' ? '·' : TIER_LABEL[k].slice(0, 2)) : '?')));
      }
      const buffs = buffText(e);
      n.querySelector('.tag').dataset.buffs = buffs;
    }
    for (const p of party) {
      const n = nodes.get(p.key);
      n.classList.toggle('dead', p.hp <= 0);
      n.classList.toggle('acting', actor === p);
      n.querySelector('.bar.hp i').style.width = `${(100 * p.hp) / p.maxHp}%`;
      n.querySelector('.bar.hp span').textContent = `HP ${p.hp}/${p.maxHp}`;
      n.querySelector('.bar.mp i').style.width = `${(100 * p.mp) / Math.max(1, p.maxMp)}%`;
      n.querySelector('.bar.mp span').textContent = `MP ${p.mp}/${p.maxMp}`;
      const exposed = Object.entries(state.enemyKnows[p.key] || {}).filter(([, t]) => t !== 'normal').map(([elx, t]) => `${ELEMENT_SHORT[elx]} ${TIER_LABEL[t]}`);
      n.querySelector('.c-status').textContent = [buffText(p), exposed.length ? `seen: ${exposed.join(', ')}` : ''].filter(Boolean).join(' · ');
      const auto = n.querySelector('.auto');
      if (auto) auto.classList.toggle('on', !!p.auto);
    }
  }

  function say(text) { msg.textContent = text; }

  // ---- Player input -------------------------------------------------------------------------------------------
  let autoAll = false;
  let keyHandler = null;
  const onKey = (e) => keyHandler?.(e);
  window.addEventListener('keydown', onKey);

  function predict(actor, elx, target) {
    if (elx === 'almighty') return null;
    const k = knownTier(state, target.type, elx);
    if (!k) return { text: '?', cls: 'unknown' };
    if (k === 'normal') return null;
    return { text: TIER_LABEL[k].toUpperCase(), cls: k };
  }

  function chooseTarget(actor, targetType, elx) {
    return new Promise((resolve) => {
      const groups = targetsFor(state, actor, targetType);
      if (!groups.length) { resolve(null); return; }
      if (groups.length === 1 && groups[0].length > 1) { resolve(groups[0].map((t) => t.key)); return; } // all-target: no pick
      const cands = groups.map((g) => g[0]);
      let idx = 0;
      const cleanup = () => {
        for (const c of cands) {
          const n = nodes.get(c.key);
          n.classList.remove('targetable', 'focus');
          n.onclick = null;
          const tag = n.querySelector('.tag');
          if (tag) { tag.textContent = ''; tag.className = 'tag'; }
        }
        keyHandler = null;
      };
      const pick = (c) => { cleanup(); resolve([c.key]); };
      const focus = (i) => { idx = (i + cands.length) % cands.length; cands.forEach((c, j) => nodes.get(c.key).classList.toggle('focus', j === idx)); };
      for (const c of cands) {
        const n = nodes.get(c.key);
        n.classList.add('targetable');
        n.onclick = () => pick(c);
        const tag = n.querySelector('.tag');
        if (tag && elx && c.side !== actor.side) {
          const p = predict(actor, elx, c);
          if (p) { tag.textContent = p.text; tag.className = `tag show ${p.cls}`; }
        }
      }
      focus(0);
      say('Choose a target (click, or ←/→ and Enter). Esc: back.');
      keyHandler = (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') focus(idx - 1);
        else if (e.code === 'ArrowRight' || e.code === 'KeyD') focus(idx + 1);
        else if (e.code === 'Enter' || e.code === 'Space') pick(cands[idx]);
        else if (e.code === 'Escape') { cleanup(); resolve(null); }
        else return;
        e.preventDefault();
      };
      cmd.querySelector('.back')?.addEventListener('click', () => { cleanup(); resolve(null); });
    });
  }

  function menuButton(label, onclick, { disabled = false, cls = '', title = '', hot = null } = {}) {
    return el('button', { class: `m ${cls}`, onclick, disabled, title, 'data-hot': hot }, hot ? el('kbd', {}, hot) : null, label);
  }

  function chooseAction(actor) {
    return new Promise((resolve) => {
      const showMain = () => {
        clear(cmd);
        say(`${actor.name}'s action.`);
        const items = usableItemIds(state.inventory);
        const esc = escapeChance(state);
        const entries = [
          ['Attack', () => target('attack')],
          ['Skills', showSkills, { disabled: !actor.skills.length }],
          ['Items', showItems, { disabled: !items.length }],
          ...(actor.isHero ? [['Talk', talk, { disabled: !hooks.talk || !enemies.some((e) => alive(e) && MONSTERS[e.type].personality !== 'mindless'), title: 'Negotiate with an enemy' }]] : []),
          ['Analyze', analyze, { title: "Reveal one enemy's affinities (uses this action)" }],
          ['Pass', () => resolve({ type: 'pass' }), { title: 'Turn a full icon into a half icon' }],
          [`Escape ${Math.round(esc * 100)}%`, () => resolve({ type: 'escape' }), { disabled: esc <= 0, title: 'A failed escape costs this action' }],
        ];
        const grid = el('div', { class: 'menu-grid' });
        entries.forEach(([label, fn, opt = {}], i) => grid.append(menuButton(label, fn, { ...opt, hot: String(i + 1) })));
        cmd.append(grid, el('button', { class: 'm auto-all', onclick: () => { autoAll = true; resolve(smartChoose(state, actor)); }, title: 'Fight automatically until the battle ends or something goes wrong' }, el('kbd', {}, 'R'), 'Auto battle ▶▶'));
        keyHandler = (e) => {
          const n = Number(e.key);
          if (n >= 1 && n <= entries.length && !entries[n - 1][2]?.disabled) { e.preventDefault(); entries[n - 1][1](); }
          if (e.code === 'KeyR') { e.preventDefault(); autoAll = true; resolve(smartChoose(state, actor)); }
        };
      };
      const back = () => el('button', { class: 'm back', onclick: showMain }, el('kbd', {}, 'Esc'), 'Back');
      const listKeys = (list) => {
        keyHandler = (e) => {
          if (e.code === 'Escape') { e.preventDefault(); showMain(); return; }
          const n = Number(e.key);
          if (n >= 1 && n <= list.length && !list[n - 1].disabled) { e.preventDefault(); list[n - 1].fn(); }
        };
      };
      const target = async (skillId) => {
        const s = SKILLS[skillId];
        const elx = s.id === 'attack' ? actor.attackElement : s.element;
        clear(cmd);
        cmd.append(el('div', { class: 'm-title' }, s.name), back());
        const t = await chooseTarget(actor, s.target, s.kind === 'attack' ? elx : null);
        if (!t) { showMain(); return; }
        resolve({ type: 'skill', skill: skillId, targets: t });
      };
      const showSkills = () => {
        clear(cmd);
        const list = unitSkills(actor).filter((s) => s.id !== 'attack').map((s) => {
          const ok = canAfford(actor, s) && targetsFor(state, actor, s.target).length > 0;
          const c = skillCost(actor, s);
          return { s, disabled: !ok, fn: () => target(s.id), cost: c.mp ? `${c.mp} MP` : c.hp ? `${c.hp} HP` : '' };
        });
        const box = el('div', { class: 'list' });
        list.forEach((x, i) => {
          const b = menuButton(el('span', { class: 'sk' }, el('i', { class: 'dot', style: { background: ELEMENT_COLORS[x.s.element] || '#9ab' } }), x.s.name, el('small', {}, x.cost)), x.fn, { disabled: x.disabled, hot: String(i + 1), title: skillDesc(x.s) });
          b.onmouseenter = () => say(skillDesc(x.s));
          box.append(b);
        });
        cmd.append(box, back());
        say('Choose a skill.');
        listKeys(list);
      };
      const showItems = () => {
        clear(cmd);
        const ids = usableItemIds(state.inventory);
        const list = ids.map((id) => ({ id, fn: () => useItem(id), disabled: !targetsFor(state, actor, ITEMS[id].target).length }));
        const box = el('div', { class: 'list' });
        list.forEach((x, i) => {
          const b = menuButton(el('span', { class: 'sk' }, itemName(x.id), el('small', {}, `×${state.inventory[x.id]}`)), x.fn, { disabled: x.disabled, hot: String(i + 1), title: ITEMS[x.id].desc });
          b.onmouseenter = () => say(ITEMS[x.id].desc);
          box.append(b);
        });
        cmd.append(box, back());
        say('Choose an item.');
        listKeys(list);
      };
      const useItem = async (id) => {
        const it = ITEMS[id];
        clear(cmd);
        cmd.append(el('div', { class: 'm-title' }, itemName(id)), back());
        const t = it.target === 'allies' ? targetsFor(state, actor, 'allies')[0].map((x) => x.key) : await chooseTarget(actor, it.target, it.effect.element || null);
        if (!t) { showMain(); return; }
        resolve({ type: 'item', item: id, targets: t });
      };
      const analyze = async () => {
        clear(cmd);
        cmd.append(el('div', { class: 'm-title' }, 'Analyze'), back());
        const t = await chooseTarget(actor, 'one', null);
        if (!t) { showMain(); return; }
        resolve({ type: 'analyze', target: t[0] });
      };
      const talk = async () => {
        clear(cmd);
        cmd.append(el('div', { class: 'm-title' }, 'Talk to whom?'), back());
        const t = await chooseTarget(actor, 'one', null);
        if (!t) { showMain(); return; }
        const target = findUnit(state, t[0]);
        if (MONSTERS[target.type].personality === 'mindless') { say(`${target.name} doesn't respond. It's mindless.`); showMain(); return; }
        clear(cmd);
        resolve(await hooks.talk(state, actor, target, { cmd, say, wait }));
      };
      showMain();
    });
  }

  // ---- Animation of one event --------------------------------------------------------------------------------
  async function lunge(node, side) {
    node.classList.add(side === 'enemy' ? 'lunge-down' : 'lunge-up');
    await wait(180);
    node.classList.remove('lunge-down', 'lunge-up');
  }

  function hitFx(node, kind) {
    node.classList.remove('hit');
    void node.offsetWidth; // restart the CSS animation
    node.classList.add('hit');
    setTimeout(() => node.classList.remove('hit'), fast ? 0 : 420 / speed());
    return kind;
  }

  async function animate(ev) {
    const actor = findUnit(state, ev.actor);
    const an = nodes.get(ev.actor);
    const name = actor.name;
    if (ev.pass) { say(`${name} passes.`); await wait(380); return; }
    if (ev.escape !== undefined) { say(ev.escape ? 'You got away!' : "Couldn't escape!"); await wait(600); return; }
    if (ev.analyze) {
      const t = findUnit(state, ev.analyze);
      say(`${name} analyzes the ${t.name}.`);
      await fx.play('analyze', nodes.get(t.key));
      render();
      say(`${t.name}: ${ELEMENTS.map((x) => `${ELEMENT_NAMES[x]} ${TIER_LABEL[knownTier(state, t.type, x)] || '?'}`).filter((s) => !s.endsWith(' -')).join(', ') || 'no weaknesses or resistances'}.`);
      await wait(1100);
      return;
    }
    if (ev.talk) { await wait(200); return; }
    const label = ev.item ? `uses ${itemName(ev.item)}` : ev.skill === 'attack' ? 'attacks' : `uses ${SKILLS[ev.skill].name}`;
    const firstTarget = ev.hits[0]?.target || ev.effects[0]?.target || ev.effects[0]?.targets?.[0];
    const tname = firstTarget && firstTarget !== ev.actor ? findUnit(state, firstTarget)?.name : null;
    say(`${name} ${label}${tname && ev.hits.length ? ` on ${ev.hits.length > 1 && new Set(ev.hits.map((h) => h.target)).size > 1 ? 'everyone' : tname}` : ''}.`);
    await lunge(an, actor.side);
    // Group hits per target and play each target's element effect in parallel.
    const byTarget = new Map();
    for (const h of ev.hits) (byTarget.get(h.target) || byTarget.set(h.target, []).get(h.target)).push(h);
    const elx = ev.element || 'phys';
    await Promise.all([...byTarget.entries()].map(async ([key, hits]) => {
      const node = nodes.get(key);
      for (const h of hits) {
        if (h.result === 'miss') { fx.pop(node, 'MISS', 'label miss'); await wait(240); continue; }
        await fx.play(elx === 'phys' && ev.item ? 'phys' : elx, node);
        if (h.result === 'reflect') {
          fx.pop(node, 'REPEL', 'label repel');
          const back = nodes.get(h.reflectedTo);
          hitFx(back);
          if (h.amount) fx.pop(back, String(h.amount), 'dmg');
        } else if (h.result === 'absorb') {
          fx.pop(node, 'ABSORB', 'label absorb');
          fx.pop(node, `+${h.amount}`, 'heal');
        } else if (h.result === 'null') {
          fx.pop(node, 'NULL', 'label null');
        } else {
          hitFx(node);
          fx.pop(node, String(h.amount), `dmg${h.result === 'weak' ? ' big' : ''}`);
          if (RESULT_LABEL[h.result]) fx.pop(node, RESULT_LABEL[h.result], `label ${h.result}`);
          else if (h.resist) fx.pop(node, 'RESIST', 'label resist');
        }
        render();
        await wait(hits.length > 1 ? 160 : 60);
      }
    }));
    for (const f of ev.effects) {
      if (f.buff || f.dispel) {
        const keys = f.targets || [];
        await Promise.all(keys.map((k) => fx.play(f.dispel ? 'buff' : 'buff', nodes.get(k), { up: f.dispel ? false : f.buff.stacks > 0 })));
        if (f.missed?.length) for (const k of f.missed) fx.pop(nodes.get(k), 'MISS', 'label miss');
        continue;
      }
      const node = nodes.get(f.target);
      if (!node) continue;
      await fx.play('heal', node);
      if (f.revived) fx.pop(node, 'REVIVED', 'label heal');
      if (f.heal) fx.pop(node, `+${f.heal}`, 'heal');
      if (f.mp) fx.pop(node, `+${f.mp} MP`, 'mp');
    }
    render();
    const notes = [];
    for (const l of ev.learned) if (l.tier !== 'normal') notes.push(`${MONSTERS[l.type]?.name || l.type}: ${TIER_LABEL[l.tier].toLowerCase()} to ${ELEMENT_NAMES[l.el]}.`);
    for (const x of ev.exposed) notes.push(`The enemies saw ${findUnit(state, x.target).name}'s ${TIER_LABEL[x.tier].toLowerCase()} to ${ELEMENT_NAMES[x.el]}!`);
    if (notes.length) { say(notes.join(' ')); await wait(700); }
    await wait(260);
  }

  // Auto-everything stops when something goes wrong.
  function autoTrouble(ev, hpBefore) {
    if (ev.side !== 'player' && party.some((p) => hpBefore[p.key] > 0 && p.hp <= 0)) return 'an ally fell';
    const hero = party.find((p) => p.isHero);
    if (hero.hp > 0 && hero.hp / hero.maxHp < 0.3) return "you're badly hurt";
    if (ev.side === 'player' && ev.hits.some((h) => ['null', 'reflect', 'absorb'].includes(h.result))) return 'an attack was blocked';
    if (ev.exposed.some((x) => x.tier === 'weak')) return 'the enemies found a weakness';
    return null;
  }

  async function loop() {
    render();
    say(intro || `${enemies.length === 1 ? 'An enemy appears' : `${enemies.length} enemies appear`}!`);
    if (first === 'enemy') say('Ambush! The enemies move first.');
    await wait(700);
    while (!state.outcome) {
      const actor = currentActor(state);
      render();
      let action;
      if (actor.side === 'enemy') {
        await wait(320);
        action = enemyChoose(state, actor);
      } else if (autoAll || actor.auto) {
        clear(cmd);
        cmd.append(el('button', { class: 'm', onclick: () => { autoAll = false; actor.auto = false; if (actor.ref) actor.ref.auto = false; } }, autoAll ? 'Stop auto' : `Take control of ${actor.name}`));
        await wait(220);
        action = smartChoose(state, actor);
      } else {
        action = await chooseAction(actor);
      }
      clear(cmd);
      keyHandler = null;
      const hpBefore = Object.fromEntries(party.map((p) => [p.key, p.hp]));
      const ev = act(state, action);
      await animate(ev);
      if (autoAll) {
        const why = autoTrouble(ev, hpBefore);
        if (why) { autoAll = false; say(`Auto battle paused: ${why}.`); await wait(900); }
      }
      if (ev.turnEnded && !state.outcome) {
        render();
        say(state.turnSide === 'player' ? 'Your turn.' : 'Enemy turn.');
        await wait(420);
      }
    }
    render();
    return state;
  }

  async function finish(result) {
    clear(cmd);
    const panel = el('div', { class: 'result' }, ...result.lines.map((l) => el('p', {}, l)));
    const btn = el('button', { class: 'm primary', id: 'battle-continue' }, result.button || 'Continue');
    panel.append(btn);
    cmd.append(panel);
    await new Promise((resolve) => {
      btn.onclick = resolve;
      keyHandler = (e) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); resolve(); } };
      btn.focus();
    });
  }

  return {
    state,
    run: loop,
    finish,
    say,
    destroy() { window.removeEventListener('keydown', onKey); fx.destroy(); wrap.remove(); },
  };
}
