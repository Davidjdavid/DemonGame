// Headless runner: serves dist/, runs each e2e/scenarios/*.cjs in its own page. Exits non-zero on failure.
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const { startServer } = await import(path.join(__dirname, '..', 'scripts', 'serve.mjs'));
  const port = 5199;
  const server = await startServer(port);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const dir = path.join(__dirname, 'scenarios');
  const only = process.argv[2];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.cjs') && (!only || f.includes(only))).sort();
  let failed = 0;
  for (const f of files) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const t0 = Date.now();
    try {
      await require(path.join(dir, f))(page, `http://localhost:${port}/`);
      if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
      console.log(`PASS ${f} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
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
