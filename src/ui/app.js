// Stage 1 app shell: a hub of three test encounters, the talk screen, and credits.
import { h, richLine } from './dom.js';
import { portrait, moodFaceSvg, moodArrow } from './portrait.js';
import { DEMONS, ITEMS, demonCard } from '../data/index.js';
import { newPlayer, inventoryList } from '../game/player.js';
import { makeRng } from '../game/rng.js';
import { startTalk, applyTurn, fieldNoteTexts, demandLabel } from '../talk/engine.js';
import { moodFace } from '../talk/rules.js';
import { createLiveBrain } from '../talk/liveBrain.js';
import { createMockBrain } from '../talk/mockBrain.js';
import { useCapability, sampleErrorCopy, isPermanentSampleError } from '../platform/claude.js';
import { battleScreen } from './battleScreen.js';
import { makeCombatant, createBattle } from '../combat/battle.js';
import { BATTLE } from '../data/battleData.js';
import { DAMAGE_ELEMENTS } from '../combat/affinity.js';
import { ui } from './context.js';
import { renderParty } from './partyScreen.js';
import { renderFusion } from './fusionScreen.js';
import { renderCompendium } from './compendiumScreen.js';
import { partyDemons } from '../game/demons.js';
import { gainDemonExp, gainPlayerExp, expFor } from '../growth/leveling.js';
import { SKILLS } from '../data/skills.js';
import { serialize, deserialize } from '../game/save.js';
import { saveSlot, loadSlot } from '../platform/storage.js';

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const seed = Number(params.get('seed')) || Math.floor(Math.random() * 2 ** 31);

export const game = {
  player: newPlayer(),
  rng: makeRng(seed),
  brainKind: 'pending',
  brainReady: null,
  forceHostile: params.get('hostile') === '1',
  battleDelay: params.get('fast') === '1' ? 15 : 650,
};

let root;

function setBrain(brain) {
  game.brainKind = brain.kind;
  game.brainReady = Promise.resolve(brain);
  const chip = document.querySelector('#brain-chip');
  if (chip) chip.replaceWith(brainChip());
}

async function resolveBrain() {
  if (params.get('brain') === 'mock') return createMockBrain();
  const sample = await useCapability('sample');
  return sample ? createLiveBrain(sample) : createMockBrain();
}

function brainChip() {
  const k = game.brainKind;
  const label = k === 'live' ? 'Live Claude' : k === 'mock' ? 'Scripted replies' : 'Connecting...';
  const title = k === 'live'
    ? 'Demons answer through live Claude. The first message asks you to allow it.'
    : k === 'mock' ? 'Live Claude is not available here, so demons use simple scripted replies.' : '';
  return h('span', { id: 'brain-chip', class: `chip chip-${k}`, title }, label);
}

function statusBar() {
  const p = game.player;
  return h('header', { class: 'status' },
    h('div', { class: 'status-main' },
      h('strong', {}, 'You'),
      h('span', {}, `Lv ${p.level}`),
      h('span', {}, `HP ${p.hp}/${p.maxHp}`),
      h('span', {}, `MP ${p.mp}/${p.maxMp}`),
      h('span', { class: 'gold' }, `${p.gold} gold`)),
    brainChip());
}

function inventoryPanel() {
  const p = game.player;
  const list = inventoryList(p);
  return h('section', { class: 'panel' },
    h('h3', {}, 'Items'),
    list.length
      ? h('ul', { class: 'inv' }, list.map((i) => h('li', { title: ITEMS[i.id].desc }, `${i.name} ×${i.count}`)))
      : h('p', { class: 'muted' }, 'Nothing.'),
    h('h3', {}, 'Party'),
    p.stock.length
      ? h('ul', { class: 'inv', id: 'party-list' }, p.stock.map((d) => h('li', {}, `${DEMONS[d.id].name} (Lv ${d.level})${d.inParty ? '' : ' · in stock'}`)))
      : h('p', { class: 'muted' }, 'No demons yet.'));
}

function notesPanel() {
  const entries = Object.keys(game.player.fieldNotes).filter((id) => game.player.fieldNotes[id].length);
  return h('section', { class: 'panel', id: 'field-notes' },
    h('h3', {}, 'Field notes'),
    entries.length
      ? entries.map((id) => h('div', { class: 'notes' },
        h('h4', {}, DEMONS[id].name),
        h('ul', {}, fieldNoteTexts(game.player, DEMONS[id]).map((n) => h('li', {}, n)))))
      : h('p', { class: 'muted' }, 'Talk to demons to learn what they like. What you learn is written here.'));
}

