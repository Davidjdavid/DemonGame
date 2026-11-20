// Story-mode world screen: the map (canvas), movement with a short tween, and everything you can bump into.
// Encounters, NPC free-form talk, shops, saves and the finale are handed to the app through `ui` hooks.
import { h, mount } from './dom.js';
import { ui } from './context.js';
import { drawWorld, loadSheets, spriteCanvas } from './worldRenderer.js';
import { playScene, showMessage } from './dialogue.js';
import { step, travel, unlockDoor, pullSwitch, openChest, tileAt, visibleEntities } from '../world/runtime.js';
import { setFlag, hasFlag, meets, learnFact } from '../story/state.js';
import { useSpring } from '../dungeon/events.js';
import { play, music } from './sfx.js';
import { addItem } from '../game/player.js';
import { ITEMS, DEMONS } from '../data/index.js';
import { partyDemons } from '../game/demons.js';
import { demonVitals } from '../game/fieldItems.js';
import { MAPS } from '../data/maps/index.js';
import { SCENES, NPC_CARDS, BIBLE } from '../data/story/index.js';
import { activeObjectives } from '../story/objectives.js';

let keyHandler = null;
let anim = null;

// Compact HP/MP list for you and the active party, shown beside the map.
function partyPanel() {
  const p = ui.game.player;
  const rows = [{ name: 'You', hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp },
    ...partyDemons(p).map((d) => ({ name: DEMONS[d.id].name, lv: d.level, ...demonVitals(d) }))];
  return h('ul', { class: 'party-mini', id: 'party-mini' }, rows.map((r) => h('li', {},
    h('span', {}, r.name, r.lv ? h('span', { class: 'muted' }, ` ${r.lv}`) : null),
    h('span', { class: `num${r.hp <= 0 ? ' warn' : ''}` }, r.hp <= 0 ? 'down (revive)' : `${r.hp}/${r.maxHp}`),
    h('div', { class: 'bar hp' }, h('span', { style: `width:${Math.max(0, Math.round((100 * r.hp) / r.maxHp))}%` })))));
}

export function hasStory() {
  return Object.keys(MAPS).length > 0 && !!SCENES.intro;
}

