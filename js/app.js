/* App shell: landing + sign-in, role-aware navigation, hash router. */
(function (w) {
  const { $, esc } = U;
  const App = (w.App = {});
  const V = w.Views;                 // view modules register themselves here (loaded before this file)
  const root = document.getElementById('app');
  const LOGO = (n) => `img/ongc-logo-${n}.png`;

  /* ---------------------------------------------------------------- landing + sign-in */
  function loginView(msg) {
    const emp = Store.employeesSorted().find((e) => U.daysTo(e.dor) >= 0);
    root.innerHTML = `
      <div class="landing">
        <header class="land-top"><div class="land-top-in">
          <span class="brand"><img class="logo" src="${LOGO(128)}" width="44" height="44" alt="ONGC"><span>Smriti<small>Knowledge Legacy Portal</small></span></span>
          <span class="spacer"></span><a class="btn sm" href="#signin" id="skip">Sign in</a>
        </div></header>

        <section class="land-hero"><div class="land-hero-in">
          <div class="lh-text">
            <span class="eyebrow">स्मृति · Smriti</span>
            <h1>Where the experience of our leaders becomes learning for everyone</h1>
            <p class="lead">Every superannuating leader carries decades of judgement, hard lessons and stories that no manual records. Smriti captures them, tags them, and makes them searchable. Colleagues can read them, listen to them, and ask questions answered only from what leaders have shared.</p>
            <div class="chips lh-chips"><span class="chip light">Searchable repository</span><span class="chip light">Ask Smriti, grounded answers</span><span class="chip light">Read aloud</span><span class="chip light">Phone friendly</span></div>
          </div>
          <form class="card signin" id="lf" autocomplete="on" aria-labelledby="si-h">
            <div class="si-head"><img class="logo-lg" src="${LOGO(192)}" width="64" height="64" alt="ONGC logo"><div><h2 id="si-h" style="margin:0">Sign in</h2><div class="muted sm">Use your user ID and password</div></div></div>
            <label for="u">User ID</label><input id="u" name="username" autocomplete="username" required>
            <label for="p">Password</label><input id="p" name="password" type="password" autocomplete="current-password" required>
            <div class="err" id="err" role="alert">${esc(msg || '')}</div>
            <button class="btn primary" style="width:100%" type="submit">Sign in</button>
            <div class="demo-box"><b>Demo accounts</b> (your organisation login will be used later)
              <div style="margin-top:.4rem">🛠️ For administrators: <code>admin</code> / <code>admin123</code></div>
              <div>🎓 For learners: <code>learner</code> / <code>learn123</code></div>
              <div>🧭 For superannuating leaders: <code>${esc(emp ? emp.empId : 'E1010')}</code> / <code>retire123</code></div>
              <div style="margin-top:.5rem" class="row"><button type="button" class="btn sm" data-fill="admin:admin123">Fill admin</button><button type="button" class="btn sm" data-fill="learner:learn123">Fill learner</button><button type="button" class="btn sm" data-fill="${esc(emp ? emp.empId : 'E1010')}:retire123">Fill leader</button></div>
            </div>
          </form>
        </div></section>

        <div class="land-body">${V.introHTML({ demoButtons: true })}</div>
        <footer class="land-foot">Prototype for internal demonstration · The ONGC name and logo belong to Oil and Natural Gas Corporation Limited · All people and stories shown are fictional samples</footer>
      </div>`;
    $('#lf').onsubmit = (ev) => {
      ev.preventDefault();
      try { const user = Auth.login($('#u').value, $('#p').value); location.hash = '#/' + Auth.home(user.role); App.render(); }
      catch (e) { $('#err').textContent = e.message; }
    };
    root.onclick = (ev) => {
      const b = ev.target.closest('[data-fill]');
      if (b) { const [u, p] = b.dataset.fill.split(':'); $('#u').value = u; $('#p').value = p; $('#lf').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#p').focus(); }
      if (ev.target.id === 'skip') { ev.preventDefault(); $('#lf').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#u').focus(); }
    };
  }

  /* ---------------------------------------------------------------- signed-in shell */
  function shell(user, route) {
    const tabs = Auth.tabsFor(user.role);
    const active = tabs.find(([p]) => route === p) || tabs.find(([p]) => p !== 'admin' && route.startsWith(p + '/')) || (route.startsWith('admin/submission/') ? tabs.find(([p]) => p === 'admin/submissions') : null);
    root.onclick = null;
    root.innerHTML = `
      <header class="top"><div class="top-in">
        <a class="brand" href="#/${Auth.home(user.role)}"><img class="logo" src="${LOGO(128)}" width="40" height="40" alt="ONGC"><span>Smriti<small>Knowledge Legacy Portal</small></span></a>
        <span class="spacer"></span>
        <a class="guide-link" href="#/about" title="How Smriti works, for every role">ⓘ <span>Guide</span></a>
        <div class="who"><div class="av">${esc(U.initials(user.name))}</div><div class="nm">${esc(user.name)}<div class="role">${esc(V.ROLE_LABEL[user.role])}</div></div>
          <button class="btn sm" id="out" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.55)">Sign out</button></div>
      </div></header>
      <nav class="tabs" aria-label="Main"><div class="tabs-in">${tabs.map(([p, l]) => `<a href="#/${p}" class="${active && active[0] === p ? 'on' : ''}" ${active && active[0] === p ? 'aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</div></nav>
      <main id="main"></main>`;
    const onTab = document.querySelector('.tabs a.on'); if (onTab && onTab.scrollIntoView) onTab.scrollIntoView({ inline: 'center', block: 'nearest' });
    $('#out').onclick = () => { Views.killReader(); Auth.logout(); location.hash = '#/login'; App.render(); };
    return $('#main');
  }

  App.render = () => {
    Views.killReader();
    const user = Auth.current();
    const route = location.hash.replace(/^#\/?/, '') || '';
    if (!user) { if (route && route !== 'login' && route !== 'signin') history.replaceState(null, '', '#/login'); return loginView(); }
    if (!route || route === 'login' || route === 'signin') { location.hash = '#/' + Auth.home(user.role); return; }
    const main = shell(user, route);
    const el = document.createElement('div'); main.appendChild(el);
    const [a, b, c] = route.split('/');
    const deny = () => { el.innerHTML = `<div class="card empty"><h2>No access</h2><p>Your role (${esc(V.ROLE_LABEL[user.role])}) cannot open this page.</p><a class="btn" href="#/${Auth.home(user.role)}">Go to my home</a></div>`; };
    try {
      if (a === 'about') Views.about(el);
      else if (a === 'repo' && Auth.can('repo')) b ? Views.asset(el, b) : Views.repo(el);
      else if (a === 'ask' && Auth.can('ask')) Views.ask(el);
      else if (a === 'journey' && Auth.can('journey')) { if (user.role === 'admin') { el.innerHTML = '<div class="card empty">Administrators manage leaders’ contributions from <a href="#/admin/submissions">Submissions</a>.</div>'; } else Views.journey(el); }
      else if (a === 'admin' && Auth.can('admin')) {
        if (!b) Views.admin(el); else if (b === 'master') Views.adminMaster(el); else if (b === 'mail') Views.adminMail(el);
        else if (b === 'submissions') Views.adminSubs(el); else if (b === 'submission') Views.adminSub(el, c);
        else if (b === 'assets') Views.adminAssets(el); else if (b === 'settings') Views.adminSettings(el); else deny();
      } else deny();
    } catch (err) { console.error(err); el.innerHTML = `<div class="card empty"><h2>Something went wrong</h2><p class="muted">${esc(err.message)}</p></div>`; }
    window.scrollTo(0, 0);
  };

  window.addEventListener('hashchange', App.render);
  Store.init();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  App.render();
})(window);
