/* Small helpers shared by every module. No dependencies. */
(function (w) {
  const U = {};
  U.$ = (s, r = document) => r.querySelector(s);
  U.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  // Tiny non-cryptographic hash (cyrb53). DEMO LOGIN ONLY: real auth is delegated to AD/OIDC.
  U.hash = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  };

  // ---- dates (portal has a "demo clock" so sample data stays meaningful)
  U.clock = { override: '' };
  U.now = () => {
    if (U.clock.override) { const d = new Date(U.clock.override + 'T09:00:00'); return d; }
    return new Date();
  };
  U.startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  U.parseDate = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  U.daysTo = (dateStr) => Math.round((U.parseDate(dateStr) - U.startOfDay(U.now())) / 864e5);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  U.fmtDate = (s) => { if (!s) return '—'; const d = U.parseDate(s); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
  U.fmtDateTime = (iso) => { if (!iso) return '—'; const d = new Date(iso); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  U.isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  U.todayISO = () => U.isoDate(U.now());

  // ---- CSV
  U.parseCSV = (text) => {
    const rows = []; let row = [], cur = '', q = false;
    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = ''; if (row.some((x) => x !== '')) rows.push(row); row = [];
      } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); if (row.some((x) => x !== '')) rows.push(row); }
    if (!rows.length) return [];
    const head = rows[0].map((h) => h.trim());
    return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
  };
  U.toCSV = (rows, cols) => {
    const e = (v) => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [cols.join(',')].concat(rows.map((r) => cols.map((c) => e(r[c])).join(','))).join('\n');
  };
  U.download = (name, text, type = 'text/csv') => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  };

  U.toast = (msg, ms = 2800) => {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(U._tt); U._tt = setTimeout(() => t.classList.remove('show'), ms);
  };
  U.words = (s) => (String(s).trim().match(/\S+/g) || []).length;
  U.initials = (n) => n.replace(/^Dr\.\s*|^Capt\.\s*/, '').split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  U.fill = (tpl, vars) => String(tpl).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));

  w.U = U;
  if (typeof module !== 'undefined') module.exports = U;
})(typeof window !== 'undefined' ? window : globalThis);
