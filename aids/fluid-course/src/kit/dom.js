// Tiny DOM helpers. h('div.card#id', {onclick, style:{…}, dataset:{…}}, …children)

export function h(spec, props, ...children) {
  const m = /^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i.exec(spec);
  if (!m) throw new Error(`bad element spec ${spec}`);
  const el = document.createElement(m[1] || 'div');
  for (const part of m[2].match(/[.#][\w-]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1));
    else el.id = part.slice(1);
  }
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
    children.unshift(props);
    props = null;
  }
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Number formatting shared by readouts and axes.
export function fmt(v, digits = 3) {
  if (v == null || Number.isNaN(v)) return '–';
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) return sci(v, Math.max(1, digits - 1));
  const s = Number(v.toPrecision(digits));
  return (s < 0 ? '−' : '') + Math.abs(s).toLocaleString('en-US', { maximumFractionDigits: 6 });
}

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
export const superscript = (n) => String(n).replace(/[-0-9]/g, (c) => SUP[c]);

// 1.2 × 10⁻³
export function sci(v, digits = 2) {
  if (v === 0) return '0';
  let e = Math.floor(Math.log10(Math.abs(v)));
  let ms = Number((v / 10 ** e).toFixed(digits - 1));
  // 9.96 rounds to 10.0: carry into the exponent.
  if (Math.abs(ms) >= 10) {
    e += 1;
    ms = Number((v / 10 ** e).toFixed(digits - 1));
  }
  const sign = ms < 0 ? '−' : '';
  // Only an exact power of ten drops its mantissa; 1.04e-5 keeps "1.0 ×".
  if (Math.abs(Math.abs(v) / 10 ** e - 1) < 1e-12) return e === 0 ? `${sign}1` : `${sign}10${superscript(e)}`;
  const mant = Math.abs(ms) === 1 && digits > 1 ? (1).toFixed(digits - 1) : Math.abs(ms);
  return `${sign}${mant} × 10${superscript(e)}`;
}
