/* Learner views: Repository, asset detail, Ask Smriti. */
(function (w) {
  const { $, $$, esc } = U;
  const V = (w.Views = w.Views || {});
  let reader = null;                                   // current read-aloud player
  const killReader = () => { if (reader) { reader.stop(true); reader = null; } else if (w.TTS) TTS.stopAll(); };
  V.killReader = killReader;

  const empOf = (id) => Store.employee(id) || {};
  const retLabel = (a) => { const e = Store.employee(a.empId); return (e && U.daysTo(e.dor) >= 0 ? 'Retiring ' : 'Retired ') + a.retireYear; };
  const readMins = (a) => a.minutes || Math.max(1, Math.round(a.qa.reduce((s, x) => s + U.words(x.a), 0) / 160));
  const assetText = (a) => {
    const e = empOf(a.empId);
    return `${a.title}. Shared by ${e.name}, ${e.designation}, ${a.discipline}. ` + a.qa.map((x) => `${x.q} ${x.a}`).join(' ');
  };
  const hue = (str) => parseInt(U.hash(String(str)).slice(-3), 16) % 6;
  V.tagCls = (t) => 't' + hue(t);
  V.avCls = (n) => 'c' + hue(n);
  V.chip = (t, cls = '') => `<span class="chip ${cls}">${esc(t)}</span>`;
  const typeCls = { Questionnaire: '', Interview: 'ok', 'Case study': 'warn' };

  /* ---------------------------------------------------------------- Repository */
  const filt = { q: '', discipline: '', type: '', tag: '', location: '', sort: 'new' };

  V.repo = (el) => {
    const assets = Store.published();
    const uniq = (f) => Array.from(new Set(assets.map(f).flat())).filter(Boolean).sort();
    const disc = uniq((a) => a.discipline), types = uniq((a) => a.type), tags = uniq((a) => a.tags), locs = uniq((a) => a.location);
    const opt = (list, cur, all) => `<option value="">${all}</option>` + list.map((x) => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join('');
    el.innerHTML = `
      <div class="hero"><div><h1>Learning repository</h1>
        <p>Interviews and questionnaire responses from experienced colleagues. Search, filter by tags, then read or listen.</p></div>
        <span class="chip gray" id="count"></span></div>
      <div class="filters">
        <input class="q" id="f-q" type="search" placeholder="Search by topic, name, discipline, keyword…" value="${esc(filt.q)}" aria-label="Search repository">
        <select id="f-d" aria-label="Discipline">${opt(disc, filt.discipline, 'All disciplines')}</select>
        <select id="f-t" aria-label="Type">${opt(types, filt.type, 'All types')}</select>
        <select id="f-g" aria-label="Topic tag">${opt(tags, filt.tag, 'All topic tags')}</select>
        <select id="f-l" aria-label="Location">${opt(locs, filt.location, 'All locations')}</select>
      </div>
      <div class="row" style="margin-bottom:.8rem"><span class="muted sm">Popular tags:</span><div class="chips" id="poptags"></div>
        <span class="spacer"></span>
        <select id="f-s" style="width:auto" aria-label="Sort"><option value="new" ${filt.sort === 'new' ? 'selected' : ''}>Newest first</option><option value="az" ${filt.sort === 'az' ? 'selected' : ''}>Title A–Z</option><option value="disc" ${filt.sort === 'disc' ? 'selected' : ''}>By discipline</option></select>
        <button class="btn sm ghost" id="f-clear">Clear</button></div>
      <div id="list" class="grid g3"></div>`;

    const tagFreq = {}; assets.forEach((a) => a.tags.forEach((t) => (tagFreq[t] = (tagFreq[t] || 0) + 1)));
    $('#poptags', el).innerHTML = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => `<button class="chip ${V.tagCls(t)}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');

    const draw = () => {
      const terms = filt.q.toLowerCase().split(/\s+/).filter(Boolean);
      let list = assets.filter((a) => {
        if (filt.discipline && a.discipline !== filt.discipline) return false;
        if (filt.type && a.type !== filt.type) return false;
        if (filt.tag && !a.tags.includes(filt.tag)) return false;
        if (filt.location && a.location !== filt.location) return false;
        if (!terms.length) return true;
        const e = empOf(a.empId);
        const hay = [a.title, a.discipline, a.location, a.type, e.name, e.designation, a.tags.join(' '), a.qa.map((x) => x.q + ' ' + x.a).join(' ')].join(' ').toLowerCase();
        return terms.every((t) => hay.includes(t));
      });
      list.sort((a, b) => filt.sort === 'az' ? a.title.localeCompare(b.title) : filt.sort === 'disc' ? a.discipline.localeCompare(b.discipline) : b.createdAt.localeCompare(a.createdAt) || a.title.localeCompare(b.title));
      $('#count', el).textContent = `${list.length} of ${assets.length} assets`;
      $('#list', el).innerHTML = list.length ? list.map((a) => {
        const e = empOf(a.empId);
        return `<article class="card asset" data-type="${esc(a.type)}" tabindex="0" role="link" data-id="${a.id}" aria-label="Open ${esc(a.title)}">
          <div class="row" style="justify-content:space-between">${V.chip(a.type, typeCls[a.type])}<span class="muted sm">${a.type === 'Interview' ? '🎙 ' : '📝 '}${readMins(a)} min</span></div>
          <h3>${esc(a.title)}</h3>
          <div class="person"><div class="av ${V.avCls(e.name || '?')}">${esc(U.initials(e.name || '?'))}</div><div class="meta"><b style="color:var(--ink)">${esc(e.name)}</b><br>${esc(e.designation)} · ${esc(a.discipline)} · ${esc(a.location)} · ${retLabel(a)}</div></div>
          <div class="snip">${esc(a.qa[0] ? a.qa[0].a : '')}</div>
          <div class="chips">${a.tags.map((t) => `<button class="chip ${V.tagCls(t)}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        </article>`;
      }).join('') : `<div class="empty card" style="grid-column:1/-1">No assets match these filters. <button class="btn sm" id="f-clear2">Clear filters</button></div>`;
    };
    draw();

    const set = (k, v) => { filt[k] = v; draw(); };
    $('#f-q', el).addEventListener('input', U.debounce((e) => set('q', e.target.value), 200));
    $('#f-d', el).onchange = (e) => set('discipline', e.target.value);
    $('#f-t', el).onchange = (e) => set('type', e.target.value);
    $('#f-g', el).onchange = (e) => set('tag', e.target.value);
    $('#f-l', el).onchange = (e) => set('location', e.target.value);
    $('#f-s', el).onchange = (e) => set('sort', e.target.value);
    const clear = () => { Object.assign(filt, { q: '', discipline: '', type: '', tag: '', location: '', sort: 'new' }); V.repo(el); };
    $('#f-clear', el).onclick = clear;
    el.onclick = (ev) => {
      if (ev.target.id === 'f-clear2') return clear();
      const tg = ev.target.closest('button[data-tag]');
      if (tg) { ev.stopPropagation(); filt.tag = tg.dataset.tag; V.repo(el); return; }
      const card = ev.target.closest('.asset'); if (card) location.hash = '#/repo/' + card.dataset.id;
    };
    el.onkeydown = (ev) => { if (ev.key === 'Enter' && ev.target.classList.contains('asset')) location.hash = '#/repo/' + ev.target.dataset.id; };
  };

  /* ---------------------------------------------------------------- Asset detail */
  V.asset = (el, id) => {
    const a = Store.asset(id); const u = Auth.current();
    if (!a || (!a.published && u.role !== 'admin' && u.empId !== a.empId)) { el.innerHTML = `<div class="empty card">This asset is not available. <a href="#/repo">Back to repository</a></div>`; return; }
    const e = empOf(a.empId);
    el.innerHTML = `
      <p><a href="#/repo">← Repository</a></p>
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:flex-start">
          <div class="person"><div class="av ${V.avCls(e.name)}" style="width:52px;height:52px;font-size:1.1rem">${esc(U.initials(e.name))}</div>
            <div><h1 style="margin:0">${esc(a.title)}</h1>
            <div class="muted">${esc(e.name)} · ${esc(e.designation)} · ${esc(a.discipline)} · ${esc(a.location)} · ${retLabel(a)}</div></div></div>
          ${a.published ? '' : V.chip('Unpublished: visible to admin and author only', 'warn')}
        </div>
        <div class="chips" style="margin:.8rem 0">${V.chip(a.type, typeCls[a.type])}${V.chip(a.mode + ' mode', 'gray')}${V.chip(readMins(a) + ' min', 'gray')}${a.tags.map((t) => `<a class="chip ${V.tagCls(t)}" href="#/repo" data-tag="${esc(t)}">${esc(t)}</a>`).join('')}</div>
        <div id="rd"></div>
        <p class="muted sm" style="margin:.5rem 0 0">Tip: drag the bar to jump anywhere, use ⏪/⏩ for 10-second skips, and change the speed to suit you.</p>
      </div>
      <h2 style="margin-top:1.2rem">Full responses</h2>
      <div id="qas">${a.qa.map((x, i) => `
        <details class="qa" open><summary><span>${esc(x.q)}</span>${V.chip(a.type === 'Interview' ? 'Q' + (i + 1) : x.qid.toUpperCase(), 'gray')}</summary>
          <div class="ans">${esc(x.a)}<div class="row"><button class="btn sm ghost" data-listen="${i}">🔊 Listen to this answer</button></div></div></details>`).join('')}
      </div>`;
    killReader();
    reader = new TTS.Reader($('#rd', el), assetText(a));
    el.onclick = (ev) => {
      const t = ev.target.closest('a[data-tag]'); if (t) { filt.tag = t.dataset.tag; }
      const b = ev.target.closest('button[data-listen]');
      if (b) { const x = a.qa[+b.dataset.listen]; reader.setText(`${x.q} ${x.a}`); reader.toggle(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    };
  };

  /* ---------------------------------------------------------------- Ask Smriti */
  const SUGGEST = ['What are the key lessons on well control?', 'How should a new engineer approach safety and permit to work?', 'What advice do experienced colleagues give to young joiners?', 'How do you prevent compressor and rotating equipment failures?', 'What should be handed over to successors?'];
  let history = [];

  V.ask = (el) => {
    killReader();
    history = history.filter((m) => !m.typing);          // drop a stale 'typing…' bubble if the user navigated away mid-answer
    Search.build(Store.published(), Store.employee);
    const n = Store.published().length;
    el.innerHTML = `
      <div class="hero"><div><h1>Ask Smriti 🙏</h1>
        <p>Answers come <b>only</b> from the ${n} published learning assets, in colleagues' own words, with the source of every point.</p></div></div>
      <div class="chat" id="chat" aria-live="polite"></div>
      <div class="chips" id="sugg" style="margin:.6rem 0">${SUGGEST.map((s) => `<button class="chip t1" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <form class="askbar" id="askf"><input id="askq" type="text" autocomplete="off" placeholder="Ask about any topic, e.g. “stuck pipe”, “succession”, “process safety”…" aria-label="Your question"><button class="btn saffron" type="submit">Ask</button></form>`;
    const chat = $('#chat', el);
    const draw = () => {
      if (!history.length) { chat.innerHTML = `<div class="msg bot">Namaste 🙏 I am Smriti, your guide to the experience captured in this repository. Ask me anything and I will pull together what colleagues across disciplines have shared. If it is not in the repository, I will tell you rather than guess.</div>`; return; }
      chat.innerHTML = history.map((m, i) => m.role === 'user' ? `<div class="msg user">${esc(m.text)}</div>` : m.typing ? `<div class="msg bot"><span class="typing"><i></i><i></i><i></i></span></div>` : botHTML(m, i)).join('');
      $$('.rd-mount', chat).forEach((mnt) => {
        const m = history[+mnt.dataset.i];
        if (m && m.reading) { reader = new TTS.Reader(mnt, Search.toSpeech(m.res, Store.employee)); }
      });
    };
    const botHTML = (m, i) => {
      const r = m.res;
      if (!r.found) return `<div class="msg bot">${esc(r.plain)}</div>`;
      return `<div class="msg bot">
        <div><b>${r.assetCount} learning ${r.assetCount === 1 ? 'asset speaks' : 'assets speak'} to this.</b> Here is what colleagues have shared:</div>
        ${r.items.map((it) => { const e = empOf(it.empId); return `<div class="src"><div class="who2">${esc(e.name)} <span class="muted" style="font-weight:400">· ${esc(e.designation)}, ${esc(it.discipline)}</span></div>
          ${it.excerpts.map((x) => `<blockquote>“${esc(x.text)}”</blockquote>`).join('')}
          <a class="chip" href="#/repo/${it.assetId}">📄 ${esc(it.title.length > 60 ? it.title.slice(0, 58) + '…' : it.title)}</a></div>`; }).join('')}
        ${r.themes.length ? `<div class="sm" style="margin-top:.5rem"><b>Common threads:</b> ${r.themes.map((t) => V.chip(t, V.tagCls(t))).join(' ')}</div>` : ''}
        ${r.also.length ? `<div class="sm muted" style="margin-top:.6rem">Also relevant: ${r.also.map((a) => `<a href="#/repo/${a.id}">${esc(a.title)}</a>`).join(' · ')}</div>` : ''}
        <div style="margin-top:.8rem">${m.reading ? `<div class="rd-mount" data-i="${i}"></div>` : `<button class="btn sm" data-read="${i}">🔊 Read this answer aloud</button>`}</div>
      </div>`;
    };
    const ask = (q) => {
      q = q.trim(); if (!q) return;
      killReader(); history.forEach((m) => (m.reading = false));
      history.push({ role: 'user', text: q }); history.push({ role: 'bot', typing: true }); draw();
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      setTimeout(() => {
        history.pop();
        try { history.push({ role: 'bot', res: Search.answer(q) }); draw(); }
        catch (err) { console.error(err); history.pop(); history.push({ role: 'bot', res: { found: false, plain: 'Sorry, something went wrong while searching. Please try again.' } }); draw(); }
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 450);
    };
    draw();
    $('#askf', el).onsubmit = (ev) => { ev.preventDefault(); const i = $('#askq', el); ask(i.value); i.value = ''; };
    el.onclick = (ev) => {
      const s = ev.target.closest('[data-s]'); if (s) ask(s.dataset.s);
      const r = ev.target.closest('[data-read]');
      if (r) { killReader(); history.forEach((m) => (m.reading = false)); history[+r.dataset.read].reading = true; draw(); reader.toggle(); }
    };
  };
})(window);
