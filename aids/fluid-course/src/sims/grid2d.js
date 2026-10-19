// 2-D grids for the pressure chapters: the staggered MAC grid and the
// collocated (cell-centred) grid whose central differences cause the
// checkerboard problem.
//
// MAC GRID (Harlow & Welch 1965; Bridson 2015 ch. 2)
//   nx × ny square cells of side h on [0, nx·h] × [0, ny·h]; origin at the
//   bottom-left corner, j = 0 is the bottom row.
//   p, cell types, divergence: cell centres ((i + ½)h, (j + ½)h), index i + j·nx.
//   u: vertical faces (i·h, (j + ½)h), (nx + 1) × ny values, index i + j·(nx + 1).
//   v: horizontal faces ((i + ½)h, j·h), nx × (ny + 1) values, index i + j·nx.
//   vorticity: cell corners (i·h, j·h), (nx + 1) × (ny + 1), index i + j·(nx + 1).
//   On a periodic axis the last face column (u at i = nx) or row (v at j = ny)
//   duplicates the first; enforceBoundary() keeps the copy in step.
//
// Units: lengths in units of the domain (h = 1/nx by default), velocities in
// length per unit time. Nothing here is dimensional; the stable-fluids kernel
// chooses its own scales. Pressure here is the projection potential
// φ = p·Δt/ρ unless the caller scales it (see projection.js).
//
// Boundaries (one type per side; periodic must pair left/right or bottom/top):
//   'wall'      normal velocity prescribed: g.wall[side] (0 unless you set it;
//               a non-zero value on 'left' is an inflow). Pressure: Neumann.
//   'open'      p = 0 just outside the face (outflow / far field). The normal
//               velocity there is free and the projection corrects it.
//               Pressure: Dirichlet, imposed at the boundary face by the ghost
//               value p_ghost = −p_inside.
//   'periodic'  wrap around.
//   Solid cells (g.solid[c] = SOLID) are not part of the flow. Every face that
//   touches a solid cell is FACE_FIXED with zero normal velocity (stationary
//   solids; moving solids would prescribe the solid's velocity instead).
//
// Face types (g.uType, g.vType): FACE_FREE (an unknown the projection corrects),
// FACE_FIXED (wall or solid face, never changed by the projection), FACE_OPEN
// (domain boundary face with p = 0 outside). Call updateMasks(g) after editing
// g.solid by hand; setSolid() does it for you. g.version counts mask edits so
// cached operators know when to rebuild.
//
// Discrete operators (all second order on smooth fields, exact on linear ones):
//   divergence   (D u)_c = (u_{i+1,j} − u_{i,j} + v_{i,j+1} − v_{i,j}) / h
//   gradient     (G p)_{i,j} on a u face = (p_{i,j} − p_{i−1,j}) / h (and v likewise)
//   vorticity    ω at corner (i, j) = (v_{i,j} − v_{i−1,j} − u_{i,j} + u_{i,j−1}) / h
//   D·G is exactly the 5-point Laplacian (poisson.js), and curl(G p) = 0 and
//   D(curl ψ) = 0 hold to round-off: the MAC grid's discrete identities.
//   At non-periodic domain edges, vorticity uses mirrored (free-slip) ghost
//   tangential velocities; this is for display only.
//   Inner product (faceDot): Σ w_f u₁u₂ h² with w_f = ½ on non-periodic
//   domain-boundary faces and 1 elsewhere (each face's staggered control
//   volume). In it G = −Dᵀ exactly, open sides included, so the projection
//   (projection.js) is an orthogonal projector.
//
// Bilinear sampling (sampleU, sampleV, sampleScalar, sampleVelocity) takes
// physical coordinates, clamps to the last sample on a non-periodic axis
// (constant extrapolation) and wraps on a periodic one.
//
// COLLOCATED GRID (Patankar 1980 ch. 6; Ferziger & Perić 2002 ch. 7)
//   u, v and p all at cell centres, index i + j·nx. centralGradient and
//   centralDivergence use the wide central difference (q_{i+1} − q_{i−1})/(2h).
//   Its blind spot is the lesson: the central gradient of the checkerboard
//   (−1)^{i+j}, and of the stripes (−1)^i and (−1)^j, is exactly zero, so
//   such a pressure exerts no force. checkerboardFraction measures the
//   (−1)^{i+j} share of a field; parityFractions measures all three.
//   Periodic by default (needs even nx, ny for the checkerboard to wrap);
//   non-periodic uses mirror ghosts for p and reflected (negated) normal
//   velocity for the divergence.
//
// Sources:
//   F. H. Harlow & J. E. Welch (1965), Phys. Fluids 8(12), 2182–2189 (MAC grid).
//   R. Bridson (2015), Fluid Simulation for Computer Graphics, 2nd ed., CRC
//     Press, ch. 2 (MAC grid, bilinear interpolation of staggered components)
//     and ch. 5 (solid boundaries in the projection).
//   S. V. Patankar (1980), Numerical Heat Transfer and Fluid Flow, Hemisphere,
//     ch. 6 (checkerboard pressure, staggered grid).
//   J. H. Ferziger & M. Perić (2002), Computational Methods for Fluid Dynamics,
//     3rd ed., Springer, ch. 7 (pressure–velocity coupling, colocated grids).

