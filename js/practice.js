// Reveal-only exercises, used on verb pages and on the Praticar page.
window.Practice = (() => {
  const { esc, PERSONS, tense, tenseMeta, shuffle, revealBtn, clearBtn, plain, store } = U;

  const card = (title, help, body, buttons) => `
    <div class="card mb-3" data-reveal-scope>
      <div class="card-header d-flex flex-wrap gap-2 align-items-center">
        <strong class="me-auto">${esc(title)}</strong>
        ${buttons ?? revealBtn() + clearBtn()}
      </div>
      <div class="card-body">
        ${help ? `<p class="text-muted small mb-2">${esc(help)}</p>` : ''}
        ${body}
      </div>
    </div>`;

  // items: [{pt: "Nós [tentamos] ...", en, inf}]
  const fillBlank = (items, title = 'Fill in the conjugation') => {
    if (!items.length) return '';
    const rows = items.map((it) => {
      const m = it.pt.match(/\[([^\]]+)\]/);
      const answer = m ? m[1] : '';
      const [before, after] = it.pt.split(/\[[^\]]+\]/);
      return `<li class="mb-2">
        ${esc(plain(before))}<input class="form-control form-control-sm d-inline-block blank" size="${Math.max(answer.length + 2, 8)}" autocomplete="off" autocapitalize="off" spellcheck="false"
        ><span class="text-muted small ms-1">(${esc(it.inf)})</span>${esc(plain(after ?? ''))}
        <div class="answer small"><b>${esc(answer)}</b> · ${esc(it.en)}</div>
      </li>`;
    }).join('');
    return card(title, 'Type the correct form, then press Show answers to compare.', `<ol class="mb-0">${rows}</ol>`);
  };

  // items: [{en, pt}]
  const translate = (items, title = 'Translate into Portuguese') => {
    if (!items.length) return '';
    const rows = items.map((it) => `<li class="mb-3">
        <div>${esc(it.en)}</div>
        <textarea class="form-control form-control-sm mt-1" rows="1" spellcheck="false"></textarea>
        <div class="answer small"><span class="text-muted">Suggested answer:</span> <b>${esc(it.pt)}</b></div>
      </li>`).join('');
    return card(title, 'Write your translation, then reveal the suggested answer.', `<ol class="mb-0">${rows}</ol>`);
  };

  const conjTable = (verb, t, title) => {
    const conj = verb.conj[t];
    const rows = PERSONS.filter((p) => conj[p.id]).map((p) => `<tr>
        <th class="fw-normal text-nowrap">${esc(p.label)}</th>
        <td><input class="form-control form-control-sm" autocomplete="off" autocapitalize="off" spellcheck="false"></td>
        <td class="answer fw-bold">${esc(conj[p.id])}</td>
      </tr>`).join('');
    return card(title || `Conjugate: ${verb.inf} · ${tenseMeta(t).full}`, '',
      `<table class="table table-sm align-middle mb-0 conj-practice"><tbody>${rows}</tbody></table>`);
  };

  const freeWrite = (prompt, examples, title = 'Free write') => card(title, prompt,
    `<textarea class="form-control" rows="4" spellcheck="false" placeholder="Escreve aqui…"></textarea>
     <div class="answer mt-3"><div class="text-muted small mb-1">Example sentences:</div>
       <ul class="mb-0">${examples.map((e) => U.sentence(e.pt, e.en)).join('')}</ul></div>`,
    revealBtn('Show examples', 'Hide examples') + clearBtn());

  // Everything for one verb in one tense.
  const forVerb = (verb, t) => {
    const ex = verb.examples[t] || [];
    return fillBlank(ex.map((e) => ({ ...e, inf: verb.inf })))
      + translate(verb.practice[t] || [])
      + conjTable(verb, t)
      + freeWrite(`Write 2–3 of your own sentences with ${verb.inf} in the ${tenseMeta(t).full.toLowerCase()}.`, ex);
  };

  // ---------- Praticar page ----------
  const page = (el) => {
    const data = window.APP_DATA;
    const verbs = data.verbs.filter((v) => !v.dup);
    const max = verbs.length ? verbs[verbs.length - 1].n : 180;
    const saved = store.get('pt.practice', { from: 1, to: 30, count: 8, types: ['fill', 'translate', 'conj'], sections: [] });

    el.innerHTML = `
      <h2>Praticar</h2>
      <p class="text-muted">A random mixed drill in the selected tense (<b>${esc(tenseMeta(tense()).full)}</b>, change it at the top). Nothing is graded: write your answer, then reveal.</p>
      <form id="pform" class="card card-body mb-4">
        <div class="row g-3">
          <div class="col-sm-6 col-lg-3">
            <label class="form-label">Verbs from # to #</label>
            <div class="input-group input-group-sm">
              <input type="number" class="form-control" name="from" min="1" max="${max}" value="${saved.from}">
              <input type="number" class="form-control" name="to" min="1" max="${max}" value="${saved.to}">
            </div>
          </div>
          <div class="col-sm-6 col-lg-2">
            <label class="form-label">Items per exercise</label>
            <input type="number" class="form-control form-control-sm" name="count" min="1" max="30" value="${saved.count}">
          </div>
          <div class="col-lg-3">
            <label class="form-label d-block">Exercises</label>
            ${[['fill', 'Fill in the conjugation'], ['translate', 'Translate (verbs)'], ['conj', 'Conjugation tables'], ['write', 'Free write']].map(([id, label]) => `
              <div class="form-check"><input class="form-check-input" type="checkbox" name="types" value="${id}" id="pt-${id}" ${saved.types.includes(id) ? 'checked' : ''}>
              <label class="form-check-label" for="pt-${id}">${label}</label></div>`).join('')}
          </div>
          <div class="col-lg-4">
            <label class="form-label d-block">Also translate example sentences from</label>
            ${data.sections.map((s) => `
              <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" name="sections" value="${s.id}" id="ps-${s.id}" ${saved.sections.includes(s.id) ? 'checked' : ''}>
              <label class="form-check-label" for="ps-${s.id}">${esc(s.title)}</label></div>`).join('')}
          </div>
        </div>
        <div class="mt-3"><button class="btn btn-primary btn-sm">New drill</button></div>
      </form>
      <div id="drill"></div>`;

    const form = el.querySelector('#pform');
    const run = () => {
      const fd = new FormData(form);
      const opts = {
        from: +fd.get('from') || 1, to: +fd.get('to') || max, count: +fd.get('count') || 8,
        types: fd.getAll('types'), sections: fd.getAll('sections'),
      };
      store.set('pt.practice', opts);
      const t = tense();
      const pool = verbs.filter((v) => v.n >= opts.from && v.n <= opts.to);
      const take = (arr) => shuffle(arr).slice(0, opts.count);
      let html = '';
      if (!pool.length && !opts.sections.length) html = '<div class="alert alert-warning">No verbs in that range.</div>';
      if (opts.types.includes('fill')) {
        html += fillBlank(take(pool.flatMap((v) => (v.examples[t] || []).map((e) => ({ ...e, inf: v.inf })))));
      }
      if (opts.types.includes('translate')) html += translate(take(pool.flatMap((v) => v.practice[t] || [])), 'Translate into Portuguese (verbs)');
      if (opts.types.includes('conj')) {
        take(pool).slice(0, Math.min(3, opts.count)).forEach((v) => { html += conjTable(v, t); });
      }
      if (opts.types.includes('write') && pool.length) {
        const v = shuffle(pool)[0];
        html += freeWrite(`Write 2–3 sentences with ${v.inf} (${v.en}) in the ${tenseMeta(t).full.toLowerCase()}.`, v.examples[t] || []);
      }
      if (opts.sections.length) {
        const items = data.sections.filter((s) => opts.sections.includes(s.id))
          .flatMap((s) => (s.groups || []).flatMap((g) => g.items))
          .filter((it) => it.ex).map((it) => ({ en: it.ex.en, pt: it.ex.pt }));
        html += translate(take(items), 'Translate into Portuguese (vocabulary)');
      }
      el.querySelector('#drill').innerHTML = html;
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
    run();
    return run; // re-run on tense change
  };

  return { forVerb, fillBlank, translate, conjTable, freeWrite, page };
})();
