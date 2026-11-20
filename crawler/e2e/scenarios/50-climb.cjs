// Stage 5: hub stairs lead to 1F; every floor links up and down; the boss on 7F can be fought and ends the game.
const { assert, boot, pos, act } = require('../helpers.cjs');

module.exports = async (page, base) => {
  await boot(page, base, 'floor=hub&seed=41');
  await act(page, 'fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'fwd');
  await page.waitForSelector('.prompt:not([hidden])');
  assert.match(await page.textContent('.prompt'), /1F/);
  await page.click('.prompt button >> nth=0');
  await page.waitForFunction(() => window.__game.game.pos.floor === 'f1');
  assert.equal(await page.evaluate(() => window.__game.getFloor('f1').cells[window.__game.game.pos.y * window.__game.getFloor('f1').w + window.__game.game.pos.x].feature.dir), 'down');
  // Each floor: arriving from below puts you on its down stairs, and its up stairs lead to the next floor.
  for (const id of ['f2', 'f3', 'f4', 'f5', 'f6', 'f7']) {
    await page.evaluate((x) => window.__game.screen.enterFloor(x, 'up'), id);
    const p = await pos(page);
    assert.equal(p.floor, id);
    const feat = await page.evaluate(() => { const g = window.__game; const f = g.getFloor(g.game.pos.floor); return f.cells[g.game.pos.y * f.w + g.game.pos.x].feature; });
    assert.equal(feat.dir, 'down', `${id} arrival on down stairs`);
    assert.equal(await page.evaluate(() => window.__game.game.deepest), Number(id[1]));
  }
  // Boss: stand next to the boss tile with a strong hero, step on it, win, see the ending.
  await page.evaluate(() => {
    const g = window.__game;
    const f = g.getFloor('f7');
    const b = f.cells.find((c) => c.feature?.type === 'boss');
    const DX = [0, 1, 0, -1]; const DY = [-1, 0, 1, 0];
    const edge = (x, y, d) => (d === 0 ? f.hEdges[y * f.w + x] : d === 2 ? f.hEdges[(y + 1) * f.w + x] : d === 3 ? f.vEdges[y * (f.w + 1) + x] : f.vEdges[y * (f.w + 1) + x + 1]);
    for (let d = 0; d < 4; d++) {
      const nx = b.x - DX[d]; const ny = b.y - DY[d];
      const n = f.cells[ny * f.w + nx];
      if (n && !n.solid && edge(nx, ny, d).type !== 'wall') { Object.assign(g.game.pos, { x: nx, y: ny, dir: d }); break; }
    }
    Object.assign(g.game.hero, { level: 30, hp: 9999 });
    Object.assign(g.game.hero.stats, { st: 300, vi: 150, ag: 99, lu: 99 });
    g.screen.enterFloor('f7');
  });
  await page.evaluate(() => { window.__boss = window.__game.screen.act('fwd'); });
  await page.waitForSelector('.battle .slot.boss');
  for (let i = 0; i < 300; i++) {
    if (await page.isVisible('#ending-close')) break;
    if (await page.isVisible('#battle-continue')) await page.click('#battle-continue');
    else if (await page.isVisible('.menu-grid')) { await page.click('.menu-grid >> text=Attack'); if (await page.locator('.slot.targetable').count()) await page.click('.slot.targetable >> nth=0'); }
    await page.waitForTimeout(20);
  }
  assert.ok(await page.isVisible('#ending-close'), 'ending shown');
  assert.equal(await page.evaluate(() => window.__game.game.bossDown), true);
  await page.click('#ending-close');
};
