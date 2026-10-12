// UI smoke test in jsdom: logs in as each role and renders every route, checking for runtime errors.
// Usage: NODE_PATH=<dir with jsdom> node scripts/smoke_test.js
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.join(__dirname, '..');
let errors = [];

function boot() {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail && e.detail.stack || e.message)));
  vc.on('error', (e) => errors.push('console.error: ' + e));
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  w.scrollTo = () => {}; w.confirm = () => true;
  w.speechSynthesis = { getVoices: () => [{ name: 'Microsoft Neerja Online (Natural) - English (India)', lang: 'en-IN' }], speak() {}, cancel() {}, addEventListener() {} };
  w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  for (const f of ['seed', 'util', 'store', 'auth', 'search', 'tts', 'views-learner', 'views-employee', 'views-admin', 'views-landing', 'app'])
    w.eval(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'));
  w.U.clock.override = '2026-10-12';   // pin 'today' for repeatable tests
  return w;
}
const html = (w) => w.document.getElementById('app').innerHTML;
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : '')); if (!ok) errors.push('FAIL ' + name); };

function go(w, hash) { w.location.hash = hash; w.App.render(); }
function login(w, u, p) { w.document.getElementById('u').value = u; w.document.getElementById('p').value = p; w.document.getElementById('lf').dispatchEvent(new w.Event('submit', { cancelable: true })); }

// ---------- login screen + wrong password
let w = boot();
check('login screen renders', html(w).includes('Demo accounts'));
check('landing page has the ONGC logo', html(w).includes('img/ongc-logo-'));
check('landing intro covers all 3 roles', ['For learners', 'For superannuating leaders', 'For administrators'].every((t) => html(w).includes(t)));
check('landing explains how it works', html(w).includes('How Smriti works') && html(w).includes('Step 4'));
check('no demo date anywhere on landing', !/demo date/i.test(html(w)));
check('role is not called "employee" on landing', !/Superannuating employee/i.test(html(w)));
login(w, 'admin', 'wrong'); check('bad password rejected', w.document.getElementById('err').textContent.includes('Incorrect'));

// ---------- learner
w = boot(); login(w, 'learner', 'learn123');
let tabs = [...w.document.querySelectorAll('.tabs a')].map((a) => a.textContent);
check('learner sees exactly 2 tabs', tabs.join('|') === 'Repository|Ask Smriti', tabs.join('|'));
go(w, '#/repo'); check('repository lists 13 published assets', (html(w).match(/class="card asset"/g) || []).length === 13, (html(w).match(/class="card asset"/g) || []).length + ' cards');
check('unpublished asset hidden from learner', !html(w).includes('Workovers, coiled tubing'));
go(w, '#/repo/A-E1001-Q'); check('asset detail + reader renders', html(w).includes('Full responses') && html(w).includes('Listen') && html(w).includes('rd-bar'));
go(w, '#/repo/A-E1002-Q'); check('learner blocked from unpublished asset', html(w).includes('not available'));
go(w, '#/admin'); check('learner blocked from admin', html(w).includes('No access'));
go(w, '#/journey'); check('learner blocked from journey', html(w).includes('No access'));
go(w, '#/about'); check('in-app Guide shows the three roles and marks the learner', html(w).includes('For administrators') && html(w).includes('This is you'));
check('header shows Learner role label and Guide link', html(w).includes('>Learner<') && html(w).includes('Guide'));
check('no demo date badge in header', !/demo date/i.test(html(w)));
go(w, '#/ask'); check('ask page renders', html(w).includes('Ask Smriti'));
setTimeout(() => {   // let the async hashchange re-render settle first
w.document.getElementById('askq').value = 'lessons on well control';
w.document.getElementById('askf').dispatchEvent(new w.Event('submit', { cancelable: true }));
setTimeout(() => {
  check('ask answers from repository with sources', html(w).includes('Suresh Chandra Mehta') && html(w).includes('href="#/repo/A-E1001'), '');
  check('ask offers read-aloud', html(w).includes('Read this answer aloud'));
  w.document.querySelector('[data-read]').click();
  check('read-aloud player appears with progress bar', html(w).includes('rd-bar') && html(w).includes('Speed'));
  w.document.getElementById('askq').value = 'recipe for butter chicken';
  w.document.getElementById('askf').dispatchEvent(new w.Event('submit', { cancelable: true }));
  setTimeout(() => { check('off-topic question is declined', html(w).includes('could not find anything')); next(); }, 700);
}, 700);
}, 100);

