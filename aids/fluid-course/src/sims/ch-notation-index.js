// Index-notation expander for chapter 4 ("How the equations got their shape").
// Pure functions, no DOM. classify() sorts the indices of a product of factors
// into free and summed (dummy) ones; expand() writes out every sum that the
// summation convention hides, as TeX for the kit's math subset, and returns
// the term structure so tests can check signs and counts.
//
// Conventions
//   - A term is a list of factors: ['u', i] velocity component u_i, ['d', i]
//     the partial derivative ∂_i = ∂/∂x_i acting on the next non-derivative
//     factor, ['p'] pressure, ['sigma', i, j] stress σ_ij, ['delta', i, j] the
//     Kronecker delta, ['eps', i, j, k] the permutation symbol ε_ijk.
//   - Summation convention (Einstein 1916, §5): an index that occurs twice in
//     the term is summed over 1..d; an index that occurs once is free, and the
//     expression stands for one equation per value of it. An index that occurs
//     three or more times is an error: the convention does not cover it.
//   - spec.plane: the expression needs three index values even in a plane
//     flow (ε_ijk). With d = 2 the free index takes only the value 3 (the
//     out-of-plane component) and the summed indices run over 1, 2.
//   - Index values print as 1, 2, 3 (mode 'num') or as x, y, z with the
//     velocity components u, v, w (mode 'xyz'). Free-index values are wrapped
//     in \class{t1}{…} and summed-index values in \class{t2}{…}, so a figure
//     can colour them; 'hl' marks an index used too often.

export const EXPRESSIONS = {
  conv: {
    id: 'conv',
    name: 'convective acceleration',
    text: 'u_j ∂_j u_i: convective acceleration',
    factors: [['u', 'j'], ['d', 'j'], ['u', 'i']],
  },
  grad: {
    id: 'grad',
    name: 'pressure gradient',
    text: '∂_i p: pressure gradient (no sum)',
    factors: [['d', 'i'], ['p']],
  },
  div: {
    id: 'div',
    name: 'divergence',
    text: '∂_i u_i: divergence (one equation)',
    factors: [['d', 'i'], ['u', 'i']],
  },
  stress: {
    id: 'stress',
    name: 'divergence of stress',
    text: '∂_j σ_ij: force from stress',
    factors: [['d', 'j'], ['sigma', 'i', 'j']],
  },
  lap: {
    id: 'lap',
    name: 'viscous term',
    text: '∂_j ∂_j u_i: viscous (Laplacian) term',
    factors: [['d', 'j'], ['d', 'j'], ['u', 'i']],
  },
  delta: {
    id: 'delta',
    name: 'Kronecker delta',
    text: 'δ_ij u_j: Kronecker delta',
    factors: [['delta', 'i', 'j'], ['u', 'j']],
  },
  curl: {
    id: 'curl',
    name: 'vorticity',
    text: 'ε_ijk ∂_j u_k: vorticity ω_i',
    factors: [['eps', 'i', 'j', 'k'], ['d', 'j'], ['u', 'k']],
    plane: true,
  },
  bad: {
    id: 'bad',
    name: 'ill-formed term',
    text: 'u_i ∂_i u_i: ill-formed',
    factors: [['u', 'i'], ['d', 'i'], ['u', 'i']],
  },
};

const COORD = 'xyz';
const COMP = 'uvw';

// Free and summed indices of a term, in alphabetical order.
export function classify(factors) {
  const counts = {};
  for (const f of factors) for (let k = 1; k < f.length; k++) counts[f[k]] = (counts[f[k]] || 0) + 1;
  const names = Object.keys(counts).sort();
  const free = names.filter((n) => counts[n] === 1);
  const dummy = names.filter((n) => counts[n] === 2);
  const over = names.find((n) => counts[n] > 2);
  const error = over ? { index: over, count: counts[over] } : null;
  return { counts, free, dummy, error };
}

// Sign of the permutation (a, b, c) of (1, 2, 3); 0 if two values repeat.
export function levi(a, b, c) {
  return ((a - b) * (b - c) * (c - a)) / 2 || 0; // || 0 turns −0 into 0
}

// The values each index runs over.
export function ranges(spec, d) {
  const { free, dummy } = classify(spec.factors);
  const all = Array.from({ length: d }, (_, k) => k + 1);
  const r = {};
  for (const n of free) r[n] = spec.plane && d === 2 ? [3] : all;
  for (const n of dummy) r[n] = all;
  return r;
}

// Every assignment of values to the named indices (last index varies fastest).
function assignments(names, r) {
  let out = [{}];
  for (const n of names) {
    const next = [];
    for (const a of out) for (const v of r[n]) next.push({ ...a, [n]: v });
    out = next;
  }
  return out;
}

function roleClass(role) {
  return role === 'free' ? 't1' : role === 'dummy' ? 't2' : 'hl';
}

