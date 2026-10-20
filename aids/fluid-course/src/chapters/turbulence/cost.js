// turbulence-cost: what a direct numerical simulation of each example flow
// would cost (dnsCost in src/sims/turbulence.js, with its stated
// assumptions: eps = U^3/L, a box 4 L across, dx = 2 eta, 10 large-eddy
// times, CFL 0.5, 1000 flops per point per step). Log-scale bars of grid
// points, time steps or wall time on a chosen machine, for the kernel's
// EXAMPLE_FLOWS and for "your flow" at a Reynolds number you choose.
// Markers: the largest grid run so far (32768^3, Yeung et al. 2025) and,
// for wall time, a day, a year and the age of the universe.
//
// data-preset: 'default' (Re = 10^5, wall time on a petaflop machine).

import { h } from '../../kit/dom.js';
import { frame, slider, select, segmented, readout, canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { dnsCost, EXAMPLE_FLOWS } from '../../sims/turbulence.js';
import { presetFor, num, duration, pow10, label } from './common.js';

const PRESETS = {
  default: { re: 1e5, q: 'seconds', machine: 'peta' },
  record: { re: 4e5, q: 'points', machine: 'peta' },
};
// Sustained flop rates, all assumptions: a pseudo-spectral code reaches a
// modest fraction of a machine's peak.
const MACHINES = {
  laptop: { name: 'a laptop (10¹¹ flop/s)', rate: 1e11 },
  peta: { name: 'a petaflop machine (10¹⁵ flop/s)', rate: 1e15 },
  exa: { name: 'an exaflop machine at full speed (10¹⁸ flop/s)', rate: 1e18 },
};
const QUANTITIES = [
  ['points', 'grid points'],
  ['steps', 'time steps'],
  ['seconds', 'wall time'],
];
const RECORD = 32768 ** 3; // Yeung et al., Comput. Phys. Commun. 306 (2025) 109364
const DAY = 86400;
const YEAR = 3.156e7;
const UNIVERSE = 13.8e9 * YEAR;

export function mountCost(fig) {
  const pre = presetFor(fig, PRESETS);
  const cfg = { re: pre.re, q: pre.q, machine: pre.machine };
  const f = frame(fig, { title: 'The bill for resolving every eddy', wide: true });
  const box = canvasBox(f.stage, { height: 330, label: 'Horizontal log-scale bars of the cost of a direct numerical simulation for six flows' });
  const legendNote = h('p.cost-note', { 'aria-hidden': 'true' });
  f.stage.append(legendNote);

  const reSl = slider(f.controls, { label: 'Your flow: Re', min: 1e2, max: 1e9, log: true, value: cfg.re, fmt: (v) => num(v, 2), onInput: (v) => ((cfg.re = v), show()) });
  segmented(f.controls, { label: 'Show', options: QUANTITIES, value: cfg.q, onChange: (v) => ((cfg.q = v), show()) });
  select(f.controls, { label: 'Machine (sustained rate, assumed)', options: Object.entries(MACHINES).map(([k, m]) => [k, m.name]), value: cfg.machine, onChange: (v) => ((cfg.machine = v), show()) });

  const rRe = readout(f.readouts, { label: 'Re = UL/ν' });
  const rRatio = readout(f.readouts, { label: 'L/η ~ Re^¾' });
  const rSide = readout(f.readouts, { label: 'points per side N' });
  const rPts = readout(f.readouts, { label: 'grid points N³ ~ Re^(9/4)' });
  const rSteps = readout(f.readouts, { label: 'time steps ~ Re^¾' });
  const rFlops = readout(f.readouts, { label: 'flops ~ Re³' });
  const rTime = readout(f.readouts, { label: 'wall time' });

  // Rows: the example flows, then the reader's flow (L = 1, U = 1, nu = 1/Re).
  const rows = EXAMPLE_FLOWS.map((fl) => ({ name: fl.name, note: fl.note, c: dnsCost({ L: fl.L, U: fl.U, nu: fl.nu }) }));
  const mine = { name: 'Your flow', note: '', c: null, mine: true };
  rows.push(mine);

  const value = (c) => (cfg.q === 'points' ? c.points : cfg.q === 'steps' ? c.steps : (c.flops / MACHINES[cfg.machine].rate));
  const fmtValue = (v) => (cfg.q === 'seconds' ? duration(v) : num(v, 2));

  function draw() {
    const { ctx, width: W, height: H } = box;
    const pal = palette();
    box.clear();
    const padL = 8, padR = 12, top = 6, bottom = 26;
    const rowH = (H - top - bottom) / rows.length;
    let lo = Infinity, hi = -Infinity;
    for (const r of rows) {
      const v = value(r.c);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const marks = cfg.q === 'points' ? [[RECORD, 'largest DNS, 32768³']] : cfg.q === 'seconds' ? [[DAY, '1 day'], [YEAR, '1 year'], [UNIVERSE, 'age of the universe']] : [];
    for (const [v] of marks) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const e0 = Math.floor(Math.log10(lo)) - 1;
    const e1 = Math.ceil(Math.log10(hi)) + 1;
    const X = (v) => padL + ((Math.log10(v) - e0) / (e1 - e0)) * (W - padL - padR);
    // decade grid
    ctx.lineWidth = 1;
    const stride = Math.max(1, Math.ceil((e1 - e0) / Math.max(3, Math.floor(W / 64))));
    for (let e = e0; e <= e1; e++) {
      const px = Math.round(X(10 ** e)) + 0.5;
      ctx.strokeStyle = pal.css('grid');
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, H - bottom);
      ctx.stroke();
      if ((e - e0) % stride === 0) label(ctx, pal, pow10(10 ** e), px, H - bottom + 5, { align: 'center', base: 'top' });
    }
    // bars
    rows.forEach((r, i) => {
      const y = top + i * rowH;
      const v = value(r.c);
      const barY = y + 17;
      const barH = Math.max(6, rowH - 22);
      ctx.fillStyle = pal.css(r.mine ? 's2' : 's1', r.mine ? 0.9 : 0.75);
      ctx.fillRect(padL, barY, Math.max(1, X(v) - padL), barH);
      const text = `${r.name}: ${fmtValue(v)}`;
      label(ctx, pal, text, padL, y + 15, { color: 'ink', base: 'bottom', size: 12.5 });
    });
    // markers
    for (const [v, text] of marks) {
      const px = Math.round(X(v)) + 0.5;
      ctx.save();
      ctx.strokeStyle = pal.css('accent', 0.95);
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, H - bottom);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(px - 3, H - bottom - 4);
      ctx.rotate(-Math.PI / 2);
      label(ctx, pal, text, 0, 0, { color: 'accent', base: 'bottom', size: 11 });
      ctx.restore();
    }
  }

  function show() {
    mine.c = dnsCost({ L: 1, U: 1, nu: 1 / cfg.re });
    const c = mine.c;
    const sec = c.flops / MACHINES[cfg.machine].rate;
    rRe.set(num(c.Re, 3));
    rRatio.set(num(1 / c.eta, 3));
    rSide.set(num(c.perSide, 3));
    rPts.set(num(c.points, 2), c.points > RECORD ? 'bad' : 'good');
    rSteps.set(num(c.steps, 2));
    rFlops.set(num(c.flops, 2));
    rTime.set(duration(sec), sec > YEAR ? 'bad' : '');
    legendNote.textContent = `Bars on a log scale of ${cfg.q === 'points' ? 'grid points' : cfg.q === 'steps' ? 'time steps' : 'seconds'}. Assumed: ε = U³/L, a box 4L across, Δx = 2η, 10 large-eddy times at CFL 0.5, 1000 flops per point per step${cfg.q === 'seconds' ? `, on ${MACHINES[cfg.machine].name}` : ''}.`;
    const side = Math.round(c.perSide).toLocaleString('en-GB');
    const where = c.points > RECORD ? 'more than the largest DNS yet run (32768³)' : 'within reach of the largest DNS runs';
    const msg = `Re = ${num(c.Re, 2)} needs about ${side} points per side, ${where}, and ${duration(sec)} on ${MACHINES[cfg.machine].name}.`;
    if (f.status.textContent !== msg) f.status.textContent = msg;
    draw();
  }

  box.onResize(draw);
  show();
}
