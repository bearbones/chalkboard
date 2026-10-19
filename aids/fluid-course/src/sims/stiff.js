// Stiffness: stability functions, stability regions, stiff test problems and
// small linear ODE integrators.
//
// What is here
//   stabilityAbs / stabilityValue   R(z) for the Dahlquist test equation
//                                   y' = lambda y, z = h lambda: one step maps
//                                   y_n to R(z) y_n. For BDF2 (two-step) the
//                                   root of largest modulus of
//                                   (3/2 - z) zeta^2 - 2 zeta + 1/2 = 0.
//   stabilityGrid(...)              |R(z)| sampled on a rectangle, for
//                                   drawing stability regions (|R| <= 1).
//   boundaryLocus(...)              the curve |R(z)| = 1 (one-step methods,
//                                   traced by continuation in arg R) or the
//                                   boundary locus z = rho(e^{i phi}) /
//                                   sigma(e^{i phi}) (BDF2).
//   realStabilityLimit / imagStabilityLimit   the stability interval on each axis.
//   heatEigenvalues / stiffnessRatio          method-of-lines heat equation.
//   createProblem / createLinearProblem       stiff test problems y' = A y + f(t).
//   createIntegrator / step / resetIntegrator explicit Euler, Heun, RK4,
//                                   implicit Euler, trapezoid, BDF2.
//   solveDense(...)                 Gaussian elimination with partial pivoting
//                                   for the small implicit systems.
//   STIFF_DEMOS                     broken / fixed recipe pairs (problem,
//                                   method, h); the tests run these recipes.
//
// Conventions
//   z = h lambda = x + i y. Grids are indexed i + j * nx with j = 0 at the
//   bottom (most negative imaginary part) and values at cell centres:
//   re = re0 + (i + 1/2)(re1 - re0)/nx, im = im0 + (j + 1/2)(im1 - im0)/ny.
//   Dense matrices are row-major Float64Arrays: A[r * n + c].
//   Problems are nondimensional: time in the units of the slow scale (the
//   slow eigenvalue is -1, or g(t) = cos t has period 2 pi).
//   Method-of-lines heat equation: u_t = kappa u_xx on [0, 1], u = 0 at both
//   ends, n intervals (dx = 1/n), n - 1 unknowns, eigenvalues
//   lambda_k = -(4 kappa / dx^2) sin^2(k pi dx / 2), k = 1..n-1.
//
// Sources
//   Stability functions, A-stability, L-stability, stability domains of RK
//   methods: Hairer & Wanner, Solving Ordinary Differential Equations II, 2nd
//   ed. (1996) §IV.2–IV.3; Hairer, Nørsett & Wanner, Solving ODEs I (1993)
//   §II.1 (classical RK4, Heun). Multistep stability domains and the boundary
//   locus: Hairer & Wanner II §V.1; LeVeque, Finite Difference Methods for
//   ODEs and PDEs (2007) ch. 7. Stiffness, L-stability and BDF: LeVeque
//   (2007) ch. 8; stiffness of the heat equation: LeVeque (2007) §9.4.
//   BDF: Curtiss & Hirschfelder, PNAS 38 (1952) 235–243. A-stability and
//   the second order barrier for multistep methods: Dahlquist, BIT 3 (1963)
//   27–43. Prothero–Robinson problem: Prothero & Robinson, Math. Comp. 28
//   (1974) 145–162. Stiffness ratio and its limits as a definition: Lambert,
//   Numerical Methods for Ordinary Differential Systems (1991) ch. 6.
//   Deviations: BDF2 is started with one implicit Euler step (and restarted
//   the same way whenever h changes), which keeps global order 2 and, being
//   L-stable, does not excite stiff modes. The integrators are for constant
//   A (linear problems only), so the implicit stages are linear solves.

// ---------------------------------------------------------------- metadata

