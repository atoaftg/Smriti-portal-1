/* Ask Smriti: retrieval + answer composition that is GROUNDED ONLY in the repository.
 *
 * How it works (all in the browser, instant, no API key):
 *  1. Every Q&A in every PUBLISHED asset becomes a "chunk" (title + tags + person + question + answer).
 *  2. The question is expanded with a small oil-and-gas synonym list and scored with BM25.
 *  3. Coverage: we keep every relevant chunk (max 2 per asset, up to 10 assets), so the answer spans
 *     all assets that speak to the question. Remaining relevant assets are listed as "also relevant".
 *  4. The answer is built from the colleagues' OWN sentences (verbatim excerpts) with citations.
 *     Nothing is invented. If nothing relevant exists the agent says so.
 *
 * To add a generative LLM later, send only the retrieved chunks to a server-side function with the
 * instruction "answer strictly from these excerpts" (see README). The retrieval here stays the same.
 */
(function (w) {
  const STOP = new Set(('a an the and or of to in on for with from by at as is are was were be been it its this that these those which who whom what when where why how do does did can could should would will shall may might i we you he she they them their our your my me us not no yes if then than so such about into over under between during after before also any all some more most other each very just tell give show explain please there here have has had learn lessons lesson experience experiences colleagues shared share said say says').split(' '));
  const SYN = {
    bop: ['blowout', 'preventer', 'well', 'control'], kick: ['well', 'control', 'influx'], blowout: ['well', 'control', 'kick'],
    hse: ['safety', 'risk', 'incident'], safety: ['hse', 'risk', 'permit', 'incident'], ptw: ['permit', 'work'],
    emergency: ['fire', 'drill', 'evacuation'], firefighting: ['fire', 'foam'],
    mentor: ['mentoring', 'guide', 'junior'], mentoring: ['mentor', 'junior'], advice: ['young', 'junior', 'learn'],
    mistake: ['failure', 'wrong', 'lost'], failure: ['mistake', 'lost', 'missed'],
    seismic: ['geophysics', 'imaging', 'velocity'], geophysics: ['seismic'],
    reservoir: ['pressure', 'injection', 'simulation'], waterflood: ['water', 'injection'],
    compressor: ['rotating', 'vibration', 'bearing'], pump: ['rotating', 'vibration'], turbine: ['rotating', 'vibration'],
    lpg: ['plant', 'ngl', 'fractionation'], plant: ['process', 'gas', 'unit'], shutdown: ['turnaround'], turnaround: ['shutdown'],
    succession: ['talent', 'handover'], handover: ['successor', 'succession'], talent: ['people', 'succession'],
    stuck: ['pipe', 'packoff'], mud: ['fluid', 'drilling'], workover: ['intervention', 'coiled'],
    corrosion: ['amine', 'inspection'], wax: ['flow', 'pigging'], leak: ['fire', 'containment'],
    digital: ['analytics', 'data', 'dashboard'], ai: ['analytics', 'digital', 'data'], analytics: ['digital', 'data'],
    offshore: ['platform', 'rig'], tacit: ['rule', 'thumb'], rules: ['thumb', 'tacit'], thumb: ['rule', 'tacit'],
  };

  const PSYN = {
    'well control': ['kick', 'bop', 'influx', 'blowout', 'flow check', 'drill'],
    'permit to work': ['permit', 'isolation', 'handover', 'stop-work'],
    'stop work': ['stop-work', 'authority'],
    'near miss': ['near-miss', 'report', 'incident'],
    'process safety': ['hazop', 'relief', 'flare', 'management change'],
    'young engineers': ['young', 'junior', 'joining', 'first'],
    'rules of thumb': ['tacit', 'rule', 'thumb'],
    'gas processing': ['plant', 'amine', 'fractionation', 'condensate'],
    'root cause': ['cause', 'analysis'],
  };
  const stem = (t) => {
    if (t.length > 5 && t.endsWith('ing')) return t.slice(0, -3);
    if (t.length > 4 && t.endsWith('ed')) return t.slice(0, -2);
    if (t.length > 4 && t.endsWith('es')) return t.slice(0, -2);
    if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
    return t;
  };
  const tokenize = (s) => (String(s).toLowerCase().match(/[a-z0-9&]+/g) || []).filter((t) => t.length > 1 && !STOP.has(t)).map(stem);

  const Search = {};
  let chunks = [], df = new Map(), avgLen = 1, builtFor = '';

  Search.build = (assets, getEmp) => {
    const sig = assets.map((a) => a.id + ':' + a.qa.length + ':' + a.tags.join('|')).join(';');
    if (sig === builtFor) return; builtFor = sig;
    chunks = []; df = new Map();
    assets.forEach((a) => {
      const e = getEmp(a.empId) || {};
      a.qa.forEach((x, i) => {
        const text = [a.title, a.tags.join(' '), a.discipline, e.name || '', e.designation || '', x.q, x.a].join(' ');
        const toks = tokenize(text);
        const tf = new Map(); toks.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
        const qaTok = tokenize(x.q + ' ' + x.a); const bi = new Set(); for (let k = 0; k < qaTok.length - 1; k++) bi.add(qaTok[k] + ' ' + qaTok[k + 1]);
        chunks.push({ asset: a, idx: i, qa: x, tf, len: toks.length, bi });
        new Set(toks).forEach((t) => df.set(t, (df.get(t) || 0) + 1));
      });
    });
    avgLen = chunks.reduce((s, c) => s + c.len, 0) / Math.max(chunks.length, 1);
  };

  const expand = (q) => {
    const base = tokenize(q); const extra = [];
    const lq = String(q).toLowerCase();
    lq.match(/[a-z0-9&]+/g)?.forEach((raw) => { if (SYN[raw]) SYN[raw].forEach((s) => extra.push(stem(s))); });
    Object.keys(PSYN).forEach((ph) => { if (lq.includes(ph)) PSYN[ph].forEach((s) => tokenize(s).forEach((t) => extra.push(t))); });
    return { base, extra };
  };

  Search.score = (query) => {
    const { base, extra } = expand(query);
    if (!base.length) return { hits: [], base };
    const N = chunks.length, k1 = 1.4, b = 0.75;
    const weights = new Map();
    base.forEach((t) => weights.set(t, t === 'well' ? 0.3 : 1));   // 'well' is ambiguous (well vs. oil well)
    extra.forEach((t) => { if (!weights.has(t)) weights.set(t, 0.35); });
    const hits = chunks.map((c) => {
      let s = 0, matchedBase = 0;
      weights.forEach((wt, t) => {
        const f = c.tf.get(t); if (!f) return;
        const n = df.get(t) || 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        s += wt * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * c.len) / avgLen)));
        if (base.includes(t) && t !== 'well') matchedBase++;
      });
      for (let k = 0; k < base.length - 1; k++) if (c.bi.has(base[k] + ' ' + base[k + 1])) s += 2.0;   // phrase bonus
      return { chunk: c, score: s, matchedBase };
    }).filter((h) => h.score > 0 && h.matchedBase > 0 || (h.score > 0 && base.length === 0));
    hits.sort((a, b) => b.score - a.score);
    return { hits, base };
  };

  const sentences = (t) => (t.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [t]).map((s) => s.trim()).filter(Boolean);

  Search.answer = (query) => {
    const { hits, base } = Search.score(query);
    if (!hits.length || hits[0].score < 1.0) {
      return { found: false, plain: 'I could not find anything about this in the learning repository. Try different words, or browse the Repository tab by discipline or topic.', items: [], also: [], themes: [] };
    }
    const top = hits[0].score, cutoff = Math.max(top * 0.28, 1.0);
    const rel = hits.filter((h) => h.score >= cutoff);
    const perAsset = new Map(); const order = [];
    rel.forEach((h) => {
      const id = h.chunk.asset.id;
      if (!perAsset.has(id)) { perAsset.set(id, []); order.push(id); }
      if (perAsset.get(id).length < 2) perAsset.get(id).push(h);
    });
    const shown = order.slice(0, 10), rest = order.slice(10);
    const qTokens = new Set(base); const qBi = new Set(); for (let k = 0; k < base.length - 1; k++) qBi.add(base[k] + ' ' + base[k + 1]);
    const items = shown.map((id) => {
      const hs = perAsset.get(id); const a = hs[0].chunk.asset;
      const excerpts = hs.map((h) => {
        const ss = sentences(h.chunk.qa.a);
        const idf = (t) => Math.log(1 + (chunks.length - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));
        const scored = ss.map((s, i) => {
          const tk = tokenize(s); const uniq = new Set(tk);
          let sc = 0; uniq.forEach((t) => { if (qTokens.has(t)) sc += idf(t); });
          for (let k = 0; k < tk.length - 1; k++) if (qBi.has(tk[k] + ' ' + tk[k + 1])) sc += 2;
          return { s, i, sc };
        });
        let pick = scored.slice().sort((x, y) => y.sc - x.sc || x.i - y.i).slice(0, 2).filter((x) => x.sc > 0);
        if (!pick.length) pick = scored.slice(0, 1);
        pick.sort((x, y) => x.i - y.i);
        return { question: h.chunk.qa.q, text: pick.map((x) => x.s).join(' ') };
      });
      return { assetId: id, title: a.title, empId: a.empId, discipline: a.discipline, type: a.type, excerpts };
    });
    const tagCount = new Map();
    shown.forEach((id) => perAsset.get(id)[0].chunk.asset.tags.forEach((t) => tagCount.set(t, (tagCount.get(t) || 0) + 1)));
    const themes = [...tagCount.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
    const also = rest.map((id) => perAsset.get(id)[0].chunk.asset);
    return { found: true, items, also, themes, assetCount: order.length };
  };

  /* plain text for the voice reader; needs a name lookup */
  Search.toSpeech = (res, getEmp) => {
    if (!res.found) return res.plain;
    const parts = [`I found ${res.assetCount} learning ${res.assetCount === 1 ? 'asset' : 'assets'} that speak to your question.`];
    res.items.forEach((it, i) => {
      const e = getEmp(it.empId) || {};
      parts.push(`${i === 0 ? 'First' : 'Next'}, ${e.name || 'a colleague'}, ${e.designation || ''}, ${it.discipline}, says: ${it.excerpts.map((x) => x.text).join(' ')}`);
    });
    if (res.themes.length) parts.push(`Common themes across these assets are ${res.themes.join(', ')}.`);
    return parts.join(' ');
  };

  w.Search = Search;
  if (typeof module !== 'undefined') module.exports = Search;
})(typeof window !== 'undefined' ? window : globalThis);