let hubMessage = '';
function rest() {
  const p = game.player;
  p.hp = p.maxHp; p.mp = p.maxMp;
  for (const d of p.stock) { d.hp = null; d.mp = null; }
  hubMessage = 'You rest. Everyone is fully healed.';
  renderHub();
}
async function doSave() {
  const where = await saveSlot(1, serialize(game.player));
  hubMessage = where ? `Saved (${where === 'cloud' ? 'to your claude.ai account' : 'in this browser'}).` : 'Could not save here.';
  renderHub();
}
async function doLoad() {
  const got = await loadSlot(1);
  if (!got) { hubMessage = 'No save found.'; renderHub(); return; }
  try {
    game.player = deserialize(got.data).player;
    hubMessage = `Loaded your save (${got.where === 'cloud' ? 'from your claude.ai account' : 'from this browser'}).`;
  } catch (e) {
    hubMessage = `That save can't be loaded: ${e.message}.`;
  }
  renderHub();
}

export function renderHub() {
  const msg = hubMessage;
  hubMessage = '';
  root.replaceChildren(
    statusBar(),
    h('section', { class: 'intro' },
      h('h1', {}, 'Talk test'),
      h('p', { class: 'muted' }, 'Three demons wait in the dark. Walk up to one, then say or do anything. Put speech in "quotes"; anything else is an action you try.')),
    h('section', { class: 'roster' }, Object.values(DEMONS).map((card) => h('article', { class: 'demon-card' },
      portrait(card, { size: 'sm' }),
      h('div', { class: 'demon-meta' },
        h('h2', {}, card.name),
        h('p', { class: 'muted' }, `${card.family} · Lv ${card.level}`),
        h('button', { type: 'button', id: `meet-${card.id}`, onclick: () => renderEncounter(card.id) }, 'Approach'))))),
    h('div', { class: 'cols' }, inventoryPanel(), notesPanel()),
    h('footer', { class: 'foot' },
      h('label', { class: 'check' },
        h('input', { type: 'checkbox', id: 'force-hostile', checked: game.forceHostile || null, onchange: (e) => { game.forceHostile = e.target.checked; } }),
        ' Demons are spoiling for a fight'),
      h('div', { class: 'actions wrap' },
        h('button', { type: 'button', id: 'open-party', onclick: () => renderParty() }, 'Party'),
        h('button', { type: 'button', id: 'open-fusion', onclick: () => renderFusion() }, 'Fusion'),
        h('button', { type: 'button', id: 'open-compendium', onclick: () => renderCompendium() }, 'Compendium'),
        h('button', { type: 'button', id: 'open-arena', class: 'secondary', onclick: renderArena }, 'Arena'),
        h('button', { type: 'button', id: 'rest', class: 'secondary', onclick: rest }, 'Rest'),
        h('button', { type: 'button', id: 'save', class: 'secondary', onclick: doSave }, 'Save'),
        h('button', { type: 'button', id: 'load', class: 'secondary', onclick: doLoad }, 'Load')),
      h('p', { id: 'hub-msg', class: 'muted', 'aria-live': 'polite' }, msg),
      h('button', { type: 'button', class: 'link', id: 'open-credits', onclick: renderCredits }, 'Image credits')));
}

function renderEncounter(id) {
  const card = demonCard(id);
  const hostile = params.get('hostile') === '0' ? false : (game.forceHostile || game.rng() < 0.25);
  root.replaceChildren(
    statusBar(),
    h('section', { class: 'encounter' },
      portrait(card, { size: 'lg' }),
      h('h1', {}, `${card.name} appears!`),
      hostile ? h('p', { class: 'warn' }, 'He looks ready for a fight.') : h('p', { class: 'muted' }, `${card.family} · Lv ${card.level}`),
      h('div', { class: 'actions' },
        h('button', { type: 'button', id: 'enc-talk', onclick: () => runTalk(id, hostile) }, 'Talk'),
        h('button', { type: 'button', id: 'enc-fight', class: 'secondary', onclick: () => renderFight(card, 'fight_player_first') }, 'Fight'))));
}

function demonUnit(id, side, i, level, boss = null) {
  const name = DEMONS[id]?.name ?? id.charAt(0).toUpperCase() + id.slice(1);
  return makeCombatant({ key: `${side}-${id}-${i}`, name, side, level, def: BATTLE[id], demonId: id, boss });
}

