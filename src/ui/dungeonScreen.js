// Dungeon exploration screen: map, movement (keys or D-pad), and events (encounters, treasure, spring,
// shop, stairs, boss). Hands encounters back to the app through ui hooks.
import { h, mount } from './dom.js';
import { ui } from './context.js';
import { drawMap, reveal } from './mapRenderer.js';
import { move, startFloor } from '../dungeon/explore.js';
import { openTreasure, useSpring, clearBoss } from '../dungeon/events.js';
import floors from '../data/dungeon/floors.json' with { type: 'json' };

export const FLOORS = floors;

export function newRun(rng) {
  return {
    floorIndex: 0,
    ex: startFloor(floors[0], rng),
    opened: {},
    seen: {},
    bossDefeated: false,
    stats: { fights: 0, recruits: 0, steps: 0, startedAt: Date.now() },
    complete: false,
  };
}

let keyHandler = null;

export function renderDungeon(message = '') {
  const { game } = ui;
  const run = game.run;
  const floor = floors[run.floorIndex];
  const seen = new Set(run.seen[floor.id] || []);
  const opened = (run.opened[floor.id] ||= []);
  reveal(floor, run.ex, seen);
  run.seen[floor.id] = [...seen];

  const canvas = h('canvas', { id: 'map', class: 'map', role: 'img', 'aria-label': `Map of ${floor.name}` });
  const msg = h('p', { id: 'dungeon-msg', class: 'notice', 'aria-live': 'polite' }, message);
  const step = (dir) => {
    if (ui.blocked) return;
    const r = move(floor, run.ex, dir, game.rng);
    if (!r.moved) return;
    run.stats.steps += 1;
    reveal(floor, run.ex, seen);
    run.seen[floor.id] = [...seen];
    if (!r.event) { msg.textContent = ''; drawMap(canvas, floor, run.ex, seen, opened); return; }
    handleEvent(r.event, floor);
  };
  const pad = h('div', { class: 'dpad', 'aria-label': 'Move' },
    h('button', { type: 'button', class: 'pad up', id: 'move-up', 'aria-label': 'Up', onclick: () => step('up') }, '▲'),
    h('button', { type: 'button', class: 'pad left', id: 'move-left', 'aria-label': 'Left', onclick: () => step('left') }, '◀'),
    h('button', { type: 'button', class: 'pad right', id: 'move-right', 'aria-label': 'Right', onclick: () => step('right') }, '▶'),
    h('button', { type: 'button', class: 'pad down', id: 'move-down', 'aria-label': 'Down', onclick: () => step('down') }, '▼'));

  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = (e) => {
    if (!document.body.contains(canvas)) { document.removeEventListener('keydown', keyHandler); keyHandler = null; return; }
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    const dir = map[e.key];
    if (dir && !e.target.matches('input, textarea')) { e.preventDefault(); step(dir); }
  };
  document.addEventListener('keydown', keyHandler);

  mount(ui.root, 
    ui.statusBar(),
    h('div', { class: 'screen-head' },
      h('h1', {}, `${floor.name}`, h('span', { class: 'muted floor-no' }, ` · floor ${run.floorIndex + 1} of ${floors.length}`)),
      h('div', { class: 'actions wrap' },
        h('button', { type: 'button', class: 'secondary mini', id: 'd-party', onclick: () => ui.openMenu('party') }, 'Party'),
        h('button', { type: 'button', class: 'secondary mini', id: 'd-items', onclick: () => ui.openMenu('items') }, 'Items'),
        h('button', { type: 'button', class: 'secondary mini', id: 'd-fusion', onclick: () => ui.openMenu('fusion') }, 'Fusion'),
        h('button', { type: 'button', class: 'secondary mini', id: 'd-compendium', onclick: () => ui.openMenu('compendium') }, 'Compendium'),
        h('button', { type: 'button', class: 'secondary mini', id: 'd-save', onclick: async () => { const where = await ui.save(); renderDungeon(where ? 'Saved.' : 'Could not save here.'); } }, 'Save'),
        h('button', { type: 'button', class: 'secondary mini', id: 'd-speed', onclick: () => { ui.toggleSpeed(); renderDungeon(`Battle speed: ${ui.game.battleDelay < 400 ? 'fast' : 'normal'}.`); } }, `Speed: ${ui.game.battleDelay < 400 ? 'fast' : 'normal'}`))),
    h('section', { class: 'dungeon' }, canvas, h('div', { class: 'dungeon-side' }, msg, pad,
      h('p', { class: 'muted hint' }, 'Arrow keys or WASD to move. ¤ treasure, + spring, $ shop, > stairs, ! something big.'))));
  drawMap(canvas, floor, run.ex, seen, opened);
}

function handleEvent(ev, floor) {
  const { game } = ui;
  const run = game.run;
  const p = game.player;
  switch (ev.type) {
    case 'encounter':
      ui.startEncounter(ev.group, { onDone: (msg) => renderDungeon(msg) });
      return;
    case 'treasure':
      renderDungeon(openTreasure(run, floor, ev.feature, p) ?? '');
      return;
    case 'heal':
      renderDungeon(useSpring(p));
      return;
    case 'shop':
      ui.openMenu('shop');
      return;
    case 'stairs':
      if (run.floorIndex < floors.length - 1) {
        run.floorIndex += 1;
        run.ex = startFloor(floors[run.floorIndex], game.rng);
        renderDungeon(`You go down to ${floors[run.floorIndex].name}.`);
      } else {
        renderDungeon('The way back up. (This is the deepest floor.)');
      }
      return;
    case 'boss':
      ui.startEncounter([{ id: ev.feature.boss.id, level: ev.feature.boss.level }], {
        boss: ev.feature.boss,
        onDone: (msg, result) => {
          if (result === 'cleared') { clearBoss(run); ui.renderDemoComplete(); return; }
          // Not cleared: step back so you don't stand on the boss tile.
          renderDungeon(msg);
        },
      });
      return;
    default:
      renderDungeon();
  }
}
