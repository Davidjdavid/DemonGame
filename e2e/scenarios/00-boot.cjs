const { open } = require('../helpers.cjs');
module.exports = async (page, base) => {
  await open(page, base);
  const cards = await page.$$('.demon-card');
  if (cards.length < 3) throw new Error(`expected at least 3 demons, got ${cards.length}`);
  await page.waitForFunction(() => /Scripted replies/.test(document.querySelector('#brain-chip').textContent));
  await page.setViewportSize({ width: 400, height: 800 });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > 400) throw new Error(`horizontal scroll at phone width: ${sw}px`);
};
