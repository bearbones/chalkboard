// Figure similarity-regimes: where real flows sit. Each scenario states its
// length, speed and fluid; the figure places its Reynolds, Mach and Froude
// numbers on log strips and says what each one implies.

import { fmt, sci, superscript } from '../../kit/dom.js';
import { frame, slider, select, readout, canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { SCENARIOS, scenarioNumbers } from '../../sims/ch-similarity-scales.js';

const STRIPS = [
  { key: 'Re', label: 'Reynolds number  Re = UL/ν', lo: -7, hi: 14, marks: [[1, 'Re = 1']] },
  { key: 'Ma', label: 'Mach number  Ma = U/c', lo: -5, hi: 1, marks: [[0.3, '0.3'], [1, 'Ma = 1']] },
  { key: 'Fr', label: 'Froude number  Fr = U/√(gL)', lo: -3, hi: 2, marks: [[0.4, '0.4'], [1, 'Fr = 1']] },
];

const PRESETS = { car: 'car', bacterium: 'bacterium', airliner: 'airliner', ship: 'ship', river: 'river' };

const num = (v) => (v >= 1e4 || v < 1e-2 ? sci(v, 2) : fmt(v, 3));

function reText(Re) {
  if (Re < 1e-2) return 'Viscosity dominates completely: inertia is negligible, so the motion stops the moment the pushing stops.';
  if (Re < 1) return 'Viscous forces dominate; inertia is a small correction.';
  if (Re < 1e3) return 'Inertia and viscosity are comparable: neither can be dropped.';
  return 'Inertia dominates; viscosity matters mainly in thin boundary layers near surfaces (and in the smallest eddies, if the flow is turbulent).';
}

function maText(Ma) {
  if (Ma < 0.3) return `Ma < 0.3: density changes are of order Ma²/2 = ${fmt((100 * Ma * Ma) / 2, 2)}%, so the flow can be treated as incompressible.`;
  if (Ma < 0.8) return 'Compressibility matters: density changes of several percent.';
  if (Ma < 1.2) return 'Transonic: parts of the flow are supersonic and shocks can sit on the body.';
  return 'Supersonic: shock waves form.';
}

function frText(s, Fr) {
  if (!s.freeSurface) return 'No free surface, so gravity waves (and Fr) play no part.';
  const hull = s.id === 'ship' || s.id === 'swimmer' ? ' For a hull, wave resistance climbs steeply near Fr ≈ 0.4, where the bow wave is as long as the hull.' : '';
  return (Fr < 1 ? 'Fr < 1: surface waves can outrun the flow (subcritical).' : 'Fr > 1: the flow outruns its own surface waves (supercritical).') + hull;
}

export function mountSimilarityRegimes(fig) {
  let current = SCENARIOS.find((s) => s.id === (PRESETS[fig.dataset.preset] || 'car'));
  let mult = 1;
  const { stage, controls, readouts, status } = frame(fig, { title: 'Where real flows sit' });
  const box = canvasBox(stage, { height: 270, label: 'Log scales of Reynolds, Mach and Froude number with every scenario marked and the chosen one highlighted' });

  select(controls, {
    label: 'Flow',
    options: SCENARIOS.map((s) => [s.id, s.name]),
    value: current.id,
    onChange: (v) => {
      current = SCENARIOS.find((s) => s.id === v);
      multSl.set(1, { silent: true });
      mult = 1;
      update();
    },
  });
  const multSl = slider(controls, { label: 'Speed ×', min: 0.01, max: 100, log: true, value: 1, fmt: (v) => `${fmt(v, 2)} (${num(current.U * v)} m/s)`, onInput: (v) => ((mult = v), update()) });

  const rL = readout(readouts, { label: 'length L' });
  const rU = readout(readouts, { label: 'speed U' });
  const rFluid = readout(readouts, { label: 'fluid' });
  const rNu = readout(readouts, { label: 'ν, c' });
  const rRe = readout(readouts, { label: 'Re' });
  const rMa = readout(readouts, { label: 'Ma' });
  const rFr = readout(readouts, { label: 'Fr' });

  function draw() {
    const { ctx, width: W, height: H } = box;
    const pal = palette();
    box.clear();
    const padL = 14;
    const padR = 14;
    const band = H / STRIPS.length;
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    for (let k = 0; k < STRIPS.length; k++) {
      const S = STRIPS[k];
      const y = band * k + band * 0.58;
      const X = (v) => padL + ((Math.log10(v) - S.lo) / (S.hi - S.lo)) * (W - padL - padR);
      // strip label
      ctx.fillStyle = pal.css('ink');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(S.label, padL, band * k + 6);
      // axis and decade ticks
      ctx.strokeStyle = pal.css('muted', 0.7);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      const span = S.hi - S.lo;
      const every = Math.max(1, Math.ceil((span * 34) / (W - padL - padR)));
      ctx.fillStyle = pal.css('muted');
      ctx.textAlign = 'center';
      for (let e = S.lo; e <= S.hi; e++) {
        const x = X(10 ** e);
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x, y + 3);
        ctx.stroke();
        if ((e - S.lo) % every === 0) ctx.fillText(e === 0 ? '1' : `10${superscript(e)}`, x, y + 6);
      }
      // thresholds
      for (let m = 0; m < S.marks.length; m++) {
        const [v, text] = S.marks[m];
        const x = X(v);
        ctx.strokeStyle = pal.css('accent', 0.7);
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, y - 16);
        ctx.lineTo(x, y + 4);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = pal.css('accent');
        // Two marks on one strip can sit close together: push their labels apart.
        const two = S.marks.length === 2;
        ctx.textAlign = two ? (m === 0 ? 'right' : 'left') : 'center';
        ctx.fillText(text, two ? x + (m === 0 ? -3 : 3) : x, y + 20);
      }
      // every scenario, faint
      for (const s of SCENARIOS) {
        const v = scenarioNumbers(s, 1)[S.key];
        if (!(v > 0)) continue;
        const x = Math.max(padL, Math.min(W - padR, X(v)));
        ctx.strokeStyle = pal.css('muted', 0.8);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
        ctx.stroke();
      }
      // the chosen one
      const v = scenarioNumbers(current, mult)[S.key];
      if (v > 0) {
        const raw = X(v);
        const x = Math.max(padL, Math.min(W - padR, raw));
        ctx.fillStyle = pal.css('s1');
        ctx.strokeStyle = pal.css('board');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        const text = `${raw < padL ? '< ' : raw > W - padR ? '> ' : ''}${num(v)}`;
        ctx.fillStyle = pal.css('ink');
        ctx.textBaseline = 'bottom';
        ctx.textAlign = x < W * 0.15 ? 'left' : x > W * 0.85 ? 'right' : 'center';
        ctx.fillText(text, x, y - 10);
      } else {
        ctx.fillStyle = pal.css('muted');
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'right';
        ctx.fillText('no free surface', W - padR, y - 8);
      }
    }
  }

  function update() {
    const n = scenarioNumbers(current, mult);
    rL.set(current.lengthIs);
    rU.set(mult === 1 ? current.speedIs : `${num(n.U)} m/s`);
    rFluid.set(current.fluid.name);
    rNu.set(`${sci(current.fluid.nu, 2)} m²/s, ${fmt(current.fluid.c, 3)} m/s`);
    rRe.set(num(n.Re));
    rMa.set(num(n.Ma));
    rFr.set(current.freeSurface ? num(n.Fr) : 'not relevant');
    status.textContent = `${current.name}: ${reText(n.Re)} ${maText(n.Ma)} ${frText(current, n.Fr)}`;
    draw();
  }

  box.onResize(draw);
  update();
  return () => box.destroy();
}
