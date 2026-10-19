// Turns a chapter module into a page: math → MathML, figures → mounted
// widgets (lazily, as they near the viewport), quizzes, people asides,
// glossary terms, section anchors, and the read-to-the-end marker.

import { h, $$ } from './dom.js';
import { texInHtml } from './math.js';
import { renderQuiz } from './quiz.js';
import { progress, store } from './store.js';
import { PEOPLE_BY_ID, lifespan, initials } from '../reference/people-data.js';

export const PAGES_BASE = 'https://bearbones.github.io/chalkboard/';

// ctx: { course, signal, go(route) }. Returns the list of section headings.
export function renderChapter(chapter, root, ctx) {
  const errors = [];
  const article = h('article.chapter', { dataset: { chapter: chapter.id } });
  if (chapter.css) article.append(h('style', chapter.css));
  root.replaceChildren(article);
  if (chapter.render) {
    // Custom pages (reference pages) build their own DOM.
    chapter.render(article, ctx);
    hydrate(article, chapter, ctx, errors);
    return { sections: collectSections(article), errors };
  }
  article.append(header(chapter, ctx));
  const prose = h('div.prose', { html: texInHtml(chapter.html || '', errors) });
  article.append(prose);
  hydrate(prose, chapter, ctx, errors);
  article.append(footer(chapter, ctx));
  for (const e of errors) console.warn(`TeX error in ${chapter.id}: ${e.message} in "${e.src}"`);
  return { sections: collectSections(prose), errors };
}

function header(ch, ctx) {
  const nDemos = (ch.html.match(/data-widget=/g) || []).length;
  const nQuiz = (ch.html.match(/data-quiz=/g) || []).length;
  const meta = [ch.minutes ? `about ${ch.minutes} min` : null, nDemos ? `${nDemos} interactive figure${nDemos > 1 ? 's' : ''}` : null, nQuiz ? `${nQuiz} question${nQuiz > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ');
  const part = ctx.course.partOf(ch.id);
  return h(
    'header.ch-head',
    h('p.kicker', part ? `${part.title} · Chapter ${ch.n}` : 'Reference'),
    h('h1', { html: texInHtml(ch.title) }),
    ch.blurb ? h('p.lede', { html: texInHtml(ch.blurb) }) : null,
    meta ? h('p.ch-meta', meta) : null,
  );
}

function footer(ch, ctx) {
  const { prev, next } = ctx.course.neighbours(ch.id);
  const sentinel = h('div.read-sentinel', { 'aria-hidden': 'true' });
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      progress.markRead(ch.id);
      io.disconnect();
    }
  });
  io.observe(sentinel);
  ctx.signal.addEventListener('abort', () => io.disconnect());
  const link = (c, dir) =>
    c ? h('a.pn', { href: `#/${c.id}`, class: dir }, h('span.pn-dir', dir === 'prev' ? '← Previous' : 'Next →'), h('span.pn-title', { html: texInHtml(c.short || c.title) })) : h('span');
  return h('footer.ch-foot', sentinel, h('nav.prevnext', { 'aria-label': 'Chapters' }, link(prev, 'prev'), link(next, 'next')));
}

function collectSections(root) {
  return $$('h2[id]', root).map((el) => ({ id: el.id, title: el.textContent.replace(/#$/, '').trim() }));
}

// Wire up everything that needs JavaScript inside rendered chapter HTML.
export function hydrate(root, chapter, ctx, errors = []) {
  // Section anchors
  for (const hd of $$('h2[id], h3[id]', root)) {
    hd.append(h('a.anchor', { href: `#/${chapter.id}/${hd.id}`, 'aria-label': `Link to section: ${hd.textContent}` }, '#'));
  }
  // Wide tables scroll inside their own box.
  for (const t of $$('table', root)) {
    if (!t.parentElement.classList.contains('table-wrap')) {
      const wrap = h('div.table-wrap');
      t.replaceWith(wrap);
      wrap.append(t);
    }
  }
  // Links to sibling aids: in the repo they're relative; in a bundled copy
  // they go to the published site.
  for (const a of $$('a[data-aid]', root)) {
    const rel = `../${a.dataset.aid}/`;
    a.href = location.pathname.includes('/aids/') ? rel : PAGES_BASE + `aids/${a.dataset.aid}/`;
  }
  for (const a of $$('a[href^="http"]', root)) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  // People asides
  for (const el of $$('aside[data-person]', root)) person(el, ctx);
  // Glossary terms
  for (const el of $$('dfn[data-term]', root)) term(el, ctx);
  // Quizzes
  for (const el of $$('[data-quiz]', root)) {
    const id = el.dataset.quiz;
    const spec = chapter.quizzes?.[id];
    if (!spec) {
      el.textContent = `(missing quiz ${id})`;
      errors.push({ src: id, message: 'missing quiz' });
      continue;
    }
    renderQuiz(el, spec, { onAnswer: (right) => progress.answer(chapter.id, id, right) });
  }
  // Widgets: mount when within ~1 screen of the viewport.
  const figs = $$('[data-widget]', root);
  const mount = (fig) => {
    if (fig.dataset.mounted) return;
    fig.dataset.mounted = '1';
    const name = fig.dataset.widget;
    const fn = chapter.widgets?.[name] || ctx.course.widget(name);
    if (!fn) {
      fig.append(h('p.fig-error', `Missing widget “${name}”.`));
      return;
    }
    try {
      const cleanup = fn(fig, widgetContext(chapter, name, ctx));
      if (typeof cleanup === 'function') ctx.signal.addEventListener('abort', cleanup);
    } catch (err) {
      console.error(err);
      fig.append(h('p.fig-error', `This figure failed to start: ${err.message}`));
    }
  };
  if (typeof IntersectionObserver === 'undefined') figs.forEach(mount);
  else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            io.unobserve(e.target);
            mount(e.target);
          }
        }
      },
      { rootMargin: '600px 0px' },
    );
    figs.forEach((f) => io.observe(f));
    ctx.signal.addEventListener('abort', () => io.disconnect());
  }
}

