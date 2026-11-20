// Shared e2e helpers.
const assert = require('node:assert/strict');

async function boot(page, base, query = '') {
  await page.goto(`${base}?test=1&fast=1&noenc=1${query ? '&' + query : ''}`);
  await page.waitForFunction(() => window.__game && window.__game.screen);
}
const pos = (page) => page.evaluate(() => ({ ...window.__game.game.pos }));
async function act(page, ...actions) {
  for (const a of actions) await page.evaluate((x) => window.__game.screen.act(x), a);
}
module.exports = { assert, boot, pos, act };
