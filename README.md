# chalkboard

Animated educational aids. Each aid runs the real algorithm, written as a
generator that yields a trace event for every read and write. So the animation
*is* the execution, and the tests drain the same code headlessly.

There are no dependencies and no build step: plain ES modules and a canvas.

```
npm run serve          # python3 -m http.server 8765
open http://localhost:8765/
npm test               # node --test
```

## Aids

### [The pressure solver, cell by cell](aids/pressure-solver/)

This aid steps through a nonlinear pressure solver on a 16×16 grid
of 1 mm cells. You can stop at an interval, a Newton step, a stage, a Krylov
iteration or line-search candidate, a V-cycle, a grid level, a sweep, or a
single cell. Cells are colour-coded:

- yellow: what the current step writes;
- blue, dashed: what it reads;
- a fading trail: recent writes, which shows the sweep order when it plays fast.

Panels show the pseudo-code with the active line highlighted, a cell inspector
with the 5-point Jacobian row drawn as a stencil, Newton and linear convergence
plots, and dt-halving retries.

The linear plot also runs all three linear methods headless on the *same*
Newton system. It draws them as ghost curves against work measured in fine-grid
passes.

Scenarios:

| Scenario | What it shows |
|---|---|
| Still water | Cold start. Three seed guesses are evaluated and the best one wins. |
| Sudden heating | A trapped air pocket gets +150 K. R jumps to +0.5 in the pocket. The first three attempts are rejected (a cell would lose 95% of its volume against the 0.125 CFL limit) until dt drops to 62.5 µs. A V-cycle alone stalls on the pocket mode; BiCGStab fixes it in about 5 iterations. |
| Sudden chill | Humid air under a cup with 290 K walls. Conduction in the prepass, condensation, and a negative residual. |
| Boiling pot | Water on a burner at 373.1 K. Vapour is born in gas-free cells, and the source slope dO/dp lights up the Jacobian diagonal. |

The solver lab can swap the linear solver (V-cycles alone, Jacobi alone), turn
off the line search, or turn off the warm start, so you can see what breaks.

#### What's in the code

| File | What it holds |
|---|---|
| `src/physics.js` | Units (mm, 1/60 s, mg, 3.6 Pa), IAPWS-IF97 saturation, `phaseSplit` (bisection on p_sat(T) = p·x_vap) |
| `src/solver.js` | `PressureSolver`: `evaluate` / `assemble` / `linearSolve` / `lineSearch` / `seed` / `transaction`, and `interval` (dt halving, CFL 0.125, growth ≤ 2×) |
| `src/linear.js` | `Stencil5` (up/left/centre/right/down), `aggregateOf`, `buildHierarchy`, `vcycle`, `bicgstab`, lab alternatives |
| `src/scenarios.js` | The four scenarios |
| `src/trace.js` | Span stack, stop granularity, work counting, ghost runs |
| `src/board.js`, `src/plots.js`, `src/docs.js`, `src/app.js` | Rendering, plots, narration, wiring |

#### Simplifications

The *structure* is a production solver's: a frozen-enthalpy prepass, a
local-equilibrium source, backward-Euler face kicks, a 5-point Jacobian (diag < 0, off-diag ≥ 0,
solids kept in the aggregates), right-preconditioned BiCGStab with a 2×2
aggregation V-cycle (weighted Jacobi ω = 2/3, 2 + 2 sweeps), forcing η = 0.01,
a merit-decrease line search with the p_sat(273.15 K) floor, and
warm/EOS/atmosphere/hydrostatic seeds.

It leaves out or changes:

- **Physics left out:** heat recovery, capillarity, viscosity (a uniform drag
  stands in for it), momentum advection, and fluid–fluid conduction.
  Conduction exists only to held walls.
- **Derivatives:** the source slope dO/dp is a one-sided finite difference.
  A production solver would use analytic slopes with a probe as fallback.
- **Line search:** one pass only. There is no bracket, derivative refinement,
  or damping escalation.
- **Linear solve:** there is no fallback solver (such as GMRES with ILU) and no
  dense path for tiny systems.
- **Inertia:** it is frozen at the start of the interval.
- **Temperature:** IAPWS-IF97 saturation is extended below the triple point
  and above 640 K, so that trial splits stay bracketed.

### [Fluids by the Numbers](aids/fluid-course/)

An interactive course on simulating fluids, in fifteen chapters and four parts.
It covers the physics and the people who worked it out, including how the
notation came to look the way it does. Most of all it covers every way the
arithmetic goes wrong and what practitioners do about it. Each figure runs a
real, tested numerical kernel, so you can break a scheme and then fix it:

- push a Courant number past 1;
- starve a pressure solve of iterations;
- take the relaxation time of a lattice Boltzmann run down to ½;
- switch off dealiasing.

| Part | Chapters |
|---|---|
| I · The physics, and how it was written down | What is a fluid? · Two ways of watching a flow · Conservation laws · How the equations got their shape · Reynolds and similarity |
| II · From equations to numbers | From calculus to arithmetic · Advection · Shocks · Diffusion and stiffness |
| III · Incompressible flow | The pressure puzzle · Solving for pressure · A fluid you can stir |
| IV · Other roads, and trust | Lattice Boltzmann and particles · Turbulence · Can you trust the numbers? |

Reference pages:

- **People:** a lifelines chart and a card for each person, with a "Myth check" where the usual story is wrong.
- **Milestones:** in computing flows, filed by the numerical difficulty each one exposed or tamed.
- **Symbols:** an atlas of the notation, showing how each symbol was first written.
- **Pathologies:** a rogues' gallery. For each failure it gives the symptom, the cause, how to diagnose it and what to do, with a live demo.
- **Glossary.**

