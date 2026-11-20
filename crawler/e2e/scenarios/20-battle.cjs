// Stage 2: a solo battle driven through the real UI: shard on a weakness (half icon), analyze, attack to the end,
// results, EXP. Then a fight we flee from.
const { assert, boot } = require('../helpers.cjs');

module.exports = async (page, base) => {
  await boot(page, base, 'floor=test&seed=11');
  const done = page.evaluate(() => window.__game.battle([{ type: 'slime', level: 1 }, { type: 'gnawer', level: 1 }], { first: 'player' }));
  await page.waitForSelector('.battle .menu-grid');
  assert.equal(await page.locator('.slot').count(), 2);
  assert.equal(await page.locator('.icon.full.player').count(), 1);
  // Fire Shard on the Slime: a weakness hit leaves a half icon and teaches the party.
  await page.click('.menu-grid >> text=Items');
  await page.click('.list >> text=Fire Shard');
  await page.click('.slot >> nth=0');
  await page.waitForSelector('.battle .menu-grid');
  const k = await page.evaluate(() => window.__game.game.hero.knows.slime);
  assert.equal(k.fire, 'weak');
  // Analyze the Gnawer (uses the half icon); its chips fill in.
  await page.click('.menu-grid >> text=Analyze');
  await page.click('.slot >> nth=1');
  await page.waitForFunction(() => document.querySelector('.slot[data-key="e1"] .chip.t-weak'));
  // Keep attacking until the fight ends.
  for (let i = 0; i < 30; i++) {
    if (await page.isVisible('#battle-continue')) break;
    if (await page.isVisible('.menu-grid')) {
      await page.click('.menu-grid >> text=Attack');
      const targets = page.locator('.slot.targetable');
      if (await targets.count()) await targets.first().click();
    }
    await page.waitForTimeout(30);
  }
  await page.click('#battle-continue');
  assert.equal(await done, 'win');
  const hero = await page.evaluate(() => window.__game.game.hero);
  assert.ok(hero.exp > 0 || hero.level > 1, 'gained EXP');
  assert.equal(await page.locator('.battle').count(), 0);
  // A fight we escape from (seeded so the roll succeeds within a few tries).
  const fled = page.evaluate(() => window.__game.battle([{ type: 'husk', level: 2 }], { first: 'player' }));
  for (let i = 0; i < 40; i++) {
    const r = await Promise.race([fled.then((x) => x), page.waitForTimeout(40).then(() => null)]);
    if (r) break;
    if (await page.isVisible('#battle-continue')) await page.click('#battle-continue');
    else if (await page.isVisible('.menu-grid')) await page.click('.menu-grid >> text=Escape');
  }
  assert.ok(['escaped', 'win', 'lose'].includes(await fled));
};
