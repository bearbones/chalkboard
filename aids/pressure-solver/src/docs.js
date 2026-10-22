// Narration for each stage: what it does, why, and its pseudo-code. `line`
// picks the active pseudo-code line from the current span stack and op.

const sweepIs = (ctx, word) => ctx.sweep && ctx.sweep.label.startsWith(word);

export const DOCS = {
  interval: {
    title: 'One adaptive interval',
    text: 'The simulation advances in short intervals (at most 500 µs). Each interval runs one pressure transaction: heat is applied first, Newton solves for the pressure field that leaves every cell full after the step, and transport updates the conserved masses and enthalpy. If Newton fails or any cell would empty more than ⅛ of its volume, the interval is rejected and retried with half the time step.',
    code: ['H ← prepass(dt)            // heat, frozen from here on', 'p ← seed()', 'while max|R(p)| > 1e-9:  newton_step()', 'if outflow > 0.125 cell:  dt ← dt/2; retry', 'transport(); dt_next ← grow(dt)'],
    line: (c) => (c.op?.op === 'reject' ? 3 : c.op?.op === 'accept' ? 4 : c.byKind.newton ? 2 : c.byKind.seed ? 1 : 0),
  },
  prepass: {
    title: 'Prepass: heat sources and conduction',
    text: 'Heaters and conduction to held-temperature walls update each cell’s enthalpy H once before Newton begins. During the pressure solve H remains fixed, so pressure is the only unknown. Only cells adjacent to a held-temperature wall read a neighbour’s thermal state during this pass.',
    code: ['for each fluid cell i:', '  H[i] += heater[i]·dt + pulse[i]', '  for each held wall w next to i:', '    H[i] += G·dt·(T_w − T_i)'],
    line: (c) => (c.op?.reads?.length ? 3 : 1),
  },
  seed: {
    title: 'Seed: initial pressure guess',
    text: 'Newton converges rapidly from a nearby starting guess. After the first interval, the solver warm-starts from the last accepted pressure field. On a cold start without history, it evaluates three candidate guesses—ideal-gas EOS, uniform atmosphere, and hydrostatic column weight—and keeps the candidate with the smallest max|R|.',
    code: ['if warm start available:', '  p ← p_last_accepted', 'else for guess in [EOS, atmosphere, hydrostatic]:', '  evaluate R(guess)', '  keep the guess with the smallest max|R|'],
    line: (c) => (c.byKind.seed?.label?.includes('warm') ? 1 : c.candidate ? (c.op?.op === 'seed' ? 4 : 3) : 2),
  },
  source: {
    title: 'Source: local phase equilibrium',
    text: 'At its trial pressure, each cell solves for local thermal and phase equilibrium to determine its vapour mass, temperature, gas volume, and analytic compliance slope dO/dp. Because this calculation depends only on the cell’s own pressure and inventory, all cells can be evaluated in parallel. Higher pressure compresses the gas phase and raises the saturation temperature, suppressing vapour formation.',
    code: ['T(m_v) = (H − m_v·L₀) / C(m_v)', 'solve p_sat(T(m_v)) = p·x_vap(m_v)   // 80 bisection steps', 'V_gas = Σ m·R · T / p;   fill = m_liq/ρ + V_gas', 'dO/dp = d(fill)/dp                   // analytic compliance'],
    line: () => 1,
  },
  faces: {
    title: 'Face kicks: momentum coupling',
    text: 'Each open face receives a backward-Euler velocity update driven by the pressure difference across it and divided by the mean inertia of the two adjacent cells. Because gas is roughly 800× lighter than liquid water, a gas–gas face accelerates about 800× more strongly than a liquid–liquid face under the same pressure gradient.',
    code: ['c = dt · 2 / (m_a + m_b)', 'u_right += −c·(p_b − p_a)', 'v_down  += dt·g − c·(p_b − p_a)', 'top     += dt·g − (2·dt/m)·(p − p_atm)'],
    line: (c) => (c.op?.face?.dir === 'x' ? 1 : c.op?.face?.dir === 'top' ? 3 : 2),
  },
  residual: {
    title: 'Residual: cell volume balance',
    text: 'Each cell sums its liquid and gas occupancy and subtracts the net volume flowing out through its faces over dt. A residual of R = 0 means the contents will fill the cell after transport; R > 0 indicates overfill (requiring higher pressure) and R < 0 indicates underfill (requiring lower pressure). Newton terminates when max|R| ≤ 1e-9 cell volumes.',
    code: ['div = u_right − u_left + v_down − v_up', 'R   = fill − 1 − dt·div', 'max|R| ≤ 1e-9  →  converged'],
    line: () => 1,
  },
  jacobian: {
    title: 'Jacobian: 5-point stencil assembly',
    text: 'Row i of J records how cell i’s residual changes with each of the five stencil pressures. The face fluxes contribute a mass-weighted Laplacian (negative on the diagonal, positive off-diagonal). The phase equilibrium adds the compliance slope dO/dp to the diagonal, which is zero in subcooled liquid, −V_gas/p in non-condensing gas, and large and negative in boiling cells where a small pressure rise condenses vapour.',
    code: ['for each fluid cell i:', '  J[i][i] = dO/dp            // analytic compliance (probe at birth)', '  for each open face (i, j):', '    J[i][i] −= dt·c_ij;   J[i][j] = +dt·c_ij', 'solid cell:  J[i][i] = −1   // unused coordinate'],
    line: () => 3,
  },
  linear: {
    title: 'Linear solve: inexact Newton step',
    text: 'Newton solves the linearised system J·δ = −R for the pressure correction δ. Because J changes on the next nonlinear iteration, the linear solve stops once the true linear residual drops to 1% of the right-hand side (forcing parameter η = 0.01).',
    code: ['b = −R   (rows already within ½·tol are zeroed)', 'prepare preconditioner (multigrid hierarchy or MIC(0))', 'solve J·δ = b  until ‖b − J·δ‖∞ ≤ 0.01·‖b‖∞'],
    line: (c) => (c.hierarchy ? 1 : 2),
  },
  hierarchy: {
    title: 'Multigrid hierarchy',
    text: 'Cells are grouped into 2×2 aggregates to form a coarse operator A_c = Rᵀ·A·P by summing the fine rows within each block. Repeating this coarsening on a 16×16 grid produces five levels: 16×16, 8×8, 4×4, 2×2, and 1×1.',
    code: ['A₀ = J', 'repeat:  A_{l+1} = Rᵀ · A_l · P    // P: constant on each 2×2 block', 'until A is 1×1', 'check: diagonals < 0, off-diagonals ≥ 0'],
    line: () => 1,
  },
  mic_factor: {
    title: 'MIC(0) incomplete Cholesky factorisation',
    text: 'Builds the Modified Incomplete Cholesky preconditioner with the 0.97 diagonal modification across the grid. Because each cell depends on the already-factored neighbour behind it in the row and the neighbour above it, the factorisation sweeps diagonally as a wavefront. Building both left→right and right→left factors and averaging their solves keeps the preconditioner reflection-symmetric.',
    code: ['for direction in [left→right, right→left]:', '  for each cell i in sweep order:', '    pivot = −J_ii − Σ (a² + 0.97·a·a_perp)·pre_j²', '    if pivot < 0.25·(−J_ii):  pivot = −J_ii', '    pre[i] = 1 / √pivot'],
    line: (c) => (c.op?.op === 'mic-factor' ? 4 : 1),
  },
  mic_sweep: {
    title: 'MIC(0) triangular substitution sweeps',
    text: 'Applies the incomplete Cholesky preconditioner z = M⁻¹r by running forward substitution (reading behind and above) and backward substitution (reading ahead and below) in both horizontal mirror orders, then averaging the two results so the step has no left–right bias.',
    code: ['for direction in [left→right, right→left]:', '  forward sweep:   y_i = (r_i + a_prev·pre_prev·y_prev + a_up·pre_up·y_up)·pre_i', '  backward sweep:  z_i = (y_i + a_next·pre_i·z_next + a_down·pre_i·z_down)·pre_i', 'z = ½(z_L→R + z_R→L)'],
    line: (c) => (c.op?.op === 'pc-fwd' ? 1 : c.op?.op === 'pc-bwd' ? 2 : 3),
  },
  bicgstab: {
    title: 'BiCGStab, preconditioned by a V-cycle',
    text: 'A single V-cycle struggles with error modes that straddle solid obstacles or sharp density jumps across 2×2 block boundaries. BiCGStab uses the V-cycle as a right preconditioner inside a Krylov subspace search, eliminating those remaining modes in a handful of iterations.',
    code: ['β = (ρ/ρ₀)(α/ω);   p = r + β(p − ω·v)', 'p̂ = Vcycle(p);   v = J·p̂', 'α = ρ/(r̂·v);   s = r − α·v', 'ŝ = Vcycle(s);   t = J·ŝ;   ω = (t·s)/(t·t)', 'δ += α·p̂ + ω·ŝ', 'check  ‖b − J·δ‖∞ ≤ η·‖b‖∞    // the true residual'],
    line: (c) => {
      const l = c.vcycle?.label || c.sweep?.label || c.op?.label || '';
      if (l.startsWith('p̂') || l === 'v = A·p̂') return 1;
      if (l.startsWith('ŝ') || l === 't = A·ŝ') return 3;
      if (l.startsWith('s =')) return 2;
      if (l.startsWith('δ')) return 4;
      if (l.startsWith('True') || c.op?.op === 'check') return 5;
      return 0;
    },
  },
  micpcg: {
    title: 'Conjugate Gradient with mirrored MIC(0)',
    text: 'Because the face conductances are symmetric and the diagonal is negative, −J is symmetric positive-definite. Preconditioned Conjugate Gradient uses the averaged left→right and right→left MIC(0) triangular solves as its preconditioner and updates δ along A-conjugate search directions.',
    code: ['z = M⁻¹r                     // mirrored MIC(0) forward/back sweeps', 'β = (r·z)/ρ_prev;   d = z + β·d', 'q = (−J)·d;         α = (r·z)/(d·q)', 'δ += α·d', 'r = b − J·δ;        check ‖r‖∞ ≤ η·‖b‖∞'],
    line: (c) => {
      const l = c.vcycle?.label || c.sweep?.label || c.op?.label || '';
      if (c.vcycle) return 0;
      if (l.startsWith('d =')) return 1;
      if (l.startsWith('q =')) return 2;
      if (l.startsWith('δ +=')) return 3;
      return 4;
    },
  },
  vcycle_only: {
    title: 'V-cycles alone',
    text: 'Repeats the aggregation V-cycle as a stationary iteration, δ += Vcycle(b − J·δ). Smooth bulk errors decay rapidly, whereas modes that do not align with the 2×2 aggregates around obstacles and interfaces converge more slowly than under BiCGStab.',
    code: ['r = b − J·δ', 'z = Vcycle(r)', 'δ += z', 'check  ‖b − J·δ‖∞ ≤ η·‖b‖∞'],
    line: (c) => (c.vcycle ? 1 : c.op?.op === 'vector' ? 2 : 3),
  },
  jacobi_only: {
    title: 'Weighted Jacobi alone',
    text: 'Applies only the fine-grid weighted Jacobi smoother at every step. Because each sweep propagates information by a single cell, crossing a 16-cell domain with an 800:1 liquid-to-gas mobility ratio requires hundreds of sweeps.',
    code: ['for each cell (old buffer → new buffer):', '  δ_new[i] = δ[i] + ⅔·(b[i] − (J·δ)[i]) / J[i][i]', 'swap buffers;   check ‖b − J·δ‖∞'],
    line: (c) => (c.op?.op === 'check' ? 2 : 1),
  },
  level: {
    title: 'V-cycle level',
    text: 'Applies two weighted-Jacobi pre-smoothing sweeps, restricts the residual to the coarser 2×2 block grid where long-wavelength errors become oscillatory, prolongs the coarse correction back, and applies two post-smoothing sweeps. Because weighted Jacobi reads from the old buffer and writes to a separate buffer, cell updates within a sweep are independent.',
    code: ['z = 0', '2×  z += ⅔·(rhs − A·z)/diag        // pre-smooth', 'r = rhs − A·z', 'rhs_coarse[B] = Σ r over block B   // restrict', 'z_coarse = Vcycle(level + 1)', 'z += z_coarse[block of i]           // prolong', '2×  z += ⅔·(rhs − A·z)/diag        // post-smooth', '(1×1 level:  z = rhs / diag)'],
    line: (c) => {
      if (c.op?.op === 'coarse-solve') return 7;
      if (sweepIs(c, 'Pre')) return 1;
      if (sweepIs(c, 'Residual')) return 2;
      if (sweepIs(c, 'Restrict')) return 3;
      if (sweepIs(c, 'Prolong')) return 5;
      if (sweepIs(c, 'Post')) return 6;
      return 0;
    },
  },
  linesearch: {
    title: 'Backtracking line search',
    text: 'A full Newton step (α = 1) can overshoot where the phase-equilibrium volume curve bends sharply near boiling onset or low gas pressure. The solver tests α = 1, ½, ¼, … with a full residual evaluation at each step until the 2-norm ‖R(p + α·δ)‖₂ decreases while keeping every cell above the 611 Pa triple-point pressure floor.',
    code: ['α = 1', 'p_try = p + α·δ', 'evaluate R(p_try)              // source, faces, residual', 'if ‖R(p_try)‖₂ < ‖R(p)‖₂:  accept', 'else  α ← α/2;  try again'],
    line: (c) => (c.op?.op === 'merit' ? (c.op.accept ? 3 : 4) : c.op?.op === 'floor' ? 4 : c.pass ? 2 : 1),
  },
  transport: {
    title: 'Transport: donor-cell advection',
    text: 'Once the pressure field is accepted, each open face transfers volume flux dt·u from the upwind donor cell, carrying matching fractions of liquid water, vapour, air, and enthalpy. Because the converged residual already accounted for −dt·div, every cell ends the interval at unit occupancy.',
    code: ['for each open face with flux F = dt·u:', '  donor d = upwind cell', '  move F / fill[d] of d’s water, vapour, air and heat'],
    line: () => 2,
  },
};

// Pick the doc for the innermost span that has one.
export function docFor(ctx, method) {
  const order = [
    ['pass', (s) => s.pass],
    ['level', () => 'level'],
    ['vcycle', () => (method === 'micpcg' ? 'mic_sweep' : null)],
    ['hierarchy', () => (method === 'micpcg' ? 'mic_factor' : 'hierarchy')],
    ['krylov', () => (method === 'jacobi' ? 'jacobi_only' : method === 'vcycle' ? 'vcycle_only' : method === 'micpcg' ? 'micpcg' : 'bicgstab')],
    ['stage', (s) => s.stage],
    ['seed', () => 'seed'],
    ['interval', () => 'interval'],
  ];
  // The seed and the line search evaluate the residual inside a candidate: the
  // pass doc shows while a pass runs, the candidate's own doc between passes.
  for (const [kind, key] of order) {
    const span = ctx.byKind[kind];
    if (!span) continue;
    const d = DOCS[key(span)];
    if (d) return d;
  }
  return DOCS.interval;
}