// realInterval / imagInterval: the stable segment of each axis (null if only
// z = 0); Rinf: |R(z)| as z -> -infinity (0 means L-stable).
export const STABILITY_METHODS = {
  euler: {
    id: 'euler',
    name: 'Explicit Euler',
    description: 'Step along the slope at the start of the step. The stability region is the disc of radius 1 centred on −1.',
    tex: 'R(z) = 1 + z',
    stability: '|1 + z| \\le 1;\\ \\text{real } \\lambda < 0:\\ h \\le 2/|\\lambda|',
    implicit: false,
    steps: 1,
    order: 1,
    aStable: false,
    lStable: false,
    realInterval: [-2, 0],
    imagInterval: null,
    Rinf: Infinity,
  },
  heun: {
    id: 'heun',
    name: 'Heun (RK2)',
    description: 'Explicit trapezoid: an Euler predictor, then average the slopes. Same real interval as Euler, [−2, 0]; no stability on the imaginary axis.',
    tex: 'R(z) = 1 + z + \\frac{z^2}{2}',
    stability: '\\text{real } \\lambda < 0:\\ h \\le 2/|\\lambda|;\\ \\text{never for imaginary } \\lambda',
    implicit: false,
    steps: 1,
    order: 2,
    aStable: false,
    lStable: false,
    realInterval: [-2, 0],
    imagInterval: null,
    Rinf: Infinity,
  },
  rk4: {
    id: 'rk4',
    name: 'Classical RK4',
    description: 'Four stages, fourth order. Stable on [−2.785, 0] of the real axis and on [−2√2, 2√2] of the imaginary axis.',
    tex: 'R(z) = 1 + z + \\frac{z^2}{2} + \\frac{z^3}{6} + \\frac{z^4}{24}',
    stability: '\\text{real } \\lambda < 0:\\ h \\le 2.785/|\\lambda|;\\ \\text{imaginary } \\lambda:\\ h \\le 2\\sqrt{2}/|\\lambda|',
    implicit: false,
    steps: 1,
    order: 4,
    aStable: false,
    lStable: false,
    realInterval: [-2.785293563405282, 0],
    imagInterval: [-2 * Math.SQRT2, 2 * Math.SQRT2],
    Rinf: Infinity,
  },
  'implicit-euler': {
    id: 'implicit-euler',
    name: 'Implicit Euler',
    description: 'Step along the slope at the end of the step, which means solving for it. Stable everywhere outside the disc of radius 1 centred on +1, and R(z) → 0 as z → −∞ (L-stable): stiff transients are killed in one step.',
    tex: 'R(z) = \\frac{1}{1 - z}',
    stability: '|1 - z| \\ge 1\\ \\text{(includes all of } \\operatorname{Re} z \\le 0)',
    implicit: true,
    steps: 1,
    order: 1,
    aStable: true,
    lStable: true,
    realInterval: [-Infinity, 0],
    imagInterval: [-Infinity, Infinity],
    Rinf: 0,
  },
  trapezoid: {
    id: 'trapezoid',
    name: 'Trapezoid (Crank–Nicolson)',
    description: 'Average of the slopes at both ends. Stable on exactly the closed left half-plane (A-stable), but R(z) → −1 as z → −∞, so stiff components flip sign each step instead of dying.',
    tex: 'R(z) = \\frac{1 + z/2}{1 - z/2}',
    stability: '\\operatorname{Re} z \\le 0',
    implicit: true,
    steps: 1,
    order: 2,
    aStable: true,
    lStable: false,
    realInterval: [-Infinity, 0],
    imagInterval: [-Infinity, Infinity],
    Rinf: 1,
  },
  bdf2: {
    id: 'bdf2',
    name: 'BDF2',
    description: 'Two-step backward differentiation formula. A-stable and L-stable, second order; the BDF family is the classic basis of stiff ODE solvers. Unstable only inside a bounded region of the right half-plane, which meets the real axis on (0, 4).',
    tex: '\\tfrac{3}{2}y_{n+1} - 2y_n + \\tfrac{1}{2}y_{n-1} = h\\,f(t_{n+1}, y_{n+1})',
    texChar: '\\left(\\tfrac{3}{2} - z\\right)\\zeta^2 - 2\\zeta + \\tfrac{1}{2} = 0',
    texLocus: 'z(\\phi) = \\tfrac{3}{2} - 2e^{-i\\phi} + \\tfrac{1}{2}e^{-2i\\phi}',
    stability: '\\text{outside the locus, a region containing all of } \\operatorname{Re} z \\le 0\\ \\text{(A-stable)}',
    implicit: true,
    steps: 2,
    order: 2,
    aStable: true,
    lStable: true,
    realInterval: [-Infinity, 0],
    imagInterval: [-Infinity, Infinity],
    Rinf: 0,
  },
};

const POLY = {
  euler: [1, 1],
  heun: [1, 1, 1 / 2],
  rk4: [1, 1, 1 / 2, 1 / 6, 1 / 24],
};

function check(method) {
  if (!STABILITY_METHODS[method]) throw new Error(`unknown method ${method}`);
}

// ---------------------------------------------------------------- stability functions

