const { open, approach, say, expectLine } = require('../helpers.cjs');
module.exports = async (page, base) => {
  await open(page, base);
  await approach(page, 'hephaestus');
  await say(page, '"Nice limp, old man."');
  await expectLine(page, /Hephaestus left\./);
  await page.click('#talk-done');
  await page.waitForFunction(() => /limp/i.test(document.querySelector('#field-notes').textContent));
};
