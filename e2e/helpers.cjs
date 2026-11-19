// Shared steps for talk scenarios (mock brain, fixed seed, no random hostility).
async function open(page, base, query = 'brain=mock&seed=7&hostile=0') {
  await page.goto(`${base}?screen=hub&${query}`);
  await page.waitForSelector('.roster');
}
async function approach(page, id) {
  await page.click(`#meet-${id}`);
  await page.click('#enc-talk');
  await page.waitForSelector('#talk-input');
  await page.waitForSelector('#thinking', { state: 'hidden' });
}
async function say(page, text) {
  await page.fill('#talk-input', text);
  await page.click('#talk-send');
  await page.waitForSelector('#thinking', { state: 'hidden' });
}
async function expectLine(page, re) {
  await page.waitForFunction((src) => new RegExp(src).test(document.querySelector('#chat').textContent), re.source, { timeout: 5000 });
}
module.exports = { open, approach, say, expectLine };
