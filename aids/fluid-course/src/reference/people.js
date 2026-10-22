// Reference page: the people timeline. A lifelines chart (lifespans packed
// into lanes, dots at each dated contribution) above one card per person.
// Filter by what they did, or search; #/people/<id> lands on a card.

import { h, $$ } from '../kit/dom.js';
import { PEOPLE, lifespan, initials, parseYear, startYear, yearLabel } from './people-data.js';

const TAGS = {
  theory: 'Theory',
  experiment: 'Experiment',
  mathematics: 'Mathematics',
  notation: 'Notation',
  engineering: 'Engineering',
  turbulence: 'Turbulence',
  meteorology: 'Weather',
  computation: 'Computation',
  graphics: 'Graphics',
};

// Chart labels: the name people know them by, short enough for a phone.
const SHORT = { 'william-thomson-kelvin': 'Lord Kelvin', 'lord-rayleigh': 'Lord Rayleigh' };
function shortName(p) {
  if (SHORT[p.id]) return SHORT[p.id];
  const n = p.name.replace(/\s*\(.*?\)/g, '').split(/,(?! )|, (?!.*&)/)[0].trim();
  const parts = n.split(/\s*(?:&|\band\b|,)\s*/).filter(Boolean);
  const surname = (s) => s.trim().split(/\s+/).pop();
  if (parts.length > 2) return `${surname(parts[0])} et al.`;
  if (parts.length === 2) return `${surname(parts[0])} & ${surname(parts[1])}`;
  if (n.length <= 22) return n;
  const w = n.split(/\s+/);
  return `${w[0][0]}. ${w[w.length - 1]}`;
}

const Y0 = 1450; // left edge of the chart; anyone earlier sits in the gutter
const SVG = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  for (const c of children.flat()) if (c != null) el.append(c);
  return el;
}

