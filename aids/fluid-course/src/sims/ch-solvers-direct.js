// Chapter 11 (solvers) kernel: what a direct solver does to the pressure
// matrix. Cholesky factorisation A = L Lᵀ of the 5-point matrix on a small
// n × n grid, with the unknowns numbered in one of two orders, counting the
// nonzeros of L (the "fill") and the arithmetic. Dense storage, so n ≤ 24 or
// so; the point is the growth with n, not speed.
//
//   ORDERS = { lex, nested }    'lex': row by row (cell i + j·n is unknown
//                               i + j·n), which makes A banded with half-
//                               bandwidth n, so L fills the whole band:
//                               about N·n nonzeros (N = n² unknowns).
//                               'nested': nested dissection (George 1973):
//                               split the grid by a line of cells (a
//                               separator), number the two halves first,
//                               recursively, and the separator last. In 2-D
//                               the fill is O(N log N) and the work O(N^{3/2}).
//   orderCells(n, order)        Int32Array perm: perm[k] = the cell numbered k.
//   poissonDense(n, order)      {A, N, perm}: the n × n Dirichlet 5-point
//                               matrix scaled by h² (4 on the diagonal, −1 for
//                               each neighbour), unknowns numbered by perm;
//                               dense row-major Float64Array(N·N).
//   cholesky(A, N)              in-place Cholesky of the lower triangle; the
//                               factor L is left in the lower triangle. Skips
//                               structural zeros. Returns {nnzA, nnzL, flops}:
//                               nonzeros of the lower triangle of A (counted
//                               before factorising) and of L, and the
//                               multiply–adds done.
//   fillStats(n, order)         poissonDense + cholesky: {N, nnzA, nnzL,
//                               flops, A, L}.
//
// Sources: A. George, "Nested dissection of a regular finite element mesh",
// SIAM J. Numer. Anal. 10(2), 345–363 (1973); Y. Saad, Iterative Methods for
// Sparse Linear Systems, 2nd ed., SIAM (2003), §3.3 (orderings) and §10.3;
// R. J. LeVeque, Finite Difference Methods for ODEs and PDEs, SIAM (2007),
// §3.7 (cost of direct methods for the 5-point Laplacian).

export const ORDERS = {
  lex: { id: 'lex', name: 'row by row' },
  nested: { id: 'nested', name: 'nested dissection' },
};

export function orderCells(n, order = 'lex') {
  const perm = new Int32Array(n * n);
  if (order === 'lex') {
    for (let c = 0; c < n * n; c++) perm[c] = c;
    return perm;
  }
  if (order !== 'nested') throw new Error(`orderCells: unknown order '${order}'`);
  let k = 0;
  // Number the cells of the box [i0, i1) × [j0, j1): halves first, separator last.
  const rec = (i0, i1, j0, j1) => {
    const w = i1 - i0;
    const hgt = j1 - j0;
    if (w <= 0 || hgt <= 0) return;
    if (w * hgt <= 4 || (w <= 2 && hgt <= 2)) {
      for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) perm[k++] = i + j * n;
      return;
    }
    if (w >= hgt) {
      const s = i0 + (w >> 1);
      rec(i0, s, j0, j1);
      rec(s + 1, i1, j0, j1);
      for (let j = j0; j < j1; j++) perm[k++] = s + j * n;
    } else {
      const s = j0 + (hgt >> 1);
      rec(i0, i1, j0, s);
      rec(i0, i1, s + 1, j1);
      for (let i = i0; i < i1; i++) perm[k++] = i + s * n;
    }
  };
  rec(0, n, 0, n);
  return perm;
}

export function poissonDense(n, order = 'lex') {
  const N = n * n;
  const perm = orderCells(n, order);
  const pos = new Int32Array(N);
  for (let k = 0; k < N; k++) pos[perm[k]] = k;
  const A = new Float64Array(N * N);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const r = pos[i + j * n];
      A[r * N + r] = 4;
      const nb = (ii, jj) => {
        if (ii < 0 || jj < 0 || ii >= n || jj >= n) return;
        A[r * N + pos[ii + jj * n]] = -1;
      };
      nb(i - 1, j);
      nb(i + 1, j);
      nb(i, j - 1);
      nb(i, j + 1);
    }
  }
  return { A, N, perm };
}

export function cholesky(A, N) {
  let nnzA = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j <= i; j++) if (A[i * N + j] !== 0) nnzA++;
  let flops = 0;
  // Column-oriented (left-looking would also do); rows of L stored in place.
  const nzRows = new Int32Array(N);
  for (let k = 0; k < N; k++) {
    const d = A[k * N + k];
    if (!(d > 0)) throw new Error('cholesky: matrix not positive definite');
    const lkk = Math.sqrt(d);
    A[k * N + k] = lkk;
    let m = 0;
    for (let i = k + 1; i < N; i++) {
      const v = A[i * N + k];
      if (v !== 0) {
        A[i * N + k] = v / lkk;
        nzRows[m++] = i;
      }
    }
    // Update the trailing lower triangle with the outer product of column k.
    for (let a = 0; a < m; a++) {
      const i = nzRows[a];
      const lik = A[i * N + k];
      for (let b = 0; b <= a; b++) {
        const j = nzRows[b];
        A[i * N + j] -= lik * A[j * N + k];
        flops++;
      }
    }
    for (let j = k + 1; j < N; j++) A[k * N + j] = 0;
  }
  let nnzL = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j <= i; j++) if (A[i * N + j] !== 0) nnzL++;
  return { nnzA, nnzL, flops };
}

export function fillStats(n, order = 'lex') {
  const { A, N, perm } = poissonDense(n, order);
  const A0 = Float64Array.from(A);
  const s = cholesky(A, N);
  return { N, perm, A: A0, L: A, ...s };
}