export const FLUID = 0;
export const SOLID = 1;

export const FACE_FREE = 0;
export const FACE_FIXED = 1;
export const FACE_OPEN = 2;

export const BOUNDARY_TYPES = {
  wall: {
    id: 'wall',
    name: 'Wall',
    description: 'Normal velocity prescribed (zero, or an inflow speed); pressure gets a zero-flux (Neumann) condition.',
    tex: '\\mathbf{u}\\cdot\\mathbf{n} = u_{\\mathrm{wall}}, \\quad \\frac{\\partial p}{\\partial n} = 0',
    pressure: 'neumann',
  },
  open: {
    id: 'open',
    name: 'Open',
    description: 'Pressure is zero just outside; the normal velocity is free, so fluid may leave or enter.',
    tex: 'p = 0, \\quad p_{\\mathrm{ghost}} = -p_{\\mathrm{inside}}',
    pressure: 'dirichlet',
  },
  periodic: {
    id: 'periodic',
    name: 'Periodic',
    description: 'What leaves one side enters the opposite side.',
    tex: 'p(0, y) = p(L_x, y), \\quad \\mathbf{u}(0, y) = \\mathbf{u}(L_x, y)',
    pressure: 'periodic',
  },
};

const SIDES = ['left', 'right', 'bottom', 'top'];

// Normalise a boundary spec: a string for all four sides, or an object with
// some of left/right/bottom/top (missing sides default to 'wall').
export function normaliseBoundary(bc = 'wall') {
  const out = {};
  for (const s of SIDES) {
    const t = typeof bc === 'string' ? bc : bc[s] ?? 'wall';
    if (!BOUNDARY_TYPES[t]) throw new Error(`grid2d: unknown boundary type '${t}' on ${s}`);
    out[s] = t;
  }
  if ((out.left === 'periodic') !== (out.right === 'periodic')) throw new Error('grid2d: periodic must be set on both left and right');
  if ((out.bottom === 'periodic') !== (out.top === 'periodic')) throw new Error('grid2d: periodic must be set on both bottom and top');
  return out;
}

// A MAC grid with zero velocity and pressure, all cells fluid.
//   opts.bc    boundary spec (see header), default 'wall' on every side
//   opts.wall  prescribed normal velocities on wall sides, e.g. { left: 1 }
export function macGrid(nx, ny, h = 1 / nx, opts = {}) {
  if (!(nx >= 2 && ny >= 2)) throw new Error('grid2d: need nx, ny >= 2');
  const bc = normaliseBoundary(opts.bc ?? 'wall');
  const g = {
    nx,
    ny,
    h,
    bc,
    periodicX: bc.left === 'periodic',
    periodicY: bc.bottom === 'periodic',
    wall: { left: 0, right: 0, bottom: 0, top: 0, ...(opts.wall || {}) },
    u: new Float64Array((nx + 1) * ny),
    v: new Float64Array(nx * (ny + 1)),
    p: new Float64Array(nx * ny),
    solid: new Uint8Array(nx * ny),
    uType: new Uint8Array((nx + 1) * ny),
    vType: new Uint8Array(nx * (ny + 1)),
    div: new Float64Array(nx * ny),
    version: 0,
  };
  updateMasks(g);
  return g;
}

