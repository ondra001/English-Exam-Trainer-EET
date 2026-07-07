/* CAE Ace — shared UI components and the practice runner. */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const U = () => CAE.util;

  /* ---------- part registry ---------- */

  CAE.parts = CAE.parts || {};
  CAE.registerPart = (def) => { CAE.parts[def.id] = def; };

  /* ---------- view manager ---------- */

  let exerciseCleanup = null;

  function showView(name) {
    if (typeof exerciseCleanup === 'function') {
      try { exerciseCleanup(); } catch (e) { /* cleanup must never block navigation */ }
      exerciseCleanup = null;
    }
    const apply = () => {
      document.querySelectorAll('.view').forEach((v) => {
        v.classList.toggle('active', v.id === 'view-' + name);
      });
      const navName = name === 'exercise' ? 'parts' : name;
      document.querySelectorAll('.nav-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.nav === navName);
      });
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    // Native cross-fade between views where the browser supports it.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduced) {
      const t = document.startViewTransition(apply);
      // Rapid navigation legitimately skips a transition — never let that
      // surface as an unhandled rejection.
      if (t && t.ready) t.ready.catch(() => {});
      if (t && t.finished) t.finished.catch(() => {});
    } else {
      apply();
    }
  }

  function onLeaveExercise(fn) { exerciseCleanup = fn; }

  /* ---------- toast ---------- */

  function toast(message, kind = 'info') {
    const host = document.getElementById('toast-host');
    if (!host) return;
    const t = U().el('div', { class: 'toast' + (kind !== 'info' ? ' ' + kind : '') }, message);
    host.append(t);
    // Errors deserve a longer read; confirmations can be brisk.
    const ttl = kind === 'error' ? 5000 : 3200;
    setTimeout(() => {
      t.classList.add('leaving');
      setTimeout(() => t.remove(), 260);
    }, ttl);
  }

  /* ---------- modal ---------- */

  function modal({ title, content, actions = [], onClose } = {}) {
    const { el } = U();
    let closed = false;

    const close = () => {
      if (closed) return;
      closed = true;
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
      if (onClose) onClose();
    };

    const onKey = (e) => { if (e.key === 'Escape') close(); };

    // The heading takes programmatic focus on open — never the close
    // button, which would wear a stuck ring in the corner.
    const heading = el('h3', { text: title || '', tabindex: '-1' });
    const head = el('div', { class: 'modal-head' },
      heading,
      el('button', {
        class: 'icon-btn ui-modal-close', ariaLabel: 'Close', title: 'Close',
        on: { click: close },
      }, '✕'),
    );

    const body = el('div', { class: 'modal-body' });
    if (typeof content === 'string') body.append(content);
    else if (content) body.append(content);

    const actionBar = el('div', { class: 'modal-actions' });
    for (const a of actions) {
      const cls = a.kind === 'primary' ? 'btn btn-primary'
        : a.kind === 'danger' ? 'btn btn-danger'
          : a.kind === 'ghost' ? 'btn btn-ghost' : 'btn';
      actionBar.append(el('button', { class: cls, on: { click: () => a.onClick(close) } }, a.label));
    }

    const box = el('div', { class: 'modal', role: 'dialog', attr: { 'aria-modal': 'true' } }, head, body);
    if (actions.length) box.append(actionBar);

    const backdrop = el('div', { class: 'modal-backdrop', on: {
      click: (e) => { if (e.target === backdrop) close(); },
    } }, box);

    document.body.append(backdrop);
    document.addEventListener('keydown', onKey);
    heading.focus();
    return { close, element: box };
  }

  function confirm(message, { danger = false } = {}) {
    return new Promise((resolve) => {
      let answered = false;
      modal({
        title: danger ? 'Are you sure?' : 'Confirm',
        content: U().el('p', { text: message }),
        actions: [
          { label: 'Cancel', kind: 'ghost', onClick: (close) => { answered = true; close(); resolve(false); } },
          { label: danger ? 'Yes, do it' : 'OK', kind: danger ? 'danger' : 'primary',
            onClick: (close) => { answered = true; close(); resolve(true); } },
        ],
        onClose: () => { if (!answered) resolve(false); },
      });
    });
  }

  /* ---------- loading & errors ---------- */

  const TIPS = [
    'In the multiple-choice cloze, read the whole sentence before looking at the options — collocation is usually the key.',
    'Open cloze gaps are almost always grammar words: articles, prepositions, pronouns, auxiliaries, linkers.',
    'In word formation, check whether the gap needs a negative prefix — it catches many candidates out.',
    'Key word transformations are worth two marks each — you can get one mark for a half-correct answer in the real exam.',
    'Read the question stems before the long text in Part 5: you\'ll know what to look for.',
    'In the gapped text, pronouns and linkers at the start of each paragraph are your best clues.',
    'For listening, the wrong options are usually mentioned too — wait for the meaning, not just the word.',
    'Aim for the task\'s target word count in writing. Going far over usually means losing focus, not gaining marks.',
    'Plan your essay in 5 minutes: intro, one paragraph per point, a conclusion with your opinion.',
    'In Speaking Part 2, speculate — "they might be…", "it looks as though…" — don\'t just describe.',
    'Your result is reported on the Cambridge English Scale — clearing the pass mark confirms your level.',
    'Little and often beats cramming: one fresh practice set a day builds a streak.',
    'Check contractions and spelling in typed answers — "dont" won\'t earn the mark.',
    'In cross-text matching, mark each writer\'s opinion as + or − on each theme, then compare.',
  ];

  function spinner(host, { label = 'Preparing your question paper…' } = {}) {
    const { el, sample } = U();
    const tip = el('div', { class: 'loading-tip', text: sample(TIPS) });
    const box = el('div', { class: 'loading-box' },
      // A pen circling an ink pool — the wait as part of the ritual.
      el('div', { class: 'loading-ink' },
        el('div', { class: 'spinner', ariaLabel: 'Loading' }),
      ),
      el('div', { class: 'muted', text: label }),
      el('div', { class: 'overline ui-tip-head', text: 'Examiner’s tip' }),
      tip,
    );
    host.replaceChildren(box);
    const iv = setInterval(() => {
      const next = sample(TIPS);
      tip.textContent = next;
      tip.style.animation = 'none';
      void tip.offsetWidth; // restart the fade-in
      tip.style.animation = '';
    }, 4000);
    return { stop: () => clearInterval(iv) };
  }

  function errorBox(host, message, onRetry) {
    const { el } = U();
    // Marginalia treatment: an apology in the margin, never a warning box.
    host.replaceChildren(el('div', { class: 'card ui-error' },
      el('p', { class: 'ui-error-head', text: 'The ink ran dry.' }),
      el('p', { class: 'muted', text: message || 'Something went wrong.' }),
      onRetry ? el('button', { class: 'btn btn-primary', on: { click: onRetry } }, 'Try again') : null,
    ));
  }

  /* ---------- inputs ---------- */

  function optionGroup({ options, name, selected = null, onSelect } = {}) {
    const { el } = U();
    let value = selected;
    const group = el('div', { class: 'option-group', role: 'radiogroup', ariaLabel: name || 'Options' });
    const buttons = {};
    for (const [letter, text] of Object.entries(options)) {
      const btn = el('button', {
        class: 'option', type: 'button', role: 'radio',
        attr: { 'aria-checked': String(value === letter) },
        on: { click: () => {
          const retap = value === letter;
          value = letter;
          for (const [l, b] of Object.entries(buttons)) {
            b.classList.toggle('selected', l === letter);
            b.setAttribute('aria-checked', String(l === letter));
          }
          if (retap) {
            // Re-tapping the pencilled bubble gives a small press-in pulse.
            btn.classList.remove('ui-repulse');
            void btn.offsetWidth;
            btn.classList.add('ui-repulse');
          }
          if (onSelect) onSelect(letter);
        } },
      },
      el('span', { class: 'option-letter', text: letter }),
      text ? el('span', { text }) : null,
      );
      if (value === letter) btn.classList.add('selected');
      buttons[letter] = btn;
      group.append(btn);
    }
    return { element: group, getValue: () => value, buttons };
  }

  function gapInput(number, { width } = {}) {
    return U().el('input', {
      class: 'gap-input' + (width === 'wide' ? ' wide' : ''),
      type: 'text',
      ariaLabel: 'Gap ' + number,
      data: { gap: String(number) },
      attr: { autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false', autocorrect: 'off' },
      on: {
        // Enter hops to the next unanswered gap — no mouse round-trips.
        keydown: (e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const all = Array.from(document.querySelectorAll('.view.active input.gap-input'))
            .filter((i) => !i.disabled);
          const idx = all.indexOf(e.target);
          const next = all.slice(idx + 1).find((i) => !i.value.trim()) || all[idx + 1];
          if (next) { next.focus(); next.select(); }
        },
      },
    });
  }

  function selectInput(number, letters, { placeholder = '—' } = {}) {
    const { el } = U();
    const sel = el('select', { class: 'gap-select', ariaLabel: 'Gap ' + number, data: { gap: String(number) } });
    sel.append(el('option', { value: '', text: placeholder }));
    for (const l of letters) sel.append(el('option', { value: l, text: l }));
    return sel;
  }

  function renderGappedText(text, makeGapNode) {
    const { el } = U();
    const wrap = el('div', { class: 'exercise-text' });
    const paragraphs = String(text).split(/\n\s*\n/);
    for (const para of paragraphs) {
      if (!para.trim()) continue;
      const p = el('p');
      const pieces = para.split(/\[\[(\d+)\]\]/);
      pieces.forEach((piece, i) => {
        if (i % 2 === 1) p.append(makeGapNode(Number(piece)));
        else if (piece) p.append(document.createTextNode(piece));
      });
      wrap.append(p);
    }
    return wrap;
  }

  function instructionsBox(text) {
    return U().el('div', { class: 'instructions-box', text });
  }

  function wordCounter(textarea, { min = 220, max = 260 } = {}) {
    const { el, countWords, debounce } = U();
    const badge = el('span', { class: 'word-counter under', text: '0 words' });
    const update = () => {
      const n = countWords(textarea.value);
      badge.textContent = n + ' word' + (n === 1 ? '' : 's') + ' · target ' + min + '–' + max;
      badge.classList.remove('under', 'ok', 'over');
      badge.classList.add(n < min ? 'under' : n > max ? 'over' : 'ok');
    };
    textarea.addEventListener('input', debounce(update, 150));
    update();
    return badge;
  }

  /* ---------- numbers, progress ---------- */

  function animateNumber(elm, to, { from = 0, ms = 700, suffix = '' } = {}) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || ms <= 0) { elm.textContent = Math.round(to) + suffix; return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      elm.textContent = Math.round(from + (to - from) * eased) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function progress(pctValue, { label } = {}) {
    const { el, clamp } = U();
    const fill = el('div', { class: 'progress-fill' });
    const track = el('div', {
      class: 'progress-track', role: 'progressbar',
      ariaLabel: label || 'Progress',
      attr: { 'aria-valuenow': String(Math.round(pctValue)), 'aria-valuemin': '0', 'aria-valuemax': '100' },
    }, fill);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.width = clamp(pctValue, 0, 100) + '%';
    }));
    return track;
  }

  function sticky(host, buttons) {
    const bar = U().el('div', { class: 'sticky-actions ui-actionbar' });
    for (const b of buttons) if (b) bar.append(b);
    host.append(bar);
    return bar;
  }

  /* ---------- transcript ---------- */

  function transcript(script) {
    const { el } = U();
    const wrap = el('div', { class: 'transcript' });
    for (const seg of (script || [])) {
      wrap.append(el('p', { class: 'speaker-line' },
        el('span', { class: 'speaker', text: seg.speaker || '' }),
        document.createTextNode(seg.text || ''),
      ));
    }
    return wrap;
  }

  /* ---------- results panel ---------- */

  function verdictFor(p) {
    if (p >= 90) return 'Outstanding — that\'s C2 territory.';
    if (p >= 80) return 'Excellent — right on track for a strong pass.';
    if (p >= 65) return 'Good work — a little more polish and you\'re there.';
    if (p >= 50) return 'Getting there — study the explanations below.';
    return 'A tough set — the explanations below are where the learning happens.';
  }

  function resultsPanel(markResult, { partId, partName, onRegenerate } = {}) {
    const { el, pct } = U();
    const p = pct(markResult.score, markResult.total);

    const scoreNum = el('span', { text: '0' });
    // The marked script: a raw fraction over the verdict rule, with the
    // examiner's stamp pressed onto the rule just after the count-up starts.
    const stampTone = p >= 80 ? 'good' : p >= 50 ? 'ink' : 'bad';
    const header = el('div', { class: 'ui-scorehead' },
      el('div', { class: 'score-fraction' },
        scoreNum, el('span', { class: 'sf-of', text: '⁄' + markResult.total })),
      el('p', { class: 'muted small ui-score-pct', text: p + '% correct' }),
      el('div', { class: 'verdict-rule' + (p >= 80 ? ' good' : p >= 50 ? '' : ' bad'), attr: { 'aria-hidden': 'true' } }),
      el('div', { class: 'ui-stamp-row' },
        el('span', {
          class: 'ui-stamp ' + stampTone,
          text: p >= 80 ? 'Distinction' : p >= 50 ? 'Good pass' : 'Keep going',
        })),
    );
    animateNumber(scoreNum, markResult.score, { ms: 800 });

    const list = el('div');
    markResult.items.forEach((item, i) => {
      // Items file in after the stamp lands, one ruled line at a time.
      const delay = (160 + Math.min(i * 35, 400)) + 'ms';

      // Correct answers fold away to a single ticked line.
      if (item.correct) {
        list.append(el('details', { class: 'result-line ui-reveal', style: { animationDelay: delay } },
          el('summary', null,
            el('span', { class: 'tick-inline', attr: { 'aria-hidden': 'true' } }),
            el('span', { class: 'rl-num', text: String(item.number) }),
            el('span', { text: item.userAnswer || item.correctAnswer || '' }),
          ),
          item.prompt ? el('p', { class: 'small', text: item.prompt, style: { margin: '0 0 4px' } }) : null,
          item.explanation ? el('div', { class: 'explanation', text: item.explanation }) : null,
        ));
        return;
      }

      const row = el('div', { class: 'result-item incorrect', style: { animationDelay: delay } });
      row.append(el('div', { class: 'row' },
        el('span', { class: 'q-number', text: String(item.number) }),
        el('strong', { text: item.prompt || '' }),
      ));
      row.append(el('div', { class: 'answers-line' },
        el('span', { class: 'badge bad', text: '✗ ' + (item.userAnswer || '—') }),
        el('span', { class: 'badge good', text: '→ ' + (item.correctAnswer || '') }),
      ));
      if (item.explanation) row.append(el('div', { class: 'explanation', text: item.explanation }));
      if (partId) {
        const btn = el('button', { class: 'text-link no-arrow ui-review-add', on: { click: () => {
          CAE.storage.addToReview({
            partId,
            partName: partName || partId,
            prompt: item.prompt || '',
            userAnswer: item.userAnswer || '',
            correctAnswer: item.correctAnswer || '',
            explanation: item.explanation || '',
          });
          btn.disabled = true;
          btn.replaceChildren('Added to your review list ',
            el('span', { class: 'tick-inline', attr: { 'aria-hidden': 'true' } }));
          toast('Added to your review list', 'success');
        } } }, 'Add to review list');
        row.append(btn);
      }
      list.append(row);
    });

    const panel = el('div', { class: 'card card--open results-panel' },
      el('h3', { class: 'section-head' }, el('span', { text: 'Results' })),
      header,
      el('p', { class: 'muted ui-reveal', text: verdictFor(p), style: { animationDelay: '120ms' } }),
      list,
    );
    if (onRegenerate) {
      panel.append(el('div', { class: 'row', style: { marginTop: '16px' } },
        el('button', { class: 'btn btn-inset', on: { click: onRegenerate } }, 'Generate a new set'),
      ));
    }
    return panel;
  }

  /* ---------- the practice runner ---------- */

  const DIFF_LABEL = { standard: 'Standard', hard: 'Harder', c2: 'Stretch' };

  function runPart(partId, host, opts = {}) {
    const { el } = U();
    const def = CAE.parts[partId];
    const meta = CAE.prompts && CAE.prompts.PARTS ? CAE.prompts.PARTS[partId] : null;
    host.replaceChildren();

    if (!def || !meta) {
      host.append(el('div', { class: 'empty-state' },
        el('p', { text: 'This page is missing from the booklet.' }),
        el('p', { class: 'small', text: 'The part could not be loaded — head back and choose another.' }),
        el('button', { class: 'btn btn-ghost', on: { click: () => { location.hash = '#/parts'; } } }, '‹ All parts'),
      ));
      return;
    }

    const settings = CAE.storage.getSettings();

    // Running head: one mono metadata line, the timer and the re-roll —
    // the page title and the collapsible rubric follow beneath.
    const isCustom = typeof def.customRun === 'function';
    const metaBits = [];
    if (meta.questionCount) metaBits.push(meta.questionCount + ' Q');
    if (meta.officialMinutes) metaBits.push('~' + meta.officialMinutes + ' min');
    if (!isCustom) {
      const lvl = CAE.levels ? CAE.levels.active().cefr : 'C1';
      metaBits.push(lvl + ' · ' + (DIFF_LABEL[settings.difficulty] || 'Standard'));
    }
    const timerSlot = el('span');
    const tools = el('span', { class: 'rh-tools' }, timerSlot);
    host.append(
      el('div', { class: 'run-head' },
        el('span', { class: 'rh-meta', text: meta.label + (metaBits.length ? ' — ' + metaBits.join(' · ') : '') }),
        tools,
      ),
      el('h2', { class: 'run-title', text: meta.name }),
      el('details', { class: 'run-about' },
        el('summary', { text: 'About this part' }),
        el('p', { class: 'muted', text: meta.desc, style: { margin: '0' } }),
      ),
    );

    const body = el('div');
    host.append(body);

    if (isCustom) {
      def.customRun(body, { mode: opts.mode || 'practice' });
      return;
    }

    const genBtn = el('button', { class: 'btn btn-primary btn-sm', on: { click: () => generate() } }, 'Generate new set');
    tools.append(genBtn);

    let timer = null;
    let spin = null;

    const cleanup = () => {
      if (timer) { timer.destroy(); timer = null; }
      if (spin) { spin.stop(); spin = null; }
    };
    onLeaveExercise(cleanup);

    async function generate() {
      cleanup();
      onLeaveExercise(cleanup);
      genBtn.disabled = true;
      spin = spinner(body);
      let set;
      try {
        set = await CAE.api.generateSet(partId);
      } catch (err) {
        spin.stop(); spin = null;
        genBtn.disabled = false;
        errorBox(body, err && err.message ? err.message : 'Generation failed.', () => generate());
        return;
      }
      spin.stop(); spin = null;
      genBtn.disabled = false;
      genBtn.textContent = 'New set';
      // Once a set is on the desk, the re-roll goes quiet; Check answers
      // becomes the screen's one primary action.
      genBtn.className = 'btn btn-ghost btn-sm';
      body.replaceChildren();

      const wrap = el('div');
      let collector;
      try {
        collector = def.render(set, wrap, { mode: opts.mode || 'practice' });
      } catch (err) {
        errorBox(body, 'This set came back malformed. Generate a new one.', () => generate());
        return;
      }
      body.append(wrap);

      const cfg = CAE.timer.resolveConfig(partId);
      if (cfg) {
        timer = CAE.timer.create({
          seconds: cfg.seconds,
          strict: cfg.strict,
          label: meta.name,
          onExpire: () => submit(true),
        });
        timerSlot.replaceChildren(timer.element);
        timer.start();
      } else {
        timerSlot.replaceChildren();
      }

      let submitted = false;
      const checkBtn = el('button', { class: 'btn btn-primary', on: { click: () => submit(false) } }, 'Check answers');
      const bar = sticky(body, [checkBtn]);

      // Answer-sheet tally in the docked bar: "5 of 8 answered".
      if (meta.questionCount && collector && typeof collector.unanswered === 'function') {
        const readout = el('span', { class: 'sa-progress' });
        const updateReadout = () => {
          let left = null;
          try { left = collector.unanswered(); } catch (e) { /* the tally is decorative */ }
          if (typeof left !== 'number' || Number.isNaN(left)) { readout.textContent = ''; return; }
          const done = Math.max(0, Math.min(meta.questionCount, meta.questionCount - left));
          readout.textContent = done + ' of ' + meta.questionCount + ' answered';
        };
        const queueReadout = () => setTimeout(updateReadout, 0);
        wrap.addEventListener('click', queueReadout);
        wrap.addEventListener('input', queueReadout);
        wrap.addEventListener('change', queueReadout);
        bar.prepend(readout);
        updateReadout();
      }

      async function submit(forced) {
        if (submitted) return;
        if (!forced && typeof collector.unanswered === 'function') {
          const n = collector.unanswered();
          if (n > 0) {
            const ok = await confirm(n + ' question' + (n === 1 ? ' is' : 's are') + ' still unanswered. Check anyway?');
            if (ok === false) return;
          }
        }
        if (submitted) return;
        submitted = true;
        if (timer) timer.stop();
        bar.remove();
        wrap.querySelectorAll('input, select, textarea, button.option').forEach((n) => { n.disabled = true; });

        const res = def.mark(set, collector.getAnswers());
        const resultsHost = el('div');
        body.append(resultsHost);
        resultsHost.append(resultsPanel(res, {
          partId,
          partName: meta.label + ' — ' + meta.name,
          onRegenerate: () => generate(),
        }));
        if (typeof def.afterMark === 'function') {
          try { def.afterMark(set, resultsHost); } catch (e) { /* transcript reveal is non-critical */ }
        }
        CAE.storage.logAttempt({
          partId,
          paper: CAE.marking.skillOf(partId),
          mode: opts.mode || 'practice',
          score: res.score,
          total: res.total,
          pctScore: U().pct(res.score, res.total),
        });
        resultsHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (forced) toast('Time — answers submitted automatically.', 'info');
      }
    }
  }

  CAE.ui = {
    showView, onLeaveExercise, toast, modal, confirm, spinner, errorBox,
    optionGroup, gapInput, selectInput, renderGappedText, instructionsBox,
    wordCounter, animateNumber, progress, sticky, transcript, resultsPanel,
    runPart,
  };
})();
