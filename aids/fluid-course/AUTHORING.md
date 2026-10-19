# Authoring the fluids course

This guide is for anyone (person or agent) who writes a chapter, a widget or
a numerical kernel for *Fluids by the Numbers*. The repo-wide rules in
`AGENTS.md` still apply: no build step, generators for algorithms, colours
from tokens, pages that work at 390 px, and `npm test` green.

## Where things live

```
aids/fluid-course/
  index.html, style.css      the shell and every style (tokens at the top)
  src/app.js                 router, table of contents, home page, theme toggle
  src/course.js              parts and chapter order; glossary/pathology/widget indexes
  src/chapters/<id>.js       one module per chapter: prose, widgets, quizzes, glossary, pathologies
  src/reference/             people timeline, symbols atlas, rogues' gallery, glossary
  src/sims/<name>.js         numerical kernels: pure, DOM-free, tested under node
  src/kit/                   math (TeX → MathML), widgets, plots, fields, quizzes, render
  dev/                       kit sampler; dev/?m=../src/chapters/<id>.js previews one chapter
tests/fluid-course/          math, course integrity, and one test file per kernel
```

A chapter owns its module and nothing else. It never edits `course.js`,
`style.css`, another chapter, or the kit. If it needs styles, it puts them in
its own `css` string. If it needs a kit feature, it asks for it rather than
patching the kit. Then parallel authors never collide.

## The chapter module

```js
export const chapter = {
  id: 'advection',                 // route: #/advection, sections #/advection/<h2 id>
  title: 'Advection: the hardest easy equation',
  short: 'Advection',              // TOC, prev/next, breadcrumbs
  blurb: 'One sentence for the chapter card.',
  minutes: 35,                     // honest reading-plus-playing time
  html: String.raw`…`,             // the prose (see below); String.raw keeps TeX backslashes
  widgets: { 'upwind-cfl': mountUpwindCfl },
  quizzes: { q1: { … } },
  glossary: { 'cfl-number': { term: 'CFL number', def: '…', section: 'cfl' } },
  pathologies: [ { … } ],
  css: `…`,                        // optional; prefix every selector with .chapter[data-chapter="advection"]
};
```

Keep the `id`, `title`, `short`, `blurb` and `minutes` of the stub you replace.
Do not rename or reorder chapters.

### Prose vocabulary

Write plain HTML in `html`. Math goes between `$…$` (inline) and `$$…$$`
(display). Write `\$` for a literal dollar sign.

| Device | Markup |
|---|---|
| Opening paragraph | `<p class="lead-in">…</p>` |
| Section | `<h2 id="cfl">The CFL condition</h2>`. Every h2 needs an id, unique in the chapter; h3 ids are optional. Sections become the TOC entries and deep links. |
| Numbered equation | `<div class="eq" id="eq-upwind">$$…$$<span class="eq-tag">(7.3)</span></div>` |
| Person | `<aside class="who" data-person="courant">One or two sentences on what they did *here*.</aside>`. The id must exist in `src/reference/people-data.js`. The monogram, name, lifespan and link are added for you. |
| Side note | `<aside class="note" data-label="Why it matters">…</aside>` |
| Pitfall | `<aside class="pitfall">…</aside>`: a numerical trap, linked to the gallery entry when there is one. |
| History | `<aside class="history" data-era="1928">…</aside>` |
| Things to try | `<div class="try"><ol><li>…</li></ol></div>`, placed right after the figure it drives. |
| Optional depth | `<details class="deeper"><summary>Go deeper: …</summary>…</details>`, for derivations and proofs. |
| Glossary term | `<dfn data-term="cfl-number">CFL number</dfn>`. The key may be defined in any chapter. |
| Figure | `<figure data-widget="name" data-preset="…"><figcaption>…</figcaption></figure>`. Add `class="wide"` to let it exceed the text measure. |
| Question | `<div data-quiz="q1"></div>` |
| Table | A plain `<table>`. Numeric columns get `class="num"` on th and td. It scrolls on phones. |
| Link to a section | `<a href="#/pressure/checkerboard">…</a>` (tested) |
| Link to a person | `<a href="#/people/stokes">…</a>` (tested) |
| Link to a sibling aid | `<a data-aid="pressure-solver">…</a>` |
| Sources | `<ol class="refs"><li>…</li></ol>` in a final `<h2 id="sources">Sources and further reading</h2>` |