// Recompute face types from the boundary spec and the solid mask.
export function updateMasks(g) {
  const { nx, ny, solid, bc, uType, vType } = g;
  const su = nx + 1;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i <= nx; i++) {
      let t;
      if (i === 0 || i === nx) {
        if (g.periodicX) {
          t = solid[nx - 1 + j * nx] || solid[j * nx] ? FACE_FIXED : FACE_FREE;
        } else {
          const c = i === 0 ? j * nx : nx - 1 + j * nx;
          const side = i === 0 ? bc.left : bc.right;
          t = side === 'open' && !solid[c] ? FACE_OPEN : FACE_FIXED;
        }
      } else {
        const c = i + j * nx;
        t = solid[c - 1] || solid[c] ? FACE_FIXED : FACE_FREE;
      }
      uType[i + j * su] = t;
    }
  }
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i < nx; i++) {
      let t;
      if (j === 0 || j === ny) {
        if (g.periodicY) {
          t = solid[i + (ny - 1) * nx] || solid[i] ? FACE_FIXED : FACE_FREE;
        } else {
          const c = j === 0 ? i : i + (ny - 1) * nx;
          const side = j === 0 ? bc.bottom : bc.top;
          t = side === 'open' && !solid[c] ? FACE_OPEN : FACE_FIXED;
        }
      } else {
        const c = i + j * nx;
        t = solid[c - nx] || solid[c] ? FACE_FIXED : FACE_FREE;
      }
      vType[i + j * nx] = t;
    }
  }
  g.version++;
  return g;
}

// Mark cells solid where fn(x, y, i, j) is truthy (x, y = cell centre), then
// refresh the face masks. Cells where fn is falsy become fluid.
export function setSolid(g, fn) {
  const { nx, ny, h, solid } = g;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) solid[i + j * nx] = fn((i + 0.5) * h, (j + 0.5) * h, i, j) ? SOLID : FLUID;
  }
  return updateMasks(g);
}

// Impose the boundary conditions on a face velocity field (default g.u, g.v):
// zero normal velocity on solid faces, the prescribed g.wall value on wall
// faces next to fluid, and the periodic copies in step. Open faces are left
// alone.
export function enforceBoundary(g, u = g.u, v = g.v) {
  const { nx, ny, uType, vType, solid } = g;
  const su = nx + 1;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const f = i + j * su;
      if (uType[f] !== FACE_FIXED) continue;
      if (!g.periodicX && (i === 0 || i === nx)) {
        const c = i === 0 ? j * nx : nx - 1 + j * nx;
        u[f] = solid[c] ? 0 : i === 0 ? g.wall.left : g.wall.right;
      } else u[f] = 0;
    }
    if (g.periodicX) u[nx + j * su] = u[j * su];
  }
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i < nx; i++) {
      const f = i + j * nx;
      if (vType[f] !== FACE_FIXED) continue;
      if (!g.periodicY && (j === 0 || j === ny)) {
        const c = j === 0 ? i : i + (ny - 1) * nx;
        v[f] = solid[c] ? 0 : j === 0 ? g.wall.bottom : g.wall.top;
      } else v[f] = 0;
    }
  }
  if (g.periodicY) for (let i = 0; i < nx; i++) v[i + ny * nx] = v[i];
  return g;
}

// Cell-centred divergence (D u)_c; zero in solid cells. Returns out.
export function divergence(g, out = g.div, u = g.u, v = g.v) {
  const { nx, ny, h, solid } = g;
  const su = nx + 1;
  const ih = 1 / h;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      if (solid[c]) {
        out[c] = 0;
        continue;
      }
      const f = i + j * su;
      out[c] = (u[f + 1] - u[f] + v[c + nx] - v[c]) * ih;
    }
  }
  return out;
}

