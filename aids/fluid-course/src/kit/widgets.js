// Widget building blocks: figure scaffolding, controls, a DPR-aware canvas,
// and an animation loop that only runs while its figure is on screen.
//
// A widget is a function mount(fig, ctx) → optional cleanup, registered in a
// chapter's `widgets` map and placed in its HTML as
//   <figure data-widget="name" data-preset="…"></figure>
// See AUTHORING.md for the full contract.

import { h, fmt } from './dom.js';
import { onThemeChange } from './palette.js';

// ---- figure scaffold ----------------------------------------------------------
// Builds the standard parts inside a <figure>. An author-written <figcaption>
// is kept and moved to the end.
export function frame(fig, { title, wide = false, tall = false } = {}) {
  const authored = fig.querySelector(':scope > figcaption');
  fig.classList.add('widget');
  if (wide) fig.classList.add('wide');
  if (tall) fig.classList.add('tall');
  const head = title ? h('div.fig-title', title) : null;
  const stage = h('div.fig-stage');
  const controls = h('div.fig-controls');
  const readouts = h('dl.fig-readouts');
  const status = h('p.fig-status', { role: 'status', 'aria-live': 'polite' });
  fig.replaceChildren(...[head, stage, controls, readouts, status, authored].filter(Boolean));
  return { fig, head, stage, controls, readouts, status };
}

let uid = 0;
const nextId = (p) => `${p}-${++uid}`;

// ---- controls -------------------------------------------------------------------
// Each control returns { el, value, set(v, {silent}) }.

export function slider(parent, { label, min, max, step = 'any', value, log = false, fmt: f = (v) => fmt(v), onInput, id, wide }) {
  const inputId = id || nextId('sl');
  const toPos = (v) => (log ? Math.log10(v) : v);
  const fromPos = (p) => (log ? 10 ** p : p);
  const input = h('input', { type: 'range', id: inputId, min: toPos(min), max: toPos(max), step: log ? 'any' : step, value: toPos(value) });
  const out = h('output', { for: inputId });
  const el = h('label.ctl.slider', { for: inputId, class: wide ? 'wide' : null }, h('span.ctl-label', label, ' ', out), input);
  const api = {
    el,
    input,
    get value() {
      return fromPos(Number(input.value));
    },
    set(v, { silent = false } = {}) {
      input.value = String(toPos(v));
      out.textContent = f(api.value);
      if (!silent) onInput?.(api.value);
    },
  };
  input.addEventListener('input', () => {
    out.textContent = f(api.value);
    onInput?.(api.value);
  });
  out.textContent = f(value);
  parent?.append(el);
  return api;
}

export function select(parent, { label, options, value, onChange, id }) {
  const selId = id || nextId('sel');
  const sel = h('select', { id: selId });
  for (const o of options) {
    const [v, text] = Array.isArray(o) ? o : [o, o];
    sel.append(new Option(text, v));
  }
  if (value !== undefined) sel.value = value;
  const el = h('label.ctl.select', { for: selId }, h('span.ctl-label', label), sel);
  const api = {
    el,
    input: sel,
    get value() {
      return sel.value;
    },
    set(v, { silent = false } = {}) {
      sel.value = v;
      if (!silent) onChange?.(sel.value);
    },
  };
  sel.addEventListener('change', () => onChange?.(sel.value));
  parent?.append(el);
  return api;
}

export function toggle(parent, { label, checked = false, onChange, id }) {
  const inputId = id || nextId('tg');
  const input = h('input', { type: 'checkbox', id: inputId, checked });
  const el = h('label.ctl.toggle', { for: inputId }, input, h('span', label));
  const api = {
    el,
    input,
    get value() {
      return input.checked;
    },
    set(v, { silent = false } = {}) {
      input.checked = !!v;
      if (!silent) onChange?.(input.checked);
    },
  };
  input.addEventListener('change', () => onChange?.(input.checked));
  parent?.append(el);
  return api;
}

// A row of mutually exclusive buttons (radio semantics).
export function segmented(parent, { label, options, value, onChange }) {
  const group = h('div.seg', { role: 'radiogroup', 'aria-label': label || 'options' });
  const buttons = [];
  let current = value;
  for (const o of options) {
    const [v, text] = Array.isArray(o) ? o : [o, o];
    const b = h('button.seg-btn', { type: 'button', role: 'radio', 'aria-checked': String(v === value), dataset: { v } }, text);
    b.addEventListener('click', () => api.set(v));
    buttons.push(b);
    group.append(b);
  }
  const el = label ? h('div.ctl.segmented', h('span.ctl-label', label), group) : h('div.ctl.segmented', group);
  const api = {
    el,
    get value() {
      return current;
    },
    set(v, { silent = false } = {}) {
      current = v;
      for (const b of buttons) b.setAttribute('aria-checked', String(b.dataset.v === String(v)));
      if (!silent) onChange?.(v);
    },
  };
  parent?.append(el);
  return api;
}