// |R(z)| at z = x + i y; for BDF2 the largest root modulus. No allocation.
export function stabilityAbs(method, x, y) {
  switch (method) {
    case 'euler':
      return Math.hypot(1 + x, y);
    case 'implicit-euler':
      return 1 / Math.hypot(1 - x, y);
    case 'trapezoid':
      return Math.hypot(1 + x / 2, y / 2) / Math.hypot(1 - x / 2, y / 2);
    case 'heun': {
      const re = 1 + x + (x * x - y * y) / 2;
      const im = y + x * y;
      return Math.hypot(re, im);
    }
    case 'rk4': {
      // Horner: 1 + z(1 + z/2 (1 + z/3 (1 + z/4)))
      let pr = 1 + x / 4;
      let pi = y / 4;
      let t;
      t = 1 + (x * pr - y * pi) / 3;
      pi = (x * pi + y * pr) / 3;
      pr = t;
      t = 1 + (x * pr - y * pi) / 2;
      pi = (x * pi + y * pr) / 2;
      pr = t;
      t = 1 + x * pr - y * pi;
      pi = x * pi + y * pr;
      return Math.hypot(t, pi);
    }
    case 'bdf2': {
      // zeta = (2 ± sqrt(1 + 2z)) / (3 - 2z)
      const wr = 1 + 2 * x;
      const wi = 2 * y;
      const m = Math.hypot(wr, wi);
      const sr = Math.sqrt(Math.max(0, (m + wr) / 2));
      const si = (wi < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (m - wr) / 2));
      const big = Math.max(Math.hypot(2 + sr, si), Math.hypot(2 - sr, si));
      const den = Math.hypot(3 - 2 * x, 2 * y);
      return den === 0 ? Infinity : big / den;
    }
    default:
      throw new Error(`unknown method ${method}`);
  }
}

// R(z) as a complex number { re, im }; for BDF2 the root of largest modulus.
export function stabilityValue(method, x, y) {
  check(method);
  if (method === 'implicit-euler') {
    const d = (1 - x) * (1 - x) + y * y;
    return { re: (1 - x) / d, im: y / d };
  }
  if (method === 'trapezoid') {
    const ar = 1 + x / 2;
    const ai = y / 2;
    const br = 1 - x / 2;
    const bi = -y / 2;
    const d = br * br + bi * bi;
    return { re: (ar * br + ai * bi) / d, im: (ai * br - ar * bi) / d };
  }
  if (method === 'bdf2') {
    const wr = 1 + 2 * x;
    const wi = 2 * y;
    const m = Math.hypot(wr, wi);
    const sr = Math.sqrt(Math.max(0, (m + wr) / 2));
    const si = (wi < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (m - wr) / 2));
    const sgn = Math.hypot(2 + sr, si) >= Math.hypot(2 - sr, si) ? 1 : -1;
    const nr = 2 + sgn * sr;
    const ni = sgn * si;
    const dr = 3 - 2 * x;
    const di = -2 * y;
    const d = dr * dr + di * di;
    return { re: (nr * dr + ni * di) / d, im: (ni * dr - nr * di) / d };
  }
  const [re, im] = polyEval(POLY[method], x, y);
  return { re, im };
}

// Complex polynomial value and derivative by Horner. Returns [Re, Im, Re', Im'].
function polyEval(c, x, y) {
  let pr = c[c.length - 1];
  let pi = 0;
  let dr = 0;
  let di = 0;
  for (let k = c.length - 2; k >= 0; k--) {
    // d = d z + p ; p = p z + c_k
    const ndr = dr * x - di * y + pr;
    const ndi = dr * y + di * x + pi;
    dr = ndr;
    di = ndi;
    const npr = pr * x - pi * y + c[k];
    const npi = pr * y + pi * x;
    pr = npr;
    pi = npi;
  }
  return [pr, pi, dr, di];
}

// |R| on an nx-by-ny grid of cell centres over reRange x imRange, index
// i + j * nx, j = 0 at the bottom.
export function stabilityGrid(method, reRange, imRange, nx, ny, out = new Float32Array(nx * ny)) {
  check(method);
  const [x0, x1] = reRange;
  const [y0, y1] = imRange;
  const hx = (x1 - x0) / nx;
  const hy = (y1 - y0) / ny;
  for (let j = 0; j < ny; j++) {
    const y = y0 + (j + 0.5) * hy;
    for (let i = 0; i < nx; i++) out[i + j * nx] = stabilityAbs(method, x0 + (i + 0.5) * hx, y);
  }
  return out;
}