// Pressure gradient on faces, matched to the pressure operator: zero on fixed
// faces, (p_c − p_{c−1})/h on free faces (wrapping on periodic axes), and the
// ghost p = −p_inside on open faces. Writes gu ((nx+1)·ny) and gv (nx·(ny+1)).
export function gradient(g, p, gu, gv) {
  const { nx, ny, h, uType, vType } = g;
  const su = nx + 1;
  const ih = 1 / h;
  for (let j = 0; j < ny; j++) {
    const row = j * nx;
    for (let i = 0; i <= nx; i++) {
      const f = i + j * su;
      const t = uType[f];
      if (t === FACE_FIXED) gu[f] = 0;
      else if (t === FACE_OPEN) gu[f] = i === 0 ? 2 * p[row] * ih : -2 * p[row + nx - 1] * ih;
      else {
        const cl = i === 0 || i === nx ? row + nx - 1 : row + i - 1;
        const cr = i === nx ? row : row + i;
        gu[f] = (p[cr] - p[cl]) * ih;
      }
    }
  }
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i < nx; i++) {
      const f = i + j * nx;
      const t = vType[f];
      if (t === FACE_FIXED) gv[f] = 0;
      else if (t === FACE_OPEN) gv[f] = j === 0 ? 2 * p[i] * ih : -2 * p[i + (ny - 1) * nx] * ih;
      else {
        const cb = j === 0 || j === ny ? i + (ny - 1) * nx : f - nx;
        const ct = j === ny ? i : f;
        gv[f] = (p[ct] - p[cb]) * ih;
      }
    }
  }
  return { gu, gv };
}

// u ← u − scale·G p on every face the projection may change (free and open
// faces); fixed faces are untouched. Same stencil as gradient(), no scratch.
export function subtractGradient(g, p, scale = 1, u = g.u, v = g.v) {
  const { nx, ny, h, uType, vType } = g;
  const su = nx + 1;
  const s = scale / h;
  for (let j = 0; j < ny; j++) {
    const row = j * nx;
    for (let i = 0; i <= nx; i++) {
      const f = i + j * su;
      const t = uType[f];
      if (t === FACE_FIXED) continue;
      if (t === FACE_OPEN) u[f] -= s * (i === 0 ? 2 * p[row] : -2 * p[row + nx - 1]);
      else {
        const cl = i === 0 || i === nx ? row + nx - 1 : row + i - 1;
        const cr = i === nx ? row : row + i;
        u[f] -= s * (p[cr] - p[cl]);
      }
    }
  }
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i < nx; i++) {
      const f = i + j * nx;
      const t = vType[f];
      if (t === FACE_FIXED) continue;
      if (t === FACE_OPEN) v[f] -= s * (j === 0 ? 2 * p[i] : -2 * p[i + (ny - 1) * nx]);
      else {
        const cb = j === 0 || j === ny ? i + (ny - 1) * nx : f - nx;
        const ct = j === ny ? i : f;
        v[f] -= s * (p[ct] - p[cb]);
      }
    }
  }
  return g;
}

// Vorticity ω = ∂v/∂x − ∂u/∂y at the (nx+1)·(ny+1) cell corners.
export function vorticityCorners(g, out, u = g.u, v = g.v) {
  const { nx, ny, h } = g;
  const su = nx + 1;
  const ih = 1 / h;
  for (let j = 0; j <= ny; j++) {
    // v row j exists for j = 0..ny; u rows j-1 and j (clamped or wrapped).
    let ja = j - 1;
    let jb = j;
    if (j === 0) ja = g.periodicY ? ny - 1 : 0;
    if (j === ny) jb = g.periodicY ? 0 : ny - 1;
    for (let i = 0; i <= nx; i++) {
      let ia = i - 1;
      let ib = i;
      if (i === 0) ia = g.periodicX ? nx - 1 : 0;
      if (i === nx) ib = g.periodicX ? 0 : nx - 1;
      const dvdx = v[ib + j * nx] - v[ia + j * nx];
      const dudy = u[i + jb * su] - u[i + ja * su];
      out[i + j * su] = (dvdx - dudy) * ih;
    }
  }
  return out;
}

// Vorticity averaged from the four corners to each cell centre. `corners` is
// optional scratch of size (nx+1)·(ny+1).
export function vorticityCentres(g, out, u = g.u, v = g.v, corners = null) {
  const { nx, ny } = g;
  const su = nx + 1;
  const w = corners || new Float64Array((nx + 1) * (ny + 1));
  vorticityCorners(g, w, u, v);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = i + j * su;
      out[i + j * nx] = 0.25 * (w[k] + w[k + 1] + w[k + su] + w[k + su + 1]);
    }
  }
  return out;
}

