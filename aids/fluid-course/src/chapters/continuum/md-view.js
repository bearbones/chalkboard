// Drawing helpers shared by the continuum chapter's molecular-dynamics
// figures. Pure drawing: the physics lives in src/sims/molecules.js.

// Letterboxed rectangle for a box of Lx × Ly molecular diameters inside a
// canvas of W × H CSS pixels, with y = 0 at the bottom. Writes into `out`.
export function boxRect(W, H, Lx, Ly, pad, out) {
  const s = Math.min((W - 2 * pad) / Lx, (H - 2 * pad) / Ly);
  out.s = s;
  out.w = s * Lx;
  out.h = s * Ly;
  out.x = (W - out.w) / 2;
  out.y = (H - out.h) / 2;
  return out;
}

// Molecules as discs of radius r (in molecular diameters). `mask`, if given,
// selects which molecules to draw (mask[i] === want).
export function drawMolecules(ctx, rect, md, { r = 0.42, fill, mask = null, want = 1 } = {}) {
  const { x, y, N } = md;
  const pr = Math.max(1.2, r * rect.s);
  const bx = rect.x;
  const by = rect.y + rect.h;
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    if (mask && mask[i] !== want) continue;
    const px = bx + x[i] * rect.s;
    const py = by - y[i] * rect.s;
    ctx.moveTo(px + pr, py);
    ctx.arc(px, py, pr, 0, 2 * Math.PI);
  }
  ctx.fill();
}

// Thin frame around the box; solid bars for walls when the box has them.
export function drawBoxFrame(ctx, rect, pal, walls) {
  ctx.strokeStyle = pal.css('line');
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  if (walls) {
    ctx.fillStyle = pal.css('solid');
    ctx.fillRect(rect.x, rect.y - 5, rect.w, 5);
    ctx.fillRect(rect.x, rect.y + rect.h, rect.w, 5);
  }
}