// The stability boundary as n points { re, im }.
//   euler, implicit-euler: circles; trapezoid: the imaginary axis, clipped to
//   |Im z| <= opts.extent (default 4); bdf2: the boundary locus over
//   phi in [0, 2 pi]; heun, rk4: the curve R(z) = e^{i phi} traced from z = 0
//   by predictor–corrector continuation as phi runs over [0, 2 pi p] (p the
//   degree), which goes once round the boundary because arg R increases
//   monotonically along it and all p zeros of R lie inside the region.
export function boundaryLocus(method, n = 400, opts = {}) {
  check(method);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const ph = (k) => (2 * Math.PI * k) / (n - 1);
  if (method === 'euler') {
    for (let k = 0; k < n; k++) {
      re[k] = Math.cos(ph(k)) - 1;
      im[k] = Math.sin(ph(k));
    }
  } else if (method === 'implicit-euler') {
    for (let k = 0; k < n; k++) {
      re[k] = 1 - Math.cos(ph(k));
      im[k] = Math.sin(ph(k));
    }
  } else if (method === 'trapezoid') {
    const L = opts.extent ?? 4;
    for (let k = 0; k < n; k++) im[k] = -L + (2 * L * k) / (n - 1);
  } else if (method === 'bdf2') {
    for (let k = 0; k < n; k++) {
      const p = ph(k);
      re[k] = 1.5 - 2 * Math.cos(p) + 0.5 * Math.cos(2 * p);
      im[k] = 2 * Math.sin(p) - 0.5 * Math.sin(2 * p);
    }
  } else {
    const c = POLY[method];
    const p = c.length - 1;
    const sub = Math.max(4, Math.ceil((2048 * p) / n));
    const dphi = (2 * Math.PI * p) / ((n - 1) * sub);
    let zr = 0;
    let zi = 0;
    for (let k = 1; k < n; k++) {
      for (let s = 1; s <= sub; s++) {
        const phi = dphi * ((k - 1) * sub + s);
        // predictor: dz/dphi = i e^{i phi} / R'(z)
        let [, , dr, di] = polyEval(c, zr, zi);
        let den = dr * dr + di * di;
        const er = -Math.sin(phi - dphi);
        const ei = Math.cos(phi - dphi);
        zr += (dphi * (er * dr + ei * di)) / den;
        zi += (dphi * (ei * dr - er * di)) / den;
        // corrector: Newton on R(z) - e^{i phi}
        const tr = Math.cos(phi);
        const ti = Math.sin(phi);
        for (let it = 0; it < 30; it++) {
          const v = polyEval(c, zr, zi);
          dr = v[2];
          di = v[3];
          den = dr * dr + di * di;
          const fr = v[0] - tr;
          const fi = v[1] - ti;
          const dzr = (fr * dr + fi * di) / den;
          const dzi = (fi * dr - fr * di) / den;
          zr -= dzr;
          zi -= dzi;
          if (Math.abs(dzr) + Math.abs(dzi) < 1e-15) break;
        }
      }
      re[k] = zr;
      im[k] = zi;
    }
  }
  return { re, im };
}

const STAB_TOL = 1 + 1e-14;
const AXIS_STEP = 1e-2; // scan step on [0, AXIS_FINE]
const AXIS_FINE = 8; // then 10 % steps out to AXIS_FAR
const AXIS_FAR = 1e8;
const axisCache = new Map();

// First s > 0 where |R| leaves the unit disc along -s (real) or i s (imag).
// A fine scan (step 0.01) covers |z| <= 8, where every explicit method here
// loses stability; beyond that the scan grows by 10 % per step to |z| = 1e8,
// and a method still stable there is reported as stable to infinity. An
// unstable gap narrower than the scan step would be missed. The first
// unstable step is then bisected to full precision. Results depend only on
// the method, so they are cached: the first call costs about 1000 evaluations
// of stabilityAbs, later calls nothing.
function axisLimit(method, along) {
  const key = `${method}:${along}`;
  const hit = axisCache.get(key);
  if (hit !== undefined) return hit;
  const f = (s) => (along === 'real' ? stabilityAbs(method, -s, 0) : stabilityAbs(method, 0, s));
  const ds = AXIS_STEP;
  let result;
  if (f(ds) > STAB_TOL) result = 0;
  else {
    let lo = ds;
    let hi = ds;
    let found = false;
    for (let k = 2; !found && k * ds <= AXIS_FINE; k++) {
      hi = k * ds;
      if (f(hi) > STAB_TOL) found = true;
      else lo = hi;
    }
    while (!found && hi < AXIS_FAR) {
      hi = lo * 1.1;
      if (f(hi) > STAB_TOL) found = true;
      else lo = hi;
    }
    if (!found) result = Infinity;
    else {
      for (let k = 0; k < 80; k++) {
        const mid = 0.5 * (lo + hi);
        if (f(mid) > STAB_TOL) hi = mid;
        else lo = mid;
      }
      result = lo;
    }
  }
  axisCache.set(key, result);
  return result;
}

