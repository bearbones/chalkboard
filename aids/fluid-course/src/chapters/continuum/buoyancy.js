// continuum-buoyancy: hydrostatic pressure on a 10 cm cube in a tank.
// p = p₀ + ρ g h on every face; the buoyant force is the difference between
// the bottom and top pushes, (p_bottom − p_top)·A = ρ g × (submerged volume)
// (Archimedes, On Floating Bodies I, Props 5–7). Closed form: no scheme.
// After "Let go" the cube moves under weight, buoyancy and a heavy linear
// damping (a display choice, not a drag law) until it floats or lands.
// Densities near 20 °C: fresh water 998 (IAPWS), seawater ≈ 1025, olive oil
// ≈ 910, glycerine ≈ 1261, mercury 13 546 kg/m³; solids are typical values.

import { fmt } from '../../kit/dom.js';
import { frame, slider, select, button, readout, canvasBox, animate } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { arrow } from '../../kit/field.js';

const G = 9.81; // m/s²
const P0 = 101325; // Pa
const A_SIDE = 0.1; // m, cube side
const DEPTH = 0.4; // m of liquid in the tank
const AIR = 0.1; // m of air drawn above the surface
const DAMP = 0.35; // s, display damping time

const FLUIDS = [
  { id: 'water', name: 'Fresh water (998)', rho: 998 },
  { id: 'sea', name: 'Seawater (≈ 1025)', rho: 1025 },
  { id: 'oil', name: 'Olive oil (≈ 910)', rho: 910 },
  { id: 'glycerine', name: 'Glycerine (≈ 1261)', rho: 1261 },
  { id: 'mercury', name: 'Mercury (13 546)', rho: 13546 },
];
const SOLIDS = [
  { id: 'pine', name: 'Pine wood (≈ 500)', rho: 500 },
  { id: 'ice', name: 'Ice (917)', rho: 917 },
  { id: 'nylon', name: 'Nylon (≈ 1140)', rho: 1140 },
  { id: 'aluminium', name: 'Aluminium (2700)', rho: 2700 },
  { id: 'steel', name: 'Steel (≈ 7850)', rho: 7850 },
];

