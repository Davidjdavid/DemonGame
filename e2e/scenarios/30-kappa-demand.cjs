const { open, approach, say, expectLine } = require('../helpers.cjs');
module.exports = async (page, base) => {
  await open(page, base);
  await approach(page, 'kappa');
  await say(page, '"Good day, most honored kappa."');
  await page.waitForFunction(() => /Cucumber/.test(document.querySelector('#demand').textContent));
  await say(page, '*I hand him a cucumber*');
  await expectLine(page, /You gave Cucumber/);
  await expectLine(page, /Kappa joined your party!/);
};
