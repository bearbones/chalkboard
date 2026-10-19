// Chapter 2 (viewpoints) helpers: one extra analytic flow with exact
// pathlines and streaklines, the warm-patch temperature fields for the
// material-derivative figure, the split of a velocity gradient into
// expansion, spin and strain, and the gap between two traced lines.
// Pure and DOM-free; the chapter's figures and tests/fluid-course/
// ch-viewpoints.test.js call the same functions. Particle stepping, line
// tracing and the material derivative itself stay in flows.js.
//
// Units are nondimensional, as in flows.js.
//
// The swinging stream (the usual textbook exercise for telling the three
// kinds of flow line apart; see Batchelor 1967, An Introduction to Fluid
// Dynamics, §2.1, and Kundu, Cohen & Dowling 2016, Fluid Mechanics, ch. 3):
//   u = U,  v = V sin(ω t).
// The velocity is the same everywhere at any instant, so it is divergence
// free and irrotational, and every streamline at time t is a straight line
// of slope V sin(ωt)/U. A particle that is at (x0, y0) at time t0 is at
//   x = x0 + U (t − t0),  y = y0 − (V/ω) (cos ωt − cos ωt0)
// at time t: its pathline is a wave, and the streakline from a fixed source
// is the set of such points over every release time t0 ≤ t (a wave that
// travels downstream, like the jet from a garden hose waved from side to
// side). These closed forms are the exact references the figures draw
// beside the numerically traced lines.
//
// Velocity gradient (Batchelor 1967, §2.3; Helmholtz 1858): with
// g = [∂u/∂x, ∂u/∂y, ∂v/∂x, ∂v/∂y], the rate-of-strain tensor is
// S = (∇u + ∇uᵀ)/2 and the spin tensor W = (∇u − ∇uᵀ)/2. In 2-D,
//   divergence  ∇·u = ∂u/∂x + ∂v/∂y = tr S       (rate of area growth)
//   vorticity   ω = ∂v/∂x − ∂u/∂y                 (twice the spin rate)
//   strain      σ = √(((∂u/∂x − ∂v/∂y)/2)² + ((∂u/∂y + ∂v/∂x)/2)²)
// σ is the stretching rate along the principal axis of the trace-free part
// of S, at angle θ = ½ atan2(∂u/∂y + ∂v/∂x, ∂u/∂x − ∂v/∂y) from the x-axis;
// the perpendicular axis is compressed at the same rate.

import { traceStreamline } from './flows.js';

const TAU = 2 * Math.PI;

// ---- the swinging stream ----------------------------------------------------

export const SWING_DEFAULTS = { U: 1, V: 0.8, omega: Math.PI };

// A flow object with the same shape as flows.js makeFlow() returns, so
// rkStep, tracePathline, traceStreamline and the streakline functions all
// accept it. params are live: mutate flow.params and the methods follow.
export function makeSwingingFlow(params = {}) {
  const p = { ...SWING_DEFAULTS, ...params };
  const dom = { xmin: 0, xmax: 4, ymin: -1.2, ymax: 1.2 };
  return {
    id: 'swing',
    name: 'Swinging stream',
    description: 'A uniform stream whose direction swings from side to side: u = U, v = V sin ωt. At each instant every streamline is straight, yet particles wave and dye forms a travelling wave.',
    tex: '\\mathbf{u} = \\left(U,\\; V\\sin\\omega t\\right)',
    params: p,
    get domain() {
      return dom;
    },
    get steady() {
      return p.V === 0 || p.omega === 0;
    },
    divergenceFree: true,
    irrotational: true,
    velocity(x, y, t, out) {
      out[0] = p.U;
      out[1] = p.V * Math.sin(p.omega * t);
      return out;
    },
    streamfunction: (x, y, t) => p.U * y - p.V * Math.sin(p.omega * t) * x,
    potential: (x, y, t) => p.U * x + p.V * Math.sin(p.omega * t) * y,
    vorticity: () => 0,
    solid: null,
    project: null,
  };
}

