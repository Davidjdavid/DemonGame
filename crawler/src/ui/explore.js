// Exploration screen: keyboard movement with smooth tweens, door/lock/shortcut feedback, features, automap.
import { cellAt, DIR_NAMES, findFeature, edgeAt } from '../world/floor.js';
import { tryMove, arrive } from '../world/move.js';
import { visit, coverage } from '../world/mapMemory.js';
import { floorState, addItem } from '../game/state.js';
import { itemName } from '../data/items.js';
import { createView } from './view3d.js';
import { drawMap } from './automap.js';
import { el, clear } from './dom.js';
import { renderFieldMenu } from './fieldMenu.js';
import { maxOf, partyMembers } from '../game/fieldItems.js';
import { MONSTERS } from '../data/monsters.js';

const KEYS = {
  KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyQ: 'turnL', KeyE: 'turnR',
};
const TRAVEL = { fwd: 0, right: 1, back: 2, left: 3 }; // offset from facing

export function startExplore(app, game, { getFloor, fast = false, hooks = {} }) {
  clear(app);
  const viewport = el('div', { class: 'viewport' });
  const hud = el('div', { class: 'hud' });
  const floorLabel = el('div', { class: 'floor-label' });
  const compass = el('div', { class: 'compass' });
  const msg = el('div', { class: 'msg' });
  const help = el('div', { class: 'help' }, 'WASD / arrows: move & strafe · Q/E: turn · M: map · Esc: menu');
  const mini = el('canvas', { class: 'minimap', width: 180, height: 180 });
  const partyStrip = el('div', { class: 'party-strip' });
  const overlay = el('div', { class: 'overlay', hidden: true });
  const prompt = el('div', { class: 'prompt', hidden: true });
  hud.append(floorLabel, compass, mini, partyStrip, msg, help);
  app.append(viewport, hud, overlay, prompt);
  const view = createView(viewport, { fast });

  let floor = null;
  let fs = null; // floor state { flags, mem }
  let busy = false;
  let modal = null; // 'map' | 'prompt' | 'menu' | null
  const held = [];
  let buffered = null;
  let msgTimer = 0;
  let lastArea = null;
  let dead = false;

  const pos = game.pos;

  function say(text, ms = 2600) {
    msg.textContent = text;
    msg.classList.add('show');
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => msg.classList.remove('show'), fast ? 50 : ms);
  }

  function updateHud() {
    const cell = cellAt(floor, pos.x, pos.y);
    const area = cell.areaName ? ` — ${cell.areaName}` : '';
    floorLabel.textContent = `${floor.name}${cell.dark ? ' — darkness' : area}`;
    const d = pos.dir;
    compass.innerHTML = '';
    compass.append(
      el('span', { class: 'dim' }, DIR_NAMES[(d + 3) % 4]),
      el('b', {}, DIR_NAMES[d]),
      el('span', { class: 'dim' }, DIR_NAMES[(d + 1) % 4]),
    );
    clear(partyStrip);
    for (const who of partyMembers(game)) {
      const mx = maxOf(game, who);
      partyStrip.append(el('div', { class: `ps${who.hp <= 0 ? ' dead' : ''}` },
        el('span', { class: 'ps-name' }, who === game.hero ? `${game.hero.name} Lv ${who.level}${game.hero.points ? ' ★' : ''}` : `${MONSTERS[who.type].name} Lv ${who.level}`),
        el('div', { class: 'bar hp' }, el('i', { style: { width: `${(100 * who.hp) / mx.maxHp}%` } }), el('span', {}, `${who.hp}/${mx.maxHp}`)),
        el('div', { class: 'bar mp' }, el('i', { style: { width: `${(100 * who.mp) / Math.max(1, mx.maxMp)}%` } }), el('span', {}, `${who.mp}/${mx.maxMp}`))));
    }
    mini.hidden = !game.settings.minimap;
    if (game.settings.minimap) drawMap(mini, floor, { mem: fs.mem, flags: fs.flags, pos, inDark: cell.dark, window: 4 });
    if (cell.areaName && cell.areaName !== lastArea && !cell.dark) say(cell.areaName, 1400);
    lastArea = cell.areaName;
  }

  function enterFloor(id, via = null) {
    floor = getFloor(id);
    fs = floorState(game, id);
    pos.floor = id;
    if (via) {
      // Arrive on the matching stairs (came up -> stand on this floor's down stairs, and vice versa).
      const want = via === 'up' ? 'down' : via === 'down' ? 'up' : null;
      const spot = want && findFeature(floor, (f) => f.type === 'stairs' && f.dir === want)[0];
      const [x, y] = spot ? [spot.x, spot.y] : floor.start;
      pos.x = x;
      pos.y = y;
      pos.dir = facingOut(x, y);
    }
    view.build(floor, fs.flags);
    view.setPose(pos.x, pos.y, pos.dir);
    visit(fs.mem, floor, pos.x, pos.y);
    view.setDark(cellAt(floor, pos.x, pos.y).dark);
    lastArea = null;
    updateHud();
    say(floor.name, 1800);
    hooks.onFloor?.(floor);
  }

  function facingOut(x, y) {
    for (const d of [0, 1, 2, 3]) if (edgeAt(floor, x, y, d).type !== 'wall') return d;
    return 0;
  }

  async function perform(action) {
    if (action === 'turnL' || action === 'turnR') {
      const delta = action === 'turnL' ? -1 : 1;
      pos.dir = (pos.dir + delta + 4) % 4;
      updateHud();
      await view.turn(delta);
      return;
    }
    const dir = (pos.dir + TRAVEL[action]) % 4;
    const r = tryMove(floor, fs.flags, game.inv, pos.x, pos.y, dir);
    if (!r.ok) {
      if (r.msg) say(r.msg);
      await view.bump(dir);
      return;
    }
    if (r.door) view.openDoor(r.edge.id);
    if (r.opened || r.unlocked) { view.refresh(); say(r.msg); }
    pos.x = r.x;
    pos.y = r.y;
    game.steps++;
    await view.moveTo(r.x, r.y, r.door ? 230 : 180);
    await afterArrive();
  }

  async function afterArrive() {
    const a = arrive(floor, fs.flags, pos.x, pos.y);
    for (const m of a.moves) {
      if (m.kind === 'warp') {
        view.warpFlash();
        say('A warp tile! You are somewhere else.');
        pos.x = m.x; pos.y = m.y;
        view.setPose(pos.x, pos.y, pos.dir);
        await new Promise((r) => setTimeout(r, fast ? 0 : 220));
      } else {
        if (m === a.moves[0]) say('The floor launches you forward!');
        pos.x = m.x; pos.y = m.y;
        visit(fs.mem, floor, pos.x, pos.y);
        await view.moveTo(m.x, m.y, 85, (t) => t);
      }
    }
    const cell = cellAt(floor, pos.x, pos.y);
    visit(fs.mem, floor, pos.x, pos.y);
    view.setDark(cell.dark);
    updateHud();
    if (cell.feature) await onFeature(cell);
    if (hooks.onStep && !dead) {
      modal = 'ext';
      try { await hooks.onStep(cell); } finally { if (!dead) { modal = null; updateHud(); } }
    }
  }

  async function onFeature(cell) {
    const f = cell.feature;
    switch (f.type) {
      case 'chest':
        if (fs.flags.chests[f.id]) return;
        fs.flags.chests[f.id] = true;
        addItem(game, f.item, f.count || 1);
        view.build(floor, fs.flags);
        view.setPose(pos.x, pos.y, pos.dir);
        say(`Found ${f.count > 1 ? `${f.count}× ` : ''}${itemName(f.item)}!`);
        return;
      case 'stairs': {
        const target = floor.src.links?.[f.dir];
        if (!target) { say(`Stairs ${f.dir}. (Not connected yet.)`); return; }
        const next = getFloor(target);
        const ok = await ask(`Stairs ${f.dir} to ${next.name}.`, [`Go ${f.dir}`, 'Stay']);
        if (ok === 0) enterFloor(target, f.dir);
        return;
      }
      case 'save': await external(() => hooks.onSavePoint?.()); return;
      case 'service': await external(() => hooks.onService?.(f)); updateHud(); return;
      case 'exit': say('The entrance hall. The spire rises above you.'); return;
      case 'heal':
        for (const who of partyMembers(game)) { const mx = maxOf(game, who); who.hp = mx.maxHp; who.mp = mx.maxMp; }
        updateHud();
        say('A healing spring. Your party is fully restored.');
        return;
      case 'warn': say('A heavy presence lies beyond. Prepare yourself.'); return;
      case 'boss':
        if (game.bossDown) { say('The Warden is gone. The spire is quiet.'); return; }
        await external(() => hooks.onBoss?.());
        updateHud();
        return;
      default:
        if (f.label) say(f.label);
    }
  }

  async function external(fn) {
    modal = 'ext';
    try { await fn(); } finally { if (!dead) modal = null; }
  }

  function ask(text, options) {
    modal = 'prompt';
    clear(prompt);
    prompt.hidden = false;
    return new Promise((resolve) => {
      const done = (i) => { prompt.hidden = true; modal = null; prompt.onkey = null; resolve(i); };
      prompt.append(el('p', {}, text));
      const row = el('div', { class: 'row' });
      options.forEach((o, i) => row.append(el('button', { onclick: () => done(i), 'data-i': i }, `${i === 0 ? '⏎ ' : ''}${o}`)));
      prompt.append(row);
      prompt.onkey = (e) => {
        if (e.code === 'Enter' || e.code === 'Space') done(0);
        else if (e.code === 'Escape') done(options.length - 1);
      };
    });
  }

  function openMap() {
    modal = 'map';
    clear(overlay);
    overlay.hidden = false;
    const cell = cellAt(floor, pos.x, pos.y);
    const cv = el('canvas', { class: 'bigmap', width: Math.min(900, window.innerWidth - 40), height: Math.min(900, window.innerHeight - 110) });
    overlay.append(
      el('div', { class: 'map-head' }, `${floor.name} — mapped ${Math.round(coverage(fs.mem, floor) * 100)}% · facing ${DIR_NAMES[pos.dir]}`),
      cv,
      el('div', { class: 'map-legend' },
        '▲▼ stairs · ■ chest · ◯ warp · → launcher · door: brown · lock: gold · one-way: blue · shortcut: green · M / Esc: close'),
    );
    drawMap(cv, floor, { mem: fs.mem, flags: fs.flags, pos, inDark: cell.dark });
    overlay.onclick = closeOverlay;
  }

  function openMenu(tab = 'party') {
    modal = 'menu';
    clear(overlay);
    overlay.hidden = false;
    const box = el('div', { class: 'menu' });
    overlay.append(box);
    renderFieldMenu(box, game, { tab, onClose: closeOverlay, onChange: updateHud, onExit: () => { closeOverlay(); hooks.onExitCharm?.(); } });
    overlay.onclick = (e) => { if (e.target === overlay) closeOverlay(); };
  }

  function closeOverlay() {
    overlay.hidden = true;
    overlay.onclick = null;
    modal = null;
  }

  async function pump() {
    if (busy) return;
    busy = true;
    try {
      for (;;) {
        if (modal) break;
        let next = buffered;
        buffered = null;
        if (!next) {
          // Let key-up events land before repeating a held key (matters when animations are instant).
          await new Promise((r) => setTimeout(r, 0));
          next = buffered ?? held[held.length - 1];
          buffered = null;
        }
        if (!next || modal || dead) break;
        await perform(next);
      }
    } finally {
      busy = false;
    }
  }

  function onKeyDown(e) {
    if (dead || modal === 'ext') return;
    if (modal === 'prompt') { prompt.onkey?.(e); e.preventDefault(); return; }
    if (e.code === 'KeyM') { if (modal === 'map') closeOverlay(); else if (!modal) openMap(); e.preventDefault(); return; }
    if (e.code === 'Escape') { if (modal) closeOverlay(); else openMenu(); e.preventDefault(); return; }
    if (modal) return;
    const a = KEYS[e.code];
    if (!a) return;
    e.preventDefault();
    if (e.repeat) return;
    if (!held.includes(a)) held.push(a);
    buffered = a;
    pump();
  }
  function onKeyUp(e) {
    const a = KEYS[e.code];
    const i = held.indexOf(a);
    if (i >= 0) held.splice(i, 1);
  }
  const onBlur = () => { held.length = 0; };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  enterFloor(pos.floor);

  return {
    floor: () => floor,
    // Test hook: perform one action and wait for it (bypasses key repeat timing).
    // Test hook: perform one action; resolves when it's done or a panel/prompt/battle has opened.
    act: async (a) => { buffered = a; pump(); await new Promise((r) => setTimeout(r, 0)); while (busy && !modal) await new Promise((r) => setTimeout(r, 5)); },
    refresh: () => { if (!dead) updateHud(); },
    enterFloor: (id, via = null) => {
      if (via === 'start') { const f = getFloor(id); [pos.x, pos.y, pos.dir] = f.start; }
      enterFloor(id, via === 'start' ? null : via);
    },
    say,
    destroy() {
      dead = true;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      view.dispose();
    },
    modal: () => modal,
  };
}
