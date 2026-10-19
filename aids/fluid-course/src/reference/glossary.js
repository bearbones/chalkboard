// Reference page: the glossary, gathered from every chapter's `glossary` map.
// Terms in chapter text (<dfn data-term="key">) pop up the same definitions.

import { h } from '../kit/dom.js';
import { texInHtml } from '../kit/math.js';

export const chapter = {
  id: 'glossary',
  title: 'Glossary',
  short: 'Glossary',
  blurb: 'Every term the course defines, in one place, with a link to where it is explained.',
  render(root, ctx) {
    const entries = Object.entries(ctx.course.glossary())
      .map(([key, g]) => ({ key, ...g, sort: g.term.replace(/[$\\{}]/g, '').toLowerCase() }))
      .sort((a, b) => a.sort.localeCompare(b.sort));
    const search = h('input#glossary-search.search', { type: 'search', placeholder: 'Filter terms…', 'aria-label': 'Filter terms' });
    const list = h('dl.glossary');
    const empty = h('p.muted', { hidden: true }, 'No terms match.');
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      const shown = entries.filter((e) => !q || e.sort.includes(q) || e.def.toLowerCase().includes(q));
      empty.hidden = shown.length > 0;
      list.replaceChildren(
        ...shown.flatMap((e) => [
          h('dt', { id: `g-${e.key}`, html: texInHtml(e.term) }),
          h('dd', h('span', { html: texInHtml(e.def) }), ' ', h('a.g-from', { href: `#/${e.chapter}${e.section ? '/' + e.section : ''}` }, `${e.chapterTitle} →`)),
        ]),
      );
    };
    search.addEventListener('input', draw);
    root.append(h('header.ch-head', h('p.kicker', 'Reference'), h('h1', chapter.title), h('p.lede', chapter.blurb), h('p.ch-meta', `${entries.length} terms`)), h('div.prose', search, empty, list));
    draw();
  },
};
