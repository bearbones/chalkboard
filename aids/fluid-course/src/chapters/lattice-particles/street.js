// vortex-street: a D2Q9 lattice-Boltzmann cylinder wake coloured by
// vorticity (lbm.js, preset 'hero': 240 x 72 lattice, uniform inflow,
// periodic top and bottom, cylinder D = 12). Every step is lbm.js step();
// the health and mass numbers are lbm.js health() and totalMass().
//
// data-preset
//   'hero'     the course home page: no controls but play/pause, fills its
//              box, fast-forwards through the start-up (about 1200 steps,
//              inside a per-frame budget) and then runs calmly for ever,
//              rebuilding itself silently if health() ever objects.
//   (none)     Re 150 with the full controls: Re slider, collision/inlet
//              case, a wake probe (v/U three diameters behind the cylinder)
//              with the measured Strouhal number beside Williamson's fit.
//   'steady'   Re 40: the wake settles to two attached eddies.
//   'zou-he'   BGK with a Zou-He inlet near tau = 1/2: blows up in ~200
//              steps; the regularized inlet is the fixed case.

import { h, fmt } from '../../kit/dom.js';
import { frame, slider, select, button, readout, playButton, animate, sliced } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { PRESETS, createPreset, step, setCollision, vorticity, health, totalMass, suggestTau } from '../../sims/lbm.js';
import { CropView, governor, fmtTau, fmtPct } from './common.js';

const HERO = PRESETS.hero;
const D0 = HERO.defaults;
const CASES = HERO.cases;
const CASE_OPTIONS = [
  ['bgk-regularized', 'BGK + regularized inlet'],
  ['bgk-zou-he', 'BGK + Zou–He inlet'],
  ['trt-zou-he', 'TRT + Zou–He inlet'],
  ['trt-regularized', 'TRT + regularized inlet'],
];
const WARM = HERO.onset; // steps before the street is established (Re 150)
const HERO_RATE = 200; // steps per second once warm (one shedding period ~ 3.7 s)
const LAB_RATE = 480;
const RING = 600; // probe samples kept
const EVERY = 5; // steps per probe sample

// Williamson's fit for parallel shedding behind an unbounded cylinder,
// 49 < Re < 178 (Phys. Fluids 31 (1988) 2742).
const williamsonSt = (Re) => -3.3265 / Re + 0.1816 + 1.6e-4 * Re;

