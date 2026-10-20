// Figure similarity-strouhal: Aeolian tones. A wire in a wind sheds
// vortices from alternate sides at a frequency f = St U / D, with St taken
// from Roshko's fits (sims/similarity.js). Strouhal measured the pitch of
// such tones in 1878; the button plays a pure tone at the predicted pitch.

import { fmt, sci } from '../../kit/dom.js';
import { frame, slider, button, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { STROUHAL_FITS, SHEDDING_ONSET_RE, strouhalCylinder } from '../../sims/similarity.js';

const NU_AIR = 1.5e-5; // m^2/s, air near 20 degC
const RE_MIN = 10;
const RE_MAX = 1e6;

const PRESETS = {
  wire: { D: 1e-3, U: 10 },
  slow: { D: 2e-4, U: 2 },
  transition: { D: 1e-3, U: 3 },
};

const REGIME_TEXT = {
  steady: 'Below Re ≈ 47 the wake is steady: no vortices are shed, so there is no tone.',
  'roshko-stable': 'A regular laminar vortex street (Roshko’s stable range).',
  transition: 'Roshko’s transition range (150 to 300), where the wake becomes three-dimensional: no single St fits here.',
  'roshko-irregular': 'Roshko’s irregular range: the wake is turbulent, but the shedding is still periodic.',
  'subcritical-plateau': 'St stays close to 0.2 (a round value, not a fit) up to the drag crisis near Re ≈ 2 × 10⁵.',
  critical: 'Past the drag crisis no single shedding frequency is given here.',
};

function logspace(a, b, n) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = 10 ** (Math.log10(a) + ((Math.log10(b) - Math.log10(a)) * i) / (n - 1));
  return out;
}

export function mountSimilarityStrouhal(fig, { signal }) {
  const P = { ...(PRESETS[fig.dataset.preset] || PRESETS.wire) };
  const { stage, controls, readouts, status } = frame(fig, { title: 'Aeolian tones' });

  const fits = STROUHAL_FITS.map((F, k) => {
    const xs = logspace(F.range[0], F.range[1], 60);
    return { F, xs, ys: xs.map(F.fn), color: ['s1', 's2', 's3'][k], dash: [null, [7, 5], [2, 4]][k] };
  });

  const plot = new Plot(stage, {
    x: { label: 'Reynolds number Re = UD/ν', min: RE_MIN, max: RE_MAX, log: true, fmt: (v) => sci(v, 3) },
    y: { label: 'Strouhal number St = fD/U', min: 0, max: 0.3, fmt: (v) => fmt(v, 3) },
    aspect: 1.8,
    label: 'Strouhal number of a cylinder against Reynolds number, from Roshko’s fits',
  });

  slider(controls, { label: 'Wire diameter (mm)', min: 0.1, max: 10, log: true, value: P.D * 1e3, fmt: (v) => fmt(v, 2), onInput: (v) => ((P.D = v * 1e-3), update()) });
  slider(controls, { label: 'Wind speed (m/s)', min: 0.5, max: 40, log: true, value: P.U, fmt: (v) => fmt(v, 2), onInput: (v) => ((P.U = v), update()) });
  const tone = button(controls, { label: '♪ Play the tone (1 s)', kind: 'small', onClick: () => playTone() });

  const rRe = readout(readouts, { label: 'Re (air)' });
  const rSt = readout(readouts, { label: 'St' });
  const rF = readout(readouts, { label: 'shedding frequency' });

  let freq = NaN;
  let audio = null;

  function playTone() {
    if (!(freq >= 20 && freq <= 16000)) return;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    audio ??= new AC();
    const t0 = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.06, t0 + 0.05);
    gain.gain.setValueAtTime(0.06, t0 + 0.9);
    gain.gain.linearRampToValueAtTime(0, t0 + 1);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + 1.05);
  }
  signal?.addEventListener('abort', () => audio?.close?.());

  function update() {
    const Re = (P.U * P.D) / NU_AIR;
    const S = strouhalCylinder(Re);
    const st = S.st;
    freq = st > 0 ? (st * P.U) / P.D : NaN;

    plot.draw(
      fits.map((f) => ({ x: f.xs, y: f.ys, color: f.color, dash: f.dash, width: 2.4, label: f.F.name })),
      {
        under(ctx, tx, ty, area, pal) {
          ctx.fillStyle = pal.css('muted', 0.13);
          ctx.fillRect(area.x0, area.y0, tx(SHEDDING_ONSET_RE) - area.x0, area.y1 - area.y0);
          ctx.fillStyle = pal.css('muted');
          ctx.font = '11px "Atkinson Hyperlegible", system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('no shedding', area.x0 + 4, area.y0 + 4);
        },
        extra(ctx, tx, ty, area, pal) {
          if (Re < RE_MIN || Re > RE_MAX) return;
          ctx.strokeStyle = pal.css('accent');
          ctx.lineWidth = 2;
          const x = tx(Re);
          if (Number.isFinite(st)) {
            ctx.fillStyle = pal.css('board');
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(x, ty(st), 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x, area.y0);
            ctx.lineTo(x, area.y1);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        },
      },
    );

    rRe.set(Re >= 1e4 ? sci(Re, 2) : fmt(Re, 3));
    rSt.set(Number.isFinite(st) ? (st === 0 ? '0 (steady)' : fmt(st, 3)) : 'no single value');
    rF.set(Number.isFinite(freq) ? `${fmt(freq, 3)} Hz` : '—');
    const audible = freq >= 20 && freq <= 16000;
    tone.disabled = !audible;
    const ext = S.extrapolated ? ' (just below the fit’s range: extrapolated)' : '';
    const pitch = Number.isFinite(freq) ? ` A ${fmt(P.D * 1e3, 2)} mm wire in a ${fmt(P.U, 2)} m/s wind sheds at about ${fmt(freq, 3)} Hz${ext}${audible ? '' : ', outside the range of hearing'}.` : '';
    status.textContent = `${REGIME_TEXT[S.regime]}${pitch}`;
  }

  update();
  return () => plot.destroy();
}
