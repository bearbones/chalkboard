// notation-grid: read a scheme's update formula off the space-time grid.
// Columns are j−3 … j+3, rows are the time levels n−1, n, n+1. The values a
// scheme reads are marked in the read colour and the value it writes in the
// write colour; the faces j ± 1/2 carry the numerical fluxes. The update and
// flux formulas, stencils and orders come from the shared advection kernel
// (SCHEMES), and the measured error ratio from its convergenceStudy.

import { h } from '../../kit/dom.js';
import { frame, select, toggle, readout, canvasBox, sliced } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { tex } from '../../kit/math.js';
import { SCHEMES, convergenceStudy } from '../../sims/advection.js';

const IDS = ['upwind', 'ftcs', 'lxf', 'lw', 'bw', 'leapfrog'];
const COLS = 7; // offsets −3 … +3
const NU = 0.8;
const GRIDS = [32, 64, 128, 256];
const MINUS = '−';

const off = (o) => (o === 0 ? 'j' : `j${o < 0 ? MINUS : '+'}${Math.abs(o)}`);
const offTex = (o) => (o === 0 ? 'j' : `j${o < 0 ? '-' : '+'}${Math.abs(o)}`);
const levelTex = (r) => (r === 0 ? 'n' : `n${r < 0 ? '-' : '+'}${Math.abs(r)}`);
const xTex = (o) => (o === 0 ? 'x_j' : `x_j ${o < 0 ? '-' : '+'} ${Math.abs(o) === 1 ? '' : Math.abs(o)}\\Delta x`);
const tTex = (r) => (r === 0 ? 't_n' : `t_n ${r < 0 ? '-' : '+'} \\Delta t`);