export const chapter = {
  id: 'people',
  title: 'People and their ideas',
  short: 'People',
  blurb: 'Who worked out how fluids move and how to compute them, from Archimedes to the GPU era—a timeline you can filter and search.',
  render(root, ctx) {
    const people = PEOPLE.filter((p) => Number.isFinite(startYear(p))).sort((a, b) => startYear(a) - startYear(b));
    const now = new Date().getFullYear();
    const tags = Object.keys(TAGS).filter((t) => people.some((p) => p.tags?.includes(t)));
    let tag = 'all';
    const search = h('input.search', { type: 'search', placeholder: 'Search names, works, ideas…', 'aria-label': 'Search people' });
    const chips = h(
      'div.chips',
      { role: 'group', 'aria-label': 'Filter by what they did' },
      ['all', ...tags].map((t) =>
        h(
          'button.chip',
          {
            type: 'button',
            'aria-pressed': String(t === 'all'),
            dataset: { t },
            onclick: () => {
              tag = t;
              for (const c of $$('.chip', chips)) c.setAttribute('aria-pressed', String(c.dataset.t === t));
              update();
            },
          },
          t === 'all' ? `Everyone (${people.length})` : TAGS[t],
        ),
      ),
    );
    const text = (p) => [p.name, p.places, p.summary, p.notation?.join(' '), ...(p.contributions || []).map((c) => `${c.what} ${c.work}`)].join(' ').toLowerCase();
    const index = new Map(people.map((p) => [p.id, text(p)]));
    const shown = () => {
      const q = search.value.trim().toLowerCase();
      return people.filter((p) => (tag === 'all' || p.tags?.includes(tag)) && (!q || index.get(p.id).includes(q)));
    };

    // ---- lifelines chart ----
    const chartHost = h('div.lifelines');
    const fig = h('figure.widget.wide.lifelines-fig', h('div.fig-title', 'Lifelines'), chartHost, h('figcaption', 'Each bar is a life and each dot a dated contribution. Pale bars are people still living; dashed bars are teams or people without a known birth date, drawn across their dated work. Anyone born before 1450 sits in the grey gutter on the left. Tap a name to jump to their card.'));
    let lastWidth = 0;
    const drawChart = (list) => {
      const W = chartHost.clientWidth || 340;
      lastWidth = W;
      const gutter = list.some((p) => startYear(p) < Y0) ? 46 : 0;
      const x = (y) => gutter + ((y - Y0) / (now + 4 - Y0)) * (W - gutter - 6);
      const laneH = 30;
      const laneEnd = [];
      const items = [];
      for (const p of list) {
        const b = startYear(p);
        // No birth date (a team, or a record that only has dates of work):
        // the bar spans their dated contributions instead of a life.
        const career = parseYear(p.born) == null;
        const last = Math.max(b + 1, ...(p.contributions || []).map((c) => parseYear(c.year) ?? -Infinity));
        const d = parseYear(p.died) ?? (career ? last : b > 1880 ? now : b + 1);
        // Before Y0 the scale means nothing: a life fills the gutter.
        const early = b < Y0;
        const x0 = early ? 6 : x(b),
          x1 = early ? gutter - 10 : Math.max(x(Math.min(d, now)), x0 + 3);
        const xAt = early ? (y) => x0 + ((x1 - x0) * Math.max(0, Math.min(1, (y - b) / (d - b || 1)))) : x;
        const label = shortName(p);
        const lw = label.length * 6.3 + 4;
        const anchorEnd = x0 + lw > W - 2;
        const lx = anchorEnd ? Math.max(x1, lw + 2) : x0;
        const occ0 = Math.min(x0, anchorEnd ? lx - lw : x0) - 2;
        const occ1 = Math.max(x1, anchorEnd ? lx : x0 + lw) + 8;
        let lane = laneEnd.findIndex((e) => e < occ0);
        if (lane < 0) lane = laneEnd.push(0) - 1;
        laneEnd[lane] = occ1;
        items.push({ p, label, x0, x1, xAt, lx, anchorEnd, lane, living: !career && !p.died && b > 1880, career, early });
      }
      const H = 24 + laneEnd.length * laneH;
      const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Lifespans of ${list.length} people from ${Y0} to today` });
      const step = W < 520 ? 100 : 50;
      const axis = s('g', { class: 'll-axis' });
      for (let y = Math.ceil(Y0 / step) * step; y <= now; y += step) {
        if (gutter && x(y) < gutter + 22) continue;
        axis.append(s('line', { x1: x(y), x2: x(y), y1: 16, y2: H }), s('text', { x: x(y), y: 11, 'text-anchor': 'middle' }, String(y)));
      }
      if (gutter) axis.append(s('rect', { class: 'll-gutter', x: 0, y: 16, width: gutter - 4, height: H - 16, rx: 4 }), s('text', { x: (gutter - 4) / 2, y: 11, 'text-anchor': 'middle' }, 'earlier'));
      svg.append(axis);
      for (const it of items) {
        const top = 20 + it.lane * laneH;
        const dots = (it.p.contributions || [])
          .map((c) => parseYear(c.year))
          .filter((y) => y != null)
          .map((y) => s('circle', { class: 'll-dot', cx: it.xAt(y), cy: top + 19, r: 2.6 }));
        const g = s(
          'a',
          { href: `#/people/${it.p.id}`, class: `ll-item${it.living ? ' living' : ''}${it.career ? ' career' : ''}${it.early ? ' early' : ''}` },
          s('title', {}, `${it.p.name} ${lifespan(it.p)}`),
          s('text', { x: it.lx, y: top + 10, 'text-anchor': it.anchorEnd ? 'end' : 'start' }, it.label),
          s('rect', { class: 'll-bar', x: it.x0, y: top + 16, width: it.x1 - it.x0, height: 6, rx: 3 }),
          dots,
        );
        svg.append(g);
      }
      chartHost.replaceChildren(svg);
    };
    const ro = new ResizeObserver(() => {
      if (Math.abs((chartHost.clientWidth || 0) - lastWidth) > 4) drawChart(shown());
    });
    ro.observe(chartHost);
    ctx.signal.addEventListener('abort', () => ro.disconnect());

    // ---- cards ----
    const list = h('div.people-list');
    const empty = h('p.muted', { hidden: true }, 'Nobody matches.');
    const cards = new Map(people.map((p) => [p.id, card(p, ctx)]));
    const update = () => {
      const sel = shown();
      empty.hidden = sel.length > 0;
      list.replaceChildren(...sel.map((p) => cards.get(p.id)));
      drawChart(sel);
    };
    search.addEventListener('input', update);

    const nContrib = people.reduce((a, p) => a + (p.contributions?.length || 0), 0);
    root.append(
      h('header.ch-head', h('p.kicker', 'Reference'), h('h1', chapter.title), h('p.lede', chapter.blurb), h('p.ch-meta', `${people.length} people · ${nContrib} dated contributions`)),
      h(
        'div.prose',
        h('p', 'The equations in this course took about three centuries to settle. They passed through academies, private letters, wartime laboratories and graphics conferences. Every date here was checked against at least one primary or scholarly source. Where the usual story is wrong or disputed, the card says so under “Myth check”.'),
      ),
      h('div.ref-controls', chips, search),
      fig,
      list,
      empty,
    );
    if (!people.length) root.append(h('p.stub', 'The people data is being compiled.'));
    update();
  },
};

