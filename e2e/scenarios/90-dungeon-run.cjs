// Full loop: title -> new game -> walk each floor to the stairs (fighting what attacks, visiting the shop) ->
// boss -> demo complete. Uses the debug hook to read the position and, after floor 1, to keep the party
// strong enough that auto-play (first usable skill) survives. Balance is the sim's job, not this test's.
const floors = require('../../src/data/dungeon/floors.json');

function bfs(floor, from, goal) {
  const key = (p) => `${p.x},${p.y}`;
  const prev = new Map([[key(from), null]]);
  const q = [from];
  while (q.length) {
    const c = q.shift();
    if (c.x === goal.x && c.y === goal.y) break;
    for (const [dx, dy, dir] of [[0, -1, 'ArrowUp'], [0, 1, 'ArrowDown'], [-1, 0, 'ArrowLeft'], [1, 0, 'ArrowRight']]) {
      const n = { x: c.x + dx, y: c.y + dy };
      if (floor.tiles[n.y]?.[n.x] !== '.' || prev.has(key(n))) continue;
      prev.set(key(n), { from: c, dir });
      q.push(n);
    }
  }
  let cur = goal, first = null;
  while (prev.get(`${cur.x},${cur.y}`)) { const p = prev.get(`${cur.x},${cur.y}`); first = p.dir; cur = p.from; }
  return first;
}

module.exports = async (page, base) => {
  await page.goto(`${base}?brain=mock&seed=21&fast=1&debug=1`);
  await page.click('#title-new');
  await page.waitForSelector('#map');
  let visitedShop = false;
  let lastFloor = 0, lastTitle = '';
  for (let i = 0; i < 3000; i++) {
    if (await page.$('#demo-complete')) return;
    if (await page.$('#game-over')) throw new Error(`the party fell on floor ${lastFloor} (${lastTitle})`);
    if (await page.$('#results-done')) { await page.click('#results-done'); continue; }
    if (await page.$('#b-done')) { await page.click('#b-done'); continue; }
    if (await page.$('#b-icons')) {
      lastTitle = await page.textContent('.b-title').catch(() => '');
      const skill = await page.$('.skill-btn:not([disabled])');
      if (skill) { await skill.click(); const t = await page.$('.target-btn'); if (t) await t.click(); }
      await page.waitForTimeout(15);
      continue;
    }
    if (await page.$('#enc-fight')) { await page.click('#enc-fight'); continue; }
    if (await page.$('#shop-leave')) { visitedShop = true; await page.click('#buy-salve'); await page.click('#shop-leave'); continue; }
    if (await page.$('#map')) {
      const st = await page.evaluate(() => ({ run: window.__game.run, level: window.__game.player.level }));
      const fi = st.run.floorIndex;
      lastFloor = fi;
      // Keep auto-play alive (balance is checked by the sim, not here).
      await page.evaluate(() => { const p = window.__game.player; p.level = Math.max(p.level, 14); p.stats.str = 220; p.stats.vit = 45; p.stats.agi = 40; p.maxHp = p.hp = 600; });
      const floor = floors[fi];
      const goals = floor.features.filter((f) => f.type === (fi === 0 && !visitedShop ? 'shop' : (f.type === 'boss' ? 'boss' : 'stairs')) || (fi === floors.length - 1 && f.type === 'boss'));
      const goal = goals[0];
      const dir = bfs(floor, st.run.ex, goal);
      if (!dir) throw new Error(`no path on ${floor.id}`);
      await page.keyboard.press(dir);
      continue;
    }
    await page.waitForTimeout(20);
  }
  throw new Error('did not finish the dungeon');
};
