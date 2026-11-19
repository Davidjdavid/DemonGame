// The Flood Ward end to end (mock brains): intro, a scripted meeting + free talk, the journal, the drain down to
// the tunnels, then (via the debug hook) the source: Gonggong, the finale question, and the ending screen.
async function advanceDialogue(page, max = 40) {
  for (let i = 0; i < max; i++) {
    if (await page.$('#dlg-next')) { await page.click('#dlg-next'); continue; }
    if (await page.$('#choice-0')) { await page.click('#choice-0'); continue; }
    if (await page.$('#npc-talk, #npc-leave')) return;
    break;
  }
}
async function autoBattle(page) {
  for (let i = 0; i < 600; i++) {
    if (await page.$('#b-outcome')) { await page.click('#b-done'); return; }
    const skill = await page.$('.skill-btn:not([disabled])');
    if (skill) { await skill.click(); const t = await page.$('.target-btn'); if (t) await t.click(); }
    await page.waitForTimeout(20);
  }
  throw new Error('battle did not end');
}

module.exports = async (page, base) => {
  await page.goto(`${base}?brain=mock&seed=21&fast=1&debug=1`);
  await page.waitForFunction(() => /Flood Ward/.test(document.querySelector('#title h1')?.textContent ?? ''));
  await page.click('#title-new');
  await page.waitForSelector('#map');
  await page.waitForSelector('#dlg:not([hidden])');
  await advanceDialogue(page);
  // Meet Bel (right, then up) and talk freely.
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#dlg:not([hidden])');
  await advanceDialogue(page);
  if (await page.$('#npc-talk')) {
    await page.click('#npc-talk');
    await page.waitForSelector('#talk-input');
    await page.fill('#talk-input', '"Tell me what happened down there."');
    await page.click('#talk-send');
    await page.waitForSelector('#thinking', { state: 'hidden' });
    if (!(await page.$('#talk-done'))) {
      await page.fill('#talk-input', '"Goodbye."');
      await page.click('#talk-send');
    }
    await page.waitForSelector('#talk-done');
    await page.click('#talk-done');
    await page.waitForSelector('#map');
  }
  await page.click('#w-journal');
  await page.waitForSelector('#journal-facts');
  await page.click('#back-hub');
  await page.waitForSelector('#map');
  // Jump to the source and face Gonggong, strong enough to win.
  await page.evaluate(() => {
    const g = window.__game;
    Object.assign(g.run.world, { mapId: 'source', x: 12, y: 9 });
    const p = g.player;
    Object.assign(p.stats, { str: 260, vit: 60, agi: 50 });
    p.level = 20; p.maxHp = p.hp = 900;
  });
  await page.click('#w-journal');
  await page.click('#back-hub');
  await page.waitForFunction(() => window.__game.run.world.mapId === 'source' && !!document.querySelector('#map'));
  await advanceDialogue(page);
  await page.keyboard.press('ArrowUp');
  await page.waitForSelector('#dlg:not([hidden]), #encounter');
  await advanceDialogue(page);
  await page.waitForSelector('#enc-fight');
  await page.click('#enc-fight');
  await autoBattle(page);
  await page.waitForSelector('#results-done');
  await page.click('#results-done');
  await page.waitForTimeout(300);
  await advanceDialogue(page, 60);
  await page.waitForSelector('#finale-input', { timeout: 10000 });
  await page.fill('#finale-input', 'I tell everyone the truth and let the river have its bed back.');
  await page.click('#finale-go');
  await page.waitForSelector('#ending');
  const text = await page.textContent('#ending');
  if (!/End of the prologue/.test(text)) throw new Error('no prologue ending text');
  if (!(await page.$('#coda'))) throw new Error('no coda');
  if (!(await page.$('#verdict'))) throw new Error('no verdict');
  await page.screenshot({ path: require('path').join(__dirname, '..', 'screens', 'story-ending.png'), fullPage: true }).catch(() => {});
};
