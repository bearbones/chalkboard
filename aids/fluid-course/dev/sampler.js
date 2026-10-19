// Kit sampler (dev only, not part of the course): every authoring device and
// kit component on one page, as a visual check and a worked example.
// Open aids/fluid-course/dev/ in the local server.

import { h } from '../src/kit/dom.js';
import { frame, slider, select, toggle, segmented, button, readout, playButton, animate } from '../src/kit/widgets.js';
import { Plot } from '../src/kit/plot.js';
import { FieldView, drawArrows } from '../src/kit/field.js';
import { gradientCss } from '../src/kit/palette.js';

// A worked example of the widget pattern: kernel (pure, testable) + mount.
export function* advectUpwind(u, nu, steps) {
  // Generator kernel: yields after each step so a widget can animate it and
  // a test can drain it.
  const n = u.length;
  const next = new Float64Array(n);
  for (let s = 0; s < steps; s++) {
    for (let j = 0; j < n; j++) next[j] = u[j] - nu * (u[j] - u[(j - 1 + n) % n]);
    u.set(next);
    yield s;
  }
}

function mountPlot(fig, { signal }) {
  const f = frame(fig, { title: 'Upwind advection of a square wave' });
  const plot = new Plot(f.stage, { x: { label: 'x', min: 0, max: 1 }, y: { label: 'u', min: -0.2, max: 1.2 } });
  const N = 100;
  const xs = Float64Array.from({ length: N }, (_, j) => (j + 0.5) / N);
  const init = () => Float64Array.from(xs, (x) => (x > 0.1 && x < 0.35 ? 1 : 0));
  let u = init(),
    t = 0;
  const nu = slider(f.controls, { label: 'CFL ν', min: 0.1, max: 1.2, step: 0.01, value: 0.5, fmt: (v) => v.toFixed(2) });
  const tRead = readout(f.readouts, { label: 'time t' });
  const massRead = readout(f.readouts, { label: 'mass Σu·Δx' });
  const draw = () => {
    const exact = xs.map((x) => {
      const y = (((x - t) % 1) + 1) % 1;
      return y > 0.1 && y < 0.35 ? 1 : 0;
    });
    plot.draw([
      { x: xs, y: exact, color: 'ink', dash: [5, 4], width: 1.5, label: 'exact' },
      { x: xs, y: u, color: 's1', label: 'upwind', points: 2 },
    ]);
    tRead.set(t);
    const m = u.reduce((a, b) => a + b, 0) / N;
    massRead.set(m);
    f.status.textContent = Math.max(...u) > 1.5 ? 'Blowing up: ν > 1 breaks the CFL condition.' : '';
  };
  const loop = animate(fig, () => {
    const gen = advectUpwind(u, nu.value, 1);
    for (const _ of gen);
    t += nu.value / N;
    draw();
  }, { signal });
  playButton(f.controls, loop);
  button(f.controls, { label: 'Reset', onClick: () => ((u = init()), (t = 0), draw()) });
  draw();
}

function mountField(fig, { signal }) {
  const f = frame(fig, { title: 'Field view: drag to paint, arrows show a vortex' });
  const nx = 64,
    ny = 40;
  const view = new FieldView(f.stage, { nx, ny });
  const dye = new Float32Array(nx * ny);
  const u = new Float32Array(nx * ny),
    v = new Float32Array(nx * ny);
  const solid = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const k = i + j * nx,
        dx = i + 0.5 - nx / 2,
        dy = j + 0.5 - ny / 2;
      const r2 = dx * dx + dy * dy;
      u[k] = -dy * Math.exp(-r2 / 150) * 0.4;
      v[k] = dx * Math.exp(-r2 / 150) * 0.4;
      dye[k] = Math.exp(-r2 / 80) * (dx > 0 ? 1 : -1);
      if ((i - 10) ** 2 + (j - 20) ** 2 < 16) solid[k] = 1;
    }
  const mode = segmented(f.controls, { label: 'Colour map', options: [['div', 'diverging'], ['seq', 'sequential']], value: 'div', onChange: () => draw() });
  const arrows = toggle(f.controls, { label: 'arrows', checked: true, onChange: () => draw() });
  const legend = h('div.legend-row', h('div.legend-bar'), h('div.legend-labels', h('span', '−1'), h('span', '0'), h('span', '+1')));
  f.stage.append(legend);
  const draw = () => {
    const m = mode.value;
    view.draw(dye, m === 'div' ? { map: 'div', lo: -1, hi: 1, solid } : { map: 'seq', lo: 0, hi: 1, solid });
    if (arrows.value) view.overlay((ctx, X, Y, pal) => drawArrows(ctx, X, Y, u, v, nx, ny, { stride: 4, scale: 6, pal, solid }));
    legend.firstChild.style.background = gradientCss(m);
  };
  view.redraw = draw;
  view.onDrag(({ gx, gy, inside }) => {
    if (!inside) return;
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const d2 = (i + 0.5 - gx) ** 2 + (j + 0.5 - gy) ** 2;
        dye[i + j * nx] = Math.min(1, dye[i + j * nx] + Math.exp(-d2 / 4) * 0.5);
      }
    draw();
  });
  draw();
}