function next() {
  // ---------- superannuating employee
  w = boot(); login(w, 'E1007', 'retire123');
  tabs = [...w.document.querySelectorAll('.tabs a')].map((a) => a.textContent);
  check('employee tabs', tabs.join('|') === 'My journey|Repository|Ask Smriti', tabs.join('|'));
  go(w, '#/journey'); check('header says Superannuating leader (not employee)', html(w).includes('Superannuating leader'));
  check('journey page renders for employee', html(w).includes('How would you like to share') && html(w).includes('Biswajit'));
  check('logging in is recorded', w.Store.sub('E1007').loggedInAt === '2026-10-12');
  w.document.querySelectorAll('#modes input').forEach((i) => { if (['Written questionnaire', 'Interview (video call)'].includes(i.value)) i.checked = true; });
  w.document.getElementById('save-modes').click();
  check('modes saved (written + interview)', w.Store.sub('E1007').modes.length === 2 && html(w).includes('Confirm your interview slot'));
  w.document.getElementById('iv-d').value = '2026-11-10'; w.document.getElementById('iv-save').click();
  check('interview slot confirmed', w.Store.sub('E1007').schedule && w.Store.sub('E1007').schedule.date === '2026-11-10');
  const ta = w.document.getElementById('ans-q1'); ta.value = 'I began in the Assam shelf mapping Barail sands and learnt basin analysis in the field.';
  w.document.getElementById('save-draft').click();
  check('draft answer saved', w.Store.stageOf('E1007') === 'In progress', w.Store.stageOf('E1007'));
  w.document.getElementById('submit-w').click();
  check('submission creates unpublished asset', w.Store.asset('A-E1007-Q') && !w.Store.asset('A-E1007-Q').published && w.Store.stageOf('E1007') === 'Submitted');
  go(w, '#/repo'); check('submitted asset NOT yet visible to others', (html(w).match(/class="card asset"/g) || []).length === 13);
  go(w, '#/admin'); check('employee blocked from admin', html(w).includes('No access'));

  // ---------- admin
  w = boot(); login(w, 'admin', 'admin123');
  tabs = [...w.document.querySelectorAll('.tabs a')].map((a) => a.textContent);
  check('admin has all tabs', tabs.length === 8, tabs.join('|'));
  for (const r of ['#/admin', '#/admin/master', '#/admin/mail', '#/admin/submissions', '#/admin/assets', '#/admin/settings', '#/admin/submission/E1004', '#/repo', '#/ask'])
    { go(w, r); check('admin route ' + r, !html(w).includes('Something went wrong') && !html(w).includes('No access') && html(w).length > 800); }
  go(w, '#/admin');
  check('dashboard shows auto-mail due for E1011 (60 days)', html(w).includes('Two-month trigger') && html(w).includes('Kavita Sharma'));
  w.document.getElementById('run-auto').click();
  check('running trigger logs auto-2m mail for E1011', w.Store.hasMail('E1011', ['auto-2m']) && w.Store.stageOf('E1011') === 'Invited');
  go(w, '#/admin');
  check('trigger banner gone after sending', !html(w).includes('Two-month trigger'));
  check('mail status chips visible in mail centre', (go(w, '#/admin/mail'), html(w).includes('failed') && html(w).includes('Mail log')));
  go(w, '#/admin/submission/E1002'); w.document.querySelector('[data-pub]').click();
  check('admin publishes pending asset -> visible in repo', w.Store.asset('A-E1002-Q').published && w.Store.published().length === 14);
  w.Search.build(w.Store.published(), w.Store.employee);
  check('newly published asset becomes searchable', w.Search.answer('coiled tubing sand washing').found);

  // CSV upload logic
  const rows = w.U.parseCSV('empId,name,designation,discipline,location,doj,dor,email\nE9,"Test, Person",GM,Drilling Services,Mumbai,1990-01-01,2027-05-31,t@x.test\n');
  check('CSV parse handles quoted commas', rows[0].name === 'Test, Person');
  w.Store.upsertEmployees(rows, false); check('master upsert adds employee', !!w.Store.employee('E9'));
  let threw = false; try { w.Store.upsertEmployees([{ empId: 'E10', name: 'x', designation: 'y', discipline: 'z', location: 'l', doj: '1990-01-01', dor: '31/05/2027', email: 'e' }], false); } catch (e) { threw = true; }
  check('bad date format rejected', threw);

  console.log(errors.length ? '\n' + errors.length + ' PROBLEM(S):\n' + errors.join('\n') : '\nALL SMOKE TESTS PASSED');
  process.exit(errors.length ? 1 : 0);
}
