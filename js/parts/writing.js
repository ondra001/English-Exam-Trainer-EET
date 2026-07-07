/* CAE Ace — Writing paper (wri1 essay, wri2 choice task).
 * Custom flow: generate task → write with live counter → AI assessment
 * against the four Cambridge criteria → corrections + model answer.
 * Exposes CAE.writingUI.renderAssessment for reuse by the mock test. */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const U = CAE.util;
  const ui = () => CAE.ui;
  const LVL = () => (CAE.levels && CAE.levels.active && CAE.levels.active()) || {
    scale: { min: 142, max: 210, pass: 180, high: 200 }, writing: { min: 220, max: 260 },
  };

  const TYPE_LABEL = {
    essay: 'Essay', email: 'Email', letter: 'Letter',
    proposal: 'Proposal', report: 'Report', review: 'Review',
  };

  const BAND_NAMES = [
    ['content', 'Content'],
    ['communicativeAchievement', 'Communicative Achievement'],
    ['organisation', 'Organisation'],
    ['language', 'Language'],
  ];

  function paragraphs(text, cls) {
    const wrap = U.el('div', { class: cls || 'exercise-text' });
    for (const p of String(text || '').split(/\n\s*\n/)) {
      if (p.trim()) wrap.append(U.el('p', { text: p.trim() }));
    }
    return wrap;
  }

  /* Combined task text sent to the assessor (and shown to the user). */
  function fullTaskText(set) {
    let t = set.prompt || '';
    if (Array.isArray(set.bullets) && set.bullets.length) {
      t += '\nPoints to cover: ' + set.bullets.join('; ') + '.';
    }
    if (set.notes) t += '\n' + set.notes;
    return t.slice(0, 3900);
  }

  function taskCard(set) {
    const { el } = U;
    const card = el('div', { class: 'card' },
      el('div', { class: 'card-title', text: 'Your task' }),
      el('div', { class: 'row' },
        el('h3', { text: set.title || 'Writing task', style: { flex: '1', margin: '0' } }),
        el('span', { class: 'chip', text: TYPE_LABEL[set.taskType] || set.taskType }),
        el('span', { class: 'chip', text: (set.targetWords && set.targetWords.min || LVL().writing.min) + '–' + (set.targetWords && set.targetWords.max || LVL().writing.max) + ' words' }),
      ),
      set.scenario ? el('p', { class: 'muted', text: set.scenario, style: { margin: '10px 0 0' } }) : null,
    );
    const taskBody = el('div', { class: 'wri-task-body' }, el('p', { text: set.prompt || '' }));
    if (Array.isArray(set.bullets) && set.bullets.length) {
      const ul = el('ul');
      for (const b of set.bullets) ul.append(el('li', { text: b }));
      taskBody.append(ul);
    }
    card.append(taskBody);
    if (set.notes) card.append(el('p', { class: 'muted small', text: set.notes, style: { margin: '10px 0 0' } }));
    return card;
  }

  function renderAssessment(a) {
    const { el } = U;
    const grade = CAE.marking.gradeFor(a.estimatedScale);

    const scoreEl = el('span', { class: 'score-big', text: '0' });
    const card = el('div', { class: 'card results-panel' },
      el('div', { class: 'card-title', text: 'Cambridge-style assessment' }),
      el('div', { class: 'score-header' },
        el('div', null,
          scoreEl,
          el('div', { class: 'muted small', text: 'estimated scale score' }),
        ),
        el('span', { class: 'badge ' + (a.estimatedScale >= LVL().scale.pass ? 'good' : 'neutral'), text: grade.label }),
      ),
      el('p', { class: 'muted small', text: 'Bands are 0–5 per criterion, as in the real exam. This is an estimate, not an official mark.' }),
    );
    ui().animateNumber(scoreEl, a.estimatedScale, { from: LVL().scale.min, ms: 900 });

    const grid = el('div', { class: 'bands-grid' });
    for (const [key, name] of BAND_NAMES) {
      const band = Number(a.bands[key]) || 0;
      const filled = Math.max(0, Math.min(5, Math.round(band)));
      const meter = el('div', {
        class: 'notch-meter', role: 'img',
        ariaLabel: name + ': band ' + band + ' of 5',
      });
      for (let i = 0; i < 5; i++) meter.append(el('i', { class: i < filled ? 'on' : null }));
      grid.append(el('div', { class: 'band-row' },
        el('div', { class: 'row', style: { justifyContent: 'space-between' } },
          el('span', { class: 'overline', text: name }),
          el('span', { class: 'band-score' }, String(band), el('span', { class: 'wri-band-of', text: '/5' })),
        ),
        meter,
      ));
    }
    card.append(grid);

    if (a.overallComment) card.append(el('p', { text: a.overallComment }));

    if (Array.isArray(a.strengths) && a.strengths.length) {
      card.append(el('div', { class: 'card-title', text: 'What worked', style: { marginTop: '14px' } }));
      const ul = el('ul', { class: 'wri-strengths' });
      for (const s of a.strengths) {
        ul.append(el('li', null,
          el('span', { class: 'tick-inline', attr: { 'aria-hidden': 'true' } }),
          s,
        ));
      }
      card.append(ul);
    }

    if (Array.isArray(a.corrections) && a.corrections.length) {
      card.append(el('div', { class: 'card-title', text: 'Corrections', style: { marginTop: '14px' } }));
      for (const c of a.corrections) {
        card.append(el('div', { class: 'correction-row' },
          el('div', { class: 'wri-corr-orig', text: c.original }),
          el('div', { class: 'wri-corr-fix', text: c.improved }),
          c.note ? el('div', { class: 'explanation', text: c.note }) : null,
        ));
      }
    }

    if (a.modelAnswer) {
      const d = el('details', null,
        el('summary', { text: 'Model answer (' + LVL().writing.min + '–' + LVL().writing.max + ' words)' }),
        paragraphs(a.modelAnswer),
      );
      card.append(d);
    }
    return card;
  }

  /* ---------- the practice flow ---------- */

  function runWriting(partId, host) {
    const { el, uid, countWords, fmtDateTime, debounce } = U;
    const meta = CAE.prompts.PARTS[partId];
    let chosenType = ''; // wri2 only; '' = surprise me
    let timer = null;

    CAE.ui.onLeaveExercise(() => { if (timer) timer.destroy(); });

    const controls = el('div', { class: 'card' });
    const draftsHost = el('div');
    const workHost = el('div');
    host.replaceChildren(controls, draftsHost, workHost);

    const genBtn = el('button', { class: 'btn btn-primary', on: { click: () => generate() } }, 'Generate task');

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
      controls.append(
        el('div', { class: 'card-title', text: 'Task choice' }),
        el('div', { class: 'row' },
          el('span', { class: 'label', text: 'Task type' }), typeSel, genBtn,
        ),
      );
    } else {
      controls.append(
        el('div', { class: 'card-title', text: 'New task' }),
        el('div', { class: 'row' }, genBtn,
          el('span', { class: 'muted small', text: 'The essay is the compulsory Part 1 task in the real exam.' })),
      );
    }

    renderDrafts();

    function renderDrafts() {
      const drafts = CAE.storage.getDrafts().filter((d) => d.partId === partId);
      draftsHost.replaceChildren();
      if (!drafts.length) return;
      const card = el('div', { class: 'card' }, el('div', { class: 'card-title', text: 'Your drafts' }));
      for (const d of drafts) {
        card.append(el('div', { class: 'wri-draft-row' },
          el('span', { class: 'wri-draft-info' },
            el('span', { class: 'wri-draft-type', text: TYPE_LABEL[d.taskType] || d.taskType || 'Task' }),
            el('span', { class: 'wri-draft-meta', text: countWords(d.text || '') + ' words · ' + fmtDateTime(d.updated) }),
          ),
          d.feedback ? el('span', { class: 'badge good' },
            el('span', { class: 'tick-inline', attr: { 'aria-hidden': 'true' } }),
            'assessed') : null,
          el('button', { class: 'btn btn-sm', on: { click: () => resumeDraft(d) } }, 'Resume'),
          el('button', { class: 'btn btn-danger btn-sm', on: { click: async () => {
            if (await CAE.ui.confirm('Delete this draft?', { danger: true })) {
              CAE.storage.deleteDraft(d.id);
              renderDrafts();
            }
          } } }, 'Delete'),
        ));
      }
      draftsHost.append(card);
    }

    function resumeDraft(d) {
      let set = null;
      try { set = JSON.parse(d.taskPrompt); } catch (e) { /* legacy/corrupt draft */ }
      if (!set) { CAE.ui.toast('This draft\'s task could not be restored.', 'error'); return; }
      renderEditor(set, d);
    }

    async function generate() {
      const existing = workHost.querySelector('textarea');
      if (existing && existing.value.trim()) {
        const ok = await CAE.ui.confirm('Start a new task? Unsaved text in the current editor will be lost (drafts are kept).');
        if (!ok) return;
      }
      genBtn.disabled = true;
      const spin = CAE.ui.spinner(workHost, { label: 'Writing a fresh task…' });
      try {
        const set = await CAE.api.generateSet(partId, chosenType ? { taskType: chosenType } : undefined);
        spin.stop();
        renderEditor(set, null);
      } catch (err) {
        spin.stop();
        CAE.ui.errorBox(workHost, err && err.message, () => generate());
      }
      genBtn.disabled = false;
    }

    function renderEditor(set, draft) {
      if (timer) { timer.destroy(); timer = null; }
      const draftId = draft ? draft.id : uid();
      let assessed = false;

      const ta = el('textarea', { class: 'textarea', placeholder: 'Write your answer here…',
        ariaLabel: 'Your answer', attr: { spellcheck: 'true' } });
      if (draft && draft.text) ta.value = draft.text;

      const counter = CAE.ui.wordCounter(ta, {
        min: (set.targetWords && set.targetWords.min) || LVL().writing.min,
        max: (set.targetWords && set.targetWords.max) || LVL().writing.max,
      });
      const savedChip = el('span', { class: 'chip hidden', text: '' });
      const timerSlot = el('span');

      const saveDraft = (silent) => {
        CAE.storage.saveDraft({
          id: draftId, partId, taskType: set.taskType,
          taskPrompt: JSON.stringify(set), text: ta.value,
          feedback: draft && draft.feedback ? draft.feedback : undefined,
        });
        savedChip.textContent = 'Draft saved ✓';
        savedChip.classList.remove('hidden');
        if (!silent) CAE.ui.toast('Draft saved', 'success');
        renderDrafts();
      };
      ta.addEventListener('input', debounce(() => { if (ta.value.trim()) saveDraft(true); }, 2000));

      const assessHost = el('div');
      const saveBtn = el('button', { class: 'btn', on: { click: () => saveDraft(false) } }, 'Save draft');
      const submitBtn = el('button', { class: 'btn btn-primary', on: { click: () => submit(false) } }, 'Submit for assessment');

      const editorCard = el('div', { class: 'card' },
        el('div', { class: 'card-title', text: 'Answer sheet' }),
        el('div', { class: 'wri-editor-head' }, counter, timerSlot, savedChip),
        ta,
      );

      workHost.replaceChildren(taskCard(set), editorCard, assessHost);
      const bar = CAE.ui.sticky(workHost, [saveBtn, submitBtn]);

      const cfg = CAE.timer.resolveConfig(partId);
      if (cfg) {
        timer = CAE.timer.create({ seconds: cfg.seconds, strict: cfg.strict, label: 'Writing',
          onExpire: () => submit(true) });
        timerSlot.replaceChildren(timer.element);
        timer.start();
      }

      async function submit(forced) {
        if (assessed) return;
        const words = countWords(ta.value);
        if (!ta.value.trim()) { CAE.ui.toast('Write your answer first.', 'error'); return; }
        if (!forced && words < 100) {
          const ok = await CAE.ui.confirm('Only ' + words + ' words so far (target ' + LVL().writing.min + '–' + LVL().writing.max + '). Submit anyway?');
          if (!ok) return;
        }
        submitBtn.disabled = true;
        saveBtn.disabled = true;
        const spin = CAE.ui.spinner(assessHost, { label: 'Marking against the Cambridge criteria…' });
        let assessment;
        try {
          assessment = await CAE.api.assessWriting({
            taskType: set.taskType,
            taskPrompt: fullTaskText(set),
            answer: ta.value.slice(0, 5900),
          });
        } catch (err) {
          spin.stop();
          CAE.ui.errorBox(assessHost, err && err.message, () => { submitBtn.disabled = false; saveBtn.disabled = false; submit(forced); });
          return;
        }
        spin.stop();
        assessed = true;
        if (timer) timer.stop();
        bar.remove();
        ta.disabled = true;

        assessHost.replaceChildren(renderAssessment(assessment));
        assessHost.append(el('div', { class: 'row', style: { margin: '14px 0' } },
          el('span', { class: 'badge good' },
            el('span', { class: 'tick-inline', attr: { 'aria-hidden': 'true' } }),
            'Saved to history'),
          el('button', { class: 'btn btn-primary', on: { click: () => generate() } }, 'New task'),
        ));

        const bands = assessment.bands;
        const bandSum = BAND_NAMES.reduce((s, [k]) => s + (Number(bands[k]) || 0), 0);
        CAE.storage.logAttempt({
          partId, paper: 'writing', mode: 'practice',
          score: bandSum, total: 20,
          pctScore: Math.round(bandSum / 20 * 100),
          scale: assessment.estimatedScale,
          extra: { bands },
        });
        draft = { id: draftId, feedback: assessment };
        CAE.storage.saveDraft({
          id: draftId, partId, taskType: set.taskType,
          taskPrompt: JSON.stringify(set), text: ta.value, feedback: assessment,
        });
        renderDrafts();
        assessHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (forced) CAE.ui.toast('Time — your answer was submitted automatically.');
      }
    }
  }

  CAE.registerPart({ id: 'wri1', customRun: (host) => runWriting('wri1', host) });
  CAE.registerPart({ id: 'wri2', customRun: (host) => runWriting('wri2', host) });

  CAE.writingUI = { renderAssessment, taskCard, fullTaskText };
})();