export const chapter = {
  id: 'sampler',
  title: 'Kit sampler',
  short: 'Sampler',
  blurb: 'Every authoring device and kit component on one page.',
  minutes: 1,
  html: String.raw`
<p class="lead-in">This page shows each device a chapter can use. Inline math like $\mathrm{Re} = UL/\nu$ and $u_j^{n+1}$ sits in the text, and display math is set apart:</p>
$$\class{t-time}{\frac{\partial \mathbf{u}}{\partial t}} + \class{t-adv}{(\mathbf{u}\cdot\nabla)\mathbf{u}} = -\frac{1}{\rho}\nabla p + \nu \nabla^2 \mathbf{u} + \mathbf{f}, \qquad \nabla\cdot\mathbf{u} = 0$$
<div class="eq" id="eq-upwind">$$u_j^{n+1} = u_j^n - \nu\left(u_j^n - u_{j-1}^n\right), \qquad \nu = \frac{a\,\Delta t}{\Delta x}$$<span class="eq-tag">(7.3)</span></div>
<h2 id="asides">Asides</h2>
<aside class="who" data-person="courant">Courant, Friedrichs and Lewy wrote the 1928 paper behind the CFL condition.</aside>
<aside class="note" data-label="Why it matters">A note in the margin of the argument. It can hold math: $\Delta t \le \Delta x / |a|$.</aside>
<aside class="pitfall">Past $\nu = 1$ the upwind scheme amplifies its shortest waves every step. See <a href="#/pathologies">the gallery</a>.</aside>
<aside class="history" data-era="1922">Richardson's forecast factory: 64,000 human computers in a theatre.</aside>
<div class="try"><ol><li>Press <b>Play</b>.</li><li>Drag ν past 1 and watch the wiggles grow.</li></ol></div>
<details class="deeper"><summary>Go deeper: the modified equation</summary><p>Upwind solves $u_t + a u_x = \tfrac{a\Delta x}{2}(1-\nu)\,u_{xx} + \dots$ more accurately than the equation you meant.</p></details>
<p>A glossary term: the <dfn data-term="cfl-sampler">CFL number</dfn>. A link to a sibling aid: <a data-aid="pressure-solver">the pressure solver</a>.</p>
<h2 id="figures">Figures</h2>
<figure data-widget="sampler-plot" class="wide"><figcaption>Dashed: the exact solution. The step count advances at the CFL number you choose.</figcaption></figure>
<figure data-widget="sampler-field"></figure>
<h2 id="quizzes">Questions</h2>
<div data-quiz="q1"></div>
<div data-quiz="q2"></div>
<div data-quiz="q3"></div>
<table><thead><tr><th>Scheme</th><th class="num">Order</th><th>Stable for</th></tr></thead><tbody><tr><td>Upwind</td><td class="num">1</td><td>$0 \le \nu \le 1$</td></tr><tr><td>Lax–Wendroff</td><td class="num">2</td><td>$|\nu| \le 1$</td></tr></tbody></table>
`,
  widgets: { 'sampler-plot': mountPlot, 'sampler-field': mountField },
  quizzes: {
    q1: { type: 'mcq', q: 'Upwind with $\\nu = 1$ is…', choices: ['exact (it shifts by one cell)', 'unstable', 'second order'], answer: 0, explain: 'At $\\nu = 1$, $u_j^{n+1} = u_{j-1}^n$: a pure shift.' },
    q2: { type: 'predict', q: 'What happens at $\\nu = 1.1$?', choices: ['Smearing only', 'Growing wiggles'], answer: 1, explain: 'The amplification factor exceeds 1 at high wavenumbers.' },
    q3: { type: 'num', q: 'Largest stable $\\Delta t$ for $a = 2$, $\\Delta x = 0.01$?', answer: 0.005, unit: 's', explain: '$\\Delta t = \\Delta x / a$.' },
  },
  glossary: { 'cfl-sampler': { term: 'CFL number', def: 'The Courant number $\\nu = a\\Delta t/\\Delta x$: how many cells information crosses per step.' } },
  pathologies: [],
};