// Average face velocities to cell centres: uc = (u_{i} + u_{i+1})/2, vc likewise.
export function facesToCentres(g, uc, vc, u = g.u, v = g.v) {
  const { nx, ny } = g;
  const su = nx + 1;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      const f = i + j * su;
      uc[c] = 0.5 * (u[f] + u[f + 1]);
      vc[c] = 0.5 * (v[c] + v[c + nx]);
    }
  }
  return g;
}

// Average cell-centred velocities to faces. Interior faces take the mean of
// their two cells; periodic boundary faces wrap; other boundary faces copy the
// adjacent cell. Boundary conditions are NOT applied: call enforceBoundary.
export function centresToFaces(g, uc, vc, u = g.u, v = g.v) {
  const { nx, ny } = g;
  const su = nx + 1;
  for (let j = 0; j < ny; j++) {
    const row = j * nx;
    for (let i = 0; i <= nx; i++) {
      let val;
      if (i === 0 || i === nx) {
        val = g.periodicX ? 0.5 * (uc[row] + uc[row + nx - 1]) : uc[i === 0 ? row : row + nx - 1];
      } else val = 0.5 * (uc[row + i - 1] + uc[row + i]);
      u[i + j * su] = val;
    }
  }
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i < nx; i++) {
      let val;
      if (j === 0 || j === ny) {
        val = g.periodicY ? 0.5 * (vc[i] + vc[i + (ny - 1) * nx]) : vc[j === 0 ? i : i + (ny - 1) * nx];
      } else val = 0.5 * (vc[i + (j - 1) * nx] + vc[i + j * nx]);
      v[i + j * nx] = val;
    }
  }
  return g;
}

// Bilinear interpolation of samples f[a + b·stride], a < ni, b < nj, at
// fractional sample coordinates (fa, fb); clamp or wrap per axis.
function bilerp(f, stride, ni, nj, fa, fb, wrapA, wrapB) {
  let a0;
  let a1;
  let ta;
  if (wrapA) {
    fa -= Math.floor(fa / ni) * ni;
    // A point a hair below a sample (fa = −ε) wraps to ni − ε, which can round
    // to exactly ni: that is sample 0, not sample ni − 1.
    if (fa >= ni) fa = 0;
    a0 = Math.floor(fa);
    ta = fa - a0;
    a1 = a0 + 1 === ni ? 0 : a0 + 1;
  } else if (fa <= 0) {
    a0 = a1 = 0;
    ta = 0;
  } else if (fa >= ni - 1) {
    a0 = a1 = ni - 1;
    ta = 0;
  } else {
    a0 = Math.floor(fa);
    a1 = a0 + 1;
    ta = fa - a0;
  }
  let b0;
  let b1;
  let tb;
  if (wrapB) {
    fb -= Math.floor(fb / nj) * nj;
    if (fb >= nj) fb = 0;
    b0 = Math.floor(fb);
    tb = fb - b0;
    b1 = b0 + 1 === nj ? 0 : b0 + 1;
  } else if (fb <= 0) {
    b0 = b1 = 0;
    tb = 0;
  } else if (fb >= nj - 1) {
    b0 = b1 = nj - 1;
    tb = 0;
  } else {
    b0 = Math.floor(fb);
    b1 = b0 + 1;
    tb = fb - b0;
  }
  const r0 = b0 * stride;
  const r1 = b1 * stride;
  const lo = f[a0 + r0] + ta * (f[a1 + r0] - f[a0 + r0]);
  const hi = f[a0 + r1] + ta * (f[a1 + r1] - f[a0 + r1]);
  return lo + tb * (hi - lo);
}

// Bilinear sample of the u component at physical (x, y).
export function sampleU(g, x, y, u = g.u) {
  const { nx, ny, h } = g;
  return bilerp(u, nx + 1, g.periodicX ? nx : nx + 1, ny, x / h, y / h - 0.5, g.periodicX, g.periodicY);
}

// Bilinear sample of the v component at physical (x, y).
export function sampleV(g, x, y, v = g.v) {
  const { nx, ny, h } = g;
  return bilerp(v, nx, nx, g.periodicY ? ny : ny + 1, x / h - 0.5, y / h, g.periodicX, g.periodicY);
}

