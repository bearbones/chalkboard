// Colours for canvas drawing, read from the CSS tokens in style.css so both
// themes work (light = whiteboard and markers, dark = slate and chalk).
// Never hard-code a colour in a widget: name a token.

export const TOKENS = [
  'bg', 'surface', 'board', 'ink', 'muted', 'line', 'grid', 'write', 'read', 'accent',
  's1', 's2', 's3', 's4', 's5', 'good', 'bad',
  'seq-0', 'seq-1', 'seq-2', 'div-neg', 'div-mid', 'div-pos',
  'liquid', 'solid', 'dye', 'particle',
];

let cache = null;
const subscribers = new Set();

function hexRgb(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) {
    const r = /rgba?\(([^)]+)\)/.exec(h);
    if (r) return r[1].split(',').slice(0, 3).map((x) => Number(x));
    return [128, 128, 128];
  }
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

export function palette() {
  if (cache) return cache;
  const cs = getComputedStyle(document.documentElement);
  const rgb = {};
  for (const t of TOKENS) rgb[t] = hexRgb(cs.getPropertyValue('--' + t) || '#808080');
  const dark = cs.getPropertyValue('color-scheme').includes('dark');
  const pal = {
    rgb,
    dark,
    // CSS colour string for a token name (or 'sN' for series N), with alpha.
    css(name, alpha = 1) {
      const c = rgb[name] || rgb.ink;
      return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
    },
    series(k) {
      return `s${(k % 5) + 1}`;
    },
    // Sequential: one hue from the board colour (zero) to full ink (max).
    seq(t) {
      t = clamp01(t);
      return t < 0.5 ? lerp(rgb['seq-0'], rgb['seq-1'], t * 2) : lerp(rgb['seq-1'], rgb['seq-2'], t * 2 - 1);
    },
    // Diverging: t in [-1, 1]; neutral at 0.
    div(t) {
      return t < 0 ? lerp(rgb['div-mid'], rgb['div-neg'], clamp01(-t)) : lerp(rgb['div-mid'], rgb['div-pos'], clamp01(t));
    },
  };
  // 256-entry RGBA lookup tables for fast field drawing.
  pal.lut = {};
  for (const kind of ['seq', 'div']) {
    const lut = new Uint8ClampedArray(256 * 4);
    for (let k = 0; k < 256; k++) {
      const c = kind === 'seq' ? pal.seq(k / 255) : pal.div((k / 255) * 2 - 1);
      lut.set([c[0], c[1], c[2], 255], k * 4);
    }
    pal.lut[kind] = lut;
  }
  cache = pal;
  return pal;
}

// CSS gradient for a legend bar.
export function gradientCss(kind) {
  const pal = palette();
  const stops = [];
  for (let k = 0; k <= 8; k++) {
    const c = kind === 'div' ? pal.div((k / 8) * 2 - 1) : pal.seq(k / 8);
    stops.push(`rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

// Call fn() whenever the theme (OS setting or data-theme toggle) changes.
export function onThemeChange(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function themeChanged() {
  cache = null;
  for (const fn of subscribers) {
    try {
      fn();
    } catch (err) {
      console.error(err);
    }
  }
}

if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', themeChanged);
  new MutationObserver(themeChanged).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