// Most negative x such that |R| <= 1 on [x, 0] of the real axis
// (-Infinity if the whole negative axis is stable). Found by scanning and
// bisection (see axisLimit), not looked up, and cached per method.
export function realStabilityLimit(method) {
  check(method);
  return -axisLimit(method, 'real');
}

// Largest y such that |R(i s)| <= 1 for 0 <= s <= y (0 if none, Infinity if
// the whole imaginary axis is stable). Cached per method.
export function imagStabilityLimit(method) {
  check(method);
  return axisLimit(method, 'imag');
}

// Largest stable step for a real decay rate lambda < 0: h <= |x_min| / |lambda|,
// with x_min = realStabilityLimit(method) (Infinity for the A-stable methods).
export function maxStableStep(method, lambda) {
  const x = realStabilityLimit(method);
  return x === -Infinity ? Infinity : -x / Math.abs(lambda);
}

// ---------------------------------------------------------------- method of lines

// Eigenvalues of the second-difference matrix kappa/dx^2 tridiag(1, -2, 1)
// with Dirichlet ends: lambda_k = -(4 kappa / dx^2) sin^2(k pi dx / 2),
// k = 1..n-1 (out[k-1]), most negative last.
export function heatEigenvalues(n, kappa = 1, out = new Float64Array(n - 1)) {
  const dx = 1 / n;
  for (let k = 1; k < n; k++) out[k - 1] = -((4 * kappa) / (dx * dx)) * Math.sin((k * Math.PI * dx) / 2) ** 2;
  return out;
}

// |lambda_max| / |lambda_min| = cot^2(pi dx / 2) ~ 4 / (pi^2 dx^2).
export function stiffnessRatio(n) {
  return 1 / Math.tan(Math.PI / (2 * n)) ** 2;
}

// Largest explicit Euler step for the semi-discrete heat equation:
// h |lambda_max| <= 2, i.e. h <= dx^2 / (2 kappa cos^2(pi dx / 2)) ~ dx^2 / (2 kappa),
// the FTCS condition r <= 1/2 in ODE clothing.
export function heatExplicitLimit(n, kappa = 1) {
  const dx = 1 / n;
  return (2 * dx * dx) / (4 * kappa * Math.sin(((n - 1) * Math.PI * dx) / 2) ** 2);
}

// ---------------------------------------------------------------- problems

export const STIFF_PROBLEMS = {
  dahlquist: {
    id: 'dahlquist',
    name: 'Dahlquist test equation',
    description: 'y′ = λy with complex λ, written as a real 2×2 system. One step multiplies y by R(hλ) exactly.',
    tex: "y' = \\lambda y,\\quad y(0) = 1",
    defaults: { re: -1, im: 0 },
    tEnd: 5,
  },
  'prothero-robinson': {
    id: 'prothero-robinson',
    name: 'Prothero–Robinson',
    description: 'A smooth solution y = cos t, with every nearby solution pulled onto it at rate |λ| = 1000. Accuracy needs only modest steps; explicit stability needs h < 2/|λ|.',
    tex: "y' = \\lambda\\left(y - \\cos t\\right) - \\sin t,\\quad y = \\cos t + \\left(y_0 - 1\\right)e^{\\lambda t}",
    defaults: { lambda: -1000, y0: 1 },
    tEnd: 2,
  },
  'two-by-two': {
    id: 'two-by-two',
    name: 'Two time scales',
    description: 'A 2×2 linear system with eigenvalues −1 and −1000. The fast mode is gone by t ≈ 0.01, yet it still limits an explicit step to h < 0.002 for the rest of the run.',
    tex: "\\mathbf{y}' = \\begin{pmatrix} -500.5 & 499.5 \\\\ 499.5 & -500.5 \\end{pmatrix}\\mathbf{y},\\quad \\mathbf{y} = e^{-t}\\begin{pmatrix} 1 \\\\ 1 \\end{pmatrix} + e^{-1000t}\\begin{pmatrix} 1 \\\\ -1 \\end{pmatrix}",
    defaults: { slow: -1, fast: -1000 },
    tEnd: 5,
  },
  'heat-mol': {
    id: 'heat-mol',
    name: 'Heat equation, method of lines',
    description: 'u_t = κu_xx discretised in space only: n − 1 ODEs whose eigenvalues spread from −κπ² to about −4κ/dx². Refining the grid makes it stiffer.',
    tex: "\\frac{\\mathrm{d}u_j}{\\mathrm{d}t} = \\frac{\\kappa}{\\Delta x^2}\\left(u_{j+1} - 2u_j + u_{j-1}\\right),\\quad \\lambda_k = -\\frac{4\\kappa}{\\Delta x^2}\\sin^2\\frac{k\\pi\\Delta x}{2}",
    defaults: { n: 4, kappa: 1 },
    tEnd: 0.5,
  },
};

