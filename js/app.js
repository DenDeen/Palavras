// Router, sidebar and the learning views (sections and verb lessons).
(() => {
  const { esc, TENSES, PERSONS, tense, tenseMeta, setTense, cap, sentence } = U;
  const data = window.APP_DATA || { sections: [], verbs: [] };
  const main = document.getElementById('main');
  const verbs = data.verbs;
  const lessons = verbs.filter((v) => !v.dup);
  let rerender = null; // set by views that depend on the selected tense

  // ---------- Sidebar & tense selector ----------
  // Sections with sub-groups get a ▸/▾ toggle; manual choices persist in pt.sbOpen.
  const sbOpen = U.store.get('pt.sbOpen', {});
  const setSubOpen = (id, open) => {
    const sub = document.querySelector(`[data-sub="${id}"]`);
    if (!sub) return;
    sub.hidden = !open;
    document.querySelector(`[data-sb-toggle="${id}"]`).textContent = open ? '▾' : '▸';
  };

  const sidebar = () => {
    const sec = data.sections.map((s) => {
      const subs = (s.groups || []).length > 1 ? s.groups : [];
      return `
      <div class="d-flex sb-row">
        <a class="list-group-item list-group-item-action py-1 flex-grow-1" href="#/s/${s.id}" data-nav="s/${s.id}">${esc(s.title)}</a>
        ${subs.length ? `<button type="button" class="btn btn-sm sb-toggle" data-sb-toggle="${s.id}" aria-label="Show sub-sections">▸</button>` : ''}
      </div>
      ${subs.length ? `<div data-sub="${s.id}" hidden>${subs.map((g, i) => `
        <a class="list-group-item list-group-item-action py-1 ps-4 small text-muted" href="#/s/${s.id}/${i}" data-nav="s/${s.id}/${i}">${esc(g.title)}</a>`).join('')}</div>` : ''}`;
    }).join('');
    const el = document.getElementById('sidebar');
    el.innerHTML = `
      <div class="list-group list-group-flush small">
        ${sec}
        <a class="list-group-item list-group-item-action py-1" href="#/verbos" data-nav="verbos">Verbos (${lessons.length})</a>
      </div>`;
    Object.entries(sbOpen).forEach(([id, open]) => setSubOpen(id, open));
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-sb-toggle]');
      if (!btn) return;
      const id = btn.dataset.sbToggle;
      sbOpen[id] = document.querySelector(`[data-sub="${id}"]`).hidden;
      U.store.set('pt.sbOpen', sbOpen);
      setSubOpen(id, sbOpen[id]);
    });
  };

  // ☰ hides/shows the whole sidebar: remembered on desktop, a drop-down menu on phones.
  const isMobile = () => window.matchMedia('(max-width: 767.98px)').matches;
  document.body.classList.toggle('sb-hidden', U.store.get('pt.sidebarHidden', false));
  document.getElementById('sb-btn').addEventListener('click', () => {
    if (isMobile()) {
      document.body.classList.toggle('sb-open');
    } else {
      const hidden = document.body.classList.toggle('sb-hidden');
      U.store.set('pt.sidebarHidden', hidden);
    }
  });

  const tenseSelect = document.getElementById('tense');
  tenseSelect.innerHTML = TENSES.map((t) => `<option value="${t.id}">${esc(t.full)}</option>`).join('');
  tenseSelect.value = tense();
  tenseSelect.addEventListener('change', () => setTense(tenseSelect.value));
  window.addEventListener('tensechange', (e) => {
    tenseSelect.value = e.detail;
    if (rerender) rerender();
  });

  // ---------- Views ----------
  const home = () => {
    const count = (s) => (s.groups || []).reduce((n, g) => n + g.items.length, 0);
    main.innerHTML = `
      <h2>As 1000 palavras mais comuns</h2>
      <p class="text-muted">Work through the sections in order. Each word has an example sentence (click a sentence to see the English).
      Verb lessons have conjugation tables, examples and exercises for the tense selected at the top. You're in
      <b>${esc(tenseMeta(tense()).full)}</b>.</p>
      <div class="list-group mb-4">
        ${data.sections.map((s, i) => `
          <a class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" href="#/s/${s.id}">
            <span>${i + 1}. ${esc(s.title)} <span class="text-muted small">· ${esc(s.titleEn)}</span></span>
            <span class="badge text-bg-light">${count(s)}</span></a>`).join('')}
        <a class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" href="#/verbos">
          <span>${data.sections.length + 1}. Verbos <span class="text-muted small">· Verbs</span></span>
          <span class="badge text-bg-light">${lessons.length}</span></a>
      </div>
      <div class="d-flex gap-2"><a class="btn btn-primary" href="#/praticar">Praticar</a><a class="btn btn-outline-primary" href="#/flashcards">Flashcards</a></div>`;
  };

  const tableHtml = (t) => `
    <h5 class="mt-3">${esc(t.title || '')}</h5>
    <div class="table-responsive"><table class="table table-sm table-bordered w-auto">
      <thead class="table-light"><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${t.rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</tbody>
    </table></div>`;

  const section = (id, groupIdx) => {
    const s = data.sections.find((x) => x.id === id);
    if (!s) return notFound();
    const groups = (s.groups || []).map((g, gi) => `
      <section id="g${gi}" class="mb-4">
        ${(s.groups.length > 1 || g.title !== s.title) ? `<h4 class="mt-4">${esc(g.title)} <small class="text-muted fs-6">${esc(g.titleEn || '')}</small>
          <a class="btn btn-sm btn-link" href="#/flashcards?deck=s:${s.id}:${gi}">flashcards</a></h4>` : ''}
        ${g.note ? `<p class="small text-muted pre">${esc(g.note)}</p>` : ''}
        <div class="table-responsive"><table class="table table-sm table-hover align-middle words">
          <thead class="table-light"><tr><th class="num">#</th><th>Português</th><th>English</th><th>Exemplo <span class="fw-normal text-muted small">(click for English)</span></th></tr></thead>
          <tbody>${g.items.map((it) => `<tr>
            <td class="num text-muted small">${esc(it.n ?? '')}</td>
            <td><b>${esc(it.pt)}</b>${it.note ? `<div class="small text-muted">${esc(it.note)}</div>` : ''}</td>
            <td>${esc(it.en)}</td>
            <td>${it.ex ? sentence(it.ex.pt, it.ex.en, 'div') : ''}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>`).join('');
    main.innerHTML = `
      <div class="d-flex flex-wrap align-items-baseline gap-2">
        <h2 class="me-auto">${esc(s.title)} <small class="text-muted fs-5">${esc(s.titleEn)}</small></h2>
        <a class="btn btn-sm btn-outline-primary" href="#/flashcards?deck=s:${s.id}">Flashcards</a>
        ${(s.tables || []).some((t) => (t.cards || []).length) ? `<a class="btn btn-sm btn-outline-primary" href="#/flashcards?deck=t:${s.id}">Table flashcards</a>` : ''}
        <a class="btn btn-sm btn-outline-primary" href="#/praticar" data-practice-section="${s.id}">Practice</a>
      </div>
      ${s.note ? `<div class="alert alert-light border small pre">${esc(s.note)}</div>` : ''}
      ${(s.tables || []).map(tableHtml).join('')}
      ${groups}`;
    main.querySelector('[data-practice-section]').addEventListener('click', () => {
      const p = U.store.get('pt.practice', { from: 1, to: 30, count: 8, types: ['fill', 'translate', 'conj'], sections: [] });
      U.store.set('pt.practice', { ...p, sections: [s.id], types: [] });
    });
    if (groupIdx !== undefined) {
      const el = document.getElementById(`g${groupIdx}`);
      if (el) el.scrollIntoView();
    }
  };

  const verbIndex = () => {
    const render = (q = '') => {
      const ql = q.trim().toLowerCase();
      const rows = verbs.filter((v) => !ql || v.inf.includes(ql) || v.en.toLowerCase().includes(ql));
      main.querySelector('#vlist').innerHTML = rows.map((v) => `<tr>
          <td class="num text-muted small">${v.n}</td>
          <td><a href="#/v/${encodeURIComponent(v.dup ? verbs.find((x) => x.n === v.dup).inf : v.inf)}">${esc(v.inf)}</a></td>
          <td>${esc(v.en)}</td>
          <td>${v.dup ? `<span class="text-muted small">same as #${v.dup}</span>`
            : `<span class="badge ${v.regular ? 'text-bg-light' : 'text-bg-warning'}">${v.regular ? 'regular' : 'irregular'}</span>`}</td>
          <td class="small text-muted">${v.dup ? '' : esc(v.conj[tense()].eu || v.conj[tense()].ele)}</td></tr>`).join('');
    };
    main.innerHTML = `
      <div class="d-flex flex-wrap align-items-baseline gap-2">
        <h2 class="me-auto">Verbos <small class="text-muted fs-5">Verbs</small></h2>
        <a class="btn btn-sm btn-outline-primary" href="#/flashcards?deck=v:1-30">Flashcards</a>
        <a class="btn btn-sm btn-outline-primary" href="#/praticar">Practice</a>
      </div>
      <div class="alert alert-light border small">Regular verbs in the Presente: <b>-ar</b> falo, falas, fala, falamos, falam ·
        <b>-er</b> escrevo, escreves, escreve, escrevemos, escrevem · <b>-ir</b> existo, existes, existe, existimos, existem.</div>
      <input class="form-control form-control-sm mb-2" id="vq" placeholder="Filter verbs (pt or en)…" style="max-width: 20rem">
      <div class="table-responsive"><table class="table table-sm table-hover align-middle">
        <thead class="table-light"><tr><th class="num">#</th><th>Verbo</th><th>English</th><th></th><th>eu · ${esc(tenseMeta(tense()).label)}</th></tr></thead>
        <tbody id="vlist"></tbody></table></div>`;
    const q = main.querySelector('#vq');
    q.addEventListener('input', () => render(q.value));
    render();
    rerender = verbIndex;
  };

  const verbLesson = (inf) => {
    const v = lessons.find((x) => x.inf === inf);
    if (!v) return notFound();
    const idx = lessons.indexOf(v);
    const prev = lessons[idx - 1];
    const next = lessons[idx + 1];
    const t = tense();
    const conj = v.conj[t];
    const note = (v.notes || {})[t];

    const recap = TENSES.map((x) => `<tr><th class="fw-normal">${esc(x.label)}</th>
      <td><b>${esc(v.conj[x.id].eu || v.conj[x.id].ele)}</b></td></tr>`).join('');

    main.innerHTML = `
      <nav class="small mb-2 d-flex justify-content-between">
        <span>${prev ? `<a href="#/v/${encodeURIComponent(prev.inf)}">← ${esc(prev.inf)}</a>` : ''}</span>
        <a href="#/verbos">all verbs</a>
        <span>${next ? `<a href="#/v/${encodeURIComponent(next.inf)}">${esc(next.inf)} →</a>` : ''}</span>
      </nav>
      <h2>${esc(cap(v.inf))} <small class="text-muted fs-5">${esc(v.en)}</small></h2>
      <p class="mb-1"><span class="badge text-bg-light">#${v.n}</span>
        <span class="badge ${v.regular ? 'text-bg-light' : 'text-bg-warning'}">${v.regular ? 'regular' : 'irregular'}</span>
        <span class="badge text-bg-light">-${esc(v.group)}</span></p>
      <p>${esc(v.intro)}</p>
      <ul class="list-unstyled">${v.quick.map((q) => `<li>${esc(q.pt)} <span class="text-muted">→ ${esc(q.en)}</span></li>`).join('')}</ul>

      <ul class="nav nav-tabs mt-4 flex-nowrap overflow-auto text-nowrap" id="ttabs">
        ${TENSES.map((x) => `<li class="nav-item"><button class="nav-link ${x.id === t ? 'active' : ''}" data-tense="${x.id}">${esc(x.label)}</button></li>`).join('')}
      </ul>
      <div class="border border-top-0 rounded-bottom p-3 mb-4">
        <h4>${esc(tenseMeta(t).full)} <small class="text-muted fs-6">${esc(tenseMeta(t).en)}</small></h4>
        ${note ? `<div class="alert alert-info small py-2">${esc(note)}</div>` : ''}
        <div class="row g-4">
          <div class="col-md-5">
            <table class="table table-sm mb-0">
              <thead class="table-light"><tr><th>Pessoa</th><th>${esc(v.inf)}</th></tr></thead>
              <tbody>${PERSONS.filter((p) => conj[p.id]).map((p) => `<tr>
                <td>${esc(p.label)} <span class="text-muted small">${esc(p.en)}</span></td><td><b>${esc(conj[p.id])}</b></td></tr>`).join('')}</tbody>
            </table>
          </div>
          <div class="col-md-7">
            <h6>Examples <span class="text-muted small fw-normal">(click a sentence for the English)</span></h6>
            <ul class="examples">${(v.examples[t] || []).map((e) => sentence(e.pt, e.en)).join('')}</ul>
          </div>
        </div>
      </div>

      <h3>Practice · ${esc(tenseMeta(t).label)}</h3>
      ${Practice.forVerb(v, t)}

      ${(v.patterns || []).length ? `<h4 class="mt-4">Common patterns</h4>
        <table class="table table-sm w-auto"><tbody>${v.patterns.map((p) => `<tr><td><b>${esc(p.pt)}</b></td><td>${esc(p.en)}</td></tr>`).join('')}</tbody></table>` : ''}
      ${(v.compare || []).length ? `<h4 class="mt-4">Don't confuse</h4>
        <table class="table table-sm"><thead class="table-light"><tr><th>Verb</th><th>Meaning</th><th>Example</th></tr></thead>
        <tbody>${[{ verb: v.inf, en: v.en, ex: plain0(v) }, ...v.compare].map((c) => `<tr><td><b>${esc(c.verb)}</b></td><td>${esc(c.en)}</td><td>${esc(c.ex)}</td></tr>`).join('')}</tbody></table>` : ''}

      <h4 class="mt-4">Recap</h4>
      <table class="table table-sm w-auto"><tbody>${recap}</tbody></table>
      <p class="lead">${esc(v.recap)}</p>
      <nav class="small my-4 d-flex justify-content-between">
        <span>${prev ? `<a href="#/v/${encodeURIComponent(prev.inf)}">← ${esc(prev.inf)}</a>` : ''}</span>
        <span>${next ? `<a href="#/v/${encodeURIComponent(next.inf)}">${esc(next.inf)} →</a>` : ''}</span>
      </nav>`;

    main.querySelector('#ttabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tense]');
      if (b) setTense(b.dataset.tense);
    });
    rerender = () => {
      const y = window.scrollY;
      verbLesson(inf);
      window.scrollTo(0, y);
    };
  };

  // First quick phrase, used as this verb's own row in the comparison table.
  const plain0 = (v) => (v.quick && v.quick[0] ? v.quick[0].pt : '');

  const notFound = () => { main.innerHTML = '<div class="alert alert-warning">Page not found. <a href="#/">Home</a></div>'; };

  // ---------- Router ----------
  const route = () => {
    const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
    const params = new URLSearchParams(query || '');
    const parts = path.split('/').map(decodeURIComponent);
    rerender = null;
    window.scrollTo(0, 0);
    if (!parts[0]) home();
    else if (parts[0] === 's') section(parts[1], parts[2]);
    else if (parts[0] === 'verbos') verbIndex();
    else if (parts[0] === 'v') verbLesson(parts[1]);
    else if (parts[0] === 'praticar') rerender = Practice.page(main);
    else if (parts[0] === 'flashcards') rerender = Flashcards.page(main, params);
    else notFound();

    document.querySelectorAll('[data-nav]').forEach((a) => {
      const nav = a.dataset.nav;
      a.classList.toggle('active', path === nav || (nav === 'verbos' && parts[0] === 'v'));
    });
    document.querySelectorAll('.navbar .nav-link').forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === `#/${parts[0]}`);
    });
    // The section you're in shows its sub-groups; the phone menu closes after navigating.
    if (parts[0] === 's' && sbOpen[parts[1]] !== false) setSubOpen(parts[1], true);
    document.body.classList.remove('sb-open');
  };

  if (!data.verbs.length && !data.sections.length) {
    main.innerHTML = '<div class="alert alert-danger">data/data.js is missing or empty. Run <code>python3 tools/build_data.py</code>.</div>';
    return;
  }
  sidebar();
  window.addEventListener('hashchange', route);
  route();

  // Offline / installable app when served over http(s) (e.g. GitHub Pages).
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
