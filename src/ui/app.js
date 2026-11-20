// Stage 1 app shell: a hub of three test encounters, the talk screen, and credits.
import { h, richLine, mount } from './dom.js';
import { portrait, moodFaceSvg, moodArrow } from './portrait.js';
import { DEMONS, ITEMS, demonCard } from '../data/index.js';
import { newPlayer, inventoryList } from '../game/player.js';
import { makeRng } from '../game/rng.js';
import { startTalk, applyTurn, fieldNoteTexts, demandLabel, armorTalk } from '../talk/engine.js';
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
import { awardVictory } from '../growth/rewards.js';
import { tryEscape } from '../dungeon/events.js';
import { renderWorld, hasStory } from './worldScreen.js';
import { newWorld } from '../world/runtime.js';
import { newStory, meets } from '../story/state.js';
import { startNpcTalk, applyNpcTurn, buildNpcPrompt, mockNpcRespond } from '../story/npcTalk.js';
import { buildDirectorPrompt, resolveFinale, mockDirector, recordLines, endingDetails } from '../story/finale.js';
import { BIBLE, SCENES, NPC_CARDS } from '../data/story/index.js';
import { MAPS } from '../data/maps/index.js';
import { playScene } from './dialogue.js';
import { serialize, deserialize } from '../game/save.js';
import { saveSlot, loadSlot } from '../platform/storage.js';
import { renderDungeon, newRun, FLOORS } from './dungeonScreen.js';
import { renderShop } from './shopScreen.js';
import { renderItems } from './itemsScreen.js';
import { renderJournal } from './journalScreen.js';
import { play, music, isMuted, setSound } from './sfx.js';
import { armorTiers } from '../game/shop.js';
import { demonVitals } from '../game/fieldItems.js';

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const DEBUG = params.get('debug') === '1';
const seed = Number(params.get('seed')) || Math.floor(Math.random() * 2 ** 31);

export const game = {
  player: newPlayer(),
  rng: makeRng(seed),
  brainKind: 'pending',
  brainReady: null,
  forceHostile: params.get('hostile') === '1',
  battleDelay: params.get('fast') === '1' ? 15 : 650,
  run: null, // the dungeon run (null in the test rooms)
};

let root;

// Hidden behavior meters (story mode only): talks, recruits, fled, kills, mercy, plus which demons you fight with.
function bump(meter, n = 1) {
  const st = game.run?.story;
  if (st) st.meters[meter] = (st.meters[meter] ?? 0) + n;
}
const inStory = () => game.run?.mode === 'story';
const backToMap = (msg = '') => (inStory() ? renderWorld(msg) : game.run ? renderDungeon(msg) : renderHub());

function setBrain(brain) {
  game.brainKind = brain.kind;
  game.brainReady = Promise.resolve(brain);
  const chip = document.querySelector('#brain-chip');
  if (chip) chip.replaceWith(brainChip());
}

