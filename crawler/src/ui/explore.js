// Exploration screen: free first-person movement (default: WASD + mouse look with pointer lock) or classic grid
// steps, door/lock/shortcut feedback, features, automap. Game logic stays per cell: crossing into a cell runs it.
import { cellAt, DIR_NAMES, findFeature, edgeAt } from '../world/floor.js';
import { tryMove, arrive, keyName } from '../world/move.js';
import { slide, cellOf, forwardOf, dirOfYaw, yawOfDir, edgeBlock } from '../world/freeMove.js';
import { visit, coverage, look } from '../world/mapMemory.js';
import { floorState, addItem } from '../game/state.js';
import { itemName } from '../data/items.js';
import { createView } from './view3d.js';
import { drawMap } from './automap.js';
import { el, clear } from './dom.js';
import { renderFieldMenu } from './fieldMenu.js';
import { maxOf, partyMembers, healPartyWithSkills, stepRegen } from '../game/fieldItems.js';
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
  const help = el('div', { class: 'help' });
  const lookHint = el('div', { class: 'look-hint', hidden: true }, 'Click the view to look around with the mouse');
  const mmToggle = el('button', { class: 'mm-toggle', id: 'mm-toggle', title: 'Show or hide the corner minimap (N)', onclick: () => toggleMinimap() }, 'Minimap');
  const mini = el('canvas', { class: 'minimap', width: 180, height: 180 });
  const partyStrip = el('div', { class: 'party-strip' });
  const overlay = el('div', { class: 'overlay', hidden: true });
  const prompt = el('div', { class: 'prompt', hidden: true });
  hud.append(floorLabel, compass, mmToggle, mini, partyStrip, msg, help, lookHint);
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
  const isFree = () => (game.settings.movement ?? 'free') === 'free';
  const fp = { x: pos.x, y: pos.y, yaw: yawOfDir(pos.dir), pitch: 0 }; // free-movement position (cell units)
  let appliedMode = null;
  const pressed = new Set();

  function placeCamera() {
    if (isFree()) view.setPoseExact(fp.x, fp.y, fp.yaw, fp.pitch);
    else view.setPose(pos.x, pos.y, pos.dir);
  }

  // Bring the free position to the grid cell (after stairs, warps, launchers, or switching modes).
  function syncFree(keepYaw = false) {
    fp.x = pos.x;
    fp.y = pos.y;
    if (!keepYaw) { fp.yaw = yawOfDir(pos.dir); fp.pitch = 0; }
  }

  function applyMode() {
    const mode = isFree() ? 'free' : 'grid';
    if (mode === appliedMode) return;
    if (appliedMode === 'free') { pos.dir = dirOfYaw(fp.yaw); }
    appliedMode = mode;
    view.setFree(mode === 'free');
    syncFree(false);
    placeCamera();
    help.textContent = mode === 'free'
      ? 'WASD: move · mouse: look (click the view) · Q/E or ←/→: turn · Shift: run · H: heal · N: minimap · M: map · Esc: menu'
      : 'WASD / arrows: step & strafe · Q/E: turn · H: heal · N: minimap · M: map · Esc: menu';
  }

  function say(text, ms = 2600) {
    msg.textContent = text;
    msg.classList.add('show');
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => msg.classList.remove('show'), fast ? 50 : ms);
  }

  function updateCompass() {
    const d = pos.dir;
    compass.innerHTML = '';
    compass.append(
      el('span', { class: 'dim' }, DIR_NAMES[(d + 3) % 4]),
      el('b', {}, DIR_NAMES[d]),
      el('span', { class: 'dim' }, DIR_NAMES[(d + 1) % 4]),
    );
  }

  function updateHud() {
    const cell = cellAt(floor, pos.x, pos.y);
    const area = cell.areaName ? ` — ${cell.areaName}` : '';
    floorLabel.textContent = `${floor.name}${cell.dark ? ' — darkness' : area}`;
    updateCompass();
    clear(partyStrip);
    for (const who of partyMembers(game)) {
      const mx = maxOf(game, who);
      partyStrip.append(el('div', { class: `ps${who.hp <= 0 ? ' dead' : ''}` },
        el('span', { class: 'ps-name' }, who === game.hero ? `${game.hero.name} Lv ${who.level}${game.hero.points ? ' ★' : ''}` : `${MONSTERS[who.type].name} Lv ${who.level}`),
        el('div', { class: 'bar hp' }, el('i', { style: { width: `${(100 * who.hp) / mx.maxHp}%` } }), el('span', {}, `${who.hp}/${mx.maxHp}`)),
        el('div', { class: 'bar mp' }, el('i', { style: { width: `${(100 * who.mp) / Math.max(1, mx.maxMp)}%` } }), el('span', {}, `${who.mp}/${mx.maxMp}`))));
    }
    applyMode();
    drawMini();
    if (cell.areaName && cell.areaName !== lastArea && !cell.dark) say(cell.areaName, 1400);
    lastArea = cell.areaName;
  }

  function mapPos() {
    return isFree() ? { ...pos, fx: fp.x, fy: fp.y, angle: -fp.yaw } : pos;
  }

  function drawMini() {
    mini.hidden = !game.settings.minimap;
    mmToggle.classList.toggle('on', !!game.settings.minimap);
    if (game.settings.minimap) drawMap(mini, floor, { mem: fs.mem, flags: fs.flags, pos: mapPos(), inDark: cellAt(floor, pos.x, pos.y).dark, window: 4 });
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
    syncFree(false);
    placeCamera();
    visit(fs.mem, floor, pos.x, pos.y);
    fs.mem.seen ||= new Set();
    look(fs.mem, floor, fs.flags, pos.x, pos.y);
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

  const linear = (t) => t;
  let lastAction = null;

  // Mouse look like a first-person game: click the view once to capture the mouse (pointer lock), then moving the
  // mouse turns and tilts the view. Esc (or any menu, battle or shop) releases it. Where pointer lock isn't available
  // (phones, some app views) dragging on the view looks around instead.
  const canvas = view.canvas;
  const SENS = 0.0024;
  let lockFailed = false;
  let relock = false;
  const locked = () => document.pointerLockElement === canvas;
  // fromClick: a refused request after a real click means this view can't lock (fall back to dragging); an
  // automatic re-lock after a menu may just lack a fresh click, so it only shows the hint.
  function requestLock(fromClick = false) {
    if (!canvas.requestPointerLock) { lockFailed = true; return; }
    if (modal || dead) return;
    try {
      const p = canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => { if (fromClick) lockFailed = true; });
    } catch { if (fromClick) lockFailed = true; }
  }
  function turnBy(dx, dy) {
    if (isFree()) {
      fp.yaw -= dx * SENS;
      fp.pitch = Math.max(-1.2, Math.min(1.2, fp.pitch - dy * SENS));
    } else view.look(-dx * SENS, -dy * SENS);
  }
  viewport.addEventListener('click', () => { if (!locked()) requestLock(true); });
  // Browsers sometimes report one huge jump right after locking: ignore implausible spikes.
  const onMouseMove = (e) => {
    if (!locked()) return;
    const dx = e.movementX || 0;
    const dy = e.movementY || 0;
    if (Math.abs(dx) > 250 || Math.abs(dy) > 250) return;
    turnBy(dx, dy);
  };
  document.addEventListener('mousemove', onMouseMove);
  let drag = null;
  viewport.addEventListener('pointerdown', (e) => { if (!modal && lockFailed && e.button === 0) drag = { x: e.clientX, y: e.clientY }; });
  viewport.addEventListener('pointermove', (e) => {
    if (!drag) return;
    turnBy(e.clientX - drag.x, e.clientY - drag.y);
    drag = { x: e.clientX, y: e.clientY };
  });
  viewport.addEventListener('pointerup', () => { drag = null; });

  // ---- Free movement loop ------------------------------------------------------------------------------------
  let lastT = performance.now();
  let crossing = false;
  let lastMini = 0;
  let bumpAt = 0;
  const KEYS_FREE = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  const blockMsg = (edge) => (edge.type === 'lock' ? `Locked. It needs the ${keyName(edge.key)}.` : edge.type === 'oneway' ? "It won't open from this side." : 'Barred from the other side.');

  function openNearDoors() {
    const { x, y } = pos;
    const geo = [[x - 0.5, y - 0.5, false, x, y - 0.5], [x + 0.5, y - 0.5, true, x + 0.5, y], [x - 0.5, y + 0.5, false, x, y + 0.5], [x - 0.5, y - 0.5, true, x - 0.5, y]];
    for (let d = 0; d < 4; d++) {
      const e = edgeAt(floor, x, y, d);
      if (e.type === 'open' || e.type === 'wall') continue;
      const [ax, ay, vertical, mx, my] = geo[d];
      if (Math.hypot(fp.x - mx, fp.y - my) < 0.85 && edgeBlock(e, fs.flags, game.inv, fp.x, fp.y, ax, ay, vertical) === 'door') view.openDoor(e.id);
    }
  }

  async function crossInto(cx, cy) {
    crossing = true;
    try {
      const dx = cx !== pos.x ? (cx > pos.x ? 1 : 3) : null;
      const dy = cy !== pos.y ? (cy > pos.y ? 2 : 0) : null;
      let order = [dx, dy].filter((d) => d !== null);
      if (order.length === 2 && !tryMove(floor, { opened: { ...fs.flags.opened }, unlocked: { ...fs.flags.unlocked }, chests: {} }, game.inv, pos.x, pos.y, order[0]).ok) order = [order[1], order[0]];
      const startFloor = floor;
      for (const dir of order) {
        const r = tryMove(floor, fs.flags, game.inv, pos.x, pos.y, dir);
        if (!r.ok) {
          // Shouldn't happen (collision keeps you out); stay in the current cell.
          fp.x = Math.max(pos.x - 0.45, Math.min(pos.x + 0.45, fp.x));
          fp.y = Math.max(pos.y - 0.45, Math.min(pos.y + 0.45, fp.y));
          return;
        }
        if (r.opened || r.unlocked) { view.refresh(); say(r.msg); }
        pos.x = r.x;
        pos.y = r.y;
        game.steps++;
    stepRegen(game);
        stepRegen(game);
        const before = `${pos.x},${pos.y}`;
        await afterArrive();
        if (floor !== startFloor) return; // took the stairs: enterFloor already placed you
        if (`${pos.x},${pos.y}` !== before) { syncFree(true); placeCamera(); return; } // warped or launched
      }
    } finally {
      crossing = false;
    }
  }

  function tick(now) {
    if (dead) return;
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
    lastT = now;
    lookHint.hidden = !isFree() || !!modal || locked() || lockFailed;
    if (modal && locked()) { relock = true; document.exitPointerLock?.(); }
    if (!modal && relock && !locked()) { relock = false; requestLock(); }
    if (!isFree() || modal || busy || crossing || dead) return;
    const k = (c) => pressed.has(c);
    const turn = (k('KeyE') || k('ArrowRight') ? 1 : 0) - (k('KeyQ') || k('ArrowLeft') ? 1 : 0);
    fp.yaw -= turn * 2.4 * dt;
    const f = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0);
    const st = (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0);
    if (f || st) {
      const [fx, fy] = forwardOf(fp.yaw);
      const rx = Math.cos(fp.yaw);
      const ry = -Math.sin(fp.yaw);
      let mx = fx * f + rx * st;
      let my = fy * f + ry * st;
      const len = Math.hypot(mx, my) || 1;
      const speed = (k('ShiftLeft') || k('ShiftRight') ? 4.2 : 2.7) * dt;
      mx = (mx / len) * speed;
      my = (my / len) * speed;
      const r = slide(floor, fs.flags, game.inv, fp.x, fp.y, mx, my);
      fp.x = r.x;
      fp.y = r.y;
      if (r.blocked && now > bumpAt) { bumpAt = now + 1600; say(blockMsg(r.blocked)); }
    }
    openNearDoors();
    placeCamera();
    const d = dirOfYaw(fp.yaw);
    if (d !== pos.dir) { pos.dir = d; updateCompass(); }
    if (game.settings.minimap && now - lastMini > 120) { lastMini = now; drawMini(); }
    const cx = cellOf(fp.x);
    const cy = cellOf(fp.y);
    if (cx !== pos.x || cy !== pos.y) crossInto(cx, cy);
  }
  requestAnimationFrame(tick);

  async function perform(action, chained = false) {
    if (isFree()) { pos.dir = dirOfYaw(fp.yaw); view.setPose(pos.x, pos.y, pos.dir); }
    try {
      await performStep(action, chained);
    } finally {
      if (isFree()) { syncFree(false); placeCamera(); }
    }
  }

  async function performStep(action, chained) {
    view.resetLook();
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
    stepRegen(game);
    // Held keys glide: chained steps keep a constant speed (no stop-start pulsing on every cell).
    const easing = chained ? linear : undefined;
    await view.moveTo(r.x, r.y, r.door ? 230 : 180, easing);
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
    look(fs.mem, floor, fs.flags, pos.x, pos.y);
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
        if (f.gold) game.money += f.gold;
        else addItem(game, f.item, f.count || 1);
        view.build(floor, fs.flags);
        if (isFree()) placeCamera(); else view.setPose(pos.x, pos.y, pos.dir);
        say(f.gold ? `Found ${f.gold} gold!` : `Found ${f.count > 1 ? `${f.count}× ` : ''}${itemName(f.item)}!`);
        return;
      case 'stairs': {
        const target = floor.src.links?.[f.dir];
        if (!target) { say(`Stairs ${f.dir}. (Not connected yet.)`); return; }
        // Walking onto stairs takes them (no prompt). You arrive standing on the matching stairs.
        enterFloor(target, f.dir);
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
    drawMap(cv, floor, { mem: fs.mem, flags: fs.flags, pos: mapPos(), inDark: cell.dark });
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
        let fromHeld = false;
        buffered = null;
        if (!next) {
          fromHeld = true;
          // Let key-up events land before repeating a held key (matters when animations are instant).
          await new Promise((r) => setTimeout(r, 0));
          next = buffered ?? held[held.length - 1];
          buffered = null;
        }
        if (!next || modal || dead) { lastAction = null; break; }
        await perform(next, fromHeld && next === lastAction);
        lastAction = next;
      }
    } finally {
      busy = false;
    }
  }

  function toggleMinimap() {
    game.settings.minimap = !game.settings.minimap;
    mmToggle.blur();
    updateHud();
  }

  function onKeyDown(e) {
    if (dead || modal === 'ext') return;
    if (modal === 'prompt') { prompt.onkey?.(e); e.preventDefault(); return; }
    if (e.code === 'KeyM') { if (modal === 'map') closeOverlay(); else if (!modal) openMap(); e.preventDefault(); return; }
    if (e.code === 'KeyN' && !modal) { toggleMinimap(); e.preventDefault(); return; }
    if (e.code === 'KeyH' && !modal) { say(healPartyWithSkills(game).msg); updateHud(); e.preventDefault(); return; }
    if (e.code === 'Escape') { if (modal) closeOverlay(); else openMenu(); e.preventDefault(); return; }
    if (modal) return;
    if (isFree()) {
      if (KEYS_FREE.has(e.code)) { pressed.add(e.code); e.preventDefault(); }
      return;
    }
    const a = KEYS[e.code];
    if (!a) return;
    e.preventDefault();
    if (e.repeat) return;
    if (!held.includes(a)) held.push(a);
    buffered = a;
    pump();
  }
  function onKeyUp(e) {
    pressed.delete(e.code);
    const a = KEYS[e.code];
    const i = held.indexOf(a);
    if (i >= 0) held.splice(i, 1);
  }
  const onBlur = () => { held.length = 0; pressed.clear(); };
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
    free: () => ({ ...fp }),
    setYaw: (y) => { fp.yaw = y; },
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
      document.removeEventListener('mousemove', onMouseMove);
      if (locked()) document.exitPointerLock?.();
      view.dispose();
    },
    modal: () => modal,
  };
}