### Math

The converter in `src/kit/math.js` covers a practical TeX subset:

- fractions, roots and scripts;
- Greek letters, `\mathbf`, `\boldsymbol`, `\mathrm`, `\mathcal`, `\mathbb`, `\mathfrak`, `\text`, `\operatorname`;
- accents, `\left…\right`, `\big…`, `\underbrace`, `\overbrace`, `\overset`, `\underset`, `\stackrel`;
- sums and integrals;
- environments: `aligned`, `gathered`, `cases`, `matrix`, `pmatrix`, `bmatrix`, `vmatrix`, `array`;
- `\boxed`, `\phantom`, `\not`, `\tag` and the usual spacing.

An unknown command is an error: the test suite fails and the page shows the
source in red. `\color` is refused. To emphasise a term, use `\class{hl}{…}`
(highlighter). To match a term to a plot series, use `\class{t1}{…}` …
`\class{t5}{…}`, and also say in words which term is which.

Vectors are bold upright (`\mathbf{u}`). Operators are upright (`\nabla`,
`\mathrm{d}`, `\operatorname{div}`). Grid indices are subscripts, time levels
superscripts: $u_j^{n}$, $p_{i,j}$, $u_{i+1/2,j}$.

### Questions

```js
quizzes: {
  q1: { type: 'mcq', q: 'html with $math$', choices: ['…', '…', '…'], answer: 1, explain: '…' },
  q2: { type: 'predict', q: 'Before you press Play: what happens at $\\nu = 1.1$?', choices: […], answer: 0, explain: '…' },
  q3: { type: 'num', q: '…', answer: 0.005, tol: 0.02, unit: 's', explain: '…' },
}
```

Strings in `quizzes`, `glossary` and `pathologies` are ordinary JS strings,
so TeX backslashes are doubled (`'$\\nu$'`). Use `predict` before a figure
the reader is about to run. Every question needs an `explain` that teaches
something, even to a reader who got it right. Aim for 3 to 6 per chapter.
Make the wrong choices genuine misconceptions, not filler.

### Glossary

Give each term the chapter that introduces it. The key is global and unique
across the course (the tests check this). Define it once, use it anywhere.
`section` points at the h2 where the term is explained.

### Pathologies (the rogues' gallery)

Every numerical failure the chapter demonstrates gets a gallery entry:

```js
{
  id: 'cfl-blowup',                 // global, unique
  name: 'CFL violation',
  family: 'stability',              // stability | accuracy | conservation | constraint | solver | resolution | boundary
  symptom: 'What you see: sawtooth wiggles at the grid scale that double every few steps.',
  cause: 'Why: information travels more than one cell per step; the domain of dependence…',
  diagnose: 'How to tell: plot max|u| against step on a log axis; check $\\nu = a\\Delta t/\\Delta x$.',
  mitigations: ['Reduce $\\Delta t$ (adaptive time step from the CFL number).', 'An implicit scheme…', '…'],
  section: 'cfl',                   // h2 id in this chapter
  demo: { widget: 'upwind-cfl', data: { preset: 'unstable' } },   // optional: mounted on request in the gallery
}
```

Mitigations are what practitioners actually do, ranked most-used first. Name
the technique and the trade-off, not just the fix.

## Widgets

A widget is `mount(fig, ctx) → cleanup?`, where `fig` is the `<figure>` and
`ctx = { signal, chapter, go, settings }`.

- `signal` aborts when the reader leaves the chapter. Pass it to `animate`
  and `sliced`, and stop any timers on abort.
- `settings.get(k, d)` and `settings.set(k, v)` remember a control value for
  this reader (best effort).
- `fig.dataset.preset` holds the author's preset. The same widget can appear
  in several places (chapter, gallery, home hero) with different presets.

Widget names are global: the home page and the gallery find a widget by name
in any chapter. Prefix new names with something chapter-specific.

### Kit

```js
import { h, fmt, sci } from '../kit/dom.js';
import { frame, slider, select, toggle, segmented, button, readout, playButton, canvasBox, animate, sliced } from '../kit/widgets.js';
import { Plot } from '../kit/plot.js';
import { FieldView, drawArrows, drawParticles, drawGridLines, arrow } from '../kit/field.js';
import { palette, gradientCss } from '../kit/palette.js';
import { texInHtml, tex } from '../kit/math.js';
```