// Bilinear sample of a cell-centred field f (nx·ny) at physical (x, y).
export function sampleScalar(g, f, x, y) {
  const { nx, ny, h } = g;
  return bilerp(f, nx, nx, ny, x / h - 0.5, y / h - 0.5, g.periodicX, g.periodicY);
}

// Both components into out[0], out[1] (no allocation). Returns out.
export function sampleVelocity(g, x, y, out, u = g.u, v = g.v) {
  out[0] = sampleU(g, x, y, u);
  out[1] = sampleV(g, x, y, v);
  return out;
}

// Face velocities from a streamfunction ψ at the corners ((nx+1)·(ny+1),
// index i + j·(nx+1)): u = ∂ψ/∂y, v = −∂ψ/∂x by differences along each face.
// The result has D u = 0 to round-off in every cell, whatever ψ is. On a
// periodic axis the duplicate corner column/row must equal the first.
export function velocityFromStreamfunction(g, psi, u = g.u, v = g.v) {
  const { nx, ny, h } = g;
  const su = nx + 1;
  const ih = 1 / h;
  for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) u[i + j * su] = (psi[i + (j + 1) * su] - psi[i + j * su]) * ih;
  for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++) v[i + j * nx] = -(psi[i + 1 + j * su] - psi[i + j * su]) * ih;
  return g;
}

// Discrete inner product Σ w_f (u₁u₂ + v₁v₂)·h² over the distinct faces
// (periodic duplicates counted once). Each face sample stands for its
// staggered control volume: w_f = 1 inside the domain and ½ on a non-periodic
// domain boundary (wall or open side), the trapezoidal rule. With these
// weights the MAC gradient is exactly minus the adjoint of the divergence,
// G = −Dᵀ, on every boundary type: on an open face G uses the ghost value
// (2p/h across half a cell), which is what the ½ accounts for. So the
// projection is orthogonal and Hodge parts are orthogonal in this product.
// faceDot(g, u, v, u, v) is twice the kinetic energy per unit density.
export function faceDot(g, u1, v1, u2, v2) {
  const { nx, ny, h } = g;
  const su = nx + 1;
  let s = 0;
  for (let j = 0; j < ny; j++) {
    const row = j * su;
    for (let i = 1; i < nx; i++) s += u1[row + i] * u2[row + i];
    if (g.periodicX) s += u1[row] * u2[row];
    else s += 0.5 * (u1[row] * u2[row] + u1[row + nx] * u2[row + nx]);
  }
  for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) s += v1[i + j * nx] * v2[i + j * nx];
  for (let i = 0; i < nx; i++) {
    const t = ny * nx + i;
    if (g.periodicY) s += v1[i] * v2[i];
    else s += 0.5 * (v1[i] * v2[i] + v1[t] * v2[t]);
  }
  return s * h * h;
}

// ---------------------------------------------------------------------------
// Collocated grid: central differences for the checkerboard demonstration.

// (gx, gy)_c = ((p_{i+1} − p_{i−1}) / 2h, (p_{j+1} − p_{j−1}) / 2h).
export function centralGradient(p, nx, ny, h, gx, gy, periodic = true) {
  const s = 0.5 / h;
  for (let j = 0; j < ny; j++) {
    const jn = j < ny - 1 ? j + 1 : periodic ? 0 : j;
    const js = j > 0 ? j - 1 : periodic ? ny - 1 : j;
    for (let i = 0; i < nx; i++) {
      const ie = i < nx - 1 ? i + 1 : periodic ? 0 : i;
      const iw = i > 0 ? i - 1 : periodic ? nx - 1 : i;
      const c = i + j * nx;
      gx[c] = (p[ie + j * nx] - p[iw + j * nx]) * s;
      gy[c] = (p[i + jn * nx] - p[i + js * nx]) * s;
    }
  }
  return { gx, gy };
}

