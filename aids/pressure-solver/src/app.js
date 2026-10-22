// Wiring: the playback loop pulls trace events from the solver generator, stops
// at the chosen granularity, and redraws the board and panels once per frame.

import * as P from './physics.js';
import { PressureSolver, DEFAULTS, fmtDt, linearName } from './solver.js';
import { drain } from './linear.js';
import { SCENARIOS } from './scenarios.js';
import { Tracer, eventRank, ghostRuns } from './trace.js';
import { Board, FIELDS, readPalette, fieldData, gradientCss, activeBuffer, fmtPa, stencilRow } from './board.js';
import { drawNewton, drawLinear, drawTimeline } from './plots.js';
import { docFor } from './docs.js';

const $ = (id) => document.getElementById(id);
const EVENT_BUDGET = 200000; // events per frame, so fast-forward never freezes the page

const ui = {
  scenario: $('scenario'),
  blurb: $('blurb'),
  play: $('play'),
  step: $('step'),
  skip: $('skip'),
  reset: $('reset'),
  gran: $('gran'),
  speed: $('speed'),
  speedOut: $('speedOut'),
  field: $('field'),
  vel: $('vel'),
  vals: $('vals'),
  linear: $('linear'),
  ls: $('ls'),
  warm: $('warm'),
  ghosts: $('ghosts'),
};

const state = {
  solver: null,
  tracer: null,
  gen: null,
  playing: false,
  pending: 0, // stops still owed to a Step / Finish press
  pendingGran: 7,
  acc: 0,
  failed: null,
  intervals: [], // accepted intervals: {newton, attempt, dt}
  attempts: 0,
  pastNewton: [],
  ghost: { id: -1, runs: null },
  lastFrame: 0,
  dirty: true,
};

const board = new Board($('board'));
let pal = readPalette(document.documentElement);

// ---- persisted conveniences -------------------------------------------------
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('chalkboard.ps.' + k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('chalkboard.ps.' + k, JSON.stringify(v));
    } catch {}
  },
};

// ---- setup ------------------------------------------------------------------
for (const sc of SCENARIOS) ui.scenario.append(new Option(sc.name, sc.id));
for (const [k, v] of Object.entries(FIELDS)) ui.field.append(new Option(v, k));
const hashScenario = location.hash.slice(1);
ui.scenario.value = SCENARIOS.some((s) => s.id === hashScenario) ? hashScenario : store.get('scenario', 'hot');
ui.gran.value = String(store.get('gran', 7));
ui.speed.value = String(store.get('speed', 1.6));
ui.field.value = store.get('field', 'auto');

function labOptions() {
  return { linear: ui.linear.value, lineSearch: ui.ls.checked, warmStart: ui.warm.checked };
}

function start() {
  const sc = SCENARIOS.find((s) => s.id === ui.scenario.value) || SCENARIOS[0];
  ui.blurb.textContent = sc.blurb;
  const built = sc.build();
  const solver = new PressureSolver(built.ch, labOptions());
  if (built.settle) {
    // Solve the initial state once, headless, so the first visible interval
    // starts from a warm seed as it would mid-simulation.
    const opt = solver.opt;
    solver.opt = { ...DEFAULTS };
    drain(solver.settle());
    solver.opt = opt;
  }
  built.afterPrelude?.(built.ch);
  solver.x.newtonHistory = [];
  solver.x.linearRuns = [];
  state.solver = solver;
  state.tracer = new Tracer(built.ch.n);
  state.gen = run(solver);
  state.pending = 0;
  state.acc = 0;
  state.failed = null;
  state.intervals = [];
  state.attempts = 0;
  state.pastNewton = [];
  state.ghost = { id: -1, runs: null };
  board.setChamber(built.ch);
  board.selected = -1;
  setPlaying(false);
  state.dirty = true;
}

function* run(solver) {
  for (;;) yield* solver.interval();
}

// ---- stepping -----------------------------------------------------------------
// Pull events until `stops` events at rank ≤ gran have been seen, or the
// frame's budget runs out. Returns the number of stops reached.
function advance(stops, gran) {
  const { tracer } = state;
  const now = performance.now();
  let done = 0;
  for (let used = 0; done < stops && used < EVENT_BUDGET; used++) {
    let r;
    try {
      r = state.gen.next();
    } catch (err) {
      fail(err);
      return done;
    }
    const e = r.value;
    tracer.push(e);
    if (e.t === 'op') {
      board.record(e, now);
      if (e.op === 'accept') {
        state.intervals.push({ newton: state.solver.x.newton, attempt: state.attempts + 1, dt: state.solver.x.dt });
        state.attempts = 0;
        pushPast();
      } else if (e.op === 'reject') {
        state.attempts++;
        pushPast();
      }
    }
    if (eventRank(e) <= gran) done++;
  }
  state.dirty = true;
  return done;
}

