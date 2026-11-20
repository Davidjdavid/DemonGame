// A wipe shows "Retry from last save" and restores the game from the floor-entry snapshot.
const { assert, boot } = require('../helpers.cjs');

module.exports = async (page, base) => {
  await boot(page, base, 'floor=test&seed=5');
  await page.evaluate(() => { window.__game.game.hero.hp = 1; });
  page.evaluate(() => window.__game.battle([{ type: 'imp', level: 9 }, { type: 'imp', level: 9 }], { first: 'enemy' })).catch(() => {});
  await page.waitForSelector('#battle-continue', { timeout: 15000 });
  assert.match(await page.textContent('.result'), /fallen/);
  await page.click('#battle-continue');
  await page.waitForFunction(() => window.__game.game.hero.hp > 1);
  assert.equal(await page.locator('.battle').count(), 0);
  assert.deepEqual(await page.evaluate(() => window.__game.game.pos), { floor: 'test', x: 1, y: 9, dir: 0 });
};
