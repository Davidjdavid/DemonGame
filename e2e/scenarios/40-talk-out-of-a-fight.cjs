const { open, approach, say, expectLine } = require('../helpers.cjs');
module.exports = async (page, base) => {
  await open(page, base, 'brain=mock&seed=7&hostile=1');
  await approach(page, 'ares');
  await expectLine(page, /Prepare yourself/);
  await say(page, '"I want glory, not a cheap brawl in the dark."');
  await expectLine(page, /Ares lets you pass\./);
  // And the other way: cowardice gets you attacked.
  await page.click('#talk-done');
  await approach(page, 'ares');
  await say(page, '"Please, spare me! I\'m scared!"');
  await expectLine(page, /Ares attacks!/);
  await page.click('#talk-done');
  await page.waitForFunction(() => /strikes first/.test(document.body.textContent));
};
