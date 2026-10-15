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

## Layout

```
index.html                     landing page
aids/<aid>/index.html          one self-contained aid per folder
aids/pressure-solver/src/      physics, solver, linear, trace, board, plots, docs, app
tests/                         node --test
tools/screenshot.mjs           headless Chromium screenshot after N stops
tools/bundle.mjs               one-file build (CSS + modules inlined) → dist/
```

Screenshots need Playwright: `npm i -D playwright && npx playwright install
chromium`, or point `PLAYWRIGHT=/path/to/node_modules/playwright` at an
existing copy.