const PRESETS = {
  default: { fluid: 'water', solid: 'aluminium', z: 0.15 },
  ice: { fluid: 'sea', solid: 'ice', z: 0.15 },
  steel: { fluid: 'mercury', solid: 'steel', z: 0.2 },
};

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountBuoyancy(fig, { signal }) {
  const preset = PRESETS[fig.dataset.preset] || PRESETS.default;
  const f = frame(fig, { title: 'Pressure on a submerged block' });
  const box = canvasBox(f.stage, { aspect: 1.35, minHeight: 240, maxHeight: 420, label: 'A tank of liquid with a 10 centimetre cube in it. Arrows on each face show the gauge pressure pushing on it; they grow with depth. Drag the block up and down.' });
  let fluid = FLUIDS.find((q) => q.id === preset.fluid);
  let solid = SOLIDS.find((q) => q.id === preset.solid);
  let z = preset.z; // depth of the top face below the surface (m); negative = above
  let v = 0; // downward speed
  let held = true;

  const zMin = -A_SIDE - 0.01;
  const zMax = DEPTH - A_SIDE;

  select(f.controls, {
    label: 'Liquid',
    options: FLUIDS.map((q) => [q.id, q.name]),
    value: fluid.id,
    onChange: (id) => {
      fluid = FLUIDS.find((q) => q.id === id);
      update();
    },
  });
  select(f.controls, {
    label: 'Block (kg/m³)',
    options: SOLIDS.map((q) => [q.id, q.name]),
    value: solid.id,
    onChange: (id) => {
      solid = SOLIDS.find((q) => q.id === id);
      update();
    },
  });
  const zCtl = slider(f.controls, {
    label: 'Depth of the top face',
    min: zMin,
    max: zMax,
    step: 0.005,
    value: z,
    fmt: (x) => `${Math.round(x * 100)} cm`,
    onInput: (x) => {
      z = x;
      v = 0;
      held = true;
      loop.pause();
      update();
    },
  });
  button(f.controls, {
    label: 'Let go',
    kind: 'primary',
    onClick: () => release(),
  });

  const rTop = readout(f.readouts, { label: 'pressure on the top face' });
  const rBot = readout(f.readouts, { label: 'pressure on the bottom face' });
  const rB = readout(f.readouts, { label: 'buoyancy B = (p_bottom − p_top)·A' });
  const rW = readout(f.readouts, { label: 'weight W' });
  const rNet = readout(f.readouts, { label: 'net force, up' });
  const rFloat = readout(f.readouts, { label: 'floats if ρ_block/ρ_liquid < 1' });

  // Hydrostatics of the cube with its top at depth zz.
  const pAt = (h) => P0 + fluid.rho * G * Math.max(0, h);
  const submerged = (zz) => Math.max(0, Math.min(A_SIDE, zz + A_SIDE));
  const buoyancy = (zz) => fluid.rho * G * A_SIDE * A_SIDE * submerged(zz);
  const weight = () => solid.rho * G * A_SIDE ** 3;

  function equilibrium() {
    const frac = solid.rho / fluid.rho;
    if (frac >= 1) return zMax;
    return frac * A_SIDE - A_SIDE; // top face above the surface by (1 − frac)a
  }

  function release() {
    held = false;
    if (reduced()) {
      z = equilibrium();
      v = 0;
      held = true;
      zCtl.set(z, { silent: true });
      update();
      return;
    }
    loop.play();
  }

  // ---- drawing ------------------------------------------------------------------
  let geo = null;
  function layout() {
    const { width: W, height: H } = box;
    const top = 14;
    const bottom = H - 14;
    const s = (bottom - top) / (DEPTH + AIR); // px per metre
    const tankW = Math.min(W - 70, s * 0.9);
    const x0 = (W - tankW) / 2 + 14;
    geo = { s, x0, x1: x0 + tankW, surf: top + AIR * s, floor: bottom, top };
  }

  function draw() {
    const { ctx } = box;
    const pal = palette();
    box.clear(pal.css('board'));
    layout();
    const { s, x0, x1, surf, floor } = geo;
    // liquid
    ctx.fillStyle = pal.css('liquid', 0.35);
    ctx.fillRect(x0, surf, x1 - x0, floor - surf);
    ctx.strokeStyle = pal.css('liquid');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, surf);
    ctx.lineTo(x1, surf);
    ctx.stroke();
    // tank walls
    ctx.strokeStyle = pal.css('solid');
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0 - 2, geo.top);
    ctx.lineTo(x0 - 2, floor + 2);
    ctx.lineTo(x1 + 2, floor + 2);
    ctx.lineTo(x1 + 2, geo.top);
    ctx.stroke();
    // depth scale
    ctx.font = '11px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.fillStyle = pal.css('muted');
    ctx.strokeStyle = pal.css('muted', 0.7);
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let d = 0; d <= DEPTH + 1e-9; d += 0.1) {
      const py = Math.round(surf + d * s) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x0 - 10, py);
      ctx.lineTo(x0 - 4, py);
      ctx.stroke();
      ctx.fillText(`${Math.round(d * 100)}`, x0 - 12, py);
    }
    ctx.textAlign = 'center';
    ctx.fillText('cm', x0 - 22, surf - 10);
    // cube
    const cs = A_SIDE * s;
    const cx = (x0 + x1) / 2;
    const bx = cx - cs / 2;
    const by = surf + z * s;
    ctx.fillStyle = pal.css('s4', 0.35);
    ctx.strokeStyle = pal.css('s4');
    ctx.lineWidth = 2;
    ctx.fillRect(bx, by, cs, cs);
    ctx.strokeRect(bx, by, cs, cs);
    // pressure arrows (gauge pressure, scaled to the pressure at the floor)
    const pmax = fluid.rho * G * DEPTH;
    const Lmax = Math.min(70, 0.22 * (x1 - x0));
    const len = (h) => (Math.max(0, h) * fluid.rho * G) / pmax * Lmax;
    ctx.strokeStyle = pal.css('s1');
    ctx.fillStyle = pal.css('s1');
    ctx.lineWidth = 2;
    const hTop = z;
    const hBot = z + A_SIDE;
    // top and bottom faces: three arrows each
    for (let q = 1; q <= 3; q++) {
      const px = bx + (q * cs) / 4;
      const lt = len(hTop);
      if (lt > 3) arrow(ctx, px, by - lt - 2, px, by - 2, 6);
      const lb = len(hBot);
      if (lb > 3) arrow(ctx, px, by + cs + lb + 2, px, by + cs + 2, 6);
    }
    // side faces: arrows at three heights, pointing inwards
    for (let q = 0; q < 3; q++) {
      const frac = (q + 0.5) / 3;
      const h = z + frac * A_SIDE;
      const l = len(h);
      const py = by + frac * cs;
      if (l > 3) {
        arrow(ctx, bx - l - 2, py, bx - 2, py, 5);
        arrow(ctx, bx + cs + l + 2, py, bx + cs + 2, py, 5);
      }
    }
    // labels
    ctx.fillStyle = pal.css('ink');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.fillText(`p₀ = ${fmt(P0 / 1000, 4)} kPa`, x0 + 6, geo.top + 2);
  }

  let lastStatus = '';
  function update() {
    const pt = pAt(z);
    const pb = pAt(z + A_SIDE);
    const B = buoyancy(z);
    const W = weight();
    const onFloor = z >= zMax - 1e-9;
    const net = B - W + (onFloor && W > B ? W - B : 0);
    rTop.set(z < 0 ? `${fmt(pt / 1000, 5)} kPa (in air)` : `${fmt(pt / 1000, 5)} kPa`);
    rBot.set(`${fmt(pb / 1000, 5)} kPa`);
    rB.set(`${fmt(B, 3)} N`);
    rW.set(`${fmt(W, 3)} N`);
    rNet.set(onFloor && W > B ? `0 N (the floor pushes ${fmt(W - B, 3)} N)` : `${fmt(net, 3)} N`);
    const ratio = solid.rho / fluid.rho;
    rFloat.set(ratio < 1 ? `${fmt(ratio, 3)}: floats, ${Math.round(ratio * 100)}% under` : `${fmt(ratio, 3)}: sinks`);
    let s;
    if (!held && Math.abs(v) > 1e-3) s = 'Moving: weight and buoyancy are out of balance.';
    else if (z >= 0) s = `Fully under: B = ρ g a³ = ${fmt(B, 3)} N at any depth, because the top and bottom pressures grow together. The side pushes cancel.`;
    else if (z > -A_SIDE) s = `Partly under: only ${Math.round((submerged(z) / A_SIDE) * 100)}% of the block displaces liquid, so B is smaller.`;
    else s = 'Out of the liquid: no buoyancy, only air pressure, which pushes equally on every face.';
    if (s !== lastStatus) {
      f.status.textContent = s;
      lastStatus = s;
    }
    draw();
  }

  // Drag the block up and down.
  const cv = box.canvas;
  cv.style.touchAction = 'none';
  cv.style.cursor = 'ns-resize';
  let dragging = false;
  const toZ = (e) => {
    const p = box.pointer(e);
    return Math.max(zMin, Math.min(zMax, (p.y - geo.surf) / geo.s - A_SIDE / 2));
  };
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    dragging = true;
    held = true;
    loop.pause();
    v = 0;
    z = toZ(e);
    zCtl.set(z, { silent: true });
    update();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    z = toZ(e);
    zCtl.set(z, { silent: true });
    update();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    release();
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);

  const loop = animate(
    fig,
    (dt) => {
      // A few substeps of semi-implicit Euler with damping.
      const m = solid.rho * A_SIDE ** 3;
      const nsub = 8;
      const h = dt / nsub;
      for (let k = 0; k < nsub; k++) {
        const acc = (weight() - buoyancy(z)) / m - v / DAMP;
        v += h * acc;
        z += h * v;
        if (z >= zMax) {
          z = zMax;
          if (v > 0) v = 0;
        }
        if (z < zMin) {
          z = zMin;
          if (v < 0) v = 0;
        }
      }
      zCtl.set(z, { silent: true });
      const settled = Math.abs(v) < 2e-4 && (z >= zMax - 1e-9 || Math.abs(weight() - buoyancy(z)) < 1e-3 * weight());
      if (settled) {
        v = 0;
        held = true;
        loop.pause();
      }
      update();
    },
    { autoplay: false, signal },
  );
  box.onResize(draw);
  update();
  return () => {
    loop.destroy();
    box.destroy();
  };
}