// Exact position at time t of the particle that was at (x0, y0) at time t0.
// Writes out[0], out[1]; returns out. A streakline point is the same call
// with t0 = the particle's release time and (x0, y0) = the source.
export function swingExactPath(params, x0, y0, t0, t, out) {
  const p = params;
  out[0] = x0 + p.U * (t - t0);
  if (p.omega === 0) out[1] = y0;
  else out[1] = y0 - (p.V / p.omega) * (Math.cos(p.omega * t) - Math.cos(p.omega * t0));
  return out;
}

// ---- the warm patch (scalar fields for the material-derivative figure) -------

// A Gaussian warm patch of width s, plus uniform warming β t:
//   T(x, y, t) = A exp(−|x − c(t)|² / 2s²) + β t.
// kind 'river': the centre moves in a straight line, c(t) = (x0 + k U t, y0).
// kind 'whirlpool': the centre turns about the origin at k Ω,
//   c(t) = r0 (cos(θ0 + k Ω t), sin(θ0 + k Ω t)).
// k is the patch's speed as a fraction of the flow's: with the matching flow
// (uniform U, or solid-body rotation Ω about the origin) k = 1 means the
// pattern is carried by the fluid, so DT/Dt = β everywhere; k = 0 means it
// stays put, so ∂T/∂t = β everywhere. Returns fn(x, y, t) with live
// fn.params (mutate them; no allocation per call) and fn.centre(t, out).
export const PATCH_DEFAULTS = {
  river: { A: 1, s: 0.4, k: 0, beta: 0, U: 1, x0: -0.6, y0: 0 },
  whirlpool: { A: 1, s: 0.35, k: 0, beta: 0, Omega: 1, r0: 0.9, theta0: 0 },
};

export function makePatch(kind = 'river', params = {}) {
  const defs = PATCH_DEFAULTS[kind];
  if (!defs) throw new Error(`unknown patch kind ${kind}`);
  const p = { ...defs, ...params };
  const river = kind === 'river';
  const centre = (t, out) => {
    if (river) {
      out[0] = p.x0 + p.k * p.U * t;
      out[1] = p.y0;
    } else {
      const a = p.theta0 + p.k * p.Omega * t;
      out[0] = p.r0 * Math.cos(a);
      out[1] = p.r0 * Math.sin(a);
    }
    return out;
  };
  const C = new Float64Array(2);
  const fn = (x, y, t = 0) => {
    centre(t, C);
    const dx = x - C[0];
    const dy = y - C[1];
    return p.A * Math.exp(-(dx * dx + dy * dy) / (2 * p.s * p.s)) + p.beta * t;
  };
  fn.kind = kind;
  fn.params = p;
  fn.centre = centre;
  return fn;
}

// ---- the velocity gradient, split ----------------------------------------------

// g = [∂u/∂x, ∂u/∂y, ∂v/∂x, ∂v/∂y] (the layout of flows.js velocityGradient).
// Fills out = { div, vort, sigma, theta, s11, s12, s22, w12 } and returns it:
// div = ∇·u, vort = ω, sigma = principal (trace-free) strain rate ≥ 0, theta
// = angle of the stretching axis in radians, s11/s12/s22 the components of
// S and w12 = (∂u/∂y − ∂v/∂x)/2 = −ω/2 the off-diagonal of W.
export function gradientParts(g, out = {}) {
  const ux = g[0];
  const uy = g[1];
  const vx = g[2];
  const vy = g[3];
  const a = 0.5 * (ux - vy);
  const b = 0.5 * (uy + vx);
  out.div = ux + vy;
  out.vort = vx - uy;
  out.sigma = Math.hypot(a, b);
  out.theta = out.sigma > 0 ? 0.5 * Math.atan2(b, a) : 0;
  out.s11 = ux;
  out.s12 = b;
  out.s22 = vy;
  out.w12 = 0.5 * (uy - vx);
  return out;
}