function protagonistUnit(level = game.player.level, sync = true) {
  const u = makeCombatant({ key: 'you', name: 'You', side: 'player', level, def: { ...BATTLE.protagonist, skills: game.player.skills }, isProtagonist: true, statsOverride: sync ? game.player.stats : null });
  if (sync) {
    u.hp = Math.min(game.player.hp, u.maxHp);
    u.mp = Math.min(game.player.mp, u.maxMp);
  }
  return u;
}

// You know every tier of a demon you own.
function knownTiers() {
  return Object.fromEntries(game.player.stock.map((d) => [d.id, DAMAGE_ELEMENTS]));
}

function startBattle({ party, enemies, first = 'player', onEnd, title }) {
  const state = createBattle({ party, enemies, first, rng: game.rng, known: knownTiers() });
  battleScreen(root, {
    state,
    delay: game.battleDelay,
    header: h('div', {}, statusBar(), title ? h('h1', { class: 'b-title' }, title) : null),
    onEnd: (outcome) => onEnd(outcome, state),
  });
}

// One of your demons as a combatant (its own level and skills; HP/MP carried between fights).
function ownedUnit(inst, i) {
  const u = makeCombatant({ key: `player-${inst.uid}`, name: DEMONS[inst.id].name, side: 'player', level: inst.level, def: { ...BATTLE[inst.id], skills: inst.skills }, demonId: inst.id });
  if (inst.hp != null) u.hp = Math.min(inst.hp, u.maxHp);
  if (inst.mp != null) u.mp = Math.min(inst.mp, u.maxMp);
  u.uid = inst.uid;
  void i;
  return u;
}

// A fight from the encounter screen or a failed talk: you and your party vs that demon.
function renderFight(card, outcome) {
  const members = partyDemons(game.player);
  const party = [protagonistUnit(), ...members.map(ownedUnit)];
  const enemies = [demonUnit(card.id, 'enemy', 0, card.level)];
  startBattle({
    party,
    enemies,
    first: outcome === 'fight_demon_first' ? 'enemy' : 'player',
    title: outcome === 'fight_demon_first' ? `${card.name} strikes first!` : `You attack ${card.name}!`,
    onEnd: (result, state) => {
      const p = game.player;
      const me = state.sides.player.find((c) => c.isProtagonist);
      p.hp = Math.max(1, me.hp);
      p.mp = me.mp;
      for (const u of state.sides.player) {
        const inst = p.stock.find((d) => d.uid === u.uid);
        if (inst) { inst.hp = u.hp; inst.mp = u.mp; }
      }
      if (result === 'lose') {
        p.hp = p.maxHp; p.mp = p.maxMp;
        for (const d of p.stock) { d.hp = null; d.mp = null; }
        renderResults(['You fell. (Prototype: you wake up back at the start, fully healed.)']);
        return;
      }
      p.deeds.killed[card.family] = (p.deeds.killed[card.family] || 0) + 1;
      renderResults(awardVictory(state.sides.enemy));
    },
  });
}

// EXP and gold for a won battle. Returns lines for the results screen.
export function awardVictory(enemies) {
  const p = game.player;
  const exp = enemies.reduce((n, e) => n + expFor(e.level, e.boss), 0);
  const gold = enemies.reduce((n, e) => n + e.level * 15, 0);
  p.gold += gold;
  const lines = [`Victory! +${exp} EXP, +${gold} gold.`];
  for (const ev of gainPlayerExp(p, exp)) lines.push(`You reached Lv ${ev.level}! (+3 stat points)`);
  for (const d of partyDemons(p)) {
    const name = DEMONS[d.id].name;
    for (const ev of gainDemonExp(p, d, exp)) {
      if (ev.type === 'level') lines.push(`${name} reached Lv ${ev.level}.`);
      if (ev.type === 'learn') lines.push(`${name} learned ${SKILLS[ev.skill].name}!`);
      if (ev.type === 'pending') lines.push(`${name} wants to learn ${SKILLS[ev.skill].name}, but his slots are full (see Party).`);
    }
  }
  return lines;
}

function renderResults(lines) {
  root.replaceChildren(
    statusBar(),
    h('section', { class: 'panel results', id: 'results' },
      h('h1', {}, 'After the battle'),
      h('ul', {}, lines.map((l) => h('li', {}, l))),
      h('button', { type: 'button', id: 'results-done', onclick: renderHub }, 'Continue')));
}

