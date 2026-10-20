// Kinematics kernels: analytic 2-D velocity fields, particle integrators,
// pathlines, streamlines and streaklines, the material derivative, and
// material-loop area tracking. Pure and DOM-free; the figures and the tests
// call the same functions.
//
// Conventions
//   - Continuous fields only (no grid): a flow is sampled at any (x, y, t).
//     The sampling helpers at the bottom fill cell-centred grids indexed
//     i + j * nx with j = 0 at the bottom row, like every grid in src/sims/.
//   - Stream function sign: u = ∂ψ/∂y, v = −∂ψ/∂x, so ψ increases to the
//     left of the flow direction and vorticity ω = ∂v/∂x − ∂u/∂y = −∇²ψ.
//     Velocity potential: u = ∇φ. Circulation Γ is positive anticlockwise.
//   - Units: everything is nondimensional. Lengths are in units of the
//     flow's own scale (cylinder radius, channel height, cell size), times in
//     units of length / speed. Each flow lists its parameters in `params`;
//     mutate them in place (flow.params.Gamma = 3) and the methods see the
//     change immediately.
//   - A flow object is
//       { id, name, description, tex, params, domain, steady, divergenceFree,
//         irrotational, velocity(x, y, t, out) -> out (writes out[0] = u,
//         out[1] = v), streamfunction?(x, y, t), vorticity?(x, y, t),
//         potential?(x, y, t), solid?(x, y), project?(out) }
//     velocity() never allocates; pass a Float64Array(2) (or any 2-array).
//     flow.domain is one cached { xmin, xmax, ymin, ymax } per flow, refreshed
//     from the params on every read: treat it as read-only.
//   - Solid bodies (the cylinder): velocity is zero inside. A predictor stage
//     that lands inside would otherwise strand a particle there (Heun does
//     this near the front stagnation point), so rkStep() applies the flow's
//     project(out) after every step, which moves a point that ended inside
//     the body radially out to its surface: impermeability enforced as a
//     constraint. Set flow.project = null to see the raw integrator.
//
// Flows and their sources
//   uniform, solid-body rotation, stagnation-point flow, source/sink:
//     Batchelor (1967) An Introduction to Fluid Dynamics, ch. 2 (kinematics)
//     and ch. 6 (irrotational flow); Kundu, Cohen & Dowling (2016) Fluid
//     Mechanics, 6th ed., ch. 3 (kinematics) and ch. 7 (ideal flow).
//   point vortex with Rankine core: Rankine (1858) A Manual of Applied
//     Mechanics; Saffman (1992) Vortex Dynamics.
//   Lamb–Oseen vortex: Oseen (1912); Lamb (1932) Hydrodynamics, 6th ed.,
//     Art. 334a. An exact Navier–Stokes solution: a line vortex diffusing.
//   plane Couette and plane Poiseuille: Batchelor (1967) ch. 4 (steady
//     unidirectional flow); White (2006) Viscous Fluid Flow, 3rd ed., ch. 3.
//   uniform flow past a circular cylinder, with circulation: Anderson (2017)
//     Fundamentals of Aerodynamics, 6th ed., §3.13 (Cp = 1 − 4 sin²θ),
//     §3.15–3.16 (lifting cylinder, Kutta–Joukowski lift L' = ρ U Γ).
//   Taylor–Green cellular flow: Taylor & Green (1937) Proc. R. Soc. A 158,
//     499–521. With ν > 0 it is the decaying Taylor–Green vortex, an exact
//     Navier–Stokes solution; with ν = 0 it is steady.
//   double gyre: Shadden, Lekien & Marsden (2005) Physica D 212, 271–304,
//     with their parameters A = 0.1, ε = 0.25, ω = 2π/10. They write u = −∂ψ/∂y with ψ = A sin(πf) sin(πy); we keep the
//     course convention u = +∂ψ/∂y, so our ψ is the negative of theirs. The
//     velocity field is identical.
//
// Integrators (explicit Runge–Kutta, driven by Butcher tableaux)
//   Euler, explicit midpoint (RK2), Heun (explicit trapezoid), classical RK4:
//   Hairer, Nørsett & Wanner (1993) Solving ODEs I, §II.1; Butcher (2016)
//   Numerical Methods for ODEs, 3rd ed., ch. 3. Stability function R(z):
//   Hairer & Wanner (1996) Solving ODEs II, §IV.2. Implicit midpoint (the
//   symplectic, hence area-preserving, method for 2-D incompressible flow,
//   whose stream function is a Hamiltonian): Hairer, Lubich & Wanner (2006)
//   Geometric Numerical Integration, ch. VI. We solve its implicit equation
//   by Newton's method (Hairer & Wanner 1996, §IV.8), with the Jacobian
//   I − (Δt/2)∇u from central differences, to round-off. For a linear flow
//   (rotation, strain, shear) that is exact for every Δt, so |R(iΩΔt)| = 1
//   holds at any step size. For a nonlinear flow Newton can fail at large
//   Δt; IMPLICIT_STATUS then reports it (the step returns the iterate with
//   the smallest residual). Plain fixed-point iteration, the textbook
//   shortcut, converges only for (Δt/2)|∇u| < 1 and silently diverges
//   beyond it (ΩΔt ≥ 2 in rotation).
//
// Material derivative: Batchelor (1967) §2.1. Central differences with step
//   h (default 1e-5 in flow length units): truncation error ~ h² f'''/6,
//   round-off ~ 1e-16 f / h, both ~1e-10 for O(1) fields. The same
//   differences give ∇u, divergence, curl and the Okubo–Weiss parameter
//   (Okubo 1970, Deep-Sea Res. 17, 445; Weiss 1991, Physica D 48, 273).
// Material loops: a ring of particles, area by the shoelace formula (signed,
//   positive anticlockwise). Explicit Euler maps a small area by
//   det(I + Δt∇u) = 1 + Δt² det∇u in incompressible flow, so its area error
//   grows loops where rotation dominates and shrinks them where strain does.
//   As the flow stretches a loop, refineLoop() inserts points by cubic
//   interpolation in the Lagrangian label (each particle carries its initial
//   position along the loop, s ∈ [0, 1)); on evenly spaced labels this is
//   the four-point rule (−P₀ + 9P₁ + 9P₂ − P₃)/16 (Dubuc 1986; Dyn, Levin &
//   Gregory 1987). loopArea(loop, true) adds Archimedes' 4/3 parabolic-
//   segment correction to each chord, with the apex at the label midpoint,
//   which is exact for curves cubic in the label: the area error is O(s⁴)
//   in the largest segment length s, also after partial refinement leaves
//   neighbouring segments with unequal label spacing. Resolution error so
//   stays below integration error until filaments get thinner than the
//   point spacing. Cost: in a chaotic flow refinement grows the point count
//   exponentially (double gyre, maxSeg 0.02: ~700, ~3200, ~14000 points
//   after 1, 2, 3 periods). Each point costs ~0.25–0.5 µs per RK4 step and
//   ~0.45–0.8 µs per implicit-midpoint step in node, refinement included
//   (assume 3–5× that on a phone). Give an interactive figure capacity
//   ≲ 5000 for RK4 (≲ 2500 for implicit midpoint) and treat loop.saturated
//   as "resolution exhausted".
//
// Trace events (generators): pathline() and streamline() yield
//   { t: 'op', op: 'point', k, time, x, y } per point, and pathline() with
//   { stages: true } also { t: 'op', op: 'stage', k, stage, time, x, y, u, v }
//   for every velocity sample of the integrator, in the order it takes them.

const TAU = 2 * Math.PI;
const EULER_GAMMA = 0.5772156649015329;

// ---- special function for the Lamb–Oseen stream function -----------------------
// Ein(s) = ∫₀ˢ (1 − e^{−t}) / t dt = ln s + γ + E1(s). Series for s ≤ 1,
// continued fraction for E1 otherwise (Press et al. 2007, Numerical Recipes
// 3rd ed., §6.3).
export function ein(s) {
  if (s <= 0) return 0;
  if (s === Infinity) return Infinity;
  if (s <= 1) {
    let term = s;
    let sum = s;
    for (let k = 2; k < 40; k++) {
      term *= -s / k;
      const add = term / k;
      sum += add;
      if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
    }
    return sum;
  }
  // E1(s) by modified Lentz on the continued fraction.
  let b = s + 1;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * i;
    b += 2;
    d = 1 / (an * d + b);
    c = b + an / c;
    const del = c * d;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.log(s) + EULER_GAMMA + h * Math.exp(-s);
}

// ---- the flows ------------------------------------------------------------------

// Fill (or create) a { xmin, xmax, ymin, ymax } box.
function box(out, xmin, xmax, ymin, ymax) {
  const o = out ?? {};
  o.xmin = xmin;
  o.xmax = xmax;
  o.ymin = ymin;
  o.ymax = ymax;
  return o;
}
// Points within round-off of a body surface count as on it (outside).
const INSIDE = 1 - 1e-12;

