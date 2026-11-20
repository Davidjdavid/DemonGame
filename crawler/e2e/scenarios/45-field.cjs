// Field menu: a recruit's Mend heals the hero outside battle; the Exit Charm returns you to the hub.
const { assert, boot, pos } = require('../helpers.cjs');

module.exports = async (page, base) => {
  await boot(page, base, 'floor=test&seed=3');
  await page.evaluate(() => {
    const g = window.__game.game;
    g.party.push({ uid: 7, type: 'wisp', level: 4, exp: 0, skills: ['fire1', 'mend'], knows: {}, hp: 30, mp: 30, auto: true, stats: { st: 2, ma: 8, vi: 4, ag: 5, lu: 3 } });
    g.hero.hp = 5;
    g.inv.exit_charm = 1;
  });
  await page.keyboard.press('Escape');
  await page.click('button:has-text("Mend → Hero")');
  assert.ok(await page.evaluate(() => window.__game.game.hero.hp) > 5);
  await page.click('#tab-items');
  await page.click('.item-row:has-text("Exit Charm") button:has-text("Use")');
  await page.waitForFunction(() => window.__game.game.pos.floor === 'hub');
  assert.deepEqual(await pos(page), { floor: 'hub', x: 4, y: 6, dir: 0 });
  assert.equal(await page.evaluate(() => window.__game.game.inv.exit_charm || 0), 0);
};
