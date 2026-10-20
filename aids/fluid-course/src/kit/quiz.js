// "Check yourself" questions. Specs live in a chapter's `quizzes` map:
//
//   { type: 'mcq', q: 'html with $math$', choices: ['…', '…'], answer: 1, explain: '…' }
//   { type: 'predict', … }   same shape, framed as "predict, then try it"
//   { type: 'num', q: '…', answer: 0.5, tol: 0.02, unit: 'm/s', explain: '…' }
//
// tol is relative (default 2%); atol, if given, is absolute. The first answer
// is recorded in progress; the reader can keep trying after that.

import { h } from './dom.js';
import { texInHtml } from './math.js';

const KICKER = { mcq: 'Check yourself', predict: 'Predict, then try it', num: 'Work it out' };

export function renderQuiz(el, spec, { onAnswer } = {}) {
  const type = spec.type || 'mcq';
  el.classList.add('quiz', `quiz-${type}`);
  const html = (s) => texInHtml(s || '');
  const feedback = h('div.quiz-feedback', { hidden: true, 'aria-live': 'polite' });
  let answered = false;
  const reveal = (right, chosenText) => {
    feedback.hidden = false;
    feedback.className = `quiz-feedback ${right ? 'right' : 'wrong'}`;
    const verdict = type === 'predict' ? (right ? 'Good prediction.' : 'Not quite. Try it and see why.') : right ? 'Right.' : chosenText ? 'Not quite.' : 'Not quite.';
    feedback.innerHTML = `<p class="verdict">${right ? '✓' : '✗'} ${verdict}</p>${spec.explain ? `<div class="explain">${html(spec.explain)}</div>` : ''}`;
    if (!answered) onAnswer?.(right);
    answered = true;
  };
  const body = [h('p.quiz-kicker', KICKER[type] || KICKER.mcq), h('div.quiz-q', { html: html(spec.q) })];
  if (type === 'num') {
    const input = h('input.quiz-input', { type: 'text', inputmode: 'decimal', 'aria-label': 'your answer', autocomplete: 'off' });
    const check = h('button.btn', { type: 'button' }, 'Check');
    const submit = () => {
      const v = parseNumber(input.value);
      if (v == null) {
        feedback.hidden = false;
        feedback.className = 'quiz-feedback';
        feedback.textContent = 'Enter a number, e.g. 0.25 or 2.5e-3.';
        return;
      }
      const err = Math.abs(v - spec.answer);
      const ok = spec.atol != null ? err <= spec.atol : err <= Math.abs(spec.answer) * (spec.tol ?? 0.02) + 1e-12;
      reveal(ok);
    };
    check.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => e.key === 'Enter' && submit());
    body.push(h('div.quiz-numrow', input, spec.unit ? h('span.quiz-unit', { html: html(spec.unit) }) : null, check));
  } else {
    const list = h('div.quiz-choices', { role: 'group' });
    spec.choices.forEach((c, k) => {
      const b = h('button.quiz-choice', { type: 'button', html: html(c) });
      b.addEventListener('click', () => {
        for (const other of list.children) other.classList.remove('chosen', 'right', 'wrong');
        const right = k === spec.answer;
        b.classList.add('chosen', right ? 'right' : 'wrong');
        if (!right && type !== 'predict') list.children[spec.answer].classList.add('right');
        reveal(right, c);
      });
      list.append(b);
    });
    body.push(list);
  }
  body.push(feedback);
  el.replaceChildren(...body);
}

// Accepts 0.25, -1e-3, 2.5×10^-3, 1/3, 25%.
export function parseNumber(s) {
  s = String(s).trim().replace(/−/g, '-').replace(/,/g, '').replace(/\s+/g, '');
  if (!s) return null;
  let m = /^([-+]?\d*\.?\d+)(?:[x×*]10\^?([-+]?\d+))$/i.exec(s);
  if (m) return Number(m[1]) * 10 ** Number(m[2]);
  m = /^([-+]?\d*\.?\d+)\/(\d*\.?\d+)$/.exec(s);
  if (m) return Number(m[1]) / Number(m[2]);
  m = /^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)%$/i.exec(s);
  if (m) return Number(m[1]) / 100;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}
