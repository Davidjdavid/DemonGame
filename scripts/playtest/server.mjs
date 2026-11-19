// AI playtest harness: keeps the built game open in headless Chromium and exposes a tiny HTTP API so an agent
// can play it step by step like a person.
//   node scripts/playtest/server.mjs [port=7777] [query="brain=mock&fast=1&debug=1"]
// Endpoints (all GET, return text):
//   /look                 what's on screen: headings, dialogue, chat, battle state, buttons (with ids), map around you
//   /shot?name=x          saves a PNG to scratch and returns its path (view it with an image reader)
//   /key?k=ArrowUp&n=3    press a key n times (ArrowUp/Down/Left/Right, Enter, Space, w/a/s/d)
//   /click?id=enc-fight   click the element with that id (or ?text=Talk to click a button by its text)
//   /type?id=talk-input&text=...   fill a text field
//   /walk?dir=up&n=5      move n steps (stops early when something happens)
//   /reset                reload the page (new session)
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const port = Number(process.argv[2] || 7777);
const query = process.argv[3] || 'brain=mock&fast=1&debug=1';
const shotsDir = process.env.PLAYTEST_SHOTS || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'e2e', 'screens');

const game = await startServer(port + 1);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://localhost:${port + 1}/?${query}`);

async function look() {
  return page.evaluate(() => {
    const out = [];
    const txt = (el) => (el?.innerText ?? '').trim();
    const h1 = [...document.querySelectorAll('h1')].map(txt).filter(Boolean);
    if (h1.length) out.push(`SCREEN: ${h1.join(' | ')}`);
    const status = document.querySelector('.status');
    if (status) out.push(`STATUS: ${txt(status).replace(/\s+/g, ' ')}`);
    const dlg = document.querySelector('#dlg:not([hidden])');
    if (dlg) out.push(`DIALOGUE:\n${txt(dlg)}`);
    const chat = document.querySelector('#chat');
    if (chat) out.push(`CONVERSATION:\n${txt(chat).split('\n').slice(-14).join('\n')}`);
    const demand = document.querySelector('#demand:not([hidden])');
    if (demand) out.push(`DEMAND: ${txt(demand)}`);
    const enemies = document.querySelector('#b-enemies');
    if (enemies) {
      out.push(`ENEMIES:\n${[...enemies.querySelectorAll('.b-enemy')].map((e) => txt(e).replace(/\s+/g, ' ')).join('\n')}`);
      out.push(`TURN: ${txt(document.querySelector('#b-icons'))}`);
      out.push(`PARTY:\n${[...document.querySelectorAll('.b-member')].map((e) => txt(e).replace(/\s+/g, ' ')).join('\n')}`);
      out.push(`LOG:\n${txt(document.querySelector('#b-log'))}`);
    }
    const msg = document.querySelector('#world-msg, #dungeon-msg, #hub-msg, .notice');
    if (msg && txt(msg)) out.push(`MESSAGE: ${txt(msg)}`);
    const main = document.querySelector('#results, #ending, #encounter, #finale, .panel');
    if (main && !enemies && !chat) out.push(`PANEL:\n${txt(main).slice(0, 1500)}`);
    const g = window.__game;
    if (g?.run?.mode === 'story' && document.querySelector('#map')) {
      const { world } = g.run;
      out.push(`POSITION: map ${world.mapId} x${world.x} y${world.y} facing ${world.facing}`);
    }
    const buttons = [...document.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input[type=checkbox]')]
      .filter((b) => b.offsetParent !== null)
      .map((b) => `${b.id ? `#${b.id}` : '(no id)'} ${b.tagName === 'TEXTAREA' ? '[text box]' : `"${txt(b).replace(/\s+/g, ' ').slice(0, 40)}"`}`);
    out.push(`CONTROLS: ${buttons.join(' · ')}`);
    return out.join('\n');
  });
}

// ASCII view of the map around the player (story mode only), with entity letters.
async function mapView() {
  return page.evaluate(() => {
    const g = window.__game;
    if (!g?.run?.world || !document.querySelector('#map')) return '';
    return window.__mapAscii ? window.__mapAscii() : '';
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const q = Object.fromEntries(u.searchParams);
  let body = '';
  try {
    if (u.pathname === '/look') body = `${await look()}\n${await mapView()}`;
    else if (u.pathname === '/shot') {
      const file = path.join(shotsDir, `playtest-${q.name || Date.now()}.png`);
      await page.screenshot({ path: file, fullPage: true });
      body = file;
    } else if (u.pathname === '/key') {
      for (let i = 0; i < Number(q.n || 1); i++) { await page.keyboard.press(q.k); await page.waitForTimeout(140); }
      body = await look();
    } else if (u.pathname === '/walk') {
      const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[q.dir];
      for (let i = 0; i < Number(q.n || 1); i++) {
        const before = await page.evaluate(() => JSON.stringify([window.__game?.run?.world?.x, window.__game?.run?.world?.y, !!document.querySelector('#map'), !!document.querySelector('#dlg:not([hidden])')]));
        await page.keyboard.press(key);
        await page.waitForTimeout(160);
        const after = await page.evaluate(() => JSON.stringify([window.__game?.run?.world?.x, window.__game?.run?.world?.y, !!document.querySelector('#map'), !!document.querySelector('#dlg:not([hidden])')]));
        const [, , onMap, dlg] = JSON.parse(after);
        if (!onMap || dlg || before === after) break;
      }
      body = `${await look()}\n${await mapView()}`;
    } else if (u.pathname === '/click') {
      if (q.id) await page.click(`#${q.id}`, { timeout: 4000 });
      else await page.getByRole('button', { name: q.text }).first().click({ timeout: 4000 });
      await page.waitForTimeout(300);
      await page.waitForSelector('#thinking', { state: 'hidden', timeout: 15000 }).catch(() => {});
      body = await look();
    } else if (u.pathname === '/type') {
      await page.fill(`#${q.id}`, q.text);
      body = 'ok';
    } else if (u.pathname === '/reset') {
      await page.goto(`http://localhost:${port + 1}/?${query}`);
      body = await look();
    } else body = 'endpoints: /look /shot /key /walk /click /type /reset';
    if (errors.length) body += `\nPAGE ERRORS: ${errors.splice(0).join(' | ')}`;
  } catch (e) {
    body = `ERROR: ${e.message}`;
  }
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(body);
});
server.listen(port, () => console.log(`playtest server on http://localhost:${port} (game on ${port + 1})`));
process.on('SIGTERM', async () => { await browser.close(); game.close(); server.close(); process.exit(0); });
void game;
