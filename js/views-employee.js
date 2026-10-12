/* Superannuating employee view: choose modes, schedule interview, answer the questionnaire. */
(function (w) {
  const { $, $$, esc } = U;
  const V = (w.Views = w.Views || {});

  const MODE_INFO = {
    'Written questionnaire': ['📝', 'Answer 8 guided questions at your own pace. Save and return any time.'],
    'Interview (in person)': ['🎙', 'A knowledge-team member records a conversation with you at your location.'],
    'Interview (video call)': ['💻', 'A recorded video conversation from wherever you are.'],
    'Audio note': ['🔊', 'Record a spoken message for the next generation (about 10 minutes).'],
  };
  const SLOTS = ['10:00', '10:30', '11:00', '11:30', '12:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

  V.journey = (el, forEmpId) => {
    const user = Auth.current();
    const empId = forEmpId || user.empId;
    const e = Store.employee(empId);
    if (!e) { el.innerHTML = `<div class="card empty">Your profile is not linked to an employee record. Please contact the Knowledge Team.</div>`; return; }
    const db = Store.db(); const s = Store.sub(empId); const qs = db.questions;
    const left = U.daysTo(e.dor); const stage = Store.stageOf(empId);
    const modes = s.modes || [];
    const wantsWritten = modes.includes('Written questionnaire');
    const wantsInterview = modes.some((m) => db.settings.interviewModes.includes(m));
    const answered = qs.filter((q) => (s.answers[q.id] || '').trim()).length;
    const locked = !!s.submittedAt;
    const pct = Store.progressOf(empId);

    const stepState = (n) => {
      const order = ['Mode', 'Details', 'Submit', 'Review'];
      let cur = 0;
      if (modes.length) cur = 1;
      if (answered > 0 || s.schedule) cur = 2;
      if (s.submittedAt) cur = 3; if (s.published) cur = 4;
      return n < cur ? 'done' : n === cur ? 'now' : '';
    };

    el.innerHTML = `
      ${forEmpId ? `<p><a href="#/admin/submissions">← Submissions</a> <span class="chip warn">Admin view of ${esc(e.name)}</span></p>` : ''}
      <div class="hero"><div><h1>${forEmpId ? esc(e.name) : 'Namaste, ' + esc(e.name.split(' ')[0])} 🙏</h1>
        <p>${esc(e.designation)} · ${esc(e.discipline)} · ${esc(e.location)}</p></div>
        <div class="right"><b style="font-size:1.6rem">${left >= 0 ? left + ' days' : 'Retired'}</b><div style="color:#dbe8fb;font-size:.85rem">${left >= 0 ? 'to superannuation on ' : 'on '}${U.fmtDate(e.dor)}</div></div></div>

      <div class="card">
        <p style="margin:0 0 .6rem">Your experience is the most valuable thing you can leave behind. Share it in whichever way suits you best. You can pick more than one.</p>
        <div class="steps"><div class="step ${stepState(0)}">1 · Choose mode</div><div class="step ${stepState(1)}">2 · Details</div><div class="step ${stepState(2)}">3 · Submit</div><div class="step ${stepState(3)}">4 · Knowledge team review</div></div>
        <div class="row"><div class="bar" style="flex:1"><i style="width:${pct}%"></i></div><b>${pct}%</b></div>
        <div class="muted sm" style="margin-top:.3rem">Status: <b>${esc(stage)}</b></div>
      </div>

      <h2 style="margin-top:1.2rem">1. How would you like to share?</h2>
      <div class="card"><div class="modes" id="modes">
        ${db.settings.modes.map((m) => `<label class="mode ${modes.includes(m) ? 'on' : ''}"><input type="checkbox" value="${esc(m)}" ${modes.includes(m) ? 'checked' : ''}><span><b>${MODE_INFO[m] ? MODE_INFO[m][0] : '•'} ${esc(m)}</b><span class="muted sm">${esc(MODE_INFO[m] ? MODE_INFO[m][1] : '')}</span></span></label>`).join('')}
      </div><div class="row" style="margin-top:.8rem"><button class="btn primary" id="save-modes">Save my choice</button><span class="muted sm">Choose "Written" + an interview option if you want to do both.</span></div></div>

      ${wantsInterview ? `
      <h2 style="margin-top:1.2rem">2. Confirm your interview slot</h2>
      <div class="card">
        ${s.schedule ? `<div class="note" style="margin-bottom:.8rem">${s.schedule.status === 'Completed' ? '✅ Interview completed' : '📅 Scheduled'}: <b>${esc(s.schedule.mode)}</b> on <b>${U.fmtDate(s.schedule.date)}</b> at <b>${esc(s.schedule.time)}</b>${s.schedule.status === 'Scheduled' ? '. The Knowledge Team will confirm the venue or link by email.' : ''}</div>` : ''}
        ${s.schedule && s.schedule.status === 'Completed' ? '' : `
        <div class="grid g3">
          <div><label for="iv-m">Mode</label><select id="iv-m">${modes.filter((m) => db.settings.interviewModes.includes(m)).map((m) => `<option ${s.schedule && s.schedule.mode === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
          <div><label for="iv-d">Date</label><input id="iv-d" type="date" min="${U.isoDate(new Date(U.now().getTime() + 864e5))}" ${left >= 0 ? `max="${e.dor}"` : ''} value="${s.schedule ? s.schedule.date : ''}"></div>
          <div><label for="iv-t">Time (IST)</label><select id="iv-t">${SLOTS.map((t) => `<option ${s.schedule && s.schedule.time === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        </div>
        <div class="row" style="margin-top:.8rem"><button class="btn primary" id="iv-save">${s.schedule ? 'Change slot' : 'Confirm date and time'}</button></div>`}
      </div>` : ''}

      ${wantsWritten || !modes.length ? `
      <h2 style="margin-top:1.2rem">${wantsInterview ? '3' : '2'}. Written questionnaire <span class="chip gray">${answered}/${qs.length} answered</span></h2>
      <div class="card">
        ${locked ? `<div class="note" style="margin-bottom:1rem">✅ Submitted on ${U.fmtDate(s.submittedAt)}. ${s.published ? 'It is published in the repository. Thank you!' : 'The Knowledge Team is reviewing it before publishing.'} You can still edit and resubmit.</div>` : ''}
        ${modes.length ? '' : `<div class="note warn" style="margin-bottom:1rem">Choose a mode above first, or simply start writing. Written is the default.</div>`}
        ${qs.map((q, i) => `
          <div class="qblock"><div class="qh"><div><div class="theme">${i + 1} of ${qs.length} · ${esc(q.theme)}</div><label for="ans-${q.id}" style="margin-top:.1rem">${esc(q.text)}</label></div>
            ${w.SpeechRecognition || w.webkitSpeechRecognition ? `<button class="btn sm ghost" data-mic="${q.id}" title="Dictate your answer" aria-label="Dictate answer to question ${i + 1}">🎤</button>` : ''}</div>
          <textarea id="ans-${q.id}" data-q="${q.id}" placeholder="Write or dictate your answer. Stories and examples are most useful.">${esc(s.answers[q.id] || '')}</textarea>
          <div class="muted sm"><span class="wc" data-wc="${q.id}">${U.words(s.answers[q.id] || '')} words</span></div></div>`).join('')}
        <div class="row"><button class="btn saffron" id="submit-w">${locked ? 'Resubmit' : 'Submit for review'}</button><button class="btn" id="save-draft">Save draft</button><span class="savedot muted" id="saved"></span></div>
      </div>` : ''}`;

    const reload = () => V.journey(el, forEmpId);
    $('#save-modes', el).onclick = () => {
      const picked = $$('#modes input:checked', el).map((i) => i.value);
      if (!picked.length) return U.toast('Please choose at least one mode.');
      s.modes = picked; if (s.schedule && !picked.includes(s.schedule.mode)) delete s.schedule;
      Store.save(); U.toast('Choice saved'); reload();
    };
    $$('#modes input', el).forEach((i) => (i.onchange = () => i.closest('.mode').classList.toggle('on', i.checked)));

    if ($('#iv-save', el)) $('#iv-save', el).onclick = () => {
      const date = $('#iv-d', el).value; if (!date) return U.toast('Please pick a date.');
      if (left >= 0 && date > e.dor) return U.toast('Please choose a date on or before your superannuation date.');
      s.schedule = { mode: $('#iv-m', el).value, date, time: $('#iv-t', el).value, status: 'Scheduled' };
      Store.logMail({ empId, kind: 'confirmation', status: 'queued', channel: 'portal', note: `Interview slot ${date} ${s.schedule.time}` });
      Store.save(); U.toast('Slot confirmed. The Knowledge Team has been notified.'); reload();
    };

    const flash = () => { const d = $('#saved', el); if (d) { d.textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } };
    const saveAns = (ta) => { s.answers[ta.dataset.q] = ta.value; Store.save(); flash(); };
    const saveSoon = U.debounce(saveAns, 600);
    $$('textarea[data-q]', el).forEach((ta) => {
      ta.oninput = () => { $(`[data-wc="${ta.dataset.q}"]`, el).textContent = U.words(ta.value) + ' words'; saveSoon(ta); };
      ta.onblur = () => saveAns(ta);
    });
    if ($('#save-draft', el)) $('#save-draft', el).onclick = () => { $$('textarea[data-q]', el).forEach(saveAns); U.toast('Draft saved'); reload(); };
    if ($('#submit-w', el)) $('#submit-w', el).onclick = () => {
      $$('textarea[data-q]', el).forEach(saveAns);
      try {
        if (!s.modes || !s.modes.length) s.modes = ['Written questionnaire'];
        Store.submitWritten(empId); U.toast('Submitted. Thank you for sharing your experience! 🙏'); reload();
      } catch (err) { U.toast(err.message); }
    };

    // optional voice dictation (Chrome/Edge/Safari)
    let rec = null;
    el.onclick = (ev) => {
      const b = ev.target.closest('[data-mic]'); if (!b) return;
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (rec) { rec.stop(); rec = null; b.textContent = '🎤'; return; }
      const ta = $(`#ans-${b.dataset.mic}`, el);
      rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = false; rec.continuous = true;
      let base = ta.value ? ta.value.trimEnd() + ' ' : '';
      rec.onresult = (r) => { let t = ''; for (let i = r.resultIndex; i < r.results.length; i++) if (r.results[i].isFinal) t += r.results[i][0].transcript; if (t) { base += t.trim() + ' '; ta.value = base; ta.dispatchEvent(new Event('input')); } };
      rec.onend = () => { b.textContent = '🎤'; rec = null; };
      rec.onerror = () => { b.textContent = '🎤'; rec = null; U.toast('Microphone unavailable or permission denied.'); };
      rec.start(); b.textContent = '⏹ Stop'; U.toast('Listening… speak your answer');
    };
  };
})(window);