// Each entry: metadata + defaults + make(p) returning the methods. The
// methods close over the params object p, so mutating it is live.
export const FLOWS = {
  uniform: {
    name: 'Uniform flow',
    description: 'Everything moves with the same velocity. Streamlines, pathlines and streaklines are the same parallel lines.',
    tex: '\\mathbf{u} = (U, V),\\quad \\psi = U y - V x,\\quad \\phi = U x + V y',
    steady: true,
    divergenceFree: true,
    irrotational: true,
    defaults: { U: 1, V: 0 },
    domain: (p, o) => box(o, -2, 2, -1.5, 1.5),
    make: (p) => ({
      velocity(x, y, t, out) {
        out[0] = p.U;
        out[1] = p.V;
        return out;
      },
      streamfunction: (x, y) => p.U * y - p.V * x,
      potential: (x, y) => p.U * x + p.V * y,
      vorticity: () => 0,
    }),
  },

  rotation: {
    name: 'Solid-body rotation',
    description: 'The fluid turns like a rigid disc: speed grows linearly with radius, vorticity is 2Ω everywhere, and fluid elements do not deform.',
    tex: '\\mathbf{u} = \\Omega\\,(-(y - y_0),\\; x - x_0),\\quad \\psi = -\\tfrac{1}{2}\\Omega r^2,\\quad \\omega = 2\\Omega',
    steady: true,
    divergenceFree: true,
    irrotational: false,
    defaults: { Omega: 1, x0: 0, y0: 0 },
    domain: (p, o) => box(o, p.x0 - 2, p.x0 + 2, p.y0 - 2, p.y0 + 2),
    make: (p) => ({
      velocity(x, y, t, out) {
        out[0] = -p.Omega * (y - p.y0);
        out[1] = p.Omega * (x - p.x0);
        return out;
      },
      streamfunction(x, y) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        return -0.5 * p.Omega * (dx * dx + dy * dy);
      },
      vorticity: () => 2 * p.Omega,
    }),
  },

  rankine: {
    name: 'Point vortex (Rankine core)',
    description: 'Solid-body rotation inside a core of radius a, a potential (irrotational) vortex outside: speed Γ/(2πr) falls off with radius. Set a = 0 for the singular point vortex.',
    tex: 'u_\\theta = \\begin{cases} \\dfrac{\\Gamma r}{2\\pi a^2} & r < a \\\\[4pt] \\dfrac{\\Gamma}{2\\pi r} & r \\ge a \\end{cases}',
    steady: true,
    divergenceFree: true,
    irrotational: false, // irrotational outside the core only
    defaults: { Gamma: TAU, a: 0.25, x0: 0, y0: 0 },
    domain: (p, o) => box(o, p.x0 - 2, p.x0 + 2, p.y0 - 2, p.y0 + 2),
    make: (p) => ({
      velocity(x, y, t, out) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        const r2 = dx * dx + dy * dy;
        let k;
        if (p.a > 0 && r2 < p.a * p.a) k = p.Gamma / (TAU * p.a * p.a);
        else k = r2 > 0 ? p.Gamma / (TAU * r2) : 0;
        out[0] = -k * dy;
        out[1] = k * dx;
        return out;
      },
      streamfunction(x, y) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        const r2 = dx * dx + dy * dy;
        if (p.a > 0 && r2 < p.a * p.a) {
          return (p.Gamma / (2 * TAU)) * (1 - r2 / (p.a * p.a)) - (p.Gamma / TAU) * Math.log(p.a);
        }
        return -(p.Gamma / (2 * TAU)) * Math.log(r2);
      },
      vorticity(x, y) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        return p.a > 0 && dx * dx + dy * dy < p.a * p.a ? p.Gamma / (Math.PI * p.a * p.a) : 0;
      },
    }),
  },

  'lamb-oseen': {
    name: 'Lamb–Oseen vortex',
    description: 'A line vortex spreading by viscous diffusion: a Gaussian blob of vorticity whose core radius grows like √(4ν(t + t₀)). Unsteady, but the streamlines are always circles. At ν = 0 (and for t ≤ −t₀, before it is born) it is the point vortex it starts from.',
    tex: 'u_\\theta = \\frac{\\Gamma}{2\\pi r}\\left(1 - e^{-r^2 / 4\\nu (t + t_0)}\\right),\\quad \\omega = \\frac{\\Gamma}{4\\pi\\nu (t + t_0)}\\, e^{-r^2 / 4\\nu (t + t_0)}',
    steady: (p) => p.nu === 0,
    divergenceFree: true,
    irrotational: false,
    defaults: { Gamma: TAU, nu: 0.01, t0: 5, x0: 0, y0: 0 },
    domain: (p, o) => box(o, p.x0 - 2, p.x0 + 2, p.y0 - 2, p.y0 + 2),
    // c = 4ν(t + t₀) is the squared core radius. c ≤ 0 (ν = 0, or t ≤ −t₀)
    // is the point-vortex limit: u_θ = Γ/2πr, ω = 0 off the centre, and
    // ψ = −(Γ/4π) ln r². (The Ein form tends to that minus (Γ/4π)(γ − ln c),
    // a constant that diverges as c → 0, so ψ jumps by a constant there;
    // its contours do not.) The centre itself returns u = 0 and ω = 0.
    make: (p) => ({
      velocity(x, y, t, out) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        const r2 = dx * dx + dy * dy;
        const c = 4 * p.nu * (t + p.t0);
        let g;
        if (c > 0) {
          // (1 − e^{−r²/c}) / r², exact limit 1/c at the centre.
          g = r2 > 0 ? -Math.expm1(-r2 / c) / r2 : 1 / c;
        } else {
          g = r2 > 0 ? 1 / r2 : 0;
        }
        const k = (p.Gamma / TAU) * g;
        out[0] = -k * dy;
        out[1] = k * dx;
        return out;
      },
      streamfunction(x, y, t) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        const r2 = dx * dx + dy * dy;
        const c = 4 * p.nu * (t + p.t0);
        if (c > 0) return -(p.Gamma / (2 * TAU)) * ein(r2 / c);
        return -(p.Gamma / (2 * TAU)) * Math.log(r2);
      },
      vorticity(x, y, t) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        const c = 4 * p.nu * (t + p.t0);
        if (!(c > 0)) return 0;
        return (p.Gamma / (Math.PI * c)) * Math.exp(-(dx * dx + dy * dy) / c);
      },
    }),
  },

  stagnation: {
    name: 'Stagnation-point flow',
    description: 'Hyperbolic (pure strain) flow: fluid arrives along y, leaves along x, and is stretched in one direction while squeezed in the other. Irrotational and incompressible.',
    tex: '\\mathbf{u} = (a x,\\; -a y),\\quad \\psi = a x y,\\quad \\phi = \\tfrac{1}{2} a (x^2 - y^2)',
    steady: true,
    divergenceFree: true,
    irrotational: true,
    defaults: { a: 1 },
    domain: (p, o) => box(o, -2, 2, -2, 2),
    make: (p) => ({
      velocity(x, y, t, out) {
        out[0] = p.a * x;
        out[1] = -p.a * y;
        return out;
      },
      streamfunction: (x, y) => p.a * x * y,
      potential: (x, y) => 0.5 * p.a * (x * x - y * y),
      vorticity: () => 0,
    }),
  },

  couette: {
    name: 'Plane Couette flow',
    description: 'Fluid sheared between a fixed bottom wall (y = 0) and a top wall (y = H) sliding at speed U. The profile is linear; vorticity is uniform.',
    tex: 'u = U\\,\\frac{y}{H},\\quad v = 0,\\quad \\omega = -\\frac{U}{H}',
    steady: true,
    divergenceFree: true,
    irrotational: false,
    defaults: { U: 1, H: 1 },
    domain: (p, o) => box(o, 0, 3 * p.H, 0, p.H),
    make: (p) => ({
      velocity(x, y, t, out) {
        out[0] = (p.U * y) / p.H;
        out[1] = 0;
        return out;
      },
      streamfunction: (x, y) => (p.U * y * y) / (2 * p.H),
      vorticity: () => -p.U / p.H,
    }),
  },

  poiseuille: {
    name: 'Plane Poiseuille flow',
    description: 'Pressure-driven flow between two fixed walls at y = 0 and y = H: a parabolic profile with centreline speed U_max = G H² / 8μ, where G = −dp/dx.',
    tex: 'u = 4 U_{\\max}\\,\\frac{y (H - y)}{H^2},\\quad v = 0,\\quad U_{\\max} = \\frac{G H^2}{8 \\mu}',
    steady: true,
    divergenceFree: true,
    irrotational: false,
    defaults: { Umax: 1, H: 1 },
    domain: (p, o) => box(o, 0, 3 * p.H, 0, p.H),
    make: (p) => ({
      velocity(x, y, t, out) {
        out[0] = (4 * p.Umax * y * (p.H - y)) / (p.H * p.H);
        out[1] = 0;
        return out;
      },
      streamfunction: (x, y) => (4 * p.Umax * (0.5 * p.H * y * y - (y * y * y) / 3)) / (p.H * p.H),
      vorticity: (x, y) => (-4 * p.Umax * (p.H - 2 * y)) / (p.H * p.H),
    }),
  },

  source: {
    name: 'Source or sink',
    description: 'Fluid created at a point at volume rate m per unit depth (m < 0: a sink). Divergence is m δ(x): zero everywhere except at the source, so the outflow through any curve around it is m. A core of radius a > 0 spreads the source uniformly over a disc. Add U∞ for the Rankine half-body.',
    tex: 'u_r = \\frac{m}{2\\pi r},\\quad \\nabla\\cdot\\mathbf{u} = m\\,\\delta(\\mathbf{x}),\\quad \\phi = \\frac{m}{2\\pi}\\ln r,\\quad \\psi = \\frac{m\\theta}{2\\pi}',
    steady: true,
    divergenceFree: false,
    irrotational: true,
    defaults: { m: TAU, a: 0.15, Uinf: 0, x0: 0, y0: 0 },
    domain: (p, o) => box(o, p.x0 - 2, p.x0 + 2, p.y0 - 1.5, p.y0 + 1.5),
    make: (p) => ({
      velocity(x, y, t, out) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        const r2 = dx * dx + dy * dy;
        let k;
        if (p.a > 0 && r2 < p.a * p.a) k = p.m / (TAU * p.a * p.a);
        else k = r2 > 0 ? p.m / (TAU * r2) : 0;
        out[0] = p.Uinf + k * dx;
        out[1] = k * dy;
        return out;
      },
      // Valid outside the core and off the branch cut θ = ±π (the negative
      // x-axis through the source). Inside the core ∇·u ≠ 0, so no stream
      // function exists; with U∞ = 0 the returned value still has the right
      // (radial) contours there.
      streamfunction(x, y) {
        return (p.m / TAU) * Math.atan2(y - p.y0, x - p.x0) + p.Uinf * (y - p.y0);
      },
      potential(x, y) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        const r2 = dx * dx + dy * dy;
        const base = p.Uinf * dx;
        if (p.a > 0 && r2 < p.a * p.a) {
          return base + (p.m * r2) / (2 * TAU * p.a * p.a) + (p.m / TAU) * Math.log(p.a) - p.m / (2 * TAU);
        }
        return base + (p.m / (2 * TAU)) * Math.log(r2);
      },
      vorticity: () => 0,
      // The exact divergence of the cored source (0 outside the core).
      divergence(x, y) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        return p.a > 0 && dx * dx + dy * dy < p.a * p.a ? p.m / (Math.PI * p.a * p.a) : 0;
      },
    }),
  },

  cylinder: {
    name: 'Flow past a cylinder',
    description: 'Potential flow of speed U past a circular cylinder of radius R: a uniform stream plus a doublet, plus an optional bound vortex of circulation Γ (anticlockwise positive). No drag (d’Alembert); lift per unit span L = −ρUΓ (upward for clockwise circulation), the Kutta–Joukowski theorem.',
    tex: 'u_r = U\\left(1 - \\frac{R^2}{r^2}\\right)\\cos\\theta,\\quad u_\\theta = -U\\left(1 + \\frac{R^2}{r^2}\\right)\\sin\\theta + \\frac{\\Gamma}{2\\pi r},\\quad C_p\\big|_{r=R} = 1 - \\left(2\\sin\\theta - \\frac{\\Gamma}{2\\pi R U}\\right)^2',
    // Formulas a figure can show beside the plots.
    cpTex: 'C_p\\big|_{r=R} = 1 - \\left(2\\sin\\theta - \\frac{\\Gamma}{2\\pi R U}\\right)^2 \\;\\overset{\\Gamma = 0}{=}\\; 1 - 4\\sin^2\\theta',
    liftTex: "L' = -\\rho\\, U\\, \\Gamma",
    steady: true,
    divergenceFree: true,
    irrotational: true,
    defaults: { U: 1, R: 0.5, Gamma: 0, x0: 0, y0: 0 },
    domain: (p, o) => box(o, p.x0 - 4 * p.R, p.x0 + 4 * p.R, p.y0 - 3 * p.R, p.y0 + 3 * p.R),
    make: (p) => ({
      // Zero inside the body (r < R); the potential-flow formula outside.
      velocity(x, y, t, out) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        const r2 = dx * dx + dy * dy;
        const R2 = p.R * p.R;
        if (r2 < R2 * INSIDE) {
          out[0] = 0;
          out[1] = 0;
          return out;
        }
        const q = R2 / (r2 * r2);
        const g = p.Gamma / (TAU * r2);
        out[0] = p.U * (1 - q * (dx * dx - dy * dy)) - g * dy;
        out[1] = -2 * p.U * q * dx * dy + g * dx;
        return out;
      },
      // Zero on the surface and inside the body.
      streamfunction(x, y) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        const r2 = dx * dx + dy * dy;
        const R2 = p.R * p.R;
        if (r2 < R2 * INSIDE) return 0;
        return p.U * dy * (1 - R2 / r2) - (p.Gamma / (2 * TAU)) * Math.log(r2 / R2);
      },
      // Multivalued when Γ ≠ 0 (branch cut on the negative x-axis).
      potential(x, y) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        const r2 = dx * dx + dy * dy;
        if (r2 < p.R * p.R * INSIDE) return 0;
        return p.U * dx * (1 + (p.R * p.R) / r2) + (p.Gamma / TAU) * Math.atan2(dy, dx);
      },
      vorticity: () => 0,
      solid(x, y) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        return dx * dx + dy * dy < p.R * p.R * INSIDE;
      },
      // Impermeability as a constraint (see the header): a point that ended a
      // step inside the body is moved radially out to just outside the
      // surface. Writes out in place; returns true if it moved the point.
      project(out) {
        const dx = out[0] - p.x0;
        const dy = out[1] - p.y0;
        const r2 = dx * dx + dy * dy;
        if (!(r2 < p.R * p.R * INSIDE)) return false;
        const R1 = p.R * (1 + 1e-9);
        if (r2 === 0) {
          out[0] = p.x0 - R1;
          return true;
        }
        const s = R1 / Math.sqrt(r2);
        out[0] = p.x0 + dx * s;
        out[1] = p.y0 + dy * s;
        return true;
      },
      // Pressure coefficient from steady Bernoulli, Cp = 1 − |u|²/U², anywhere
      // in the flow (NaN inside the body, and when U = 0, where Cp has no
      // reference speed).
      pressureCoefficient(x, y) {
        const dx = x - p.x0;
        const dy = y - p.y0;
        const r2 = dx * dx + dy * dy;
        const R2 = p.R * p.R;
        if (r2 < R2 * INSIDE || p.U === 0) return NaN;
        const q = R2 / (r2 * r2);
        const g = p.Gamma / (TAU * r2);
        const u = p.U * (1 - q * (dx * dx - dy * dy)) - g * dy;
        const v = -2 * p.U * q * dx * dy + g * dx;
        return 1 - (u * u + v * v) / (p.U * p.U);
      },
      // Closed form on the surface: Cp(θ) = 1 − (−2 sin θ + Γ/(2πRU))²
      // (NaN when U = 0).
      surfaceCp(theta) {
        if (p.U === 0) return NaN;
        const s = -2 * Math.sin(theta) + p.Gamma / (TAU * p.R * p.U);
        return 1 - s * s;
      },
      // Kutta–Joukowski: force per unit span on the body, y-component.
      // L = −ρ U Γ with Γ anticlockwise positive (= ρ U Γ_cw).
      liftPerSpan: (rho = 1) => -rho * p.U * p.Gamma,
      // Stagnation points as [[x, y], …]: two on the surface at
      // sin θ = Γ / (4π R U) while |Γ| ≤ 4π R U, else one in the flow on the
      // y-axis. None when U = 0 (a pure vortex has none; with Γ = 0 too the
      // fluid is at rest everywhere).
      stagnationPoints() {
        if (p.U === 0 || !(p.R > 0)) return [];
        const s = p.Gamma / (2 * TAU * p.R * p.U);
        if (Math.abs(s) <= 1) {
          const th = Math.asin(s);
          return [
            [p.x0 + p.R * Math.cos(th), p.y0 + p.R * Math.sin(th)],
            [p.x0 + p.R * Math.cos(Math.PI - th), p.y0 + p.R * Math.sin(Math.PI - th)],
          ];
        }
        const G = Math.abs(p.Gamma) / TAU;
        const r = (G + Math.sqrt(G * G - 4 * p.U * p.U * p.R * p.R)) / (2 * p.U);
        return [[p.x0, p.y0 + Math.sign(p.Gamma) * r]];
      },
    }),
  },

  'taylor-green': {
    name: 'Cellular (Taylor–Green) flow',
    description: 'A checkerboard of counter-rotating cells of side L. Steady when ν = 0; with ν > 0 it is the decaying Taylor–Green vortex, an exact Navier–Stokes solution that fades like e^{−2νk²t}.',
    tex: '\\psi = \\frac{U}{k}\\sin kx\\,\\sin ky\\; e^{-2\\nu k^2 t},\\quad k = \\frac{\\pi}{L},\\quad \\omega = 2k^2\\psi',
    steady: (p) => p.nu === 0,
    divergenceFree: true,
    irrotational: false,
    defaults: { U: 1, L: 1, nu: 0 },
    domain: (p, o) => box(o, 0, 2 * p.L, 0, 2 * p.L),
    make: (p) => ({
      velocity(x, y, t, out) {
        const k = Math.PI / p.L;
        const F = p.nu === 0 ? 1 : Math.exp(-2 * p.nu * k * k * t);
        out[0] = p.U * F * Math.sin(k * x) * Math.cos(k * y);
        out[1] = -p.U * F * Math.cos(k * x) * Math.sin(k * y);
        return out;
      },
      streamfunction(x, y, t) {
        const k = Math.PI / p.L;
        const F = p.nu === 0 ? 1 : Math.exp(-2 * p.nu * k * k * t);
        return ((p.U * F) / k) * Math.sin(k * x) * Math.sin(k * y);
      },
      vorticity(x, y, t) {
        const k = Math.PI / p.L;
        const F = p.nu === 0 ? 1 : Math.exp(-2 * p.nu * k * k * t);
        return 2 * p.U * k * F * Math.sin(k * x) * Math.sin(k * y);
      },
    }),
  },

  'double-gyre': {
    name: 'Double gyre',
    description: 'Two counter-rotating gyres in [0, 2] × [0, 1] whose dividing line sways left and right with period 2π/ω. A standard test bed for chaotic mixing and Lagrangian coherent structures.',
    tex: '\\psi = -A \\sin(\\pi f)\\sin(\\pi y),\\quad f = \\varepsilon \\sin(\\omega t)\\, x^2 + (1 - 2\\varepsilon \\sin(\\omega t))\\, x',
    steady: (p) => p.epsilon === 0 || p.omega === 0,
    divergenceFree: true,
    irrotational: false,
    defaults: { A: 0.1, epsilon: 0.25, omega: TAU / 10 },
    domain: (p, o) => box(o, 0, 2, 0, 1),
    make: (p) => ({
      velocity(x, y, t, out) {
        const s = Math.sin(p.omega * t);
        const a = p.epsilon * s;
        const b = 1 - 2 * a;
        const f = a * x * x + b * x;
        const fx = 2 * a * x + b;
        const pf = Math.PI * f;
        const py = Math.PI * y;
        out[0] = -Math.PI * p.A * Math.sin(pf) * Math.cos(py);
        out[1] = Math.PI * p.A * Math.cos(pf) * Math.sin(py) * fx;
        return out;
      },
      streamfunction(x, y, t) {
        const a = p.epsilon * Math.sin(p.omega * t);
        const f = a * x * x + (1 - 2 * a) * x;
        return -p.A * Math.sin(Math.PI * f) * Math.sin(Math.PI * y);
      },
      vorticity(x, y, t) {
        const a = p.epsilon * Math.sin(p.omega * t);
        const b = 1 - 2 * a;
        const f = a * x * x + b * x;
        const fx = 2 * a * x + b;
        const pf = Math.PI * f;
        return p.A * Math.PI * Math.sin(Math.PI * y) * (2 * a * Math.cos(pf) - Math.PI * (fx * fx + 1) * Math.sin(pf));
      },
    }),
  },
};