function renderArena() {
  const pool = Object.keys(BATTLE).filter((id) => id !== 'protagonist');
  const nameOf = (id) => DEMONS[id]?.name ?? id.charAt(0).toUpperCase() + id.slice(1);
  const chosen = new Set(['ares', 'hephaestus', 'kappa'].filter((id) => pool.includes(id)));
  const box = (id) => h('label', { class: 'check' },
    h('input', { type: 'checkbox', id: `arena-${id}`, checked: chosen.has(id) || null, onchange: (e) => { if (e.target.checked) chosen.add(id); else chosen.delete(id); } }),
    ` ${nameOf(id)}`);
  const go = (boss) => {
    const ids = [...chosen].slice(0, 3);
    const level = boss ? 12 : 10;
    const party = [protagonistUnit(level, false), ...ids.map((id, i) => demonUnit(id, 'player', i, level))];
    let enemies;
    if (boss) enemies = [demonUnit('gonggong', 'enemy', 0, 14, { hpMult: 10, mpMult: 3, icons: 3, dmgMult: 0.55 })];
    else {
      const others = pool.filter((id) => !ids.includes(id)).sort(() => game.rng() - 0.5);
      const size = game.rng() < 0.5 ? 2 : 3;
      enemies = others.slice(0, size).map((id, i) => demonUnit(id, 'enemy', i, level));
    }
    startBattle({ party, enemies, title: boss ? 'Boss: Gonggong' : 'Arena', onEnd: () => renderArena() });
  };
  root.replaceChildren(
    statusBar(),
    h('section', { class: 'panel arena' },
      h('h1', {}, 'Arena'),
      h('p', { class: 'muted' }, 'Test fights. Pick up to three demons to fight beside you (Lv 10; Lv 12 for the boss). Nothing here affects your HP or party.'),
      h('div', { class: 'arena-picks' }, pool.map(box)),
      h('div', { class: 'actions' },
        h('button', { type: 'button', id: 'arena-random', onclick: () => go(false) }, 'Fight a random group'),
        h('button', { type: 'button', id: 'arena-boss', onclick: () => go(true) }, 'Fight the boss'),
        h('button', { type: 'button', class: 'secondary', id: 'back-hub', onclick: renderHub }, 'Back'))));
}

function talkView(state) {
  const card = state.card;
  const log = h('div', { class: 'chat', id: 'chat', 'aria-live': 'polite' });
  const face = h('div', { class: 'mood', id: 'mood' });
  const demandBox = h('p', { class: 'demand', id: 'demand', hidden: true });
  const notice = h('p', { class: 'notice', id: 'talk-notice', hidden: true });
  const input = h('textarea', { id: 'talk-input', rows: 2, placeholder: '"Say something" or *do something*', maxlength: 600 });
  const send = h('button', { type: 'button', id: 'talk-send' }, 'Send');
  const stop = h('button', { type: 'button', id: 'talk-stop', class: 'secondary', hidden: true }, 'Stop');
  const thinking = h('p', { class: 'thinking', id: 'thinking', hidden: true }, `${card.name} is thinking...`);
  const pending = h('div', { class: 'line player pending', hidden: true });
  const endBar = h('div', { class: 'end-bar', id: 'end-bar', hidden: true });
  const form = h('div', { class: 'talk-input' }, input, h('div', { class: 'talk-buttons' }, send, stop));

  const view = {
    onSend: null,
    onStop: null,
    refresh() {
      log.replaceChildren(...state.log.map((l) => {
        if (l.who === 'system') return h('p', { class: `line system${l.outcome ? ' outcome' : ''}` }, l.text);
        if (l.who === 'player') return h('div', { class: 'line player' }, h('p', {}, richLine(l.text, { player: true })));
        return h('div', { class: 'line demon' },
          h('p', {}, h('strong', {}, `${card.name}: `), richLine(l.text)),
          l.moodDelta !== undefined && state.log.indexOf(l) > 0 ? moodArrow(l.moodDelta) : null);
      }), pending, thinking);
      face.replaceChildren(moodFaceSvg(moodFace(state.mood)));
      if (state.pendingDemand) {
        demandBox.hidden = false;
        demandBox.textContent = `Wants: ${demandLabel(state.pendingDemand)}`;
      } else demandBox.hidden = true;
      if (state.ended) {
        form.hidden = true;
        endBar.hidden = false;
        const fight = state.outcome.startsWith('fight');
        endBar.replaceChildren(h('button', { type: 'button', id: 'talk-done', onclick: () => (fight ? renderFight(card, state.outcome) : renderHub()) }, fight ? 'To the fight' : 'Back'));
      }
      log.scrollTop = log.scrollHeight;
    },
    setThinking(on, text) {
      thinking.hidden = !on;
      stop.hidden = !on;
      send.disabled = on;
      input.disabled = on;
      pending.hidden = !(on && text);
      if (on && text) pending.replaceChildren(h('p', {}, richLine(text, { player: true })));
      log.scrollTop = log.scrollHeight;
    },
    notice(text) {
      notice.hidden = !text;
      notice.textContent = text || '';
    },
    restoreInput(text) {
      if (text) input.value = text;
    },
  };

  const submit = () => {
    const text = input.value.trim();
    if (!text || send.disabled) return;
    input.value = '';
    view.notice('');
    view.onSend?.(text);
  };
  send.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  });
  stop.addEventListener('click', () => view.onStop?.());

  root.replaceChildren(
    statusBar(),
    h('section', { class: 'talk' },
      h('aside', { class: 'talk-side' },
        portrait(card, { size: 'lg' }),
        h('h2', {}, card.name),
        h('p', { class: 'muted' }, `${card.family} · Lv ${card.level}`),
        face,
        demandBox),
      h('div', { class: 'talk-main' }, log, notice, form, endBar,
        h('p', { class: 'hint muted' }, 'Speech in "quotes". Anything else is an action. Enter sends.'))));
  view.refresh();
  input.focus();
  return view;
}

