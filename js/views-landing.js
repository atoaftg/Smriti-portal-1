/* Landing page + in-app Guide. One text, written so each of the three roles can understand their part. */
(function (w) {
  const { esc } = U;
  const V = (w.Views = w.Views || {});

  V.ROLE_LABEL = { admin: 'Administrator', employee: 'Superannuating leader', learner: 'Learner' };

  const STEPS = [
    ['✉️', 'Invitation', 'Two months before a leader’s superannuation date, Smriti emails an invitation automatically.'],
    ['🧭', 'Share', 'The leader chooses how to share: written answers to 8 guided questions, an interview, or both.'],
    ['🏷️', 'Review and tag', 'The Knowledge Team reviews each contribution and publishes it with tags for discipline, topic and location.'],
    ['🎓', 'Learn', 'Every colleague can search the repository, read or listen, and ask Smriti questions in plain language.'],
  ];

  const ROLES = [
    { key: 'learner', icon: '🎓', title: 'For learners', who: 'Every colleague who wants to learn from experienced leaders',
      tabs: ['Repository', 'Ask Smriti'],
      points: [
        '<b>Repository:</b> browse every interview and questionnaire. Search by keyword and filter by discipline, topic tag, type or location. Open any item to read it in full.',
        '<b>Ask Smriti:</b> type a question in your own words. The answer is built <b>only</b> from what leaders have shared, quoted in their own words with a link to the source.',
        '<b>Listen:</b> press Listen to hear any answer or asset read aloud. Drag the progress bar, skip back or forward 10 seconds, and choose your speed.',
      ], demo: 'learner:learn123', cta: 'Try the learner view' },
    { key: 'employee', icon: '🧭', title: 'For superannuating leaders', who: 'Colleagues approaching superannuation, invited by email',
      tabs: ['My journey', 'Repository', 'Ask Smriti'],
      points: [
        '<b>Choose how to share:</b> written, in-person interview, video interview, audio note, or any combination.',
        '<b>Written:</b> answer 8 guided questions at your own pace. Your work saves automatically, and you can speak your answers instead of typing.',
        '<b>Interview:</b> pick a date and time that suits you and confirm it. The Knowledge Team takes it from there.',
        '<b>Submit and track:</b> you can see your progress at all times. After the Knowledge Team’s review, your experience becomes available to every colleague.',
      ], demo: 'E1010:retire123', cta: 'Try the leader view' },
    { key: 'admin', icon: '🛠️', title: 'For administrators', who: 'The Knowledge Management Team',
      tabs: ['Dashboard', 'Master data', 'Mail centre', 'Submissions', 'Assets', 'Settings'],
      points: [
        '<b>Master data:</b> upload the manpower file with every employee’s superannuation date. Smriti emails each person automatically two months before.',
        '<b>Mail centre and dashboard:</b> see who was invited, who logged in, who has started and who has submitted. Send an invitation, reminder or nudge to one person or many.',
        '<b>Submissions:</b> open any contribution to view, edit, schedule an interview, add a transcript, check the tags, and publish it to the repository.',
        '<b>Full access:</b> administrators can also use the Repository and Ask Smriti, and can manage the content learners see.',
      ], demo: 'admin:admin123', cta: 'Try the administrator view' },
  ];

  const GOOD = [
    'Smriti never invents answers. If something is not in the repository, it says so.',
    'A contribution stays private until an administrator publishes it.',
    'Works on phones, tablets and computers. Read or listen, whichever suits you.',
  ];

  /** the shared introduction (used on the landing page and in the in-app Guide) */
  V.introHTML = (opts = {}) => {
    const hl = opts.highlight;
    return `
      <section class="intro" aria-labelledby="how-h">
        <h2 id="how-h" class="intro-h">How Smriti works</h2>
        <ol class="steps4">${STEPS.map(([ic, t, d], i) => `<li><span class="s-ic" aria-hidden="true">${ic}</span><span class="s-n">Step ${i + 1}</span><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join('')}</ol>
      </section>
      <section class="intro" aria-labelledby="roles-h">
        <h2 id="roles-h" class="intro-h">What you can do, by role</h2>
        <div class="rolecards">${ROLES.map((r) => `
          <article class="rolecard ${r.key} ${hl === r.key ? 'you' : ''}">
            <div class="rc-top"><span class="rc-ic" aria-hidden="true">${r.icon}</span><div><h3>${esc(r.title)}</h3><div class="muted sm">${esc(r.who)}</div></div></div>
            ${hl === r.key ? '<div class="chip ok" style="margin:.2rem 0">This is you</div>' : ''}
            <div class="chips" style="margin:.3rem 0 .5rem">${r.tabs.map((t) => `<span class="chip rc-${r.key}">${esc(t)}</span>`).join('')}</div>
            <ul>${r.points.map((p) => `<li>${p}</li>`).join('')}</ul>
            ${opts.demoButtons ? `<button type="button" class="btn sm primary" data-fill="${esc(r.demo)}">${esc(r.cta)}</button>` : ''}
          </article>`).join('')}</div>
      </section>
      <section class="intro"><div class="note"><b>Good to know</b><ul style="margin:.3rem 0 0;padding-left:1.2rem">${GOOD.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div></section>`;
  };

  /** in-app Guide (header link, any signed-in role) */
  V.about = (el) => {
    const u = Auth.current();
    el.innerHTML = `
      <div class="hero"><div><h1>Guide to Smriti</h1>
        <p>Smriti (स्मृति, “memory”) turns the experience of superannuating leaders into a living library for every colleague. You are signed in as <b>${esc(V.ROLE_LABEL[u.role])}</b>.</p></div></div>
      ${V.introHTML({ highlight: u.role })}`;
  };
})(window);
