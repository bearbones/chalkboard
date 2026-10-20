// lattice-particles-mach: the compressibility error of the lattice Boltzmann
// method. Taylor-Green vortices (lbm.js preset 'taylor-green', n = 32,
// tau = 0.8, BGK) decay at a rate fixed by the viscosity; the measured rate
// misses it by an amount that grows like Ma^2. Each point is one short run:
// 10 steps to pass the start-up transient, then the energy decay rate over
// half an e-folding (the method of tests/fluid-course/sims-lbm.test.js).
// The error at U = 0.005 (Ma < 0.01) is subtracted as the baseline, so what
// is left is the part that depends on the Mach number.

import { frame, slider, readout, sliced } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { createPreset, step, kineticEnergy, health } from '../../sims/lbm.js';

const N = 32, TAU = 0.8;
const US = [0.02, 0.03, 0.04, 0.06, 0.08, 0.11, 0.16, 0.22, 0.3, 0.4];
const SQ3 = Math.sqrt(3);

// relative error of the measured Taylor-Green energy decay rate
export function tgRateError(U) {
  const L = createPreset('taylor-green', { n: N, tau: TAU, U, collision: 'bgk' });
  step(L, 10);
  const E1 = kineticEnergy(L), t1 = L.t;
  const T = Math.max(20, Math.round(0.5 / L.meta.rate));
  step(L, T);
  const E2 = kineticEnergy(L);
  const rate = -Math.log(E2 / E1) / (L.t - t1);
  return { err: rate / L.meta.rate - 1, h: health(L) };
}

export function mountMach(fig, { signal }) {
  const f = frame(fig, { title: 'The price of a finite Mach number' });
  const base = tgRateError(0.005).err;
  let done = 0;
  const ma = new Float64Array(US.length), ex = new Float64Array(US.length);
  // Ma^2 reference through the middle point
  const kRef = 4;
  let cRef = 0.19;
  const refX = [0.02, 1], refY = [cRef * 0.0004, cRef];
  const warnX = [0.3, 0.3], warnY = [1e-5, 1];
  const selX = [0], selY = [0];

  const plot = new Plot(f.stage, {
    x: { label: 'Mach number Ma = U/c_s', min: 0.02, max: 1, log: true },
    y: { label: '|extra error in the decay rate|', min: 1e-4, max: 0.2, log: true },
    aspect: 1.7,
    label: 'Log-log plot of the extra relative error in the Taylor-Green decay rate against Mach number: the points follow a line of slope two, the Ma squared law.',
  });
  const ro = {
    U: readout(f.readouts, { label: 'U (lattice)', fmt: (v) => v.toFixed(3) }),
    Ma: readout(f.readouts, { label: 'Ma = U√3', fmt: (v) => v.toFixed(3), title: 'Mach number with the lattice sound speed c_s = 1/√3' }),
    err: readout(f.readouts, { label: 'rate error', fmt: (v) => `${(100 * v).toFixed(2)}%`, title: 'Relative error of the measured energy decay rate, baseline included' }),
    ex: readout(f.readouts, { label: 'extra error', fmt: (v) => `${(100 * v).toFixed(2)}%`, title: 'The same minus its value at U = 0.005' }),
    pk: readout(f.readouts, { label: 'peak Ma in run', fmt: (v) => v.toFixed(3), title: 'health(): largest local Mach number after the run' }),
  };
  let curU = 0.08;
  function show(U) {
    curU = U;
    const r = tgRateError(U);
    selX[0] = U * SQ3;
    selY[0] = Math.max(1e-6, Math.abs(r.err - base));
    ro.U.set(U);
    ro.Ma.set(U * SQ3);
    ro.err.set(r.err);
    ro.ex.set(r.err - base, Math.abs(r.err - base) > 0.01 ? 'bad' : '');
    ro.pk.set(r.h.maxMach, r.h.warn ? 'bad' : '');
    plot.draw([
      { x: refX, y: refY, color: 'muted', dash: [6, 4], label: `${cRef.toFixed(2)} Ma² (slope 2)`, hover: false },
      { x: warnX, y: warnY, color: 'bad', dash: [2, 4], width: 1.2, label: 'health() warns: Ma = 0.3', hover: false },
      { x: ma.subarray(0, done), y: ex.subarray(0, done), color: 's1', points: 3.5, width: 0, label: 'measured, n = 32, τ = 0.8' },
      { x: selX, y: selY, color: 's2', points: 6, width: 0, label: 'the slider’s run' },
    ]);
    f.status.textContent = `U = ${U.toFixed(3)}: the vortices decay ${(100 * Math.abs(r.err - base)).toFixed(2)}% ${r.err - base < 0 ? 'more slowly' : 'faster'} than the viscosity says, on top of the low-speed error. Double U and this part grows four times.`;
  }
  slider(f.controls, { label: 'Lattice speed U', min: 0.01, max: 0.4, value: 0.08, log: true, fmt: (v) => v.toFixed(3), onInput: show });
  show(curU);
  // the sweep: one short run per point, a few per frame
  const sweep = (function* () {
    for (let k = 0; k < US.length; k++) {
      ma[k] = US[k] * SQ3;
      ex[k] = Math.abs(tgRateError(US[k]).err - base);
      done = k + 1;
      if (k === kRef) {
        cRef = ex[kRef] / (ma[kRef] * ma[kRef]);
        refY[0] = cRef * refX[0] * refX[0];
        refY[1] = cRef * refX[1] * refX[1];
      }
      yield;
    }
  })();
  sliced(sweep, { budgetMs: 8, signal })
    .then(() => show(curU))
    .catch(() => {});
  return () => plot.box.destroy();
}