export const FLOW_IDS = Object.keys(FLOWS);
for (const id of FLOW_IDS) FLOWS[id].id = id;

// A live flow object from a registry entry. params override the defaults.
export function makeFlow(id, params = {}) {
  const def = FLOWS[id];
  if (!def) throw new Error(`unknown flow ${id}`);
  const p = { ...def.defaults, ...params };
  const m = def.make(p);
  // One domain object per flow, refreshed in place on every read (no
  // allocation per frame).
  const dom = def.domain(p, null);
  const core = ['velocity', 'streamfunction', 'vorticity', 'potential', 'solid', 'project'];
  return {
    id,
    name: def.name,
    description: def.description,
    tex: def.tex,
    params: p,
    get domain() {
      return def.domain(p, dom);
    },
    get steady() {
      return typeof def.steady === 'function' ? def.steady(p) : def.steady;
    },
    divergenceFree: def.divergenceFree,
    irrotational: def.irrotational,
    velocity: m.velocity,
    streamfunction: m.streamfunction ?? null,
    vorticity: m.vorticity ?? null,
    potential: m.potential ?? null,
    solid: m.solid ?? null,
    project: m.project ?? null,
    ...Object.fromEntries(Object.entries(m).filter(([k]) => !core.includes(k))),
  };
}

