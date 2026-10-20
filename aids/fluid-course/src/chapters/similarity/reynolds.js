// Figure similarity-reynolds: Reynolds's three tubes. Choose a bore, the
// water temperature, the speed and how quiet the inlet is. The plot shows
// the critical speed of each tube against temperature; switch it to
// Reynolds number and the three curves become one line. The tube drawing is
// a schematic switched by the threshold, not a flow simulation.

import { fmt, sci } from '../../kit/dom.js';
import { frame, slider, select, segmented, readout, canvasBox } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { REYNOLDS_TUBES, REYNOLDS_INLETS, REYNOLDS_THRESHOLDS, WATER_T_RANGE, waterNu, pipeReynolds, criticalSpeed, dyeRegime } from '../../sims/ch-similarity-scales.js';

const TUBE_STYLE = [
  ['s1', null],
  ['s2', [8, 5]],
  ['s3', [2, 4]],
];

const PRESETS = {
  direct: { tube: 'half', T: 15, U: 0.1, inlet: 'still', view: 'speed' },
  sinuous: { tube: 'half', T: 15, U: 1.5, inlet: 'still', view: 'speed' },
  disturbed: { tube: 'half', T: 15, U: 0.4, inlet: 'disturbed', view: 'speed' },
  collapse: { tube: 'half', T: 15, U: 0.4, inlet: 'still', view: 're' },
};

const reFmt = (v) => (v >= 1e5 ? sci(v, 3) : Math.round(v).toLocaleString('en-GB'));