export function renderWorld(message = '') {
  const { game } = ui;
  const run = game.run;
  const { world, story } = run;
  const map = MAPS[world.mapId];
  music(map.music ?? (map.tileset === 'town' ? 'ward' : 'tunnels'));
  const canvas = h('canvas', { id: 'map', class: 'map world-map', role: 'img', 'aria-label': `Map of ${map.name}` });
  const box = h('div', { class: 'dlg', id: 'dlg', hidden: true, 'aria-live': 'polite' });
  const msg = h('p', { id: 'world-msg', class: 'notice', 'aria-live': 'polite' }, message);
  const cam = { x: world.x, y: world.y };
  let moving = false;
  const busy = () => moving || !box.hidden;
  const npcSprite = (e) => NPC_CARDS[e.npcId]?.portrait ?? e.sprite ?? 'npc_1';
  const draw = () => drawWorld(canvas, map, world, story, cam, { npcSprite, moving });
  // Dialogue portraits: pixel sprites for people, museum art for demons.
  const SPEAKER_DEMON = { Kettle: 'tanuki' };
  const portraitFor = (speaker) => {
    const npc = Object.values(NPC_CARDS).find((c) => c.name === speaker || c.name?.split(' ')[0] === speaker);
    if (npc?.portrait) { const c = spriteCanvas(npc.portrait, 72); if (c) return h('div', { class: 'dlg-portrait' }, c); }
    const demon = DEMONS[SPEAKER_DEMON[speaker]] ?? Object.values(DEMONS).find((d) => d.name === speaker);
    if (demon?.image) return h('div', { class: 'dlg-portrait' }, h('img', { src: demon.image, alt: '' }));
    return null;
  };

  // Story beats are checkpoints: Retry after a game over comes back to the last one (with keys, switches, flags).
  const scene = (id, after) => playScene(box, SCENES, story, id, (last) => { ui.refreshStatus?.(); ui.autosave?.(); draw(); after?.(last); }, { portraitFor, player: game.player });
  const say = (text, after) => { ui.refreshStatus?.(); showMessage(box, text, () => { draw(); after?.(); }); };

  const tweenTo = (done) => {
    const from = { ...cam };
    const t0 = performance.now();
    const dur = 110;
    moving = true;
    cancelAnimationFrame(anim);
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      cam.x = from.x + (world.x - from.x) * k;
      cam.y = from.y + (world.y - from.y) * k;
      draw();
      if (k < 1) anim = requestAnimationFrame(tick);
      else { moving = false; done?.(); }
    };
    anim = requestAnimationFrame(tick);
  };

  const interact = (e) => {
    switch (e.type) {
      case 'npc': {
        ui.noteFirstLeader?.(e.npcId);
        const extra = (e.scenes ?? []).find((s) => !story.seen.includes(s.scene) && meets(story, s.requires));
        if (e.scene && !story.seen.includes(e.scene)) { scene(e.scene, () => offerTalk(e)); return; }
        if (extra) { scene(extra.scene, () => offerTalk(e)); return; }
        offerTalk(e);
        return;
      }
      case 'chest': {
        const c = openChest(map, world, e);
        if (!c) { say('Empty.'); return; }
        play('chest');
        if (c.item) { addItem(game.player, c.item); say(`You found ${ITEMS[c.item]?.name ?? c.item}.`); } else { game.player.gold += c.gold ?? 0; say(`You found ${c.gold ?? 0} gold.`); }
        ui.autosave?.();
        return;
      }
      case 'door': {
        const r = unlockDoor(map, world, story, game.player, e);
        if (r.ok && !r.already) { play('door'); ui.autosave?.(); }
        if (r.ok && !r.already) say(r.usedKey ? `You unlock it with the ${ITEMS[r.usedKey]?.name ?? r.usedKey}.` : 'The door opens.');
        else if (!r.ok) say(r.reason);
        return;
      }
      case 'switch':
        if (pullSwitch(map, world, story, e)) {
          play('lever');
          ui.autosave?.();
          if (e.scene) scene(e.scene); else say(e.text ?? 'You pull the lever. Somewhere, water drains away.');
        } else say(e.doneText ?? 'It won\'t move any further.');
        return;
      case 'sign':
        // A sign can teach a fact (e.g. the river's name on the Sallow stones), so it ends up in the Journal.
        if (e.learn && !story.facts.includes(e.learn)) { learnFact(story, e.learn); say(`${e.text ?? '...'} (Journal)`); return; }
        say(e.text ?? '...');
        return;
      case 'spring':
        play('heal');
        renderWorld(useSpring(game.player));
        return;
      case 'shop':
        if (e.scene && !story.seen.includes(e.scene)) scene(e.scene, () => ui.openMenu('shop', e));
        else ui.openMenu('shop', e);
        return;
      case 'save':
        ui.save().then((where) => say(where ? 'Your progress is saved.' : 'Saving isn\'t available here.'));
        return;
      case 'demon': {
        // A demon placed on the map: its scene once, then the normal talk-or-fight. Any resolution sets its flag.
        const sceneText = (SCENES[e.scene]?.lines ?? []).filter((l) => !l.requires || meets(story, l.requires)).map((l) => `${l.speaker ? `${l.speaker}: ` : ''}${l.text}`).join(' / ');
        const encounter = () => ui.startEncounter([{ id: e.demon, level: e.level }], {
          talkNote: [e.talkNote, sceneText ? `Just before this conversation, in a scripted scene (already said; don't repeat it): ${sceneText}` : ''].filter(Boolean).join(' '),
          skipOpener: !!e.scene,
          onDone: (text, outcome) => {
            // Too strong to join and you talked: he stays put, so you can come back stronger.
            const stays = ['passed', 'left', 'player_left'].includes(outcome) && e.level > game.player.level;
            if (e.flag && !stays) setFlag(story, e.flag, true);
            // leftFlag: he walked off (not joined, not beaten), e.g. so Bel can miss her kettle and he can come back.
            if (e.leftFlag && !stays && ['passed', 'left', 'fled', 'player_left'].includes(outcome)) setFlag(story, e.leftFlag, true);
            if (e.joinFlag && outcome === 'joined') setFlag(story, e.joinFlag, true); // he came with you
            renderWorld(stays ? `${text} ${DEMONS[e.demon]?.name ?? 'He'} is still here. Come back when you're stronger.`.trim() : text);
          },
        });
        if (e.scene && !story.seen.includes(e.scene)) scene(e.scene, encounter);
        else encounter();
        return;
      }
      case 'boss':
        if (e.flag && hasFlag(story, e.flag)) { say(e.doneText ?? 'Only still water now.'); return; }
        const moods = (e.talkMood ?? []).filter((m) => meets(story, m.requires ?? {}));
        scene(e.scene ?? '_none', () => ui.startEncounter([{ id: e.demon, level: e.level }], {
          boss: { id: e.demon, level: e.level, hpMult: e.hpMult ?? 9, icons: e.icons ?? 3, dmgMult: e.dmgMult ?? 0.5 },
          talkNote: [e.talkNote, ...moods.map((m) => m.note)].filter(Boolean).join(' '),
          talkMoodBonus: moods.reduce((n, m) => n + (m.mood ?? 0), 0),
          bossKey: moods.some((m) => (m.mood ?? 0) > 0),
          skipOpener: !!e.scene,
          onDone: (text, result, how) => {
            if (result === 'cleared') {
              setFlag(story, e.flag ?? 'boss_cleared', true);
              if (how === 'fight' && e.winFlag) setFlag(story, e.winFlag, true);
              if (how === 'talk' && e.talkFlag) setFlag(story, e.talkFlag, true);
              renderWorld();
              const box2 = document.querySelector('#dlg');
              if (e.after && box2) playScene(box2, SCENES, story, e.after, () => (e.finale ? ui.startFinale() : renderWorld()), { portraitFor, player: game.player });
              else if (e.finale) ui.startFinale();
              return;
            }
            renderWorld(text);
          },
        }));
        return;
      default:
        say('...');
    }
  };

  // After a first scripted meeting: talk freely (Claude plays the NPC from the story bible) or leave.
  const offerTalk = (e) => {
    if (!e.talk || !NPC_CARDS[e.npcId]) return;
    if (e.showIf && !meets(story, e.showIf)) { draw(); return; } // he left in that scene (e.g. Pell going home)
    box.hidden = false;
    const card = NPC_CARDS[e.npcId];
    mount(box, h('div', { class: 'dlg-inner' }, h('div', { class: 'dlg-text' },
      h('p', { class: 'dlg-speaker' }, card.name),
      h('p', { class: 'dlg-line narration' }, `${card.name.split(' ')[0]} looks up as you come over.`),
      h('div', { class: 'dlg-choices' },
        h('button', { type: 'button', class: 'dlg-choice', id: 'npc-talk', onclick: () => { box.hidden = true; ui.startNpcTalk(e.npcId); } }, `Talk with ${card.name}`),
        h('button', { type: 'button', class: 'dlg-choice', id: 'npc-leave', onclick: () => { box.hidden = true; mount(box, ); draw(); } }, 'Leave')))));
    box.querySelector('#npc-talk').focus();
  };

  const go = (dir) => {
    if (busy()) return;
    world.playerLevel = game.player.level;
    const r = step(MAPS, world, story, dir, game.rng);
    if (r.moved && msg.textContent) msg.textContent = '';
    run.stats.steps += r.moved ? 1 : 0;
    const after = () => {
      const ev = r.event;
      if (!ev) return;
      if (ev.type === 'interact') interact(ev.entity);
      else if (ev.type === 'trigger') scene(ev.entity.scene);
      else if (ev.type === 'stairs') {
        travel(MAPS, world, ev.entity, game.rng);
        ui.autosave?.();
        renderWorld(ev.entity.text ?? '');
      } else if (ev.type === 'encounter') {
        play('encounter', 0.6);
        canvas.parentElement.classList.add('encounter-flash');
        moving = true;
        setTimeout(() => ui.startEncounter(ev.group, { onDone: (text) => renderWorld(text) }), 450);
      }
    };
    if (r.moved) tweenTo(after);
    else { draw(); after(); }
  };

  const pad = h('div', { class: 'dpad', 'aria-label': 'Move' },
    h('button', { type: 'button', class: 'pad up', id: 'move-up', 'aria-label': 'Up', onclick: () => go('up') }, '▲'),
    h('button', { type: 'button', class: 'pad left', id: 'move-left', 'aria-label': 'Left', onclick: () => go('left') }, '◀'),
    h('button', { type: 'button', class: 'pad right', id: 'move-right', 'aria-label': 'Right', onclick: () => go('right') }, '▶'),
    h('button', { type: 'button', class: 'pad down', id: 'move-down', 'aria-label': 'Down', onclick: () => go('down') }, '▼'));

  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = (ev) => {
    if (!document.body.contains(canvas)) { document.removeEventListener('keydown', keyHandler); keyHandler = null; return; }
    if (ev.target.matches?.('input, textarea')) return;
    const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }[ev.key];
    if (dir) { ev.preventDefault(); go(dir); }
  };
  document.addEventListener('keydown', keyHandler);

  mount(ui.root, 
    ui.statusBar(),
    h('div', { class: 'screen-head' },
      h('h1', {}, map.name),
      h('div', { class: 'actions wrap' },
        ...['journal', 'party', 'items', 'fusion', 'compendium'].map((m) => h('button', { type: 'button', class: 'secondary mini', id: `w-${m}`, onclick: () => ui.openMenu(m) }, m[0].toUpperCase() + m.slice(1))),
        h('button', { type: 'button', class: 'secondary mini', id: 'w-save', onclick: async () => { const where = await ui.save(); renderWorld(where ? 'Saved.' : 'Could not save here.'); } }, 'Save'))),
    h('section', { class: 'dungeon world' },
      h('div', { class: 'map-wrap' }, canvas, box),
      h('div', { class: 'dungeon-side' }, msg, partyPanel(),
        activeObjectives(BIBLE, story).length ? (() => { const o = activeObjectives(BIBLE, story).at(-1); return h('p', { class: 'objective', id: 'objective' }, h('span', { class: 'muted' }, 'On your mind: '), o.text, o.where && o.where !== world.mapId && MAPS[o.where] ? h('span', { class: 'muted' }, ` (${MAPS[o.where].name})`) : null); })() : null,
        pad, h('p', { class: 'muted hint' }, 'Arrow keys or WASD to move. Walk into people and things to interact. Enter or Space continues dialogue.'))));
  loadSheets().then(draw);
  draw();
  // For the AI playtest harness: an ASCII view of the map around the player.
  if (typeof window !== 'undefined' && window.__game) {
    window.__mapAscii = () => {
      const m = MAPS[world.mapId];
      const ents = visibleEntities(m, story);
      const rows = [];
      for (let y = Math.max(0, world.y - 7); y <= Math.min(m.height - 1, world.y + 7); y++) {
        let row = '';
        for (let x = Math.max(0, world.x - 12); x <= Math.min(m.width - 1, world.x + 12); x++) {
          const e = ents.find((q) => q.x === x && q.y === y && q.type !== 'trigger');
          row += x === world.x && y === world.y ? '@' : e ? ({ npc: 'N', chest: 'c', door: '+', switch: '/', stairs: '>', spring: 'S', shop: '$', save: '*', sign: '?', boss: 'B' }[e.type] ?? 'e') : tileAt(m, world, x, y);
        }
        rows.push(row);
      }
      const near = ents.filter((q) => Math.abs(q.x - world.x) + Math.abs(q.y - world.y) <= 12 && q.type !== 'trigger')
        .map((q) => `${q.type}${q.npcId ? `:${q.npcId}` : ''} at ${q.x},${q.y}`);
      return `MAP (@ you, N npc, c chest, + door, / switch, > stairs, S spring, $ shop, * save, ? sign, B boss; # wall, ~ deep water, , shallow, . floor):\n${rows.join('\n')}\nNEARBY: ${near.join('; ')}`;
    };
  }
  // The opening scene plays once at the start of a new game.
  if (!story.seen.includes('intro') && SCENES.intro) scene('intro');
  // A map's arrival beat plays the first time you arrive, wherever you step (not on one tile you might skip).
  else if (map.onEnter && SCENES[map.onEnter] && !story.seen.includes(map.onEnter)) scene(map.onEnter);
}
