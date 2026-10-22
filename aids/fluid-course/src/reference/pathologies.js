// Reference page: the rogues' gallery. Every chapter lists the numerical
// pathologies it teaches (chapter.pathologies); this page gathers them by
// family, with symptom → cause → diagnosis → mitigations, a link back to the
// section, and (on request) a live demo mounted from the chapter's widgets.

import { h, $$ } from '../kit/dom.js';
import { texInHtml } from '../kit/math.js';
import { hydrate } from '../kit/render.js';

export const FAMILIES = {
  stability: { name: 'Stability', blurb: 'The solution grows without bound or oscillates wildly.' },
  accuracy: { name: 'Accuracy', blurb: 'The solution stays bounded but is smeared, wiggly, or slightly wrong.' },
  conservation: { name: 'Conservation', blurb: 'Mass, momentum or energy drift; shocks move at the wrong speed.' },
  constraint: { name: 'Constraints', blurb: 'Incompressibility and pressure coupling go wrong.' },
  solver: { name: 'Solvers', blurb: 'Iterations stall, or converge to the wrong thing.' },
  resolution: { name: 'Resolution', blurb: 'The grid cannot hold the physics, so something has to give.' },
  boundary: { name: 'Boundaries', blurb: 'Walls, inlets and outlets misbehave.' },
};

export const chapter = {
  id: 'pathologies',
  title: 'The rogues’ gallery',
  short: 'Pathologies',
  blurb: 'Every numerical pathology in the course: what it looks like, why it happens, how to diagnose it, and how practitioners fight it.',
  render(root, ctx) {
    const all = ctx.course.pathologies();
    const fams = Object.keys(FAMILIES).filter((f) => all.some((p) => p.family === f));
    let filter = 'all';
    const grid = h('div.patho-grid');
    const chips = h(
      'div.chips',
      { role: 'group', 'aria-label': 'Filter by family' },
      ['all', ...fams].map((f) =>
        h(
          'button.chip',
          {
            type: 'button',
            'aria-pressed': String(f === 'all'),
            dataset: { f },
            onclick: () => {
              filter = f;
              for (const c of $$('.chip', chips)) c.setAttribute('aria-pressed', String(c.dataset.f === f));
              draw();
            },
          },
          f === 'all' ? `All (${all.length})` : `${FAMILIES[f].name} (${all.filter((p) => p.family === f).length})`,
        ),
      ),
    );
    const draw = () => {
      grid.replaceChildren(
        ...all
          .filter((p) => filter === 'all' || p.family === filter)
          .map((p) => {
            const demoHost = h('div.patho-demo');
            const card = h(
              'article.patho',
              { id: p.id },
              h('p.patho-family', FAMILIES[p.family]?.name || p.family),
              h('h2.patho-name', { html: texInHtml(p.name) }),
              h('dl.patho-dl', row('Symptom', p.symptom), row('Cause', p.cause), row('Diagnose', p.diagnose)),
              h('div.patho-fix', h('p.patho-label', 'Mitigations'), h('ul', p.mitigations.map((m) => h('li', { html: texInHtml(m) })))),
              h(
                'p.patho-links',
                h('a', { href: `#/${p.chapter}${p.section ? '/' + p.section : ''}` }, `Read it in “${p.chapterTitle}” →`),
                p.demo
                  ? h(
                      'button.btn.small',
                      {
                        type: 'button',
                        onclick: (e) => {
                          e.currentTarget.remove();
                          const fig = h('figure', { dataset: { widget: p.demo.widget, ...(p.demo.data || {}) } });
                          demoHost.append(fig);
                          hydrate(demoHost, ctx.course.byId(p.chapter), ctx);
                        },
                      },
                      'Show the demo here',
                    )
                  : null,
              ),
              demoHost,
            );
            return card;
          }),
      );
    };
    root.append(
      h(
        'header.ch-head',
        h('p.kicker', 'Reference'),
        h('h1', chapter.title),
        h('p.lede', chapter.blurb),
        h('p.ch-meta', `${all.length} pathologies from ${new Set(all.map((p) => p.chapter)).size} chapters`),
      ),
      h('div.prose', h('p', 'Numerical methods fail in a small number of recognisable ways. Recognising the visual or numerical symptom usually points directly to the underlying cause. Each card links back to the chapter that explains it.')),
      chips,
      grid,
    );
    draw();
  },
};

function row(label, html) {
  return [h('dt', label), h('dd', { html: texInHtml(html || '') })];
}