- `frame(fig, { title, wide, tall })` returns `{ head, stage, controls, readouts, status }`.
  It keeps the author's figcaption.
  - `stage` holds canvases and plots. Add `.cols` for side-by-side panels that stack on phones.
  - `controls` holds controls; `readouts` holds the numbers that move; `status` holds one line of narration.
- Controls return `{ el, value, set(v, { silent }) }`:
  - `slider(parent, { label, min, max, step, value, log, fmt, onInput })`
  - `select(…, { options: [[v, text]…] })`
  - `toggle(…, { checked })`
  - `segmented(…, { options })`
  - `button(parent, { label, onClick })`
  - `readout(parent, { label, fmt }).set(v, 'bad' | 'good' | '')`
- `animate(fig, (dt, now) => …, { autoplay, signal })` runs only while the
  figure is on screen and the tab is visible. Under `prefers-reduced-motion`
  it never autoplays, so give the reader `playButton(controls, loop)`.
- `sliced(generator, { budgetMs, signal })` drains a long computation across
  frames, for convergence studies or sweeps over parameters.
- `canvasBox(parent, { aspect, height, label })` is a DPR-aware canvas whose
  `ctx` draws in CSS pixels. `onResize(fn)` also fires on theme changes. Put
  all drawing in one `draw()` and register it there.
- `new Plot(parent, { x: { label, min, max, log }, y: {…}, aspect, legend, hover })`:
  - `.draw(series, { extra(ctx, tx, ty, area, pal) })`
  - a series is `{ x, y, color: 's1', label, dash, width, points, step }`
  - with three or more series, also vary `dash` so colour is never the only cue.
- `new FieldView(parent, { nx, ny })`:
  - `.draw(values, { map: 'seq' | 'div', lo, hi, solid })`
  - `.overlay((ctx, X, Y, pal) => …)` and `.onDrag(({ gx, gy, dgx, dgy }) => …)`
  - set `view.redraw = draw` so it repaints on resize and theme change
  - data is `values[i + j * nx]`, with row j = 0 at the bottom.

### Colour

Never write a colour literal in a widget or in chapter `css`. Use token names
(`palette().css('s1', 0.5)`, `var(--s1)` in CSS). The tokens are:

- `ink`, `muted`, `line`, `grid`;
- `write` and `read` (the yellow/blue highlight convention of the pressure-solver aid);
- `accent`, and `s1`…`s5` for series (use them in that order and never cycle);
- `good` and `bad` for status only, always beside a word or icon;
- colour maps `seq-*` and `div-*`;
- materials `liquid`, `solid`, `dye`, `particle`.

Sequential maps are for magnitude, diverging maps for signed quantities
(vorticity, divergence, error). Check both themes.

### Behaviour budget

- **First paint under 50 ms.** Mount lazily, then draw a static first frame
  before any animation starts.
- **Under 8 ms of compute per animation frame** on a mid-range phone. Pick grid
  sizes that respect this: about 128×128 for a grid fluid, about 200×80 for
  D2Q9, about 1,500 SPH particles. If a reader's setting would go over budget,
  take fewer steps per frame; never drop frames silently.
- **No allocation in per-frame loops.** Use typed arrays allocated once.
- **Phone width.** At 390 px controls wrap, canvases keep their aspect ratio,
  and nothing scrolls sideways. Touch works: use `pointer*` events and
  `touch-action: none` only on canvases that you can drag.
- **Accessibility.** Give every canvas an `aria-label`. Put the numbers that
  matter in readouts (text, not just pixels). Use `status` to announce
  regime changes ("Blowing up: ν > 1").

### Figures that teach

A figure earns its place by letting the reader *cause* the phenomenon. Show
the reference (exact solution, analytic rate, theoretical slope) beside the
numerical one. Let a single control cross the threshold being taught. Report
the quantity that diagnoses it (amplification factor, residual, mass, total
variation, divergence norm). Presets should include the broken case and the
fixed case.

## Numerical kernels (`src/sims/`)

Kernels are the course's ground truth: the figures run them and the tests
check them. They are the same code.

- **Pure modules.** No DOM, no kit imports, nothing that fails under
  `node --test`. Shared helpers live in `src/sims/util.js`:
  - `rng(seed)`, `gaussian`, `linspace`, `centres`, `wrap`;
  - `norm1`, `norm2`, `normInf`, `totalVariation`, `observedOrders`;
  - `drain`, `countEvents`.