// (D_c u)_c = (u_{i+1} − u_{i−1}) / 2h + (v_{j+1} − v_{j−1}) / 2h.
export function centralDivergence(u, v, nx, ny, h, out, periodic = true) {
  const s = 0.5 / h;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      let ue;
      let uw;
      let vn;
      let vs;
      if (i < nx - 1) ue = u[c + 1];
      else ue = periodic ? u[j * nx] : -u[c];
      if (i > 0) uw = u[c - 1];
      else uw = periodic ? u[nx - 1 + j * nx] : -u[c];
      if (j < ny - 1) vn = v[c + nx];
      else vn = periodic ? v[i] : -v[c];
      if (j > 0) vs = v[c - nx];
      else vs = periodic ? v[i + (ny - 1) * nx] : -v[c];
      out[c] = (ue - uw + vn - vs) * s;
    }
  }
  return out;
}

// The wide Laplacian D_c·G_c (periodic): (q_{i+2} − 2q_i + q_{i−2})/(4h²) + same
// in y. Each of the four parity sub-grids is coupled only to itself, so its
// null space holds 1, (−1)^i, (−1)^j and (−1)^{i+j} (for even nx, ny).
export function wideLaplacian(q, nx, ny, h, out) {
  const s = 0.25 / (h * h);
  for (let j = 0; j < ny; j++) {
    const jn = (j + 2) % ny;
    const js = (j - 2 + ny) % ny;
    for (let i = 0; i < nx; i++) {
      const ie = (i + 2) % nx;
      const iw = (i - 2 + nx) % nx;
      const c = i + j * nx;
      out[c] = (q[ie + j * nx] + q[iw + j * nx] + q[i + jn * nx] + q[i + js * nx] - 4 * q[c]) * s;
    }
  }
  return out;
}

// Fraction of a cell-centred field's energy in the diagonal checkerboard
// (−1)^{i+j} only: on each 2×2 block, k = (q00 − q10 − q01 + q11)/4, and the
// result is 4·Σk² / Σq² (≈ 0 for smooth fields, 1 for a pure (−1)^{i+j},
// 1/4 for a field living on one parity sub-grid only). It does not see the
// stripe modes (−1)^i and (−1)^j: use parityFractions for all three. Needs
// even nx, ny (odd edges are ignored).
export function checkerboardFraction(q, nx, ny) {
  let num = 0;
  let den = 0;
  for (let j = 0; j + 1 < ny; j += 2) {
    for (let i = 0; i + 1 < nx; i += 2) {
      const c = i + j * nx;
      const a = q[c];
      const b = q[c + 1];
      const d = q[c + nx];
      const e = q[c + nx + 1];
      const k = 0.25 * (a - b - d + e);
      num += 4 * k * k;
      den += a * a + b * b + d * d + e * e;
    }
  }
  return den > 0 ? num / den : 0;
}

// Odd–even (parity) content of a cell-centred field: on each 2×2 block the
// local Hadamard components oddI = (q00 − q10 + q01 − q11)/4 (the (−1)^i
// stripes), oddJ = (q00 + q10 − q01 − q11)/4 (the (−1)^j stripes) and
// checker = (q00 − q10 − q01 + q11)/4, each returned as its share 4·Σc²/Σq²
// of the field's energy, plus total = their sum. All three are invisible to
// the central gradient. total is 1 for any pure parity mode, 3/4 for a field
// on one sub-grid only, and O(h²) for a smooth field (the stripe parts are
// O(h) per block, the checker part O(h²)). Writes into out (no allocation)
// and returns it. Needs even nx, ny (odd edges are ignored).
export function parityFractions(q, nx, ny, out = { checker: 0, oddI: 0, oddJ: 0, total: 0 }) {
  let si = 0;
  let sj = 0;
  let sk = 0;
  let den = 0;
  for (let j = 0; j + 1 < ny; j += 2) {
    for (let i = 0; i + 1 < nx; i += 2) {
      const c = i + j * nx;
      const a = q[c];
      const b = q[c + 1];
      const d = q[c + nx];
      const e = q[c + nx + 1];
      const ci = 0.25 * (a - b + d - e);
      const cj = 0.25 * (a + b - d - e);
      const ck = 0.25 * (a - b - d + e);
      si += ci * ci;
      sj += cj * cj;
      sk += ck * ck;
      den += a * a + b * b + d * d + e * e;
    }
  }
  const s = den > 0 ? 4 / den : 0;
  out.oddI = si * s;
  out.oddJ = sj * s;
  out.checker = sk * s;
  out.total = out.oddI + out.oddJ + out.checker;
  return out;
}
