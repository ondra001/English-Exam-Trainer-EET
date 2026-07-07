# Cambridge Trainer — A1 to C2 English Practice

Cambridge Trainer is a single-page web app for preparing **Cambridge English exams from A1 to C2** (A1 foundation, A2 Key/KET, B1 Preliminary/PET, B2 First/FCE, C1 Advanced/CAE, C2 Proficiency/CPE). Pick your level on the home screen and everything — practice tasks, vocabulary, scoring and examiner-style feedback — is pitched at that level, with progress kept separately per level. Every practice set is generated fresh by an AI model (Anthropic Claude or the Google Gemini free tier), so nothing ever repeats: you drill any of the exam's parts on demand, get instant marking with per-question explanations, and track your estimated score on the Cambridge English Scale. It is plain HTML/CSS/vanilla JS — no build step, no framework — and it runs on desktop or a phone in portrait, installs as a PWA, and stores all of your data only in your browser.

> **Levels:** the level you choose adapts the generated content, the paper structure, the score scale, the grade bands and all feedback — and each level keeps its own progress. Accuracy by level:
> - **B2 First, C1 Advanced, C2 Proficiency** — exam-accurate **Reading & Use of English** structure (C1 = 8 parts/56 Q; B2 & C2 = 7 parts, dropping C1's cross-text task; per-level key-word-transformation ranges 2–5 / 3–6 / 3–8). Listening still uses the C1 template.
> - **A2 Key, B1 Preliminary** — level-adapted: **no separate Use of English paper**, no word-formation or key-word-transformation tasks (as in the real exams), short writing at the correct word counts.
> - **A1** — foundation practice (there is no standard adult A1 Cambridge exam; the adult ladder starts at A2 Key).
>
> Each level's structure, scale and labels are defined as a data-driven "level pack" in `js/levels.js`. Verified against cambridgeenglish.org.

> Forked from the original C1-only "CAE Ace" app; see `js/levels.js` for how a single hard-wired exam became a data-driven, multi-level trainer.

## Features

- **All 8 Reading & Use of English parts** — multiple-choice cloze, open cloze, word formation, key word transformations, multiple-choice reading, cross-text matching, gapped text, multiple matching. Generate → answer → instant marking with explanations.
- **All 4 Listening parts** — scripts are generated, then spoken aloud with the browser's built-in speech synthesis (no audio files). Transcript stays hidden until after marking. Voice, rate, and play-once/twice are configurable.
- **Writing Parts 1 & 2** — essay plus your choice of email/letter, proposal, report, or review. Live word counter, draft saving, and AI assessment against the Cambridge criteria (Content, Communicative Achievement, Organisation, Language) with band scores, an estimated scale score, specific corrections, and a full model answer.
- **Speaking** — concise tips cards for each of the 4 parts (what the examiner wants, how it's marked, useful phrases) plus fresh sample prompts to rehearse aloud. No fake scripted dialogue.
- **Full mock test** — Papers 1–3 in sequence with deferred results, per-paper timing, scale conversion per skill, and a pass (180) / C2 (200) verdict.
- **Flexible timer** — off, official timings, or custom minutes; it never auto-submits unless you switch on *strict exam timing*.
- **Dashboard** — estimated overall scale score, per-skill breakdown, streak counter, progress chart (Chart.js), weak-areas summary, and a "Practice weakest area" shortcut.
- **Review list** — save missed items and revisit them later.
- **Three difficulty levels** — Standard C1, Hard, and C2 stretch.
- **Export / Import** — your entire progress as a JSON file (the API key is never included in exports).
- **PWA** — installable, offline app shell, dark mode, mobile-first.

---

## Run privately (recommended setup)

The app ships in **direct mode**: your browser calls the Anthropic API itself with a key you paste in. This is fine for private, personal use only.

### 1. Serve the folder

From the project folder, run either:

```bash
npx serve
```

then open **http://localhost:3000** (serve's default port — it prints the exact URL, which may differ if 3000 is busy), or:

```bash
python -m http.server 8000
```

then open **http://localhost:8000**.

**Why a local server instead of double-clicking `index.html`?** Two things need an `http(s)` origin: the **service worker** (offline caching / installable PWA — browsers refuse to register one from `file://`) and, on some browsers, **speech synthesis voices** load more reliably. Opening `index.html` directly from the file system does mostly work — you can practise, generate sets, and be marked — you just lose the PWA/offline features.

### 2. First run — add your Anthropic API key

On first load the app asks for an API key. To get one:

1. Go to **[console.anthropic.com](https://console.anthropic.com)** and sign up (or log in).
2. Open **API keys** in the console.
3. Click **Create key**, give it a name, and copy the `sk-ant-...` value (it is shown only once).
4. Note: API usage is pay-as-you-go, so the account needs a **small credit balance** (a few dollars goes a long way — each practice set is a single small request).

Paste the key into the app. **The key is stored only in your browser's `localStorage`** — it is never sent anywhere except directly to the Anthropic API, and it is excluded from data exports. You can change or clear it any time in Settings.

> Offline demo: you can try the app with built-in sample content and no key at all by running `localStorage.setItem('cae.apiMode', 'mock')` in the browser console and reloading.

---

## Free engine: Google Gemini

The app has two interchangeable AI engines, chosen on the welcome screen or in **Settings → AI engine**:

| Engine | Cost | Quality |
|---|---|---|
| **Google Gemini** (free tier) | Free — no credit card. Get a key at [aistudio.google.com](https://aistudio.google.com) ("Get API key"). Free-tier rate limits apply (requests per minute/day). | Very good |
| **Anthropic Claude** | Pay-as-you-go (a practice set costs a few cents) | Best |

Each engine has its own key field; both keys stay in the browser's localStorage and are excluded from data exports. Switching engines never touches your progress data.

## Deploy the backend (public / secure mode)

Direct mode must **never** be shipped publicly — anyone could extract your key from the browser. For any public deployment (including Google Play), switch to **backend mode**: the key lives only on your server, and the client sends just the exercise type and parameters.

### 1. Switch the client

In `js/config.js`, change one line:

```js
const API_MODE = 'backend';
```

### 2. Run the server

```bash
cd backend
npm install
ANTHROPIC_API_KEY=sk-ant-... node server.js
```

The server exposes `POST /api/generate` (strictly validated request types only), holds the key server-side, and **also serves the static app folder** — so `node backend/server.js` hosts the whole app by itself.

### 3. Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | — | Your Anthropic API key. Server-side only — never in the client. |
| `ANTHROPIC_MODEL` | No | the model set in `js/config.js` | Override the Claude model used for generation. |
| `PORT` | No | `3000` | HTTP port to listen on. |
| `RATE_LIMIT` | No | `20` | Max requests per IP per rate window. |
| `RATE_WINDOW_MIN` | No | `5` | Rate-limit window length in minutes. |
| `DAILY_TOKEN_BUDGET` | No | a sane cap | Rough daily output-token spend limit; requests are refused once exceeded. |

The server also enforces a hard `max_tokens` cap and a request body size limit, and rejects any request that isn't a known exercise type. Comments in `backend/server.js` mark exactly where to plug in user authentication or a "bring your own key" option if you open it to other users.

### 4. Deploy anywhere Node 18+ runs

- **Render:** create a Web Service from the repo, build command `cd backend && npm install`, start command `node backend/server.js`, and set `ANTHROPIC_API_KEY` in the dashboard.
- **Railway:** `railway up` from the project root, then set `ANTHROPIC_API_KEY` in the service variables and the start command to `node backend/server.js`.
- **Fly.io:** `fly launch` (Node app, internal port matching `PORT`), then `fly secrets set ANTHROPIC_API_KEY=sk-ant-...` and `fly deploy`.

> **Never ship the key in the client.** The public build contains no secrets; the only thing that knows your key is the server process's environment.

---

## Package for Google Play (TWA)

The app can be published on Google Play as a **Trusted Web Activity** — a native Android wrapper around your hosted PWA.

### PWA checklist (already included in this repo)

- [x] `manifest.json` — name, icons (192/512/maskable/SVG), `display: standalone`, portrait orientation, theme colour.
- [x] `sw.js` — service worker with offline app-shell caching.
- [ ] **HTTPS hosting** — deploy the app (backend mode!) to a domain with TLS; TWAs require a live HTTPS origin.

### Bubblewrap steps

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://yourdomain.example/manifest.json
bubblewrap build
```

`init` walks you through package name, signing key, and colours (it reads most of it from the manifest); `build` produces the `.aab` you upload to the Play Console.

**Digital Asset Links:** to make the TWA open full-screen without a browser bar, host the `assetlinks.json` file that Bubblewrap generates at:

```
https://yourdomain.example/.well-known/assetlinks.json
```

It ties your signing certificate's fingerprint to your domain.

### Play Store requirements

- A **privacy policy hosted at a public URL** (see the section below — you must host it, a file in the repo is not enough).
- A **512×512 px app icon** and a **feature graphic** (1024×500 px) for the store listing.
- Completing the **content rating questionnaire** in the Play Console.
- **No embedded secrets** — the Play build must use backend mode. Shipping an Anthropic API key inside the app violates both common sense and Play policy.

---

## Privacy policy (placeholder — ready to host)

> **CAE Ace Privacy Policy**
>
> CAE Ace stores all of your data — settings, scores, attempt history, review items, and saved writing drafts — **only in your own browser's local storage**, on your device. There are no accounts, no sign-up, and no analytics or tracking of any kind.
>
> When you generate a practice set or request writing feedback, the exercise parameters and (for writing assessment) the text you submit are sent to the AI provider (Anthropic) solely to produce that task or assessment. No other personal data is transmitted, and the app's operator does not store your submissions.
>
> If you use the app in direct mode, your Anthropic API key is stored only in your browser's local storage and sent only to the Anthropic API. It is never included in data exports.
>
> You can export, import, or permanently delete all of your data at any time from within the app.

**Note:** Google Play requires this policy to be hosted at a **public URL** and linked in your store listing before the app can be published. Copy the text above to a page on your domain and adapt it as needed.

---

## Project structure

```
CAE EXAM PREPARATION APP/
├── index.html            # single page, all views
├── styles.css            # design tokens, light/dark themes, components
├── manifest.json         # PWA manifest
├── sw.js                 # service worker (offline app shell)
├── icons/                # icon-192.png, icon-512.png, icon-512-maskable.png, icon.svg
├── js/
│   ├── config.js         # constants + API mode switch (direct/backend/mock)
│   ├── util.js           # DOM builder, formatting, answer normalization
│   ├── storage.js        # localStorage layer: settings, attempts, drafts, review
│   ├── prompts.js        # part metadata, JSON schemas, prompt builders (UMD)
│   ├── mock.js           # offline sample sets for demo/dev mode
│   ├── api.js            # callModel() + generateSet/assessWriting
│   ├── marking.js        # answer checking + Cambridge scale conversion
│   ├── timer.js          # flexible timer widget
│   ├── ui.js             # shared components + the practice runner
│   ├── parts/
│   │   ├── uoe.js        # Use of English parts 1–4
│   │   ├── reading.js    # Reading parts 5–8
│   │   ├── listening.js  # Listening parts 1–4 + speech player
│   │   ├── writing.js    # Writing tasks + AI assessment
│   │   └── speaking.js   # Speaking tips + sample prompts
│   ├── mocktest.js       # full mock exam flow
│   ├── dashboard.js      # scores, chart, streak, export/import
│   └── app.js            # boot, routing, nav, theme, SW registration
├── backend/
│   ├── server.js         # Express proxy example (holds the API key)
│   └── package.json
└── README.md
```

### Architecture in ten lines

1. Classic scripts, no build step: each file is an IIFE attaching one module to the global `window.CAE` namespace (`CAE.util`, `CAE.api`, `CAE.ui`, …), loaded in dependency order with `defer`.
2. `js/prompts.js` is UMD, so `backend/server.js` `require()`s the exact same prompt builders and schemas — zero duplication between client and server.
3. Every model call funnels through one function, `CAE.api.callModel()`; `CAE.config.mode()` switches it between direct Anthropic calls, your backend proxy, and offline mock fixtures. Going public is a one-line config change, not a rewrite.
4. Each exam part is a self-contained definition registered via `CAE.registerPart({id, render, mark, ...})`.
5. The generic practice runner in `ui.js` drives any registered part: generate → render → collect answers → mark → explain → log the attempt.
6. Writing and Speaking opt out with a `customRun` and take over their view entirely.
7. The model must return strict JSON per part-specific schemas; responses are parsed, validated, and retried once on bad JSON.
8. Marking converts weighted percentages to the Cambridge 142–210 scale via piecewise-linear anchors; the dashboard averages recent per-skill scales into the headline estimate.
9. All persistence is namespaced `cae.*` keys in `localStorage`; export/import round-trips everything except the API key.
10. All model-generated and user text is treated as untrusted and rendered through safe DOM construction — never `innerHTML`.

---

## Troubleshooting

**"Your API key was rejected" / 401 errors** — the key is wrong, revoked, or the account has no credit. Re-copy the key from [console.anthropic.com](https://console.anthropic.com) (API keys page), paste it in Settings, and check your credit balance under Billing. Keys start with `sk-ant-`.

**CORS errors calling the Anthropic API** — the app already sends the required `anthropic-dangerous-direct-browser-access: true` header, so direct browser calls work out of the box. If you still see CORS failures, a browser extension or strict privacy setting may be blocking cross-origin requests, or you are in backend mode without the backend running (check `js/config.js` and any `cae.apiMode` override in localStorage).

**Listening has no voice / robotic or wrong-language voice** — `speechSynthesis` voices are provided by your OS/browser and often **load late**: if the voice list is empty on first open, wait a second or reopen Settings and the list will fill in. For better voices, install additional system voices (Windows: Settings → Time & Language → Speech; macOS: System Settings → Accessibility → Spoken Content; Android: Google TTS settings) and restart the browser. Then pick your preferred voice in the app's Settings.

**Dashboard chart missing offline / on first load** — the chart library (Chart.js) loads from a CDN. The service worker caches it after your first online visit, so it works offline afterwards; if you went offline before it was ever fetched, the chart is skipped until you reconnect. The rest of the dashboard still works.

**Service worker / install button not appearing** — you're probably on `file://`. Serve over `http://localhost` (see *Run privately*) or HTTPS; the app deliberately skips service-worker registration on `file://`.