// TeX for one product of factors. vals maps index → value (or is null for the
// compact form, which prints the index letters). keep: print ε and δ as
// symbols (true) or leave them out because the caller applied their value.
function termTex(factors, vals, roles, mode, keep) {
  const xyz = mode === 'xyz';
  const label = (n) => {
    const cls = roleClass(roles[n]);
    if (!vals) return `\\class{${cls}}{${n}}`;
    const v = vals[n];
    return `\\class{${cls}}{${xyz ? COORD[v - 1] : v}}`;
  };
  const operand = (f) => {
    if (f[0] === 'p') return 'p';
    if (f[0] === 'u') {
      if (vals && xyz) return `\\class{${roleClass(roles[f[1]])}}{${COMP[vals[f[1]] - 1]}}`;
      return `u_{${label(f[1])}}`;
    }
    if (f[0] === 'sigma') return `\\sigma_{${label(f[1])}${label(f[2])}}`;
    if (f[0] === 'delta') return `\\delta_{${label(f[1])}${label(f[2])}}`;
    if (f[0] === 'eps') return `\\varepsilon_{${label(f[1])}${label(f[2])}${label(f[3])}}`;
    throw new Error(`notation index: unknown factor ${f[0]}`);
  };
  const parts = [];
  let ds = [];
  for (const f of factors) {
    if (f[0] === 'd') {
      ds.push(f[1]);
      continue;
    }
    if (!keep && vals && (f[0] === 'eps' || f[0] === 'delta')) continue;
    const op = operand(f);
    if (!ds.length) {
      parts.push(op);
      continue;
    }
    if (vals && xyz) {
      // Leibniz form: ∂ⁿ op / ∂x ∂y …, repeated coordinates collected as powers.
      const groups = [];
      for (const n of ds) {
        const last = groups[groups.length - 1];
        if (last && last.v === vals[n] && last.n === n) last.p++;
        else groups.push({ n, v: vals[n], p: 1 });
      }
      const num = ds.length > 1 ? `\\partial^{${ds.length}} ${op}` : `\\partial ${op}`;
      const den = groups.map((g) => `\\partial ${label(g.n)}${g.p > 1 ? `^{${g.p}}` : ''}`).join('\\,');
      parts.push(`\\frac{${num}}{${den}}`);
    } else {
      parts.push(ds.map((n) => `\\partial_{${label(n)}}`).join('') + ' ' + op);
    }
    ds = [];
  }
  if (ds.length) throw new Error('notation index: a derivative needs something to act on');
  return parts.join('\\,');
}

// The factor's numeric value for ε and δ (1 for everything else).
function coefficient(factors, vals) {
  let c = 1;
  for (const f of factors) {
    if (f[0] === 'eps') c *= levi(vals[f[1]], vals[f[2]], vals[f[3]]);
    else if (f[0] === 'delta') c *= vals[f[1]] === vals[f[2]] ? 1 : 0;
  }
  return c;
}

const hasSymbols = (factors) => factors.some((f) => f[0] === 'eps' || f[0] === 'delta');

// The compact form, with free indices in t1 and summed indices in t2.
export function compactTex(spec) {
  const { free, dummy, error } = classify(spec.factors);
  const roles = {};
  for (const n of free) roles[n] = 'free';
  for (const n of dummy) roles[n] = 'dummy';
  if (error) roles[error.index] = 'bad';
  return termTex(spec.factors, null, roles, 'num', true);
}

// The same with the summation signs written in.
export function sigmaTex(spec, d) {
  const { dummy, error } = classify(spec.factors);
  if (error) return compactTex(spec);
  const top = d;
  const sums = dummy.map((n) => `\\sum_{\\class{t2}{${n}}=1}^{${top}}`).join('');
  return `${sums} ${compactTex(spec)}`;
}

// Write the expression out in d dimensions. Returns null rows and an error
// when an index is used more than twice.
export function expand(spec, d, { mode = 'num', zeros = false } = {}) {
  const c = classify(spec.factors);
  if (c.error) return { ...c, rows: [], termsPerRow: 0, nonzeroPerRow: 0, total: 0, nonzero: 0 };
  const roles = {};
  for (const n of c.free) roles[n] = 'free';
  for (const n of c.dummy) roles[n] = 'dummy';
  const r = ranges(spec, d);
  const symbols = hasSymbols(spec.factors);
  const rows = [];
  let total = 0,
    nonzero = 0;
  for (const fv of assignments(c.free, r)) {
    const terms = [];
    for (const dv of assignments(c.dummy, r)) {
      const vals = { ...fv, ...dv };
      const coef = coefficient(spec.factors, vals);
      terms.push({ vals, coef, raw: termTex(spec.factors, vals, roles, mode, true), tex: termTex(spec.factors, vals, roles, mode, false) });
    }
    const live = terms.filter((t) => t.coef !== 0);
    total += terms.length;
    nonzero += live.length;
    const rawTex = terms.map((t) => t.raw).join(' + ');
    let tex;
    if (!symbols) tex = rawTex;
    else if (!live.length) tex = '0';
    else
      tex = live
        .map((t, k) => {
          const body = t.tex || '1';
          if (t.coef < 0) return `${k ? ' - ' : '-'}${body}`;
          return `${k ? ' + ' : ''}${body}`;
        })
        .join('');
    const label = c.free.map((n) => `${n}=\\class{t1}{${mode === 'xyz' ? COORD[fv[n] - 1] : fv[n]}}`).join(',\\ ');
    rows.push({ vals: fv, label, terms, rawTex, tex: zeros || !symbols ? rawTex : tex, simplified: tex });
  }
  const termsPerRow = rows.length ? rows[0].terms.length : 0;
  const nonzeroPerRow = rows.length ? rows[0].terms.filter((t) => t.coef !== 0).length : 0;
  return { ...c, rows, termsPerRow, nonzeroPerRow, total, nonzero, symbols };
}
