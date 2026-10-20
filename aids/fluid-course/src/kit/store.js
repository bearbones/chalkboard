// Per-viewer conveniences in localStorage (progress, theme, widget settings).
// Storage can be missing or throw (private windows, previews), so every
// access is guarded and the course works without it.

const PREFIX = 'chalkboard.fluids.';

export const store = {
  get(key, fallback) {
    try {
      const v = globalThis.localStorage?.getItem(PREFIX + key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value));
    } catch {}
  },
  remove(key) {
    try {
      globalThis.localStorage?.removeItem(PREFIX + key);
    } catch {}
  },
};

// Progress: { [chapterId]: { read: true, quiz: { [quizId]: 'right' | 'wrong' } } }
const listeners = new Set();
export const progress = {
  all() {
    return store.get('progress', {});
  },
  chapter(id) {
    return this.all()[id] || { read: false, quiz: {} };
  },
  update(id, fn) {
    const all = this.all();
    const cur = all[id] || { read: false, quiz: {} };
    all[id] = fn({ ...cur, quiz: { ...cur.quiz } });
    store.set('progress', all);
    for (const l of listeners) l(id);
  },
  markRead(id) {
    if (!this.chapter(id).read) this.update(id, (c) => ({ ...c, read: true }));
  },
  answer(id, quizId, right) {
    // The first answer counts; retries are for learning.
    if (this.chapter(id).quiz[quizId]) return;
    this.update(id, (c) => ({ ...c, quiz: { ...c.quiz, [quizId]: right ? 'right' : 'wrong' } }));
  },
  reset() {
    store.remove('progress');
    for (const l of listeners) l(null);
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