// ---- the whole streamline through a point -------------------------------------------

// Buffers for streamlineThrough(): room for maxSteps points each way.
export function createStreamlineBuffer(maxSteps = 600) {
  return {
    max: maxSteps,
    x: new Float64Array(2 * maxSteps + 1),
    y: new Float64Array(2 * maxSteps + 1),
    bx: new Float64Array(maxSteps + 1),
    by: new Float64Array(maxSteps + 1),
    n: 0,
    seed: 0,
  };
}

// The streamline through (x, y) at the instant t, traced downstream and
// upstream with flows.js traceStreamline (RK4 in arc length ds, unit speed,
// stopping at the domain edge, at a stagnation point, inside a body or after
// buf.max steps each way), joined into one polyline from its upstream end to
// its downstream end. Fills buf.x, buf.y (buf.n points; the seed is at
// index buf.seed) and returns buf.n. No allocation.
export function streamlineThrough(flow, x, y, t, ds, buf, bounds = flow.domain) {
  const opts = STREAM_OPTS;
  opts.bounds = bounds;
  opts.direction = -1;
  const nb = traceStreamline(flow, x, y, t, ds, buf.max, 'rk4', buf.bx, buf.by, opts);
  for (let i = 0; i < nb; i++) {
    buf.x[i] = buf.bx[nb - 1 - i];
    buf.y[i] = buf.by[nb - 1 - i];
  }
  opts.direction = 1;
  const nf = traceStreamline(flow, x, y, t, ds, buf.max, 'rk4', buf.bx, buf.by, opts);
  for (let i = 1; i < nf; i++) {
    buf.x[nb - 1 + i] = buf.bx[i];
    buf.y[nb - 1 + i] = buf.by[i];
  }
  opts.bounds = null;
  buf.seed = nb - 1;
  buf.n = nb + nf - 1;
  return buf.n;
}
const STREAM_OPTS = { unit: true, direction: 1, bounds: null, minSpeed: 1e-9 };

// ---- comparing two traced lines ---------------------------------------------------

// The largest distance from any of the na points (ax, ay) to the polyline
// through the nb points (bx, by): how far line A strays from line B (for
// example a streakline from the streamline through its source). Infinity
// if B has no points. No allocation.
export function polylineGap(ax, ay, na, bx, by, nb) {
  if (nb < 1) return Infinity;
  let worst = 0;
  for (let i = 0; i < na; i++) {
    const px = ax[i];
    const py = ay[i];
    let best = Infinity;
    if (nb === 1) best = Math.hypot(px - bx[0], py - by[0]);
    for (let j = 0; j + 1 < nb; j++) {
      const x0 = bx[j];
      const y0 = by[j];
      const dx = bx[j + 1] - x0;
      const dy = by[j + 1] - y0;
      const L2 = dx * dx + dy * dy;
      let s = L2 > 0 ? ((px - x0) * dx + (py - y0) * dy) / L2 : 0;
      s = s < 0 ? 0 : s > 1 ? 1 : s;
      const ex = x0 + s * dx - px;
      const ey = y0 + s * dy - py;
      const d2 = ex * ex + ey * ey;
      if (d2 < best) best = d2;
    }
    const d = nb === 1 ? best : Math.sqrt(best);
    if (d > worst) worst = d;
  }
  return worst;
}

// Growth of the radius over one full turn (a time of 2π/Ω) for a method whose
// one-step factor in rotation is G = |R(iΩΔt)| (flows.js
// rotationAmplification): G^(2π/(ΩΔt)). For explicit Euler, G² = 1 + (ΩΔt)²,
// so this is (1 + (ΩΔt)²)^(π/(ΩΔt)) ≈ e^(πΩΔt): halving Δt only takes the
// square root of the growth per turn (first order).
export function growthPerTurn(G, w) {
  return Math.exp((TAU / w) * Math.log(G));
}
