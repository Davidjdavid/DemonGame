// Free movement (default): holding W walks smoothly forward, walls stop you, crossing into a cell runs its logic
// (map memory, stairs), and mouse movement under pointer lock turns the view.
const { assert, boot, pos } = require('../helpers.cjs');

const free = (page) => page.evaluate(() => window.__game.screen.free());

module.exports = async (page, base) => {
  await boot(page, base, 'floor=test');
  const start = await free(page);
  assert.deepEqual([start.x, start.y], [1, 9]);
  // Facing north from (1,9): (1,8) is rock, so walking forward stops at the wall.
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyW');
  const blocked = await free(page);
  assert.ok(blocked.y > 8.6 && blocked.y < 9, `stopped by the wall at y ${blocked.y}`);
  // Turn right with E (continuous), then walk east into (2,9) and on.
  await page.keyboard.down('KeyE');
  await page.waitForFunction(() => window.__game.screen.free().yaw < -1.5, null, { timeout: 3000 });
  await page.keyboard.up('KeyE');
  await page.evaluate(() => window.__game.screen.setYaw(-Math.PI / 2));
  await page.keyboard.down('KeyW');
  await page.waitForFunction(() => window.__game.game.pos.x === 2, null, { timeout: 3000 });
  await page.keyboard.up('KeyW');
  const p = await pos(page);
  assert.equal(p.dir, 1, 'compass follows the heading');
  assert.ok(await page.evaluate(() => window.__game.game.floors.test.mem.cells.has('2,9')), 'the cell you walked into is mapped');
  assert.ok(await page.evaluate(() => window.__game.game.steps) >= 1);
  // Mouse look: with pointer lock, mouse movement turns the view (no clicking or dragging needed).
  await page.click('.viewport');
  await page.waitForTimeout(100);
  const lockedNow = await page.evaluate(() => !!document.pointerLockElement);
  if (lockedNow) {
    const y0 = (await free(page)).yaw;
    // Headless mouse deltas are noisy, so send clean ones (what a real mouse produces under pointer lock).
    await page.evaluate(() => { for (let i = 0; i < 5; i++) document.dispatchEvent(new MouseEvent('mousemove', { movementX: 40, movementY: 0 })); });
    const y1 = (await free(page)).yaw;
    assert.ok(Math.abs(y1 - (y0 - 200 * 0.0024)) < 1e-6, `mouse right turns right: ${y0} -> ${y1}`);
  } else {
    console.log('  note: pointer lock not available headless; mouse-look path not exercised');
  }
};
