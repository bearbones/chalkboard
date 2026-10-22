// The course shell: hash router (#/chapter/section), sidebar contents with
// progress, the home page, and the theme toggle.

import { h, $ } from './kit/dom.js';
import { texInHtml } from './kit/math.js';
import { renderChapter, hydrate } from './kit/render.js';
import { progress, store } from './kit/store.js';
import { course, PARTS, REFERENCE } from './course.js';

const view = $('#view');
const toc = $('#toc');
const menu = $('#menu');
const crumb = $('#crumb');
const themeBtn = $('#theme');
let current = null; // { id, controller }

// ---- theme --------------------------------------------------------------------
const THEMES = ['auto', 'light', 'dark'];
const THEME_LABEL = { auto: 'Theme: match system', light: 'Theme: whiteboard (light)', dark: 'Theme: chalkboard (dark)' };
function applyTheme(t) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  themeBtn.dataset.mode = t;
  themeBtn.title = THEME_LABEL[t];
  themeBtn.setAttribute('aria-label', THEME_LABEL[t]);
}
applyTheme(store.get('theme', 'auto'));
themeBtn.addEventListener('click', () => {
  const t = THEMES[(THEMES.indexOf(themeBtn.dataset.mode) + 1) % THEMES.length];
  store.set('theme', t);
  applyTheme(t);
});

// ---- routing ------------------------------------------------------------------
// #/advection/cfl → chapter 'advection', section 'cfl'. A bare #advection also
// works (artifact links only carry plain anchors). An unknown token that is
// an element id on the current page just scrolls there.
function parse() {
  const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [id, section] = raw.split('/');
  return { id: id || '', section: section || '' };
}