// Broken / fixed pairs for the stiffness pathologies. Each side is a recipe
// { problem, params, method, h, tEnd }: build createProblem(problem, params),
// createIntegrator(..., { method }) and take round(tEnd / h) steps of size h.
// The tests run these recipes.
export const STIFF_DEMOS = {
  'explicit-euler-limit': {
    id: 'explicit-euler-limit',
    name: 'Explicit Euler at h = 2/|λ|',
    description: 'Prothero–Robinson with λ = −1000. The solution is just cos t, but explicit Euler needs h < 2/1000: at h = 0.0021 it explodes, at h = 0.0019 it tracks cos t.',
    broken: { problem: 'prothero-robinson', params: {}, method: 'euler', h: 0.0021, tEnd: 2 },
    fixed: { problem: 'prothero-robinson', params: {}, method: 'euler', h: 0.0019, tEnd: 2 },
  },
  'implicit-big-steps': {
    id: 'implicit-big-steps',
    name: 'Implicit Euler takes big steps',
    description: 'The same problem with h = 0.1, fifty times the explicit limit. Explicit Euler explodes; implicit Euler follows cos t to within 10⁻³.',
    broken: { problem: 'prothero-robinson', params: {}, method: 'euler', h: 0.1, tEnd: 2 },
    fixed: { problem: 'prothero-robinson', params: {}, method: 'implicit-euler', h: 0.1, tEnd: 2 },
  },
  'trapezoid-ringing': {
    id: 'trapezoid-ringing',
    name: 'The trapezoid rule keeps stiff transients',
    description: 'Start off the slow solution (y₀ = 2) with h = 0.1. The trapezoid rule has R(−100) = −49/51, so the transient flips sign every step and is still 0.6 after ten steps; implicit Euler (R = 1/101) removes it in one.',
    broken: { problem: 'prothero-robinson', params: { y0: 2 }, method: 'trapezoid', h: 0.1, tEnd: 1 },
    fixed: { problem: 'prothero-robinson', params: { y0: 2 }, method: 'implicit-euler', h: 0.1, tEnd: 1 },
  },
  'two-scales': {
    id: 'two-scales',
    name: 'A decayed fast mode still limits h',
    description: 'Eigenvalues −1 and −1000. The fast mode has gone by t ≈ 0.01, yet explicit Euler with h = 0.0021 explodes before t = 5; implicit Euler runs at h = 0.5.',
    broken: { problem: 'two-by-two', params: {}, method: 'euler', h: 0.0021, tEnd: 5 },
    fixed: { problem: 'two-by-two', params: {}, method: 'implicit-euler', h: 0.5, tEnd: 5 },
  },
};

// y' = A y + f(t) from a row-major A. forcing(t, out) adds nothing if null;
// exact(t, out) may be null.
export function createLinearProblem({ id = 'custom', name = 'Linear system', A, y0, forcing = null, exact = null, eigenvalues = null, tEnd = 1, params = {} }) {
  const dim = y0.length;
  const ev = eigenvalues ?? { re: new Float64Array(0), im: new Float64Array(0) };
  let lo = Infinity;
  let hi = 0;
  for (let k = 0; k < ev.re.length; k++) {
    const a = Math.abs(ev.re[k]);
    if (a > 0) lo = Math.min(lo, a);
    hi = Math.max(hi, a);
  }
  return {
    id,
    name,
    dim,
    A: Float64Array.from(A),
    y0: Float64Array.from(y0),
    forcing,
    exact,
    eigenvalues: ev,
    stiffness: ev.re.length && lo < Infinity ? hi / lo : NaN,
    tEnd,
    params,
  };
}

