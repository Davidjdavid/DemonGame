const { open, approach, say, expectLine } = require('../helpers.cjs');
module.exports = async (page, base) => {
  await open(page, base);
  await approach(page, 'ares');
  await say(page, '"Tell me of the glory of your greatest battle!"');
  await page.waitForSelector('#demand:not([hidden])');
  await say(page, '*I plant my feet* "Go ahead. I\'ll take the blow."');
  await expectLine(page, /Ares joined your party!/);
  await page.click('#talk-done');
  await page.waitForFunction(() => /Ares \(Lv 10\)/.test(document.body.textContent));
  await page.waitForFunction(() => /glory/i.test(document.querySelector('#field-notes').textContent));
};
