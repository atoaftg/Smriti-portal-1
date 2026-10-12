/* Data layer.
 *
 * DEMO MODE: all state lives in the browser (localStorage), seeded from js/seed.js.
 * PRODUCTION: replace the body of load()/save() (and the few async-able calls) with calls to your
 * organisation's API / database. Everything else in the portal talks only to this module.
 */
(function (w) {
  const KEY = 'smriti_db_v2';
  const S = {};
  let db = null;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function seedDB() {
    const s = w.SEED;
    const subs = clone(s.submissions);
    return {
      v: 2,
      employees: s.employees.map((e) => ({ ...e })),
      submissions: subs,
      assets: clone(s.assets),
      mailLog: clone(s.mailLog),
      settings: { ...clone(s.settings), templates: clone(s.templates) },
      questions: s.questions,
      taxonomy: s.taxonomy,
    };
  }
  S.init = () => {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || db.v !== 2) { db = seedDB(); S.save(); }
    U.clock.override = '';                 // always the real date
    return db;
  };
  S.save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* storage full/blocked */ } };
  S.reset = () => { db = seedDB(); S.save(); };
  S.db = () => db;
  S.remoteLog = [];

  // ---- employees
  S.employee = (id) => db.employees.find((e) => e.empId === id);
  S.employeesSorted = () => db.employees.slice().sort((a, b) => a.dor.localeCompare(b.dor));
  S.upsertEmployees = (rows, replace) => {
    const need = ['empId', 'name', 'designation', 'discipline', 'location', 'doj', 'dor', 'email'];
    const bad = rows.findIndex((r) => need.some((k) => !r[k]));
    if (bad >= 0) throw new Error(`Row ${bad + 2}: one of ${need.join(', ')} is empty`);
    const badDate = rows.findIndex((r) => !/^\d{4}-\d{2}-\d{2}$/.test(r.dor));
    if (badDate >= 0) throw new Error(`Row ${badDate + 2}: dor must be YYYY-MM-DD`);
    if (replace) db.employees = [];
    rows.forEach((r) => {
      const i = db.employees.findIndex((e) => e.empId === r.empId);
      const rec = { mobile: '', ...r };
      if (i >= 0) db.employees[i] = { ...db.employees[i], ...rec }; else db.employees.push(rec);
    });
    S.save(); return rows.length;
  };

  // ---- submissions (one per superannuating employee)
  S.sub = (empId) => {
    if (!db.submissions[empId]) db.submissions[empId] = { modes: [], answers: {} };
    return db.submissions[empId];
  };
  S.hasMail = (empId, kinds) => allMail().some((m) => m.empId === empId && m.status !== 'failed' && (!kinds || kinds.includes(m.kind)));

  /* Pipeline stage for admin tracking */
  S.STAGES = ['Not invited', 'Invited', 'Logged in', 'Mode chosen', 'In progress', 'Submitted', 'Published'];
  S.stageOf = (empId) => {
    const s = db.submissions[empId] || {};
    if (s.published) return 'Published';
    if (s.submittedAt) return 'Submitted';
    const answered = Object.values(s.answers || {}).filter((v) => v && v.trim()).length;
    if (answered > 0) return 'In progress';
    if (s.modes && s.modes.length) return 'Mode chosen';
    if (s.loggedInAt) return 'Logged in';
    if (S.hasMail(empId)) return 'Invited';
    return 'Not invited';
  };
  S.progressOf = (empId) => {
    const s = db.submissions[empId] || {};
    const total = db.questions.length;
    const answered = Object.values(s.answers || {}).filter((v) => v && v.trim()).length;
    const modes = s.modes || [];
    const wantsWritten = modes.length === 0 || modes.includes('Written questionnaire');
    const wantsInterview = modes.some((m) => db.settings.interviewModes.includes(m));
    let parts = 0, done = 0;
    parts += 1; done += modes.length ? 1 : 0;                    // chose a mode
    if (wantsWritten) { parts += 1; done += s.submittedAt ? 1 : answered / total; }
    if (wantsInterview) { parts += 1; done += s.schedule ? (s.schedule.status === 'Completed' ? 1 : 0.6) : 0; }
    return Math.round((done / parts) * 100);
  };

  // ---- mail log
  function allMail() { return db.mailLog.concat(S.remoteLog.filter((r) => !db.mailLog.some((m) => m.id === r.id))); }
  S.allMail = () => allMail().slice().sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  S.logMail = (entry) => {
    const e = { id: 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), sentAt: U.now().toISOString(), status: 'sent', channel: 'portal', note: '', ...entry };
    db.mailLog.push(e); S.save(); return e;
  };
  S.lastMail = (empId) => S.allMail().find((m) => m.empId === empId);
  S.templates = () => db.settings.templates;
  S.mailVars = (e) => {
    const days = U.daysTo(e.dor);
    return { name: e.name, dor: U.fmtDate(e.dor), days: Math.max(days, 0), link: db.settings.portalUrl };
  };
  S.renderMail = (kind, e) => {
    const t = db.settings.templates[kind]; const v = S.mailVars(e);
    return { subject: U.fill(t.subject, v), body: U.fill(t.body, v) };
  };
  /* who should receive the automatic 2-month mail right now? */
  S.dueForAuto = () => db.employees.filter((e) => {
    const d = U.daysTo(e.dor);
    return d >= 0 && d <= db.settings.leadDays && !S.hasMail(e.empId, ['auto-2m']);
  });

  // ---- assets
  S.published = () => db.assets.filter((a) => a.published);
  S.asset = (id) => db.assets.find((a) => a.id === id);
  S.suggestTags = (text) => {
    const t = ' ' + String(text).toLowerCase() + ' ';
    return Object.entries(db.taxonomy).filter(([, kws]) => kws.some((k) => t.includes(k))).map(([tag]) => tag);
  };
  S.submitWritten = (empId) => {
    const e = S.employee(empId), s = S.sub(empId);
    const qa = db.questions.filter((q) => (s.answers[q.id] || '').trim()).map((q) => ({ qid: q.id, q: q.text, a: s.answers[q.id].trim() }));
    if (!qa.length) throw new Error('Please answer at least one question before submitting.');
    const id = `A-${empId}-Q`;
    const tags = Array.from(new Set(S.suggestTags(qa.map((x) => x.a).join(' '))));
    const asset = {
      id, empId, type: 'Questionnaire', title: `${e.name}: experience questionnaire (${e.discipline})`,
      discipline: e.discipline, location: e.location, retireYear: +e.dor.slice(0, 4), tags, mode: 'Written', minutes: null,
      qa, published: false, createdAt: U.todayISO(),
    };
    const i = db.assets.findIndex((a) => a.id === id);
    if (i >= 0) { asset.published = db.assets[i].published; db.assets[i] = asset; } else db.assets.push(asset);
    s.assetId = id; s.submittedAt = s.submittedAt || U.now().toISOString().slice(0, 10);
    S.save(); return asset;
  };
  S.setPublished = (assetId, flag) => {
    const a = S.asset(assetId); if (!a) return;
    a.published = flag;
    const s = db.submissions[a.empId]; if (s && s.assetId === assetId) s.published = flag;
    S.save();
  };
  S.addInterviewAsset = (empId, title, qa, tags, minutes) => {
    const e = S.employee(empId);
    const id = `A-${empId}-I`;
    const asset = {
      id, empId, type: 'Interview', title: title || `Interview: ${e.name}`, discipline: e.discipline, location: e.location,
      retireYear: +e.dor.slice(0, 4), tags, mode: 'Interview', minutes: minutes || null,
      qa: qa.map((x, i) => ({ qid: `i${i + 1}`, q: x.q, a: x.a })), published: false, createdAt: U.todayISO(),
    };
    const i = db.assets.findIndex((a) => a.id === id);
    if (i >= 0) { asset.published = db.assets[i].published; db.assets[i] = asset; } else db.assets.push(asset);
    S.save(); return asset;
  };
  S.deleteAsset = (id) => { db.assets = db.assets.filter((a) => a.id !== id); S.save(); };

  w.Store = S;
  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
