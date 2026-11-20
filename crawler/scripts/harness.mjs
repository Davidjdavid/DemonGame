// AI playtest harness: runs the real game (dist/) in headless Chromium and exposes it over HTTP as text.
//   node scripts/harness.mjs [--port=8765] [--seed=7] [--floor=hub]
//   GET  /state                      -> text description of what's on screen + what you can do
//   POST /act  {"do":"fwd"}          -> move: fwd | back | left | right | turnL | turnR (several: {"do":["fwd","fwd"]})
//   POST /act  {"click":"Attack"}    -> click a visible button whose text contains this (case-insensitive)
//   POST /act  {"target":2}          -> click the 2nd targetable enemy/ally (1-based)
//   POST /act  {"key":"Escape"}      -> press a key (Escape opens/closes the menu, KeyM the map)
//   GET  /map                        -> full automap of the current floor as ASCII (known cells only)
// Options: --webport=5188 (game server port), --preset=f4 (start on that floor's down stairs with the party, level,
// gear and gold the balance sims expect on a first visit; f7 also gets the boss-fight party).
// Every POST returns the new /state. Animations run instantly (?fast=1).
import http from 'node:http';
import { createRequire } from 'node:module';
import { startServer } from './serve.mjs';
import { getFloor } from '../src/data/floors/index.js';
import { cellAt, edgeAt, DX, DY, DIR_NAMES } from '../src/world/floor.js';
import { edgeState } from '../src/world/move.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const PORT = Number(args.port || 8765);

const WEB = Number(args.webport || 5188);
const web = await startServer(WEB);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
await page.goto(`http://localhost:${WEB}/?test=1&fast=1&seed=${args.seed || 7}&floor=${args.floor || 'hub'}`);
await page.waitForFunction(() => window.__game?.screen);

// Presets: the "first visit" party from scripts/sim-scenarios.mjs, placed on the floor's down stairs.
const PRESETS = {
  f2: { lv: 4, rec: [['wisp', 4], ['imp', 4]], equip: { weapon: 'bronze_sword', armor: 'leather' }, gold: 300 },
  f3: { lv: 7, rec: [['wisp', 7], ['imp', 7], ['thornling', 6]], equip: { weapon: 'iron_sword', armor: 'chain' }, gold: 500 },
  f4: { lv: 10, rec: [['bogjelly', 9], ['shrike', 9], ['thornling', 9]], equip: { weapon: 'flame_brand', armor: 'warded_coat' }, gold: 900 },
  f5: { lv: 13, rec: [['bloomwitch', 12], ['harpy', 12], ['watcher', 12]], equip: { weapon: 'steel_sword', armor: 'scale' }, gold: 1400 },
  f6: { lv: 15, rec: [['bloomwitch', 15], ['naga', 15], ['lich', 16]], equip: { weapon: 'frost_edge', armor: 'mystic_robe' }, gold: 2000 },
  f7: { lv: 17, rec: [['seraph', 18], ['thunderbird', 17], ['lich', 17]], equip: { weapon: 'knight_sword', armor: 'knight_plate' }, gold: 3000 },
};
if (args.preset && PRESETS[args.preset]) {
  const { heroAt } = await import('./sim.mjs');
  const { newRecruit } = await import('../src/growth/leveling.js');
  const pr = PRESETS[args.preset];
  const hero = heroAt(pr.lv, undefined, pr.equip);
  const party = pr.rec.map(([t, l], i) => newRecruit(t, l, { uid: 100 + i }));
  await page.evaluate(({ hero, party, gold, floor, depth }) => {
    const g = window.__game.game;
    Object.assign(g.hero, hero);
    g.party = party;
    g.nextUid = 200;
    g.money = gold;
    g.deepest = depth;
    g.inv = { medicine: 4, salve: 2, mana_drop: 2, revival_bead: 1, exit_charm: 1 };
    window.__game.screen.enterFloor(floor, 'up');
  }, { hero, party, gold: pr.gold, floor: args.preset, depth: Number(args.preset.slice(1)) });
}

