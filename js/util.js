// Shared helpers and constants.
window.U = (() => {
  const TENSES = [
    { id: 'presente', label: 'Presente', full: 'Presente do Indicativo', en: 'Present' },
    { id: 'perfeito', label: 'Perfeito', full: 'Pretérito Perfeito', en: 'Past (completed)' },
    { id: 'imperfeito', label: 'Imperfeito', full: 'Pretérito Imperfeito', en: 'Past (habitual / ongoing)' },
    { id: 'futuro', label: 'Futuro', full: 'Futuro do Indicativo', en: 'Future' },
    { id: 'condicional', label: 'Condicional', full: 'Condicional', en: 'Conditional' },
  ];
  const PERSONS = [
    { id: 'eu', label: 'Eu', en: 'I' },
    { id: 'tu', label: 'Tu', en: 'you' },
    { id: 'ele', label: 'Ele / Ela / Você', en: 'he / she / you (formal)' },
    { id: 'nos', label: 'Nós', en: 'we' },
    { id: 'voces', label: 'Vocês', en: 'you (plural)' },
    { id: 'eles', label: 'Eles / Elas', en: 'they' },
  ];

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Storage can be unavailable (private mode, file:// quirks), so never let it throw.
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    },
  };

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const tense = () => store.get('pt.tense', 'presente');
  const tenseMeta = (id) => TENSES.find((t) => t.id === id) || TENSES[0];
  const setTense = (id) => {
    store.set('pt.tense', id);
    window.dispatchEvent(new CustomEvent('tensechange', { detail: id }));
  };

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // "Eu [tento] falar" -> "Eu <b>tento</b> falar"
  const highlight = (pt) => esc(pt).replace(/\[([^\]]+)\]/g, '<b>$1</b>');
  const plain = (pt) => pt.replace(/[[\]]/g, '');

  // Reveal-only toggle: a button with data-reveal toggles .revealed on the closest
  // [data-reveal-scope] and swaps its own label. Nothing is ever graded.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-reveal]');
    if (btn) {
      const scope = btn.closest('[data-reveal-scope]');
      const on = scope.classList.toggle('revealed');
      btn.textContent = on ? btn.dataset.hide : btn.dataset.show;
      return;
    }
    const clear = e.target.closest('[data-clear]');
    if (clear) {
      clear.closest('[data-reveal-scope]').querySelectorAll('input, textarea').forEach((el) => { el.value = ''; });
      return;
    }
    const line = e.target.closest('.sentence');
    if (line && !e.target.closest('a, button, input, textarea')) line.classList.toggle('open');
  });

  const revealBtn = (show = 'Show answers', hide = 'Hide answers') =>
    `<button type="button" class="btn btn-sm btn-outline-primary" data-reveal data-show="${esc(show)}" data-hide="${esc(hide)}">${esc(show)}</button>`;
  const clearBtn = () => '<button type="button" class="btn btn-sm btn-outline-secondary" data-clear>Clear</button>';

  // A PT sentence whose English appears on click.
  const sentence = (pt, en, tag = 'li') =>
    `<${tag} class="sentence"><span class="pt">${highlight(pt)}</span><span class="en">${esc(en)}</span></${tag}>`;

  return { TENSES, PERSONS, esc, store, shuffle, tense, tenseMeta, setTense, cap, highlight, plain, revealBtn, clearBtn, sentence };
})();