export function mountStreet(fig, { signal }) {
  const preset = fig.dataset.preset || '';
  const hero = preset === 'hero';
  const f = frame(fig, { title: hero ? null : 'A cylinder wake on a D2Q9 lattice', wide: !hero });
  const cfg = { Re: preset === 'steady' ? 40 : D0.Re, kase: preset === 'zou-he' ? 'bgk-zou-he' : 'bgk-regularized' };

  // ---- state
  let L = null, m0 = 1, xc = 0, yc = 0, D = D0.D, U = D0.U, probe = 0, blown = false, hstat = null;
  const nx = D0.nx, ny = D0.ny;
  const omega = new Float64Array(nx * ny);
  const shade = new Float64Array(nx * ny);
  const ringT = new Float64Array(RING), ringV = new Float64Array(RING);
  const plotT = new Float64Array(RING), plotV = new Float64Array(RING);
  let ringN = 0, ringK = 0, sub = 0;
  const cross = new Float64Array(8);
  let nCross = 0, armed = false, crossFrom = 0;

  function build() {
    const c = CASES[cfg.kase];
    L = createPreset('hero', { Re: cfg.Re, ...(c ? c.opts : {}) });
    ({ xc, yc, D, U } = L.meta);
    m0 = totalMass(L);
    probe = Math.round(xc + 3 * D) + Math.floor(yc) * nx;
    blown = false;
    hstat = null;
    ringN = ringK = sub = 0;
    resetCrossings();
  }
  function resetCrossings() {
    nCross = 0;
    armed = false;
    crossFrom = L ? L.t : 0;
  }
  // wake probe: v at one cell, straight from the populations
  function probeV() {
    const F = L.f, N = L.N, c = probe;
    const rho = F[c] + F[c + N] + F[c + 2 * N] + F[c + 3 * N] + F[c + 4 * N] + F[c + 5 * N] + F[c + 6 * N] + F[c + 7 * N] + F[c + 8 * N];
    return (F[c + 2 * N] - F[c + 4 * N] + F[c + 5 * N] + F[c + 6 * N] - F[c + 7 * N] - F[c + 8 * N]) / rho;
  }
  function advance(n) {
    for (let s = 0; s < n; s++) {
      step(L, 1);
      if (hero) continue;
      const v = probeV() / U;
      if (v < -0.05) armed = true;
      else if (armed && v > 0) {
        armed = false;
        if (nCross === cross.length) {
          cross.copyWithin(0, 1);
          nCross--;
        }
        cross[nCross++] = L.t;
      }
      if (++sub === EVERY) {
        sub = 0;
        ringT[ringK] = L.t;
        ringV[ringK] = v;
        ringK = (ringK + 1) % RING;
        if (ringN < RING) ringN++;
      }
    }
  }
  // Strouhal number from the last few upward crossings of the probe signal
  function strouhal() {
    if (nCross < 4) return NaN;
    const period = (cross[nCross - 1] - cross[1]) / (nCross - 2);
    return D / (U * period);
  }
  // largest |v|/U over `len` probe samples ending `back` samples ago
  function amplitude(len = 200, back = 0) {
    let a = 0;
    const n = Math.min(ringN - back, len);
    for (let k = 0; k < n; k++) {
      const v = Math.abs(ringV[(ringK - 1 - back - k + 2 * RING) % RING]);
      if (v > a) a = v;
    }
    return a;
  }

  // ---- view
  // the cylinder sits 4 D behind the inlet: a narrow box starts 2.5 D upstream of it
  const focusX = 1.5 * D0.D;
  const view = new CropView(f.stage, {
    nx, ny,
    aspect: hero ? 3.2 : 2.6,
    minHeight: hero ? 170 : 190,
    maxHeight: hero ? 300 : 380,
    focusX,
    label: 'Lattice-Boltzmann simulation of the flow past a cylinder, coloured by vorticity: vortices of alternating sign shed from the cylinder and drift downstream.',
  });

  let plot = null;
  if (!hero) {
    plot = new Plot(f.stage, {
      x: { label: 'time step' },
      y: { label: 'v / U at the probe', min: -1.2, max: 1.2 },
      aspect: 4,
      minHeight: 120,
      maxHeight: 200,
      legend: false,
      label: 'Cross-stream velocity three diameters behind the cylinder against time step: a steady wake gives a flat line, a vortex street a sine wave whose frequency is the Strouhal number.',
    });
  }

  function draw() {
    vorticity(L, omega);
    const inv = D / (2 * U); // squash: tanh(omega D / 2U)
    if (hero) {
      // the home page hides the faint grid-scale ripple (start-up sound
      // waves, the staircase cylinder) below |omega| = 0.4 U/D
      for (let c = 0; c < omega.length; c++) {
        const a = omega[c] * inv, m = Math.abs(a) - 0.2;
        shade[c] = m > 0 ? Math.sign(a) * Math.tanh(1.25 * m) : 0;
      }
    } else for (let c = 0; c < omega.length; c++) shade[c] = Math.tanh(omega[c] * inv);
    view.draw(shade, { map: 'div', solid: L.solid });
    view.overlay((ctx, X, Y, pal, v) => {
      const r = (D / 2) * v.s;
      ctx.beginPath();
      ctx.arc(X(xc), Y(yc), r, 0, 2 * Math.PI);
      ctx.fillStyle = pal.css('solid');
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = pal.css('ink', 0.55);
      ctx.stroke();
      if (!hero) {
        // the probe
        const px = X((probe % nx) + 0.5), py = Y(Math.floor(yc) + 0.5);
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, 2 * Math.PI);
        ctx.lineWidth = 2;
        ctx.strokeStyle = pal.css('accent');
        ctx.stroke();
      }
    });
    if (plot) drawPlot();
  }
  view.redraw = () => L && draw();

  function drawPlot() {
    const n = ringN;
    const start = (ringK - n + RING) % RING;
    for (let k = 0; k < n; k++) {
      plotT[k] = ringT[(start + k) % RING];
      plotV[k] = ringV[(start + k) % RING];
    }
    const t1 = n ? plotT[n - 1] : 1;
    plot.setAxes({ x: { min: Math.max(0, t1 - RING * EVERY), max: Math.max(t1, RING * EVERY) } });
    plot.draw([{ x: plotT.subarray(0, n), y: plotV.subarray(0, n), color: 's1', label: 'v / U', width: 1.8 }]);
  }

  // ---- readouts and status
  const ro = hero
    ? null
    : {
        Re: readout(f.readouts, { label: 'Re = UD/ν', fmt: (v) => fmt(v, 3), title: 'Reynolds number from the free-stream speed U, diameter D and lattice viscosity ν = (τ − ½)/3' }),
        tau: readout(f.readouts, { label: 'τ', fmt: fmtTau, title: 'BGK relaxation time; ν = (τ − ½)/3 in lattice units' }),
        t: readout(f.readouts, { label: 'step', fmt: (v) => String(v), title: 'Lattice time steps since the start' }),
        St: readout(f.readouts, { label: 'St measured', fmt: (v) => (Number.isFinite(v) ? v.toFixed(3) : '–'), title: 'Strouhal number fD/U from the period of the probe signal' }),
        Sw: readout(f.readouts, { label: 'St, Williamson', fmt: (v) => (!Number.isFinite(v) ? 'below onset' : v < 0 ? 'beyond fit' : v.toFixed(3)), title: "Williamson's (1988) fit for an unbounded cylinder, 49 < Re < 178; this lattice is blocked 1/6 and periodic, which raises St a little" }),
        ma: readout(f.readouts, { label: 'max Ma', fmt: (v) => v.toFixed(3), title: 'Largest local Mach number |u|/c_s, c_s = 1/√3; health() warns above 0.3' }),
        mass: readout(f.readouts, { label: 'mass drift', fmt: (v) => fmtPct(v, 2), title: 'Total mass relative to the start' }),
      };

  function report() {
    hstat = health(L);
    const drift = totalMass(L) / m0 - 1;
    if (hero) {
      if (!hstat.ok || Math.abs(drift) > 0.01) {
        build(); // start again quietly
        warm = 0;
      }
      return;
    }
    const St = strouhal(), amp = amplitude();
    ro.Re.set(L.meta.Re);
    ro.tau.set(L.tau);
    ro.t.set(L.t);
    ro.St.set(amp > 0.05 ? St : NaN);
    ro.Sw.set(cfg.Re < 49 ? NaN : cfg.Re > 178 ? -1 : williamsonSt(cfg.Re));
    ro.ma.set(hstat.maxMach, hstat.warn ? 'bad' : '');
    ro.mass.set(drift, Math.abs(drift) > 0.01 ? 'bad' : '');
    if (!hstat.ok) {
      blown = true;
      loop.pause();
      f.status.textContent = `Blew up at step ${L.t} (${hstat.reason}). ${CASES[cfg.kase]?.note || ''}`;
      return;
    }
    // compare the last 1000 steps with the 1000 before
    const prev = ringN >= 400 ? amplitude(200, 200) : NaN;
    const Re = fmt(cfg.Re, 3);
    if (L.t < 400) f.status.textContent = `Starting: the flow is settling round the cylinder (Re ${Re}).`;
    else if (amp < 0.02 && ringN >= 300) f.status.textContent = `Steady wake: two attached eddies and no shedding at Re ${Re} (the onset is near Re 47).`;
    else if (amp < 0.85 * prev) f.status.textContent = `The disturbance is dying away (probe swing ${amp.toFixed(2)} U and falling): below the onset, near Re 47, the wake heads for a steady state.`;
    else if (Number.isFinite(St) && amp > 0.05) f.status.textContent = `Shedding: vortices of alternating sign, St = ${St.toFixed(3)} at Re ${Re}.`;
    else f.status.textContent = `The wake is starting to sway (step ${L.t}).`;
  }

  // ---- loop
  const gov = governor({ budgetMs: hero ? 5 : 6, guess: 0.6 });
  let acc = 0, frames = 0, warm = 0;
  const loop = animate(
    fig,
    (dt) => {
      if (blown) return;
      let want;
      if (hero && warm < WARM) want = 1e9; // fast-forward through the start-up, budget permitting
      else {
        acc += dt * (hero ? HERO_RATE : LAB_RATE);
        want = Math.floor(acc);
      }
      const n = gov.fit(want);
      if (!(hero && warm < WARM)) acc = Math.min(acc - n, 4);
      const t0 = performance.now();
      advance(n);
      gov.record(n, performance.now() - t0);
      warm += n;
      draw();
      if (!hero || ++frames % 30 === 0) report();
    },
    { signal },
  );

  // ---- controls
  if (hero) {
    playButton(f.controls, loop, { label: 'Play' });
    f.controls.append(
      h(
        'a',
        { href: '#/lattice-particles/vortex-street', style: 'color: var(--muted); font-size: 0.88rem; margin-left: auto; align-self: center;' },
        'A von Kármán vortex street, computed live by the lattice-Boltzmann method · chapter 13 →',
      ),
    );
    f.controls.style.alignItems = 'center';
  } else {
    playButton(f.controls, loop, { label: 'Run' });
    button(f.controls, { label: 'Reset', onClick: () => restart() });
    slider(f.controls, {
      label: 'Reynolds number Re',
      min: 40,
      max: 200,
      step: 1,
      value: cfg.Re,
      fmt: (v) => String(Math.round(v)),
      onInput: (v) => {
        cfg.Re = v;
        if (!L) return;
        setCollision(L, { tau: suggestTau(v, U, D) });
        L.meta.Re = v;
        resetCrossings();
        if (blown) return;
        report();
      },
    });
    select(f.controls, {
      label: 'Collision and inlet',
      options: CASE_OPTIONS,
      value: cfg.kase,
      onChange: (v) => {
        cfg.kase = v;
        restart();
        loop.play();
      },
    });
  }
  function restart() {
    build();
    acc = 0;
    warm = 0;
    draw();
    if (!hero) report();
  }

  loop.onChange((playing) => {
    if (playing && blown) restart();
  });
  build();
  draw();
  if (!hero) report();
  // Under reduced motion the loop does not start: fast-forward once to a
  // developed street in the background and show that still frame.
  if (hero && !loop.playing) {
    const gen = (function* () {
      while (warm < WARM + 300) {
        advance(10);
        warm += 10;
        yield;
      }
    })();
    sliced(gen, { budgetMs: 6, signal })
      .then(() => draw())
      .catch(() => {});
  }
  return () => {
    loop.destroy();
    view.destroy();
    plot?.box.destroy();
  };
}
