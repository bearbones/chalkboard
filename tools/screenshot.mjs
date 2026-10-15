// Screenshot an aid in headless Chromium, after advancing the solver.
//
//   node tools/screenshot.mjs [--url URL] [--out FILE] [--width 1280] [--height 1000]
//                             [--theme dark|light] [--scenario hot] [--stops N] [--gran 0-7]
//                             [--field auto]
//
// Needs Playwright (`npm i -D playwright && npx playwright install chromium`),
// or PLAYWRIGHT=/path/to/node_modules/playwright to borrow an existing copy.
import { createRequire } from 'node:module';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, k, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[k + 1]]] : acc), []),
);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const url = args.url || 'http://localhost:8765/aids/pressure-solver/index.html';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(args.width || 1280), height: Number(args.height || 1000) },
  deviceScaleFactor: Number(args.dpr || 1),
  colorScheme: args.theme || 'dark',
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url + (args.scenario ? '#' + args.scenario : ''));
await page.waitForFunction(() => window.__chalkboard);
await page.evaluate(async ({ stops, gran, field, scenario }) => {
  const cb = window.__chalkboard;
  if (scenario) {
    document.getElementById('scenario').value = scenario;
    cb.start();
  }
  if (field) {
    document.getElementById('field').value = field;
    document.getElementById('field').dispatchEvent(new Event('change'));
  }
  let left = Number(stops || 0);
  while (left > 0) left -= cb.advance(left, Number(gran ?? 7)) || 0;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}, args);
await page.waitForTimeout(Number(args.wait || 400));
await page.screenshot({ path: args.out || 'screenshot.png', fullPage: args.full !== 'no' });
await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