The history was researched from public sources and then checked by an
independent pass. Each claim carries a confidence and its sources. Contested
attributions (who named the Reynolds number, what really sank Richardson's
1922 forecast, whether Gauss used Gauss–Seidel) are flagged rather than
smoothed over.

#### What's in the code

| Path | What it holds |
|---|---|
| `src/app.js`, `src/course.js` | Hash router (`#/chapter/section`), table of contents, home page; parts, chapter order and the cross-chapter glossary, pathology and widget indexes |
| `src/chapters/<id>.js` | One module per chapter: prose (HTML with `$…$` TeX), widgets, quizzes, glossary terms, pathology entries |
| `src/kit/` | TeX-subset → MathML converter, controls and animation loop, plots, field views, quizzes, colour tokens for canvas |
| `src/reference/` | People, milestones, symbols, pathologies and glossary pages; `*-data.js` are generated from the research files |
| `src/sims/` | The numerical kernels (below): pure ES modules, no DOM, tested under `node --test` |
| `dev/` | Kit sampler; `dev/?m=../src/chapters/<id>.js` previews one chapter; `import-research.mjs` regenerates the reference data |
| `AUTHORING.md` | The contract for chapters, widgets and kernels |

#### Numerical kernels

| File | What it holds |
|---|---|
| `flows.js` | Analytic 2-D flows (vortices, cylinder with circulation, Taylor–Green, double gyre…); particle integrators; path, stream and streak lines; material derivative; material-loop area |
| `molecules.js` | Poisson-gas density sampling, a soft-disk molecular dynamics box with coarse-graining, mean free path and Knudsen regimes |
| `similarity.js` | Dimension matrices and Buckingham Π groups in exact rational arithmetic; named dimensionless numbers; friction-factor and drag correlations (Colebrook as an iteration) |
| `verification.js` | Derivative error against h (with the complex step); cancellation, Kahan summation, Float32 drift; Richardson extrapolation and GCI; a manufactured-solution study with bug toggles |
| `advection.js` | Linear advection: upwind, FTCS, Lax–Friedrichs, Lax–Wendroff, Beam–Warming, leapfrog, Fromm, flux-limited schemes, WENO5; amplification factors, modified-equation coefficients, convergence studies |
| `burgers.js`, `euler1d.js`, `riemann.js` | Burgers and 1-D Euler finite volumes (Godunov, Rusanov, HLL, HLLC, Roe ± entropy fix, Lax–Wendroff, MUSCL-Hancock); the exact Euler Riemann solver as a generator |
| `diffusion.js`, `stiff.js` | Heat equation (FTCS, BTCS, Crank–Nicolson, θ, DuFort–Frankel); the Thomas algorithm as a generator; cell-Péclet boundary layers; stability functions, regions and stiff test problems |
| `grid2d.js`, `poisson.js`, `projection.js` | MAC and collocated grids; Jacobi, Gauss–Seidel, red–black, SOR, CG, PCG (Jacobi, IC(0), MIC(0)), multigrid; projection, Helmholtz–Hodge, the checkerboard |
| `stablefluids.js` | A stirrable Stable Fluids solver: semi-Lagrangian, BFECC and MacCormack advection; vorticity confinement; buoyancy; obstacles |
| `lbm.js` | D2Q9 lattice Boltzmann: BGK and TRT, bounce-back, inlets and outlets, Guo forcing; cylinder, cavity, Poiseuille, Taylor–Green and the vortex-street hero; a health check |
| `sph.js` | Weakly compressible SPH: cubic and Wendland kernels, cell-list neighbours, Tait EOS, artificial viscosity, wall particles, tensile-instability fixes |
| `fft.js`, `spectral.js`, `turbulence.js` | FFTs; spectral differentiation and pseudo-spectral Burgers with the 2/3 rule; 2-D turbulence; the Sabra shell model; Kolmogorov scales, DNS cost and Pope's model spectrum |
| `ch-<chapter>*.js` | Small kernels that belong to one chapter (lattice gases, Cholesky fill, a thread-count summation demo, benchmark checks…), each tested in `tests/fluid-course/ch-<chapter>.test.js` |

Each kernel's header cites the published scheme it implements. Each kernel's
test file measures the claims the chapters make: orders of accuracy, stability
thresholds, conservation, damping factors and exact solutions.

#### Simplifications

- **Dimensions:** everything is 1-D or 2-D. Three-dimensional effects
  (vortex stretching, the 3-D cascade) are described, and the shell model
  stands in for them.
- **Boundaries:** grids are uniform and Cartesian. Solid bodies are
  staircased masks, except in the potential-flow and Lagrangian
  demonstrations, which use analytic geometry.
- **Lattice Boltzmann and SPH:** both run weakly compressible at
  phone-friendly sizes (about 200×80 lattice nodes, about 1,500 particles;
  the stirrable Stable Fluids box runs at about 64×64).
  Their errors are part of the lesson, not hidden.
- **Turbulence models:** RANS and LES models are explained with model
  spectra and cost estimates, not run as solvers.

## Layout

```
index.html                     landing page
aids/<aid>/index.html          one self-contained aid per folder
aids/pressure-solver/src/      physics, solver, linear, trace, board, plots, docs, app
aids/fluid-course/             the fluids course (see its AUTHORING.md)
tests/                         node --test
tools/screenshot.mjs           headless Chromium screenshot after N stops
tools/check-course.mjs         load course pages headless: errors, overflow, slow frames, monkey test
tools/bundle.mjs               one-file build (CSS + modules inlined) → dist/
```

Screenshots need Playwright: `npm i -D playwright && npx playwright install
chromium`, or point `PLAYWRIGHT=/path/to/node_modules/playwright` at an
existing copy.