function route() {
  const { id, section } = parse();
  if (id && !course.byId(id)) {
    const el = document.getElementById(id);
    if (el && current) return el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const target = course.byId(id) ? id : '';
  if (!current || current.id !== target) show(target);
  closeMenu();
  if (section) {
    requestAnimationFrame(() => {
      const el = document.getElementById(section);
      if (!el) return;
      if (el.tagName === 'DETAILS') el.open = true; // a symbol tile or a "go deeper" box
      el.scrollIntoView({ block: 'start' });
    });
  }
}

function show(id) {
  current?.controller.abort();
  const controller = new AbortController();
  current = { id, controller };
  const ctx = { course, signal: controller.signal, go, current: () => current?.id };
  window.scrollTo(0, 0);
  let sections = [];
  if (!id) {
    renderHome(ctx);
    document.title = 'Fluids by the Numbers';
    crumb.textContent = '';
  } else {
    const ch = course.byId(id);
    ({ sections } = renderChapter(ch, view, ctx));
    document.title = `${ch.short || ch.title} · Fluids by the Numbers`;
    crumb.textContent = ch.n ? `${ch.n}. ${ch.short || ch.title}` : ch.short || ch.title;
  }
  current.sections = sections;
  renderToc(id, sections);
  view.focus({ preventScroll: true });
}

function go(route) {
  location.hash = route.startsWith('#') ? route : `#/${route}`;
}

// ---- sidebar contents ---------------------------------------------------------
function status(id) {
  const p = progress.chapter(id);
  const ch = course.byId(id);
  const total = Object.keys(ch.quizzes || {}).length;
  const right = Object.values(p.quiz).filter((v) => v === 'right').length;
  return { read: p.read, total, right, answered: Object.keys(p.quiz).length };
}

function renderToc(activeId, sections = []) {
  const item = (ch) => {
    const st = status(ch.id);
    const active = ch.id === activeId;
    const li = h(
      'li',
      { class: active ? 'active' : null },
      h(
        'a',
        { href: `#/${ch.id}`, 'aria-current': active ? 'page' : null },
        ch.n ? h('span.toc-n', String(ch.n)) : null,
        h('span.toc-t', ch.short || ch.title),
        st.read ? h('span.toc-done', { title: 'read', 'aria-label': 'read' }, '✓') : null,
      ),
    );
    if (active && sections.length) {
      li.append(h('ol.toc-sections', sections.map((s) => h('li', h('a', { href: `#/${ch.id}/${s.id}` }, s.title)))));
    }
    return li;
  };
  const read = course.chapters.filter((c) => progress.chapter(c.id).read).length;
  toc.replaceChildren(
    h('a.toc-home', { href: '#/', class: activeId ? null : 'active' }, 'Course map'),
    ...PARTS.map((p) => h('section.toc-part', h('p.toc-part-title', h('span.toc-numeral', p.numeral), p.name), h('ol', p.chapters.map(item)))),
    h('section.toc-part', h('p.toc-part-title', 'Reference'), h('ol.toc-ref', REFERENCE.map(item))),
    h('p.toc-progress', `${read} of ${course.chapters.length} chapters read`),
  );
}

progress.subscribe(() => {
  if (current) renderToc(current.id, current.sections || []);
});

// ---- mobile menu --------------------------------------------------------------
function closeMenu() {
  document.body.classList.remove('menu-open');
  menu.setAttribute('aria-expanded', 'false');
}
menu.addEventListener('click', () => {
  const open = !document.body.classList.contains('menu-open');
  document.body.classList.toggle('menu-open', open);
  menu.setAttribute('aria-expanded', String(open));
});
$('#scrim').addEventListener('click', closeMenu);
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

// ---- home ---------------------------------------------------------------------
function renderHome(ctx) {
  const next = course.chapters.find((c) => !progress.chapter(c.id).read);
  const started = course.chapters.some((c) => progress.chapter(c.id).read);
  const card = (ch) => {
    const st = status(ch.id);
    return h(
      'a.ch-card',
      { href: `#/${ch.id}` },
      h('span.ch-card-n', ch.n ? String(ch.n) : ''),
      h(
        'span.ch-card-body',
        h('span.ch-card-title', { html: texInHtml(ch.title) }),
        h('span.ch-card-blurb', { html: texInHtml(ch.blurb || '') }),
        h('span.ch-card-meta', [ch.minutes ? `${ch.minutes} min` : null, st.read ? '✓ read' : null, st.answered ? `${st.right}/${st.total} questions right` : null].filter(Boolean).join(' · ')),
      ),
    );
  };
  const home = h(
    'article.home',
    h(
      'header.hero',
      h('p.kicker', 'chalkboard · an interactive course'),
      h('h1.hero-title', 'Fluids by the Numbers'),
      h(
        'p.hero-lede',
        'How we describe moving fluids, how we turn those descriptions into arithmetic a computer can do, and what goes wrong when we try. Every figure here runs a real solver in your browser, and you can break it.',
      ),
      course.widget('vortex-street') ? h('figure.hero-fig', { dataset: { widget: 'vortex-street', preset: 'hero' } }) : null,
      h(
        'div.hero-actions',
        h('a.btn.primary.big', { href: `#/${(next || course.chapters[0]).id}` }, started && next ? `Continue: ${next.short || next.title}` : 'Start with chapter 1'),
        h('a.btn.big', { href: '#/pathologies' }, 'Browse the pathologies'),
      ),
    ),
    h(
      'section.how',
      h('h2', 'How this course works'),
      h(
        'ul.how-list',
        h('li', h('b', 'Run, then read. '), 'Each chapter is built around live figures. Drag the sliders past the safe limits on purpose, since most of the lessons are in the failures.'),
        h('li', h('b', 'People and notation. '), 'The asides tell you who worked each idea out, and when. The notation chapter and the symbols page explain where ∂, ∇ and Re came from.'),
        h('li', h('b', 'Check yourself. '), 'Short questions, some of them asking you to predict before you run, keep track of what you have learned on this device.'),
      ),
    ),
    ...PARTS.map((p) =>
      h('section.map-part', h('p.kicker', `Part ${p.numeral}`), h('h2', p.name), h('p.part-blurb', p.blurb), h('div.ch-cards', p.chapters.map(card))),
    ),
    h('section.map-part', h('p.kicker', 'Reference'), h('h2', 'Look things up'), h('div.ch-cards.ref', REFERENCE.map(card))),
    h(
      'footer.home-foot',
      h('p', 'Part of ', h('a', { href: 'https://github.com/bearbones/chalkboard' }, 'chalkboard'), ', a set of teaching aids that run the real algorithm. Progress is kept only in this browser.'),
      h('button.btn.ghost.small', { type: 'button', onclick: () => progress.reset() }, 'Reset my progress'),
    ),
  );
  view.replaceChildren(home);
  hydrate(home, { id: 'home', widgets: {}, quizzes: {} }, ctx);
}

// ---- boot -----------------------------------------------------------------------
window.addEventListener('hashchange', route);
route();
window.__chalkboard = { ready: true, go, course };