function widgetContext(chapter, name, ctx) {
  const ns = `w.${chapter.id}.${name}.`;
  return {
    signal: ctx.signal,
    chapter,
    go: ctx.go,
    // Per-widget remembered settings (per viewer, best effort).
    settings: {
      get: (k, d) => store.get(ns + k, d),
      set: (k, v) => store.set(ns + k, v),
    },
  };
}

function person(el, ctx) {
  const p = PEOPLE_BY_ID[el.dataset.person];
  const extra = el.innerHTML.trim();
  el.classList.add('who');
  if (!p) {
    // Unknown id: keep the author's text, flag it for the tests and console.
    console.warn(`unknown person ${el.dataset.person}`);
    return;
  }
  el.replaceChildren(
    h('div.who-mono', { 'aria-hidden': 'true' }, initials(p.name)),
    h(
      'div.who-body',
      h('p.who-name', h('a', { href: `#/people/${p.id}` }, p.name), ' ', h('span.who-years', lifespan(p))),
      extra ? h('div.who-text', { html: texInHtml(extra) }) : h('p.who-text', p.summary),
    ),
  );
}

let pop = null;
function term(el, ctx) {
  const key = el.dataset.term;
  const g = ctx.course.glossary()[key];
  el.classList.add('term');
  if (!g) {
    console.warn(`unknown glossary term ${key}`);
    return;
  }
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-expanded', 'false');
  const show = () => {
    pop ??= h('div.term-pop', { role: 'tooltip' });
    pop.innerHTML = `<p class="term-name">${texInHtml(g.term)}</p><p>${texInHtml(g.def)}</p>${g.chapter && g.chapter !== ctx.current?.() ? `<p class="term-from"><a href="#/${g.chapter}${g.section ? '/' + g.section : ''}">From “${g.chapterTitle}” →</a></p>` : ''}`;
    document.body.append(pop);
    const r = el.getBoundingClientRect();
    const pw = Math.min(340, window.innerWidth - 32);
    pop.style.width = `${pw}px`;
    pop.style.left = `${Math.max(16, Math.min(window.innerWidth - pw - 16, r.left))}px`;
    const below = r.bottom + 8;
    pop.style.top = `${below + window.scrollY}px`;
    pop.hidden = false;
    el.setAttribute('aria-expanded', 'true');
  };
  const hide = () => {
    if (pop) pop.hidden = true;
    el.setAttribute('aria-expanded', 'false');
  };
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    pop && !pop.hidden && el.getAttribute('aria-expanded') === 'true' ? hide() : show();
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      show();
    } else if (e.key === 'Escape') hide();
  });
  el.addEventListener('blur', () => setTimeout(hide, 150));
  ctx.signal.addEventListener('abort', hide);
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', () => {
    if (pop) pop.hidden = true;
  });
}
