// Reference page: milestones in computing flows, as a vertical timeline.
// Filter by the numerical difficulty each one exposed or tamed.

import { h, $$ } from '../kit/dom.js';
import { MILESTONES, KINDS } from './milestones-data.js';
import { parseYear } from './people-data.js';
import { sources } from './people.js';

export const chapter = {
  id: 'milestones',
  title: 'Milestones in computing flows',
  short: 'Milestones',
  blurb: 'From Richardson’s forecast factory to GPU-scale turbulence—the papers and machines that exposed each numerical difficulty, and the ideas that resolved it.',
  render(root, ctx) {
    const items = MILESTONES.slice().sort((a, b) => (parseYear(a.year) ?? 0) - (parseYear(b.year) ?? 0));
    const kinds = Object.keys(KINDS).filter((k) => items.some((m) => m.kind === k));
    let kind = 'all';
    const search = h('input.search', { type: 'search', placeholder: 'Search milestones…', 'aria-label': 'Search milestones' });
    const chips = h(
      'div.chips',
      { role: 'group', 'aria-label': 'Filter by difficulty' },
      ['all', ...kinds].map((k) =>
        h(
          'button.chip',
          {
            type: 'button',
            'aria-pressed': String(k === 'all'),
            dataset: { k },
            onclick: () => {
              kind = k;
              for (const c of $$('.chip', chips)) c.setAttribute('aria-pressed', String(c.dataset.k === k));
              draw();
            },
          },
          k === 'all' ? `All (${items.length})` : KINDS[k],
        ),
      ),
    );
    const list = h('ol.timeline');
    const empty = h('p.muted', { hidden: true }, 'No milestones match.');
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      const sel = items.filter((m) => (kind === 'all' || m.kind === kind) && (!q || `${m.title} ${m.who} ${m.what} ${m.challenge} ${m.work}`.toLowerCase().includes(q)));
      empty.hidden = sel.length > 0;
      let decade = null;
      list.replaceChildren(
        ...sel.flatMap((m) => {
          const y = parseYear(m.year);
          const d = y == null ? null : Math.floor(y / 10) * 10;
          const marker = d !== decade ? h('li.tl-decade', { 'aria-hidden': 'true' }, `${d}s`) : null;
          decade = d;
          return [marker, item(m, ctx)].filter(Boolean);
        }),
      );
    };
    search.addEventListener('input', draw);
    root.append(
      h('header.ch-head', h('p.kicker', 'Reference'), h('h1', chapter.title), h('p.lede', chapter.blurb), h('p.ch-meta', `${items.length} milestones`)),
      h(
        'div.prose',
        h('p', 'Each entry names the difficulty it exposed or resolved—often discovered when a calculation blew up, smeared out, or converged to the wrong answer. Dates are publication years; where a result was presented or circulated earlier, the entry notes both.'),
      ),
      h('div.ref-controls', chips, search),
      list,
      empty,
    );
    if (!items.length) root.append(h('p.stub', 'The milestone data is being compiled.'));
    draw();
  },
};

function item(m, ctx) {
  const chapters = (m.chapters || []).map((id) => ctx.course.byId(id)).filter(Boolean);
  return h(
    'li.tl-item',
    { id: m.id },
    h('p.tl-year', m.year),
    h(
      'article.tl-card',
      m.kind ? h('p.tl-kind', KINDS[m.kind] || m.kind) : null,
      h('h3.tl-title', m.title),
      h('p.tl-who', m.who),
      h('p', m.what),
      m.challenge ? h('p.tl-note', h('b', 'The difficulty: '), m.challenge) : null,
      m.detail ? h('p.tl-note', h('b', 'Detail: '), m.detail) : null,
      m.contested ? h('p.person-contested', h('b', 'Myth check: '), m.contested) : null,
      h('p.tl-work', h('cite', m.work), m.confidence === 'low' ? h('span.unsure', ' (uncertain)') : null),
      chapters.length ? h('p.person-chapters', 'In the course: ', chapters.map((c, k) => [k ? ' · ' : '', h('a', { href: `#/${c.id}` }, c.short || c.title)])) : null,
      m.sources?.length ? sources(m.sources) : null,
    ),
  );
}