// ---- scalar fields (for the material derivative and dye figures) ------------------

export const SCALARS = {
  blob: {
    name: 'Fixed warm spot',
    description: 'A Gaussian bump that stays put: ∂c/∂t = 0, so Dc/Dt = u·∇c.',
    defaults: { x0: 0, y0: 0, s: 0.4 },
    make: (p) => (x, y) => Math.exp(-((x - p.x0) ** 2 + (y - p.y0) ** 2) / (2 * p.s * p.s)),
  },
  gradient: {
    name: 'Linear gradient',
    description: 'c = Gx: a uniform gradient, like a temperature that rises steadily to the east.',
    defaults: { G: 1 },
    make: (p) => (x) => p.G * x,
  },
  stripes: {
    name: 'Stripes',
    description: 'c = sin(kx): fixed stripes for the flow to carry fluid across.',
    defaults: { k: Math.PI },
    make: (p) => (x) => Math.sin(p.k * x),
  },
  'moving-blob': {
    name: 'Drifting blob',
    description: 'A Gaussian bump carried at constant velocity (U, V). In uniform flow with the same velocity it is materially conserved: the local and convective rates cancel.',
    defaults: { x0: -1, y0: 0, s: 0.4, U: 1, V: 0 },
    make: (p) => (x, y, t) => Math.exp(-((x - p.x0 - p.U * t) ** 2 + (y - p.y0 - p.V * t) ** 2) / (2 * p.s * p.s)),
  },
  warming: {
    name: 'Uniform warming',
    description: 'c = c₀ + βt everywhere: only the local rate is non-zero.',
    defaults: { c0: 0, beta: 1 },
    make: (p) => (x, y, t) => p.c0 + p.beta * t,
  },
};

for (const id of Object.keys(SCALARS)) SCALARS[id].id = id;

// A scalar field c(x, y, t) as a plain function, with .id, .label (also
// .name), .description and live .params.
export function makeScalar(id, params = {}) {
  const def = SCALARS[id];
  if (!def) throw new Error(`unknown scalar ${id}`);
  const p = { ...def.defaults, ...params };
  const f = def.make(p);
  const fn = (x, y, t = 0) => f(x, y, t);
  Object.defineProperty(fn, 'name', { value: def.name });
  fn.id = id;
  fn.label = def.name;
  fn.description = def.description;
  fn.params = p;
  return fn;
}

// ---- kinematic diagnostics (central differences) ----------------------------------

const VA = new Float64Array(2);
const VB = new Float64Array(2);
const GRAD = new Float64Array(4);

// [∂u/∂x, ∂u/∂y, ∂v/∂x, ∂v/∂y] by second-order central differences with step
// h. Writes into out (default: a shared scratch array, overwritten by the
// next call).
export function velocityGradient(flow, x, y, t = 0, h = 1e-5, out = GRAD) {
  flow.velocity(x + h, y, t, VA);
  flow.velocity(x - h, y, t, VB);
  out[0] = (VA[0] - VB[0]) / (2 * h);
  out[2] = (VA[1] - VB[1]) / (2 * h);
  flow.velocity(x, y + h, t, VA);
  flow.velocity(x, y - h, t, VB);
  out[1] = (VA[0] - VB[0]) / (2 * h);
  out[3] = (VA[1] - VB[1]) / (2 * h);
  return out;
}

// ∇·u = ∂u/∂x + ∂v/∂y.
export function divergence(flow, x, y, t = 0, h = 1e-5) {
  const g = velocityGradient(flow, x, y, t, h);
  return g[0] + g[3];
}

// ω = ∂v/∂x − ∂u/∂y.
export function curl(flow, x, y, t = 0, h = 1e-5) {
  const g = velocityGradient(flow, x, y, t, h);
  return g[2] - g[1];
}

// Okubo–Weiss parameter Q = s² − ω² with s² = (u_x − v_y)² + (v_x + u_y)²:
// Q > 0 where strain dominates, Q < 0 where rotation dominates (Okubo 1970;
// Weiss 1991). It decides the sign of explicit Euler's area error.
export function okuboWeiss(flow, x, y, t = 0, h = 1e-5) {
  const g = velocityGradient(flow, x, y, t, h);
  const sn = g[0] - g[3];
  const ss = g[2] + g[1];
  const w = g[2] - g[1];
  return sn * sn + ss * ss - w * w;
}

