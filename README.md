# Smriti · Knowledge Legacy Portal (स्मृति)

A mobile-friendly portal that captures the experience of superannuating employees and turns it into a searchable learning repository with an AI guide that answers **only** from that repository.

> ⚠️ **Read this first: this is a working prototype, not a production system.**
> All sample people, e-mail addresses and stories are **fictional**. Demo login and data storage run **in the browser**, so they are *not secure*. GitHub Pages sites are **public** (private Pages needs GitHub Enterprise Cloud). **Never put the real manpower master, real e-mail addresses or real interview content in this public repo or its Pages site.** See [Going to production](#going-to-production).

---

## Look and feel

ONGC-inspired deep blue and orange, colour-coded topic tags, tiles and avatars, hero banners, and a phone-first layout with a bottom tab bar. Every text/background colour pair meets the WCAG AA contrast standard (`python3 scripts/check_contrast.py`), and light/dark mode follows the device setting. This is *inspired by* the ONGC colours; it uses no ONGC logo. To use your organisation's exact brand shades, change the colour values at the top of `css/style.css`.

---

## What you get

| Who | Sees | Can do |
|---|---|---|
| **Learner** (every other employee) | **Repository** · **Ask Smriti** | Search/filter assets by discipline, type, topic tag, location; read or listen; ask questions |
| **Superannuating leader** | **My journey** · Repository · Ask Smriti | Choose mode(s): written / in-person interview / video interview / audio note (any combination); answer the 8-question form (autosave, voice dictation); confirm interview date and time; submit |
| **Admin** | Everything | Dashboard, master-data upload, mail centre (send / remind / nudge / bulk), view and edit any submission, schedule status, add interview transcripts, publish/unpublish, edit tags, settings |

**Highlights**

* **Repository**: cards with type, person, discipline, location, retirement year, **topic tags**, reading time; keyword search + 4 filters + clickable tags.
* **Ask Smriti**: instant answers built from colleagues' own words with a source link on every point, "common threads", and "also relevant" assets so the answer covers *all* matching assets. Off-topic questions are declined rather than invented. Unpublished drafts never leak into answers.
* **Read aloud**: play/pause, **progress bar you can drag**, ±10 s skip, 0.75×–2× speed, per-answer listening. Prefers an **English (India)** voice.
* **Automatic mail 2 months before superannuation** (GitHub Actions, daily 09:00 IST) + admin-triggered invitation, reminder and nudge.
* **Admin tracking**: pipeline funnel (Not invited → Invited → Logged in → Mode chosen → In progress → Submitted → Published), mail log with sent/failed/queued, "needs attention" list for anyone retiring within 30 days with pending items.
* Works on phones (bottom tab bar), installable as an app (PWA), light/dark mode, keyboard accessible.

---

## Run it locally (30 seconds)

Just open `index.html` in a browser (or `python3 -m http.server` and visit `http://localhost:8000`).

Demo logins (also shown on the login screen):

| Role | User ID | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Learner | `learner` | `learn123` |
| Superannuating leader | `E1007` (also `E1004`, `E1010`, …) | `retire123` |

The sample data is built around **12 Oct 2026**, so the sample retirement dates look sensible when you try it; the portal itself always uses the real date. With that date the dashboard's *Two-month trigger* card is live for two people: **Kavita Sharma (E1011)**, exactly 60 days from retirement and never mailed, and **Biswajit Dutta Choudhury (E1007)**, whose first automatic mail *failed* ("mailbox full") and is therefore retried.

---

## Publish on GitHub (so you can share it)

1. Create a new repository (e.g. `smriti-portal`) and upload this folder, or:
   ```bash
   cd smriti-portal
   git init -b main && git add . && git commit -m "Smriti portal"
   git remote add origin https://github.com/<you>/smriti-portal.git
   git push -u origin main
   ```
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. The `Deploy portal to GitHub Pages` workflow runs; your site appears at `https://<you>.github.io/smriti-portal/`.
4. In **Settings → Secrets and variables → Actions** add, for real e-mail:
   * Secrets: `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
   * Variables: `PORTAL_URL` (your site URL), optional `LEAD_DAYS` (default 60)
5. Test: **Actions → Send Smriti emails → Run workflow** with *Dry run* ticked.

Because this is a sample repo, keep it to fictional data. If you share the link, anyone can open it and use the demo logins.

### How the 2-month mail works

`.github/workflows/reminders.yml` runs daily. `scripts/send_reminders.py` reads `data/employees.csv`, finds everyone whose `dor` is 0–60 days away who has no successful `auto-2m` entry in `data/mail_log.json`, e-mails them the template in `data/mail_templates.json`, and records `sent` or `failed` (with the error). Failed ones retry the next day. The log is committed back and the portal is redeployed so **Mail centre → Sync status from GitHub log** shows the outcome.

Test locally: `python3 scripts/send_reminders.py --mode auto --today 2026-10-12 --dry-run`

### Admin "Send" buttons

Settings → **Mail channel**:
* **Demo** (default): simulates sending so you can see the whole flow.
* **GitHub Actions**: the button calls the workflow through the GitHub API (needs a fine-grained token with *Actions: write* on this repo, held for the browser session only). Real mails go out from the workflow; status appears after the run.
* **mailto**: opens personalised drafts in the admin's mail app.

### Engagement tracking: a note on "opened"

Plain e-mail cannot reliably report "opened" (privacy features block tracking pixels). The portal measures what matters instead: whether the person **logged in, chose a mode, started answering, submitted**.

---

## Your data

| File | Purpose |
|---|---|
| `data/employees.csv` | **Manpower master**: `empId,name,designation,discipline,location,doj,dor,email,mobile` (`dor` = `YYYY-MM-DD`) |
| `data/questionnaire.json` | The 8 questions (edit freely). *You referred to "the above questions" but none came through, so I drafted a standard set covering career journey, toughest challenge, failure, safety, tacit knowledge, mentoring, handover and advice.* |
| `data/assets.json` | Learning assets (Q&A, tags, published flag) |
| `data/taxonomy.json` | Topic tags and the keywords used to **auto-suggest** tags for new submissions |
| `data/mail_templates.json` | E-mail wording (`{{name}} {{dor}} {{days}} {{link}}`) |

After editing anything in `data/`, run `python3 scripts/build_seed.py` (the Pages workflow also does this on every push). Admins can also upload a new master CSV in the portal (Master data).

**Governance built in:** a submitted questionnaire becomes a **draft** asset. Learners and Ask Smriti see it only after an admin **publishes** it, so sensitive or incorrect content can be reviewed first.

---

## Voice: getting a natural Indian voice

The reader uses the browser's built-in speech (free, offline, no key). It prefers `en-IN` voices, but what you hear depends on the device:

* **Windows/Edge** – best: *Microsoft Neerja / Prabhat Online (Natural)*.
* **Android/Chrome** – Settings → Text-to-speech → English (India).
* **iPhone/iPad** – Settings → Accessibility → Spoken Content → Voices → English (India).

For **one consistent studio-quality Indian voice for everybody**, pre-generate audio once per asset with a neural TTS service (e.g. Azure *en-IN Neerja/Prabhat*, Google *en-IN Neural2*), store the MP3s with the asset, and play them in an `<audio>` element (the progress bar/seek/speed controls map directly). This is the recommended upgrade if voice quality is a priority.

---

## Going to production

The prototype deliberately keeps everything client-side so you can share it on GitHub. For real use with employee data:

1. **Host inside your network or a private host** (intranet web server, Azure App Service, etc.), not public GitHub Pages.
2. **Move data to a server-side store** (SQL/Postgres, SharePoint list, etc.) behind an API. Only `js/store.js` touches data, so replacing its `init/save` with API calls is a contained change.
3. **Authentication**: `js/auth.js` has a provider interface (`login/current/logout`). Replace `LocalProvider` with an **OIDC provider for your Active Directory** (Azure AD/Entra ID or ADFS via OIDC/SAML). Map roles from AD groups, e.g. `Smriti-Admins` → admin; membership in the manpower master with a future `dor` → superannuating employee; everyone else → learner (see `Auth.roleForEmployee`). **Enforce the same role checks on the server**; browser checks alone are not security.
4. **E-mail**: use your organisation's SMTP relay / Microsoft Graph `sendMail` from a server-side job in place of the GitHub workflow if the repo is moved off GitHub.
5. **AI answers**: today's Ask Smriti is retrieval-based and extractive (no hallucination possible). If you later want fluent summaries, call an LLM from a **server-side** function, passing only the retrieved excerpts with the instruction to answer strictly from them and to cite the asset IDs; keep the same retrieval in `js/search.js`.
6. **Recording interviews**: store audio/video in controlled storage with consent captured, run transcription (e.g. Azure Speech) and have an admin review the transcript before publishing. Today an admin pastes the transcript as Q/A pairs.
7. **Consent and policy**: obtain written consent for publishing each person's content, define retention and who may listen, and review against your data-protection and IP policies.

---

## Project layout

```
index.html, css/style.css, manifest.webmanifest, icon.svg, sw.js   app shell + PWA
js/seed.js        GENERATED from data/ (scripts/build_seed.py)
js/util.js        helpers, CSV, dates          js/store.js    data layer (swap for API)
js/auth.js        roles + login provider       js/search.js   grounded retrieval (BM25)
js/tts.js         read-aloud player            js/app.js      shell + router
js/views-learner.js  Repository, asset page, Ask Smriti
js/views-employee.js My journey (modes, slot, questionnaire)
js/views-admin.js    Dashboard, master, mail centre, submissions, assets, settings
scripts/          make_sample_data.py · build_seed.py · send_reminders.py · tests
.github/workflows pages.yml (deploy) · reminders.yml (daily auto-mail + on-demand)
```

## Tests

```bash
node scripts/test_search.js                       # retrieval grounding (no leaks, off-topic declined)
npm i jsdom && node scripts/smoke_test.js         # clicks through every role and route
python3 scripts/send_reminders.py --mode auto --today 2026-10-12 --dry-run
```

## Sample data

20 fictional senior officers across Drilling Services, Well Services, Reservoir, Logging, Geophysics, Chemistry, Geology, Production (surface), Mechanical, Electrical, E&T/Instrumentation, HR, Finance, Procurement, HSE, Fire, Business Development, Uran, Hazira and Dahej Plant. (E&T and Instrumentation share one record to keep the count at 20.) 14 learning assets: 10 people have published content, 1 is awaiting admin review, 2 are mid-way, 1 is invited but silent, and 6 have not been invited yet, so every admin view has something to show.


## Landing page, logo and sample data
- The sign-in page opens with an introduction explaining the portal to learners, superannuating leaders and administrators; signed-in users can reopen it from the **Guide** link in the header.
- ONGC logo files are in `img/`; the colour theme (maroon + saffron) is in `css/style.css`. If the repository is public, the logo is public too; check with your communications team.
- Every sample questionnaire answers all 8 questions (`python3 scripts/check_data.py` verifies this).
- Browser storage key is `smriti_db_v2`, so older demo data in a browser is not reused.
