// Stage 4: hub services. Item shop, fusion, inn rest + save, then reload and continue from the title screen.
const { assert, boot, pos, act } = require('../helpers.cjs');

module.exports = async (page, base) => {
  await boot(page, base, 'floor=hub&seed=31');
  assert.deepEqual(await pos(page), { floor: 'hub', x: 4, y: 6, dir: 0 });
  await page.evaluate(() => { window.__game.game.money = 2000; });
  // North past the save point, then east and up into the item shop counter.
  await act(page, 'fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'right', 'fwd');
  await page.waitForSelector('.svc');
  assert.match(await page.textContent('.svc h2'), /Item Shop/);
  await page.click('#buy-medicine');
  assert.equal(await page.evaluate(() => window.__game.game.inv.medicine), 4);
  await page.click('#svc-close');
  // Two recruits to fuse; walk to the fusion room on the east wall.
  await page.evaluate(() => {
    const g = window.__game.game;
    g.hero.level = 6;
    g.party.push({ uid: 50, type: 'wisp', level: 4, exp: 0, skills: ['fire1', 'mend'], knows: { wisp: {} }, hp: 30, mp: 20, auto: true });
    g.party.push({ uid: 51, type: 'gnawer', level: 4, exp: 0, skills: ['bite', 'claw_flurry'], knows: { gnawer: {}, imp: { elec: 'null' } }, hp: 30, mp: 10, auto: true });
    g.nextUid = 52;
  });
  await act(page, 'back', 'right', 'right', 'right', 'back', 'back');
  await page.waitForSelector('.svc');
  assert.match(await page.textContent('.svc h2'), /Fusion/);
  await page.click('.pick-btn[data-uid="50"]');
  await page.click('.pick-btn[data-uid="51"]');
  await page.waitForSelector('.fusion-preview');
  await page.click('#do-fuse');
  const party = await page.evaluate(() => window.__game.game.party);
  assert.equal(party.length, 1);
  assert.equal(party[0].knows.imp.elec, 'null');
  await page.click('#svc-close');
  // Inn: rest and save.
  await act(page, 'fwd', 'fwd', 'left', 'fwd', 'right', 'fwd');
  await page.waitForSelector('.svc');
  assert.match(await page.textContent('.svc h2'), /Inn/);
  await page.evaluate(() => { window.__game.game.hero.hp = 3; });
  await page.click('#inn-rest');
  await page.waitForFunction(() => /Saved/.test(document.querySelector('.fm-msg').textContent));
  await page.click('#svc-close');
  const fusedType = party[0].type;
  // Reload with the title screen: Continue restores the fused monster.
  await page.goto(`${base}?test=1&fast=1&noenc=1&title=1`);
  await page.waitForSelector('.title-screen button.primary');
  assert.match(await page.textContent('.title-screen'), /Continue/);
  await page.click('.title-screen button.primary');
  await page.waitForFunction(() => window.__game && window.__game.game.party.length === 1);
  assert.equal(await page.evaluate(() => window.__game.game.party[0].type), fusedType);
  assert.equal(await page.evaluate(() => window.__game.game.pos.floor), 'hub');
};
