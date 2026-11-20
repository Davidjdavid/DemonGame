// Stage 1: keys move/turn, doors and gimmicks behave, chests give items, map and minimap work.
const { assert, boot, pos, act } = require('../helpers.cjs');

module.exports = async (page, base) => {
  await boot(page, base, 'floor=test');
  assert.deepEqual(await pos(page), { floor: 'test', x: 1, y: 9, dir: 0 });
  // Real keyboard input: E turns right, W walks.
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(60);
  await page.keyboard.press('KeyW');
  await page.waitForTimeout(60);
  assert.deepEqual(await pos(page), { floor: 'test', x: 2, y: 9, dir: 1 });
  // Strafe left (north) with A, then up to the barred shortcut: it won't open from the south.
  await page.keyboard.press('KeyA');
  await page.waitForTimeout(60);
  assert.equal((await pos(page)).y, 8);
  await act(page, 'turnL', 'fwd', 'fwd', 'fwd', 'fwd');
  assert.deepEqual(await pos(page), { floor: 'test', x: 2, y: 5, dir: 0 });
  assert.match(await page.textContent('.msg'), /Barred/);
  // West through the warp at (0,6) to (6,9).
  await act(page, 'back', 'turnL', 'fwd', 'fwd');
  assert.deepEqual(await pos(page), { floor: 'test', x: 6, y: 9, dir: 3 });
  // North-east into the dark zone and west to the key chest at (4,6).
  await act(page, 'turnR', 'fwd', 'turnR', 'fwd', 'turnL', 'fwd', 'fwd', 'turnL', 'fwd', 'fwd', 'fwd');
  assert.deepEqual(await pos(page), { floor: 'test', x: 4, y: 6, dir: 3 });
  assert.equal(await page.evaluate(() => window.__game.game.inv.brass_key), 1);
  assert.match(await page.textContent('.floor-label'), /Test Halls/);
  // Map opens on M and closes on Escape.
  await page.keyboard.press('KeyM');
  await page.waitForSelector('canvas.bigmap');
  assert.match(await page.textContent('.map-head'), /mapped \d+%/);
  await page.keyboard.press('Escape');
  assert.equal(await page.isHidden('.overlay'), true);
  // Minimap is off by default; the menu turns it on.
  assert.equal(await page.isHidden('.minimap'), true);
  await page.keyboard.press('Escape');
  await page.click('#tab-settings');
  await page.check('#opt-minimap');
  await page.keyboard.press('Escape');
  assert.equal(await page.isVisible('.minimap'), true);
};
