const { open, expectLine } = require('../helpers.cjs');
// Start a fight, then talk to the enemy mid-battle: bowing recruits the kappa and the battle ends.
module.exports = async (page, base) => {
  await open(page, base, 'brain=mock&seed=7&hostile=0&fast=1');
  await page.click('#meet-kappa');
  await page.click('#enc-fight');
  await page.waitForSelector('#b-talk');
  await page.click('#b-talk');
  await page.click('.target-btn');
  await page.waitForSelector('#talk-input');
  await page.waitForSelector('#thinking', { state: 'hidden' });
  await page.fill('#talk-input', '*I bow deeply*');
  await page.click('#talk-send');
  await expectLine(page, /Kappa joined your party!/);
  await page.click('#talk-done');
  await page.waitForSelector('#b-outcome');
  await page.click('#b-done');
  await page.waitForSelector('#results');
  await page.click('#results-done');
  await page.waitForFunction(() => /Kappa \(Lv 3\)/.test(document.querySelector('#party-list')?.textContent ?? ''));
};
