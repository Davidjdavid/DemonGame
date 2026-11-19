const { open, approach, say, expectLine } = require('../helpers.cjs');
// Recruit, see the party and compendium, save, reload the page, load.
module.exports = async (page, base) => {
  await open(page, base);
  await approach(page, 'kappa');
  await say(page, '"Good day, most honored kappa."');
  await say(page, '*I hand him a cucumber*');
  await expectLine(page, /Kappa joined your party!/);
  await page.click('#talk-done');
  await page.click('#open-party');
  await page.waitForSelector('#party-kappa:checked');
  await page.click('#back-hub');
  await page.click('#open-compendium');
  await page.waitForSelector('#summon-kappa');
  await page.click('#summon-kappa');
  await page.waitForFunction(() => /already have/.test(document.querySelector('#comp-msg').textContent));
  await page.click('#back-hub');
  await page.click('#save');
  await page.waitForFunction(() => /Saved/.test(document.querySelector('#hub-msg').textContent));
  await page.reload();
  await page.waitForSelector('.roster');
  if (await page.$('#party-list')) throw new Error('fresh page should start with no party');
  await page.click('#load');
  await page.waitForFunction(() => /Loaded/.test(document.querySelector('#hub-msg').textContent));
  await page.waitForFunction(() => /Kappa \(Lv 3\)/.test(document.querySelector('#party-list').textContent));
};