function pushPast() {
  state.pastNewton.unshift(state.solver.x.newtonHistory.slice());
  state.pastNewton.length = Math.min(state.pastNewton.length, 4);
}

function fail(err) {
  state.failed = err.message || String(err);
  setPlaying(false);
  state.pending = 0;
  state.dirty = true;
}

function setPlaying(on) {
  state.playing = on && !state.failed;
  ui.play.textContent = state.playing ? '❚❚ Pause' : '▶ Play';
  ui.play.setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
  state.acc = 0;
}

const rate = () => Math.pow(10, Number(ui.speed.value));
function showSpeed() {
  const r = rate();
  ui.speedOut.textContent = `${r >= 100 ? Math.round(r).toLocaleString() : r >= 10 ? r.toFixed(0) : r.toFixed(1)}/s`;
}

function frame(t) {
  const dtf = state.lastFrame ? Math.min(0.1, (t - state.lastFrame) / 1000) : 0;
  state.lastFrame = t;
  if (!state.failed) {
    if (state.pending > 0) {
      state.pending -= advance(state.pending, state.pendingGran);
    } else if (state.playing) {
      state.acc += dtf * rate();
      const want = Math.floor(state.acc);
      if (want > 0) {
        const got = advance(want, Number(ui.gran.value));
        state.acc = got < want ? 0 : state.acc - got; // never build a backlog
      }
    }
  }
  render(t);
  requestAnimationFrame(frame);
}

// ---- rendering ----------------------------------------------------------------
const textCache = new Map();
function setText(el, text) {
  if (textCache.get(el) !== text) {
    textCache.set(el, text);
    el.textContent = text;
  }
}

function render(now) {
  const { solver, tracer } = state;
  board.resize();
  const fd = fieldData(solver, tracer, ui.field.value);
  const tau = Math.min(1500, Math.max(120, 2000 / rate()));
  board.draw(solver, tracer, fd, pal, { velocities: ui.vel.checked, values: ui.vals?.checked, now, trailTau: tau });
  if (!state.dirty && !resized) return;
  state.dirty = false;
  resized = false;

  // Legend.
  const kind = fd.kind === 'reslog' || fd.kind === 'div' ? 'div' : 'seq';
  if (fd.kind === 'material') {
    $('legendBar').style.background = `linear-gradient(90deg, rgb(${pal.liquid}) 0 33%, rgb(${pal['gas-air']}) 33% 66%, rgb(${pal['gas-vapour']}) 66%)`;
  } else $('legendBar').style.background = gradientCss(pal, kind);
  setText($('legLo'), fd.labels[0]);
  setText($('legMid'), fd.labels[1]);
  setText($('legHi'), fd.labels[2]);
  setText($('legName'), ui.field.value === 'auto' ? `${fd.name} · chosen for this step` : fd.name);

  renderCrumbs();
  renderNotes();
  renderInspector(fd);
  renderStatus();
  renderPlots();
}

function cellName(i, w) {
  return `(${i % w}, ${(i / w) | 0})`;
}

