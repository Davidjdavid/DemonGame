// Headless playthrough runner. Serves dist/, opens it in Chromium, runs each scenario
// in e2e/scenarios/*.cjs in order. Exits non-zero on the first failure.
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const { startServer } = await import(path.join(__dirname, '..', 'scripts', 'serve.mjs'));
  const port = 5199;
  const server = await startServer(port);
  const browser = await chromium.launch();
  const dir = path.join(__dirname, 'scenarios');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.cjs')).sort();
  let failed = 0;
  for (const f of files) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    try {
      await page.goto(`http://localhost:${port}/`);
      await require(path.join(dir, f))(page);
      const real = errors.filter((e) => !/fonts\.g/.test(e));
      if (real.length) throw new Error('page errors: ' + real.join(' | '));
      console.log(`PASS ${f}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${f}: ${e.message}`);
      fs.mkdirSync(path.join(__dirname, 'screens'), { recursive: true });
      await page.screenshot({ path: path.join(__dirname, 'screens', f.replace('.cjs', '.png')) }).catch(() => {});
    }
    await page.close();
  }
  await browser.close();
  server.close();
  process.exit(failed ? 1 : 0);
})();