const vis = (sel) => page.locator(sel).first().isVisible().catch(() => false);
const txt = async (sel) => ((await page.locator(sel).first().textContent().catch(() => '')) || '').trim();

async function snapshot() {
  return page.evaluate(() => {
    const g = window.__game.game;
    const f = window.__game.screen.floor();
    const fs = g.floors[f.id];
    return { pos: { ...g.pos }, money: g.money, inv: { ...g.inv }, settings: g.settings, floorId: f.id,
      mem: fs ? [...fs.mem.cells] : [], flags: fs ? fs.flags : null, hero: { level: g.hero.level, points: g.hero.points, exp: g.hero.exp },
      steps: g.steps, ward: g.enc.ward };
  });
}

function edgeWord(floor, flags, x, y, d) {
  const e = edgeAt(floor, x, y, d);
  const n = cellAt(floor, x + DX[d], y + DY[d]);
  if (!n || n.solid) return 'wall';
  const st = edgeState(e, flags);
  if (st === 'oneway') return e.dir === d ? 'one-way door (opens this way)' : 'one-way door (closed from this side)';
  if (st === 'shortcut') return e.dir === d ? 'barred door (you can lift the bar from here)' : 'barred door (barred from the other side)';
  if (st === 'lock') return `locked door (needs ${e.key})`;
  return st;
}

const FEATURE_WORD = (f) => !f ? null : f.type === 'stairs' ? `stairs ${f.dir}` : f.type === 'chest' ? 'chest' : f.type === 'service' ? `${f.label} counter` : f.type;

function describeView(s) {
  const floor = getFloor(s.floorId);
  const { x, y, dir } = s.pos;
  const cell = cellAt(floor, x, y);
  const lines = [`Floor: ${floor.name} (${floor.id}) at (${x},${y}) facing ${DIR_NAMES[dir]}${cell.dark ? ' — DARK ZONE (no map, 1-cell view)' : ''}${cell.areaName ? ` — ${cell.areaName}` : ''}`];
  if (cell.feature) lines.push(`You are standing on: ${FEATURE_WORD(cell.feature)}${cell.feature.type === 'chest' && s.flags?.chests[cell.feature.id] ? ' (opened)' : ''}`);
  const rel = { ahead: 0, right: 1, behind: 2, left: 3 };
  for (const [name, off] of Object.entries(rel)) lines.push(`  ${name}: ${edgeWord(floor, s.flags, x, y, (dir + off) % 4)}`);
  // Look ahead down the corridor (until a closed edge), naming features and side openings.
  if (!cell.dark) {
    const seen = [];
    let cx = x; let cy = y;
    for (let i = 1; i <= 6; i++) {
      const e = edgeAt(floor, cx, cy, dir);
      const n = cellAt(floor, cx + DX[dir], cy + DY[dir]);
      if (!n || n.solid || edgeState(e, s.flags) !== 'open') { seen.push(`then ${edgeWord(floor, s.flags, cx, cy, dir)}`); break; }
      cx += DX[dir]; cy += DY[dir];
      const side = [];
      for (const [nm, off] of [['left', 3], ['right', 1]]) if (edgeWord(floor, s.flags, cx, cy, (dir + off) % 4) !== 'wall') side.push(`opening ${nm}`);
      const fw = FEATURE_WORD(n.feature);
      seen.push(`${i}: ${[n.dark ? 'darkness' : null, fw, ...side].filter(Boolean).join(', ') || 'corridor'}`);
      if (n.dark) break;
    }
    lines.push(`  looking ahead: ${seen.join(' · ')}`);
  }
  return lines.join('\n');
}