function card(p, ctx) {
  const chapters = (p.chapters || []).map((id) => ctx.course.byId(id)).filter(Boolean);
  const confNote = (c) => (c.confidence === 'low' ? h('span.unsure', { title: 'Sources are thin or disagree' }, ' (uncertain)') : null);
  return h(
    'article.person',
    { id: p.id },
    h(
      'div.person-head',
      h('div.who-mono', { 'aria-hidden': 'true' }, initials(p.name)),
      h('div', h('h3.person-name', p.name), lifespan(p) ? h('p.person-meta', { title: [p.born && `Born ${p.born}`, p.died && `died ${p.died}`].filter(Boolean).join('; ') }, lifespan(p).replace(/[()]/g, '')) : null),
    ),
    p.places ? h('p.person-places', p.places) : null,
    p.tags?.length ? h('p.person-tags', p.tags.map((t) => h('span.tag', TAGS[t] || t))) : null,
    h('p.person-summary', p.summary),
    p.contributions?.length
      ? h(
          'ul.person-contribs',
          p.contributions.map((c) => {
            const short = yearLabel(c.year);
            return h('li', h('span.yr', { title: c.year }, short), h('span', short !== String(c.year) ? h('span.yr-full', `${c.year}. `) : null, c.what, c.work ? [' ', h('cite', c.work)] : null, confNote(c)));
          }),
        )
      : null,
    p.notation?.length ? h('p.person-note', h('b', 'Notation: '), p.notation.join('; ')) : null,
    p.anecdote ? h('p.person-note', h('b', 'Story: '), p.anecdote) : null,
    p.quote ? h('blockquote.person-quote', h('p', `“${p.quote}”`), p.quote_source ? h('cite', p.quote_source) : null) : null,
    p.contested ? h('p.person-contested', h('b', 'Myth check: '), p.contested) : null,
    chapters.length ? h('p.person-chapters', 'In the course: ', chapters.map((c, k) => [k ? ' · ' : '', h('a', { href: `#/${c.id}` }, c.short || c.title)])) : null,
    p.sources?.length ? sources(p.sources) : null,
  );
}

export function sources(list) {
  return h(
    'details.ref-sources',
    h('summary', `Sources (${list.length})`),
    h(
      'ol',
      list.map((src) => {
        const m = /^(https?:\/\/[^\s]+)/.exec(src);
        if (!m) return h('li', src);
        let label = m[1];
        try {
          const u = new URL(m[1]);
          label = u.hostname.replace(/^www\./, '') + decodeURIComponent(u.pathname).replace(/\/$/, '').slice(0, 60);
        } catch {}
        return h('li', h('a', { href: m[1], target: '_blank', rel: 'noopener' }, label), src.slice(m[1].length));
      }),
    ),
  );
}
