/* CAE Ace — full mock exam (CAE.mocktest).
 * All papers in sequence, deferred results, per-paper timing, Cambridge
 * scale conversion and a pass/C2 verdict, saved to history. */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const U = () => CAE.util;
  const PARTS = () => CAE.prompts.PARTS;
  const LV = () => (CAE.levels && CAE.levels.active && CAE.levels.active()) || {
    cefr: 'C1', aspire: 'C2', exam: 'C1 Advanced (CAE)',
    scale: { min: 142, max: 210, pass: 180, high: 200 },
    writing: { min: 220, max: 260 },
  };

  const PAPERS = [
    { name: 'Reading & Use of English', key: 'reading', ids: ['rue1', 'rue2', 'rue3', 'rue4', 'rue5', 'rue6', 'rue7', 'rue8'], minutes: 90, mins: '90 min' },
    { name: 'Writing', key: 'writing', ids: ['wri1', 'wri2'], minutes: 90, mins: '90 min' },
    { name: 'Listening', key: 'listening', ids: ['lis1', 'lis2', 'lis3', 'lis4'], minutes: 40, mins: '~40 min' },
  ];
  const ROMAN = ['I', 'II', 'III'];

  // The papers for the active level: each paper's parts filtered to those the
  // level actually includes (see js/levels.js `parts`), empty papers dropped.
  function activePapers() {
    const P = PARTS();
    const readingName = (CAE.levels && CAE.levels.active().readingPaperName) || null;
    return PAPERS
      .map((p) => Object.assign({}, p, {
        name: (p.key === 'reading' && readingName) ? readingName : p.name,
        ids: p.ids.filter((id) => P[id] && (!CAE.levels || CAE.levels.inActiveOrder(id))),
      }))
      .filter((p) => p.ids.length);
  }
  function countQuestions(ids) {
    const P = PARTS();
    return ids.reduce((n, id) => n + ((P[id] && P[id].questionCount) || 0), 0);
  }

  let S = null;               // active exam state
  let guardInstalled = false;

  function cancelSpeech() {
    if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
  }

  function timerConfigFor(paper) {
    const s = CAE.storage.getSettings();
    if (s.timerMode === 'off') return null;
    const minutes = s.timerMode === 'custom' ? (s.customMinutes || 10) : paper.minutes;
    return { seconds: minutes * 60, strict: !!s.strictTiming };
  }

  /* ---------- navigation guard ---------- */

  function installGuard() {
    if (guardInstalled) return;
    guardInstalled = true;
    window.addEventListener('hashchange', () => {
      if (!S || !S.active || S.allowLeave) return;
      if (location.hash.startsWith('#/mock')) return;
      const target = location.hash;
      location.hash = '#/mock';
      CAE.ui.confirm('Leave the mock exam? Your progress will be lost.', { danger: true }).then((ok) => {
        if (ok) {
          quitCleanup();
          location.hash = target;
        }
      });
    });
  }

  function quitCleanup() {
    if (!S) return;
    S.allowLeave = true;
    S.active = false;
    if (S.timer) { S.timer.destroy(); S.timer = null; }
    cancelSpeech();
  }

  /* ---------- entry ---------- */

  function start(host) {
    if (S && S.active) return; // resuming the view mid-exam: content is still in place
    S = null;
    renderIntro(host);
  }

  function renderIntro(host) {
    const { el } = U();
    const s = CAE.storage.getSettings();
    const timerNote = s.timerMode === 'off'
      ? 'Timer is OFF — take as long as you like (change in Settings).'
      : s.timerMode === 'official'
        ? 'Official per-paper timings: 90 + 90 + 40 minutes.' + (s.strictTiming ? ' Strict timing is ON: papers auto-submit when time runs out.' : ' Strict timing is off: the clock keeps counting but never submits for you.')
        : 'Custom timing: ' + (s.customMinutes || 10) + ' minutes per paper.' + (s.strictTiming ? ' Strict timing is ON.' : '');

    const paperList = el('div', { class: 'mock-paper-list' });
    const w = LV().writing;
    const papers = activePapers();
    papers.forEach((p, i) => {
      const detail = p.key === 'writing'
        ? p.ids.length + ' tasks · ' + w.min + '–' + w.max + ' words each'
        : p.ids.length + ' parts · ' + countQuestions(p.ids) + ' questions';
      paperList.append(el('div', { class: 'mock-paper-row', data: { paper: p.key } },
        el('span', { class: 'mock-paper-num', text: ROMAN[i] || String(i + 1) }),
        el('span', { class: 'mock-paper-name' },
          el('strong', { text: p.name }),
          el('span', { class: 'muted small', text: detail }),
        ),
        el('span', { class: 'mock-paper-min', text: p.mins }),
      ));
    });

    host.replaceChildren(
      el('div', { class: 'overline', text: 'Exam conditions · Three papers' }),
      el('h1', { class: 'ink-stroke', text: 'Full mock test' }),
      el('div', { class: 'card card--open mock-intro' },
        el('p', { class: 'mock-lede', text: 'A complete ' + LV().exam + ' sitting: every part is freshly generated, marks stay sealed until the end, and your papers are converted to the Cambridge ' + LV().scale.min + '–' + LV().scale.max + ' scale with a pass (' + LV().scale.pass + ') and ' + LV().aspire + ' (' + LV().scale.high + ') verdict.' }),
        el('h3', { class: 'section-head' },
          el('span', { class: 'sh-no', text: '01' }),
          'The papers',
          el('span', { class: 'sh-note', text: '3 h 40 official' }),
        ),
        paperList,
        el('p', { class: 'mock-note', text: timerNote }),
        el('p', { class: 'mock-note', text: 'Speaking is not examined here (see the Speaking tips instead); your overall estimate averages the three examined papers.' }),
        el('button', { class: 'btn btn-primary mock-start-btn', on: { click: () => beginExam(host) } }, 'Start the mock test'),
      ),
    );
  }

  function beginExam(host) {
    installGuard();
    const papers = activePapers();
    S = {
      active: true, allowLeave: false, host,
      paper: 0, partIdx: 0,
      papers, totalSteps: papers.reduce((n, p) => n + p.ids.length, 0),
      results: [], timer: null, recordNow: null, saved: false,
    };
    showPaperIntro();
  }

  /* ---------- flow ---------- */

  function stepNumber() {
    let n = 0;
    for (let i = 0; i < S.paper; i++) n += S.papers[i].ids.length;
    return n + S.partIdx + 1;
  }

  function header() {
    const { el } = U();
    const paper = S.papers[S.paper];
    const bar = el('div', { class: 'mock-progress' },
      el('div', { class: 'row', style: { justifyContent: 'space-between' } },
        el('div', null,
          el('div', { class: 'overline mock-live', text: 'Live exam · Paper ' + (S.paper + 1) + ' of 3' }),
          el('strong', { text: paper.name }),
          el('div', { class: 'mock-step', text: 'Part ' + (S.partIdx + 1) + ' of ' + paper.ids.length + ' · step ' + stepNumber() + '/' + S.totalSteps }),
        ),
        el('div', { class: 'row' },
          S.timer ? S.timer.element : null,
          el('button', { class: 'btn btn-ghost btn-sm', on: { click: quitClicked } }, 'Quit'),
        ),
      ),
      CAE.ui.progress((stepNumber() - 1) / S.totalSteps * 100, { label: 'Exam progress' }),
    );
    return bar;
  }

  async function quitClicked() {
    const ok = await CAE.ui.confirm('Quit the mock exam? Your progress will be lost.', { danger: true });
    if (ok) {
      quitCleanup();
      location.hash = '#/dashboard';
    }
  }

  function showPaperIntro() {
    const { el } = U();
    cancelSpeech();
    const paper = S.papers[S.paper];
    const s = CAE.storage.getSettings();
    const cfg = timerConfigFor(paper);
    S.host.replaceChildren(
      el('div', { class: 'card card--sheet mock-interstitial' },
        el('div', { class: 'overline mock-live', text: 'Paper ' + (S.paper + 1) + ' of 3' }),
        el('div', { class: 'mock-folio', attr: { 'aria-hidden': 'true' }, text: ROMAN[S.paper] }),
        el('h2', { text: paper.name }),
        el('p', { class: 'chip-meta mock-inter-meta', text: paper.ids.length + ' parts · ' + (s.timerMode === 'off' ? 'no time limit' : (s.timerMode === 'custom' ? (s.customMinutes || 10) : paper.minutes) + ' minutes') }),
        el('button', { class: 'btn btn-primary mock-start-btn', on: { click: () => {
          if (cfg) {
            S.timer = CAE.timer.create({
              seconds: cfg.seconds, strict: cfg.strict, label: paper.name,
              onExpire: () => { expirePaper(); },
            });
            S.timer.start();
          }
          renderPart();
        } } }, 'Begin paper ' + (S.paper + 1)),
      ),
    );
  }

  function renderPart() {
    cancelSpeech();
    const partId = S.papers[S.paper].ids[S.partIdx];
    if (partId === 'wri1' || partId === 'wri2') renderWritingStep(partId);
    else renderObjective(partId);
  }

  /* Running head, like the practice runner's: mono folio line, title, rubric. */
  function partIntroCard(meta) {
    const { el } = U();
    return el('div', { class: 'mock-part-head' },
      el('div', { class: 'run-head' },
        el('span', { class: 'rh-meta', text: meta.label + (meta.questionCount ? ' — ' + meta.questionCount + ' Q' : '') }),
      ),
      el('h2', { class: 'run-title', text: meta.name }),
      el('p', { class: 'muted small mock-part-desc', text: meta.desc }),
    );
  }

  function hasResult(partId) {
    return S.results.some((r) => r.partId === partId);
  }

  function pushSkipped(partId) {
    if (hasResult(partId)) return;
    const meta = PARTS()[partId];
    if (partId === 'wri1' || partId === 'wri2') {
      S.results.push({ partId, skipped: true });
    } else {
      S.results.push({
        partId, skipped: true,
        res: { score: 0, total: meta.questionCount || 0, items: [] },
      });
    }
  }

  function transition(partId) {
    const { el } = U();
    cancelSpeech();
    const isLast = S.partIdx === S.papers[S.paper].ids.length - 1;
    S.host.replaceChildren(header(),
      el('div', { class: 'card card--sheet mock-interstitial' },
        el('div', { class: 'mock-tick', attr: { 'aria-hidden': 'true' } }),
        el('h2', { text: 'Answers recorded' }),
        el('p', { class: 'chip-meta mock-inter-meta', text: 'Step ' + stepNumber() + ' of ' + S.totalSteps + ' · sealed' }),
        el('p', { class: 'muted', text: PARTS()[partId].label + ' is sealed — no marks are revealed until the final report.' }),
        el('button', { class: 'btn btn-primary mock-start-btn', on: { click: advance } },
          isLast ? (S.paper === S.papers.length - 1 ? 'Finish & see results' : 'Next paper') : 'Next part'),
      ),
    );
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function advance() {
    S.recordNow = null;
    S.partIdx++;
    if (S.partIdx >= S.papers[S.paper].ids.length) {
      if (S.timer) { S.timer.destroy(); S.timer = null; }
      S.paper++;
      S.partIdx = 0;
      if (S.paper >= S.papers.length) { finish(); return; }
      showPaperIntro();
      return;
    }
    renderPart();
  }

  async function expirePaper() {
    CAE.ui.toast('Time is up for this paper.', 'info');
    if (S.recordNow) {
      try { await S.recordNow(); } catch (e) { /* record what we can */ }
      S.recordNow = null;
    }
    const ids = S.papers[S.paper].ids;
    for (const id of ids) if (!hasResult(id)) pushSkipped(id);
    S.partIdx = ids.length - 1;
    advance();
  }

  /* ---------- objective parts (R&UoE, Listening) ---------- */

  function renderObjective(partId) {
    const { el } = U();
    const def = CAE.parts[partId];
    const meta = PARTS()[partId];
    let failures = 0;

    const body = el('div');
    S.host.replaceChildren(header(), partIntroCard(meta), body);
    window.scrollTo({ top: 0, behavior: 'auto' });

    generate();

    async function generate() {
      const spin = CAE.ui.spinner(body, { label: 'Generating ' + meta.name + '…' });
      let set;
      try {
        set = await CAE.api.generateSet(partId);
      } catch (err) {
        spin.stop();
        failures++;
        CAE.ui.errorBox(body, err && err.message, generate);
        if (failures >= 2) {
          body.append(el('div', { class: 'row', style: { justifyContent: 'center', marginTop: '10px' } },
            el('button', { class: 'btn btn-ghost', on: { click: () => {
              pushSkipped(partId);
              transition(partId);
            } } }, 'Skip this part (scores 0)'),
          ));
        }
        return;
      }
      spin.stop();
      body.replaceChildren();

      const wrap = el('div');
      let collector;
      try {
        collector = def.render(set, wrap, { mode: 'mock' });
      } catch (e) {
        failures++;
        CAE.ui.errorBox(body, 'This set came back malformed — generate a fresh one.', generate);
        return;
      }
      body.append(wrap);

      const record = () => {
        if (hasResult(partId)) return;
        const res = def.mark(set, collector.getAnswers());
        S.results.push({ partId, set, res });
      };
      S.recordNow = record;

      const btn = el('button', { class: 'btn btn-primary', on: { click: async () => {
        if (typeof collector.unanswered === 'function') {
          const n = collector.unanswered();
          if (n > 0) {
            const ok = await CAE.ui.confirm(n + ' question' + (n === 1 ? ' is' : 's are') + ' unanswered. Record answers anyway?');
            if (!ok) return;
          }
        }
        record();
        transition(partId);
      } } }, 'Record answers');
      CAE.ui.sticky(body, [btn]);
    }
  }

  /* ---------- writing tasks ---------- */

  function renderWritingStep(partId) {
    const { el, countWords } = U();
    const meta = PARTS()[partId];
    let chosenType = '';

    const body = el('div');
    S.host.replaceChildren(header(), partIntroCard(meta), body);
    window.scrollTo({ top: 0, behavior: 'auto' });

    if (partId === 'wri2') {
      const typeSel = el('select', { class: 'select', ariaLabel: 'Task type', style: { maxWidth: '240px' },
        on: { change: () => { chosenType = typeSel.value; } } },
        el('option', { value: '', text: 'Surprise me' }),
        el('option', { value: 'email', text: 'Email' }),
        el('option', { value: 'letter', text: 'Letter' }),
        el('option', { value: 'proposal', text: 'Proposal' }),
        el('option', { value: 'report', text: 'Report' }),
        el('option', { value: 'review', text: 'Review' }),
      );
      body.append(el('div', { class: 'card' },
        el('div', { class: 'card-title', text: 'Task choice' }),
        el('div', { class: 'row' },
          el('span', { class: 'label', text: 'Task type' }), typeSel,
          el('button', { class: 'btn btn-primary', on: { click: () => generate() } }, 'Get my task'),
        ),
      ));
    } else {
      generate();
    }

    async function generate() {
      const spin = CAE.ui.spinner(body, { label: 'Writing your task…' });
      let set;
      try {
        set = await CAE.api.generateSet(partId, chosenType ? { taskType: chosenType } : undefined);
      } catch (err) {
        spin.stop();
        CAE.ui.errorBox(body, err && err.message, generate);
        body.append(el('div', { class: 'row', style: { justifyContent: 'center', marginTop: '10px' } },
          el('button', { class: 'btn btn-ghost', on: { click: skip } }, 'Skip this task'),
        ));
        return;
      }
      spin.stop();
      renderEditor(set);
    }

    async function skip() {
      const ok = await CAE.ui.confirm('Skip this writing task? It will be excluded from your writing score.', { danger: true });
      if (!ok) return;
      pushSkipped(partId);
      transition(partId);
    }

    function renderEditor(set) {
      const ta = el('textarea', { class: 'textarea', placeholder: 'Write your answer here…', ariaLabel: 'Your answer' });
      const counter = CAE.ui.wordCounter(ta, {
        min: (set.targetWords && set.targetWords.min) || 220,
        max: (set.targetWords && set.targetWords.max) || 260,
      });

      body.replaceChildren(
        CAE.writingUI.taskCard(set),
        el('div', { class: 'card' },
          el('div', { class: 'card-title', text: 'Answer sheet' }),
          el('div', { class: 'wri-editor-head' }, counter),
          ta,
        ),
      );

      const submitBtn = el('button', { class: 'btn btn-primary', on: { click: () => submit(false) } }, 'Submit answer');
      const skipBtn = el('button', { class: 'btn btn-ghost', on: { click: skip } }, 'Skip this task');
      const bar = CAE.ui.sticky(body, [skipBtn, submitBtn]);

      /* Strict expiry: assess what exists if it's substantial, else skip. */
      S.recordNow = async () => {
        if (hasResult(partId)) return;
        if (countWords(ta.value) >= 50) await doAssess(true);
        else pushSkipped(partId);
      };

      async function doAssess(auto) {
        const assessHost = el('div');
        body.append(assessHost);
        const spin = CAE.ui.spinner(assessHost, { label: 'Marking against the Cambridge criteria…' });
        try {
          const assessment = await CAE.api.assessWriting({
            taskType: set.taskType,
            taskPrompt: CAE.writingUI.fullTaskText(set),
            answer: ta.value.slice(0, 5900),
          });
          spin.stop();
          assessHost.remove();
          if (!hasResult(partId)) S.results.push({ partId, set, assessment, answer: ta.value });
        } catch (err) {
          spin.stop();
          assessHost.remove();
          if (auto) { pushSkipped(partId); return; }
          throw err;
        }
      }

      async function submit(forced) {
        if (hasResult(partId)) return;
        const words = countWords(ta.value);
        if (!ta.value.trim()) { CAE.ui.toast('Write your answer first — or use Skip.', 'error'); return; }
        if (!forced && words < 100) {
          const ok = await CAE.ui.confirm('Only ' + words + ' words so far (target ' + LV().writing.min + '–' + LV().writing.max + '). Submit anyway?');
          if (!ok) return;
        }
        submitBtn.disabled = true;
        skipBtn.disabled = true;
        try {
          await doAssess(false);
        } catch (err) {
          submitBtn.disabled = false;
          skipBtn.disabled = false;
          CAE.ui.toast(err && err.message ? err.message : 'Assessment failed — try again.', 'error');
          return;
        }
        bar.remove();
        transition(partId);
      }
    }
  }

  /* ---------- final report ---------- */

  const BAND_KEYS = ['content', 'communicativeAchievement', 'organisation', 'language'];

  function finish() {
    const { el, pct } = U();
    const M = CAE.marking;
    S.active = false;
    S.allowLeave = true;
    if (S.timer) { S.timer.destroy(); S.timer = null; }
    cancelSpeech();

    // Reading & Use of English (weighted, split into the two reported skills)
    const rueResults = S.results
      .filter((r) => r.partId.indexOf('rue') === 0)
      .map((r) => ({ partId: r.partId, score: r.res ? r.res.score : 0, total: r.res ? r.res.total : (PARTS()[r.partId].questionCount || 0) }));
    const { readingPct, uoePct } = M.weightedRuePct(rueResults);

    // Listening
    let lisGot = 0, lisMax = 0;
    for (const r of S.results) {
      if (r.partId.indexOf('lis') !== 0) continue;
      lisGot += r.res ? r.res.score : 0;
      lisMax += r.res ? r.res.total : (PARTS()[r.partId].questionCount || 0);
    }
    const listeningPct = pct(lisGot, lisMax);

    // Writing: mean band across all completed tasks
    const bands = [];
    for (const r of S.results) {
      if ((r.partId === 'wri1' || r.partId === 'wri2') && r.assessment) {
        for (const k of BAND_KEYS) bands.push(Number(r.assessment.bands[k]) || 0);
      }
    }
    const writingScale = bands.length ? M.writingScale(bands.reduce((a, b) => a + b, 0) / bands.length) : null;

    const scales = {
      reading: M.toScale(readingPct),
      uoe: M.toScale(uoePct),
      listening: M.toScale(listeningPct),
      writing: writingScale,
    };
    const available = Object.values(scales).filter((v) => v !== null);
    const overall = Math.round(available.reduce((a, b) => a + b, 0) / available.length);
    const verdict = M.gradeFor(overall);
    const L = LV();
    const sc = L.scale;
    const span = sc.max - sc.min;
    const posOf = (v) => (v - sc.min) / span * 100;

    // ----- render -----
    const scoreEl = el('span', { class: 'score-big', text: String(sc.min) });
    const barPct = Math.max(0, Math.min(100, posOf(overall)));
    const track = CAE.ui.progress(barPct, { label: 'Overall scale' });
    const fill = track.querySelector('.progress-fill');
    if (fill && overall >= sc.high) fill.classList.add('over-c2');
    else if (fill && overall >= sc.pass) fill.classList.add('over-pass');
    for (const mark of [
      { v: sc.pass, t: sc.pass + ' · ' + L.cefr + ' pass' },
      { v: sc.high, t: sc.high + ' · A/' + L.aspire },
    ]) {
      track.append(el('span', { class: 'progress-marker', style: { left: posOf(mark.v) + '%' } },
        el('span', { class: 'marker-label', text: mark.t })));
    }

    const verdictText = overall >= sc.high
      ? L.aspire + '-level performance — Grade A territory. Exceptional work.'
      : overall >= sc.pass
        ? 'Past the ' + sc.pass + ' pass mark — ' + L.cefr + ' level. Push on towards ' + sc.high + '.'
        : 'Below ' + sc.pass + ' this time. Open your weakest paper below — targeted practice moves this number fastest.';

    /* Marker's stamp: pass = good ink, just-below = plain ink, below = red. */
    const midLow = Math.round(sc.pass - (sc.pass - sc.min) * 0.4);
    const stampTone = overall >= sc.pass ? 'good' : overall >= midLow ? 'ink' : 'bad';

    const ledger = el('div', { class: 'ledger mock-ledger' });
    const skillRows = [
      ['01', 'Reading', scales.reading, 'reading'],
      ['02', 'Use of English', scales.uoe, 'uoe'],
      ['03', 'Listening', scales.listening, 'listening'],
      ['04', 'Writing', writingScale, 'writing'],
    ];
    for (const [idx, name, val, paper] of skillRows) {
      if (val === null) {
        ledger.append(el('div', { class: 'ledger-row is-empty', data: { paper } },
          el('span', { class: 'lr-idx', text: idx }),
          el('span', { class: 'lr-name', text: name }),
          el('span', { class: 'mock-lr-skip', text: 'skipped this sitting' }),
        ));
        continue;
      }
      const mini = CAE.ui.progress(Math.max(0, Math.min(100, posOf(val))), { label: name + ' scale score' });
      mini.classList.add('mini');
      const miniFill = mini.querySelector('.progress-fill');
      if (miniFill && val >= sc.high) miniFill.classList.add('over-c2');
      else if (miniFill && val >= sc.pass) miniFill.classList.add('over-pass');
      ledger.append(el('div', { class: 'ledger-row', data: { paper } },
        el('span', { class: 'lr-idx', text: idx }),
        el('span', { class: 'lr-name', text: name }),
        mini,
        el('span', { class: 'lr-score', text: String(val) }),
      ));
    }

    const details = el('div', { class: 'mock-review' },
      el('h3', { class: 'section-head' },
        el('span', { class: 'sh-no', text: '02' }),
        'Review every part',
      ),
      el('p', { class: 'muted small', text: 'Open a part to see each question, your answer and the explanation.' }));

    for (const r of S.results) {
      const meta = PARTS()[r.partId];
      const def = CAE.parts[r.partId];
      let badge;
      if (r.assessment) {
        badge = el('span', {
          class: 'badge ' + (r.assessment.estimatedScale >= LV().scale.pass ? 'good' : 'neutral'),
          text: 'scale ' + r.assessment.estimatedScale,
        });
      } else if (r.res) {
        const p = pct(r.res.score, r.res.total);
        badge = el('span', {
          class: 'badge ' + (r.skipped ? 'neutral' : p >= 65 ? 'good' : p >= 50 ? 'neutral' : 'bad'),
          text: r.res.score + '/' + r.res.total + (r.skipped ? ' · skipped' : ''),
        });
      } else {
        badge = el('span', { class: 'badge neutral', text: 'skipped' });
      }

      const d = el('details', null, el('summary', { class: 'mock-review-sum' },
        el('span', { class: 'mock-review-name' },
          el('strong', { text: meta.label }),
          el('span', { class: 'muted small', text: meta.name }),
        ),
        badge,
      ));
      if (r.assessment) {
        d.append(CAE.writingUI.taskCard(r.set), CAE.writingUI.renderAssessment(r.assessment));
      } else if (r.res && r.set) {
        d.append(CAE.ui.resultsPanel(r.res, { partId: r.partId, partName: meta.label + ' — ' + meta.name }));
        if (def && typeof def.renderTranscript === 'function') {
          try {
            d.append(el('div', { class: 'mock-transcript-wrap' },
              el('div', { class: 'card-title', text: 'Transcript' }), def.renderTranscript(r.set)));
          } catch (e) { /* transcript is a bonus */ }
        }
      } else {
        d.append(el('p', { class: 'muted', text: 'This part was skipped and scored 0.' }));
      }
      details.append(d);
    }

    S.host.replaceChildren(
      el('div', { class: 'overline', text: 'Examiner’s report' }),
      el('h1', { class: 'ink-stroke', text: 'Mock test results' }),
      el('div', { class: 'card card--open mock-report-hero' },
        el('div', { class: 'mock-hero-row' },
          scoreEl,
          el('span', { class: 'mock-caption', text: 'estimated overall score, Cambridge scale' }),
          el('span', { class: 'ui-stamp ' + stampTone, text: verdict.label }),
        ),
        el('div', { class: 'mock-report-track' }, track),
        el('p', { class: 'mock-verdict-note', text: verdictText }),
      ),
      el('h3', { class: 'section-head' },
        el('span', { class: 'sh-no', text: '01' }),
        'Marks by paper',
      ),
      ledger,
      el('p', { class: 'fig-caption', text: 'Estimates use an approximate percent-to-scale conversion — trust trends across sittings, not a single run. Speaking is not examined in the mock.' }),
      details,
      el('div', { class: 'mock-report-foot' },
        el('span', { class: 'badge good' },
          el('span', { class: 'tick-inline', attr: { 'aria-hidden': 'true' } }),
          'Saved to history'),
        el('button', { class: 'btn btn-primary', on: { click: () => { location.hash = '#/dashboard'; } } }, 'Back to dashboard'),
      ),
    );
    CAE.ui.animateNumber(scoreEl, overall, { from: LV().scale.min, ms: 1100 });
    window.scrollTo({ top: 0, behavior: 'auto' });

    // ----- persist (once) -----
    if (!S.saved) {
      S.saved = true;
      CAE.storage.logMockResult({
        scales: { reading: scales.reading, uoe: scales.uoe, listening: scales.listening, writing: writingScale, overall },
        verdict: verdict.label,
        parts: S.results.map((r) => ({
          partId: r.partId,
          score: r.res ? r.res.score : (r.assessment ? BAND_KEYS.reduce((a, k) => a + (Number(r.assessment.bands[k]) || 0), 0) : 0),
          total: r.res ? r.res.total : (r.assessment ? 20 : 0),
          pctScore: r.res ? pct(r.res.score, r.res.total) : (r.assessment ? Math.round(BAND_KEYS.reduce((a, k) => a + (Number(r.assessment.bands[k]) || 0), 0) / 20 * 100) : 0),
        })),
      });
      for (const r of S.results) {
        if (r.assessment) {
          const sum = BAND_KEYS.reduce((a, k) => a + (Number(r.assessment.bands[k]) || 0), 0);
          CAE.storage.logAttempt({
            partId: r.partId, paper: 'writing', mode: 'mock',
            score: sum, total: 20, pctScore: Math.round(sum / 20 * 100),
            scale: r.assessment.estimatedScale, extra: { bands: r.assessment.bands },
          });
        } else if (r.res && !r.skipped) {
          CAE.storage.logAttempt({
            partId: r.partId, paper: CAE.marking.skillOf(r.partId), mode: 'mock',
            score: r.res.score, total: r.res.total, pctScore: pct(r.res.score, r.res.total),
          });
        }
      }
    }
  }

  CAE.mocktest = { start };
})();