async function brainTurn(state, text, view) {
  const brain = await game.brainReady;
  const ctl = new AbortController();
  view.onStop = () => ctl.abort();
  view.setThinking(true, text);
  try {
    const raw = await brain.respond({ state, player: game.player, playerText: text, signal: ctl.signal });
    applyTurn(state, game.player, text, raw, game.rng);
  } catch (e) {
    view.setThinking(false);
    if (brain.kind === 'live' && isPermanentSampleError(e?.code)) {
      setBrain(createMockBrain());
      view.notice(sampleErrorCopy(e.code));
      return brainTurn(state, text, view);
    }
    if (e && typeof e === 'object' && 'code' in e) {
      view.notice(sampleErrorCopy(e.code));
      view.restoreInput(text);
    } else {
      console.error(e);
      view.notice('Something went wrong with that message. Try again.');
      view.restoreInput(text);
    }
    return;
  }
  view.setThinking(false);
  view.refresh();
}

async function runTalk(id, hostile) {
  const card = demonCard(id);
  const state = startTalk({ card, player: game.player, rng: game.rng, context: { hostile } });
  const view = talkView(state);
  view.onSend = (text) => brainTurn(state, text, view);
  if (state.speaksFirst) await brainTurn(state, null, view);
}

async function renderCredits() {
  const list = h('ul', { class: 'credits', id: 'credits-list' }, h('li', { class: 'muted' }, 'Loading...'));
  root.replaceChildren(
    statusBar(),
    h('section', { class: 'panel' },
      h('h1', {}, 'Image credits'),
      h('p', { class: 'muted' }, 'Every image is public domain or CC0.'),
      list,
      h('button', { type: 'button', id: 'back-hub', onclick: renderHub }, 'Back')));
  try {
    const res = await fetch('assets/credits.json');
    const credits = res.ok ? await res.json() : [];
    list.replaceChildren(...(credits.length ? credits.map((c) => h('li', {},
      h('strong', {}, DEMONS[c.id]?.name ?? c.id), ': ',
      `${c.title}${c.artist ? `, ${c.artist}` : ''}${c.date ? ` (${c.date})` : ''}. ${c.source}. ${c.license}. `,
      h('a', { href: c.sourceUrl, target: '_blank', rel: 'noopener' }, 'Source'))) : [h('li', { class: 'muted' }, 'No images yet; demons use placeholder frames.')]));
  } catch {
    list.replaceChildren(h('li', { class: 'muted' }, 'No images yet; demons use placeholder frames.'));
  }
}

export function startApp(el) {
  root = el;
  ui.root = el;
  ui.game = game;
  ui.statusBar = statusBar;
  ui.goHub = renderHub;
  game.brainReady = resolveBrain().then((b) => { setBrain(b); return b; });
  renderHub();
}