export function mountGrid(fig, { signal }) {
  const f = frame(fig, { title: 'Reading a scheme off the grid', wide: true });
  const box = canvasBox(f.stage, { aspect: 2.1, minHeight: 190, maxHeight: 300, label: 'Space-time grid: columns j−3 to j+3, rows for time levels n−1, n and n+1. The points the chosen scheme reads and the point it writes are marked.' });
  const tag = h('div.nt-eqs.nt-tag');
  const upd = h('div.nt-eqs');
  const fluxLabel = h('p.nt-comp-label', 'The same update in flux form, and this scheme\'s flux:');
  const fluxGen = h('div.nt-eqs', { html: tex('u_j^{n+1}=u_j^n-\\frac{\\Delta t}{\\Delta x}\\left(\\class{t2}{F_{j+1/2}}-\\class{t1}{F_{j-1/2}}\\right)', { display: true }) });
  const flux = h('div.nt-eqs');
  f.stage.append(tag, upd, fluxLabel, fluxGen, flux);

  const rReads = readout(f.readouts, { label: 'Values read' });
  const rOrder = readout(f.readouts, { label: 'Order p' });
  const rPred = readout(f.readouts, { label: 'Halve Δx: error ÷ 2ᵖ' });
  const rMeas = readout(f.readouts, { label: 'Measured ÷ (128 → 256)' });

  const state = { id: 'lw', flux: true, hover: null };
  const cache = new Map();
  let geom = { x0: 0, dx: 1, y: [0, 0, 0] };

  const readsOf = (s) => {
    const pts = s.stencil.map((o) => [o, 0]);
    if (s.levels === 3) pts.push([0, -1]);
    return pts;
  };

  const layout = () => {
    const W = box.width;
    const H = box.height;
    const left = 44;
    const right = 14;
    const dx = (W - left - right) / (COLS - 1);
    geom = { x0: left, dx, y: [H - 64, (H - 64 + 22) / 2, 22] }; // rows n−1, n, n+1 (top)
  };
  const X = (o) => geom.x0 + (o + 3) * geom.dx;
  const Y = (r) => geom.y[r + 1];

  const draw = () => {
    const pal = palette();
    const { ctx, width: W, height: H } = box;
    const s = SCHEMES[state.id];
    box.clear();
    ctx.font = '12px system-ui, sans-serif';
    ctx.lineWidth = 1;
    // Lattice.
    ctx.strokeStyle = pal.css('grid');
    for (let o = -3; o <= 3; o++) {
      ctx.beginPath();
      ctx.moveTo(X(o), Y(1) - 10);
      ctx.lineTo(X(o), Y(-1) + 10);
      ctx.stroke();
    }
    for (let r = -1; r <= 1; r++) {
      ctx.beginPath();
      ctx.moveTo(X(-3) - 10, Y(r));
      ctx.lineTo(X(3) + 10, Y(r));
      ctx.stroke();
    }
    // Labels.
    ctx.fillStyle = pal.css('muted');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('n+1', geom.x0 - 14, Y(1));
    ctx.fillText('n', geom.x0 - 14, Y(0));
    ctx.fillText(`n${MINUS}1`, geom.x0 - 14, Y(-1));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (let o = -3; o <= 3; o++) ctx.fillText(off(o), X(o), H - 30);
    // Faces j ± 1/2, where the fluxes live.
    const faces = [[-0.5, 's1', `j${MINUS}½`], [0.5, 's2', 'j+½']];
    for (const [o, col, label] of faces) {
      const x = X(o);
      ctx.strokeStyle = pal.css(state.flux ? col : 'muted', 0.9);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, Y(0) - 8);
      ctx.lineTo(x, Y(1) + 8);
      ctx.stroke();
      ctx.fillStyle = pal.css(state.flux ? col : 'muted');
      ctx.fillText(label, x, H - 12);
    }
    ctx.lineWidth = 1;
    // Flux stencils: F_{j−1/2} reads the offsets min(S) … max(S) − 1 of the
    // update stencil S, and F_{j+1/2} the same shifted by one.
    if (state.flux) {
      const lo = Math.min(...s.stencil);
      const hi = Math.max(...s.stencil) - 1;
      const bracket = (a, b, y, col) => {
        ctx.strokeStyle = pal.css(col);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(X(a) - 9, y - 5);
        ctx.lineTo(X(a) - 9, y);
        ctx.lineTo(X(b) + 9, y);
        ctx.lineTo(X(b) + 9, y - 5);
        ctx.stroke();
        ctx.lineWidth = 1;
      };
      bracket(lo, hi, Y(0) + 14, 's1');
      bracket(lo + 1, hi + 1, Y(0) + 21, 's2');
    }
    // Read → write arrows.
    const reads = readsOf(s);
    ctx.strokeStyle = pal.css('read', 0.55);
    ctx.lineWidth = 1.5;
    for (const [o, r] of reads) {
      ctx.beginPath();
      ctx.moveTo(X(o), Y(r));
      ctx.lineTo(X(0), Y(1));
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    // Nodes.
    for (let r = -1; r <= 1; r++)
      for (let o = -3; o <= 3; o++) {
        const isRead = reads.some(([a, b]) => a === o && b === r);
        const isWrite = o === 0 && r === 1;
        ctx.beginPath();
        ctx.arc(X(o), Y(r), isRead || isWrite ? 7 : 4, 0, 2 * Math.PI);
        if (isWrite || isRead) {
          ctx.fillStyle = pal.css(isWrite ? 'write' : 'read');
          ctx.fill();
          ctx.strokeStyle = pal.css('ink', 0.8);
          ctx.stroke();
        } else {
          ctx.fillStyle = pal.css('surface');
          ctx.fill();
          ctx.strokeStyle = pal.css('muted');
          ctx.stroke();
        }
      }
    if (state.hover) {
      const [o, r] = state.hover;
      ctx.strokeStyle = pal.css('accent');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(o), r === 0.5 ? (Y(0) + Y(1)) / 2 : Y(r), 11, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  };

  const nameTag = () => {
    if (!state.hover) {
      tag.innerHTML = tex('\\text{Tap a point or a face to read its name.}', { display: true });
      return;
    }
    const [o, r] = state.hover;
    let src;
    if (r === 0.5) src = `\\class{${o < 0 ? 't1' : 't2'}}{F_{j${o < 0 ? '-' : '+'}1/2}}:\\ \\text{flux through } x_j ${o < 0 ? '-' : '+'} \\tfrac{1}{2}\\Delta x`;
    else src = `u_{${offTex(o)}}^{${levelTex(r)}} \\approx u\\left(${xTex(o)},\\ ${tTex(r)}\\right)`;
    tag.innerHTML = tex(src, { display: true });
  };

  const measure = (id) => {
    if (cache.has(id)) return showMeasured(id);
    rMeas.set('measuring…');
    sliced(convergenceStudy(id, NU, GRIDS, 'sine', 1), { signal })
      .then((r) => {
        cache.set(id, r);
        if (state.id === id) showMeasured(id);
      })
      .catch(() => {});
  };
  const showMeasured = (id) => {
    const r = cache.get(id);
    const e = r.errors;
    const last = e[e.length - 2] / e[e.length - 1];
    const s = SCHEMES[id];
    const blown = !Number.isFinite(last) || e[e.length - 1] > 1;
    if (blown) {
      rMeas.set('blows up', 'bad');
      f.status.textContent = `${s.name} is consistent but unstable: its error halves on the coarse grids, then round-off grows until the 256-cell answer is useless.`;
    } else {
      rMeas.set(last.toFixed(2), Math.abs(last - 2 ** s.order) < 0.15 * 2 ** s.order ? 'good' : '');
      f.status.textContent = `${s.name}: order ${s.order}, so halving Δx (and Δt with it) should divide the error by ${2 ** s.order}. Measured on a sine wave: ${e
        .slice(1)
        .map((v, k) => (e[k] / v).toFixed(2))
        .join(', ')}.`;
    }
  };

  const show = () => {
    const s = SCHEMES[state.id];
    upd.innerHTML = tex(s.tex, { display: true });
    flux.innerHTML = tex(s.flux, { display: true });
    const reads = readsOf(s);
    const atN = reads.filter(([, r]) => r === 0).map(([o]) => off(o));
    rReads.set(`${atN.join(', ')} at n${s.levels === 3 ? `; j at n${MINUS}1` : ''}`);
    rOrder.set(String(s.order));
    rPred.set(String(2 ** s.order));
    draw();
    nameTag();
    measure(state.id);
  };

  select(f.controls, {
    label: 'Scheme',
    options: IDS.map((id) => [id, SCHEMES[id].name]),
    value: state.id,
    onChange: (v) => ((state.id = v), show()),
  });
  toggle(f.controls, { label: 'Show the flux stencils', checked: true, onChange: (on) => ((state.flux = on), draw()) });

  const pick = (e) => {
    const p = box.pointer(e);
    let best = null;
    let bd = 20 * 20;
    for (let r = -1; r <= 1; r++)
      for (let o = -3; o <= 3; o++) {
        const d2 = (X(o) - p.x) ** 2 + (Y(r) - p.y) ** 2;
        if (d2 < bd) ((bd = d2), (best = [o, r]));
      }
    for (const o of [-0.5, 0.5]) {
      const d2 = (X(o) - p.x) ** 2 + ((Y(0) + Y(1)) / 2 - p.y) ** 2;
      if (d2 < bd) ((bd = d2), (best = [o, 0.5]));
    }
    const same = best && state.hover && best[0] === state.hover[0] && best[1] === state.hover[1];
    if (best && !same) {
      state.hover = best;
      nameTag();
      draw();
    }
  };
  box.canvas.addEventListener('pointerdown', pick);
  box.canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') pick(e);
  });
  box.onResize(() => {
    layout();
    draw();
  });

  const preset = fig.dataset.preset;
  if (preset && SCHEMES[preset] && IDS.includes(preset)) state.id = preset;
  f.controls.querySelector('select').value = state.id;
  layout();
  show();
}
