// Load course pages in headless Chromium and report what is broken: script
// errors, TeX errors, figures that failed or never mounted, sideways
// overflow at phone width, and slow animation frames. Optionally pokes every
// control (sliders to both ends, every select option, every button) and
// takes full-page screenshots.
//
//   node tools/check-course.mjs --route advection [--route shocks …] | --all
//        [--base http://localhost:8765/aids/fluid-course/] [--shots DIR]
//        [--widths 390,1280] [--themes light,dark] [--interact] [--frames]
//
// Prints a JSON report; exits 1 if anything is broken. Needs Playwright
// (see tools/screenshot.mjs).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const flag = (k) => argv.includes(`--${k}`);
const routes = argv.flatMap((a, k) => (a === '--route' ? [argv[k + 1]] : []));
const base = opt('base', 'http://localhost:8765/aids/fluid-course/');
const shots = opt('shots', null);
const widths = opt('widths', '390,1280').split(',').map(Number);
const themes = opt('themes', 'light,dark').split(',');

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const browser = await chromium.launch();

if (flag('all')) {
  const page = await browser.newPage();
  await page.goto(base);
  await page.waitForFunction(() => window.__chalkboard?.ready);
  routes.push(...(await page.evaluate(() => window.__chalkboard.course.all.map((c) => c.id))));
  await page.close();
}
if (shots) mkdirSync(shots, { recursive: true });

const report = {};
let broken = false;
for (const route of routes) {
  const r = (report[route] = { errors: [], texErrors: [], figErrors: [], unmounted: [], overflow: [], slowFrames: [], shots: [] });
  for (const width of widths) {
    for (const theme of themes) {
      const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 }, colorScheme: theme });
      const tag = `${width}/${theme}`;
      page.on('pageerror', (e) => r.errors.push(`${tag} pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error' || (m.type() === 'warning' && /TeX error|unknown (person|glossary)/.test(m.text()))) r.errors.push(`${tag} console.${m.type()}: ${m.text()}`);
      });
      await page.goto(`${base}#/${route}`);
      await page.waitForFunction(() => window.__chalkboard?.ready);
      // Walk down so every figure mounts.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) {
          scrollTo(0, y);
          await new Promise((res) => setTimeout(res, 80));
        }
      });
      await page.waitForTimeout(500);
      const found = await page.evaluate(() => {
        const W = document.documentElement.clientWidth;
        const wide = [...document.querySelectorAll('.view *')].filter((el) => {
          if (el.closest('.table-wrap, .sym-orig, pre, math, .lifelines')) return false;
          const b = el.getBoundingClientRect();
          return b.width > 0 && b.right > W + 1;
        });
        return {
          tex: [...document.querySelectorAll('.tex-error')].map((e) => e.textContent.slice(0, 120)),
          fig: [...document.querySelectorAll('.fig-error')].map((e) => `${e.closest('figure')?.dataset.widget}: ${e.textContent}`),
          unmounted: [...document.querySelectorAll('figure[data-widget]:not([data-mounted])')].map((f) => f.dataset.widget),
          overflow: wide.slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} right=${Math.round(el.getBoundingClientRect().right)}`),
          pageWide: document.documentElement.scrollWidth > W + 1,
        };
      });
      r.texErrors.push(...found.tex.map((t) => `${tag}: ${t}`));
      r.figErrors.push(...found.fig.map((t) => `${tag}: ${t}`));
      r.unmounted.push(...found.unmounted.map((t) => `${tag}: ${t}`));
      if (found.pageWide || found.overflow.length) r.overflow.push(`${tag}: page scrolls sideways=${found.pageWide}; ${found.overflow.join('; ')}`);

      if (flag('frames') && theme === themes[0]) {
        const slow = await page.evaluate(async () => {
          const out = [];
          for (const fig of document.querySelectorAll('figure[data-widget]')) {
            fig.scrollIntoView({ block: 'center' });
            await new Promise((res) => setTimeout(res, 300));
            const t = [];
            await new Promise((res) => {
              let last = performance.now();
              const tick = (now) => {
                t.push(now - last);
                last = now;
                if (t.length < 90) requestAnimationFrame(tick);
                else res();
              };
              requestAnimationFrame(tick);
            });
            t.sort((a, b) => a - b);
            const p95 = t[Math.floor(t.length * 0.95)];
            if (p95 > 34) out.push(`${fig.dataset.widget}: p95 frame ${p95.toFixed(0)} ms`);
          }
          return out;
        });
        r.slowFrames.push(...slow.map((s) => `${tag}: ${s}`));
      }

      if (flag('interact') && theme === themes[0]) {
        await page.evaluate(async () => {
          const pause = (ms) => new Promise((res) => setTimeout(res, ms));
          for (const fig of document.querySelectorAll('figure[data-widget]')) {
            fig.scrollIntoView({ block: 'center' });
            await pause(150);
            for (const input of fig.querySelectorAll('input[type=range]')) {
              for (const v of [input.min, input.max, (Number(input.min) + Number(input.max)) / 2]) {
                input.value = v;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                await pause(120);
              }
            }
            for (const sel of fig.querySelectorAll('select')) {
              for (const o of sel.options) {
                sel.value = o.value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                await pause(120);
              }
            }
            for (const b of fig.querySelectorAll('button, input[type=checkbox]')) {
              b.click();
              await pause(120);
            }
            // A drag across any canvas (painting, stirring).
            const cv = fig.querySelector('canvas');
            if (cv) {
              const rc = cv.getBoundingClientRect();
              const ev = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, { clientX: rc.left + x * rc.width, clientY: rc.top + y * rc.height, bubbles: true, pointerId: 1, isPrimary: true, buttons: type === 'pointerup' ? 0 : 1 }));
              ev('pointerdown', 0.3, 0.5);
              for (let k = 1; k <= 8; k++) ev('pointermove', 0.3 + k * 0.05, 0.5 - k * 0.02);
              ev('pointerup', 0.7, 0.34);
            }
            await pause(250);
          }
        });
        await page.waitForTimeout(500);
        const after = await page.evaluate(() => [...document.querySelectorAll('.fig-error')].map((e) => `${e.closest('figure')?.dataset.widget}: ${e.textContent}`));
        r.figErrors.push(...after.map((t) => `${tag} after interaction: ${t}`));
      }

      if (shots) {
        const file = join(shots, `${route}-${width}-${theme}.png`);
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForTimeout(200);
        await page.screenshot({ path: file, fullPage: true });
        r.shots.push(file);
      }
      await page.close();
    }
  }
  for (const k of ['errors', 'texErrors', 'figErrors', 'unmounted', 'overflow']) {
    r[k] = [...new Set(r[k])];
    if (r[k].length) broken = true;
  }
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
process.exit(broken ? 1 : 0);