function asciiMap(s, radius = null) {
  const floor = getFloor(s.floorId);
  const known = new Set(s.mem);
  const { x: px, y: py, dir } = s.pos;
  const [x0, x1, y0, y1] = radius ? [px - radius, px + radius, py - radius, py + radius] : [0, floor.w - 1, 0, floor.h - 1];
  const out = [];
  for (let y = y0; y <= y1; y++) {
    let top = ''; let mid = '';
    for (let x = x0; x <= x1; x++) {
      const c = cellAt(floor, x, y);
      const k = c && !c.solid && known.has(`${x},${y}`);
      const n = k ? edgeAt(floor, x, y, 0) : null;
      const w = k ? edgeAt(floor, x, y, 3) : null;
      const ch = (e) => { if (!e) return ' '; const st = edgeState(e, s.flags); return st === 'open' ? ' ' : st === 'wall' ? '#' : st === 'lock' ? 'L' : st === 'oneway' ? '>' : st === 'shortcut' ? 's' : 'd'; };
      top += `+${k ? ch(n).replace('#', '-').repeat(1) : ' '}`;
      let cc = ' ';
      if (x === px && y === py) cc = '^>v<'[dir];
      else if (k) { const f = c.feature; cc = !f ? '.' : f.type === 'stairs' ? (f.dir === 'up' ? 'U' : 'D') : f.type === 'chest' ? (s.flags?.chests[f.id] ? 'c' : 'C') : f.type === 'warp' ? 'W' : f.type === 'launch' ? 'J' : f.type === 'save' ? 'R' : f.type === 'heal' ? 'H' : f.type === 'service' ? '$' : f.type === 'boss' ? 'B' : f.type === 'warn' ? '!' : '*'; }
      mid += `${k ? ch(w).replace('#', '|') : ' '}${cc}`;
    }
    out.push(top, mid);
  }
  return `${out.join('\n')}\n(legend: ^>v< you, . floor, U/D stairs, C chest (c opened), $ shop/service, R save, H heal, W warp, J launcher, B boss, ! warning, -| walls, d door, L locked, > one-way, s shortcut)`;
}

