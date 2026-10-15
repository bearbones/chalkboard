// Narration for each stage: what it does, why, and its pseudo-code. `line`
// picks the active pseudo-code line from the current span stack and op.

const sweepIs = (ctx, word) => ctx.sweep && ctx.sweep.label.startsWith(word);

export const DOCS = {
  interval: {
    title: 'One adaptive interval',
    text: 'The simulation advances in short intervals (at most 500 µs). Each interval runs one pressure transaction: heat goes in, Newton finds the pressure that keeps every cell exactly full, and only then does anything move. If Newton fails, or a cell would empty more than ⅛ of itself, the whole interval is thrown away and retried with half the time step.',
    code: ['H ← prepass(dt)            // heat, frozen from here on', 'p ← seed()', 'while max|R(p)| > 1e-9:  newton_step()', 'if outflow > 0.125 cell:  dt ← dt/2; retry', 'transport(); dt_next ← grow(dt)'],
    line: (c) => (c.op?.op === 'reject' ? 3 : c.op?.op === 'accept' ? 4 : c.byKind.newton ? 2 : c.byKind.seed ? 1 : 0),
  },
  prepass: {
    title: 'Prepass: heat in, then frozen',
    text: 'Heaters and conduction to held walls change each cell’s enthalpy H once, before Newton starts. During the solve H is a constant input, so the only thing Newton varies is pressure. A cell touching a cold wall reads that wall’s temperature here; nowhere else does a cell read a neighbour’s thermal state.',
    code: ['for each fluid cell i:', '  H[i] += heater[i]·dt + pulse[i]', '  for each held wall w next to i:', '    H[i] += G·dt·(T_w − T_i)'],
    line: (c) => (c.op?.reads?.length ? 3 : 1),
  },
  seed: {
    title: 'Seed: the first guess',
    text: 'Newton converges fast from a good guess and can wander from a bad one. Mid-simulation the best guess is the last accepted pressure (a warm start). With no history, the solver tries a few cold guesses, evaluates the full residual for each, and keeps the one with the smallest max|R|.',
    code: ['if warm start available:', '  p ← p_last_accepted', 'else for guess in [EOS, atmosphere, hydrostatic]:', '  evaluate R(guess)', '  keep the guess with the smallest max|R|'],
    line: (c) => (c.byKind.seed?.label?.includes('warm') ? 1 : c.candidate ? (c.op?.op === 'seed' ? 4 : 3) : 2),
  },
  source: {
    title: 'Source: each cell alone',
    text: 'At its own trial pressure, each cell finds the local phase equilibrium: how much of its water is vapour, and so its temperature and gas volume. Nothing here reads a neighbour, so every cell is independent (the GPU runs them all at once). Higher pressure compresses gas and raises the boiling point, so it suppresses vapour.',
    code: ['T(m_v) = (H − m_v·L₀) / C(m_v)', 'solve p_sat(T(m_v)) = p·x_vap(m_v)   // 80 bisection steps', 'V_gas = Σ m·R · T / p', 'fill  = m_liq/ρ + V_gas'],
    line: () => 1,
  },
  faces: {
    title: 'Face kicks: neighbours meet',
    text: 'Each open face gets one backward-Euler velocity update from the pressure difference across it, divided by the average inertia of its two cells. This is where neighbours couple. Gas is about 800× lighter than water, so a gas–gas face responds 800× more strongly to the same pressure difference.',
    code: ['c = dt · 2 / (m_a + m_b)', 'u_right += −c·(p_b − p_a)', 'v_down  += dt·g − c·(p_b − p_a)', 'top     += dt·g − (2·dt/m)·(p − p_atm)'],
    line: (c) => (c.op?.face?.dir === 'x' ? 1 : c.op?.face?.dir === 'top' ? 3 : 2),
  },
  residual: {
    title: 'Residual: is the cell exactly full?',
    text: 'Each cell adds its liquid and gas volume and subtracts what flows out through its four faces this interval. R = 0 means it will be exactly full after the move. R > 0 means overfull, so its pressure should rise; R < 0 means underfull. The unit is cell volumes, and Newton stops at 1e-9.',
    code: ['div = u_right − u_left + v_down − v_up', 'R   = fill − 1 − dt·div', 'max|R| ≤ 1e-9  →  converged'],
    line: () => 1,
  },
  jacobian: {
    title: 'Jacobian: how R reacts to p',
    text: 'Row i of J says how cell i’s residual moves when each of the five stencil pressures moves. The face part is a mass-weighted Laplacian: negative on the diagonal, positive off it. The source adds dO/dp on the diagonal: tiny for gas (−V/p), zero for subcooled liquid, and large where water is boiling, because a little more pressure stops a lot of vapour.',
    code: ['for each fluid cell i:', '  J[i][i] = dO/dp            // one-sided probe of the source', '  for each open face (i, j):', '    J[i][i] −= dt·c_ij;   J[i][j] = +dt·c_ij', 'solid cell:  J[i][i] = −1   // unused coordinate'],
    line: () => 3,
  },
  linear: {
    title: 'Linear solve: the Newton step',
    text: 'Newton linearises: find δ with J·δ = −R. It doesn’t need to be exact. The solver stops once the linear residual is 100× smaller than R (forcing η = 0.01), because Newton will re-linearise anyway.',
    code: ['b = −R   (rows already within ½·tol are zeroed)', 'build the multigrid hierarchy from J', 'solve J·δ = b  until ‖b − J·δ‖∞ ≤ 0.01·‖b‖∞'],
    line: (c) => (c.hierarchy ? 1 : 2),
  },
  hierarchy: {
    title: 'Multigrid hierarchy',
    text: 'Group cells into 2×2 blocks and build a coarse matrix that sees the blocks as single cells: A_c = Rᵀ·A·P, summing the fine rows. Repeat until one cell is left. On a 16×16 grid that is five levels: 16, 8, 4, 2, 1.',
    code: ['A₀ = J', 'repeat:  A_{l+1} = Rᵀ · A_l · P    // P: constant on each 2×2 block', 'until A is 1×1', 'check: diagonals < 0, off-diagonals ≥ 0'],
    line: () => 1,
  },
  bicgstab: {
    title: 'BiCGStab, preconditioned by a V-cycle',
    text: 'One V-cycle alone is a weak solver: some error shapes, like a trapped pocket next to a solid lid, can’t be represented by 2×2 blocks. BiCGStab uses the V-cycle as a preconditioner and builds the best combination of what it has seen so far, which removes those stubborn modes in a few iterations. Each iteration applies the V-cycle twice.',
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
  vcycle_only: {
    title: 'V-cycles alone',
    text: 'The solver lab’s comparison: repeat V-cycles as a stationary iteration, δ += Vcycle(b − J·δ). Smooth errors die fast, but modes the 2×2 blocks can’t represent barely move. Watch the plot stall where BiCGStab sails through.',
    code: ['r = b − J·δ', 'z = Vcycle(r)', 'δ += z', 'check  ‖b − J·δ‖∞ ≤ η·‖b‖∞'],
    line: (c) => (c.vcycle ? 1 : c.op?.op === 'vector' ? 2 : 3),
  },
  jacobi_only: {
    title: 'Weighted Jacobi alone',
    text: 'The solver lab’s comparison: just the smoother, over and over. Each sweep moves information one cell. Across a 16-cell domain with an 800:1 coefficient contrast it takes hundreds of sweeps, which is why multigrid exists.',
    code: ['for each cell (old buffer → new buffer):', '  δ_new[i] = δ[i] + ⅔·(b[i] − (J·δ)[i]) / J[i][i]', 'swap buffers;   check ‖b − J·δ‖∞'],
    line: (c) => (c.op?.op === 'check' ? 2 : 1),
  },
  level: {
    title: 'V-cycle level',
    text: 'Smooth, then hand the leftover to a coarser grid where smooth errors look jagged and are easy to kill, then bring the correction back and smooth again. Jacobi reads its four neighbours from the old buffer and writes a new one, so sweep order doesn’t matter. That’s why the GPU runs it as a buffer ping-pong.',
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
    title: 'Line search: don’t overshoot',
    text: 'The full Newton step can overshoot where the physics bends sharply, like vapour being born or a gas law at low pressure. So the step is tried at α = 1, then ½, ¼ and so on, each with a complete residual evaluation, until the residual’s 2-norm actually drops. A candidate that would push any cell below the pressure floor (611 Pa) is skipped.',
    code: ['α = 1', 'p_try = p + α·δ', 'evaluate R(p_try)              // source, faces, residual', 'if ‖R(p_try)‖₂ < ‖R(p)‖₂:  accept', 'else  α ← α/2;  try again'],
    line: (c) => (c.op?.op === 'merit' ? (c.op.accept ? 3 : 4) : c.op?.op === 'floor' ? 4 : c.pass ? 2 : 1),
  },
  transport: {
    title: 'Transport: now things move',
    text: 'Only after the pressure is accepted do mass and heat move. Each face carries its converged volume flux, taking the same fraction of every phase from the upwind cell. The residual’s −dt·div term was exactly this move, so every cell ends the interval full.',
    code: ['for each open face with flux F = dt·u:', '  donor d = upwind cell', '  move F / fill[d] of d’s water, vapour, air and heat'],
    line: () => 2,
  },
};

// Pick the doc for the innermost span that has one.
export function docFor(ctx, method) {
  const order = [
    ['pass', (s) => s.pass],
    ['level', () => 'level'],
    ['hierarchy', () => 'hierarchy'],
    ['krylov', () => (method === 'jacobi' ? 'jacobi_only' : method === 'vcycle' ? 'vcycle_only' : 'bicgstab')],
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