async function resolveBrain() {
  if (params.get('brain') === 'mock') return createMockBrain();
  const sample = await useCapability('sample');
  game.sample = sample;
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

function soundChip() {
  const btn = h('button', { type: 'button', id: 'sound-toggle', class: 'chip chip-sound', title: 'Music and sound effects', onclick: () => {
    setSound(isMuted());
    btn.textContent = isMuted() ? 'Sound off' : 'Sound on';
  } }, isMuted() ? 'Sound off' : 'Sound on');
  return btn;
}

// In battle the party rows show live HP/MP, so the bar leaves them out (they'd be stale until the fight ends).
function statusBar({ battle = false } = {}) {
  const p = game.player;
  return h('header', { class: `status${battle ? ' in-battle' : ''}` },
    h('div', { class: 'status-main' },
      h('strong', {}, 'You'),
      h('span', {}, `Lv ${p.level}`),
      battle ? null : h('span', {}, `HP ${p.hp}/${p.maxHp}`),
      battle ? null : h('span', {}, `MP ${p.mp}/${p.maxMp}`),
      h('span', { class: 'gold' }, `${p.gold} gold`)),
    h('span', { class: 'chips-right' }, soundChip(), brainChip()));
}

// Redraw every status bar on screen in place (gold/HP changed without a screen change).
function refreshStatus() {
  for (const el of document.querySelectorAll('header.status')) el.replaceWith(statusBar({ battle: el.classList.contains('in-battle') }));
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
async function saveGame() {
  const world = !game.run ? {} : inStory() ? { story: game.run } : { dungeon: game.run };
  return saveSlot(1, serialize(game.player, { world }));
}
// Autosave on every floor change, so a game over can retry from the last floor.
async function autosave() {
  if (!game.run) return null;
  return saveSlot('auto', serialize(game.player, { world: inStory() ? { story: game.run } : { dungeon: game.run } }));
}
async function retryFromAutosave() {
  const got = await loadSlot('auto');
  if (!got) { doLoad(true); return; }
  const { player, world } = deserialize(got.data);
  game.player = player;
  game.run = world.story ?? world.dungeon ?? null;
  // You catch your breath: everyone back up to at least half HP/MP, so a checkpoint can't trap you in a death loop.
  player.hp = Math.max(player.hp, Math.ceil(player.maxHp / 2));
  player.mp = Math.max(player.mp, Math.ceil(player.maxMp / 2));
  for (const d of player.stock) {
    const v = demonVitals(d);
    d.hp = Math.max(v.hp, Math.ceil(v.maxHp / 2));
    d.mp = Math.max(v.mp, Math.ceil(v.maxMp / 2));
  }
  if (game.run?.mode === 'story' && hasStory()) renderWorld('You come to where you last caught your breath.');
  else if (game.run) renderDungeon('You came to.');
  else renderTitle();
}

async function doSave() {
  const where = await saveGame();
  hubMessage = where ? `Saved (${where === 'cloud' ? 'to your claude.ai account' : 'in this browser'}).` : 'Could not save here.';
  renderHub();
}
async function doLoad(fromTitle = false) {
  // Continue from whichever is newer: your own save or the autosave made on every floor change.
  const [manual, auto] = await Promise.all([loadSlot(1), loadSlot('auto')]);
  const got = [manual, auto].filter(Boolean).sort((a, b) => String(b.data?.savedAt ?? '').localeCompare(String(a.data?.savedAt ?? '')))[0] ?? null;
  if (!got) {
    hubMessage = 'No save found.';
    if (fromTitle) renderTitle('No save found.'); else renderHub();
    return;
  }
  try {
    const { player, world } = deserialize(got.data);
    game.player = player;
    game.run = world.story ?? world.dungeon ?? null;
    const where = got.where === 'cloud' ? 'from your claude.ai account' : 'from this browser';
    if (game.run?.mode === 'story' && hasStory()) { renderWorld(`Loaded your save (${where}).`); return; }
    if (game.run && !game.run.mode) { renderDungeon(`Loaded your save (${where}).`); return; }
    hubMessage = `Loaded your save (${where}).`;
  } catch (e) {
    hubMessage = `That save can't be loaded: ${e.message}.`;
  }
  renderHub();
}

export function renderHub() {
  const msg = hubMessage;
  hubMessage = '';
  mount(root, 
    statusBar(),
    h('section', { class: 'intro' },
      h('div', { class: 'screen-head' }, h('h1', {}, 'Test rooms'), h('button', { type: 'button', class: 'secondary mini', id: 'to-title', onclick: renderTitle }, 'Title')),
      h('p', { class: 'muted' }, 'Every demon waits here. Walk up to one, then say or do anything. Put speech in "quotes"; anything else is an action you try.')),
    h('section', { class: 'roster' }, Object.values(DEMONS).sort((a, b) => a.level - b.level).map((card) => h('article', { class: 'demon-card' },
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
        h('button', { type: 'button', id: 'open-items', onclick: () => renderItems() }, 'Items'),
        h('button', { type: 'button', id: 'open-fusion', onclick: () => renderFusion() }, 'Fusion'),
        h('button', { type: 'button', id: 'open-compendium', onclick: () => renderCompendium() }, 'Compendium'),
        h('button', { type: 'button', id: 'open-arena', class: 'secondary', onclick: renderArena }, 'Arena'),
        h('button', { type: 'button', id: 'rest', class: 'secondary', onclick: rest }, 'Rest'),
        h('button', { type: 'button', id: 'save', class: 'secondary', onclick: doSave }, 'Save'),
        h('button', { type: 'button', id: 'load', class: 'secondary', onclick: doLoad }, 'Load')),
      h('p', { id: 'hub-msg', class: 'muted', 'aria-live': 'polite' }, msg),
      h('button', { type: 'button', class: 'link', id: 'open-credits', onclick: renderCredits }, 'Credits')));
}

function renderEncounter(id) {
  const card = demonCard(id);
  const hostile = params.get('hostile') === '0' ? false : (game.forceHostile || game.rng() < 0.25);
  mount(root, 
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
  const u = makeCombatant({ key: 'you', name: 'You', side: 'player', level, def: { ...BATTLE.protagonist, skills: game.player.skills, tiers: sync ? armorTiers(game.player) : {} }, isProtagonist: true, statsOverride: sync ? game.player.stats : null });
  if (sync) {
    u.hp = Math.min(game.player.hp, u.maxHp);
    u.mp = Math.min(game.player.mp, u.maxMp);
  }
  return u;
}

// You know every tier of a demon you own.
function knownTiers() {
  const known = { ...(game.player.knownAffinities ?? {}) };
  for (const d of game.player.stock) known[d.id] = DAMAGE_ELEMENTS;
  return known;
}

// talkContext: extra talk context for Talk mid-battle (a placed demon's scene note, boss), so he stays who he was.
function startBattle({ party, enemies, first = 'player', onEnd, title, real = true, talkContext = {} }) {
  const state = createBattle({ party, enemies, first, rng: game.rng, known: knownTiers(), inventory: real ? game.player.items : null });
  music(enemies.some((e) => e.boss) ? 'boss' : 'battle');
  if (real && game.run) game.run.stats.fights += 1;
  battleScreen(root, {
    state,
    delay: game.battleDelay,
    header: h('div', {}, statusBar({ battle: true }), title ? h('h1', { class: 'b-title' }, title) : null),
    onEnd: (outcome) => onEnd(outcome, state),
    // Talking mid-battle: the conversation's outcome comes back into the fight.
    // HP/MP paid to a demon mid-battle come out of the protagonist's battle HP/MP.
    onTalk: real ? (enemy, done) => {
      const me = state.sides.player.find((c) => c.isProtagonist);
      game.player.hp = me.hp;
      game.player.mp = me.mp;
      runTalk(enemy.demonId, false, {
        level: enemy.level,
        context: { ...talkContext, attackedByPlayer: enemy.hp < enemy.maxHp },
        inBattle: true,
        onDone: (outcome) => {
          me.hp = Math.max(1, Math.min(me.maxHp, game.player.hp));
          me.mp = Math.min(me.maxMp, game.player.mp);
          done(outcome);
        },
      });
    } : null,
  });
}

// Sync HP/MP back to the player after a real battle; award a victory. Returns result lines.
function finishBattle(state, result) {
  const p = game.player;
  const me = state.sides.player.find((c) => c.isProtagonist);
  p.hp = Math.max(1, me.hp);
  p.mp = me.mp;
  for (const u of state.sides.player) {
    const inst = p.stock.find((d) => d.uid === u.uid);
    if (inst) { inst.hp = u.hp; inst.mp = u.mp; }
  }
  // Remember what you learned about each enemy species for next time.
  const memo = (p.knownAffinities ||= {});
  const met = (p.metDemons ||= []);
  for (const e of state.sides.enemy) {
    if (e.demonId && !met.includes(e.demonId)) met.push(e.demonId);
    const learned = [...(state.known[e.key] ?? [])];
    if (e.demonId && learned.length) memo[e.demonId] = [...new Set([...(memo[e.demonId] ?? []), ...learned])];
  }
  if (result === 'escaped') bump('fled');
  if (inStory()) {
    const usage = (game.run.story.usage ||= {});
    for (const u of state.sides.player) if (u.demonId && !u.isProtagonist) usage[u.demonId] = (usage[u.demonId] ?? 0) + 1;
  }
  if (result !== 'win') return [];
  bump('kills', state.sides.enemy.filter((e) => !e.gone).length);
  const lines = awardVictory(p, state.sides.enemy);
  if (me.hp <= 0) lines.push('You get back up, barely (1 HP). Your demons carried the fight.');
  const down = partyDemons(p).filter((d) => d.hp === 0).map((d) => DEMONS[d.id].name);
  if (down.length) lines.push(`${down.join(', ')} ${down.length === 1 ? 'is' : 'are'} down and won't fight until revived: a Bead of Return, a revive skill, or a spring.`);
  return lines;
}

// One of your demons as a combatant (its own level and skills; HP/MP carried between fights).
function ownedUnit(inst) {
  const u = makeCombatant({ key: `player-${inst.uid}`, name: DEMONS[inst.id].name, side: 'player', level: inst.level, def: { ...BATTLE[inst.id], skills: inst.skills }, demonId: inst.id });
  if (inst.hp != null) u.hp = Math.min(inst.hp, u.maxHp);
  if (inst.mp != null) u.mp = Math.min(inst.mp, u.maxMp);
  u.uid = inst.uid;
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
      const lines = finishBattle(state, result);
      if (result === 'lose') { renderGameOver(); return; }
      if (result === 'escaped') { renderHub(); return; }
      renderResults(lines, renderHub);
    },
  });
}

function renderResults(lines, next) {
  if (lines.some((l) => /reached Lv/.test(l))) play('levelup', 0.6);
  else if (lines.length) play('coin', 0.5);
  mount(root, 
    statusBar(),
    h('section', { class: 'panel results', id: 'results' },
      h('h1', {}, 'After the battle'),
      h('ul', {}, lines.map((l) => h('li', {}, l))),
      h('button', { type: 'button', id: 'results-done', onclick: next }, 'Continue')));
}

function renderGameOver() {
  mount(root, 
    h('section', { class: 'title-screen', id: 'game-over' },
      h('h1', {}, 'You fell.'),
      h('p', { class: 'muted' }, 'The dark takes you. You can come to at your last checkpoint (the last stairs, scene, chest, lever or door), with everything you had then.'),
      h('div', { class: 'actions' },
        h('button', { type: 'button', id: 'go-retry', onclick: retryFromAutosave }, 'Retry from the last checkpoint'),
        h('button', { type: 'button', id: 'go-load', class: 'secondary', onclick: () => doLoad(true) }, 'Load your save'),
        h('button', { type: 'button', id: 'go-new', class: 'secondary', onclick: newGame }, 'New game'),
        h('button', { type: 'button', id: 'go-title', class: 'secondary', onclick: renderTitle }, 'Title'))));
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
    startBattle({ party, enemies, title: boss ? 'Boss: Gonggong' : 'Arena', onEnd: () => renderArena(), real: false });
  };
  mount(root, 
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

function talkView(state, { onDone = null, inBattle = false } = {}) {
  const card = state.card;
  const log = h('div', { class: 'chat', id: 'chat', 'aria-live': 'polite' });
  const face = h('div', { class: 'mood', id: 'mood' });
  const demandBox = h('p', { class: 'demand', id: 'demand', hidden: true });
  const notice = h('p', { class: 'notice', id: 'talk-notice', hidden: true });
  const input = h('textarea', { id: 'talk-input', rows: 2, placeholder: '"Say something" or *do something*', maxlength: 600 });
  const send = h('button', { type: 'button', id: 'talk-send' }, 'Send');
  const stop = h('button', { type: 'button', id: 'talk-stop', class: 'secondary', hidden: true }, 'Stop');
  const leave = h('button', { type: 'button', id: 'talk-leave', class: 'secondary' }, 'Walk away');
  const thinking = h('p', { class: 'thinking', id: 'thinking', hidden: true }, `${card.name} is thinking...`);
  const pending = h('div', { class: 'line player pending', hidden: true });
  const endBar = h('div', { class: 'end-bar', id: 'end-bar', hidden: true });
  const form = h('div', { class: 'talk-input' }, input, h('div', { class: 'talk-buttons' }, send, stop, leave));

  const view = {
    onSend: null,
    onStop: null,
    refresh() {
      // A demon that doesn't open the talk still gets a beat, so the screen never starts empty.
      const quiet = state.log.length || state.speaksFirst ? null : h('p', { class: 'line system', id: 'talk-quiet' }, state.npc ? `${card.name} waits for you to speak.` : `${card.name} watches you, waiting to see what you do.`);
      mount(log, quiet, ...state.log.map((l) => {
        if (l.who === 'system') return h('p', { class: `line system${l.outcome ? ' outcome' : ''}` }, l.text);
        if (l.who === 'player') return h('div', { class: 'line player' }, h('p', {}, richLine(l.text, { player: true })));
        return h('div', { class: 'line demon' },
          h('p', {}, h('strong', {}, `${card.name}: `), richLine(l.text)),
          l.moodDelta !== undefined && state.log.indexOf(l) > 0 ? moodArrow(l.moodDelta) : null);
      }), pending, thinking);
      mount(face, moodFaceSvg(moodFace(state.mood)));
      if (state.pendingDemand) {
        demandBox.hidden = false;
        demandBox.textContent = `Wants: ${demandLabel(state.pendingDemand)}`;
      } else demandBox.hidden = true;
      if (state.ended) {
        form.hidden = true;
        endBar.hidden = false;
        const fight = state.outcome.startsWith('fight');
        const go = onDone ? () => onDone(state.outcome) : () => (fight ? renderFight(card, state.outcome) : renderHub());
        const label = fight ? 'To the fight' : inBattle ? (state.outcome === 'player_left' ? 'Leave the fight' : 'Back to the fight') : 'Back';
        mount(endBar, h('button', { type: 'button', id: 'talk-done', onclick: go }, label));
      }
      log.scrollTop = log.scrollHeight;
    },
    setThinking(on, text) {
      leave.disabled = on;
      thinking.hidden = !on;
      stop.hidden = !on;
      send.disabled = on;
      input.disabled = on;
      pending.hidden = !(on && text);
      if (on && text) mount(pending, h('p', {}, richLine(text, { player: true })));
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
  // Leave without spending a message: demons may still take a swing as you turn (engine decides).
  leave.addEventListener('click', () => {
    if (state.ended) return;
    if (state.npc) {
      state.ended = true;
      state.outcome = 'left';
      state.log.push({ who: 'system', text: 'You walk away.', outcome: 'left' });
    } else {
      applyTurn(state, game.player, '*You walk away.*', { reply: '*watches you go*', moodDelta: 0, matched: [], playerAct: 'leave', demonAct: state.mood <= -3 ? 'attack' : 'none' }, game.rng);
    }
    view.refresh();
  });

  mount(root, 
    statusBar(),
    h('section', { class: 'talk' },
      h('aside', { class: 'talk-side' },
        portrait(card, { size: 'lg' }),
        h('h2', {}, card.name),
        h('p', { class: 'muted' }, state.npc ? (card.role ?? '') : `${card.family} · Lv ${state.level}`),
        !state.npc && !state.context?.boss && state.level > game.player.level ? h('p', { class: 'muted small', id: 'talk-too-strong' }, 'Too strong to join you yet.') : null,
        face,
        demandBox,
        fieldNoteTexts(game.player, card).length
          ? h('details', { class: 'talk-notes', id: 'talk-notes' }, h('summary', {}, 'Your field notes'),
            h('ul', {}, fieldNoteTexts(game.player, card).map((n) => h('li', {}, n))))
          : null),
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
    if (!raw || typeof raw !== 'object') {
      // No usable answer: don't spend the player's turn or the demon's patience on it.
      view.setThinking(false);
      view.notice(`${state.card.name} didn't answer. Send your message again.`);
      view.restoreInput(text);
      return;
    }
    const info = applyTurn(state, game.player, text, raw, game.rng);
    if (info?.act === 'mug') bump('mugs');
    // Flirting only counts with someone it can count with (never a child or a flirt-n/a demon).
    if (info?.act === 'flirt' && state.card.adult !== false && state.card.flirt !== 'n/a') {
      bump('flirts');
      if (inStory()) game.run.story.flags[`flirted_${state.card.id}`] = true;
    }
    refreshStatus();
  } catch (e) {
    view.setThinking(false);
    if (ctl.signal.aborted || e?.name === 'AbortError' || e?.code === 'cancelled') {
      view.restoreInput(text);
      return;
    }
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

async function runTalk(id, hostile, { level = null, context = {}, onDone = null, inBattle = false } = {}) {
  const card = demonCard(id);
  const state = startTalk({ card, player: game.player, rng: game.rng, context: { hostile, ...context }, level });
  bump('talks');
  if (armorTalk(game.player)) bump('outfit_talks'); // talked while dressed for it (e.g. the Harness)
  const done = onDone ? (outcome) => {
    if (outcome === 'joined') { if (game.run?.stats) game.run.stats.recruits += 1; bump('recruits'); }
    if (['passed', 'left', 'fled'].includes(outcome)) bump('mercy');
    onDone(outcome);
  } : null;
  const view = talkView(state, { onDone: done, inBattle });
  view.onSend = (text) => brainTurn(state, text, view);
  if (state.speaksFirst) await brainTurn(state, null, view);
}

async function renderCredits() {
  const list = h('ul', { class: 'credits', id: 'credits-list' }, h('li', { class: 'muted' }, 'Loading...'));
  mount(root, 
    statusBar(),
    h('section', { class: 'panel' },
      h('h1', {}, 'Credits'),
      h('p', { class: 'muted' }, 'Every image, sound and song is public domain or CC0. Thank you to the museums and artists below.'),
      list,
      h('button', { type: 'button', id: 'back-hub', onclick: renderHub }, 'Back')));
  try {
    const res = await fetch('assets/credits.json');
    const credits = res.ok ? await res.json() : [];
    mount(list, ...(credits.length ? credits.map((c) => h('li', {},
      h('strong', {}, DEMONS[c.id]?.name ?? c.id.replace(/-/g, ' ')), ': ',
      `${c.title}${c.artist ? `, ${c.artist}` : ''}${c.date ? ` (${c.date})` : ''}. ${c.source}. ${c.license}. `,
      h('a', { href: c.sourceUrl, target: '_blank', rel: 'noopener' }, 'Source'))) : [h('li', { class: 'muted' }, 'No images yet; demons use placeholder frames.')]));
  } catch {
    mount(list, h('li', { class: 'muted' }, 'No images yet; demons use placeholder frames.'));
  }
}

export function startApp(el) {
  root = el;
  ui.root = el;
  ui.game = game;
  ui.statusBar = statusBar;
  ui.bump = bump;
  ui.noteFirstLeader = noteFirstLeader;
  ui.refreshStatus = refreshStatus;
  ui.goHub = () => backToMap();
  ui.startNpcTalk = runNpcTalk;
  ui.startFinale = renderFinale;
  ui.startEncounter = startEncounter;
  ui.save = saveGame;
  ui.autosave = autosave;
  ui.renderDemoComplete = renderDemoComplete;
  ui.openMenu = (name, arg = null) => {
    if (name === 'party') renderParty();
    else if (name === 'fusion') renderFusion();
    else if (name === 'compendium') renderCompendium();
    else if (name === 'shop') renderShop(() => backToMap(), '', arg ? { name: arg.name, keeper: arg.keeper, stock: arg.stock, priceMult: arg.priceMult, armor: arg.armor } : {});
    else if (name === 'items') renderItems();
    else if (name === 'journal') renderJournal();
  };
  ui.toggleSpeed = () => {
    game.battleDelay = game.battleDelay < 400 ? 650 : 250;
    try { localStorage.setItem('demongame-speed', String(game.battleDelay)); } catch { /* storage blocked */ }
  };
  try {
    const saved = Number(localStorage.getItem('demongame-speed'));
    if (saved && params.get('fast') !== '1') game.battleDelay = saved;
  } catch { /* storage blocked */ }
  game.brainReady = resolveBrain().then((b) => { setBrain(b); return b; });
  if (params.get('debug') === '1') window.__game = game; // e2e only
  if (params.get('screen') === 'hub') { game.player = newPlayer(); renderHub(); } else renderTitle();
}

// ---- Title, new game, dungeon encounters, demo end ----

function renderTitle(message = '') {
  mount(root, 
    h('section', { class: `title-screen${hasStory() ? ' story-title' : ''}`, id: 'title' },
      hasStory() ? h('img', { class: 'title-art', src: 'assets/title/covenant.webp', alt: '' }) : null,
      h('h1', {}, hasStory() ? (BIBLE?.title ?? 'The Flood Ward') : 'DemonGame'),
      h('p', { class: 'muted' }, hasStory() ? 'A DemonGame prototype. Talk, fight, fuse, and decide.' : 'A gameplay prototype. Talk, fight, fuse, and go down.'),
      message ? h('p', { class: 'notice' }, message) : null,
      h('div', { class: 'actions' },
        h('button', { type: 'button', id: 'title-new', onclick: newGame }, 'New game'),
        h('button', { type: 'button', id: 'title-continue', class: 'secondary', onclick: () => doLoad(true) }, 'Continue'),
        DEBUG ? h('button', { type: 'button', id: 'title-test', class: 'secondary', onclick: () => { game.run = null; game.player = newPlayer(); renderHub(); } }, 'Test rooms') : null,
        h('button', { type: 'button', id: 'title-credits', class: 'link', onclick: renderCredits }, 'Credits')),
      h('span', { class: 'chips-right' }, soundChip(), brainChip()),
      h('details', { class: 'howto panel' },
        h('summary', {}, 'How to play'),
        h('ul', {},
          h('li', {}, 'Move with the arrow keys, WASD or the on-screen pad. Demons ambush you as you walk.'),
          h('li', {}, 'Talk: type anything. Words in "quotes" are what you say; everything else is what you do. There are no menus — flatter, flirt, bribe, beg, threaten, mug or walk away. Each demon reacts in his own way, and what you learn goes into your field notes.'),
          h('li', {}, 'Fight: each side gets one ◆ per member. Hitting a weakness or landing a critical turns a ◆ into a ◇ (a free extra action). Misses and nulls cost two; an absorbed or repelled hit ends your turn. Pass hands the turn to the next demon for half a ◆.'),
          h('li', {}, 'Your demons grow up to their prime level, then slow down. Fuse two into something new; results above your level stay hidden as ???. Armor from shops sets your own weaknesses.'),
          h('li', {}, 'Springs (+) restore everyone. Save often. The first message to a demon asks you to let this page use Claude.')))));
}

function newGame() {
  setTimeout(() => autosave(), 0);
  game.player = newPlayer({ level: BIBLE?.startLevel ?? 6, gold: 800, items: { salve: 5, tonic: 1, cucumber: 2, honeycake: 1 } });
  if (hasStory()) {
    const startMap = BIBLE?.startMap ?? (MAPS.ward ? 'ward' : Object.keys(MAPS)[0]);
    game.run = { mode: 'story', world: newWorld(MAPS, startMap, game.rng), story: newStory(BIBLE), stats: { fights: 0, recruits: 0, steps: 0, startedAt: Date.now() } };
    renderWorld();
    return;
  }
  game.run = newRun(game.rng);
  renderDungeon(`You wake in ${FLOORS[0].name}. Demons live down here. Talk to them, or don't.`);
}

// A random encounter (or the boss) in the dungeon. onDone(message, result) returns to the map.
function startEncounter(group, { boss = null, onDone, talkNote = null, talkMoodBonus = 0, skipOpener = false, bossKey = false }) {
  const cards = group.map((g) => DEMONS[g.id]);
  const hostile = !boss && !talkNote && game.rng() < 0.25; // a demon placed in the story never rolls hostile after its scene
  const fightAll = (first, members = group) => {
    const party = [protagonistUnit(), ...partyDemons(game.player).map(ownedUnit)];
    const enemies = members.map((g, i) => demonUnit(g.id, 'enemy', i, g.level, boss));
    const name = members.length === 1 ? DEMONS[members[0].id].name : 'The demons';
    startBattle({
      party, enemies, first,
      talkContext: { ...(talkNote ? { note: talkNote } : {}), boss: !!boss, bossKey, moodBonus: talkMoodBonus },
      title: first === 'enemy' ? `${name} strike${members.length === 1 ? 's' : ''} first!` : boss ? `${name}!` : 'Battle!',
      onEnd: (result, state) => {
        const lines = finishBattle(state, result);
        if (result === 'lose') { renderGameOver(); return; }
        if (result === 'escaped') { onDone('You got away.'); return; }
        renderResults(lines, () => onDone('', boss ? 'cleared' : 'won', 'fight'));
      },
    });
  };
  const talkTo = (i) => {
    const g = group[i];
    runTalk(g.id, hostile, {
      level: g.level,
      context: { ...(talkNote ? { note: talkNote } : {}), boss: !!boss, moodBonus: talkMoodBonus, skipOpener, bossKey },
      onDone: (outcome) => {
        if (outcome.startsWith('fight')) { fightAll(outcome === 'fight_demon_first' ? 'enemy' : 'player'); return; }
        if (outcome === 'player_left') { onDone('You slip away.'); return; }
        const rest = group.filter((_, j) => j !== i);
        if (boss) { onDone('', 'cleared', 'talk'); return; }
        if (rest.length) { fightAll('player', rest); return; }
        onDone({ joined: `${cards[i].name} joined you.`, passed: `${cards[i].name} let you pass.`, left: `${cards[i].name} left.`, fled: `${cards[i].name} ran off.` }[outcome] ?? '', outcome, 'talk', g.level);
      },
    });
  };
  const escape = () => {
    if (tryEscape(game.rng)) { bump('fled'); onDone('You got away.'); }
    else fightAll('enemy');
  };
  mount(root, 
    statusBar(),
    h('section', { class: 'encounter', id: 'encounter' },
      h('div', { class: 'group' }, cards.map((c, i) => h('figure', { class: 'enc-member' }, portrait(c, { size: group.length > 1 ? 'sm' : 'lg' }),
        h('figcaption', {}, `${c.name} · Lv ${group[i].level}`),
        !boss && group[i].level > game.player.level ? h('p', { class: 'warn small' }, 'Too strong to join you yet') : null))),
      h('h1', {}, boss ? `${cards[0].name} blocks the way!` : group.length > 1 ? 'Demons appear!' : `${cards[0].name} appears!`),
      hostile ? h('p', { class: 'warn' }, 'They look ready for a fight.') : null,
      h('div', { class: 'actions wrap' },
        ...cards.map((c, i) => h('button', { type: 'button', id: `enc-talk-${i}`, class: i ? 'secondary' : '', onclick: () => talkTo(i) }, group.length > 1 ? `Talk to ${c.name}` : 'Talk')),
        h('button', { type: 'button', id: 'enc-fight', class: 'secondary', onclick: () => fightAll('player') }, 'Fight'),
        boss ? null : h('button', { type: 'button', id: 'enc-escape', class: 'secondary', onclick: escape }, 'Escape'))));
}

function renderDemoComplete() {
  const r = game.run;
  const mins = Math.max(1, Math.round((Date.now() - r.stats.startedAt) / 60000));
  mount(root, 
    statusBar(),
    h('section', { class: 'title-screen', id: 'demo-complete' },
      h('h1', {}, 'The way is clear.'),
      h('p', {}, 'That is the end of the prototype dungeon.'),
      h('ul', { class: 'results-list' },
        h('li', {}, `About ${mins} minutes, ${r.stats.steps} steps`),
        h('li', {}, `${r.stats.fights} battles, ${r.stats.recruits} demons recruited`),
        h('li', {}, `You are level ${game.player.level} with ${game.player.stock.length} demons`)),
      h('div', { class: 'actions' },
        h('button', { type: 'button', id: 'demo-keep', onclick: () => renderDungeon('You can keep exploring.') }, 'Keep exploring'),
        h('button', { type: 'button', id: 'demo-title', class: 'secondary', onclick: renderTitle }, 'Title'))));
}

// ---- Story mode: free-form NPC talk and the chapter-end decision ----

async function npcTurn(state, text, view) {
  const story = game.run.story;
  const ctl = new AbortController();
  view.onStop = () => ctl.abort();
  view.setThinking(true, text);
  let raw;
  try {
    raw = game.sample && game.brainKind === 'live'
      ? await game.sample.json(buildNpcPrompt(state, story, BIBLE, text, game.player), { cache: false, signal: ctl.signal })
      : mockNpcRespond(state, story, BIBLE, text);
  } catch (e) {
    view.setThinking(false);
    if (ctl.signal.aborted || e?.name === 'AbortError' || e?.code === 'cancelled') { view.restoreInput(text); return; }
    if (isPermanentSampleError(e?.code)) { setBrain(createMockBrain()); return npcTurn(state, text, view); }
    view.notice(sampleErrorCopy(e?.code) || 'Something went wrong. Try again.');
    view.restoreInput(text);
    return;
  }
  view.setThinking(false);
  if (!raw || typeof raw !== 'object') { view.notice(`${state.card.name} didn't answer. Say it again.`); view.restoreInput(text); return; }
  applyNpcTurn(state, story, BIBLE, text, raw, game.player);
  view.refresh();
}

// The first faction leader (Ines, Teo, Hester, Dario) the player walks up to: a hidden meter NPCs and the ending read.
function noteFirstLeader(npcId) {
  const story = game.run?.story;
  const leader = (BIBLE?.npcs ?? []).find((n) => n.id === npcId && n.faction && n.faction !== 'none');
  if (!story || !leader || Object.keys(story.flags).some((f) => f.startsWith('first_talk_'))) return;
  story.flags[`first_talk_${npcId}`] = true;
}

function runNpcTalk(npcId) {
  const card = NPC_CARDS[npcId];
  const story = game.run.story;
  noteFirstLeader(npcId);
  (story.heard ||= {})[card.name.split(' ')[0]] = true;
  const state = startNpcTalk({ card, story, rng: game.rng });
  const view = talkView(state, { onDone: () => renderWorld() });
  view.onSend = (text) => npcTurn(state, text, view);
}

// The lines of the finale scene chain as they played (requires applied), for the director to continue from.
function finaleLines(story) {
  const out = [];
  let id = BIBLE?.finale?.scene ?? 'finale_intro';
  for (let guard = 0; id && SCENES[id] && guard < 6; guard++) {
    for (const l of SCENES[id].lines ?? []) if (!l.requires || meets(story, l.requires)) out.push(`${l.speaker ? `${l.speaker}: ` : ''}${l.text}`);
    id = SCENES[id].next;
  }
  return out;
}

function renderFinale() {
  const story = game.run.story;
  const box = h('div', { class: 'dlg finale-dlg', id: 'dlg', hidden: true });
  const area = h('section', { class: 'panel finale', id: 'finale' });
  mount(root, statusBar(), area, box);
  const ask = () => {
    const input = h('textarea', { id: 'finale-input', rows: 4, maxlength: 2000, placeholder: 'In your own words: what do you do?' });
    const go = h('button', { type: 'button', id: 'finale-go' }, 'Decide');
    const note = h('p', { class: 'muted', id: 'finale-note' }, '');
    mount(area, h('h1', {}, BIBLE?.finale?.question ?? BIBLE?.finalePrompt ?? 'What do you do?'), h('p', { class: 'muted' }, 'There are no wrong answers here, only costs. Say it the way you mean it.'), input, go, note);
    input.focus();
    go.addEventListener('click', async () => {
      const decision = input.value.trim();
      if (!decision) return;
      go.disabled = true;
      input.disabled = true;
      note.textContent = 'The water is rising...';
      let raw = null;
      try {
        raw = game.sample && game.brainKind === 'live'
          ? await game.sample.json(buildDirectorPrompt(BIBLE, story, decision, { shown: finaleLines(story) }), { cache: false })
          : mockDirector(BIBLE, story, decision);
      } catch (e) {
        raw = mockDirector(BIBLE, story, decision);
      }
      const end = resolveFinale(BIBLE, story, decision, raw);
      story.log.push({ choice: `Final decision: ${decision}` });
      story.ending = end.outcome?.id ?? null;
      renderEnding(end, decision);
    });
  };
  const intro = BIBLE?.finale?.scene ?? 'finale_intro';
  if (SCENES[intro] && !story.seen.includes(intro)) {
    box.hidden = false;
    playScene(box, SCENES, story, intro, () => { box.hidden = true; ask(); }, { player: game.player });
  } else ask();
}

function renderEnding(end, decision) {
  const story = game.run.story;
  const o = end.outcome ?? {};
  const d = endingDetails(BIBLE, story, o);
  const npcName = (id) => NPC_CARDS[id]?.name ?? (BIBLE?.npcs ?? []).find((n) => n.id === id)?.name ?? DEMONS[id]?.name ?? id;
  play('levelup', 0.4);
  music('ward');
  mount(root, 
    h('section', { class: 'title-screen ending', id: 'ending' },
      h('p', { class: 'muted' }, 'You said:'),
      h('blockquote', { class: 'decision' }, decision),
      h('h1', {}, o.title ?? 'The water rises'),
      ...String(end.narration).split(/\n+/).map((para) => h('p', { class: 'ending-text' }, para)),
      d.verdict ? h('p', { class: 'verdict', id: 'verdict' }, d.verdict) : null,
      d.fates.length ? h('section', { class: 'fates-wrap' }, h('h2', {}, 'What became of them'),
        h('ul', { class: 'fates' }, d.fates.map((f) => h('li', {}, h('strong', {}, npcName(f.who)), ` — ${f.text ?? f.fate ?? ''}`)))) : null,
      end.reflection ? h('p', { class: 'reflection', id: 'reflection' }, end.reflection) : null,
      d.reflections.length ? h('section', { class: 'reflections' }, h('h2', {}, 'What your choices say about you'),
        ...d.reflections.map((t) => h('p', { class: 'reflection' }, t))) : null,
      h('ul', { class: 'record' }, recordLines(story, game.player, npcName).map((l) => h('li', {}, l))),
      d.coda.length ? h('section', { class: 'coda', id: 'coda' }, ...d.coda.map((t) => h('p', {}, t))) : null,
      h('p', { class: 'muted' }, BIBLE?.endText ?? 'End of the prologue.'),
      h('div', { class: 'actions' },
        h('button', { type: 'button', id: 'ending-title', onclick: () => renderTitle() }, 'Title'))));
}