export function mountSimilarityReynolds(fig) {
  const P = { ...(PRESETS[fig.dataset.preset] || PRESETS.direct) };
  const { stage, controls, readouts, status } = frame(fig, { title: 'Reynolds’s tubes', wide: true });

  const box = canvasBox(stage, { aspect: 4.2, minHeight: 110, maxHeight: 200, label: 'Schematic of a glass tube fed from a tank, with a dye streak that is straight or breaks up' });
  const plot = new Plot(stage, {
    x: { label: 'water temperature (°C)', min: WATER_T_RANGE[0], max: WATER_T_RANGE[1] },
    y: { label: 'critical speed (m/s)', min: 0.01, max: 20, log: true, fmt: (v) => fmt(v, 3) },
    aspect: 2,
    label: 'Critical speed of each tube against water temperature, or the same thresholds as Reynolds numbers',
  });

  const temps = new Float64Array(61);
  for (let i = 0; i < temps.length; i++) temps[i] = WATER_T_RANGE[0] + ((WATER_T_RANGE[1] - WATER_T_RANGE[0]) * i) / (temps.length - 1);
  const curves = REYNOLDS_TUBES.map(() => new Float64Array(temps.length));
  const flat = REYNOLDS_TUBES.map(() => new Float64Array(temps.length));

  select(controls, { label: 'Tube bore', options: REYNOLDS_TUBES.map((t) => [t.id, t.label]), value: P.tube, onChange: (v) => ((P.tube = v), update()) });
  select(controls, { label: 'Inlet', options: Object.values(REYNOLDS_INLETS).map((i) => [i.id, i.label]), value: P.inlet, onChange: (v) => ((P.inlet = v), update()) });
  slider(controls, { label: 'Water temperature (°C)', min: WATER_T_RANGE[0], max: WATER_T_RANGE[1], step: 1, value: P.T, fmt: (v) => fmt(v, 2), onInput: (v) => ((P.T = v), update()) });
  slider(controls, { label: 'Mean speed (m/s)', min: 0.01, max: 15, log: true, value: P.U, fmt: (v) => fmt(v, 3), onInput: (v) => ((P.U = v), update()) });
  segmented(controls, { label: 'Plot', options: [['speed', 'critical speed'], ['re', 'Reynolds number']], value: P.view, onChange: (v) => ((P.view = v), update()) });

  const rNu = readout(readouts, { label: 'ν of the water' });
  const rRe = readout(readouts, { label: 'Re = UD/ν' });
  const rLimit = readout(readouts, { label: 'this inlet’s limit' });
  const rRegime = readout(readouts, { label: 'dye streak' });

  let regime = 'direct';

  function drawTube() {
    const { ctx, width: W, height: H } = box;
    const pal = palette();
    box.clear();
    const tube = REYNOLDS_TUBES.find((t) => t.id === P.tube);
    const half = (H * 0.16 * tube.D) / REYNOLDS_TUBES[0].D + H * 0.05;
    const yc = H * 0.5;
    const x0 = W * 0.16;
    const x1 = W - 10;
    // tank
    ctx.fillStyle = pal.css('liquid', 0.22);
    ctx.fillRect(0, 6, x0, H - 12);
    // water in the tube
    ctx.fillRect(x0, yc - half, x1 - x0, 2 * half);
    // trumpet mouth and walls
    ctx.strokeStyle = pal.css('ink', 0.85);
    ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x0 - W * 0.06, yc + s * (half + H * 0.22));
      ctx.quadraticCurveTo(x0 - W * 0.005, yc + s * half, x0 + W * 0.04, yc + s * half);
      ctx.lineTo(x1, yc + s * half);
      ctx.stroke();
    }
    // dye
    const xb = regime === 'sinuous' ? x0 + (x1 - x0) * Math.max(0.12, 0.45 - 0.12 * Math.log10(lastRe / lastLimit + 1e-9)) : x1;
    ctx.strokeStyle = pal.css('dye');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 - W * 0.05, yc);
    ctx.lineTo(xb, yc);
    ctx.stroke();
    if (regime === 'sinuous') {
      ctx.fillStyle = pal.css('dye', 0.3);
      ctx.fillRect(xb + 18, yc - half, x1 - xb - 18, 2 * half);
      ctx.strokeStyle = pal.css('dye', 0.85);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = xb; x <= x1; x += 2) {
        const a = Math.min(1, (x - xb) / 24) * half * 0.85;
        const y = yc + a * Math.sin((x - xb) * 0.11) * Math.cos((x - xb) * 0.037);
        x === xb ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = pal.css('muted');
    ctx.font = '11px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('schematic', 6, 8);
    ctx.textAlign = 'right';
    ctx.fillText(`${tube.label} bore`, x1, 8);
  }

  let lastRe = 1;
  let lastLimit = 1;

  function update() {
    const tube = REYNOLDS_TUBES.find((t) => t.id === P.tube);
    const inlet = REYNOLDS_INLETS[P.inlet];
    const nu = waterNu(P.T);
    const Re = pipeReynolds(P.U, tube.D, P.T);
    regime = dyeRegime(Re, P.inlet);
    lastRe = Re;
    lastLimit = inlet.Re;

    rNu.set(`${sci(nu, 3)} m²/s`);
    rRe.set(reFmt(Re));
    rLimit.set(reFmt(inlet.Re));
    rRegime.set(regime === 'sinuous' ? 'sinuous' : regime === 'direct' ? 'direct' : 'direct, but fragile', regime === 'sinuous' ? 'bad' : regime === 'direct' ? 'good' : '');

    const series = [];
    REYNOLDS_TUBES.forEach((t, k) => {
      for (let i = 0; i < temps.length; i++) {
        curves[k][i] = criticalSpeed(inlet.Re, t.D, temps[i]);
        flat[k][i] = inlet.Re;
      }
      const [color, dash] = TUBE_STYLE[k];
      series.push({ x: temps, y: P.view === 're' ? flat[k] : curves[k], color, dash, width: t.id === P.tube ? 3 : 1.8, label: `${t.label}${P.view === 're' ? '' : ' tube'}` });
    });
    const k = REYNOLDS_TUBES.indexOf(tube);
    plot.setAxes({ y: P.view === 're' ? { label: 'Reynolds number', min: 100, max: 1e6, fmt: (v) => reFmt(v) } : { label: 'critical speed (m/s)', min: 0.01, max: 20, fmt: (v) => fmt(v, 3) } });
    plot.draw(series, {
      extra(ctx, tx, ty, area, pal) {
        const y = P.view === 're' ? Re : P.U;
        ctx.strokeStyle = pal.css(TUBE_STYLE[k][0]);
        ctx.fillStyle = pal.css('board');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(tx(P.T), ty(y), 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        if (P.view === 're') {
          ctx.strokeStyle = pal.css('muted', 0.8);
          ctx.setLineDash([3, 4]);
          ctx.lineWidth = 1;
          for (const v of [REYNOLDS_THRESHOLDS.lower]) {
            ctx.beginPath();
            ctx.moveTo(area.x0, ty(v));
            ctx.lineTo(area.x1, ty(v));
            ctx.stroke();
          }
          ctx.setLineDash([]);
          ctx.fillStyle = pal.css('muted');
          ctx.font = '11px "Atkinson Hyperlegible", system-ui, sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          ctx.fillText('lower critical value ≈ 2,020', area.x1 - 4, ty(REYNOLDS_THRESHOLDS.lower) + 3);
        }
      },
    });
    drawTube();

    const where = `${tube.label} tube, ${fmt(P.T, 2)} °C, ${fmt(P.U, 3)} m/s: Re = ${reFmt(Re)}.`;
    if (regime === 'direct') status.textContent = `${where} Below about 2,020 any disturbance dies out: the dye stays a straight thread.`;
    else if (regime === 'direct-unstable') status.textContent = `${where} The dye is still straight, because this inlet is quiet enough up to ${reFmt(inlet.Re)}; but above 2,020 a large enough disturbance would no longer die out.`;
    else status.textContent = `${where} Past this inlet’s limit of ${reFmt(inlet.Re)}: the dye mixes up with the water and fills the rest of the tube.${P.view === 'speed' ? ' Switch the plot to Reynolds number to see the three tubes agree.' : ''}`;
  }

  box.onResize(drawTube);
  update();
  return () => {
    box.destroy();
    plot.destroy();
  };
}
