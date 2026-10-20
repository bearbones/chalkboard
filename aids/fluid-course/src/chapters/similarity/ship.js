// Figure similarity-ship: towing-tank arithmetic. A model run at the Froude-
// matched speed has the ship's wave pattern but a Reynolds number hundreds
// of times too small, so its skin-friction coefficient (ITTC 1957 line) is
// too large. Left: the friction line with ship and model. Right: the model
// speed each kind of similarity demands, against scale.

import { fmt, sci } from '../../kit/dom.js';
import { frame, slider, select, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { SHIP_PRESETS, shipScaling, ittc1957 } from '../../sims/similarity.js';

const LABELS = { 'cargo-1-25': '100 m cargo ship', 'yacht-1-10': '12 m yacht', 'tanker-1-50': '300 m tanker' };

function logspace(a, b, n) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = 10 ** (Math.log10(a) + ((Math.log10(b) - Math.log10(a)) * i) / (n - 1));
  return out;
}

const scaleText = (s) => `1/${fmt(1 / s, 3)}`;

export function mountSimilarityShip(fig) {
  const id = SHIP_PRESETS[fig.dataset.preset] ? fig.dataset.preset : 'cargo-1-25';
  const P = { id, ...SHIP_PRESETS[id] };
  const { stage, controls, readouts, status } = frame(fig, { title: 'Towing-tank arithmetic', wide: true });
  stage.classList.add('cols');

  const reLine = logspace(1e5, 1e10, 120);
  const cfLine = reLine.map(ittc1957);
  const scales = logspace(1 / 100, 1, 80);
  const fr = scales.map(Math.sqrt);
  const re = scales.map((s) => 1 / s);

  const cfPlot = new Plot(stage, {
    x: { label: 'Reynolds number Re = UL/ν', min: 1e5, max: 1e10, log: true, fmt: (v) => sci(v, 3) },
    y: { label: 'skin-friction coefficient', min: 0.001, max: 0.01, log: true, fmt: (v) => fmt(v, 4) },
    aspect: 1.2,
    label: 'ITTC 1957 friction line with the ship and the Froude-scaled model marked',
  });
  const uPlot = new Plot(stage, {
    x: { label: 'model scale (model length / ship length)', min: 1 / 100, max: 1, log: true, fmt: (v) => scaleText(v) },
    y: { label: 'model speed / ship speed', min: 0.1, max: 100, log: true, fmt: (v) => fmt(v, 3) },
    aspect: 1.2,
    label: 'Model speed needed for Froude similarity and for Reynolds similarity, against scale',
  });

  select(controls, {
    label: 'Ship',
    options: Object.keys(SHIP_PRESETS).map((k) => [k, LABELS[k] || k]),
    value: id,
    onChange: (v) => {
      Object.assign(P, { id: v, ...SHIP_PRESETS[v] });
      scaleSl.set(P.scale, { silent: true });
      speedSl.set(P.speedShip, { silent: true });
      update();
    },
  });
  const scaleSl = slider(controls, { label: 'Scale', min: 1 / 100, max: 1 / 4, log: true, value: P.scale, fmt: scaleText, onInput: (v) => ((P.scale = v), update()) });
  const speedSl = slider(controls, { label: 'Ship speed (m/s)', min: 1, max: 15, step: 0.1, value: P.speedShip, fmt: (v) => fmt(v, 3), onInput: (v) => ((P.speedShip = v), update()) });

  const rLm = readout(readouts, { label: 'model length' });
  const rUm = readout(readouts, { label: 'model speed (Froude match)' });
  const rFr = readout(readouts, { label: 'Froude number, both' });
  const rReS = readout(readouts, { label: 'Re, ship' });
  const rReM = readout(readouts, { label: 'Re, model' });
  const rCf = readout(readouts, { label: 'friction coefficient, model / ship' });
  const rUre = readout(readouts, { label: 'model speed for Re match' });
  const rNu = readout(readouts, { label: 'ν needed for both' });

  function update() {
    const S = shipScaling({ lengthShip: P.lengthShip, speedShip: P.speedShip, scale: P.scale, nu: P.nu });
    cfPlot.draw(
      [
        { x: reLine, y: cfLine, color: 'ink', width: 2, label: 'ITTC 1957 line' },
        { x: [S.froude.Re], y: [S.froude.Cf], color: 's2', points: 7, width: 0, label: 'model (Froude speed)' },
        { x: [S.ship.Re], y: [S.ship.Cf], color: 's1', points: 7, width: 0, label: 'ship' },
      ],
      {
        extra(ctx, tx, ty, area, pal) {
          const x1 = tx(S.froude.Re);
          const x2 = tx(S.ship.Re);
          const y1 = ty(S.froude.Cf);
          const y2 = ty(S.ship.Cf);
          ctx.strokeStyle = pal.css('accent');
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = pal.css('accent');
          ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText('friction correction', x2 - 6, (y1 + y2) / 2);
        },
      },
    );
    uPlot.draw(
      [
        { x: scales, y: fr, color: 's2', width: 2.4, label: 'Froude match: √scale' },
        { x: scales, y: re, color: 's4', width: 2.4, dash: [7, 5], label: 'Reynolds match: 1/scale' },
      ],
      {
        extra(ctx, tx, ty, area, pal) {
          const x = tx(P.scale);
          ctx.strokeStyle = pal.css('muted', 0.8);
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(x, area.y0);
          ctx.lineTo(x, area.y1);
          ctx.stroke();
          ctx.setLineDash([]);
          for (const [v, c] of [[Math.sqrt(P.scale), 's2'], [1 / P.scale, 's4']]) {
            ctx.fillStyle = pal.css(c);
            ctx.beginPath();
            ctx.arc(x, ty(v), 5, 0, 2 * Math.PI);
            ctx.fill();
          }
        },
      },
    );

    rLm.set(`${fmt(S.lengthModel, 3)} m`);
    rUm.set(`${fmt(S.froude.speed, 3)} m/s`);
    rFr.set(fmt(S.ship.Fr, 3));
    rReS.set(sci(S.ship.Re, 2));
    rReM.set(`${sci(S.froude.Re, 2)} (×${fmt(S.froude.reRatio, 2)})`);
    const ratio = S.froude.Cf / S.ship.Cf;
    rCf.set(`${fmt(S.froude.Cf, 3)} / ${fmt(S.ship.Cf, 3)} = ${fmt(ratio, 3)}`, 'bad');
    rUre.set(`${fmt(S.reynolds.speed, 3)} m/s`, S.reynolds.speed > 50 ? 'bad' : '');
    rNu.set(`${sci(S.nuNeeded, 2)} m²/s`);

    status.textContent = `At ${scaleText(P.scale)} the model runs at ${fmt(S.froude.speed, 3)} m/s, so its waves match the ship's (same Fr = ${fmt(S.ship.Fr, 2)}). Its Re is ${fmt(1 / S.froude.reRatio, 3)} times too small, and its friction coefficient ${fmt(ratio, 3)} times too large. Matching Re as well would need ${fmt(S.reynolds.speed, 3)} m/s, or a liquid ${fmt(P.nu / S.nuNeeded, 3)} times less viscous than water.`;
  }

  update();
  return () => {
    cfPlot.destroy();
    uPlot.destroy();
  };
}
