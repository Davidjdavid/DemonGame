module.exports = async (page) => {
  await page.waitForSelector('#live-btn');
  await page.click('#live-btn');
  await page.waitForFunction(() => /not available/.test(document.querySelector('#live-out').textContent));
};