- **Generators where the order is the lesson.** Sweeps, V-cycles, CG
  iterations, a Thomas solve or a Riemann-solver iteration are generators
  that yield trace events (see `util.js`) and return their result. Widgets
  animate the events, and tests drain the same generator.
- **Step functions for time-steppers.** Where only the evolving state
  matters (LBM, SPH, stable fluids), export a `step(state, params)` that
  mutates preallocated typed arrays. Both the widget and the tests call it.
- **Never a display copy.** If a widget needs to show a simplified version,
  that simplification is a parameter of the kernel.
- **Deterministic.** Use seeded `rng()`, never `Math.random()`.
- **Grid conventions.**
  - A cell-centred field is indexed `i + j * nx`, with j = 0 at the bottom.
  - On a MAC grid, `u` has `(nx + 1) × ny` values on vertical faces and `v`
    has `nx × (ny + 1)` on horizontal faces.
  - State units and nondimensionalisation in the header comment.
- **Cite the scheme** in the header (e.g. LeVeque 2002 §6.4; Toro 2009 §4.2;
  Stam 1999). If you deviate from the textbook form, say how and why.
- **Test what the course claims.** If a chapter says "Lax–Wendroff is
  second order" or "Jacobi damps high frequencies by a factor of 1/3 per
  sweep at ω = 2/3", a test measures it. Write tests against analytic
  solutions, conservation, symmetry and observed order of accuracy, not
  snapshots of the kernel's own output.

## History and notation: accuracy rules

- **Facts come from the dossier.** People, dates, attributions and quotations
  come from `src/reference/people-data.js` and the fact-checked research
  dossier. Do not introduce a new date or attribution without a reliable
  source. Where the record is contested, say so, briefly.
- **Two dates when they differ.** If a paper was read in one year and printed
  in another, say which date you mean ("presented 1822, published 1827").
- **No invented quotations.** A quotation must be verbatim and sourced, or
  paraphrased without quotation marks.
- **Know the eponyms.** Things named after people often were not first done
  by them. Where an eponym is misleading, that is worth a sentence.
- **Public sources only.** Describe techniques generically, with published
  citations. Never mention, hint at, or borrow names from any private or
  proprietary codebase.

## Voice

- Write for a curious programmer who knows calculus and some linear algebra,
  but no fluid dynamics.
- Plain English, short sentences, active voice, second person for
  instructions.
- Explain the physical meaning before the formula, then show the formula,
  then let the reader break it.
- Use British spelling, matching the rest of the repo: colour, modelling,
  behaviour.
- No hype and no filler. Every paragraph should either explain, show, or
  hand the reader something to do.

## Checks

```
npm test                                          # all tests, including course integrity
node --test tests/fluid-course/sims-<name>.test.js
npm run serve                                     # then:
  http://localhost:8765/aids/fluid-course/#/advection
  http://localhost:8765/aids/fluid-course/dev/?m=../src/chapters/advection.js
node tools/screenshot.mjs --url 'http://localhost:8765/aids/fluid-course/#/advection' \
  --width 390 --height 844 --theme light --out shot.png
node tools/bundle.mjs aids/fluid-course dist/fluid-course.html
CHAPTER=advection node --test tests/fluid-course/course.test.js   # integrity, one chapter
node tools/check-course.mjs --route advection --interact --frames --shots shots/
```

`tools/check-course.mjs` loads the chapter in headless Chromium at 390 px and
1280 px, in both themes. It reports:

- script errors and TeX errors;
- figures that failed or never mounted;
- anything that scrolls sideways;
- figures whose p95 frame time is over 34 ms.

With `--interact` it also moves every slider to both ends, picks every
option, presses every button and drags across every canvas. It exits
non-zero if anything is broken.

The course integrity test checks:

- every TeX fragment parses;
- every figure has a widget and every quiz is placed;
- h2 ids exist and are unique;
- internal links land;
- glossary, person and pathology references resolve;
- the HTML is balanced;
- the course bundles.

### Bundler constraints

`tools/bundle.mjs` inlines the modules with regular expressions, so:

- Imports are single statements of the form `import { a, b } from './x.js';` or
  `import * as x from './x.js';`, starting at the beginning of a line.
- No default exports, no `export { … }` lists, no re-exports, and no
  dynamic `import()`.
- One name per `export const` or `export let`.
- No top-level `await`.
