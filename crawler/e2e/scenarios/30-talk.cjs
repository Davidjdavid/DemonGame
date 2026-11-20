// Stage 3: talk a Slime into joining (gloomy: Agree / Stay silent work, pay the demand), then fight with it.
const { assert, boot } = require('../helpers.cjs');

const ORDER = ['[Agree]', '[Stay silent]', '[Flatter]', '[Disagree]', '[Joke]'];

async function talkOnce(page) {
  const done = page.evaluate(() => window.__game.battle([{ type: 'slime', level: 1 }], { first: 'player' }));
  for (let i = 0; i < 200; i++) {
    const r = await Promise.race([done, page.waitForTimeout(25).then(() => null)]);
    if (r) return r;
    if (await page.isVisible('#battle-continue')) { await page.click('#battle-continue'); continue; }
    if (await page.isVisible('.talk-opts button')) {
      const labels = await page.locator('.talk-opts button').allTextContents();
      const pay = labels.findIndex((l) => /Pay/.test(l));
      if (pay >= 0) {
        const b = page.locator('.talk-opts button').nth(pay);
        await (await b.isDisabled() ? page.locator('.talk-opts button').nth(1 - pay) : b).click();
        continue;
      }
      const best = ORDER.map((o) => labels.findIndex((l) => l.includes(o))).find((x) => x >= 0);
      await page.locator('.talk-opts button').nth(best).click();
      continue;
    }
    if (await page.isVisible('.menu-grid')) {
      if (await page.locator('.menu-grid button:has-text("Talk")').isEnabled()) {
        await page.click('.menu-grid >> text=Talk');
        await page.click('.slot.targetable >> nth=0');
      } else {
        await page.click('.menu-grid >> text=Attack');
        await page.click('.slot.targetable >> nth=0');
      }
    }
  }
  throw new Error('talk battle did not finish');
}

module.exports = async (page, base) => {
  await boot(page, base, 'floor=test&seed=21');
  let joined = false;
  for (let tries = 0; tries < 6 && !joined; tries++) {
    await page.evaluate(() => { const g = window.__game.game; g.money = 500; g.hero.hp = 999; });
    await talkOnce(page);
    joined = (await page.evaluate(() => window.__game.game.party.length)) > 0;
  }
  assert.ok(joined, 'the slime joined');
  const nb = await page.evaluate(() => window.__game.game.notebook);
  assert.equal(nb.types.slime, 'gloomy');
  // Next fight: two cards, the recruit has an AUTO toggle (on by default) and knows its own kind.
  const fight = page.evaluate(() => window.__game.battle([{ type: 'gnawer', level: 1 }], { first: 'player' }));
  await page.waitForSelector('.battle .card >> nth=1');
  assert.equal(await page.locator('.battle .card').count(), 2);
  assert.equal(await page.locator('.battle .card .auto.on').count(), 1);
  for (let i = 0; i < 100; i++) {
    const r = await Promise.race([fight, page.waitForTimeout(25).then(() => null)]);
    if (r) break;
    if (await page.isVisible('#battle-continue')) await page.click('#battle-continue');
    else if (await page.isVisible('.menu-grid')) { await page.click('.menu-grid >> text=Attack'); if (await page.locator('.slot.targetable').count()) await page.click('.slot.targetable >> nth=0'); }
  }
  assert.equal(await fight, 'win');
  // The menu shows the recruit and the notebook.
  await page.keyboard.press('Escape');
  assert.match(await page.textContent('.menu'), /Slime/);
  await page.click('#tab-notebook');
  assert.match(await page.textContent('.menu'), /Gloomy/);
  await page.keyboard.press('Escape');
};