// Material derivative of a scalar c(x, y, t) following the flow:
//   Dc/Dt = ∂c/∂t + u·∇c  =  local + convective.
// All derivatives by central differences with step h (in both space and
// time), error O(h²). scalar is a function (x, y, t) → number or an object
// with value(x, y, t). Pass out to avoid allocating the result object.
const scalarAt = (s, x, y, t) => (typeof s === 'function' ? s(x, y, t) : s.value(x, y, t));
export function materialDerivative(flow, scalar, x, y, t = 0, h = 1e-5, out = null) {
  const c = scalar;
  flow.velocity(x, y, t, VA);
  const u = VA[0];
  const v = VA[1];
  const local = (scalarAt(c, x, y, t + h) - scalarAt(c, x, y, t - h)) / (2 * h);
  const cx = (scalarAt(c, x + h, y, t) - scalarAt(c, x - h, y, t)) / (2 * h);
  const cy = (scalarAt(c, x, y + h, t) - scalarAt(c, x, y - h, t)) / (2 * h);
  const convective = u * cx + v * cy;
  const o = out ?? {};
  o.local = local;
  o.convective = convective;
  o.total = local + convective;
  o.u = u;
  o.v = v;
  o.dcdx = cx;
  o.dcdy = cy;
  return o;
}

// ---- integrators -------------------------------------------------------------

// Butcher tableaux. A is strictly lower triangular (explicit methods).
export const INTEGRATORS = {
  euler: {
    id: 'euler',
    name: 'Explicit Euler',
    description: 'Step along the velocity at the start point. Cheap, first order, and it spirals outward in any rotating flow.',
    tex: '\\mathbf{x}^{n+1} = \\mathbf{x}^n + \\Delta t\\,\\mathbf{u}(\\mathbf{x}^n, t^n)',
    order: 1,
    stages: 1,
    explicit: true,
    A: [[]],
    b: [1],
    c: [0],
    stability: 'In pure rotation |R(iΩΔt)| = √(1 + (ΩΔt)²) > 1 for every Δt: radius grows each step.',
  },
  midpoint: {
    id: 'midpoint',
    name: 'Midpoint (RK2)',
    description: 'Take a half step with Euler, then use the velocity found there for the whole step. Second order.',
    tex: '\\mathbf{x}^{n+1} = \\mathbf{x}^n + \\Delta t\\,\\mathbf{u}\\!\\left(\\mathbf{x}^n + \\tfrac{\\Delta t}{2}\\mathbf{u}(\\mathbf{x}^n, t^n),\\; t^n + \\tfrac{\\Delta t}{2}\\right)',
    order: 2,
    stages: 2,
    explicit: true,
    A: [[], [0.5]],
    b: [0, 1],
    c: [0, 0.5],
    stability: 'In pure rotation |R(iΩΔt)| = √(1 + (ΩΔt)⁴/4): a much slower outward drift than Euler.',
  },
  heun: {
    id: 'heun',
    name: 'Heun (explicit trapezoid)',
    description: 'Predict with Euler, then average the velocities at the start and the predicted end. Second order.',
    tex: '\\tilde{\\mathbf{x}} = \\mathbf{x}^n + \\Delta t\\,\\mathbf{u}^n,\\quad \\mathbf{x}^{n+1} = \\mathbf{x}^n + \\tfrac{\\Delta t}{2}\\left(\\mathbf{u}(\\mathbf{x}^n, t^n) + \\mathbf{u}(\\tilde{\\mathbf{x}}, t^{n+1})\\right)',
    order: 2,
    stages: 2,
    explicit: true,
    A: [[], [1]],
    b: [0.5, 0.5],
    c: [0, 1],
    stability: 'Same stability function as the midpoint rule, R(z) = 1 + z + z²/2.',
  },
  rk4: {
    id: 'rk4',
    name: 'Classical RK4',
    description: 'Four velocity samples per step, weighted 1:2:2:1. Fourth order; in rotation it loses radius very slowly.',
    tex: '\\mathbf{x}^{n+1} = \\mathbf{x}^n + \\tfrac{\\Delta t}{6}\\left(\\mathbf{k}_1 + 2\\mathbf{k}_2 + 2\\mathbf{k}_3 + \\mathbf{k}_4\\right)',
    order: 4,
    stages: 4,
    explicit: true,
    A: [[], [0.5], [0, 0.5], [0, 0, 1]],
    b: [1 / 6, 1 / 3, 1 / 3, 1 / 6],
    c: [0, 0.5, 0.5, 1],
    stability: 'In pure rotation |R(iΩΔt)| = √(1 − (ΩΔt)⁶/72 + (ΩΔt)⁸/576) < 1 for ΩΔt < 2√2: radius shrinks by ≈ (ΩΔt)⁶/144 per step.',
  },
  'implicit-midpoint': {
    id: 'implicit-midpoint',
    name: 'Implicit midpoint',
    description: 'Use the velocity at the midpoint of the step’s own start and end, found by solving an equation each step. Second order and symplectic: for any incompressible 2-D flow it preserves area exactly (here the equation is solved by Newton’s method to round-off).',
    tex: '\\mathbf{x}^{n+1} = \\mathbf{x}^n + \\Delta t\\,\\mathbf{u}\\!\\left(\\tfrac{1}{2}(\\mathbf{x}^n + \\mathbf{x}^{n+1}),\\; t^n + \\tfrac{\\Delta t}{2}\\right)',
    order: 2,
    stages: 1,
    explicit: false,
    A: [[0.5]],
    b: [1],
    c: [0.5],
    stability: 'R(z) = (1 + z/2)/(1 − z/2): |R(iΩΔt)| = 1 exactly in rotation for every Δt (a Cayley transform; each step turns by 2 arctan(ΩΔt/2) instead of ΩΔt). In pure strain R has a pole at aΔt = 2. Newton solves the step exactly for linear flows at any Δt; plain fixed-point iteration would diverge for ΩΔt ≥ 2.',
  },
};

export const INTEGRATOR_IDS = Object.keys(INTEGRATORS);

// Stability function R(z) = 1 + z bᵀ(I − zA)⁻¹ 1 evaluated at z = i·w, and
// returned as |R(iw)|: the factor by which a step multiplies the radius in
// solid-body rotation with w = ΩΔt (and |R|², the factor for the area of
// any material loop in that flow). No allocation.
const RYR = new Float64Array(8);
const RYI = new Float64Array(8);
export function rotationAmplification(method, w) {
  const m = typeof method === 'string' ? INTEGRATORS[method] : method;
  if (!m.explicit) {
    // Implicit midpoint: R(z) = (1 + z/2)/(1 − z/2), |R(iw)| = 1 for every
    // real w (rkStep solves it exactly in linear flows: see IMPLICIT_STATUS).
    return 1;
  }
  const s = m.stages;
  // Stage values Y_i = 1 + z Σ_j a_ij Y_j (complex), then R = 1 + z Σ b_i Y_i.
  const yr = s <= 8 ? RYR : new Float64Array(s);
  const yi = s <= 8 ? RYI : new Float64Array(s);
  for (let i = 0; i < s; i++) {
    let sr = 0;
    let si = 0;
    for (let j = 0; j < i; j++) {
      const a = m.A[i][j] || 0;
      sr += a * yr[j];
      si += a * yi[j];
    }
    // 1 + i w (sr + i si) = (1 − w si) + i w sr
    yr[i] = 1 - w * si;
    yi[i] = w * sr;
  }
  let sr = 0;
  let si = 0;
  for (let i = 0; i < s; i++) {
    sr += m.b[i] * yr[i];
    si += m.b[i] * yi[i];
  }
  const Rr = 1 - w * si;
  const Ri = w * sr;
  return Math.hypot(Rr, Ri);
}

const KX = new Float64Array(4);
const KY = new Float64Array(4);
const VEL = new Float64Array(2);
const POS = new Float64Array(2);

// One step of a particle from (x, y) at time t to time t + dt. Writes the
// new position into out and returns it. onStage(s, xs, ys, ts, u, v), if
// given, sees every velocity sample the method takes, in order (that is what
// the stage-by-stage figure draws; for implicit midpoint, the converged
// midpoint only). This is the only stepping code in the module: pathlines,
// streamlines, streaklines and loops all call it. If the flow has a
// project(out) constraint (a solid body), it is applied to the result.
export function rkStep(flow, x, y, t, dt, method, out, onStage = null) {
  const m = typeof method === 'string' ? INTEGRATORS[method] : method;
  if (!m) throw new Error(`unknown integrator ${method}`);
  if (!m.explicit) {
    implicitMidpointStep(flow, x, y, t, dt, out, onStage);
    if (flow.project) flow.project(out);
    return out;
  }
  const { A, b, c, stages } = m;
  for (let s = 0; s < stages; s++) {
    let xs = x;
    let ys = y;
    const row = A[s];
    for (let j = 0; j < s; j++) {
      const a = row[j];
      if (a) {
        xs += dt * a * KX[j];
        ys += dt * a * KY[j];
      }
    }
    const ts = t + c[s] * dt;
    flow.velocity(xs, ys, ts, VEL);
    KX[s] = VEL[0];
    KY[s] = VEL[1];
    if (onStage) onStage(s, xs, ys, ts, VEL[0], VEL[1]);
  }
  let xn = x;
  let yn = y;
  for (let s = 0; s < stages; s++) {
    xn += dt * b[s] * KX[s];
    yn += dt * b[s] * KY[s];
  }
  out[0] = xn;
  out[1] = yn;
  if (flow.project) flow.project(out);
  return out;
}

// What the last implicit-midpoint step did: Newton iterations used, whether
// it converged, its final residual |X − x − Δt u(mid)|₁, and a running count
// of steps that failed to converge (reset it yourself). A figure can show
// "solver failed" instead of drawing a garbage point silently.
export const IMPLICIT_STATUS = { iterations: 0, converged: true, residual: 0, failures: 0 };

