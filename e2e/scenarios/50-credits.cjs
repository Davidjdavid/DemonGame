const { open } = require('../helpers.cjs');
module.exports = async (page, base) => {
  await open(page, base);
  await page.click('#open-credits');
  await page.waitForFunction(() => !/Loading/.test(document.querySelector('#credits-list').textContent));
};