async function state() {
  const s = await snapshot();
  const parts = [];
  const title = await vis('.title-screen');
  const battle = await vis('.battle');
  const talk = await vis('.talk');
  const svc = await vis('.svc');
  const prompt = await vis('.prompt');
  const menu = await vis('.overlay .menu') && !svc;
  const ending = await vis('.ending');
  const buttons = async (scope) => (await page.locator(`${scope} button:visible`).allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (title) parts.push('MODE: title', await txt('.title-screen'), `Buttons: ${(await buttons('.title-screen')).join(' | ')}`);
  else if (talk) {
    parts.push('MODE: talk', await txt('.talk .talk-head'), `Says: ${await txt('.talk .speech')}`, `Reaction: ${await txt('.talk .react')}`, `Answers: ${(await buttons('.talk-opts')).join(' | ')}`);
  } else if (battle) {
    parts.push('MODE: battle', `${await txt('.b-turn')} · press-turn icons: ${await page.locator('.icon.full').count()} full, ${await page.locator('.icon.half').count()} half`);
    const slots = page.locator('.slot');
    for (let i = 0; i < await slots.count(); i++) {
      const sl = slots.nth(i);
      const cls = await sl.getAttribute('class');
      if (/dead|gone/.test(cls)) continue;
      const hp = await sl.locator('.bar.hp i').getAttribute('style');
      const chips = (await sl.locator('.chip').allTextContents()).join(' ');
      parts.push(`  enemy ${i + 1}: ${(await sl.locator('.e-name').textContent()).trim()} HP ${hp.match(/width:\s*([\d.]+)/)?.[1]?.slice(0, 5) || '?'}% · affinities ${chips}${/targetable/.test(cls) ? ' [targetable]' : ''}`);
    }
    const cards = page.locator('.battle .card');
    for (let i = 0; i < await cards.count(); i++) parts.push(`  ally ${i + 1}: ${(await cards.nth(i).innerText()).replace(/\s+/g, ' ')}${/targetable/.test(await cards.nth(i).getAttribute('class')) ? ' [targetable]' : ''}`);
    parts.push(`Message: ${await txt('.b-msg')}`, `Buttons: ${(await buttons('.b-cmd')).join(' | ')}`);
  } else if (svc) {
    parts.push('MODE: service', (await page.locator('.svc').innerText()).replace(/\n+/g, '\n'));
  } else if (ending) {
    parts.push('MODE: ending', await page.locator('.ending').innerText());
  } else if (prompt) {
    parts.push('MODE: prompt', await txt('.prompt p'), `Buttons: ${(await buttons('.prompt')).join(' | ')}`);
  } else if (menu) {
    parts.push('MODE: menu', (await page.locator('.overlay .menu').innerText()).replace(/\n+/g, '\n'));
  } else {
    parts.push('MODE: explore', describeView(s), `Nearby map:\n${asciiMap(s, 4)}`);
  }
  const strip = (await page.locator('.party-strip').innerText().catch(() => '')).replace(/\n+/g, ' ');
  parts.push(`Party: ${strip}`, `Gold ${s.money} · items ${Object.entries(s.inv).map(([k, v]) => `${k}×${v}`).join(', ') || 'none'} · hero Lv ${s.hero.level}${s.hero.points ? ` (${s.hero.points} stat points to place: Esc → Party)` : ''} · steps ${s.steps}${s.ward ? ` · ward ${s.ward}` : ''}`);
  if (!battle && !talk) parts.push(`Last message: ${await txt('.msg')}`);
  if (pageErrors.length) parts.push(`PAGE ERRORS: ${pageErrors.splice(0).join(' | ')}`);
  return parts.join('\n');
}

async function act(body) {
  if (body.do) {
    for (const a of [].concat(body.do)) {
      await page.evaluate((x) => window.__game.screen.act(x), a);
      await page.waitForTimeout(30);
      if (await vis('.battle') || await vis('.svc') || await vis('.prompt') || await vis('.talk')) break;
    }
  } else if (body.click) {
    const want = String(body.click).toLowerCase();
    const btns = page.locator('button:visible');
    const n = await btns.count();
    let done = false;
    for (let i = n - 1; i >= 0 && !done; i--) { // later = topmost panel
      const t = ((await btns.nth(i).textContent()) || '').toLowerCase();
      if (t.includes(want) && await btns.nth(i).isEnabled()) { await btns.nth(i).click(); done = true; }
    }
    if (!done) return `No enabled button matching "${body.click}".\n\n${await state()}`;
  } else if (body.target) {
    const t = page.locator('.targetable');
    if (await t.count() < body.target) return `Only ${await t.count()} targets.\n\n${await state()}`;
    await t.nth(body.target - 1).click();
  } else if (body.key) {
    await page.keyboard.press(body.key);
  }
  // Let the battle/AI turns play out until input is needed again.
  for (let i = 0; i < 200; i++) {
    await page.waitForTimeout(25);
    const waiting = await vis('.menu-grid') || await vis('.talk-opts button') || await vis('#battle-continue') || await vis('.list') || await vis('.m-title');
    if (!(await vis('.battle')) || waiting) break;
  }
  return state();
}

http.createServer(async (req, res) => {
  try {
    let body = '';
    for await (const chunk of req) body += chunk;
    const url = new URL(req.url, 'http://x');
    let out;
    if (url.pathname === '/state') out = await state();
    else if (url.pathname === '/map') out = asciiMap(await snapshot());
    else if (url.pathname === '/act') out = await act(JSON.parse(body || '{}'));
    else out = 'GET /state, GET /map, POST /act {"do":"fwd"} | {"click":"text"} | {"target":1} | {"key":"Escape"}';
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(out);
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(String(e.stack || e));
  }
}).listen(PORT, () => console.log(`harness on http://localhost:${PORT} (game at http://localhost:${WEB})`));

process.on('SIGINT', async () => { await browser.close(); web.close(); process.exit(0); });