// Build one of STIFF_PROBLEMS with params overriding its defaults.
export function createProblem(id, params = {}) {
  const meta = STIFF_PROBLEMS[id];
  if (!meta) throw new Error(`unknown problem ${id}`);
  const p = { ...meta.defaults, ...params };
  const base = { id, name: meta.name, tEnd: params.tEnd ?? meta.tEnd, params: p };
  if (id === 'dahlquist') {
    const { re, im } = p;
    return createLinearProblem({
      ...base,
      A: [re, -im, im, re],
      y0: [1, 0],
      exact: (t, out) => {
        const g = Math.exp(re * t);
        out[0] = g * Math.cos(im * t);
        out[1] = g * Math.sin(im * t);
        return out;
      },
      eigenvalues: { re: Float64Array.of(re, re), im: Float64Array.of(im, -im) },
    });
  }
  if (id === 'prothero-robinson') {
    const { lambda, y0 } = p;
    return createLinearProblem({
      ...base,
      A: [lambda],
      y0: [y0],
      forcing: (t, out) => {
        out[0] = -lambda * Math.cos(t) - Math.sin(t);
        return out;
      },
      exact: (t, out) => {
        out[0] = Math.cos(t) + (y0 - 1) * Math.exp(lambda * t);
        return out;
      },
      eigenvalues: { re: Float64Array.of(lambda), im: Float64Array.of(0) },
    });
  }
  if (id === 'two-by-two') {
    const { slow, fast } = p;
    // A = Q diag(slow, fast) Q^T with Q = [[1, 1], [1, -1]] / sqrt 2.
    const s = (slow + fast) / 2;
    const d = (slow - fast) / 2;
    return createLinearProblem({
      ...base,
      A: [s, d, d, s],
      y0: [2, 0],
      exact: (t, out) => {
        const a = Math.exp(slow * t);
        const b = Math.exp(fast * t);
        out[0] = a + b;
        out[1] = a - b;
        return out;
      },
      eigenvalues: { re: Float64Array.of(slow, fast), im: Float64Array.of(0, 0) },
    });
  }
  // heat-mol
  const { n, kappa } = p;
  const m = n - 1;
  const dx = 1 / n;
  const c = kappa / (dx * dx);
  const A = new Float64Array(m * m);
  for (let i = 0; i < m; i++) {
    A[i * m + i] = -2 * c;
    if (i > 0) A[i * m + i - 1] = c;
    if (i < m - 1) A[i * m + i + 1] = c;
  }
  const y0 = new Float64Array(m);
  for (let i = 0; i < m; i++) y0[i] = Math.sin(Math.PI * (i + 1) * dx);
  const lam = heatEigenvalues(n, kappa);
  return createLinearProblem({
    ...base,
    A,
    y0,
    exact: (t, out) => {
      const g = Math.exp(lam[0] * t);
      for (let i = 0; i < m; i++) out[i] = g * y0[i];
      return out;
    },
    eigenvalues: { re: lam, im: new Float64Array(m) },
  });
}

// ---------------------------------------------------------------- integrators

// Solve M x = b in place by Gaussian elimination with partial pivoting.
// M (row-major n*n) is destroyed; b is overwritten with x and returned.
export function solveDense(M, b, n) {
  for (let k = 0; k < n; k++) {
    let p = k;
    let best = Math.abs(M[k * n + k]);
    for (let r = k + 1; r < n; r++) {
      const v = Math.abs(M[r * n + k]);
      if (v > best) {
        best = v;
        p = r;
      }
    }
    if (p !== k) {
      for (let c = 0; c < n; c++) {
        const t = M[k * n + c];
        M[k * n + c] = M[p * n + c];
        M[p * n + c] = t;
      }
      const t = b[k];
      b[k] = b[p];
      b[p] = t;
    }
    const piv = M[k * n + k];
    for (let r = k + 1; r < n; r++) {
      const f = M[r * n + k] / piv;
      if (f === 0) continue;
      for (let c = k; c < n; c++) M[r * n + c] -= f * M[k * n + c];
      b[r] -= f * b[k];
    }
  }
  for (let k = n - 1; k >= 0; k--) {
    let s = b[k];
    for (let c = k + 1; c < n; c++) s -= M[k * n + c] * b[c];
    b[k] = s / M[k * n + k];
  }
  return b;
}

export const ODE_METHODS = ['euler', 'heun', 'rk4', 'implicit-euler', 'trapezoid', 'bdf2'];