const IM_MAX_ITER = 40;
const IM_A = new Float64Array(2);
const IM_B = new Float64Array(2);

// Implicit midpoint: solve F(X) = X − x − Δt u((x + X)/2, t + Δt/2) = 0 from an
// explicit-Euler guess by Newton's method. Jacobian J = I − (Δt/2)∇u at the
// midpoint, ∇u by central differences (4 velocity samples), refreshed only
// when convergence slows (simplified Newton otherwise); for a linear flow
// one Jacobian is exact, so the step is exact for every Δt. If a Newton
// step fails to reduce the residual (non-smooth fields: the cylinder's
// surface, a Rankine core edge), the next update is a fixed-point one
// instead. Non-convergence is reported in IMPLICIT_STATUS and the iterate
// with the smallest residual is returned.
function implicitMidpointStep(flow, x, y, t, dt, out, onStage) {
  const tm = t + 0.5 * dt;
  flow.velocity(x, y, t, VEL);
  let X = x + dt * VEL[0];
  let Y = y + dt * VEL[1];
  let bestX = X;
  let bestY = Y;
  let bestR = Infinity;
  let um = VEL[0];
  let vm = VEL[1];
  let j00 = 1;
  let j01 = 0;
  let j10 = 0;
  let j11 = 1;
  let haveJ = false;
  let prevR = Infinity;
  let converged = false;
  let it = 0;
  while (it < IM_MAX_ITER) {
    it++;
    const xm = 0.5 * (x + X);
    const ym = 0.5 * (y + Y);
    flow.velocity(xm, ym, tm, VEL);
    const u = VEL[0];
    const v = VEL[1];
    const rx = X - x - dt * u;
    const ry = Y - y - dt * v;
    const res = Math.abs(rx) + Math.abs(ry);
    if (!(res < Infinity)) break; // NaN or overflow
    if (res < bestR) {
      bestR = res;
      bestX = X;
      bestY = Y;
      um = u;
      vm = v;
    }
    // Round-off floor of the residual.
    const floor = 4.5e-16 * (Math.abs(X) + Math.abs(Y) + Math.abs(x) + Math.abs(y) + Math.abs(dt) * (Math.abs(u) + Math.abs(v)));
    if (res <= floor) {
      converged = true;
      break;
    }
    if (res >= prevR) {
      // No progress. Near round-off that means done; otherwise Newton is
      // lost (a non-smooth field), so take a fixed-point step from the best
      // point and start again.
      if (prevR <= 100 * floor) {
        converged = true;
        break;
      }
      const bxm = 0.5 * (x + bestX);
      const bym = 0.5 * (y + bestY);
      flow.velocity(bxm, bym, tm, VEL);
      X = x + dt * VEL[0];
      Y = y + dt * VEL[1];
      haveJ = false;
      prevR = Infinity;
      continue;
    }
    if (!haveJ || res > 0.01 * prevR) {
      // Fresh Jacobian J = I − (Δt/2)∇u at the midpoint.
      const h = 1e-6 * (1 + Math.abs(xm) + Math.abs(ym));
      flow.velocity(xm + h, ym, tm, IM_A);
      flow.velocity(xm - h, ym, tm, IM_B);
      const s = (0.5 * dt) / (2 * h);
      j00 = 1 - s * (IM_A[0] - IM_B[0]);
      j10 = -s * (IM_A[1] - IM_B[1]);
      flow.velocity(xm, ym + h, tm, IM_A);
      flow.velocity(xm, ym - h, tm, IM_B);
      j01 = -s * (IM_A[0] - IM_B[0]);
      j11 = 1 - s * (IM_A[1] - IM_B[1]);
      haveJ = true;
    }
    const det = j00 * j11 - j01 * j10;
    if (!(Math.abs(det) > 1e-300)) break; // singular (e.g. strain at aΔt = 2)
    const dx = (j11 * rx - j01 * ry) / det;
    const dy = (j00 * ry - j10 * rx) / det;
    X -= dx;
    Y -= dy;
    prevR = res;
    if (Math.abs(dx) + Math.abs(dy) <= 1e-15 * (1 + Math.abs(X) + Math.abs(Y))) {
      // The update is at round-off: X is the solution.
      bestX = X;
      bestY = Y;
      converged = true;
      break;
    }
  }
  IMPLICIT_STATUS.iterations = it;
  IMPLICIT_STATUS.converged = converged;
  IMPLICIT_STATUS.residual = bestR;
  if (!converged) IMPLICIT_STATUS.failures++;
  if (onStage) onStage(0, 0.5 * (x + bestX), 0.5 * (y + bestY), tm, um, vm);
  out[0] = bestX;
  out[1] = bestY;
  return out;
}

// Advance n particles (arrays xs, ys, updated in place) from t to t + dt.
export function advectParticles(flow, xs, ys, n, t, dt, method = 'rk4') {
  const m = typeof method === 'string' ? INTEGRATORS[method] : method;
  for (let k = 0; k < n; k++) {
    rkStep(flow, xs[k], ys[k], t, dt, m, POS);
    xs[k] = POS[0];
    ys[k] = POS[1];
  }
}

// ---- pathlines, streamlines, streaklines --------------------------------------

// The pathline of the particle at (x0, y0) at time t0: the curve it traces
// as time runs. Yields { t: 'op', op: 'point', k, time, x, y } for the start
// and after each of the `steps` steps; with opts.stages it also yields
// { t: 'op', op: 'stage', k, stage, time, x, y, u, v } for each velocity
// sample before the point it leads to. Returns { x, y, time } arrays.
export function* pathline(flow, x0, y0, t0, dt, steps, method = 'rk4', opts = {}) {
  const xs = new Float64Array(steps + 1);
  const ys = new Float64Array(steps + 1);
  const ts = new Float64Array(steps + 1);
  const out = new Float64Array(2);
  const pending = opts.stages ? [] : null;
  let k = 0;
  const onStage = pending
    ? (stage, x, y, time, u, v) => pending.push({ t: 'op', op: 'stage', k, stage, time, x, y, u, v })
    : null;
  xs[0] = x0;
  ys[0] = y0;
  ts[0] = t0;
  yield { t: 'op', op: 'point', k: 0, time: t0, x: x0, y: y0 };
  for (k = 1; k <= steps; k++) {
    if (pending) pending.length = 0;
    const t = t0 + (k - 1) * dt;
    rkStep(flow, xs[k - 1], ys[k - 1], t, dt, method, out, onStage);
    xs[k] = out[0];
    ys[k] = out[1];
    ts[k] = t0 + k * dt;
    if (pending) for (const e of pending) yield e;
    yield { t: 'op', op: 'point', k, time: ts[k], x: xs[k], y: ys[k] };
  }
  return { x: xs, y: ys, time: ts };
}

// Non-allocating pathline into caller arrays (length ≥ steps + 1). Returns
// the number of points written.
export function tracePathline(flow, x0, y0, t0, dt, steps, method, outX, outY) {
  const m = typeof method === 'string' ? INTEGRATORS[method] : method;
  outX[0] = x0;
  outY[0] = y0;
  for (let k = 1; k <= steps; k++) {
    rkStep(flow, outX[k - 1], outY[k - 1], t0 + (k - 1) * dt, dt, m, POS);
    outX[k] = POS[0];
    outY[k] = POS[1];
  }
  return steps + 1;
}

// The velocity field frozen at time t, optionally normalised to unit speed
// (so the parameter is arc length) and reversed (sign = −1). One shared
// adapter, set up by each traceStreamline call (which runs to completion
// before returning, so calls never interleave): no allocation per call.
const FROZEN = {
  flow: null,
  t: 0,
  unit: false,
  sign: 1,
  minSpeed: 0,
  stalled: false,
  velocity(x, y, _t, out) {
    this.flow.velocity(x, y, this.t, out);
    let s = this.sign;
    if (this.unit) {
      const sp = Math.hypot(out[0], out[1]);
      if (sp < this.minSpeed) {
        this.stalled = true;
        out[0] = 0;
        out[1] = 0;
        return out;
      }
      s /= sp;
    }
    out[0] *= s;
    out[1] *= s;
    return out;
  },
};

const inBounds = (b, x, y) => !b || (x >= b.xmin && x <= b.xmax && y >= b.ymin && y <= b.ymax);

// A streamline: a curve everywhere tangent to the velocity at one fixed
// instant t. Integrates dx/ds = u(x, t) (or u/|u| with opts.unit, so ds is
// arc length). opts: { unit = false, direction = 1 (or −1 for upstream),
// bounds = null (stop on leaving {xmin, xmax, ymin, ymax}), minSpeed = 1e-9
// (stop at a stagnation point when unit) }. Stops inside flow.solid too.
// Yields point events like pathline (time is the parameter s); returns
// { x, y, count }.
export function* streamline(flow, x0, y0, t, ds, steps, method = 'rk4', opts = {}) {
  const xs = new Float64Array(steps + 1);
  const ys = new Float64Array(steps + 1);
  const count = traceStreamline(flow, x0, y0, t, ds, steps, method, xs, ys, opts);
  for (let k = 0; k < count; k++) yield { t: 'op', op: 'point', k, time: k * ds, x: xs[k], y: ys[k] };
  return { x: xs, y: ys, count };
}

