// lattice-particles-tau: what happens as tau -> 1/2. A periodic double shear
// layer (lbm.js preset 'shear-layer', Minion & Brown's thin layer) rolls up
// into vortices; the viscosity nu = (tau - 1/2)/3 is set by the slider,
// which works on a log scale of tau - 1/2. lbm.js health() watches every
// cell each frame: Mach number, density range, negative populations.
//
// data-preset: '' (n = 64, tau = 0.51, healthy) or one of the preset's
// cases: 'bgk-coarse' (blows up), 'bgk-coarse-stable', 'trt-coarse' (TRT is
// not more robust here), 'bgk-refined' (the same tau on a finer grid).

import { fmt } from '../../kit/dom.js';
import { frame, slider, segmented, select, readout, playButton, button, animate } from '../../kit/widgets.js';
import { FieldView } from '../../kit/field.js';
import { PRESETS, createPreset, step, setCollision, vorticity, health, viscosity } from '../../sims/lbm.js';
import { governor, fmtTau } from './common.js';

const P = PRESETS['shear-layer'];
const CASE_OPTIONS = [['', 'n 64, τ 0.51 (default)'], ...Object.entries(P.cases).map(([k, c]) => [k, c.name])];
const RATE = 1500; // steps per second wanted

export function mountTau(fig, { signal }) {
  const preset = P.cases[fig.dataset.preset] ? fig.dataset.preset : '';
  const f = frame(fig, { title: 'Pushing τ towards ½' });
  const cfg = { n: P.defaults.n, tau: P.defaults.tau, collision: P.defaults.collision };
  function applyCase(k) {
    const c = P.cases[k];
    Object.assign(cfg, { n: P.defaults.n, tau: P.defaults.tau, collision: P.defaults.collision }, c ? c.opts : {});
  }
  applyCase(preset);

  let L = null, view = null, omega = null, shade = null, hs = null, blown = false, scale = 1;
  function build() {
    L = createPreset('shear-layer', { n: cfg.n, tau: cfg.tau, collision: cfg.collision });
    if (!view || view.nx !== cfg.n) {
      if (!view) view = new FieldView(f.stage, { nx: cfg.n, ny: cfg.n, smooth: true, maxHeight: 400, minHeight: 220, label: 'Vorticity of a periodic double shear layer on the lattice: two thin layers roll up into vortices, or, when tau is too close to one half for the grid, break into grid-scale noise and blow up.' });
      else view.resize(cfg.n, cfg.n);
      view.redraw = draw;
      omega = new Float64Array(cfg.n * cfg.n);
      shade = new Float64Array(cfg.n * cfg.n);
    }
    scale = 1 / (0.3 * (P.defaults.U * P.defaults.kappa) / cfg.n);
    blown = false;
    hs = health(L);
  }
  function draw() {
    if (!L) return;
    vorticity(L, omega);
    for (let c = 0; c < omega.length; c++) shade[c] = Math.tanh(omega[c] * scale);
    view.draw(shade, { map: 'div', lo: -1, hi: 1 });
  }

  // ---- readouts
  const ro = {
    tau: readout(f.readouts, { label: 'τ', fmt: fmtTau, title: 'Relaxation time' }),
    nu: readout(f.readouts, { label: 'ν = (τ − ½)/3', fmt: (v) => fmt(v, 2), title: 'Lattice kinematic viscosity' }),
    Re: readout(f.readouts, { label: 'Re = Un/ν', fmt: (v) => fmt(v, 3), title: 'Reynolds number on the box side n with the layer speed U = 0.1' }),
    t: readout(f.readouts, { label: 'step', fmt: (v) => String(v) }),
    ma: readout(f.readouts, { label: 'max Ma', fmt: (v) => (Number.isFinite(v) ? v.toFixed(3) : 'NaN'), title: 'Largest local Mach number; health() warns above 0.3' }),
    rho: readout(f.readouts, { label: 'ρ range', title: 'Smallest and largest density on the lattice; health() fails outside 0.5-1.5' }),
    neg: readout(f.readouts, { label: 'negative f', fmt: (v) => String(v), title: 'Populations below zero: an early symptom near τ = ½' }),
  };
  function report() {
    hs = health(L);
    const nu = viscosity(L.tau);
    ro.tau.set(L.tau);
    ro.nu.set(nu);
    ro.Re.set((P.defaults.U * cfg.n) / nu);
    ro.t.set(L.t);
    ro.ma.set(hs.maxMach, hs.warn ? 'bad' : '');
    ro.rho.set(Number.isFinite(hs.minRho) ? `${hs.minRho.toFixed(3)}–${hs.maxRho.toFixed(3)}` : 'NaN', hs.ok ? '' : 'bad');
    ro.neg.set(hs.negative, hs.negative ? 'bad' : '');
    const label = `${cfg.collision.toUpperCase()}, n = ${cfg.n}, τ = ${fmtTau(L.tau)}`;
    if (!hs.ok) {
      blown = true;
      loop.pause();
      f.status.textContent = `${label}: blew up at step ${L.t} (${hs.reason}). Raise τ, or refine the grid.`;
    } else if (hs.warn) f.status.textContent = `${label}: step ${L.t}, warning: ${hs.reason}.`;
    else f.status.textContent = `${label}: step ${L.t}, healthy.`;
  }

  // ---- loop
  const gov = governor({ budgetMs: 6, guess: 0.1 });
  let acc = 0;
  const loop = animate(
    fig,
    (dt) => {
      if (blown) return;
      acc += dt * RATE;
      const n = gov.fit(Math.floor(acc));
      acc = Math.min(acc - n, 50);
      const t0 = performance.now();
      // check health every 10 steps so a blow-up stops near where it starts
      for (let s = 0; s < n; s += 10) {
        step(L, Math.min(10, n - s));
        if (!health(L).ok) break;
      }
      gov.record(n, performance.now() - t0);
      draw();
      report();
    },
    { signal },
  );
  loop.onChange((playing) => {
    if (playing && blown) restart();
  });

  // ---- controls
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Reset', onClick: () => restart() });
  const tauSl = slider(f.controls, {
    label: 'τ − ½ (log scale)',
    min: 0.0005,
    max: 0.1,
    log: true,
    value: cfg.tau - 0.5,
    fmt: (v) => `τ = ${fmtTau(0.5 + v)}`,
    onInput: (v) => {
      cfg.tau = 0.5 + v;
      if (L && !blown) {
        setCollision(L, { tau: cfg.tau });
        report();
      }
    },
  });
  const nSeg = segmented(f.controls, {
    label: 'Lattice n × n',
    options: [['32', '32'], ['64', '64']],
    value: String(cfg.n),
    onChange: (v) => {
      cfg.n = Number(v);
      restart();
    },
  });
  const colSeg = segmented(f.controls, {
    label: 'Collision',
    options: [['bgk', 'BGK'], ['trt', 'TRT (Λ = ¼)']],
    value: cfg.collision,
    onChange: (v) => {
      cfg.collision = v;
      restart();
    },
  });
  select(f.controls, {
    label: 'Compare',
    options: CASE_OPTIONS,
    value: preset,
    onChange: (k) => {
      applyCase(k);
      tauSl.set(cfg.tau - 0.5, { silent: true });
      nSeg.set(String(cfg.n), { silent: true });
      colSeg.set(cfg.collision, { silent: true });
      restart();
      loop.play();
      const c = P.cases[k];
      if (c) f.status.textContent = c.note;
    },
  });

  function restart() {
    build();
    acc = 0;
    draw();
    report();
  }
  build();
  draw();
  report();
  return () => {
    loop.destroy();
    view.destroy();
  };
}
