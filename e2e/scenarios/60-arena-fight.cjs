const { open } = require('../helpers.cjs');
// Play an arena fight to the end by always using the first usable skill on the first target.
module.exports = async (page, base) => {
  await open(page, base, 'brain=mock&seed=11&hostile=0&fast=1');
  await page.click('#open-arena');
  await page.click('#arena-random');
  await page.waitForSelector('#b-icons');
  for (let i = 0; i < 400; i++) {
    if (await page.$('#b-outcome')) break;
    const skill = await page.$('.skill-btn:not([disabled])');
    if (!skill) { await page.waitForTimeout(30); continue; }
    await skill.click();
    const target = await page.$('.target-btn');
    if (target) await target.click();
    await page.waitForTimeout(20);
  }
  const outcome = await page.textContent('#b-outcome');
  if (!/Victory|Defeat/.test(outcome)) throw new Error('battle did not finish');
  const log = await page.textContent('#b-log');
  if (!log.trim()) throw new Error('empty battle log');
  await page.click('#b-done');
  await page.waitForSelector('#arena-boss');
  await page.click('#arena-boss');
  await page.waitForFunction(() => /Gonggong/.test(document.querySelector('#b-enemies').textContent));
};
