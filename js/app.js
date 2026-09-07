/* CAE Ace — boot, routing, theme, settings, parts browser, review list. */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const { el, $, $$ } = CAE.util;
  const ui = CAE.ui;

  /* ---------- theme ---------- */

  // Small hex-blend helpers so the whole UI can take on the active level's
  // accent colour. We resolve to concrete hex (not CSS color-mix) so the
  // dashboard's <canvas> chart, which reads --accent, still gets a valid colour.
  function hexToRgb(h) {
    let s = String(h).replace('#', '');
    if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  }
  function mix(a, b, t) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    const c = A.map((x, i) => Math.round(x + (B[i] - x) * t));
    return '#' + c.map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
  }

  // Recolour the app's accent trio from the active level, per theme.
  function applyLevelAccent(theme) {
    const L = CAE.levels && CAE.levels.active && CAE.levels.active();
    const base = L && L.accent;
    if (!base) return;
    const root = document.documentElement.style;
    if (theme === 'dark') {
      root.setProperty('--accent', mix(base, '#ffffff', 0.42));
      root.setProperty('--accent-strong', mix(base, '#ffffff', 0.60));
      root.setProperty('--accent-soft', mix('#232a44', base, 0.14));
    } else {
      root.setProperty('--accent', base);
      root.setProperty('--accent-strong', mix(base, '#000000', 0.28));
      root.setProperty('--accent-soft', mix(base, '#ffffff', 0.88));
    }
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function resolvedTheme() {
    const t = CAE.storage.getSettings().theme;
    if (t === 'light' || t === 'dark') return t;
    return media.matches ? 'dark' : 'light';
  }

  let themeFadeTimer = null;

  function applyTheme() {
    const t = resolvedTheme();
    // Cross-fade every surface while the palette swaps.
    document.documentElement.classList.add('theme-fade');
    clearTimeout(themeFadeTimer);
    themeFadeTimer = setTimeout(() => document.documentElement.classList.remove('theme-fade'), 400);
    document.documentElement.dataset.theme = t;
    applyLevelAccent(t);
    const metaTag = document.querySelector('meta[name="theme-color"]');
    if (metaTag) metaTag.content = t === 'dark' ? '#10131d' : '#f7f3ea';
    if (CAE.dashboard && CAE.dashboard.refreshTheme) CAE.dashboard.refreshTheme();
  }

  media.addEventListener('change', () => {
    if (CAE.storage.getSettings().theme === 'auto') applyTheme();
  });

  /* ---------- routing ---------- */

  function route() {
    const hash = location.hash || '#/dashboard';
    const m = hash.match(/^#\/part\/([\w-]+)/);
    if (m) {
      ui.showView('exercise');
      ui.runPart(m[1], $('#view-exercise'));
      return;
    }
    if (hash.startsWith('#/parts')) {
      ui.showView('parts');
      renderPartsBrowser($('#view-parts'));
      return;
    }
    if (hash.startsWith('#/mock')) {
      ui.showView('mock');
      CAE.mocktest.start($('#view-mock'));
      return;
    }
    if (hash.startsWith('#/vocab')) {
      ui.showView('vocab');
      CAE.vocab.render($('#view-vocab'));
      return;
    }
    if (hash.startsWith('#/review')) {
      ui.showView('review');
      renderReview($('#view-review'));
      return;
    }
    ui.showView('dashboard');
    CAE.dashboard.render($('#view-dashboard'));
  }

  /* ---------- parts browser ---------- */

  // Learner-first order: Use of English is drilled most, so it leads. This is
  // the default (C1-style) paper layout; a level pack may supply its own
  // `groups` array (e.g. lower levels with no separate Use of English paper).
  const GROUPS = [
    { ids: ['rue1', 'rue2', 'rue3', 'rue4'], no: 'Paper 1 · first half', title: 'Use of English', paper: 'uoe',
      sub: 'Parts 1–4 · the language-in-detail tasks you’ll drill most (Part 1 counts toward your Reading score)' },
    { ids: ['rue5', 'rue6', 'rue7', 'rue8'], no: 'Paper 1 · second half', title: 'Reading', paper: 'reading',
      sub: 'Parts 5–8 · long texts, opinions and matching' },
    { ids: ['wri1', 'wri2'], no: 'Paper 2', title: 'Writing', paper: 'writing', sub: '2 tasks · 220–260 words each · 90 minutes' },
    { ids: ['lis1', 'lis2', 'lis3', 'lis4'], no: 'Paper 3', title: 'Listening', paper: 'listening', sub: '4 parts · 30 questions · ~40 minutes' },
    { ids: ['spk'], no: 'Paper 4', title: 'Speaking', paper: 'speaking', sub: 'Tips, marking criteria and rehearsal prompts' },
  ];

  function activeGroups() {
    const g = CAE.levels && CAE.levels.active().groups;
    return (Array.isArray(g) && g.length) ? g : GROUPS;
  }

  function recentAvg(partId) {
    const attempts = CAE.storage.getAttempts().filter((a) => a.partId === partId).slice(0, 3);
    if (!attempts.length) return null;
    return Math.round(attempts.reduce((s, a) => s + a.pctScore, 0) / attempts.length);
  }

  // The one card that earns the START HERE stamp: the weakest practised
  // part, or the very first part for a fresh notebook.
  function inLevel(id) {
    return CAE.prompts.PARTS[id] && (!CAE.levels || CAE.levels.inActiveOrder(id));
  }

  function recommendedPartId() {
    let worst = null;
    for (const group of activeGroups()) {
      for (const id of group.ids) {
        if (!inLevel(id)) continue;
        const avg = recentAvg(id);
        if (avg === null) continue;
        if (!worst || avg < worst.avg) worst = { id, avg };
      }
    }
    if (worst) return worst.id;
    for (const group of activeGroups()) {
      for (const id of group.ids) if (inLevel(id)) return id;
    }
    return null;
  }

  function renderPartsBrowser(host) {
    host.replaceChildren();
    host.append(el('h1', { class: 'ink-stroke', text: 'Practice' }),
      el('p', { class: 'muted', text: 'Pick any part — every set is freshly generated, so nothing ever repeats. Your timer preference applies to each set (change it in Settings).' }));


    activeGroups().forEach((group) => {
      const ids = group.ids.filter((id) => CAE.prompts.PARTS[id]
        && (!CAE.levels || CAE.levels.inActiveOrder(id)));
      if (!ids.length) return;
      let sub = group.sub;
      if (group.paper === 'writing') {
        const w = activeLevel().writing;
        sub = '2 tasks · ' + w.min + '–' + w.max + ' words each · 90 minutes';
      }
      host.append(el('div', { class: 'pb-group', data: { paper: group.paper } },
        el('span', { class: 'overline', text: group.no }),
        el('h2', { text: group.title }),
        el('p', { class: 'muted small pb-sub', text: sub }),
      ));
      const grid = el('div', { class: 'grid2', data: { paper: group.paper } });
      for (const id of ids) {
        const p = CAE.prompts.PARTS[id];
        const view = CAE.levels ? CAE.levels.partView(id) : p;
        // C1-style "Part N" numbering only makes sense for the standard paper
        // layout; lower levels use a skill-grouped layout with a neutral tag.
        const showNumber = view.number && activeGroups() === GROUPS;
        const avg = recentAvg(id);
        const metaBits = [];
        if (p.questionCount) metaBits.push(p.questionCount + ' Q');
        if (p.officialMinutes) metaBits.push('~' + p.officialMinutes + ' min');
        grid.append(el('button', {
          class: 'part-card', type: 'button',
          ariaLabel: (showNumber ? 'Part ' + view.number + ': ' : '') + p.name,
          on: { click: () => { location.hash = '#/part/' + id; } },
        },
        el('span', { class: 'part-icon', attr: { 'aria-hidden': 'true' } }, CAE.icons.el(id, 22)),
        el('span', { class: 'pb-body' },
          el('span', { class: 'pb-no', text: showNumber ? 'Part ' + view.number : (id === 'spk' ? 'Guide' : 'Task') }),
          el('span', { class: 'part-name pb-name', text: view.name }),
          el('span', { class: 'muted small pb-desc', text: view.desc }),
          el('span', { class: 'row pb-meta' },
            metaBits.length ? el('span', { class: 'chip chip-meta', text: metaBits.join(' · ') }) : null,
            avg !== null ? el('span', { class: 'badge ' + (avg >= 65 ? 'good' : avg >= 50 ? 'neutral' : 'bad'), text: 'Recent ' + avg + '%' }) : null,
          ),
        ),
        el('span', { class: 'pb-go', text: '›', attr: { 'aria-hidden': 'true' } }),
        ));
      }
      host.append(grid);
    });
  }

  /* ---------- review list ---------- */

  function renderReview(host) {
    host.replaceChildren();
    host.append(el('h1', { class: 'ink-stroke', text: 'Review list' }),
      el('p', { class: 'muted', text: 'Questions you missed and chose to keep. Revisit them until they stick, then remove them.' }));

    const items = CAE.storage.getReviewList();
    if (!items.length) {
      host.append(el('div', { class: 'empty-state' },
        el('p', { text: 'Nothing marked yet.' }),
        el('p', { class: 'small', text: 'After checking a practice set, tap “Add to review list” on any question you missed — it will be waiting for you here.' }),
      ));
      return;
    }

    const byPart = new Map();
    for (const item of items) {
      if (!byPart.has(item.partId)) byPart.set(item.partId, []);
      byPart.get(item.partId).push(item);
    }

    let chapter = 0;
    for (const [partId, group] of byPart) {
      chapter += 1;
      // 'Reading & UoE · Part 1 — Multiple-choice cloze' → the task name
      // heads the section; the paper reference joins the count in the note.
      const full = group[0].partName || partId;
      const dash = full.indexOf(' — ');
      const title = dash > -1 ? full.slice(dash + 3) : full;
      const eyebrow = dash > -1 ? full.slice(0, dash) + ' · ' : '';
      const card = el('div', { class: 'card card--open rev-group' },
        el('h3', { class: 'section-head' },
          el('span', { class: 'sh-no', text: String(chapter).padStart(2, '0') }),
          el('span', { text: title }),
          el('span', { class: 'sh-note', text: eyebrow + group.length + (group.length === 1 ? ' question' : ' questions') }),
        ),
      );
      for (const item of group) {
        const row = el('div', { class: 'result-item incorrect' },
          el('strong', { text: item.prompt }),
          el('div', { class: 'answers-line' },
            el('span', { class: 'badge bad', text: '✗ ' + (item.userAnswer || '—') }),
            el('span', { class: 'badge good', text: '→ ' + item.correctAnswer }),
          ),
          item.explanation ? el('div', { class: 'explanation', text: item.explanation }) : null,
          el('button', { class: 'text-link no-arrow rev-remove', on: { click: () => {
            CAE.storage.removeFromReview(item.id);
            row.remove();
            if (!card.querySelector('.result-item')) card.remove();
            if (!host.querySelector('.result-item')) renderReview(host);
            ui.toast('Removed from review list');
          } } }, 'Got it — remove'),
        );
        card.append(row);
      }
      card.append(el('div', { class: 'rev-actions' },
        el('a', { class: 'text-link', href: '#/part/' + partId }, 'Practise this part'),
      ));
      host.append(card);
    }
  }

  /* ---------- API key form (shared by welcome + settings) ---------- */

  function keyField(initial, placeholder) {
    const input = el('input', {
      class: 'input', type: 'password', value: initial || '',
      placeholder: placeholder || 'sk-ant-…',
      attr: { autocomplete: 'off', spellcheck: 'false' },
      ariaLabel: 'API key',
    });
    const showBtn = el('button', { class: 'btn', type: 'button', on: { click: () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      showBtn.textContent = input.type === 'password' ? 'Show' : 'Hide';
    } } }, 'Show');
    return { input, row: el('div', { class: 'key-input-row' }, input, showBtn) };
  }

  function howToGetKey(provider) {
    if (provider === 'gemini') {
      return el('details', null,
        el('summary', { text: 'How do I get a free Google Gemini API key?' }),
        el('ol', { style: { paddingLeft: '20px' } },
          el('li', { text: 'Go to aistudio.google.com and sign in with any Google account.' }),
          el('li', { text: 'Click “Get API key” and create one — the free tier needs no credit card.' }),
          el('li', { text: 'Copy the key (it starts with “AIza”) and paste it here.' }),
        ),
        el('p', { class: 'muted small', text: 'Free-tier limits apply (a number of requests per minute and per day) — plenty for regular practice. Your key is stored only in this browser.' }),
      );
    }
    return el('details', null,
      el('summary', { text: 'How do I get an Anthropic API key?' }),
      el('ol', { style: { paddingLeft: '20px' } },
        el('li', { text: 'Go to console.anthropic.com and sign up (or log in).' }),
        el('li', { text: 'Add a small credit balance under Billing (usage is pay-as-you-go; a practice set costs fractions of a cent).' }),
        el('li', { text: 'Open “API keys”, create a key, and copy it here.' }),
      ),
      el('p', { class: 'muted small', text: 'Your key is stored only in this browser — it never leaves your device except to call the Anthropic API directly.' }),
    );
  }

  /* ---------- Gemini model picker (settings) ----------
   * Normally nobody needs to touch this: the app discovers which models the
   * pasted key can actually call and uses the newest one (js/models.js).
   * It is here because model availability differs from key to key, so when
   * something does go wrong "Refresh model list" — and, failing that, picking
   * a model by hand — is the fix, without waiting for an app update. */

  function geminiModelField(getKey) {
    const M = CAE.models;
    const label = el('label', { class: 'label', text: 'Gemini model' });
    const sel = el('select', { class: 'select', ariaLabel: 'Gemini model' });
    const note = el('p', { class: 'muted small', style: { margin: '6px 0 0' } });

    const AUTO_TEXT = 'Automatic — newest model your key supports';

    const fill = () => {
      const pin = M.pinned();
      const ids = M.cachedIds();
      // A pin for a model that has since vanished from the catalogue must
      // still show up, or the dropdown would silently misreport the setting.
      if (pin && !ids.includes(pin)) ids.unshift(pin);
      sel.replaceChildren(el('option', { value: '', text: AUTO_TEXT }));
      for (const id of ids) sel.append(el('option', { value: id, text: id }));
      sel.value = pin;
      if (sel.value !== pin) sel.value = '';

      const inUse = M.working();
      note.textContent = ids.length
        ? (pin ? 'Pinned. If this model ever stops working the app still falls back to another one.'
          : 'Chosen for you from the ' + ids.length + ' models your key can use'
            + (inUse ? ' — currently using ' + inUse + '.' : '.'))
        : 'No list yet — press Refresh, or just start practising and the app will work it out.';
    };

    const refresh = el('button', { class: 'btn btn-sm', type: 'button', on: { click: async () => {
      const key = String(getKey() || '').trim();
      if (!key) { ui.toast('Paste your Gemini key first.', 'error'); return; }
      refresh.disabled = true;
      const was = refresh.textContent;
      refresh.textContent = 'Checking…';
      try {
        const ids = await CAE.api.discoverGeminiModels(key);
        fill();
        ui.toast(ids.length
          ? 'Found ' + ids.length + ' usable models — newest is ' + ids[0] + '.'
          : 'Could not read the model list — check the key and your connection.',
        ids.length ? 'success' : 'error');
      } finally {
        refresh.disabled = false;
        refresh.textContent = was;
      }
    } } }, 'Refresh model list');

    sel.addEventListener('change', () => {
      CAE.storage.saveSettings({ geminiModel: sel.value });
      // Going back to Automatic must re-derive from the ranking rather than
      // quietly carry on with whatever was pinned.
      if (!sel.value) M.forgetWorking();
      fill();
      ui.toast(sel.value ? 'Using ' + sel.value : 'Back to automatic model choice', 'success');
    });

    fill();
    return el('div', { class: 'field' },
      label, sel,
      el('div', { class: 'row', style: { marginTop: '6px' } }, refresh),
      note,
    );
  }

  /* ---------- AI engine picker (welcome + settings) ---------- */

  const PROVIDERS = [
    { id: 'gemini', name: 'Google Gemini', desc: 'Free tier — no credit card needed' },
    { id: 'anthropic', name: 'Anthropic Claude', desc: 'Best quality — pay as you go' },
  ];

  function providerPicker(current, onChange) {
    const wrap = el('div', { class: 'option-group', role: 'radiogroup', ariaLabel: 'AI engine' });
    const btns = {};
    for (const d of PROVIDERS) {
      const b = el('button', {
        class: 'option' + (d.id === current ? ' selected' : ''),
        type: 'button', role: 'radio',
        attr: { 'aria-checked': String(d.id === current) },
        on: { click: () => {
          for (const [k, x] of Object.entries(btns)) {
            x.classList.toggle('selected', k === d.id);
            x.setAttribute('aria-checked', String(k === d.id));
          }
          onChange(d.id);
        } },
      },
      el('span', { class: 'option-letter om-18', attr: { 'aria-hidden': 'true' } }),
      el('span', null,
        el('strong', { text: d.name, style: { display: 'block' } }),
        el('span', { class: 'muted small', text: d.desc })));
      btns[d.id] = b;
      wrap.append(b);
    }
    return wrap;
  }

  /* ---------- Cambridge-scale score fields (welcome + settings) ---------- */

  function activeLevel() {
    return (CAE.levels && CAE.levels.active()) || {
      cefr: 'C1', aspire: 'C2', exam: 'C1 Advanced (CAE)',
      scale: { min: 142, max: 210, pass: 180, high: 200 },
      writing: { min: 220, max: 260 },
    };
  }
  function activeScale() { return activeLevel().scale; }

  function parseScore(raw) {
    const sc = activeScale();
    const t = String(raw == null ? '' : raw).trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return Math.round(Math.min(sc.max, Math.max(sc.min, n)));
  }

  // Optional number input, clamped to the active level's Cambridge scale.
  function scoreField(labelText, placeholder, initial, onCommit) {
    const sc = activeScale();
    const input = el('input', {
      class: 'input', type: 'number',
      min: String(sc.min), max: String(sc.max),
      placeholder,
      value: initial == null ? '' : String(initial),
      attr: { inputmode: 'numeric', step: '1' },
      ariaLabel: labelText,
      on: { change: () => {
        const v = parseScore(input.value);
        input.value = v == null ? '' : String(v);
        if (onCommit) onCommit(v);
      } },
    });
    return {
      input,
      field: el('div', { class: 'field' }, el('label', { class: 'label', text: labelText }), input),
      read: () => parseScore(input.value),
    };
  }

  // A quiet, decorative grade ladder for the active level, with the pass mark
  // and the top-grade mark that matter.
  function gradeLadder() {
    const L = activeLevel();
    const sc = L.scale;
    const marker = (score, label) => el('span', {
      class: 'progress-marker',
      style: { left: (((score - sc.min) / (sc.max - sc.min)) * 100).toFixed(1) + '%' },
    }, el('span', { class: 'marker-label', text: label }));
    return el('div', { class: 'wm-ladder', attr: { 'aria-hidden': 'true' } },
      el('div', { class: 'progress-track' },
        marker(sc.pass, sc.pass + ' · ' + L.cefr + ' pass'),
        marker(sc.high, sc.high + ' · A/' + L.aspire)),
      el('div', { class: 'wm-ladder-ends' }, el('span', { text: String(sc.min) }), el('span', { text: String(sc.max) })),
    );
  }

  /* ---------- level picker ---------- */

  function updateLevelChip() {
    const btn = $('#level-btn');
    if (!btn || !CAE.levels) return;
    const L = CAE.levels.active();
    btn.textContent = L.cefr;
    if (L.accent) btn.style.setProperty('--lvl', L.accent);
    btn.title = 'Your level: ' + L.exam + ' — tap to change';
    btn.setAttribute('aria-label', 'Your level: ' + L.exam + '. Change your level.');
  }

  // The home/onboarding screen: pick the Cambridge level to train for. Reused
  // for first-run (opts.firstRun, then opts.onDone) and level switching.
  function openLevelPicker(opts) {
    const o = opts || {};
    const levels = CAE.levels ? CAE.levels.list() : [];
    let chosen = CAE.levels ? CAE.levels.currentId() : 'c1';

    const cards = {};
    const grid = el('div', { class: 'level-grid', role: 'radiogroup', ariaLabel: 'CEFR level' });
    for (const L of levels) {
      const card = el('button', {
        class: 'level-card' + (L.id === chosen ? ' selected' : ''),
        type: 'button', role: 'radio',
        style: { '--lvl': L.accent || '#0e7c6b' },
        attr: {
          'aria-checked': String(L.id === chosen),
          title: L.structureNote || (L.examAccurate ? 'Exam-accurate paper structure.' : ''),
        },
        on: { click: () => {
          chosen = L.id;
          for (const [id, c] of Object.entries(cards)) {
            c.classList.toggle('selected', id === chosen);
            c.setAttribute('aria-checked', String(id === chosen));
          }
        } },
      },
      el('span', { class: 'level-cefr', text: L.cefr }),
      el('span', { class: 'level-body' },
        el('strong', { class: 'level-name', text: L.exam }),
        el('span', { class: 'muted small level-tag', text: L.tagline }),
      ),
      el('span', { class: 'level-check', attr: { 'aria-hidden': 'true' }, text: '✓' }),
      );
      cards[L.id] = card;
      grid.append(card);
    }

    const content = el('div', null,
      el('p', { class: 'muted', text: 'Which Cambridge English level are you working towards? Practice tasks, vocabulary, scoring and feedback are all pitched at the level you choose — and your progress is kept separately for each level. You can switch any time from the header.' }),
      grid,
    );

    let advanced = false;
    const goNext = () => {
      if (advanced) return;
      advanced = true;
      if (o.onDone) o.onDone(); else route();
    };
    const apply = (close) => {
      CAE.storage.saveSettings({ level: chosen });
      updateLevelChip();
      applyTheme();
      const L = CAE.levels.get(chosen);
      ui.toast('Level set to ' + L.exam, 'success');
      close();
    };

    ui.modal({
      title: o.firstRun ? 'Choose your level' : 'Change your level',
      content,
      actions: [
        { label: o.firstRun ? 'Continue' : 'Save level', kind: 'primary', onClick: apply },
      ],
      onClose: goNext,
    });
  }

  /* ---------- welcome (first run) ---------- */

  function showWelcome() {
    const s0 = CAE.storage.getSettings();
    const L = activeLevel();
    const sc = L.scale;
    let provider = s0.provider === 'gemini' ? 'gemini' : 'anthropic';
    const keys = {
      anthropic: keyField(s0.apiKey, 'sk-ant-…'),
      gemini: keyField(s0.geminiKey, 'AIza…'),
    };
    const keyHost = el('div', { class: 'field' });
    const helpHost = el('div');
    const syncProvider = (p) => {
      provider = p;
      keyHost.replaceChildren(
        el('label', { class: 'label', text: p === 'gemini' ? 'Google Gemini API key (free tier)' : 'Anthropic API key' }),
        keys[p].row,
      );
      helpHost.replaceChildren(howToGetKey(p));
    };
    const picker = providerPicker(provider, syncProvider);
    syncProvider(provider);
    const baseline = scoreField('Your latest scale score (optional)', 'e.g. 172', null);
    const goal = scoreField('Your goal (optional)', 'e.g. 200', null);

    const content = el('div', null,
      el('div', { class: 'welcome-hero' },
        el('div', { class: 'welcome-icon wm-mark', text: '◆' }),
        el('span', { class: 'overline wm-overline', text: L.exam }),
        el('h2', { text: 'Welcome to English Exam Trainer' }),
        el('p', { class: 'muted wm-lede', text: 'Fresh, AI-generated practice for every part of the exam — Reading, Writing, Listening and Speaking — all pitched at ' + L.cefr + ' level.' }),
        el('button', { class: 'text-link', type: 'button', on: { click: () => openLevelPicker({}) } }, 'Change level (' + L.cefr + ')'),
      ),
      el('div', { class: 'field' },
        el('label', { class: 'label', text: 'AI engine' }), picker,
      ),
      keyHost,
      helpHost,
      el('div', { class: 'wm-section' },
        el('span', { class: 'overline', text: 'Make it yours · optional' }),
        gradeLadder(),
        el('div', { class: 'score-pair' }, baseline.field, goal.field),
        el('p', { class: 'muted small', text: 'If you’ve taken a mock or the real exam — used to personalise your dashboard.' }),
      ),
      el('p', { class: 'muted small', text: 'Privacy: your key, scores and writing stay in this browser\'s local storage. Nothing is sent anywhere except your own API calls to the AI provider you choose.' }),
    );
    ui.modal({
      title: 'Set up',
      content,
      actions: [
        { label: 'Explore first', kind: 'ghost', onClick: (close) => close() },
        { label: 'Save & start', kind: 'primary', onClick: (close) => {
          const v = keys[provider].input.value.trim();
          if (!v) { ui.toast('Paste your API key first (or choose Explore first).', 'error'); return; }
          const patch = { provider, baselineScore: baseline.read(), targetScore: goal.read() };
          patch[provider === 'gemini' ? 'geminiKey' : 'apiKey'] = v;
          CAE.storage.saveSettings(patch);
          // Warm the model list in the background so this key's very first
          // practice set goes straight to a model it can actually use.
          if (provider === 'gemini') CAE.api.discoverGeminiModels(v).catch(() => {});
          ui.toast('Key saved — you\'re ready to practise!', 'success');
          close();
        } },
      ],
    });
  }

  /* ---------- settings modal ---------- */

  function openSettings() {
    const s = CAE.storage.getSettings();

    const save = (patch) => CAE.storage.saveSettings(patch);

    const sectionHead = (text) => el('div', { class: 'set-section' }, el('span', { class: 'overline', text }));

    let sProvider = s.provider === 'gemini' ? 'gemini' : 'anthropic';
    const sKeys = {
      anthropic: keyField(s.apiKey, 'sk-ant-…'),
      gemini: keyField(s.geminiKey, 'AIza…'),
    };
    const sKeyField = el('div', { class: 'field' });
    const sHelp = el('div');
    const syncEngine = (p) => {
      sProvider = p;
      const storeKey = p === 'gemini' ? 'geminiKey' : 'apiKey';
      const input = sKeys[p].input;
      sKeyField.replaceChildren(...[
        el('label', { class: 'label', text: p === 'gemini' ? 'Google Gemini API key (free tier)' : 'Anthropic API key' }),
        sKeys[p].row,
        el('div', { class: 'row', style: { marginTop: '6px' } },
          el('button', { class: 'btn btn-sm', on: { click: () => {
            const v = input.value.trim();
            const patch = {}; patch[storeKey] = v; save(patch);
            ui.toast(v ? 'Key saved' : 'Key cleared', 'success');
            // Learn this key's model list now, so the first practice set does
            // not have to discover it the slow way. Failure is harmless.
            if (p === 'gemini' && v) {
              CAE.api.discoverGeminiModels(v).then((ids) => { if (ids.length) syncEngine(p); }).catch(() => {});
            }
          } } }, 'Save key'),
          el('button', { class: 'btn btn-danger btn-sm', on: { click: () => {
            input.value = ''; const patch = {}; patch[storeKey] = ''; save(patch); ui.toast('Key cleared');
          } } }, 'Clear key'),
        ),
        el('p', { class: 'muted small', text: 'Your key is stored only in this browser.', style: { margin: '6px 0 0' } }),
        p === 'gemini' ? geminiModelField(() => input.value) : null,
      ].filter(Boolean));
      sHelp.replaceChildren(howToGetKey(p));
    };
    const enginePicker = providerPicker(sProvider, (p) => { save({ provider: p }); syncEngine(p); });
    syncEngine(sProvider);

    const levelSel = el('select', { class: 'select', on: { change: () => {
      save({ level: levelSel.value });
      updateLevelChip();
      applyTheme();
      const L = CAE.levels.get(levelSel.value);
      ui.toast('Level set to ' + L.exam, 'success');
    } } });
    if (CAE.levels) {
      for (const L of CAE.levels.list()) {
        levelSel.append(el('option', { value: L.id, text: L.cefr + ' — ' + L.exam }));
      }
      levelSel.value = CAE.levels.currentId();
    }

    const upLevel = activeLevel().aspire;
    const diffSel = el('select', { class: 'select', on: { change: () => save({ difficulty: diffSel.value }) } },
      el('option', { value: 'standard', text: 'Exam standard' }),
      el('option', { value: 'hard', text: 'Harder — top of the level' }),
      el('option', { value: 'c2', text: 'Stretch — one level up (' + upLevel + ')' }),
    );
    diffSel.value = s.difficulty;

    const customWrap = el('div', { class: 'field' + (s.timerMode === 'custom' ? '' : ' hidden') },
      el('label', { class: 'label', text: 'Custom minutes per part / paper' }));
    const customInput = el('input', { class: 'input', type: 'number', min: '1', max: '180', value: String(s.customMinutes),
      on: { change: () => save({ customMinutes: Math.max(1, Math.min(180, Number(customInput.value) || 10)) }) } });
    customWrap.append(customInput);

    const timerSel = el('select', { class: 'select', on: { change: () => {
      save({ timerMode: timerSel.value });
      customWrap.classList.toggle('hidden', timerSel.value !== 'custom');
    } } },
      el('option', { value: 'off', text: 'No timer — take as long as you like' }),
      el('option', { value: 'official', text: 'Official exam timings' }),
      el('option', { value: 'custom', text: 'Custom time' }),
    );
    timerSel.value = s.timerMode;

    const strictBox = el('input', { type: 'checkbox', checked: s.strictTiming ? 'checked' : undefined,
      on: { change: () => save({ strictTiming: strictBox.checked }) } });
    if (s.strictTiming) strictBox.checked = true;

    const voiceSel = el('select', { class: 'select', on: { change: () => save({ listenVoice: voiceSel.value }) } });
    const fillVoices = () => {
      if (!('speechSynthesis' in window)) {
        voiceSel.append(el('option', { value: '', text: 'Speech not supported in this browser' }));
        voiceSel.disabled = true;
        return;
      }
      const voices = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
      voiceSel.replaceChildren(el('option', { value: '', text: 'Automatic (best English voice)' }));
      for (const v of voices) voiceSel.append(el('option', { value: v.name, text: v.name + ' (' + v.lang + ')' }));
      voiceSel.value = voices.some((v) => v.name === s.listenVoice) ? s.listenVoice : '';
    };
    fillVoices();
    if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', fillVoices, { once: true });

    const rateVal = el('span', { class: 'chip', text: s.listenRate + '×' });
    const rateInput = el('input', { type: 'range', min: '0.7', max: '1.3', attr: { step: '0.05' }, value: String(s.listenRate),
      on: { input: () => { rateVal.textContent = Number(rateInput.value).toFixed(2).replace(/0$/, '') + '×'; },
        change: () => save({ listenRate: Number(rateInput.value) }) } });

    const twiceBox = el('input', { type: 'checkbox', on: { change: () => save({ playTwice: twiceBox.checked }) } });
    if (s.playTwice) twiceBox.checked = true;

    const baseline = scoreField('Your latest scale score', 'e.g. 172', s.baselineScore, (v) => save({ baselineScore: v }));
    const goal = scoreField('Your goal', 'e.g. 200', s.targetScore, (v) => save({ targetScore: v }));

    const themeSel = el('select', { class: 'select', on: { change: () => { save({ theme: themeSel.value }); applyTheme(); } } },
      el('option', { value: 'auto', text: 'Follow system' }),
      el('option', { value: 'light', text: 'Light' }),
      el('option', { value: 'dark', text: 'Dark' }),
    );
    themeSel.value = s.theme;

    const content = el('div', null,
      sectionHead('AI engine'),
      el('div', { class: 'field' }, enginePicker),
      sKeyField,
      sHelp,
      sectionHead('Level'),
      el('div', { class: 'field' }, el('label', { class: 'label', text: 'Cambridge exam level' }), levelSel),
      el('p', { class: 'muted small', text: 'Each level keeps its own progress, vocabulary and scores.' }),
      sectionHead('Practice'),
      el('div', { class: 'field' }, el('label', { class: 'label', text: 'Difficulty of generated sets' }), diffSel),
      el('div', { class: 'field' }, el('label', { class: 'label', text: 'Timer' }), timerSel),
      customWrap,
      el('label', { class: 'settings-row' },
        el('span', null, el('strong', { text: 'Strict exam timing' }),
          el('span', { class: 'muted small', text: ' — auto-submit when time runs out', style: { display: 'block' } })),
        strictBox,
      ),
      sectionHead('Listening'),
      el('div', { class: 'field' }, el('label', { class: 'label', text: 'Listening voice' }), voiceSel),
      el('div', { class: 'field' }, el('label', { class: 'label', text: 'Speech speed' }),
        el('div', { class: 'row' }, rateInput, rateVal)),
      el('label', { class: 'settings-row' },
        el('span', null, el('strong', { text: 'Play recordings twice' }),
          el('span', { class: 'muted small', text: ' — like the real exam', style: { display: 'block' } })),
        twiceBox,
      ),
      sectionHead('Your scores'),
      el('div', { class: 'score-pair' }, baseline.field, goal.field),
      el('p', { class: 'muted small', text: 'Cambridge English Scale, ' + activeScale().min + '–' + activeScale().max + '. Leave a field blank to clear it — used to personalise your dashboard.' }),
      sectionHead('Appearance'),
      el('div', { class: 'field' }, el('label', { class: 'label', text: 'Theme' }), themeSel),
      el('p', { class: 'muted small', text: 'Progress data can be exported or imported from the Dashboard → Your data.' }),
    );

    ui.modal({ title: 'Settings', content, onClose: () => route() });
  }

  /* ---------- boot ---------- */

  function boot() {
    applyTheme();

    $('#theme-toggle').addEventListener('click', () => {
      const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
      CAE.storage.saveSettings({ theme: next });
      applyTheme();
    });

    $('#settings-btn').addEventListener('click', openSettings);

    const levelBtn = $('#level-btn');
    if (levelBtn) {
      updateLevelChip();
      levelBtn.addEventListener('click', () => openLevelPicker({}));
    }

    $$('.nav-btn').forEach((b) => {
      b.addEventListener('click', () => { location.hash = '#/' + b.dataset.nav; });
    });

    window.addEventListener('hashchange', route);
    route();

    if (CAE.vocab && CAE.vocab.initLongPress) CAE.vocab.initLongPress();

    // First run: greet with the level picker (the "home screen" that asks which
    // level you're aiming for), then the API-key setup if one is needed.
    const s = CAE.storage.getSettings();
    const needKey = CAE.config.mode() === 'direct' && !CAE.api.hasKey();
    if (!s.onboarded) {
      openLevelPicker({ firstRun: true, onDone: () => {
        CAE.storage.saveSettings({ onboarded: true });
        if (needKey) showWelcome();
      } });
    } else if (needKey) {
      showWelcome();
    }

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline shell is optional */ });
    }
  }

  // Scripts are deferred, so the DOM is already parsed.
  boot();
})();