// Non-allocating streamline into caller arrays (length ≥ steps + 1).
// Returns the number of points written.
export function traceStreamline(flow, x0, y0, t, ds, steps, method, outX, outY, opts = {}) {
  const f = FROZEN;
  f.flow = flow;
  f.t = t;
  f.unit = opts.unit ?? false;
  f.sign = opts.direction ?? 1;
  f.minSpeed = opts.minSpeed ?? 1e-9;
  f.stalled = false;
  const bounds = opts.bounds ?? null;
  const m = typeof method === 'string' ? INTEGRATORS[method] : method;
  outX[0] = x0;
  outY[0] = y0;
  let n = 1;
  for (let k = 1; k <= steps; k++) {
    rkStep(f, outX[k - 1], outY[k - 1], 0, ds, m, POS);
    if (f.stalled || !inBounds(bounds, POS[0], POS[1]) || (flow.solid && flow.solid(POS[0], POS[1]))) break;
    outX[k] = POS[0];
    outY[k] = POS[1];
    n++;
  }
  return n;
}

// A streakline: dye released continuously from a fixed point. It is the
// curve through every particle that passed the release point at an earlier
// time. Ring buffer of `capacity` particles; when full, the oldest is
// overwritten. Use streakIndex(streak, k) for the k-th newest particle
// (k = 0 sits at the source).
export function createStreakline({ x0 = 0, y0 = 0, capacity = 400, every = 1 } = {}) {
  return {
    x0,
    y0,
    capacity,
    every, // release one particle every `every` steps
    x: new Float64Array(capacity),
    y: new Float64Array(capacity),
    born: new Float64Array(capacity), // release time of each particle
    head: 0, // where the next release goes
    count: 0,
    tick: 0,
  };
}

function release(streak, t) {
  const h = streak.head;
  streak.x[h] = streak.x0;
  streak.y[h] = streak.y0;
  streak.born[h] = t;
  streak.head = (h + 1) % streak.capacity;
  if (streak.count < streak.capacity) streak.count++;
}

// Empty the streakline and release the first particle at time t.
export function streaklineReset(streak, t = 0) {
  streak.head = 0;
  streak.count = 0;
  streak.tick = 0;
  release(streak, t);
}

// Buffer index of the k-th newest particle (0 ≤ k < count).
export function streakIndex(streak, k) {
  const i = streak.head - 1 - k;
  return i >= 0 ? i : i + streak.capacity;
}

// Advect every released particle from t to t + dt, then release a new one
// at the source (every `every` steps). Call streaklineReset first.
export function streaklineStep(streak, flow, t, dt, method = 'rk4') {
  const m = typeof method === 'string' ? INTEGRATORS[method] : method;
  const { x, y, capacity, count } = streak;
  for (let k = 0; k < count; k++) {
    let i = streak.head - 1 - k;
    if (i < 0) i += capacity;
    rkStep(flow, x[i], y[i], t, dt, m, POS);
    x[i] = POS[0];
    y[i] = POS[1];
  }
  streak.tick++;
  if (streak.tick % streak.every === 0) release(streak, t + dt);
}

// ---- material loops ----------------------------------------------------------

// Signed polygon area by the shoelace formula (positive anticlockwise).
export function polygonArea(xs, ys, n = xs.length) {
  let s = 0;
  for (let k = 0, j = n - 1; k < n; j = k++) s += xs[j] * ys[k] - xs[k] * ys[j];
  return 0.5 * s;
}

// A closed loop of n fluid particles on a circle (anticlockwise), to be
// carried by the flow. Its enclosed area is a material area: unchanged by any
// incompressible flow, so any change is error. Two kinds: integration error
// (the method), and resolution error (the polygon's straight chords cut the
// corners of a curve that the flow has stretched and folded). refineLoop()
// controls the second; capacity bounds how many points it may add (see the
// header for the cost: keep it ≲ 5000 in an interactive figure).
// Fields: n points in x[0..n), y[0..n); s[k] ∈ [0, 1) is particle k's
// Lagrangian label (its initial angle / 2π), which never changes; sx, sy, ss
// are scratch; area0 = πr² is the exact material area; saturated is set
// when refinement hits capacity.
export function createMaterialLoop({ cx = 0, cy = 0, r = 0.5, n = 200, capacity = n } = {}) {
  const cap = Math.max(capacity, n, 3);
  const loop = {
    n: 0,
    capacity: cap,
    x: new Float64Array(cap),
    y: new Float64Array(cap),
    s: new Float64Array(cap),
    area0: 0,
    saturated: false,
    sx: new Float64Array(cap),
    sy: new Float64Array(cap),
    ss: new Float64Array(cap),
  };
  return resetMaterialLoop(loop, { cx, cy, r, n });
}

// Re-seed an existing loop as a circle (for example while the reader drags
// it) without allocating. n is clamped to the loop's capacity. Returns loop.
export function resetMaterialLoop(loop, { cx = 0, cy = 0, r = 0.5, n = loop.n } = {}) {
  const m = Math.max(3, Math.min(n, loop.capacity));
  for (let k = 0; k < m; k++) {
    const a = (TAU * k) / m;
    loop.x[k] = cx + r * Math.cos(a);
    loop.y[k] = cy + r * Math.sin(a);
    loop.s[k] = k / m;
  }
  loop.n = m;
  // The exact area of the material region (the disc), which every
  // incompressible flow preserves; compare loopArea(loop, true) with it.
  loop.area0 = Math.PI * r * r;
  loop.saturated = false;
  return loop;
}

export function advectLoop(loop, flow, t, dt, method = 'rk4') {
  advectParticles(flow, loop.x, loop.y, loop.n, t, dt, method);
}

// The point of segment k → k1 at its label midpoint, by the cubic through
// the four neighbours k0, k, k1, k2 at their labels (Lagrange interpolation
// in the label; with no labels, or evenly spaced ones, this is the
// four-point rule (−P₀ + 9P₁ + 9P₂ − P₃)/16). Writes APEX = [x, y, label].
const APEX = new Float64Array(3);
function apex(x, y, s, k0, k, k1, k2) {
  let w0 = -1 / 16;
  let w1 = 9 / 16;
  let w2 = 9 / 16;
  let w3 = -1 / 16;
  let sm = 0;
  if (s) {
    // Label gaps (periodic, labels in [0, 1)); nodes at −h0, 0, h1, h1 + h2,
    // target h1/2.
    let h0 = s[k] - s[k0];
    if (h0 <= 0) h0 += 1;
    let h1 = s[k1] - s[k];
    if (h1 <= 0) h1 += 1;
    let h2 = s[k2] - s[k1];
    if (h2 <= 0) h2 += 1;
    const a = h0 + 0.5 * h1;
    const b = 0.5 * h1 + h2;
    const H = h0 + h1 + h2;
    w0 = -(h1 * h1 * b) / (4 * h0 * (h0 + h1) * H);
    w1 = (a * b) / (2 * h0 * (h1 + h2));
    w2 = (a * b) / (2 * (h0 + h1) * h2);
    w3 = -(h1 * h1 * a) / (4 * h2 * (h1 + h2) * H);
    sm = s[k] + 0.5 * h1;
    if (sm >= 1) sm -= 1;
  }
  APEX[0] = w0 * x[k0] + w1 * x[k] + w2 * x[k1] + w3 * x[k2];
  APEX[1] = w0 * y[k0] + w1 * y[k] + w2 * y[k1] + w3 * y[k2];
  APEX[2] = sm;
}

// Area enclosed by the loop. Plain: the shoelace area of the polygon, which
// misses the thin slivers between each chord and the curve (relative error
// ~ (κ s)² for segment length s and curvature κ). curved = true adds 4/3 of
// the triangle between each chord and the curve's point at the segment's
// label midpoint (Archimedes' quadrature of the parabola). That is exact
// for curves quadratic in the label, and its error is O(s⁵) per segment for
// smooth ones, so the area converges like s⁴, with even or uneven label
// spacing (on even spacing it is the Richardson value (4A₂ₙ − Aₙ)/3). No
// allocation.
export function loopArea(loop, curved = false) {
  const { n, x, y } = loop;
  const a = polygonArea(x, y, n);
  if (!curved || n < 4) return a;
  const lab = loop.s ?? null;
  let s = 0;
  for (let k = 0; k < n; k++) {
    const k0 = k === 0 ? n - 1 : k - 1;
    const k1 = k + 1 === n ? 0 : k + 1;
    const k2 = k1 + 1 === n ? 0 : k1 + 1;
    apex(x, y, lab, k0, k, k1, k2);
    const mx = APEX[0];
    const my = APEX[1];
    // Shoelace terms of P_k → M → P_k+1 minus those of the chord P_k → P_k+1.
    s += x[k] * my - mx * y[k] + mx * y[k1] - x[k1] * my - (x[k] * y[k1] - x[k1] * y[k]);
  }
  return a + (4 / 3) * 0.5 * s;
}

