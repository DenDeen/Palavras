// Flashcards with a simple Leitner system (boxes 1–5) kept in localStorage.
window.Flashcards = (() => {
  const { esc, PERSONS, tense, tenseMeta, shuffle, store, plain } = U;
  const MAX_BOX = 5;

  // Deck ids: "s:<section>", "s:<section>:<group>", "t:<section>" (table cards),
  // "v:<from>-<to>" (infinitives), "c:<from>-<to>" (conjugations in the current tense).
  // Returned as titled groups for the deck picker; `sub` marks indented entries.
  const deckOptions = () => {
    const data = window.APP_DATA;
    const words = [];
    data.sections.forEach((s) => {
      words.push({ id: `s:${s.id}`, label: `${s.title} (all)` });
      if ((s.groups || []).length > 1) {
        s.groups.forEach((g, i) => words.push({ id: `s:${s.id}:${i}`, label: g.title, sub: true }));
      }
      if ((s.tables || []).some((t) => (t.cards || []).length)) words.push({ id: `t:${s.id}`, label: 'tables', sub: true });
    });
    const last = data.verbs.length ? data.verbs[data.verbs.length - 1].n : 180;
    const ranges = [];
    for (let a = 1; a <= last; a += 30) ranges.push([a, Math.min(a + 29, last)]);
    return [
      { title: 'Words', items: words },
      { title: 'Verbs · meaning', items: ranges.map(([a, b]) => ({ id: `v:${a}-${b}`, label: `Verbos ${a}–${b}` })) },
      { title: 'Verbs · conjugations (selected tense)', items: ranges.map(([a, b]) => ({ id: `c:${a}-${b}`, label: `Verbos ${a}–${b}` })) },
    ];
  };

  const buildDeck = (deckId) => {
    const data = window.APP_DATA;
    const [kind, a, b] = deckId.split(':');
    if (kind === 's' || kind === 't') {
      const s = data.sections.find((x) => x.id === a);
      if (!s) return [];
      if (kind === 't') {
        return (s.tables || []).flatMap((t) => (t.cards || []).map((c) => ({
          id: `t:${s.id}:${c.front}`, pt: c.front, en: c.back, hint: t.title,
        })));
      }
      const groups = b === undefined ? (s.groups || []) : [s.groups[+b]].filter(Boolean);
      return groups.flatMap((g) => g.items.map((it) => ({
        id: `w:${s.id}:${it.n ?? ""}:${it.pt}`, pt: it.pt, en: it.en, note: it.note, ex: it.ex,
      })));
    }
    const [from, to] = a.split('-').map(Number);
    const verbs = data.verbs.filter((v) => !v.dup && v.n >= from && v.n <= to);
    if (kind === 'v') {
      return verbs.map((v) => ({ id: `vi:${v.inf}`, pt: v.inf, en: v.en, ex: v.quick && v.quick[0] }));
    }
    const t = tense();
    return verbs.flatMap((v) => PERSONS.filter((p) => v.conj[t][p.id]).map((p) => {
      const ex = (v.examples[t] || []).find((e) => e.p === p.id);
      return {
        id: `vc:${v.inf}:${t}:${p.id}`,
        pt: v.conj[t][p.id], en: `${v.inf} · ${p.label} · ${tenseMeta(t).label}`, hint: v.en,
        ex: ex && { pt: plain(ex.pt), en: ex.en },
      };
    }));
  };


  // Union of several decks, without duplicate cards.
  const buildDecks = (ids) => {
    const seen = new Set();
    return ids.flatMap(buildDeck).filter((c) => !seen.has(c.id) && seen.add(c.id));
  };

  const page = (el, params) => {
    const groups = deckOptions();
    const allIds = groups.flatMap((g) => g.items.map((o) => o.id));
    const state = store.get('pt.fc', { decks: [allIds[0]], dir: 'pt-en', hideMastered: true });
    if (!state.decks) state.decks = state.deck ? [state.deck] : [allIds[0]]; // older single-deck format
    if (params.get('deck')) state.decks = [params.get('deck')];
    state.decks = state.decks.filter((id) => allIds.includes(id));
    let boxes = store.get('pt.leitner', {});
    let order = []; // this round's sequence; "Again" re-inserts cards further ahead
    let pos = 0;
    let flipped = false;

    el.innerHTML = `
      <h2>Flashcards</h2>
      <details class="card mb-3" id="fc-decks">
        <summary class="card-header" id="fc-summary"></summary>
        <div class="card-body">
          ${groups.map((g) => `
            <h6 class="mt-2">${esc(g.title)}</h6>
            <div class="deck-list">${g.items.map((o) => `
              <div class="form-check ${o.sub ? 'ms-4' : ''}">
                <input class="form-check-input" type="checkbox" value="${esc(o.id)}" id="d-${esc(o.id)}" ${state.decks.includes(o.id) ? 'checked' : ''}>
                <label class="form-check-label" for="d-${esc(o.id)}">${esc(o.label)}</label>
              </div>`).join('')}</div>`).join('')}
          <button class="btn btn-sm btn-outline-secondary mt-3" id="fc-none">Select none</button>
        </div>
      </details>
      <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
        <select class="form-select form-select-sm w-auto" id="fc-dir">
          <option value="pt-en" ${state.dir === 'pt-en' ? 'selected' : ''}>Português → English</option>
          <option value="en-pt" ${state.dir === 'en-pt' ? 'selected' : ''}>English → Português</option>
        </select>
        <div class="form-check mb-0">
          <input class="form-check-input" type="checkbox" id="fc-hide" ${state.hideMastered ? 'checked' : ''}>
          <label class="form-check-label small" for="fc-hide">Skip mastered (box ${MAX_BOX})</label></div>
        <button class="btn btn-sm btn-outline-secondary" id="fc-restart">Shuffle / restart</button>
      </div>
      <div id="fc-stage"></div>
      <div class="d-flex flex-wrap gap-3 small text-muted mt-3" id="fc-stats"></div>
      <p class="small text-muted mt-2 d-none d-md-block">Keys: <kbd>Space</kbd> flip · <kbd>h</kbd>/<kbd>p</kbd>/<kbd>←</kbd> previous ·
        <kbd>l</kbd>/<kbd>n</kbd>/<kbd>→</kbd> next · <kbd>1</kbd> again · <kbd>2</kbd> got it.</p>
      <p class="small text-muted mt-2 d-md-none">Tap the card to flip · swipe left/right for next/previous.</p>
      <button class="btn btn-link btn-sm p-0" id="fc-reset">Reset progress for the selected decks</button>`;

    const stage = el.querySelector('#fc-stage');
    const current = () => order[pos] || null;

    const stats = () => {
      const counts = [0, 0, 0, 0, 0];
      buildDecks(state.decks).forEach((c) => { counts[(boxes[c.id] || 1) - 1]++; });
      el.querySelector('#fc-stats').innerHTML =
        `<span>Card <b>${Math.min(pos + 1, order.length)}</b> / ${order.length}</span>`
        + counts.map((n, i) => `<span>Box ${i + 1}: ${n}</span>`).join('');
    };

    const start = () => {
      store.set('pt.fc', state);
      let deck = buildDecks(state.decks);
      el.querySelector('#fc-summary').textContent =
        `Decks: ${state.decks.length} selected · ${deck.length} cards (click to choose)`;
      if (state.hideMastered) deck = deck.filter((c) => (boxes[c.id] || 1) < MAX_BOX);
      // Lower boxes first, random within a box.
      order = shuffle(deck).sort((x, y) => (boxes[x.id] || 1) - (boxes[y.id] || 1));
      pos = 0;
      flipped = false;
      render();
    };

    const face = (c, side) => {
      const showPt = (side === 'front') === (state.dir === 'pt-en');
      if (showPt) return `<div class="fc-word">${esc(c.pt)}</div>`;
      return `<div class="fc-word">${esc(c.en)}</div>${c.hint ? `<div class="text-muted small">${esc(c.hint)}</div>` : ''}`;
    };

    const render = () => {
      const c = current();
      if (!c) {
        stage.innerHTML = order.length
          ? `<div class="alert alert-success">Round done!
              <button class="btn btn-sm btn-success ms-2" id="fc-again">Go again</button>
              <button class="btn btn-sm btn-outline-secondary ms-1" id="fc-back">‹ Back</button></div>`
          : '<div class="alert alert-info">No cards: pick one or more decks above (or untick "Skip mastered").</div>';
        const again = stage.querySelector('#fc-again');
        if (again) again.onclick = start;
        const back = stage.querySelector('#fc-back');
        if (back) back.onclick = prev;
        stats();
        return;
      }
      stage.innerHTML = `
        <div class="card fc-card text-center mb-3" id="fc-card" role="button" tabindex="0">
          <div class="card-body d-flex flex-column justify-content-center">
            <div class="small text-muted mb-2">box ${boxes[c.id] || 1}</div>
            ${face(c, 'front')}
            <div class="${flipped ? '' : 'd-none'} mt-3 pt-3 border-top">
              ${face(c, 'back')}
              ${c.note ? `<div class="small text-muted mt-1">${esc(c.note)}</div>` : ''}
              ${c.ex ? `<div class="mt-3"><div>${esc(c.ex.pt)}</div><div class="text-muted small">${esc(c.ex.en)}</div></div>` : ''}
            </div>
            ${flipped ? '' : '<div class="small text-muted mt-3">tap or press Space to flip</div>'}
          </div>
        </div>
        <div class="d-flex gap-2 justify-content-center fc-buttons">
          <button class="btn btn-outline-secondary" id="fc-prev" ${pos ? '' : 'disabled'} aria-label="Previous">‹</button>
          <button class="btn btn-outline-danger" id="fc-no" ${flipped ? '' : 'disabled'}>Again</button>
          <button class="btn btn-outline-success" id="fc-yes" ${flipped ? '' : 'disabled'}>Got it</button>
          <button class="btn btn-outline-secondary" id="fc-next" aria-label="Next">›</button>
        </div>`;
      stage.querySelector('#fc-prev').onclick = prev;
      stage.querySelector('#fc-next').onclick = next;
      stage.querySelector('#fc-no').onclick = () => answer(false);
      stage.querySelector('#fc-yes').onclick = () => answer(true);
      stats();
    };

    const go = (p) => { pos = Math.max(0, Math.min(p, order.length)); flipped = false; render(); };
    const next = () => { if (pos < order.length) go(pos + 1); };
    const prev = () => { if (pos > 0) go(pos - 1); };
    const flip = () => { if (current()) { flipped = !flipped; render(); } };
    const answer = (knew) => {
      const c = current();
      if (!c || !flipped) return;
      const box = boxes[c.id] || 1;
      boxes[c.id] = knew ? Math.min(box + 1, MAX_BOX) : 1;
      store.set('pt.leitner', boxes);
      if (!knew) order.splice(pos + 4, 0, c); // see it again soon
      go(pos + 1);
    };

    // Tap flips the card; a horizontal swipe navigates instead.
    let touchX = null;
    let swiped = false;
    stage.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; swiped = false; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 50) { swiped = true; if (dx < 0) next(); else prev(); }
    });
    stage.addEventListener('click', (e) => {
      if (swiped) { swiped = false; return; }
      if (e.target.closest('#fc-card')) flip();
    });

    const onKey = (e) => {
      if (!document.body.contains(stage)) { document.removeEventListener('keydown', onKey); return; }
      if (e.target.closest && e.target.closest('input, select, textarea')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (e.code === 'Space') { e.preventDefault(); flip(); }
      else if (k === 'h' || k === 'p' || k === 'ArrowLeft') prev();
      else if (k === 'l' || k === 'n' || k === 'ArrowRight') next();
      else if (k === '1') answer(false);
      else if (k === '2') answer(true);
    };
    document.addEventListener('keydown', onKey);

    el.querySelector('#fc-decks').addEventListener('change', (e) => {
      state.decks = [...el.querySelectorAll('#fc-decks input:checked')].map((i) => i.value);
      start();
    });
    el.querySelector('#fc-none').onclick = () => {
      el.querySelectorAll('#fc-decks input').forEach((i) => { i.checked = false; });
      state.decks = [];
      start();
    };
    el.querySelector('#fc-dir').onchange = (e) => { state.dir = e.target.value; start(); };
    el.querySelector('#fc-hide').onchange = (e) => { state.hideMastered = e.target.checked; start(); };
    el.querySelector('#fc-restart').onclick = start;
    el.querySelector('#fc-reset').onclick = () => {
      if (!confirm('Reset all boxes for the selected decks back to 1?')) return;
      buildDecks(state.decks).forEach((c) => { delete boxes[c.id]; });
      store.set('pt.leitner', boxes);
      start();
    };

    start();
    return start; // re-run on tense change (conjugation decks depend on it)
  };

  return { page };
})();
