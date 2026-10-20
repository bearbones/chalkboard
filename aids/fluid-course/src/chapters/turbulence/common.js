// Helpers shared by the turbulence chapter's widgets: presets, number
// formatting, text labels on plots and a time budget for stepping loops.
// Nothing here allocates per frame.

// The author's preset for a figure, merged over the widget's defaults.
export function presetFor(fig, presets) {
  const key = fig.dataset.preset;
  return { id: key && presets[key] ? key : 'default', ...presets.default, ...(key && presets[key] ? presets[key] : {}) };
}

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).replace(/[-0-9]/g, (c) => SUP[c]);

// `digits` significant figures, a true minus sign, × 10ⁿ outside [1e-3, 1e5).
export function num(v, digits = 3) {
  if (v == null || Number.isNaN(v)) return '–';
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  if (v === 0) return '0';
  const a = Math.abs(v);
  let s;
  if (a >= 1e5 || a < 1e-3) {
    let e = Math.floor(Math.log10(a));
    let m = Number((a / 10 ** e).toFixed(digits - 1));
    if (m >= 10) {
      m /= 10;
      e += 1;
    }
    s = m === 1 ? `10${sup(e)}` : `${m} × 10${sup(e)}`;
  } else s = String(Number(a.toPrecision(digits)));
  return (v < 0 ? '−' : '') + s;
}

// A power of ten as 10ⁿ (n rounded).
export const pow10 = (v) => `10${sup(Math.round(Math.log10(v)))}`;

// Percentage with a sensible number of digits: 80.0 %, 2.3 %, 0.026 %.
export function pct(f) {
  if (!Number.isFinite(f)) return '–';
  const p = 100 * f;
  if (p >= 10) return `${p.toFixed(1)} %`;
  if (p >= 0.1) return `${p.toFixed(2)} %`;
  return `${num(p, 2)} %`;
}

// Seconds as a readable duration: 1.3 s, 2.0 h, 1,850 years, 7.5 × 10⁸ years.
export function duration(sec) {
  if (!Number.isFinite(sec)) return '–';
  if (sec < 1e-3) return `${num(sec * 1e6, 2)} µs`;
  if (sec < 1) return `${num(sec * 1e3, 2)} ms`;
  if (sec < 120) return `${num(sec, 2)} s`;
  if (sec < 7200) return `${num(sec / 60, 2)} min`;
  if (sec < 2 * 86400) return `${num(sec / 3600, 2)} h`;
  const days = sec / 86400;
  if (days < 730) return `${num(days, 2)} days`;
  const years = sec / 3.156e7;
  return years < 1e5 ? `${Math.round(years).toLocaleString('en-GB')} years` : `${num(years, 2)} years`;
}

// Text on a plot canvas, in the kit's font, in a token colour.
export function label(ctx, pal, text, x, y, { color = 'muted', align = 'left', base = 'bottom', size = 12 } = {}) {
  ctx.font = `${size}px "Atkinson Hyperlegible", system-ui, sans-serif`;
  ctx.fillStyle = pal.css(color);
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillText(text, x, y);
}

// A vertical marker across a plot area at data x, with an optional label.
export function vmark(ctx, tx, area, pal, x, text, { color = 'muted', dash = [4, 4], alpha = 0.9, align = 'left', top = true } = {}) {
  const px = Math.round(tx(x)) + 0.5;
  if (!(px >= area.x0 - 1 && px <= area.x1 + 1)) return;
  ctx.save();
  ctx.strokeStyle = pal.css(color, alpha);
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(px, area.y0);
  ctx.lineTo(px, area.y1);
  ctx.stroke();
  ctx.restore();
  if (text) label(ctx, pal, text, align === 'left' ? px + 4 : px - 4, top ? area.y0 + 4 : area.y1 - 4, { color, align, base: top ? 'top' : 'bottom' });
}

// Milliseconds now (performance.now when available).
export const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// The reader's motion preference: a changed setting restarts a run only when
// motion is welcome; otherwise the Run button starts it.
export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