export function button(parent, { label, onClick, kind = '', title }) {
  const el = h('button.btn', { type: 'button', title, class: kind || null }, label);
  el.addEventListener('click', (e) => onClick?.(e));
  parent?.append(el);
  return el;
}

// A labelled value in the figure's readout list.
export function readout(parent, { label, fmt: f = (v) => fmt(v), title }) {
  const dt = h('dt', { title }, label);
  const dd = h('dd', '–');
  parent?.append(dt, dd);
  return {
    el: dd,
    set(v, cls) {
      const s = typeof v === 'string' ? v : f(v);
      if (dd.textContent !== s) dd.textContent = s;
      dd.className = cls || '';
    },
  };
}

// Play/pause button bound to an animate() loop.
export function playButton(parent, loop, { label = 'Play' } = {}) {
  const el = h('button.btn.primary.play', { type: 'button' });
  const sync = () => {
    el.textContent = loop.playing ? '❚❚ Pause' : `▶ ${label}`;
    el.setAttribute('aria-pressed', String(loop.playing));
  };
  el.addEventListener('click', () => loop.toggle());
  loop.onChange(sync);
  sync();
  parent?.append(el);
  return el;
}

// ---- canvas ----------------------------------------------------------------------
// A canvas that tracks its CSS size and device pixel ratio. Drawing code works
// in CSS pixels: ctx is pre-scaled. onResize(fn) also fires on theme changes,
// so a widget's single redraw function covers both.
export function canvasBox(parent, { aspect = 16 / 9, height, minHeight = 150, maxHeight = 560, label, cls } = {}) {
  const canvas = h('canvas', { role: 'img', 'aria-label': label || 'figure' });
  const wrap = h('div.canvas-wrap', { class: cls || null }, canvas);
  parent.append(wrap);
  const ctx = canvas.getContext('2d');
  const box = { canvas, wrap, ctx, width: 0, height: 0, dpr: 1 };
  const fns = new Set();
  const layout = () => {
    const w = wrap.clientWidth || parent.clientWidth || 320;
    const hgt = height ?? Math.max(minHeight, Math.min(maxHeight, w / aspect));
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (w === box.width && hgt === box.height && dpr === box.dpr) return false;
    box.width = w;
    box.height = hgt;
    box.dpr = dpr;
    canvas.style.height = `${hgt}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hgt * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  };
  layout();
  const fire = () => {
    for (const fn of fns) fn(box);
  };
  const ro = new ResizeObserver(() => {
    if (layout()) fire();
  });
  ro.observe(wrap);
  const offTheme = onThemeChange(fire);
  box.onResize = (fn) => (fns.add(fn), () => fns.delete(fn));
  // Pointer position in CSS pixels relative to the canvas.
  box.pointer = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  box.clear = (color) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };
  box.destroy = () => {
    ro.disconnect();
    offTheme();
  };
  return box;
}

// ---- animation ----------------------------------------------------------------
// tick(dt, now) runs each frame while playing AND the element is on screen AND
// the tab is visible. dt is in seconds, capped at 0.1. With prefers-reduced-
// motion the loop does not autoplay; the reader presses Play.
const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function animate(el, tick, { autoplay = true, signal } = {}) {
  let playing = false,
    visible = false,
    raf = 0,
    last = 0;
  const subs = new Set();
  const frameFn = (now) => {
    raf = 0;
    if (!playing || !visible || document.hidden) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    try {
      tick(dt, now);
    } catch (err) {
      console.error(err);
      api.pause();
      return;
    }
    schedule();
  };
  const schedule = () => {
    if (!raf && playing && visible && !document.hidden) raf = requestAnimationFrame(frameFn);
  };
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    last = 0;
    schedule();
  });
  io.observe(el);
  const onVis = () => {
    last = 0;
    schedule();
  };
  document.addEventListener('visibilitychange', onVis);
  const api = {
    get playing() {
      return playing;
    },
    play() {
      if (playing) return;
      playing = true;
      last = 0;
      schedule();
      subs.forEach((f) => f(true));
    },
    pause() {
      if (!playing) return;
      playing = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      subs.forEach((f) => f(false));
    },
    toggle() {
      playing ? api.pause() : api.play();
    },
    onChange(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    destroy() {
      api.pause();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    },
  };
  signal?.addEventListener('abort', () => api.destroy());
  if (autoplay && !reducedMotion()) api.play();
  return api;
}

// Run `work()` in slices across frames so a long computation never freezes the
// page. work is a generator; each yield is a chance to pause. Resolves with its
// return value; rejects with 'aborted' if the signal fires.
export function sliced(gen, { budgetMs = 8, signal } = {}) {
  return new Promise((resolve, reject) => {
    const step = () => {
      if (signal?.aborted) return reject(new Error('aborted'));
      const t0 = performance.now();
      try {
        for (;;) {
          const r = gen.next();
          if (r.done) return resolve(r.value);
          if (performance.now() - t0 > budgetMs) break;
        }
      } catch (err) {
        return reject(err);
      }
      requestAnimationFrame(step);
    };
    step();
  });
}
