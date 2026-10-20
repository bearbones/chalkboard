// Chapter 15, section floating-point: two figures.
//   trust-float   round-off that accumulates over a long run, two ways:
//                 a running total fed a million small increments (naive
//                 against Kahan summation, verification.js createSummation)
//                 and a million-step oscillator in Float32 beside Float64
//                 (verification.js createOscillator).
//   trust-reduce  the same numbers summed with 1 to 64 "threads" give
//                 different answers (ch-trust-reduce.js chunkedSum).

import { fmt, sci } from '../../kit/dom.js';
import { frame, slider, toggle, segmented, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { createSummation, stepSummation, summationErrors, createOscillator, stepOscillator, oscillatorErrors, float32ClockStall, UNIT_ROUNDOFF } from '../../sims/verification.js';
import { makeData, exactSum, sweepThreads, ulp, conditionNumber, summationBounds, REDUCE_DATA } from '../../sims/ch-trust-reduce.js';
import { preset, clampLog, sci2, pct, sliceRunner } from './common.js';

// ---------------------------------------------------------------------------
// trust-float

const STEPS = 1e6;
const PER_FRAME = 1e4;
const SAMPLES = STEPS / PER_FRAME + 1;
const FLOAT_PRESETS = {
  default: { mode: 'sum', precision: 'f32', increment: 1e-8, jitter: false },
  stall: { mode: 'sum', precision: 'f32', increment: 1e-8, jitter: false },
  drift: { mode: 'sum', precision: 'f32', increment: 1e-6, jitter: true },
  f64: { mode: 'sum', precision: 'f64', increment: 1e-10, jitter: false },
  oscillator: { mode: 'osc', sameParams: false },
  'oscillator-same': { mode: 'osc', sameParams: true },
};
const DT = 0.01;

export function mountFloat(fig, { signal }) {
  const P = { precision: 'f32', increment: 1e-8, jitter: false, sameParams: false, ...preset(fig, FLOAT_PRESETS) };
  const f = frame(fig, { title: 'A million roundings', wide: true });
  const plot = new Plot(f.stage, {
    x: { label: 'additions', min: 0, max: STEPS, fmt: (v) => sci(v, 2) },
    y: { label: 'error ÷ mass added', log: true, fmt: (v) => sci(v, 2) },
    aspect: 1.9,
    label: 'Error of a running total against the number of additions, for plain and Kahan summation, with the worst-case bound',
  });

  const modeSeg = segmented(f.controls, {
    label: 'Experiment',
    options: [['sum', 'a running total'], ['osc', 'a long oscillator run']],
    value: P.mode,
    onChange: () => {
      showMode();
      restart();
    },
  });
  const precSeg = segmented(f.controls, { label: 'Precision', options: [['f32', 'Float32'], ['f64', 'Float64']], value: P.precision, onChange: () => restart() });
  const incS = slider(f.controls, { label: 'increment per step', min: 1e-10, max: 1e-4, log: true, value: P.increment, fmt: (v) => sci(v, 3), onInput: () => restart() });
  const jitT = toggle(f.controls, { label: 'Vary each increment by ±50 %', checked: P.jitter, onChange: () => restart() });
  const sameT = toggle(f.controls, { label: 'Give Float64 the Float32-rounded constants', checked: P.sameParams, onChange: () => restart() });

  const r = {
    k: readout(f.readouts, { label: 'steps' }),
    a: readout(f.readouts, { label: '' }),
    b: readout(f.readouts, { label: '' }),
    c: readout(f.readouts, { label: '' }),
    d: readout(f.readouts, { label: '' }),
  };
  const label = (ro, text) => {
    const dt = ro.el.previousElementSibling;
    if (dt.textContent !== text) dt.textContent = text;
  };

  const xs = new Float64Array(SAMPLES);
  const y1 = new Float64Array(SAMPLES);
  const y2 = new Float64Array(SAMPLES);
  const y3 = new Float64Array(SAMPLES);
  const y4 = new Float64Array(SAMPLES);
  let count = 0;
  let S = null;
  let O = null;
  const se = {};
  const oe = {};
  let floor = 1e-12;

  function showMode() {
    const sum = modeSeg.value === 'sum';
    precSeg.el.hidden = !sum;
    incS.el.hidden = !sum;
    jitT.el.hidden = !sum;
    sameT.el.hidden = sum;
    if (sum) {
      plot.setAxes({ x: { label: 'additions', max: STEPS }, y: { label: 'error ÷ mass added' } });
      label(r.k, 'additions');
      label(r.a, 'mass lost or gained, plain sum');
      label(r.b, 'same, Kahan sum');
      label(r.c, 'increment ÷ half-gap at the total');
      label(r.d, 'worst-case bound, plain');
    } else {
      plot.setAxes({ x: { label: 'time t', max: STEPS * DT }, y: { label: 'error' } });
      label(r.k, 'time t');
      label(r.a, 'phase gap, Float32 − Float64');
      label(r.b, 'invariant drift, Float32 | Float64');
      label(r.c, 'scheme error (Float64 vs exact)');
      label(r.d, 'Float32 clock t − n Δt');
    }
  }

  function sample() {
    if (modeSeg.value === 'sum') {
      summationErrors(S, se);
      xs[count] = S.k;
      y1[count] = clampLog(se.naiveAddedRel, floor);
      y2[count] = clampLog(se.kahanAddedRel, floor);
      y3[count] = clampLog(se.boundNaive / se.added, floor);
    } else {
      oscillatorErrors(O, oe);
      xs[count] = oe.t;
      y1[count] = clampLog(oe.phaseDiff, 1e-16);
      y2[count] = clampLog(oe.invErr32, 1e-16);
      y3[count] = clampLog(oe.invErr64, 1e-16);
      y4[count] = clampLog(oe.truncErr64, 1e-16);
    }
    count++;
  }

  function draw() {
    const n = count;
    if (modeSeg.value === 'sum') {
      plot.draw([
        { x: xs.subarray(0, n), y: y3.subarray(0, n), color: 'muted', width: 1.3, dash: [2, 3], label: 'worst-case bound, plain', hover: false },
        { x: xs.subarray(0, n), y: y1.subarray(0, n), color: 's1', width: 2.4, label: 'plain sum s += x' },
        { x: xs.subarray(0, n), y: y2.subarray(0, n), color: 's2', width: 2.4, dash: [7, 4], label: 'Kahan sum' },
      ]);
    } else {
      plot.draw([
        { x: xs.subarray(0, n), y: y4.subarray(0, n), color: 'muted', width: 1.3, dash: [2, 3], label: 'scheme error (truncation)' },
        { x: xs.subarray(0, n), y: y1.subarray(0, n), color: 's1', width: 2.4, label: 'phase gap' },
        { x: xs.subarray(0, n), y: y2.subarray(0, n), color: 's2', width: 2.2, dash: [7, 4], label: 'invariant drift, Float32' },
        { x: xs.subarray(0, n), y: y3.subarray(0, n), color: 's3', width: 2.2, dash: [12, 4, 3, 4], label: 'invariant drift, Float64' },
      ]);
    }
  }

  function report() {
    const done = count >= SAMPLES;
    if (modeSeg.value === 'sum') {
      const prec = precSeg.value;
      const inc = incS.value;
      const total = se.exact;
      const half = ulp(prec === 'f32' ? Math.fround(total) : total, prec) / 2;
      const signed = (S.naive - (S.hi + S.lo)) / se.added;
      r.k.set(S.k.toLocaleString('en-US'));
      r.a.set(S.k ? `${signed < 0 ? 'lost' : 'gained'} ${pct(Math.abs(signed))}` : '–', S.k && Math.abs(signed) > 1e-3 ? 'bad' : '');
      r.b.set(S.k ? pct(se.kahanAddedRel) : '–', S.k ? 'good' : '');
      const ratio = inc / half;
      r.c.set(fmt(ratio, 3), ratio < 1 ? 'bad' : '');
      r.d.set(S.k ? pct(se.boundNaive / se.added) : '–');
      if (!S.k) f.status.textContent = 'Press Play to add the increments.';
      else if (signed < -0.99)
        f.status.textContent = `Every increment is smaller than half the gap between ${prec === 'f32' ? 'Float32' : 'Float64'} numbers near the total, so each addition rounds back to where it started: after ${S.k.toLocaleString('en-US')} additions the plain total has not moved, and all of the added mass is lost. Kahan's correction carries the lost part forward and keeps it.`;
      else if (signed > 0.3)
        f.status.textContent = `Each addition rounds up to a whole gap between neighbouring floats, so the plain total gains mass: ${pct(signed)} too much after ${S.k.toLocaleString('en-US')} steps. Every rounding errs the same way, so the error grows in a straight line. Kahan stays at ${pct(se.kahanAddedRel)}.`;
      else
        f.status.textContent = `${done ? 'Done. ' : ''}The plain total has ${signed < 0 ? 'lost' : 'gained'} ${pct(Math.abs(signed))} of the mass added; Kahan's has ${pct(se.kahanAddedRel)}${se.kahanAddedRel > 0 ? `, ${fmt(Math.abs(signed) / se.kahanAddedRel, 2)} times less` : ''}. ${jitT.value ? 'With varied increments the roundings partly cancel, so the plain error grows more slowly than the worst case.' : 'With identical increments every rounding has the same sign, so the error grows linearly in the number of steps.'}`;
    } else {
      r.k.set(fmt(oe.t, 5));
      r.a.set(`${sci2(oe.phaseDiff)} rad`);
      r.b.set(`${sci2(oe.invErr32)} | ${sci2(oe.invErr64)}`);
      r.c.set(sci2(oe.truncErr64));
      r.d.set(fmt(oe.clockErr32, 4), Math.abs(oe.clockErr32) > 1 ? 'bad' : '');
      if (!O.n) f.status.textContent = 'Press Play to run a million steps of Δt = 0.01.';
      else {
        f.status.textContent = sameT.value
          ? `With the same rounded constants, the two copies differ only by per-operation round-off: a phase gap of ${sci2(oe.phaseDiff)} rad at t = ${fmt(oe.t, 5)}. The Float32 clock is off by ${fmt(oe.clockErr32, 4)} and will stop dead at t = ${float32ClockStall(DT).toLocaleString('en-US')}.`
          : `Phase gap ${sci2(oe.phaseDiff)} rad at t = ${fmt(oe.t, 5)}. Storing Δt in Float32 alone predicts ${sci2(oe.phaseFromParams)} rad: a slightly different frequency, so a systematic error that grows linearly. The scheme's own error (${sci2(oe.truncErr64)}) is far larger than any of this. The Float32 clock t += Δt is off by ${fmt(oe.clockErr32, 4)}.`;
      }
    }
  }

  function restart() {
    count = 0;
    if (modeSeg.value === 'sum') {
      const precision = precSeg.value;
      S = createSummation({ precision, increment: incS.value, jitter: jitT.value ? 0.5 : 0, start: 1 });
      floor = UNIT_ROUNDOFF[precision] * 1e-3;
    } else {
      O = createOscillator({ omega: 1, dt: DT, sameParams: sameT.value });
    }
    sample();
    draw();
    report();
    if (!loop.playing) loop.play();
  }

  const loop = animate(
    fig,
    () => {
      if (count >= SAMPLES) {
        loop.pause();
        return;
      }
      if (modeSeg.value === 'sum') stepSummation(S, PER_FRAME);
      else stepOscillator(O, PER_FRAME);
      sample();
      draw();
      report();
      if (count >= SAMPLES) loop.pause();
    },
    { autoplay: false, signal },
  );
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Restart', onClick: () => restart() });
  showMode();
  // First paint: the initial state, then play unless reduced motion asks us
  // not to (restart() calls play(); undo it under reduced motion).
  restart();
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) loop.pause();
}