function renderCrumbs() {
  const { tracer, solver } = state;
  const ol = $('crumbs');
  const items = tracer.stack.map((s) => s.label);
  const op = tracer.op;
  if (op && op.cell >= 0) {
    const lvl = op.level ?? 0;
    const w = lvl === 0 ? solver.ch.w : solver.x.levels?.[lvl]?.A.w || 1;
    items.push(lvl ? `block ${cellName(op.cell, w)}` : op.face ? `face ${faceName(op.face, solver.ch.w)}` : `cell ${cellName(op.cell, w)}`);
  }
  if (!items.length) items.push(state.tracer.events ? 'Between intervals' : 'Ready: press Play or Step');
  const key = items.join('|');
  if (textCache.get(ol) === key) return;
  textCache.set(ol, key);
  ol.replaceChildren(...items.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
}

function faceName(f, w) {
  const a = cellName(f.a, w);
  return f.dir === 'top' ? `${a} top` : `${a}–${cellName(f.b, w)}`;
}

function renderNotes() {
  const { tracer, solver } = state;
  const mathEl = $('opMath');
  if (state.failed) {
    setText($('docTitle'), 'The simulation stopped');
    setText($('docText'), `${state.failed}. Reset to try again, or change the solver lab settings.`);
    $('code').replaceChildren();
    $('opNote').hidden = true;
    if (mathEl) mathEl.hidden = true;
    return;
  }
  const doc = docFor(tracer, solver.opt.linear);
  setText($('docTitle'), doc.title);
  setText($('docText'), doc.text);
  const line = doc.line(tracer);
  const code = $('code');
  const key = doc.title + '|' + line;
  if (textCache.get(code) !== key) {
    textCache.set(code, key);
    code.replaceChildren(
      ...doc.code.map((l, k) => {
        const li = document.createElement('li');
        li.textContent = l;
        if (k === line) li.className = 'on';
        return li;
      }),
    );
  }
  const note = $('opNote');
  const label = tracer.op?.label;
  note.hidden = !label;
  if (label) setText(note, label);
  if (mathEl) {
    const math = opMathFor(solver, tracer);
    mathEl.hidden = !math;
    if (math) setText(mathEl, math);
  }
}

function opMathFor(solver, tracer) {
  const op = tracer.op;
  if (!op || op.cell < 0) return '';
  const { ch, x } = solver;
  const i = op.cell;
  const buf = activeBuffer(solver, tracer);
  switch (op.op) {
    case 'source': {
      const ml = ch.water[i] - buf.mv[i];
      return (
        `cell ${cellName(i, ch.w)} · p = ${fmtPa((buf.p[i] - P.P_ATM) * P.PA_PER_UNIT)} gauge (${((buf.p[i] * P.PA_PER_UNIT) / 101325).toFixed(4)} atm)\n` +
        `T = ${buf.T[i].toFixed(2)} K · m_liq = ${fmt(ml)} mg · m_vap = ${fmt(buf.mv[i])} mg · m_air = ${fmt(ch.ma[i])} mg\n` +
        `O_i = m_liq/ρ + V_gas = ${fmt(ml / P.RHO)} + ${fmt(buf.Vg[i])} = ${fmt(buf.O[i])} cells   (dO/dp = ${fmt(buf.slope[i])})`
      );
    }
    case 'face': {
      const f = op.face;
      if (!f) return '';
      if (f.dir === 'top') {
        const c = (x.dt * 2) / ch.inertia(i);
        const dp = buf.p[i] - P.P_ATM;
        return `top face ${cellName(i, ch.w)} · Δp = p_i − p_atm = ${fmt(dp)}\nv_top = v0 + dt·g − c·Δp = ${fmt(buf.top[i])} cells/tick`;
      }
      const j = f.b;
      const c = (x.dt * 2) / (ch.inertia(i) + ch.inertia(j));
      const dp = buf.p[j] - buf.p[i];
      if (f.dir === 'x') {
        return `face ${cellName(i, ch.w)}→${cellName(j, ch.w)} · Δp = p_b − p_a = ${fmt(dp)}\nu = u0 − c·Δp = ${fmt(x.u0[i])} − ${fmt(c)}·(${fmt(dp)}) = ${fmt(buf.u[i])}`;
      }
      return `face ${cellName(i, ch.w)}→${cellName(j, ch.w)} · Δp = p_b − p_a = ${fmt(dp)}\nv = v0 + dt·g − c·Δp = ${fmt(buf.v[i])}`;
    }
    case 'residual': {
      const xx = i % ch.w,
        y = (i / ch.w) | 0;
      const div = buf.u[i] - (xx > 0 ? buf.u[i - 1] : 0) + buf.v[i] - (y > 0 ? buf.v[i - ch.w] : buf.top[xx]);
      return `cell ${cellName(i, ch.w)} · div = ${fmt(div)}   dt·div = ${fmt(x.dt * div)}\nR_i = O_i − 1 − dt·div = ${fmt(buf.O[i])} − 1 − (${fmt(x.dt * div)}) = ${fmt(buf.R[i])}`;
    }
    case 'jrow': {
      const s = stencilRow(x.J, i);
      const faceSum = s.up + s.left + s.right + s.down;
      return `cell ${cellName(i, ch.w)} · dO/dp = ${fmt(x.slope[i])} · Σ J_ij = ${fmt(faceSum)}\nJ_ii = ${fmt(s.center)}   [U ${fmt(s.up)}, L ${fmt(s.left)}, R ${fmt(s.right)}, D ${fmt(s.down)}]`;
    }
    case 'jacobi': {
      const lvl = op.level ?? 0;
      const L = x.levels?.[lvl];
      const w = L ? L.A.w : ch.w;
      const diag = L ? L.A.diag(i) : x.J.diag(i);
      return `${lvl ? 'block' : 'cell'} ${cellName(i, w)} (level ${lvl}) · diag = ${fmt(diag)} → z_new = ${fmt(op.value)}`;
    }
    case 'mic-factor':
      return `cell ${cellName(i, ch.w)} · −J_ii = ${fmt(-x.J.diag(i))} → L_ii⁻¹ = ${fmt(op.value)}`;
    case 'pc-fwd':
      return `cell ${cellName(i, ch.w)} · forward sweep q_i = ${fmt(op.value)}   (${op.reads.length} predecessor${op.reads.length === 1 ? '' : 's'})`;
    case 'pc-bwd':
      return `cell ${cellName(i, ch.w)} · backward sweep z_i = ${fmt(op.value)}   (${op.reads.length} successor${op.reads.length === 1 ? '' : 's'})`;
    case 'heat':
      return `cell ${cellName(i, ch.w)} · ΔH = ${fmt(op.value)} µJ → H = ${fmt(x.H[i])} µJ`;
    default:
      return '';
  }
}

function fmt(v, digits = 3) {
  if (!isFinite(v)) return '—';
  if (v === 0) return '0';
  const a = Math.abs(v);
  return a >= 1e-2 && a < 1e5 ? v.toPrecision(digits) : v.toExponential(digits - 1);
}

function renderInspector(fd) {
  const { solver, tracer } = state;
  const { ch, x } = solver;
  const op = tracer.op;
  const dl = $('inspVals');
  const rows = [];
  let A = null,
    row = -1,
    cap = '';
  // Follow the solver unless a cell is pinned; at a coarse level show the block.
  const coarse = board.selected < 0 && op && op.cell >= 0 && (op.level ?? 0) > 0 && x.levels;
  if (coarse) {
    const L = x.levels[op.level];
    A = L.A;
    row = op.cell;
    setText($('inspWhere'), `· level ${op.level} block ${cellName(row, L.A.w)} (${L.A.w}×${L.A.h} grid)`);
    rows.push(['rhs', fmt(L.rhs[row])], ['z', fmt(L.z[row])], ['r', fmt(L.r[row])]);
    cap = `Row ${row} of the level-${op.level} matrix (summed from the fine rows of its block)`;
  } else {
    let i = board.selected >= 0 ? board.selected : op && op.cell >= 0 && !(op.level > 0) ? op.cell : (op?.face?.a ?? state.lastCell ?? -1);
    if (i < 0) i = Math.floor(ch.h / 2) * ch.w + Math.floor(ch.w / 2);
    state.lastCell = i;
    const buf = activeBuffer(solver, tracer);
    setText($('inspWhere'), `· ${cellName(i, ch.w)}${board.selected >= 0 ? ' · pinned' : ''}`);
    if (!ch.fluid[i]) {
      rows.push(['solid', isFinite(ch.heldT[i]) ? `wall held at ${ch.heldT[i]} K` : 'wall']);
      cap = 'Jacobian row: a solid is an unused coordinate, so its row is just −1';
    } else {
      const ml = ch.water[i] - buf.mv[i];
      rows.push(
        ['pressure', `${fmtPa((buf.p[i] - P.P_ATM) * P.PA_PER_UNIT)} gauge · ${((buf.p[i] * P.PA_PER_UNIT) / 101325).toFixed(5)} atm`],
        ['residual R', `${fmt(buf.R[i])} cell volumes`],
        ['correction δ', fmtPa(x.delta[i] * P.PA_PER_UNIT)],
        ['temperature', `${buf.T[i].toFixed(3)} K`],
        ['liquid', `${fmt(ml)} mg (${((100 * ml) / P.RHO).toFixed(1)}% of a full cell)`],
        ['vapour', `${fmt(buf.mv[i])} mg`],
        ['air', `${fmt(ch.ma[i])} mg`],
        ['gas volume', `${fmt(buf.Vg[i])} cells`],
        ['dO/dp', `${fmt(x.slope[i])} cells per unit p`],
      );
      cap = 'Jacobian row: how R here moves when each stencil pressure moves';
    }
    A = x.J;
    row = i;
  }
  const key = rows.map((r) => r.join(':')).join('|');
  if (textCache.get(dl) !== key) {
    textCache.set(dl, key);
    dl.replaceChildren(
      ...rows.flatMap(([k, v]) => [Object.assign(document.createElement('dt'), { textContent: k }), Object.assign(document.createElement('dd'), { textContent: v })]),
    );
  }
  setText($('stencilCap'), cap);
  const s = stencilRow(A, row);
  const cells = [null, ['up', s.up], null, ['left', s.left], ['centre', s.center], ['right', s.right], null, ['down', s.down], null];
  const st = $('stencil');
  const skey = cells.map((c) => (c ? fmt(c[1]) : '')).join('|');
  if (textCache.get(st) !== skey) {
    textCache.set(st, skey);
    st.replaceChildren(
      ...cells.map((c, k) => {
        const d = document.createElement('div');
        if (!c) d.className = 'blank';
        else {
          d.className = (k === 4 ? 'c' : '') + (c[1] === 0 ? ' zero' : '');
          d.textContent = fmt(c[1]);
          d.title = c[0];
        }
        return d;
      }),
    );
  }
}

function renderStatus() {
  const { solver } = state;
  const { ch, x } = solver;
  const ms = (ch.time / 60) * 1000;
  const parts = [`t = ${ms.toFixed(3)} ms`, `interval ${ch.interval}`, `dt ${fmtDt(x.dt || ch.dt)}`];
  if (state.attempts) parts.push(`attempt ${state.attempts + 1}`);
  let line = parts.join(' · ');
  if (x.status) line += ` — ${x.status}`;
  setText($('statusLine'), line);
  drawTimeline($('timeline'), pal, state.intervals);
}

function renderPlots() {
  const { solver, tracer } = state;
  const { x, opt } = solver;
  drawNewton($('newtonPlot'), pal, x.newtonHistory, state.pastNewton, opt.tol);
  // Ghost runs are computed lazily, at most once per linear solve, and only
  // while J and b still describe that solve.
  let ghosts = null;
  if (ui.ghosts.checked && tracer.linearPoints) {
    if (state.ghost.id !== tracer.linearId && (tracer.stage === 'linear' || tracer.stage === 'linesearch')) {
      state.ghost = { id: tracer.linearId, runs: ghostRuns(x.J, Float64Array.from(x.rhs), opt.eta) };
    }
    if (state.ghost.id === tracer.linearId) ghosts = state.ghost.runs;
  }
  const summary = drawLinear($('linearPlot'), pal, tracer.linearPoints, solver.opt.linear, ghosts, opt.eta);
  const leg = $('linearLegend');
  const key = summary.map((s) => s.text).join('|');
  if (textCache.get(leg) !== key) {
    textCache.set(leg, key);
    leg.replaceChildren(
      ...summary.map((s) => {
        const li = document.createElement('li');
        li.className = s.live ? 'live' : '';
        li.textContent = s.text + (s.live ? ' (running now)' : '');
        return li;
      }),
    );
  }
}

// ---- events ---------------------------------------------------------------------
ui.play.addEventListener('click', () => {
  state.pending = 0;
  setPlaying(!state.playing);
});
ui.step.addEventListener('click', () => {
  setPlaying(false);
  state.pendingGran = Number(ui.gran.value);
  state.pending = 1;
});
ui.skip.addEventListener('click', () => {
  setPlaying(false);
  state.pendingGran = 0;
  state.pending = 1;
});
ui.reset.addEventListener('click', start);
ui.scenario.addEventListener('change', () => {
  store.set('scenario', ui.scenario.value);
  start();
});
ui.gran.addEventListener('change', () => store.set('gran', Number(ui.gran.value)));
ui.speed.addEventListener('input', () => {
  store.set('speed', Number(ui.speed.value));
  showSpeed();
});
ui.field.addEventListener('change', () => {
  store.set('field', ui.field.value);
  state.dirty = true;
});
ui.vel.addEventListener('change', () => (state.dirty = true));
ui.vals?.addEventListener('change', () => (state.dirty = true));
for (const el of [ui.linear, ui.ls, ui.warm]) {
  el.addEventListener('change', () => {
    Object.assign(state.solver.opt, labOptions());
    state.dirty = true;
  });
}
ui.ghosts.addEventListener('change', () => (state.dirty = true));
$('board').addEventListener('click', (ev) => {
  const i = board.cellAt(ev.clientX, ev.clientY, state.solver.ch);
  board.selected = i === board.selected ? -1 : i;
  state.dirty = true;
});
document.addEventListener('keydown', (ev) => {
  if (ev.target.closest('select, input')) return;
  if (ev.key === ' ') {
    ev.preventDefault();
    ui.play.click();
  } else if (ev.key === 'ArrowRight' || ev.key === 'n') {
    ev.preventDefault();
    ui.step.click();
  }
});

let resized = true;
new ResizeObserver(() => (resized = true)).observe(document.body);
const repaint = () => {
  pal = readPalette(document.documentElement);
  resized = true;
};
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint);
new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
document.fonts?.ready.then(repaint);

showSpeed();
start();
requestAnimationFrame(frame);

// For the screenshot tool and tests.
window.__chalkboard = { state, advance, start, linearName };
