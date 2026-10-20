// Figure similarity-moody: the Moody chart (laminar 64/Re, Blasius,
// Colebrook-White for several roughnesses) and, beside it, the iteration
// that solves the implicit Colebrook equation at the probe point: Newton
// against fixed point, with the kernel's safeguarded steps marked.

import { fmt, sci } from '../../kit/dom.js';
import { frame, slider, select, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { colebrook, frictionColebrook, frictionLaminar, frictionBlasius, frictionHaaland, frictionFactor } from '../../sims/similarity.js';
import { drain } from '../../sims/util.js';

const ROUGHNESS = [0, 1e-5, 1e-4, 1e-3, 0.01, 0.05];
const RR_LABEL = (rr) => (rr === 0 ? 'smooth (0)' : String(rr));
const FLOOR = 1e-16; // residuals below this are drawn at it

const PRESETS = {
  smooth: { rr: 0, Re: 1e5, f0: 0.02 },
  rough: { rr: 0.01, Re: 1e6, f0: 0.02 },
  transition: { rr: 0, Re: 3000, f0: 0.02 },
  'bad-start': { rr: 0, Re: 1e4, f0: 1e-10 },
};

function logspace(a, b, n) {
  const out = new Float64Array(n);
  const la = Math.log10(a);
  const lb = Math.log10(b);
  for (let i = 0; i < n; i++) out[i] = 10 ** (la + ((lb - la) * i) / (n - 1));
  return out;
}

function curve(xs, fn) {
  const ys = new Float64Array(xs.length);
  for (let i = 0; i < xs.length; i++) ys[i] = fn(xs[i]);
  return ys;
}

// Drain one Colebrook run, keeping the trace for the plot.
function trace(Re, rr, method, f0) {
  const ks = [];
  const res = [];
  const guarded = [];
  const out = drain(colebrook(Re, rr, { method, f0 }), (e) => {
    ks.push(e.k);
    res.push(Math.max(e.residual, FLOOR));
    if (e.safeguard) guarded.push(e.k);
  });
  return { ks, res, guarded, out };
}

export function mountSimilarityMoody(fig) {
  const P = { ...(PRESETS[fig.dataset.preset] || PRESETS.smooth) };
  const { stage, controls, readouts, status } = frame(fig, { title: 'Pipe friction and the Colebrook iteration', wide: true });
  stage.classList.add('cols');

  // Curves that never change: laminar, Blasius, Colebrook family.
  const reLam = logspace(500, 2300, 40);
  const reTr = logspace(2300, 4000, 20);
  const reTurb = logspace(4000, 1e8, 160);
  const reBl = logspace(4000, 1e5, 40);
  const lam = curve(reLam, frictionLaminar);
  const bl = curve(reBl, frictionBlasius);
  const family = ROUGHNESS.map((rr) => ({ rr, turb: curve(reTurb, (Re) => frictionColebrook(Re, rr)), tr: curve(reTr, (Re) => frictionColebrook(Re, rr)) }));

  const chart = new Plot(stage, {
    x: { label: 'Reynolds number Re', min: 500, max: 1e8, log: true, fmt: (v) => sci(v, 3) },
    y: { label: 'friction factor f', min: 0.005, max: 0.15, log: true, fmt: (v) => fmt(v, 4) },
    aspect: 1.25,
    label: 'Moody chart: friction factor against Reynolds number, log axes',
  });
  const iter = new Plot(stage, {
    x: { label: 'iteration k', min: 0, max: 26, fmt: (v) => String(Math.round(v)) },
    y: { label: 'residual |R(x_k)|', min: FLOOR, max: 1e3, log: true, fmt: (v) => sci(v, 2) },
    aspect: 1.25,
    label: 'Colebrook iteration: residual against iteration number for Newton and fixed point',
  });

  select(controls, { label: 'Relative roughness ε/D', options: ROUGHNESS.map((rr) => [String(rr), RR_LABEL(rr)]), value: String(P.rr), onChange: (v) => ((P.rr = Number(v)), update()) });
  slider(controls, { label: 'Probe Re', min: 500, max: 1e8, log: true, value: P.Re, fmt: (v) => sci(v, 2), onInput: (v) => ((P.Re = v), update()) });
  slider(controls, { label: 'Starting guess f₀', min: 1e-12, max: 1, log: true, value: P.f0, fmt: (v) => sci(v, 2), onInput: (v) => ((P.f0 = v), update()) });

  const rRegime = readout(readouts, { label: 'regime' });
  const rF = readout(readouts, { label: 'f from the chart' });
  const rHa = readout(readouts, { label: 'Haaland vs Colebrook' });
  const rBl = readout(readouts, { label: 'Blasius vs Colebrook' });
  const rNewton = readout(readouts, { label: 'Newton iterations' });
  const rFixed = readout(readouts, { label: 'fixed-point iterations' });
  const rGuard = readout(readouts, { label: 'safeguarded steps' });
  const rRate = readout(readouts, { label: 'fixed-point factor |g′|' });

  const pct = (a, b) => `${a >= b ? '+' : '−'}${Math.abs((100 * (a - b)) / b).toFixed(2)}%`;

  function update() {
    const { rr, Re, f0 } = P;
    const chartF = frictionFactor(Re, rr);
    const sel = family.find((c) => c.rr === rr);

    chart.draw(
      [
        ...family
          .filter((c) => c.rr !== rr)
          .map((c) => ({ x: reTurb, y: c.turb, color: 'muted', alpha: 0.35, width: 1.2, hover: false, legend: false })),
        { x: reLam, y: lam, color: 's1', label: 'laminar 64/Re' },
        { x: reBl, y: bl, color: 's3', dash: [7, 5], label: 'Blasius (smooth)' },
        { x: reTr, y: sel.tr, color: 's2', dash: [2, 4], width: 2, hover: false, legend: false },
        { x: reTurb, y: sel.turb, color: 's2', width: 2.6, label: `Colebrook, ε/D = ${RR_LABEL(rr)}` },
      ],
      {
        under(ctx, tx, ty, area, pal) {
          ctx.fillStyle = pal.css('muted', 0.13);
          ctx.fillRect(tx(2300), area.y0, tx(4000) - tx(2300), area.y1 - area.y0);
          ctx.strokeStyle = pal.css('grid');
          ctx.lineWidth = 1;
          ctx.fillStyle = pal.css('muted');
          ctx.font = '11px "Atkinson Hyperlegible", system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          for (const v of [0.008, 0.02, 0.03, 0.04, 0.06]) {
            const y = Math.round(ty(v)) + 0.5;
            ctx.beginPath();
            ctx.moveTo(area.x0, y);
            ctx.lineTo(area.x1, y);
            ctx.stroke();
            ctx.fillText(String(v), area.x0 + 3, y - 7);
          }
          ctx.save();
          ctx.translate(tx(3000) + 4, area.y0 + 8);
          ctx.rotate(Math.PI / 2);
          ctx.fillText('transition', 0, 0);
          ctx.restore();
        },
        extra(ctx, tx, ty, area, pal) {
          const x = tx(Re);
          const y = ty(chartF.f);
          ctx.strokeStyle = pal.css('accent');
          ctx.fillStyle = pal.css('board');
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        },
      },
    );

    rRegime.set(chartF.regime, chartF.regime === 'transitional' ? 'bad' : '');
    rF.set(fmt(chartF.f, 4));

    if (Re < 2300) {
      iter.draw([], {});
      for (const r of [rHa, rBl, rNewton, rFixed, rGuard, rRate]) r.set('—');
      status.textContent = `Laminar (Re = ${sci(Re, 2)}): the chart uses the exact f = 64/Re, so there is nothing to iterate. Move the probe past 2300.`;
      return;
    }

    const N = trace(Re, rr, 'newton', f0);
    const F = trace(Re, rr, 'fixed-point', f0);
    const fC = N.out.f;
    const fH = frictionHaaland(Re, rr);
    rHa.set(pct(fH, fC));
    rBl.set(rr === 0 && Re >= 4000 && Re <= 1e5 ? pct(frictionBlasius(Re), fC) : 'out of range');
    rNewton.set(String(N.out.iterations));
    rFixed.set(String(F.out.iterations));
    const guards = N.out.safeguards + F.out.safeguards;
    rGuard.set(guards ? `${N.out.safeguards} Newton, ${F.out.safeguards} fixed point` : 'none', guards ? 'bad' : 'good');
    const a = rr / 3.7;
    const b = 2.51 / Re;
    const g = (2 / Math.LN10) * (b / (a + b * N.out.x));
    rRate.set(fmt(g, 3));

    iter.setAxes({ x: { max: Math.max(12, N.out.iterations, F.out.iterations) + 1 } });
    iter.draw(
      [
        { x: N.ks, y: N.res, color: 's1', points: 3.5, label: 'Newton' },
        { x: F.ks, y: F.res, color: 's2', dash: [6, 4], points: 3, label: 'fixed point' },
      ],
      {
        extra(ctx, tx, ty, area, pal) {
          ctx.strokeStyle = pal.css('bad');
          ctx.lineWidth = 2;
          for (const T of [N, F]) {
            for (const k of T.guarded) {
              const x = tx(k);
              const y = ty(T.res[T.ks.indexOf(k)]);
              ctx.beginPath();
              ctx.arc(x, y, 8, 0, 2 * Math.PI);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(x - 5, y - 5);
              ctx.lineTo(x + 5, y + 5);
              ctx.moveTo(x + 5, y - 5);
              ctx.lineTo(x - 5, y + 5);
              ctx.stroke();
            }
          }
        },
      },
    );

    const where = chartF.regime === 'transitional' ? ' This Re is in the transition band: the chart prints the Colebrook value, but no correlation is reliable here.' : '';
    if (guards) {
      const fate = rr === 0 ? 'For a smooth pipe a plain iteration then takes the logarithm of a negative number and returns NaN.' : 'A plain iteration may stumble back by luck or may take the logarithm of a negative number and return NaN, depending on the numbers.';
      status.textContent = `From f₀ = ${sci(f0, 2)}, ${guards} step${guards > 1 ? 's' : ''} (marked ⊗) would have landed at x = 1/√f ≤ 0, which has no physical meaning. ${fate} The kernel halves x instead and still converges to f = ${fmt(fC, 5)}, in ${N.out.iterations} Newton and ${F.out.iterations} fixed-point steps.${where}`;
    } else {
      status.textContent = `Both reach f = ${fmt(fC, 5)}. Newton needs ${N.out.iterations} steps: the residual roughly squares each time. Fixed point needs ${F.out.iterations}: each step shrinks the error by about ${fmt(g, 2)}.${where}`;
    }
  }

  update();
  return () => {
    chart.destroy();
    iter.destroy();
  };
}
