// shocks-entropy: the transonic rarefaction of Burgers' equation, u_L < 0 <
// u_R on [−1, 1]. The exact (entropy) solution is a fan through the sonic
// point u = 0. Roe's flux without an entropy fix keeps the jump as a
// stationary expansion shock when the jump sits on a cell face (even n);
// Harten's entropy fix, Godunov's flux and Rusanov's flux open the fan. All
// runs are burgers.js stepBurgers; the exact solution is burgersExact.
// Readouts: largest neighbour jump, L1 error, energy against the exact
// energy (an expansion shock creates energy, a physical shock destroys it).
//
// data-preset: 'roe' (plain Roe, n = 200) or 'fix' (Roe + entropy fix).

import { fmt } from '../../kit/dom.js';
import { frame, slider, segmented, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { createBurgers, resetBurgers, advanceBurgers, burgersExact, burgersEnergy, burgersRiemann } from '../../sims/burgers.js';
import { l1, maxJump } from './common.js';

const T_END = 0.5;
const RATE = 0.125;
const NF = 800;
const SCHEMES = [
  ['roe', 'Roe'],
  ['roe-fix', 'Roe + entropy fix'],
  ['godunov', 'Godunov'],
  ['rusanov', 'Rusanov'],
];
const NS = [['50', '50'], ['100', '100'], ['101', '101 (odd)'], ['200', '200'], ['201', '201 (odd)']];

export function mountEntropy(fig, { signal }) {
  const f = frame(fig, { title: 'Expansion shock: Roe’s flux at a sonic point', wide: true });
  const cfg = { scheme: fig.dataset.preset === 'fix' ? 'roe-fix' : 'roe', n: 200, uL: -1, uR: 1 };

  const plot = new Plot(f.stage, { x: { label: 'x', min: -1, max: 1 }, y: { label: 'u', min: -1.6, max: 1.6 }, aspect: 2.4, minHeight: 170, label: 'u against x for the transonic rarefaction: exact fan and numerical solution' });

  const xf = new Float64Array(NF), uf = new Float64Array(NF);
  for (let k = 0; k < NF; k++) xf[k] = -1 + (2 * (k + 0.5)) / NF;
  let st, ex;
  let t = 0;

  const schSeg = segmented(f.controls, { label: 'Flux', options: SCHEMES, value: cfg.scheme, onChange: (v) => set({ scheme: v }) });
  const uLSl = slider(f.controls, { label: 'Left state u_L', min: -1.5, max: 0.5, step: 0.05, value: cfg.uL, fmt: (v) => v.toFixed(2), onInput: (v) => set({ uL: v }) });
  const nSeg = segmented(f.controls, { label: 'Cells n', options: NS, value: String(cfg.n), onChange: (v) => set({ n: Number(v) }) });
  const loop = animate(fig, tick, { autoplay: false, signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Jump to t = 0.5', onClick: () => (loop.pause(), goTo(T_END)) });
  button(f.controls, { label: 'Reset', onClick: () => (loop.pause(), restart()) });

  const rT = readout(f.readouts, { label: 'time t' });
  const rJ = readout(f.readouts, { label: 'largest jump between cells', title: 'max |u_{i+1} − u_i|: a fan spreads it out; an expansion shock keeps it' });
  const rL1 = readout(f.readouts, { label: 'L1 error', title: 'Δx Σ|u − exact|' });
  const rE = readout(f.readouts, { label: 'energy ∫u²/2, numerical' });
  const rEx = readout(f.readouts, { label: 'energy, exact', title: 'Exact solution at the cell centres; energy leaves through the open ends' });
  const rSonic = readout(f.readouts, { label: 'sonic point inside the fan?', title: 'Transonic when u_L < 0 < u_R' });

  function build() {
    st = createBurgers({ preset: 'transonic', params: { uL: cfg.uL, uR: cfg.uR, x0: 0 }, n: cfg.n, scheme: cfg.scheme });
    ex = new Float64Array(cfg.n);
    plot.draw([
      { x: xf, y: uf, color: 'ink', width: 1.5, dash: [6, 4], label: 'exact (entropy) solution' },
      { x: st.x, y: st.u, color: 's1', width: 2, points: cfg.n <= 101 ? 2.5 : 1.5, label: SCHEMES.find((s) => s[0] === cfg.scheme)[1] },
    ]);
  }

  function set(patch) {
    const old = { ...cfg };
    Object.assign(cfg, patch);
    schSeg.set(cfg.scheme, { silent: true });
    uLSl.set(cfg.uL, { silent: true });
    nSeg.set(String(cfg.n), { silent: true });
    if (!st || cfg.n !== old.n || cfg.scheme !== old.scheme) build();
    restart();
  }

  function restart() {
    st.params.uL = cfg.uL;
    st.params.uR = cfg.uR;
    resetBurgers(st);
    t = 0;
    show();
  }

  function goTo(T) {
    t = Math.min(T_END, T);
    advanceBurgers(st, t);
    show();
  }

  function tick(dt) {
    if (t >= T_END - 1e-12) return loop.pause();
    goTo(t + RATE * dt);
  }

  function show() {
    for (let k = 0; k < NF; k++) uf[k] = t > 0 ? burgersRiemann(cfg.uL, cfg.uR, xf[k] / t) : xf[k] < 0 ? cfg.uL : cfg.uR;
    plot.render();
    burgersExact(st, ex);
    let eEx = 0;
    for (let i = 0; i < st.n; i++) eEx += 0.5 * ex[i] * ex[i];
    eEx *= st.dx;
    const jump = maxJump(st.u, st.n), err = l1(st.u, ex, st.dx, st.n), e = burgersEnergy(st);
    const transonic = cfg.uL < 0 && cfg.uR > 0;
    rT.set(t.toFixed(3));
    rJ.set(fmt(jump, 3), t > 0.1 && jump > 0.3 ? 'bad' : '');
    rL1.set(fmt(err, 3));
    rE.set(e.toFixed(4), t > 0.1 && e > eEx + 0.01 ? 'bad' : '');
    rEx.set(eEx.toFixed(4));
    rSonic.set(transonic ? 'yes: u_L < 0 < u_R' : 'no');
    narrate(jump, e, eEx, transonic);
  }

  function narrate(jump, e, eEx, transonic) {
    let s;
    if (t === 0) s = 'A jump up from u_L to u_R = 1. Fluid on the right moves away faster than fluid on the left, so the exact solution is a fan. Press Run.';
    else if (jump > 0.3 && t > 0.1 && transonic) {
      s = `Expansion shock: a jump of ${jump.toFixed(2)} sits still at x = 0, where the exact solution is a smooth fan.`;
      if (e > eEx + 0.01) s += ` The energy is ${e.toFixed(3)} against ${eEx.toFixed(3)}: this jump creates energy, which no physical shock can do.`;
    } else if (cfg.scheme === 'roe' && transonic && cfg.n % 2 === 1 && Math.abs(cfg.uL + cfg.uR) < 1e-9) {
      s = 'Odd n: the middle cell starts at u = 0, the sonic value, so even plain Roe opens the fan. The defect hides on this grid; it has not gone away.';
    } else if (!transonic) s = 'u_L ≥ 0: the fan does not contain the sonic point u = 0, so every flux here opens it correctly.';
    else s = `The fan opens. Largest jump between cells ${jump.toFixed(3)}, shrinking as you refine.`;
    if (f.status.textContent !== s) f.status.textContent = s;
  }

  set({});
}