// opts: { method = 'implicit-euler' }. All work arrays are allocated here.
export function createIntegrator(problem, opts = {}) {
  const n = problem.dim;
  const v = () => new Float64Array(n);
  const s = {
    problem,
    n,
    method: opts.method ?? 'implicit-euler',
    t: 0,
    steps: 0,
    hPrev: NaN,
    startup: false,
    y: Float64Array.from(problem.y0),
    yPrev: Float64Array.from(problem.y0),
    exact: Float64Array.from(problem.y0),
    k1: v(),
    k2: v(),
    k3: v(),
    k4: v(),
    tmp: v(),
    old: v(),
    f: v(),
    rhs: v(),
    M: new Float64Array(n * n),
  };
  return s;
}

export function resetIntegrator(state) {
  state.y.set(state.problem.y0);
  state.yPrev.set(state.problem.y0);
  state.t = 0;
  state.steps = 0;
  state.hPrev = NaN;
  state.startup = false;
  return state;
}

// Fill state.exact with the problem's exact solution at state.t (null if none).
export function fillExact(state) {
  const ex = state.problem.exact;
  return ex ? ex(state.t, state.exact) : null;
}

// out = A y + f(t)
function deriv(s, t, y, out) {
  const { A, forcing } = s.problem;
  const n = s.n;
  for (let r = 0; r < n; r++) {
    let acc = 0;
    for (let c = 0; c < n; c++) acc += A[r * n + c] * y[c];
    out[r] = acc;
  }
  if (forcing) {
    forcing(t, s.f);
    for (let r = 0; r < n; r++) out[r] += s.f[r];
  }
}

// M = a I - b A
function shifted(s, a, b) {
  const { A } = s.problem;
  const { M, n } = s;
  for (let k = 0; k < n * n; k++) M[k] = -b * A[k];
  for (let k = 0; k < n; k++) M[k * n + k] += a;
}

function addForcing(s, t, w) {
  const { forcing } = s.problem;
  if (!forcing) return;
  forcing(t, s.f);
  for (let r = 0; r < s.n; r++) s.rhs[r] += w * s.f[r];
}

// Advance one step of size h. params: { h, method (default state.method) }.
// BDF2 takes an implicit Euler step first and whenever h has changed
// (state.startup is true after such a step).
export function step(state, params) {
  const h = params.h;
  const method = params.method ?? state.method;
  const { n, y, old, rhs, k1, k2, k3, k4, tmp } = state;
  const t = state.t;
  old.set(y);
  state.startup = false;
  switch (method) {
    case 'euler':
      deriv(state, t, y, k1);
      for (let r = 0; r < n; r++) y[r] += h * k1[r];
      break;
    case 'heun':
      deriv(state, t, y, k1);
      for (let r = 0; r < n; r++) tmp[r] = y[r] + h * k1[r];
      deriv(state, t + h, tmp, k2);
      for (let r = 0; r < n; r++) y[r] += (h / 2) * (k1[r] + k2[r]);
      break;
    case 'rk4':
      deriv(state, t, y, k1);
      for (let r = 0; r < n; r++) tmp[r] = y[r] + (h / 2) * k1[r];
      deriv(state, t + h / 2, tmp, k2);
      for (let r = 0; r < n; r++) tmp[r] = y[r] + (h / 2) * k2[r];
      deriv(state, t + h / 2, tmp, k3);
      for (let r = 0; r < n; r++) tmp[r] = y[r] + h * k3[r];
      deriv(state, t + h, tmp, k4);
      for (let r = 0; r < n; r++) y[r] += (h / 6) * (k1[r] + 2 * k2[r] + 2 * k3[r] + k4[r]);
      break;
    case 'trapezoid':
      deriv(state, t, y, k1);
      for (let r = 0; r < n; r++) rhs[r] = y[r] + (h / 2) * k1[r];
      addForcing(state, t + h, h / 2);
      shifted(state, 1, h / 2);
      solveDense(state.M, rhs, n);
      y.set(rhs);
      break;
    case 'bdf2':
      if (state.steps > 0 && state.hPrev === h) {
        for (let r = 0; r < n; r++) rhs[r] = 2 * y[r] - 0.5 * state.yPrev[r];
        addForcing(state, t + h, h);
        shifted(state, 1.5, h);
        solveDense(state.M, rhs, n);
        y.set(rhs);
        break;
      }
      state.startup = true;
    // falls through: implicit Euler startup
    case 'implicit-euler':
      for (let r = 0; r < n; r++) rhs[r] = y[r];
      addForcing(state, t + h, h);
      shifted(state, 1, h);
      solveDense(state.M, rhs, n);
      y.set(rhs);
      break;
    default:
      throw new Error(`unknown method ${method}`);
  }
  state.yPrev.set(old);
  state.t = t + h;
  state.steps++;
  state.hPrev = h;
  return state;
}
