// node scripts/test_search.js : sanity-checks retrieval grounding
global.window = global; global.localStorage = { getItem(){return null}, setItem(){} };
require('../js/seed.js'); const U = require('../js/util.js'); global.U = U;
const Search = require('../js/search.js');
const seed = window.SEED;
const pub = seed.assets.filter(a => a.published);
const emp = id => seed.employees.find(e => e.empId === id);
Search.build(pub, emp);
const tests = [
  ['What are the lessons on well control?', true],
  ['Tell me about permit to work and safety', true],
  ['How do I deal with compressor vibration problems?', true],
  ['Advice for young engineers', true],
  ['succession planning and handover', true],
  ['What is the recipe for butter chicken?', false],
  ['quantum computing in banking', false],
  ['Anita Raghavan coiled tubing sand washing Cambay', null],   // E1002 is unpublished: must NOT leak
];
let fail = 0;
for (const [q, exp] of tests) {
  const r = Search.answer(q);
  const ids = r.found ? r.items.map(i => i.assetId).concat(r.also.map(a => a.id)) : [];
  const leak = ids.includes('A-E1002-Q');
  const ok = (exp === null || r.found === exp) && !leak;
  if (!ok) fail++;
  console.log((ok ? 'PASS' : 'FAIL'), '|', q, '->', r.found ? `${r.assetCount} assets: ${ids.join(', ')}` : 'not found');
}
const r = Search.answer('lessons on well control');
console.log('\nSample speech:\n', Search.toSpeech(r, emp).slice(0, 500));
process.exit(fail ? 1 : 0);
