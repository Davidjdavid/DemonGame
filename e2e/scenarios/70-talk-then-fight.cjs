const { open, approach, say, expectLine } = require('../helpers.cjs');
// A failed talk leads into a real battle where the demon strikes first.
module.exports = async (page, base) => {
  await open(page, base, 'brain=mock&seed=7&hostile=0&fast=1');
  await approach(page, 'kappa');
  await say(page, '*I reach out to tip the dish on its head*');
  await expectLine(page, /Kappa attacks!/);
  await page.click('#talk-done');
  await page.waitForSelector('#b-icons');
  await page.waitForFunction(() => /strikes first/.test(document.body.textContent));
  for (let i = 0; i < 300; i++) {
    if (await page.$('#b-outcome')) break;
    const skill = await page.$('.skill-btn:not([disabled])');
    if (!skill) { await page.waitForTimeout(30); continue; }
    await skill.click();
    const target = await page.$('.target-btn');
    if (target) await target.click();
    await page.waitForTimeout(20);
  }
  await page.click('#b-done');
  await page.waitForSelector('.roster');
};
