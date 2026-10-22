// Reference page: the symbols atlas. One tile per symbol (rendered from its
// TeX), grouped by family; open a tile for who introduced it, how they
// wrote it, and how it reached the modern page.

import { h, $$ } from '../kit/dom.js';
import { tex } from '../kit/math.js';
import { NOTATION, GROUPS } from './notation-data.js';
import { parseYear, yearLabel } from './people-data.js';
import { sources } from './people.js';

const safeTex = (src, display = false) => {
  try {
    return tex(src, { display });
  } catch {
    return `<code>${src.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</code>`;
  }
};

export const chapter = {
  id: 'symbols',
  title: 'Symbols and where they came from',
  short: 'Symbols',
  blurb: 'Every symbol the course uses, who introduced it, and how it changed on its way to the modern page.',
  render(root, ctx) {
    const items = NOTATION.slice().sort((a, b) => (parseYear(a.year) ?? 9999) - (parseYear(b.year) ?? 9999));
    const groups = Object.keys(GROUPS).filter((g) => items.some((n) => n.group === g));
    let group = 'all';
    const search = h('input.search', { type: 'search', placeholder: 'Search symbols…', 'aria-label': 'Search symbols' });
    const chips = h(
      'div.chips',
      { role: 'group', 'aria-label': 'Filter by family' },
      ['all', ...groups].map((g) =>
        h(
          'button.chip',
          {
            type: 'button',
            'aria-pressed': String(g === 'all'),
            dataset: { g },
            onclick: () => {
              group = g;
              for (const c of $$('.chip', chips)) c.setAttribute('aria-pressed', String(c.dataset.g === g));
              draw();
            },
          },
          g === 'all' ? `All (${items.length})` : GROUPS[g],
        ),
      ),
    );
    const grid = h('div.sym-grid');
    const empty = h('p.muted', { hidden: true }, 'No symbols match.');
    const tiles = new Map(items.map((n) => [n.id, tile(n, ctx)]));
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      const sel = items.filter((n) => (group === 'all' || n.group === group) && (!q || `${n.symbol} ${n.name} ${n.meaning} ${n.introduced_by} ${n.story}`.toLowerCase().includes(q)));
      empty.hidden = sel.length > 0;
      grid.replaceChildren(...sel.map((n) => tiles.get(n.id)));
    };
    search.addEventListener('input', draw);
    root.append(
      h('header.ch-head', h('p.kicker', 'Reference'), h('h1', chapter.title), h('p.lede', chapter.blurb), h('p.ch-meta', `${items.length} symbols and names`)),
      h(
        'div.prose',
        h('p', 'Compact notation makes equations easier to manipulate, though many of the standard symbols in fluid dynamics took decades of debate to settle. Open a tile to see who introduced each symbol, how it was originally written, and how it became standard.'),
      ),
      h('div.ref-controls', chips, search),
      grid,
      empty,
    );
    if (!items.length) root.append(h('p.stub', 'The symbol data is being compiled.'));
    draw();
  },
};

function tile(n, ctx) {
  const chapters = (n.chapters || []).map((id) => ctx.course.byId(id)).filter(Boolean);
  const el = h(
    'details.sym',
    { id: n.id },
    h(
      'summary',
      h('span.sym-glyph', { html: n.tex ? safeTex(n.tex) : '' }, n.tex ? null : n.symbol),
      h('span.sym-name', n.name),
      h('span.sym-when', [yearLabel(n.year), n.introduced_by].filter(Boolean).join(' · ')),
    ),
    h(
      'div.sym-body',
      h('p', n.meaning),
      n.year && yearLabel(n.year) !== n.year ? h('p.tl-note', h('b', 'When: '), n.year) : null,
      n.story ? h('p', n.story) : null,
      n.original_form ? h('div.sym-orig', h('p.patho-label', 'As first written'), h('div', { html: safeTex(n.original_form, true) })) : null,
      n.first_work ? h('p.tl-note', h('b', 'First appears in: '), h('cite', n.first_work)) : null,
      n.popularised_by ? h('p.tl-note', h('b', 'Made standard by: '), n.popularised_by) : null,
      n.contested ? h('p.person-contested', h('b', 'Myth check: '), n.contested) : null,
      n.confidence === 'low' ? h('p.unsure', 'The record here is thin; treat the attribution as uncertain.') : null,
      chapters.length ? h('p.person-chapters', 'In the course: ', chapters.map((c, k) => [k ? ' · ' : '', h('a', { href: `#/${c.id}` }, c.short || c.title)])) : null,
      n.sources?.length ? sources(n.sources) : null,
    ),
  );
  return el;
}
