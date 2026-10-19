// continuum-knudsen: a Knudsen-number calculator for air. Mean free path of
// hard-sphere "air" (d = 3.7e-10 m), Kn = λ/L and the regime bands of
// src/sims/molecules.js; also the number of molecules in a cube of side L
// and its density noise 1/√N. Atmosphere values for the altitude scenarios
// are from the U.S. Standard Atmosphere 1976.

import { fmt, sci, superscript } from '../../kit/dom.js';
import { frame, slider, select, readout, canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { meanFreePath, meanSpeed, knudsen, knudsenRegime, KNUDSEN_REGIMES, moleculesInCube, ATM } from '../../sims/molecules.js';

const SCENARIOS = [
  { id: 'room', name: 'Air in a room (L = 1 m)', L: 1, p: ATM, T: 293.15 },
  { id: 'airliner', name: 'Airliner wing at 11 km (chord 5 m)', L: 5, p: 22632, T: 216.65 },
  { id: 'micro', name: 'Air in a 1 µm channel', L: 1e-6, p: ATM, T: 293.15 },
  { id: 'shock', name: 'Inside a strong shock (about 0.25 µm thick)', L: 2.5e-7, p: ATM, T: 293.15 },
  { id: 'nano', name: 'Air in a 10 nm gap', L: 1e-8, p: ATM, T: 293.15 },
  { id: 'reentry', name: 'Re-entry at 100 km (1 m body)', L: 1, p: 0.032011, T: 195.08 },
  { id: 'vacuum', name: 'Vacuum chamber at 10⁻⁴ Pa (30 cm)', L: 0.3, p: 1e-4, T: 293.15 },
];

const KN_MIN = 1e-8;
const KN_MAX = 1e3;
const LEN_MIN = 1e-10;
const LEN_MAX = 1e2;

// Length with a sensible unit.
function fmtLength(m) {
  const a = Math.abs(m);
  if (a >= 1e3) return `${fmt(m / 1e3, 3)} km`;
  if (a >= 1) return `${fmt(m, 3)} m`;
  if (a >= 1e-3) return `${fmt(m * 1e3, 3)} mm`;
  if (a >= 1e-6) return `${fmt(m * 1e6, 3)} µm`;
  if (a >= 1e-9) return `${fmt(m * 1e9, 3)} nm`;
  return `${fmt(m * 1e12, 3)} pm`;
}

function fmtPressure(p) {
  if (p >= 1e6) return `${fmt(p / 1e6, 3)} MPa`;
  if (p >= 1e3) return `${fmt(p / 1e3, 3)} kPa`;
  if (p >= 1) return `${fmt(p, 3)} Pa`;
  return `${sci(p, 2)} Pa`;
}

export function mountKnudsen(fig) {
  const start = SCENARIOS.find((s) => s.id === fig.dataset.preset) || SCENARIOS[0];
  const f = frame(fig, { title: 'Knudsen number calculator (air)' });
  const box = canvasBox(f.stage, { aspect: 3.2, minHeight: 150, maxHeight: 210, label: 'Two log scales. Top: the Knudsen number with the continuum, slip, transition and free-molecular bands and a marker for the current case. Bottom: lengths from 0.1 nm to 100 m with markers for the mean free path and for the length scale L.' });
  let L = start.L;
  let p = start.p;
  let T = start.T;

  const scen = select(f.controls, {
    label: 'Scenario',
    options: [...SCENARIOS.map((s) => [s.id, s.name]), ['custom', 'Your own numbers']],
    value: start.id,
    onChange: (v) => {
      const s = SCENARIOS.find((q) => q.id === v);
      if (!s) return;
      L = s.L;
      p = s.p;
      T = s.T;
      lCtl.set(L, { silent: true });
      pCtl.set(p, { silent: true });
      tCtl.set(T, { silent: true });
      update();
    },
  });
  const custom = () => scen.set('custom', { silent: true });
  const lCtl = slider(f.controls, { label: 'Length scale L', min: 1e-9, max: 10, log: true, value: L, fmt: fmtLength, onInput: (v) => ((L = v), custom(), update()) });
  const pCtl = slider(f.controls, { label: 'Pressure p', min: 1e-5, max: 1e7, log: true, value: p, fmt: fmtPressure, onInput: (v) => ((p = v), custom(), update()) });
  const tCtl = slider(f.controls, { label: 'Temperature T', min: 100, max: 2000, step: 1, value: T, fmt: (v) => `${Math.round(v)} K`, onInput: (v) => ((T = v), custom(), update()) });

  const rLam = readout(f.readouts, { label: 'mean free path λ' });
  const rKn = readout(f.readouts, { label: 'Knudsen number λ/L' });
  const rReg = readout(f.readouts, { label: 'regime' });
  const rN = readout(f.readouts, { label: 'molecules in a cube of side L' });
  const rNoise = readout(f.readouts, { label: 'density noise 1/√N' });
  const rC = readout(f.readouts, { label: 'mean molecular speed' });

  let lam = 0;
  let Kn = 0;

  function draw() {
    const { ctx, width: W, height: H } = box;
    const pal = palette();
    box.clear(pal.css('board'));
    const x0 = 12;
    const x1 = W - 12;
    const lx = (v, a, b) => x0 + ((Math.log10(v) - Math.log10(a)) / (Math.log10(b) - Math.log10(a))) * (x1 - x0);
    const kx = (v) => lx(Math.min(KN_MAX, Math.max(KN_MIN, v)), KN_MIN, KN_MAX);
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    // --- Knudsen strip
    const y0 = 22;
    const hband = Math.max(30, H * 0.3);
    const cols = ['s1', 's2', 's3', 's4'];
    KNUDSEN_REGIMES.forEach((r, q) => {
      const a = kx(Math.max(KN_MIN, r.min || KN_MIN));
      const b = kx(Math.min(KN_MAX, r.max));
      ctx.fillStyle = pal.css(cols[q], 0.22);
      ctx.fillRect(a, y0, b - a, hband);
      ctx.fillStyle = pal.css('ink');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = b - a > ctx.measureText(r.name).width + 6 ? r.name : b - a > 26 ? r.name.split(' ')[0].slice(0, 5) + (r.name.length > 5 ? '.' : '') : '';
      if (label) ctx.fillText(label, (a + b) / 2, y0 + hband / 2);
    });
    // decade ticks
    ctx.fillStyle = pal.css('muted');
    ctx.strokeStyle = pal.css('muted', 0.5);
    ctx.textBaseline = 'bottom';
    const stride = W < 480 ? 2 : 1;
    for (let e = -8; e <= 3; e++) {
      const px = Math.round(kx(10 ** e)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, y0);
      ctx.lineTo(px, y0 + 4);
      ctx.stroke();
      if ((e + 8) % stride === 0) ctx.fillText(e === 0 ? '1' : `10${superscript(e)}`, px, y0 - 2);
    }
    ctx.textAlign = 'left';
    ctx.fillText('Kn', 2, 12);
    // marker
    const mx = kx(Kn);
    ctx.strokeStyle = pal.css('accent');
    ctx.fillStyle = pal.css('accent');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mx, y0 - 1);
    ctx.lineTo(mx, y0 + hband + 1);
    ctx.stroke();
    // --- length strip
    const y1 = y0 + hband + 34;
    const lxx = (v) => lx(Math.min(LEN_MAX, Math.max(LEN_MIN, v)), LEN_MIN, LEN_MAX);
    ctx.strokeStyle = pal.css('line');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0, y1);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.fillStyle = pal.css('muted');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const marks = [
      [1e-9, '1 nm'],
      [1e-6, '1 µm'],
      [1e-3, '1 mm'],
      [1, '1 m'],
    ];
    for (const [v, s] of marks) {
      const px = Math.round(lxx(v)) + 0.5;
      ctx.strokeStyle = pal.css('muted', 0.6);
      ctx.beginPath();
      ctx.moveTo(px, y1 - 4);
      ctx.lineTo(px, y1 + 4);
      ctx.stroke();
      ctx.fillText(s, px, y1 + 6);
    }
    // λ and L markers
    const lamX = lxx(lam);
    const LX = lxx(L);
    ctx.lineWidth = 2;
    ctx.strokeStyle = pal.css('s5');
    ctx.fillStyle = pal.css('s5');
    ctx.beginPath();
    ctx.moveTo(Math.min(lamX, LX), y1);
    ctx.lineTo(Math.max(lamX, LX), y1);
    ctx.stroke();
    marker(ctx, lamX, y1, pal.css('s5'), 'λ', -1);
    marker(ctx, LX, y1, pal.css('ink'), 'L', -1);
  }

  function marker(ctx, x, y, color, text, dir) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 6, y + dir * 10);
    ctx.lineTo(x + 6, y + dir * 10);
    ctx.closePath();
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = 'bold 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.fillText(text, x, y + dir * 11);
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
  }

  let lastStatus = '';
  function update() {
    lam = meanFreePath({ T, p });
    Kn = knudsen(lam, L);
    const reg = knudsenRegime(Kn);
    const N = moleculesInCube(L, { p, T });
    rLam.set(fmtLength(lam));
    rKn.set(Kn >= 1e-3 && Kn < 1e5 ? fmt(Kn, 3) : sci(Kn, 2));
    rReg.set(reg.name, reg.id === 'continuum' ? 'good' : '');
    rN.set(N >= 1e5 ? sci(N, 2) : N >= 1 ? fmt(N, 3) : `${fmt(N, 2)} (less than one)`);
    rNoise.set(N >= 1 ? (1 / Math.sqrt(N) < 1e-3 ? sci(1 / Math.sqrt(N), 2) : fmt(1 / Math.sqrt(N), 2)) : '–');
    rC.set(`${Math.round(meanSpeed(T))} m/s`);
    const s = `${reg.name}: ${reg.description}`;
    if (s !== lastStatus) {
      f.status.textContent = s;
      lastStatus = s;
    }
    draw();
  }

  box.onResize(draw);
  update();
  return () => box.destroy();
}
