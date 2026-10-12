/* Admin console: dashboard, master data, mail centre, submissions, assets, settings. */
(function (w) {
  const { $, $$, esc } = U;
  const V = (w.Views = w.Views || {});
  const db = () => Store.db();

  /* ------------------------------------------------------------ helpers */
  V.modal = (html, mount) => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(bg);
    const close = () => bg.remove();
    bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
    const esc2 = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc2); } };
    document.addEventListener('keydown', esc2);
    $$('[data-close]', bg).forEach((b) => (b.onclick = close));
    if (mount) mount(bg, close);
    return { bg, close };
  };
  const stageCls = { 'Not invited': 'gray', Invited: '', 'Logged in': '', 'Mode chosen': 'warn', 'In progress': 'warn', Submitted: 'ok', Published: 'ok' };
  const stageChip = (s) => `<span class="chip ${stageCls[s] || ''}">${esc(s)}</span>`;
  const statusCls = { sent: 'ok', queued: 'warn', failed: 'bad' };
  const KIND = { 'auto-2m': 'Auto 2-month', invite: 'Invitation', reminder: 'Reminder', nudge: 'Nudge', confirmation: 'Slot confirmation' };
  const daysChip = (d) => (d < 0 ? V.chip('Retired', 'gray') : V.chip(d + ' d', d <= 30 ? 'bad' : d <= 60 ? 'warn' : 'gray'));
  const needsAttention = (e) => { const d = U.daysTo(e.dor); const st = Store.stageOf(e.empId); return d >= 0 && d <= 30 && !['Submitted', 'Published'].includes(st); };

  /** which mail makes sense for this employee right now */
  const suggestKind = (e) => {
    const st = Store.stageOf(e.empId); const d = U.daysTo(e.dor);
    if (['Submitted', 'Published'].includes(st) || d < 0) return null;
    if (st === 'Not invited') return d <= db().settings.leadDays ? 'auto-2m' : 'invite';
    if (st === 'Invited') return 'reminder';
    return 'nudge';
  };

  /* ------------------------------------------------------------ mailer */
  const Mailer = {
    async send(empIds, kind) {
      const set = db().settings, ch = set.mailChannel;
      if (ch === 'github') {
        const token = sessionStorage.getItem('smriti_gh_token');
        if (!set.gh.repo || !token) throw new Error('GitHub channel needs repo and token in Settings.');
        const r = await fetch(`https://api.github.com/repos/${set.gh.repo}/actions/workflows/${set.gh.workflow}/dispatches`, {
          method: 'POST', headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' },
          body: JSON.stringify({ ref: set.gh.branch || 'main', inputs: { emp_ids: empIds.join(','), kind } }),
        });
        if (!r.ok) throw new Error(`GitHub dispatch failed (HTTP ${r.status}). Check repo, token scope (Actions: write) and workflow name.`);
        empIds.forEach((id) => Store.logMail({ empId: id, kind, status: 'queued', channel: 'github', note: 'Dispatched to GitHub Actions; final status appears after the run' }));
        return { n: empIds.length, how: 'queued on GitHub Actions' };
      }
      if (ch === 'mailto') { Mailer.mailtoModal(empIds, kind); return { n: 0, how: 'drafts opened' }; }
      empIds.forEach((id) => Store.logMail({ empId: id, kind, status: 'sent', channel: 'demo', note: 'Simulated send (demo mode). No real email leaves the portal.' }));
      return { n: empIds.length, how: 'sent (demo: simulated)' };
    },
    mailtoModal(empIds, kind) {
      const rows = empIds.map((id) => {
        const e = Store.employee(id); const m = Store.renderMail(kind, e);
        return `<tr><td>${esc(e.name)}<div class="muted sm">${esc(e.email)}</div></td><td><a class="btn sm primary" data-log="${id}" href="mailto:${encodeURIComponent(e.email)}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}">Open mail draft</a></td></tr>`;
      }).join('');
      V.modal(`<h2>Mail drafts <button class="btn sm ghost" data-close>✕</button></h2><p class="muted sm">Each button opens your mail app with the personalised message. It is logged as sent when you click.</p><div class="tbl-wrap"><table><tbody>${rows}</tbody></table></div>`, (bg) => {
        bg.onclick = (ev) => { const a = ev.target.closest('[data-log]'); if (a) { Store.logMail({ empId: a.dataset.log, kind, status: 'sent', channel: 'mailto', note: 'Opened in mail client by admin' }); a.textContent = '✓ Logged'; } };
      });
    },
  };
  async function sendWithToast(empIds, kind, after) {
    try { const r = await Mailer.send(empIds, kind); if (r.n) U.toast(`${KIND[kind]}: ${r.n} ${r.how}`); } catch (e) { U.toast(e.message, 5000); }
    if (after) after();
  }
  V.previewMail = (empId, kind) => {
    const e = Store.employee(empId); const m = Store.renderMail(kind, e);
    V.modal(`<h2>Preview: ${esc(KIND[kind])} <button class="btn sm ghost" data-close>✕</button></h2>
      <p class="muted sm">To: ${esc(e.name)} &lt;${esc(e.email)}&gt;</p><p><b>Subject:</b> ${esc(m.subject)}</p><div class="mail-pre">${esc(m.body)}</div>
      <div class="row" style="margin-top:1rem;justify-content:flex-end"><button class="btn" data-close>Close</button><button class="btn primary" data-send>Send now</button></div>`,
      (bg, close) => { $('[data-send]', bg).onclick = () => { close(); sendWithToast([empId], kind, () => w.App.render()); }; });
  };

  /* ------------------------------------------------------------ dashboard */
  V.admin = (el) => {
    const emps = Store.employeesSorted(); const upcoming = emps.filter((e) => U.daysTo(e.dor) >= 0);
    const stages = Store.STAGES; const counts = Object.fromEntries(stages.map((s) => [s, 0]));
    emps.forEach((e) => counts[Store.stageOf(e.empId)]++);
    const mails = Store.allMail(); const attention = emps.filter(needsAttention);
    const due = Store.dueForAuto();
    const interviews = emps.filter((e) => { const s = db().submissions[e.empId]; return s && s.schedule && s.schedule.status === 'Scheduled'; })
      .sort((a, b) => db().submissions[a.empId].schedule.date.localeCompare(db().submissions[b.empId].schedule.date));
    const maxC = Math.max(...Object.values(counts), 1);
    el.innerHTML = `
      <div class="pagehead"><div><h1>Admin dashboard</h1><p class="muted">Everything about the superannuation pipeline at a glance. Today: <b>${U.fmtDate(U.todayISO())}</b></p></div>
        <div class="row"><a class="btn" href="#/admin/mail">Mail centre</a><a class="btn primary" href="#/admin/submissions">Submissions</a></div></div>
      <div class="grid g4">
        <div class="card kpi k1"><b>${emps.length}</b><span>Employees in master</span></div>
        <div class="card kpi k2"><b>${upcoming.length}</b><span>Yet to superannuate</span></div>
        <div class="card kpi ${due.length ? 'alert' : ''}"><b>${due.length}</b><span>Auto-mail due, not yet sent</span></div>
        <div class="card kpi k3"><b>${mails.filter((m) => m.status === 'sent').length}</b><span>Mails sent</span></div>
        <div class="card kpi ${mails.some((m) => m.status === 'failed') ? 'alert' : ''}"><b>${mails.filter((m) => m.status === 'failed').length}</b><span>Mails failed</span></div>
        <div class="card kpi ${attention.length ? 'alert' : ''}"><b>${attention.length}</b><span>Retiring ≤30 days, incomplete</span></div>
        <div class="card kpi k4"><b>${counts.Submitted + counts.Published}</b><span>Contributions submitted</span></div>
        <div class="card kpi"><b>${Store.published().length}</b><span>Assets live in repository</span></div>
      </div>

      ${due.length ? `<div class="card" style="margin-top:1rem;border-color:var(--warn)"><h2>⏰ Two-month trigger</h2>
        <p class="muted sm">These employees are within ${db().settings.leadDays} days of superannuation and have not received the automatic mail. In production the daily GitHub Actions job sends these on its own.</p>
        <div class="chips" style="margin-bottom:.7rem">${due.map((e) => V.chip(`${e.name} · ${U.daysTo(e.dor)} d`, 'warn')).join('')}</div>
        <button class="btn saffron" id="run-auto">Send to all ${due.length} now</button></div>` : ''}

      <div class="grid g2" style="margin-top:1rem">
        <div class="card funnel"><h2>Submission pipeline</h2>
          ${stages.map((s) => `<div class="fr"><span>${s}</span><div class="bar"><i style="width:${(counts[s] / maxC) * 100}%;background:${s === 'Not invited' ? 'var(--muted)' : s === 'Published' || s === 'Submitted' ? 'var(--ok)' : 'var(--saffron)'}"></i></div><b>${counts[s]}</b></div>`).join('')}</div>
        <div class="card"><h2>Upcoming interviews</h2>
          ${interviews.length ? `<table><tbody>${interviews.map((e) => { const sc = db().submissions[e.empId].schedule; return `<tr><td><b>${esc(e.name)}</b><div class="muted sm">${esc(e.discipline)}</div></td><td class="right nowrap">${U.fmtDate(sc.date)}<div class="muted sm">${esc(sc.time)} · ${esc(sc.mode)}</div></td></tr>`; }).join('')}</tbody></table>` : '<div class="empty">No interviews scheduled</div>'}</div>
      </div>

      <div class="card" style="margin-top:1rem"><h2>Needs attention</h2>
        ${attention.length ? `<div class="tbl-wrap" style="border:0"><table><thead><tr><th>Employee</th><th>Retires</th><th>Stage</th><th>Last mail</th><th></th></tr></thead><tbody>
          ${attention.map((e) => { const k = suggestKind(e); const lm = Store.lastMail(e.empId); return `<tr><td><b>${esc(e.name)}</b><div class="muted sm">${esc(e.discipline)}</div></td><td>${U.fmtDate(e.dor)} ${daysChip(U.daysTo(e.dor))}</td><td>${stageChip(Store.stageOf(e.empId))}</td><td class="sm">${lm ? `${esc(KIND[lm.kind] || lm.kind)}<br><span class="muted">${U.fmtDateTime(lm.sentAt)}</span>` : '<span class="muted">none</span>'}</td>
          <td class="right nowrap">${k ? `<button class="btn sm primary" data-send="${e.empId}" data-kind="${k}">Send ${esc(KIND[k].toLowerCase())}</button> ` : ''}<a class="btn sm" href="#/admin/submission/${e.empId}">Open</a></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">🎉 Nobody retiring within 30 days has pending items.</div>'}
      </div>`;
    const again = () => w.App.render();
    if ($('#run-auto', el)) $('#run-auto', el).onclick = () => sendWithToast(due.map((e) => e.empId), 'auto-2m', again);
    el.onclick = (ev) => { const b = ev.target.closest('[data-send]'); if (b) sendWithToast([b.dataset.send], b.dataset.kind, again); };
  };

  /* ------------------------------------------------------------ master data */
  V.adminMaster = (el) => {
    const emps = Store.employeesSorted();
    el.innerHTML = `
      <div class="pagehead"><div><h1>Manpower master data</h1><p class="muted">Upload the master with each employee's retirement date. The 2-month mail is triggered from <code>dor</code>.</p></div>
        <div class="row"><button class="btn" id="tpl">⬇ CSV template</button><button class="btn" id="exp">⬇ Export current</button></div></div>
      <div class="card"><h2>Upload CSV</h2>
        <p class="muted sm">Columns: <code>empId, name, designation, discipline, location, doj, dor, email, mobile</code>. Dates as YYYY-MM-DD. <code>mobile</code> is optional.</p>
        <div class="row"><input type="file" id="csv" accept=".csv,text/csv" style="max-width:340px">
          <label class="row" style="margin:0"><input type="radio" name="mode" value="merge" checked style="width:auto;min-height:0"> Merge (update + add)</label>
          <label class="row" style="margin:0"><input type="radio" name="mode" value="replace" style="width:auto;min-height:0"> Replace all</label>
          <button class="btn primary" id="up">Upload</button></div></div>
      <div class="row" style="margin:1rem 0 .5rem"><input id="qs" type="search" placeholder="Search name, discipline, location…" style="max-width:360px"><span class="muted sm" id="cnt"></span></div>
      <div class="tbl-wrap"><table><thead><tr><th>Emp ID</th><th>Name</th><th>Designation</th><th>Discipline</th><th>Location</th><th>Retirement</th><th>Email</th><th>Stage</th></tr></thead><tbody id="tb"></tbody></table></div>`;
    const draw = () => {
      const t = $('#qs', el).value.toLowerCase();
      const rows = Store.employeesSorted().filter((e) => !t || [e.empId, e.name, e.discipline, e.location, e.designation].join(' ').toLowerCase().includes(t));
      $('#cnt', el).textContent = `${rows.length} of ${db().employees.length}`;
      $('#tb', el).innerHTML = rows.map((e) => `<tr><td>${esc(e.empId)}</td><td><b>${esc(e.name)}</b></td><td>${esc(e.designation)}</td><td>${esc(e.discipline)}</td><td>${esc(e.location)}</td><td class="nowrap">${U.fmtDate(e.dor)} ${daysChip(U.daysTo(e.dor))}</td><td class="sm">${esc(e.email)}</td><td>${stageChip(Store.stageOf(e.empId))}</td></tr>`).join('');
    };
    draw(); $('#qs', el).oninput = U.debounce(draw, 150);
    const cols = ['empId', 'name', 'designation', 'discipline', 'location', 'doj', 'dor', 'email', 'mobile'];
    $('#tpl', el).onclick = () => U.download('manpower_master_template.csv', U.toCSV([{ empId: 'E2001', name: 'Sample Name', designation: 'General Manager', discipline: 'Drilling Services', location: 'Mumbai', doj: '1993-01-01', dor: '2027-06-30', email: 'sample.name@yourorg.example', mobile: '+91 90000 00000' }], cols));
    $('#exp', el).onclick = () => U.download('manpower_master.csv', U.toCSV(emps, cols));
    $('#up', el).onclick = () => {
      const f = $('#csv', el).files[0]; if (!f) return U.toast('Choose a CSV file first.');
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const rows = U.parseCSV(String(rd.result)); if (!rows.length) throw new Error('The file has no data rows.');
          const replace = $('input[name=mode]:checked', el).value === 'replace';
          if (replace && !confirm(`Replace ALL ${db().employees.length} existing employees with ${rows.length} rows?`)) return;
          const n = Store.upsertEmployees(rows, replace); U.toast(`${n} employees loaded`); draw();
        } catch (e) { U.toast(e.message, 5000); }
      };
      rd.readAsText(f);
    };
  };

  /* ------------------------------------------------------------ mail centre */
  V.adminMail = (el) => {
    el.innerHTML = `
      <div class="pagehead"><div><h1>Mail centre</h1><p class="muted">Track every mail and each employee's response. Send invitations, reminders and nudges.</p></div>
        <div class="row"><button class="btn" id="sync">⟳ Sync status from GitHub log</button></div></div>
      <div class="note" style="margin-bottom:1rem">Channel: <b>${esc({ demo: 'Demo (simulated, no real email)', github: 'GitHub Actions (real SMTP)', mailto: 'Mail client drafts' }[db().settings.mailChannel])}</b> · change in <a href="#/admin/settings">Settings</a>. "Opened" tracking is not possible with plain email, so engagement is measured by actual portal activity (Logged in → Mode chosen → In progress → Submitted).</div>
      <div class="row" style="margin-bottom:.6rem">
        <select id="mf" style="width:auto"><option value="up">Yet to retire</option><option value="all">All employees</option><option value="att">Needs attention (≤30 d)</option><option value="noinv">Not invited</option></select>
        <span class="spacer"></span><select id="bk" style="width:auto"><option value="">Bulk action…</option>${['invite', 'auto-2m', 'reminder', 'nudge'].map((k) => `<option value="${k}">Send: ${KIND[k]}</option>`).join('')}</select><button class="btn primary sm" id="bgo">Apply to selected</button></div>
      <div class="tbl-wrap"><table><thead><tr><th style="width:30px"><input type="checkbox" id="all" style="width:auto;min-height:0" aria-label="Select all"></th><th>Employee</th><th>Retires</th><th>Last mail</th><th>Progress</th><th>Suggested</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>
      <h2 style="margin-top:1.4rem">Mail log</h2>
      <div class="row" style="margin-bottom:.5rem"><select id="lf" style="width:auto"><option value="">All statuses</option><option>sent</option><option>queued</option><option>failed</option></select></div>
      <div class="tbl-wrap"><table><thead><tr><th>When</th><th>Employee</th><th>Type</th><th>Status</th><th>Channel</th><th>Note</th><th></th></tr></thead><tbody id="log"></tbody></table></div>`;
    const list = () => {
      const f = $('#mf', el).value; let r = Store.employeesSorted();
      if (f === 'up') r = r.filter((e) => U.daysTo(e.dor) >= 0); else if (f === 'att') r = r.filter(needsAttention); else if (f === 'noinv') r = r.filter((e) => Store.stageOf(e.empId) === 'Not invited' && U.daysTo(e.dor) >= 0);
      return r;
    };
    const draw = () => {
      $('#tb', el).innerHTML = list().map((e) => {
        const lm = Store.lastMail(e.empId); const k = suggestKind(e); const p = Store.progressOf(e.empId);
        return `<tr><td><input type="checkbox" class="sel" value="${e.empId}" style="width:auto;min-height:0" aria-label="Select ${esc(e.name)}"></td>
          <td><b>${esc(e.name)}</b><div class="muted sm">${esc(e.discipline)} · ${esc(e.empId)}</div></td>
          <td class="nowrap">${U.fmtDate(e.dor)} ${daysChip(U.daysTo(e.dor))}</td>
          <td class="sm">${lm ? `${esc(KIND[lm.kind] || lm.kind)} ${V.chip(lm.status, statusCls[lm.status])}<br><span class="muted">${U.fmtDateTime(lm.sentAt)}</span>` : '<span class="muted">No mail yet</span>'}</td>
          <td style="min-width:130px">${stageChip(Store.stageOf(e.empId))}<div class="bar" style="margin-top:.35rem"><i style="width:${p}%"></i></div></td>
          <td>${k ? V.chip(KIND[k], 'warn') : V.chip('Nothing needed', 'ok')}</td>
          <td class="right nowrap">${k ? `<button class="btn sm primary" data-send="${e.empId}" data-kind="${k}">Send</button> ` : ''}<button class="btn sm" data-pre="${e.empId}" data-kind="${k || 'nudge'}">Preview</button> <a class="btn sm" href="#/admin/submission/${e.empId}">Open</a></td></tr>`;
      }).join('') || `<tr><td colspan="7" class="empty">No employees in this view.</td></tr>`;
      const lf = $('#lf', el).value;
      const log = Store.allMail().filter((m) => !lf || m.status === lf).slice(0, 80);
      $('#log', el).innerHTML = log.map((m) => { const e = Store.employee(m.empId) || { name: m.empId };
        return `<tr><td class="nowrap sm">${U.fmtDateTime(m.sentAt)}</td><td>${esc(e.name)}</td><td>${esc(KIND[m.kind] || m.kind)}</td><td>${V.chip(m.status, statusCls[m.status])}</td><td class="sm">${esc(m.channel)}</td><td class="sm muted">${esc(m.note || '')}</td>
        <td class="right">${m.status === 'failed' ? `<button class="btn sm" data-send="${m.empId}" data-kind="${m.kind}">Retry</button>` : ''}</td></tr>`; }).join('');
    };
    draw(); $('#mf', el).onchange = draw; $('#lf', el).onchange = draw;
    $('#all', el).onchange = (ev) => $$('.sel', el).forEach((c) => (c.checked = ev.target.checked));
    const again = () => { draw(); };
    el.onclick = (ev) => {
      const s = ev.target.closest('[data-send]'); if (s) sendWithToast([s.dataset.send], s.dataset.kind, again);
      const p = ev.target.closest('[data-pre]'); if (p) V.previewMail(p.dataset.pre, p.dataset.kind);
    };
    $('#bgo', el).onclick = () => {
      const ids = $$('.sel:checked', el).map((c) => c.value); const k = $('#bk', el).value;
      if (!ids.length) return U.toast('Select at least one employee.'); if (!k) return U.toast('Choose a bulk action.');
      if (confirm(`Send "${KIND[k]}" to ${ids.length} employee(s)?`)) sendWithToast(ids, k, again);
    };
    $('#sync', el).onclick = async () => {
      try {
        const r = await fetch('data/mail_log.json?t=' + Date.now()); if (!r.ok) throw new Error('data/mail_log.json not found (HTTP ' + r.status + ')');
        Store.remoteLog = await r.json(); U.toast(`Synced ${Store.remoteLog.length} entries from the GitHub Actions log`); draw();
      } catch (e) { U.toast('Sync failed: ' + e.message + '. (Only works when hosted on GitHub Pages.)', 5000); }
    };
  };

  /* ------------------------------------------------------------ submissions */
  V.adminSubs = (el) => {
    el.innerHTML = `
      <div class="pagehead"><div><h1>Submissions</h1><p class="muted">Progress of every employee's contribution. Open a row to view, edit, schedule, review or publish.</p></div></div>
      <div class="row" style="margin-bottom:.6rem"><select id="sf" style="width:auto"><option value="">All stages</option>${Store.STAGES.map((s) => `<option>${s}</option>`).join('')}</select><input id="sq" type="search" placeholder="Search…" style="max-width:300px"></div>
      <div class="tbl-wrap"><table><thead><tr><th>Employee</th><th>Retires</th><th>Modes chosen</th><th>Interview</th><th>Questionnaire</th><th>Stage</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>`;
    const draw = () => {
      const f = $('#sf', el).value, t = $('#sq', el).value.toLowerCase();
      $('#tb', el).innerHTML = Store.employeesSorted().filter((e) => (!f || Store.stageOf(e.empId) === f) && (!t || (e.name + e.discipline).toLowerCase().includes(t))).map((e) => {
        const s = db().submissions[e.empId] || {}; const a = (s.modes || []); const ans = Object.values(s.answers || {}).filter((x) => x && x.trim()).length; const pct = Math.round((ans / db().questions.length) * 100);
        return `<tr><td><b>${esc(e.name)}</b><div class="muted sm">${esc(e.discipline)}</div></td><td class="nowrap">${U.fmtDate(e.dor)} ${daysChip(U.daysTo(e.dor))}</td>
          <td>${a.length ? a.map((m) => V.chip(m.replace(' questionnaire', ''), 'gray')).join(' ') : '<span class="muted">—</span>'}</td>
          <td class="sm">${s.schedule ? `${V.chip(s.schedule.status, s.schedule.status === 'Completed' ? 'ok' : 'warn')}<br>${U.fmtDate(s.schedule.date)} ${esc(s.schedule.time)}` : '<span class="muted">—</span>'}</td>
          <td style="min-width:110px"><div class="sm">${ans}/${db().questions.length} answered</div><div class="bar"><i style="width:${pct}%"></i></div></td>
          <td>${stageChip(Store.stageOf(e.empId))}</td><td class="right"><a class="btn sm primary" href="#/admin/submission/${e.empId}">Open</a></td></tr>`;
      }).join('') || `<tr><td colspan="7" class="empty">Nothing matches.</td></tr>`;
    };
    draw(); $('#sf', el).onchange = draw; $('#sq', el).oninput = U.debounce(draw, 150);
  };

  V.adminSub = (el, empId) => {
    const e = Store.employee(empId); if (!e) { el.innerHTML = '<div class="card empty">Employee not found.</div>'; return; }
    const s = Store.sub(empId); const k = suggestKind(e); const lm = Store.lastMail(empId);
    const assets = db().assets.filter((a) => a.empId === empId);
    el.innerHTML = `
      <div class="card" style="border-color:var(--navy2);margin-bottom:1rem"><h2>Admin controls</h2>
        <div class="row" style="margin-bottom:.6rem">${stageChip(Store.stageOf(empId))} ${V.chip(Store.progressOf(empId) + '% complete', 'gray')} <span class="muted sm">Last mail: ${lm ? `${esc(KIND[lm.kind] || lm.kind)} · ${esc(lm.status)} · ${U.fmtDateTime(lm.sentAt)}` : 'none'}</span></div>
        <div class="row">
          ${k ? `<button class="btn primary sm" id="a-send">Send ${esc(KIND[k].toLowerCase())}</button><button class="btn sm" id="a-prev">Preview mail</button>` : ''}
          ${s.schedule ? `<select id="a-ss" style="width:auto"><option ${s.schedule.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option><option ${s.schedule.status === 'Completed' ? 'selected' : ''}>Completed</option><option ${s.schedule.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option></select><button class="btn sm" id="a-sv">Update interview status</button>` : ''}
          <button class="btn sm" id="a-iv">＋ Add / replace interview asset</button></div>
        ${assets.length ? `<div style="margin-top:.8rem"><b class="sm">Learning assets</b>${assets.map((a) => `<div class="row" style="margin:.3rem 0"><a href="#/repo/${a.id}">${esc(a.title)}</a> ${V.chip(a.type, 'gray')} ${a.published ? V.chip('Published', 'ok') : V.chip('Draft', 'warn')} <button class="btn sm ${a.published ? '' : 'saffron'}" data-pub="${a.id}">${a.published ? 'Unpublish' : 'Publish to repository'}</button></div>`).join('')}</div>` : ''}
      </div><div id="jr"></div>`;
    V.journey($('#jr', el), empId);
    if ($('#a-send', el)) $('#a-send', el).onclick = () => sendWithToast([empId], k, () => w.App.render());
    if ($('#a-prev', el)) $('#a-prev', el).onclick = () => V.previewMail(empId, k);
    if ($('#a-sv', el)) $('#a-sv', el).onclick = () => { s.schedule.status = $('#a-ss', el).value; Store.save(); U.toast('Interview status updated'); w.App.render(); };
    $$('[data-pub]', el).forEach((b) => (b.onclick = () => { const a = Store.asset(b.dataset.pub); Store.setPublished(a.id, !a.published); U.toast(a.published ? 'Published: now visible to learners' : 'Unpublished'); w.App.render(); }));
    $('#a-iv', el).onclick = () => V.modal(`<h2>Interview asset for ${esc(e.name)} <button class="btn sm ghost" data-close>✕</button></h2>
      <p class="muted sm">Paste the transcript or summary as question/answer pairs. Start each question with <code>Q:</code> and each answer with <code>A:</code>.</p>
      <label for="iv-title">Title</label><input id="iv-title" value="Interview: ">
      <label for="iv-min">Duration (minutes)</label><input id="iv-min" type="number" min="1" value="10">
      <label for="iv-qa">Transcript</label><textarea id="iv-qa" style="min-height:220px" placeholder="Q: How did you handle ...?&#10;A: We started by ...&#10;&#10;Q: What would you tell your successor?&#10;A: ..."></textarea>
      <label for="iv-tags">Tags (comma separated, optional: suggested automatically)</label><input id="iv-tags" list="taxo">
      <datalist id="taxo">${Object.keys(db().taxonomy).map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
      <div class="row" style="margin-top:1rem;justify-content:flex-end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="iv-go">Save as draft asset</button></div>`,
    (bg, close) => $('#iv-go', bg).onclick = () => {
      const txt = $('#iv-qa', bg).value; const qa = [];
      txt.split(/\n(?=\s*Q:)/i).forEach((blk) => { const m = blk.match(/^\s*Q:\s*([\s\S]*?)\n\s*A:\s*([\s\S]*)$/i); if (m) qa.push({ q: m[1].trim(), a: m[2].trim() }); });
      if (!qa.length) return U.toast('No Q:/A: pairs found.');
      let tags = $('#iv-tags', bg).value.split(',').map((x) => x.trim()).filter(Boolean);
      if (!tags.length) tags = Store.suggestTags(qa.map((x) => x.a).join(' '));
      Store.addInterviewAsset(empId, $('#iv-title', bg).value, qa, tags, +$('#iv-min', bg).value || null);
      close(); U.toast(`Saved ${qa.length} Q&A as draft. Publish when ready.`); w.App.render();
    });
  };

  /* ------------------------------------------------------------ assets */
  V.adminAssets = (el) => {
    const draw = () => {
      el.innerHTML = `
        <div class="pagehead"><div><h1>Assets</h1><p class="muted">Curate what learners see: edit tags, publish or unpublish, remove.</p></div></div>
        <div class="tbl-wrap"><table><thead><tr><th>Asset</th><th>Type</th><th>Tags</th><th>Status</th><th></th></tr></thead><tbody>
        ${db().assets.map((a) => { const e = Store.employee(a.empId) || {}; return `<tr><td><a href="#/repo/${a.id}"><b>${esc(a.title)}</b></a><div class="muted sm">${esc(e.name)} · ${esc(a.discipline)} · ${a.qa.length} Q&A</div></td><td>${V.chip(a.type, 'gray')}</td>
          <td><div class="chips">${a.tags.map((t) => V.chip(t, V.tagCls(t))).join('') || '<span class="muted sm">untagged</span>'}</div></td><td>${a.published ? V.chip('Published', 'ok') : V.chip('Draft', 'warn')}</td>
          <td class="right nowrap"><button class="btn sm" data-edit="${a.id}">Edit tags</button> <button class="btn sm ${a.published ? '' : 'saffron'}" data-pub="${a.id}">${a.published ? 'Unpublish' : 'Publish'}</button> <button class="btn sm danger" data-del="${a.id}">Delete</button></td></tr>`; }).join('')}
        </tbody></table></div>`;
    };
    draw();
    el.onclick = (ev) => {
      const p = ev.target.closest('[data-pub]'); if (p) { const a = Store.asset(p.dataset.pub); Store.setPublished(a.id, !a.published); draw(); return; }
      const d = ev.target.closest('[data-del]'); if (d && confirm('Delete this asset permanently?')) { Store.deleteAsset(d.dataset.del); draw(); return; }
      const ed = ev.target.closest('[data-edit]');
      if (ed) { const a = Store.asset(ed.dataset.edit);
        V.modal(`<h2>Edit tags <button class="btn sm ghost" data-close>✕</button></h2><label for="et-title">Title</label><input id="et-title" value="${esc(a.title)}">
          <label for="et-tags">Tags (comma separated)</label><input id="et-tags" list="taxo" value="${esc(a.tags.join(', '))}"><datalist id="taxo">${Object.keys(db().taxonomy).map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
          <div class="note" style="margin-top:.6rem">Suggested from content: ${Store.suggestTags(a.qa.map((x) => x.a).join(' ')).map((t) => V.chip(t)).join(' ') || 'none'}</div>
          <div class="row" style="margin-top:1rem;justify-content:flex-end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="et-go">Save</button></div>`,
        (bg, close) => $('#et-go', bg).onclick = () => { a.title = $('#et-title', bg).value.trim() || a.title; a.tags = $('#et-tags', bg).value.split(',').map((x) => x.trim()).filter(Boolean); Store.save(); close(); draw(); }); }
    };
  };

  /* ------------------------------------------------------------ settings */
  V.adminSettings = (el) => {
    const st = db().settings;
    el.innerHTML = `
      <div class="pagehead"><div><h1>Settings</h1><p class="muted">Automation, mail channel and templates.</p></div></div>
      <div class="grid g2">
        <div class="card"><h2>Automation</h2>
          <label for="s-lead">Send invitation this many days before superannuation</label><input id="s-lead" type="number" min="1" value="${st.leadDays}">
          <label for="s-url">Portal link used in emails</label><input id="s-url" value="${esc(st.portalUrl)}">
          <div class="row" style="margin-top:.8rem"><button class="btn primary" id="s-save">Save</button></div></div>
        <div class="card"><h2>Mail channel</h2>
          <label for="s-ch">How should the portal send mail?</label>
          <select id="s-ch"><option value="demo" ${st.mailChannel === 'demo' ? 'selected' : ''}>Demo: simulate (no real email)</option><option value="github" ${st.mailChannel === 'github' ? 'selected' : ''}>GitHub Actions: real SMTP via workflow</option><option value="mailto" ${st.mailChannel === 'mailto' ? 'selected' : ''}>Mail client drafts (mailto)</option></select>
          <label for="s-repo">GitHub repo (owner/name)</label><input id="s-repo" value="${esc(st.gh.repo)}" placeholder="your-user/smriti-portal">
          <div class="grid g2"><div><label for="s-br">Branch</label><input id="s-br" value="${esc(st.gh.branch)}"></div><div><label for="s-wf">Workflow file</label><input id="s-wf" value="${esc(st.gh.workflow)}"></div></div>
          <label for="s-tok">Fine-grained token (Actions: write). Kept for this browser session only</label><input id="s-tok" type="password" autocomplete="off" value="${esc(sessionStorage.getItem('smriti_gh_token') || '')}">
          <div class="note warn" style="margin-top:.6rem">The automatic 2-month mail runs on GitHub's servers daily and needs no token. The token is only for the "Send" buttons here. Never share it.</div>
          <div class="row" style="margin-top:.8rem"><button class="btn primary" id="s-save2">Save</button></div></div>
      </div>
      <div class="card" style="margin-top:1rem"><h2>Email templates</h2>
        <select id="t-k" style="max-width:300px">${Object.entries(st.templates).map(([k, t]) => `<option value="${k}">${esc(t.label)}</option>`).join('')}</select>
        <label for="t-s">Subject</label><input id="t-s"><label for="t-b">Body</label><textarea id="t-b" style="min-height:200px"></textarea>
        <div class="muted sm">Placeholders: <code>{{name}}</code> <code>{{dor}}</code> <code>{{days}}</code> <code>{{link}}</code>. The automatic mail from GitHub uses <code>data/mail_templates.json</code> in the repo; keep both in sync.</div>
        <div class="row" style="margin-top:.8rem"><button class="btn primary" id="t-save">Save template</button></div></div>
      <div class="card" style="margin-top:1rem"><h2>Demo data</h2><p class="muted sm">All portal data is stored in this browser in demo mode.</p>
        <div class="row"><button class="btn" id="d-exp">⬇ Export backup (JSON)</button><button class="btn danger" id="d-reset">Reset to sample data</button></div></div>`;
    const apply = (reload) => { Store.save(); U.toast('Saved'); if (reload) w.App.render(); };
    $('#s-save', el).onclick = () => { st.leadDays = +$('#s-lead', el).value || 60; st.portalUrl = $('#s-url', el).value.trim(); apply(true); };
    $('#s-save2', el).onclick = () => { st.mailChannel = $('#s-ch', el).value; st.gh = { repo: $('#s-repo', el).value.trim(), branch: $('#s-br', el).value.trim() || 'main', workflow: $('#s-wf', el).value.trim() || 'reminders.yml' }; sessionStorage.setItem('smriti_gh_token', $('#s-tok', el).value.trim()); apply(); };
    const tk = () => $('#t-k', el).value;
    const loadT = () => { $('#t-s', el).value = st.templates[tk()].subject; $('#t-b', el).value = st.templates[tk()].body; };
    loadT(); $('#t-k', el).onchange = loadT;
    $('#t-save', el).onclick = () => { st.templates[tk()].subject = $('#t-s', el).value; st.templates[tk()].body = $('#t-b', el).value; apply(); };
    $('#d-exp', el).onclick = () => U.download('smriti_backup.json', JSON.stringify(db(), null, 1), 'application/json');
    $('#d-reset', el).onclick = () => { if (confirm('Reset ALL data to the original sample data?')) { Store.reset(); U.toast('Reset done'); w.App.render(); } };
  };
})(window);
