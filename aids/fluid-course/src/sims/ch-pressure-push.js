// Chapter 10 (pressure) kernel: the "push the water" scene.
//
//   addBlob(g, u, v, x0, y0, dx, dy, R)
//       adds a Gaussian blob of velocity (dx, dy)·exp(−r²/R²) centred at
//       (x0, y0) (box units) to the MAC face arrays u, v of grid g. Faces
//       further than 3R away are left alone. No wrapping (use it away from
//       periodic seams or on a walled box).
//   movingShare(g, u, v, frac = 0.01)
//       share of the fluid cells whose centre speed (face averages) exceeds
//       frac × the largest centre speed: how much of the box "moves".
//
// The figure pressure-push paints u* with addBlob and projects it with
// projection.js project(); tests/fluid-course/ch-pressure.test.js checks the
// numbers the chapter quotes (share moving, energy kept).

export function addBlob(g, u, v, x0, y0, dx, dy, R) {
  const { nx, ny, h } = g;
  const su = nx + 1;
  const r2 = R * R;
  const i0 = Math.max(0, Math.floor((x0 - 3 * R) / h));
  const i1 = Math.min(nx, Math.ceil((x0 + 3 * R) / h));
  const j0 = Math.max(0, Math.floor((y0 - 3 * R) / h));
  const j1 = Math.min(ny, Math.ceil((y0 + 3 * R) / h));
  if (dx) {
    for (let j = j0; j < Math.min(ny, j1 + 1); j++) {
      const y = (j + 0.5) * h;
      for (let i = i0; i <= i1; i++) {
        const x = i * h;
        u[i + j * su] += dx * Math.exp(-((x - x0) ** 2 + (y - y0) ** 2) / r2);
      }
    }
  }
  if (dy) {
    for (let j = j0; j <= j1; j++) {
      const y = j * h;
      for (let i = i0; i < Math.min(nx, i1 + 1); i++) {
        const x = (i + 0.5) * h;
        v[i + j * nx] += dy * Math.exp(-((x - x0) ** 2 + (y - y0) ** 2) / r2);
      }
    }
  }
}

export function movingShare(g, u, v, frac = 0.01) {
  const { nx, ny, solid } = g;
  const su = nx + 1;
  let peak = 0;
  for (let pass = 0; pass < 2; pass++) {
    let k = 0;
    let n = 0;
    const lim2 = (frac * peak) ** 2;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const c = i + j * nx;
        if (solid && solid[c]) continue;
        const a = 0.5 * (u[i + j * su] + u[i + 1 + j * su]);
        const b = 0.5 * (v[c] + v[c + nx]);
        const s2 = a * a + b * b;
        if (pass === 0) {
          if (s2 > peak * peak) peak = Math.sqrt(s2);
        } else {
          n++;
          if (s2 > lim2) k++;
        }
      }
    }
    if (pass === 1) return n ? k / n : 0;
  }
  return 0;
}