// ---------------------------------------------------------------------------
// trust-reduce

const NDATA = 16384;
const PS = Array.from({ length: 64 }, (_, i) => i + 1);
// Ulp counts: whole numbers stay whole (fmt(161, 3) would print 160).
const ulps = (v) => {
  const r = Math.round(v * 10) / 10;
  return `${v >= 1e4 ? fmt(v, 3) : r.toLocaleString('en-US')} ${r === 1 ? 'ulp' : 'ulps'}`;
};
const REDUCE_PRESETS = {
  default: { kind: 'positive', precision: 'f32', method: 'naive' },
  kahan: { kind: 'positive', precision: 'f32', method: 'kahan' },
  mixed: { kind: 'mixed', precision: 'f64', method: 'naive' },
};

export function mountReduce(fig, { signal }) {
  const P = preset(fig, REDUCE_PRESETS);
  const f = frame(fig, { title: 'One sum, sixty-four answers' });
  const plot = new Plot(f.stage, {
    x: { label: 'threads P', min: 0, max: 65, fmt: (v) => String(Math.round(v)) },
    y: { label: 'sum − exact (ulps)', fmt: (v) => fmt(v, 3) },
    aspect: 1.8,
    label: 'The computed sum minus the exact sum, in units in the last place, for each number of threads from 1 to 64',
  });
  const kindSeg = segmented(f.controls, { label: 'Data', options: Object.values(REDUCE_DATA).map((d) => [d.id, d.name]), value: P.kind, onChange: () => run() });
  const precSeg = segmented(f.controls, { label: 'Precision', options: [['f32', 'Float32'], ['f64', 'Float64']], value: P.precision, onChange: () => run() });
  const methSeg = segmented(f.controls, { label: 'Summation', options: [['naive', 'plain'], ['kahan', 'Kahan']], value: P.method, onChange: () => run() });
  let seed = 1;
  button(f.controls, {
    label: 'New random data',
    onClick: () => {
      seed++;
      run();
    },
  });
  const distinctR = readout(f.readouts, { label: 'different answers' });
  const spreadR = readout(f.readouts, { label: 'spread' });
  const relR = readout(f.readouts, { label: 'relative spread' });
  const condR = readout(f.readouts, { label: 'condition number Σ|xᵢ| / |Σxᵢ|' });
  const boundR = readout(f.readouts, { label: 'worst-case bound' });

  const px = new Float64Array(PS.length);
  const py = new Float64Array(PS.length);
  let count = 0;
  const runner = sliceRunner(signal);

  const EX = [0, 65];
  const EY = [0, 0];
  function draw() {
    plot.draw(
      [
        { x: EX, y: EY, color: 'ink', width: 1.4, dash: [5, 4], label: 'exact sum', hover: false },
        { x: px.subarray(0, count), y: py.subarray(0, count), color: 's1', width: 1, points: 3.6, label: methSeg.value === 'kahan' ? 'Kahan in each chunk' : 'plain sum in each chunk' },
      ],
      { yExtent: [-1, 1] },
    );
  }

  function run() {
    const kind = kindSeg.value;
    const precision = precSeg.value;
    const method = methSeg.value;
    const x = makeData(NDATA, kind, { seed, precision });
    const ex = exactSum(x);
    const u = ulp(ex, precision);
    const cond = conditionNumber(x);
    const bound = summationBounds(x, precision)[method === 'kahan' ? 'kahan' : 'naive'];
    condR.set(fmt(cond, 3));
    boundR.set(ulps(bound / u));
    count = 0;
    distinctR.set('…');
    spreadR.set('…');
    relR.set('…');
    draw();
    f.status.textContent = 'Summing with 1, 2, … 64 threads…';
    function* driver() {
      const gen = sweepThreads(x, PS, { precision, method });
      for (;;) {
        const step = gen.next();
        if (step.done) return step.value;
        px[count] = step.value.P;
        py[count] = (step.value.sum - ex) / u;
        count++;
        if (count % 8 === 0) draw();
        yield;
      }
    }
    runner
      .run(driver(), 5)
      .then((sums) => {
        draw();
        const distinct = new Set(sums).size;
        let lo = Infinity;
        let hi = -Infinity;
        for (const s of sums) {
          lo = Math.min(lo, s);
          hi = Math.max(hi, s);
        }
        const spread = (hi - lo) / u;
        distinctR.set(String(distinct), distinct > 1 ? 'bad' : 'good');
        spreadR.set(ulps(spread));
        relR.set(sci2((hi - lo) / Math.abs(ex)));
        const name = precision === 'f32' ? 'Float32' : 'Float64';
        f.status.textContent =
          distinct === 1
            ? `All 64 thread counts give the same ${name} answer: compensated summation removes the error that the order of additions controls.`
            : `${distinct} different ${name} answers from the same ${NDATA.toLocaleString('en-US')} numbers, spread over ${ulps(spread)}. Each is within the worst-case bound (${ulps(bound / u)}); none is wrong, but a test that compares results bit for bit across machines will fail.${method === 'kahan' ? ' Kahan narrows the spread but does not remove it: the order still differs.' : ''}`;
      })
      .catch(() => {});
  }
  run();
}