// Insert a point into every segment that is longer than maxSeg or, if maxSag
// is given, bends too sharply: when its midpoint sits more than maxSag off
// the chord (a sagitta s²/8ρ for a circle of radius ρ). The curvature test
// resolves hairpin folds but can multiply points quickly in chaotic flows;
// it is off by default. The new particle gets the segment's midpoint label,
// and its position comes from the cubic through the four neighbours in the
// label (see apex), exact for cubics, so it lies on the material curve to
// O(s⁴) instead of on the chord. Call it after each advection step. Stops
// adding (and sets loop.saturated) at capacity. Returns the number of points
// inserted. No allocation, but loop.x, loop.y and loop.s swap with internal
// scratch arrays: re-read them after the call.
export function refineLoop(loop, maxSeg, maxSag = Infinity) {
  const { n, x, y, sx, sy, capacity } = loop;
  const lab = loop.s ?? null;
  const sl = loop.ss ?? null;
  const m2 = maxSeg * maxSeg;
  const g2 = maxSag * maxSag;
  const sagTest = maxSag < Infinity;
  let w = 0;
  let added = 0;
  for (let k = 0; k < n; k++) {
    const k1 = k + 1 === n ? 0 : k + 1;
    sx[w] = x[k];
    sy[w] = y[k];
    if (lab) sl[w] = lab[k];
    w++;
    const dx = x[k1] - x[k];
    const dy = y[k1] - y[k];
    const long = dx * dx + dy * dy > m2;
    if (!long && !sagTest) continue;
    const k0 = k === 0 ? n - 1 : k - 1;
    const k2 = k1 + 1 === n ? 0 : k1 + 1;
    apex(x, y, lab, k0, k, k1, k2);
    const ex = APEX[0] - 0.5 * (x[k] + x[k1]);
    const ey = APEX[1] - 0.5 * (y[k] + y[k1]);
    if (long || ex * ex + ey * ey > g2) {
      if (w + (n - k - 1) >= capacity) {
        loop.saturated = true;
        continue;
      }
      sx[w] = APEX[0];
      sy[w] = APEX[1];
      if (lab) sl[w] = APEX[2];
      w++;
      added++;
    }
  }
  if (!added) return 0;
  loop.x = sx;
  loop.y = sy;
  loop.sx = x;
  loop.sy = y;
  if (lab) {
    loop.s = sl;
    loop.ss = lab;
  }
  loop.n = w;
  return added;
}

// ---- presets for the integrator and material-loop figures ------------------------

// Broken/fixed pairs (AUTHORING.md: presets show the failure and the cure).
// Each preset names a flow (id + params), an integrator, a step Δt, a run
// length, a tracer particle and a material loop ({ cx, cy, r, n, capacity }
// for createMaterialLoop), plus refine (maxSeg for refineLoop after each
// step, or null). kind 'broken': the loop's area visibly drifts; 'fixed':
// it stays put (the tests run every preset and check which is which).
export const PARTICLE_PRESETS = {
  'euler-spiral': {
    name: 'Euler spirals out',
    description: 'Explicit Euler in solid-body rotation at ΩΔt = 0.2. Every step multiplies the radius by √(1 + (ΩΔt)²) ≈ 1.020 and the loop’s area by 1 + (ΩΔt)² = 1.04: after 100 steps the area has grown about 50-fold.',
    kind: 'broken',
    flow: 'rotation',
    flowParams: { Omega: 1 },
    method: 'euler',
    dt: 0.2,
    steps: 100,
    particle: [1, 0],
    loop: { cx: 0.6, cy: 0.2, r: 0.3, n: 64 },
    refine: null,
  },
  'rk4-orbit': {
    name: 'RK4 stays on the circle',
    description: 'Classical RK4, same flow and step. The radius shrinks by about (ΩΔt)⁶/144 ≈ 4×10⁻⁷ per step: after 100 steps the area is down by 0.009%, far below what the eye can see.',
    kind: 'fixed',
    flow: 'rotation',
    flowParams: { Omega: 1 },
    method: 'rk4',
    dt: 0.2,
    steps: 100,
    particle: [1, 0],
    loop: { cx: 0.6, cy: 0.2, r: 0.3, n: 64 },
    refine: null,
  },
  'implicit-midpoint-orbit': {
    name: 'Implicit midpoint keeps area exactly',
    description: 'Implicit midpoint, same flow and step: radius and area are kept to round-off, because the method is symplectic. Its error is all in the phase: each step turns by 2 arctan(ΩΔt/2) ≈ 0.1993 instead of 0.2.',
    kind: 'fixed',
    flow: 'rotation',
    flowParams: { Omega: 1 },
    method: 'implicit-midpoint',
    dt: 0.2,
    steps: 100,
    particle: [1, 0],
    loop: { cx: 0.6, cy: 0.2, r: 0.3, n: 64 },
    refine: null,
  },
  'implicit-midpoint-big-step': {
    name: 'Stable is not accurate',
    description: 'Implicit midpoint at ΩΔt = 2, where explicit Euler would multiply the area by 5 per step. The particle stays on its circle, but each step turns it by 2 arctan(1) = 90° instead of 115°: a square orbit.',
    kind: 'fixed',
    flow: 'rotation',
    flowParams: { Omega: 1 },
    method: 'implicit-midpoint',
    dt: 2,
    steps: 12,
    particle: [1, 0],
    loop: { cx: 0.6, cy: 0.2, r: 0.3, n: 64 },
    refine: null,
  },
  'euler-strain': {
    name: 'Euler shrinks loops in strain',
    description: 'Explicit Euler in stagnation-point flow (a = 1.5, Δt = 0.1). The area error has the sign of det ∇u = −a² < 0: each step multiplies the area by 1 − (aΔt)² = 0.9775, so the loop loses a fifth of its area in 10 steps.',
    kind: 'broken',
    flow: 'stagnation',
    flowParams: { a: 1.5 },
    method: 'euler',
    dt: 0.1,
    steps: 10,
    particle: [0.05, 1],
    loop: { cx: 0.1, cy: 0.1, r: 0.2, n: 64 },
    refine: null,
  },
  'rk4-strain': {
    name: 'RK4 in strain',
    description: 'Classical RK4 in the same strain: the area changes by a factor 1 + (aΔt)⁶/72 per step, about 2×10⁻⁷.',
    kind: 'fixed',
    flow: 'stagnation',
    flowParams: { a: 1.5 },
    method: 'rk4',
    dt: 0.1,
    steps: 10,
    particle: [0.05, 1],
    loop: { cx: 0.1, cy: 0.1, r: 0.2, n: 64 },
    refine: null,
  },
  'gyre-euler': {
    name: 'Euler in the double gyre',
    description: 'A dye blob in the double gyre for one forcing period (Δt = 0.05, 200 steps), refined to keep segments under 0.02. Explicit Euler changes the enclosed area by several per cent.',
    kind: 'broken',
    flow: 'double-gyre',
    flowParams: {},
    method: 'euler',
    dt: 0.05,
    steps: 200,
    particle: [0.5, 0.5],
    loop: { cx: 0.5, cy: 0.5, r: 0.2, n: 400, capacity: 5000 },
    refine: 0.02,
  },
  'gyre-rk4': {
    name: 'RK4 in the double gyre',
    description: 'The same blob with RK4: the filament stretches and folds, but the area it encloses stays within 10⁻⁴ of the start.',
    kind: 'fixed',
    flow: 'double-gyre',
    flowParams: {},
    method: 'rk4',
    dt: 0.05,
    steps: 200,
    particle: [0.5, 0.5],
    loop: { cx: 0.5, cy: 0.5, r: 0.2, n: 400, capacity: 5000 },
    refine: 0.02,
  },
};

for (const id of Object.keys(PARTICLE_PRESETS)) PARTICLE_PRESETS[id].id = id;

// ---- sampling onto grids (for heat maps and arrow plots) ---------------------------

// Cell-centred samples of fn(x, y, t) on an nx × ny grid over domain,
// indexed i + j * nx with j = 0 at the bottom. Returns out.
export function sampleScalarField(fn, nx, ny, domain, t = 0, out = new Float64Array(nx * ny)) {
  const dx = (domain.xmax - domain.xmin) / nx;
  const dy = (domain.ymax - domain.ymin) / ny;
  for (let j = 0; j < ny; j++) {
    const y = domain.ymin + (j + 0.5) * dy;
    for (let i = 0; i < nx; i++) out[i + j * nx] = fn(domain.xmin + (i + 0.5) * dx, y, t);
  }
  return out;
}

// Cell-centred velocity samples, same layout.
export function sampleVelocityField(flow, nx, ny, domain, t, outU, outV) {
  const dx = (domain.xmax - domain.xmin) / nx;
  const dy = (domain.ymax - domain.ymin) / ny;
  for (let j = 0; j < ny; j++) {
    const y = domain.ymin + (j + 0.5) * dy;
    for (let i = 0; i < nx; i++) {
      flow.velocity(domain.xmin + (i + 0.5) * dx, y, t, VEL);
      outU[i + j * nx] = VEL[0];
      outV[i + j * nx] = VEL[1];
    }
  }
}
