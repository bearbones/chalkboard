// notation-timeline: the symbols of src/reference/notation-data.js on one
// time axis, one lane per family. Tap a dot (or step with the buttons or the
// arrow keys) to read its record; each links to its tile in the symbols atlas.
// Records with no established date are counted but not plotted.

import { h } from '../../kit/dom.js';
import { frame, select, toggle, button, readout, canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { tex } from '../../kit/math.js';
import { NOTATION, GROUPS } from '../../reference/notation-data.js';
import { parseYear } from '../../reference/people-data.js';

const Y0 = 1660;
const Y1 = 1990;
const LANES = Object.keys(GROUPS);
const R = 4.5; // dot radius, CSS px

const safeTex = (s) => {
  try {
    return tex(s);
  } catch {
    return '';
  }
};

export function mountTimeline(fig) {
  const f = frame(fig, { title: 'Three centuries of symbols', wide: true });
  const all = NOTATION.map((n) => ({ n, y: parseYear(n.year), lane: LANES.indexOf(n.group), mine: (n.chapters || []).includes('notation') }))
    .filter((it) => it.lane >= 0)
    .sort((a, b) => (a.y ?? 9999) - (b.y ?? 9999) || a.n.id.localeCompare(b.n.id));
  const dated = all.filter((it) => it.y != null);
  const N = dated.length;
  const px = new Float32Array(N);
  const py = new Float32Array(N);
  const tm = new Float32Array(LANES.length); // lane tops

  const box = canvasBox(f.stage, { height: 236, label: 'Timeline of mathematical symbols from 1660 to 1990, one lane per family. Use the Earlier and Later buttons or the arrow keys to step through them.' });
  box.canvas.tabIndex = 0;
  const card = h('div.nt-tl-card', { 'aria-live': 'polite' });
  f.stage.append(card);

  const rShown = readout(f.readouts, { label: 'Symbols shown' });
  const rUndated = readout(f.readouts, { label: 'No date established' });
  const rYear = readout(f.readouts, { label: 'Selected' });

  const state = { group: 'all', mine: true, sel: -1 };
  const visible = (it) => (state.group === 'all' || it.n.group === state.group) && (!state.mine || it.mine);

  // Lay the dots out: x from the year, y from the lane, stacking dots that
  // would overlap into up to three sub-rows.
  const layout = () => {
    const W = box.width;
    const H = box.height;
    const left = 10;
    const right = 12;
    const top = 6;
    const axis = 22;
    const laneH = (H - top - axis) / LANES.length;
    for (let l = 0; l < LANES.length; l++) tm[l] = top + l * laneH;
    const last = LANES.map(() => [-1e9, -1e9, -1e9]);
    for (let k = 0; k < N; k++) {
      const it = dated[k];
      const t = (Math.max(Y0, it.y) - Y0) / (Y1 - Y0);
      let x = left + t * (W - left - right);
      const rows = last[it.lane];
      let s = rows.findIndex((x0) => x - x0 > 2 * R + 1.5);
      if (s < 0) {
        // All three sub-rows are taken here: nudge right of the oldest one.
        s = rows.indexOf(Math.min(...rows));
        x = rows[s] + 2 * R + 1.5;
      }
      rows[s] = x;
      px[k] = x;
      py[k] = tm[it.lane] + 15 + s * (2 * R + 2.5);
    }
  };

  const yearX = (y) => 10 + ((y - Y0) / (Y1 - Y0)) * (box.width - 22);

  const draw = () => {
    const pal = palette();
    const { ctx, width: W, height: H } = box;
    box.clear();
    ctx.font = '11px system-ui, sans-serif';
    ctx.textBaseline = 'alphabetic';
    // Decades every 50 years.
    ctx.lineWidth = 1;
    for (let y = 1700; y <= Y1; y += 50) {
      const x = yearX(y);
      ctx.strokeStyle = pal.css('grid');
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x, H - 20);
      ctx.stroke();
      ctx.fillStyle = pal.css('muted');
      ctx.textAlign = 'center';
      if (W > 360 || y % 100 === 0) ctx.fillText(String(y), x, H - 6);
    }
    // Lanes.
    ctx.textAlign = 'left';
    for (let l = 0; l < LANES.length; l++) {
      ctx.strokeStyle = pal.css('line');
      ctx.beginPath();
      ctx.moveTo(0, tm[l] + 0.5);
      ctx.lineTo(W, tm[l] + 0.5);
      ctx.stroke();
      ctx.fillStyle = pal.css(`s${l + 1}`);
      ctx.fillText(GROUPS[LANES[l]], 6, tm[l] + 11);
    }
    // Dots: filled for a confident date, hollow when the origin is uncertain.
    for (let k = 0; k < N; k++) {
      const it = dated[k];
      const on = visible(it);
      const col = `s${it.lane + 1}`;
      const low = it.n.confidence === 'low';
      ctx.beginPath();
      ctx.arc(px[k], py[k], R, 0, 2 * Math.PI);
      if (low) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = pal.css(col, on ? 1 : 0.2);
        ctx.stroke();
      } else {
        ctx.fillStyle = pal.css(col, on ? 1 : 0.15);
        ctx.fill();
      }
      if (it.y < Y0) {
        // Off the left edge (Leonardo, c. 1505): a small arrow.
        ctx.fillStyle = pal.css('muted');
        ctx.fillText('‹', px[k] - R - 6, py[k] + 4);
      }
    }
    if (state.sel >= 0) {
      const x = px[state.sel];
      const y = py[state.sel];
      ctx.strokeStyle = pal.css('accent', 0.7);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x, H - 20);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = pal.css('ink');
      ctx.beginPath();
      ctx.arc(x, y, R + 3, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const describe = (it) => {
    const n = it.n;
    const sym = safeTex(n.tex || '');
    card.replaceChildren(
      h('div.nt-tl-sym', { html: sym || n.symbol }),
      h(
        'div.nt-tl-text',
        h('strong', n.name),
        h('span.nt-when', n.year),
        h('span', n.introduced_by),
        n.confidence === 'low' ? h('span.nt-flag', 'Origin not established: treat this date as uncertain.') : null,
        h('a', { href: `#/symbols/${n.id}` }, 'Open in the symbols atlas →'),
      ),
    );
  };

  const select_ = (k, { announce = true } = {}) => {
    state.sel = k;
    if (k >= 0) {
      const it = dated[k];
      describe(it);
      rYear.set(String(it.y < Y0 ? `c. ${it.y}` : it.y));
      if (announce) f.status.textContent = `${it.n.year.split(/[;(]/)[0].trim()}: ${it.n.name}. ${GROUPS[it.n.group]}.`;
    }
    draw();
  };

  const stepBy = (dir) => {
    let k = state.sel;
    for (let tries = 0; tries < N; tries++) {
      k = (k + dir + N) % N;
      if (visible(dated[k])) return select_(k);
    }
  };

  const refilter = () => {
    const shown = dated.filter(visible).length;
    const undated = all.filter((it) => it.y == null && (state.group === 'all' || it.n.group === state.group) && (!state.mine || it.mine)).length;
    rShown.set(String(shown));
    rUndated.set(String(undated));
    if (state.sel < 0 || !visible(dated[state.sel])) state.sel = dated.findIndex(visible);
    select_(state.sel, { announce: false });
  };

  select(f.controls, {
    label: 'Family',
    options: [['all', 'All families'], ...LANES.map((g) => [g, GROUPS[g]])],
    value: 'all',
    onChange: (v) => ((state.group = v), refilter()),
  });
  toggle(f.controls, { label: 'Only symbols in this chapter', checked: true, onChange: (on) => ((state.mine = on), refilter()) });
  button(f.controls, { label: '◀ Earlier', onClick: () => stepBy(-1) });
  button(f.controls, { label: 'Later ▶', onClick: () => stepBy(1) });

  const pick = (e) => {
    const p = box.pointer(e);
    let best = -1;
    let bd = 18 * 18;
    for (let k = 0; k < N; k++) {
      if (!visible(dated[k])) continue;
      const d2 = (px[k] - p.x) ** 2 + (py[k] - p.y) ** 2;
      if (d2 < bd) {
        bd = d2;
        best = k;
      }
    }
    if (best >= 0) select_(best);
  };
  box.canvas.addEventListener('pointerdown', pick);
  box.canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      stepBy(e.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  box.onResize(() => {
    layout();
    draw();
  });

  layout();
  const preset = fig.dataset.preset;
  const start = preset ? dated.findIndex((it) => it.n.id === preset) : -1;
  if (start >= 0) state.sel = start;
  refilter();
}
