/* CAE Ace — vocabulary builder (CAE.vocab).
 * AI-generated hard C1/C2 words saved to a personal deck, studied with
 * Leitner-style spaced-repetition flashcards. All model text is untrusted
 * and rendered via CAE.util.el()/textContent only. */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const { el } = CAE.util;

  // Days until the next review, indexed by Leitner box (1–5).
  const BOX_DAYS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 };
  const DAY = 24 * 60 * 60 * 1000;

  const dueWords = () => CAE.storage.getVocab().filter((w) => (w.due || 0) <= Date.now());

  /* What each user wants to see on word rows and flashcard backs. */
  const VIEW_FIELDS = [
    ['pos', 'part of speech'],
    ['definition', 'definition'],
    ['example', 'example'],
    ['synonyms', 'synonyms'],
    ['collocations', 'collocations'],
  ];
  const VIEW_DEFAULTS = { pos: true, definition: true, example: true, synonyms: true, collocations: true };
  const viewPrefs = () => Object.assign({}, VIEW_DEFAULTS, CAE.storage.get('vocabView', {}));
  const saveViewPref = (key, val) => {
    const prefs = viewPrefs();
    prefs[key] = val;
    CAE.storage.set('vocabView', prefs);
  };

  function boxMeter(box) {
    const m = el('span', { class: 'vb-boxes', title: 'Memory level ' + box + ' of 5', attr: { 'aria-label': 'Memory level ' + box + ' of 5' } });
    for (let i = 1; i <= 5; i++) m.append(el('i', { class: i <= box ? 'on' : null }));
    return m;
  }

  function chipRow(label, items) {
    if (!items || !items.length) return null;
    return el('div', { class: 'row vb-chips' },
      el('span', { class: 'overline', text: label }),
      items.map((s) => el('span', { class: 'chip chip-term', text: String(s) })));
  }

  /* ---------------- deck list ---------------- */

  function wordRow(w, onChange) {
    const show = viewPrefs();
    return el('div', { class: 'vocab-row' },
      el('div', { class: 'vocab-row-head' },
        el('strong', { class: 'vb-word', text: w.word }),
        el('span', { class: 'vocab-row-pos' },
          (show.pos && w.pos) ? el('span', { class: 'chip chip-term', text: w.pos }) : null),
        el('div', { class: 'row vocab-row-tools' },
          boxMeter(w.box || 1),
          el('button', { class: 'btn btn-ghost btn-sm', ariaLabel: 'Remove ' + w.word, on: { click: () => {
            CAE.storage.removeVocabWord(w.id);
            CAE.ui.toast('Removed “' + w.word + '”');
            onChange();
          } } }, '✕'),
        ),
      ),
      show.definition ? el('p', { class: 'vb-def', text: w.definition }) : null,
      (show.example && w.example) ? el('p', { class: 'vb-example', text: w.example }) : null,
      show.synonyms ? chipRow('Synonyms', w.synonyms) : null,
      show.collocations ? chipRow('Collocations', w.collocations) : null,
    );
  }

  /* ---------------- flashcard study ---------------- */

  function study(host, backToDeck) {
    let queue = dueWords();
    let extra = false;
    if (!queue.length) {
      queue = CAE.storage.getVocab().slice();
      extra = true; // nothing due — free review round, boxes still update
    }
    queue = CAE.util.shuffle(queue).slice(0, 20);
    const total = queue.length;
    let index = 0;
    let knew = 0;

    const render = () => {
      host.replaceChildren();
      if (index >= total) { finish(); return; }
      const w = queue[index];
      let flipped = false;

      const front = el('div', { class: 'fc-face fc-front' },
        el('span', { class: 'overline', text: extra ? 'Extra practice' : 'Review' }),
        el('div', { class: 'fc-word', text: w.word }),
        w.pos ? el('span', { class: 'chip chip-term', text: w.pos }) : null,
        el('p', { class: 'muted small', text: 'Can you define it and use it in a sentence?' }),
      );
      const show = viewPrefs();
      const back = el('div', { class: 'fc-face fc-back' },
        el('div', { class: 'fc-word fc-word-sm', text: w.word }),
        el('p', { class: 'vb-def', text: w.definition }),
        (show.example && w.example) ? el('p', { class: 'vb-example', text: w.example }) : null,
        show.synonyms ? chipRow('Synonyms', w.synonyms) : null,
        show.collocations ? chipRow('Collocations', w.collocations) : null,
      );
      const card = el('div', { class: 'flashcard', role: 'button', tabindex: 0, ariaLabel: 'Flashcard: ' + w.word + '. Activate to reveal the definition.' }, front, back);

      const revealBtn = el('button', { class: 'btn btn-primary', on: { click: () => flip() } }, 'Reveal');
      const actions = el('div', { class: 'row', style: { justifyContent: 'center', marginTop: '16px' } }, revealBtn);

      const answer = (correct) => {
        const box = Math.max(1, Math.min(5, correct ? (w.box || 1) + 1 : 1));
        CAE.storage.updateVocabWord(w.id, {
          box,
          due: Date.now() + (BOX_DAYS[box] || 1) * DAY,
          seen: (w.seen || 0) + 1,
          right: (w.right || 0) + (correct ? 1 : 0),
        });
        if (correct) knew += 1;
        index += 1;
        render();
      };

      function flip() {
        if (flipped) return;
        flipped = true;
        card.classList.add('flipped');
        actions.replaceChildren(
          el('button', { class: 'btn', on: { click: () => answer(false) } }, '✗ Still learning'),
          el('button', { class: 'btn btn-primary', on: { click: () => answer(true) } }, '✓ Knew it'),
        );
      }

      card.addEventListener('click', flip);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
      });

      host.append(
        el('div', { class: 'fc-thread', attr: { 'aria-hidden': 'true' } },
          el('span', { class: 'fc-bead', style: { left: ((index + 1) / total * 100) + '%' } }, '◆')),
        el('p', { class: 'fc-folio', text: 'Card ' + (index + 1) + ' of ' + total }),
        el('div', { class: 'flashcard-scene' }, card),
        actions,
        el('div', { class: 'row', style: { justifyContent: 'center', marginTop: '10px' } },
          el('button', { class: 'btn btn-ghost btn-sm', on: { click: backToDeck } }, 'End session')),
      );
    };

    const finish = () => {
      const pct = total ? Math.round(knew / total * 100) : 0;
      host.replaceChildren(el('div', { class: 'card card--sheet', style: { textAlign: 'center', padding: '40px 24px' } },
        el('div', { class: 'overline', text: 'Session complete' }),
        el('div', { class: 'score-big', text: knew + ' / ' + total }),
        el('p', { class: 'muted', text: pct >= 80 ? 'Excellent recall — these are sticking.' : pct >= 50 ? 'Good work — the tricky ones will come round again sooner.' : 'No problem — missed words return tomorrow. Repetition is the whole trick.' }),
        el('div', { class: 'row', style: { justifyContent: 'center', marginTop: '14px' } },
          el('button', { class: 'btn btn-primary', on: { click: backToDeck } }, 'Back to my words'),
        ),
      ));
    };

    render();
  }

  /* ---------------- main view ---------------- */

  function render(host) {
    host.replaceChildren();
    const deck = CAE.storage.getVocab();
    const due = dueWords().length;
    const mastered = deck.filter((w) => (w.box || 1) >= 5).length;

    host.append(
      el('h1', { class: 'ink-stroke', text: 'Vocabulary builder' }),
      el('p', { class: 'muted', text: 'The hard words that separate B2 from C1 — collect them, then let spaced-repetition flashcards make them permanent.' }),
    );

    // One serif count line under the deck heading replaces the old stat tiles.
    const num = (n) => el('span', { class: 'num', text: String(n) });
    const countLine = el('p', { class: 'vb-countline' },
      num(deck.length), deck.length === 1 ? ' word' : ' words', ' · ',
      num(due), ' due today · ',
      num(mastered), ' mastered');

    const content = el('div');
    const rerender = () => render(host);

    const studyBtn = el('button', {
      class: 'btn btn-primary', disabled: deck.length ? undefined : true,
      on: { click: () => {
        host.replaceChildren();
        study(host, rerender);
      } },
    }, due ? 'Study flashcards (' + due + ' due)' : 'Review flashcards');

    const genBtn = el('button', { class: 'btn', on: { click: async () => {
      genBtn.disabled = true;
      const spin = CAE.ui.spinner(content, { label: 'Hunting for hard words…' });
      try {
        const res = await CAE.api.generateVocabWords({
          count: 10,
          avoid: CAE.storage.getVocab().map((w) => w.word).slice(0, 80),
        });
        spin.stop();
        const added = CAE.storage.addVocabWords(res.words, 'generated');
        CAE.ui.toast(added ? added + ' new word' + (added === 1 ? '' : 's') + ' added to your deck' : 'No new words — your deck already has them all!', 'success');
        rerender();
      } catch (err) {
        spin.stop();
        genBtn.disabled = false;
        CAE.ui.errorBox(content, err && err.message, () => rerender());
      }
    } } }, '+ Generate 10 new words');

    const addInput = el('input', { class: 'input', placeholder: 'Add a word you met… e.g. “to scupper”',
      ariaLabel: 'Add a word', attr: { autocapitalize: 'off', autocomplete: 'off' }, style: { maxWidth: '300px' } });
    const addBtn = el('button', { class: 'btn btn-sm', on: { click: async () => {
      const word = addInput.value.trim();
      if (!word) { addInput.focus(); return; }
      addBtn.disabled = true;
      addBtn.textContent = 'Defining…';
      try {
        const res = await CAE.api.generateVocabWords({ word });
        const added = CAE.storage.addVocabWords(res.words, 'manual');
        CAE.ui.toast(added ? '“' + res.words[0].word + '” added with its definition' : 'That word is already in your deck', added ? 'success' : 'info');
        rerender();
      } catch (err) {
        addBtn.disabled = false;
        addBtn.textContent = 'Add & define';
        CAE.ui.toast(err && err.message ? err.message : 'Could not define that word.', 'error');
      }
    } } }, 'Add & define');
    addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBtn.click(); });

    host.append(
      el('div', { class: 'card' },
        el('div', { class: 'row' }, studyBtn, genBtn),
        el('div', { class: 'row', style: { marginTop: '12px' } }, addInput, addBtn),
        el('p', { class: 'muted small', text: 'Fresh words are AI-generated at real C1/C2 level and never repeat what is already in your deck. Reviews come back on a spaced schedule: 1, 2, 4, 7, then 14 days.', style: { margin: '10px 0 0' } }),
      ),
      content);

    if (!deck.length) {
      content.append(el('div', { class: 'empty-state' },
        el('p', { text: 'Your deck is empty.' }),
        el('p', { class: 'small', text: 'Generate your first ten hard words, or add one you met while reading.' })));
      return;
    }

    const listCard = el('div', { class: 'card card--open' });
    const listHost = el('div');
    let folder = 'all';
    const search = el('input', { class: 'input', placeholder: 'Search your words…', ariaLabel: 'Search words',
      on: { input: () => fill() } });

    const fill = () => {
      listHost.replaceChildren();
      const q = search.value.trim().toLowerCase();
      const shown = CAE.storage.getVocab()
        .filter((w) => folder === 'all' || (w.source || 'generated') === folder)
        .filter((w) => !q
          || w.word.toLowerCase().includes(q)
          || (w.definition || '').toLowerCase().includes(q));
      if (!shown.length) {
        listHost.append(el('p', { class: 'muted small', text: q ? 'No words match that search.' : 'Nothing in this folder yet.' }));
        return;
      }
      shown.forEach((w) => listHost.append(wordRow(w, rerender)));
    };

    // Folder chips: only show folders that actually contain words.
    const counts = {};
    deck.forEach((w) => { const s = w.source || 'generated'; counts[s] = (counts[s] || 0) + 1; });
    const folderRow = el('div', { class: 'row vb-folders' });
    [['all', 'All (' + deck.length + ')'], ['generated', 'Fresh from AI'],
     ['practice', 'From practice'], ['wotd', 'Word of the day'], ['manual', 'Added by me']]
      .forEach(([id, label]) => {
        if (id !== 'all' && !counts[id]) return;
        const chip = el('button', {
          class: 'chip chip-tag vb-folder' + (folder === id ? ' active' : ''), type: 'button',
          text: id === 'all' ? label : label + ' (' + counts[id] + ')',
          on: { click: () => {
            folder = id;
            folderRow.querySelectorAll('.vb-folder').forEach((c) => c.classList.toggle('active', c === chip));
            fill();
          } },
        });
        folderRow.append(chip);
      });

    listCard.append(
      el('h3', { class: 'section-head' }, 'My words',
        el('span', { class: 'sh-note', text: 'spaced repetition deck' })),
      countLine);
    // Per-user display settings: show exactly the fields this learner wants.
    const showRow = el('div', { class: 'row vb-folders vb-showrow' },
      el('span', { class: 'overline', text: 'Show' }));
    VIEW_FIELDS.forEach(([key, label]) => {
      const chip = el('button', {
        class: 'chip vb-folder' + (viewPrefs()[key] ? ' active' : ''), type: 'button', text: label,
        attr: { 'aria-pressed': String(!!viewPrefs()[key]) },
        on: { click: () => {
          const next = !viewPrefs()[key];
          saveViewPref(key, next);
          chip.classList.toggle('active', next);
          chip.setAttribute('aria-pressed', String(next));
          fill();
        } },
      });
      showRow.append(chip);
    });

    if (folderRow.children.length > 1) listCard.append(folderRow);
    listCard.append(showRow);
    if (deck.length > 6) listCard.append(el('div', { class: 'field', style: { marginTop: '10px' } }, search));
    listCard.append(listHost);
    fill();
    content.append(listCard);
  }

  /* ---------------- word of the day ---------------- */

  // A curated rotation of genuinely hard C1/C2 items — offline, free, daily.
  const WOTD = [
    { word: 'to exacerbate', pos: 'verb', definition: 'to make a bad situation even worse', example: 'Cutting the bus service would only exacerbate rural isolation.', synonyms: ['aggravate', 'worsen'], collocations: ['exacerbate the problem'] },
    { word: 'a watershed', pos: 'noun', definition: 'an event marking a decisive turning point', example: 'The ruling was a watershed in environmental law.', synonyms: ['turning point', 'milestone'], collocations: ['a watershed moment'] },
    { word: 'to relinquish', pos: 'verb', definition: 'to give up power, control or possession, often reluctantly', example: 'He refused to relinquish control of the family firm.', synonyms: ['surrender', 'cede'], collocations: ['relinquish control'] },
    { word: 'pertinent', pos: 'adjective', definition: 'directly relevant to the matter being discussed', example: 'She asked several pertinent questions about the budget.', synonyms: ['relevant', 'apposite'], collocations: ['pertinent to the discussion'] },
    { word: 'to curtail', pos: 'verb', definition: 'to reduce or limit something', example: 'New rules curtailed the press office\u2019s influence.', synonyms: ['restrict', 'cut back'], collocations: ['curtail spending'] },
    { word: 'a caveat', pos: 'noun', definition: 'a warning that particular conditions or limits apply', example: 'The study\u2019s findings come with one important caveat.', synonyms: ['proviso', 'qualification'], collocations: ['with the caveat that'] },
    { word: 'to bolster', pos: 'verb', definition: 'to support or strengthen something', example: 'The award bolstered her confidence enormously.', synonyms: ['reinforce', 'shore up'], collocations: ['bolster confidence', 'bolster the economy'] },
    { word: 'tenuous', pos: 'adjective', definition: 'very weak, thin or uncertain', example: 'The link between the two events is tenuous at best.', synonyms: ['flimsy', 'shaky'], collocations: ['a tenuous link'] },
    { word: 'to galvanise', pos: 'verb', definition: 'to shock or excite someone into taking action', example: 'The report galvanised the council into repairing the bridge.', synonyms: ['spur', 'jolt'], collocations: ['galvanise support', 'galvanise into action'] },
    { word: 'an impasse', pos: 'noun', definition: 'a situation where no progress is possible', example: 'Negotiations reached an impasse over pay.', synonyms: ['deadlock', 'stalemate'], collocations: ['reach an impasse', 'break the impasse'] },
    { word: 'to preclude', pos: 'verb', definition: 'to make something impossible in advance', example: 'His age did not preclude him from competing.', synonyms: ['rule out', 'prevent'], collocations: ['preclude the possibility'] },
    { word: 'ubiquity', pos: 'noun', definition: 'the state of being everywhere at once', example: 'The ubiquity of screens has changed childhood.', synonyms: ['omnipresence', 'pervasiveness'], collocations: ['the ubiquity of'] },
    { word: 'to entrench', pos: 'verb', definition: 'to establish something so firmly that change is difficult', example: 'The policy risks entrenching inequality.', synonyms: ['embed', 'cement'], collocations: ['deeply entrenched'] },
    { word: 'a paucity', pos: 'noun', definition: 'a lack or scarcity of something (formal)', example: 'There is a paucity of reliable data on the topic.', synonyms: ['scarcity', 'dearth'], collocations: ['a paucity of evidence'] },
    { word: 'to underscore', pos: 'verb', definition: 'to emphasise the importance of something', example: 'The delay underscores the need for reform.', synonyms: ['highlight', 'emphasise'], collocations: ['underscore the importance'] },
    { word: 'intransigent', pos: 'adjective', definition: 'refusing to change one\u2019s position or compromise', example: 'Both sides remained intransigent throughout the talks.', synonyms: ['unyielding', 'inflexible'], collocations: ['an intransigent stance'] },
    { word: 'to disseminate', pos: 'verb', definition: 'to spread information widely', example: 'The findings were disseminated through open-access journals.', synonyms: ['circulate', 'spread'], collocations: ['disseminate information'] },
    { word: 'a harbinger', pos: 'noun', definition: 'a sign that something (often unwelcome) is coming', example: 'Falling bookings were a harbinger of the crisis to come.', synonyms: ['omen', 'forerunner'], collocations: ['a harbinger of change'] },
    { word: 'to flounder', pos: 'verb', definition: 'to struggle helplessly or be in serious difficulty', example: 'Without a clear brief, the team floundered for weeks.', synonyms: ['struggle', 'stumble'], collocations: ['flounder in difficulties'] },
    { word: 'salient', pos: 'adjective', definition: 'most noticeable or important', example: 'She summarised the salient points in two minutes.', synonyms: ['key', 'striking'], collocations: ['the salient features'] },
    { word: 'to renege on', pos: 'phrasal verb', definition: 'to break a promise or agreement', example: 'The company reneged on its pledge to cut emissions.', synonyms: ['go back on', 'break'], collocations: ['renege on a promise'] },
    { word: 'a quandary', pos: 'noun', definition: 'a state of uncertainty about what to do', example: 'The offer left her in a genuine quandary.', synonyms: ['dilemma', 'predicament'], collocations: ['in a quandary'] },
    { word: 'to permeate', pos: 'verb', definition: 'to spread through every part of something', example: 'A sense of optimism permeated the whole conference.', synonyms: ['pervade', 'suffuse'], collocations: ['permeate every aspect'] },
    { word: 'ostensibly', pos: 'adverb', definition: 'according to what is claimed, though perhaps not truly', example: 'He left ostensibly to study, though nobody quite believed it.', synonyms: ['apparently', 'on the face of it'], collocations: ['ostensibly neutral'] },
    { word: 'to grapple with', pos: 'phrasal verb', definition: 'to struggle to deal with a difficult problem', example: 'Regulators are still grappling with the new technology.', synonyms: ['wrestle with', 'contend with'], collocations: ['grapple with the issue'] },
    { word: 'a linchpin', pos: 'noun', definition: 'the person or thing holding a system together', example: 'She is the linchpin of the whole operation.', synonyms: ['cornerstone', 'mainstay'], collocations: ['the linchpin of'] },
    { word: 'unequivocal', pos: 'adjective', definition: 'completely clear, leaving no doubt', example: 'The answer was an unequivocal no.', synonyms: ['unambiguous', 'categorical'], collocations: ['unequivocal support'] },
    { word: 'to squander', pos: 'verb', definition: 'to waste something valuable carelessly', example: 'They squandered a two-goal lead in ten minutes.', synonyms: ['waste', 'fritter away'], collocations: ['squander an opportunity'] },
    { word: 'a groundswell', pos: 'noun', definition: 'a sudden growth of public feeling or support', example: 'A groundswell of local support saved the library.', synonyms: ['surge', 'upsurge'], collocations: ['a groundswell of support'] },
    { word: 'to vindicate', pos: 'verb', definition: 'to prove that someone or something was right after doubt', example: 'The results vindicated her unpopular decision.', synonyms: ['justify', 'exonerate'], collocations: ['fully vindicated'] },
    { word: 'perfunctory', pos: 'adjective', definition: 'done quickly, without care or real interest', example: 'He gave the report a perfunctory glance and signed it.', synonyms: ['cursory', 'token'], collocations: ['a perfunctory nod'] },
    { word: 'to eke out', pos: 'phrasal verb', definition: 'to make something last by using it carefully; to obtain with difficulty', example: 'They eked out a narrow victory in the final minutes.', synonyms: ['scrape'], collocations: ['eke out a living'] },
    { word: 'an anomaly', pos: 'noun', definition: 'something that differs from what is normal or expected', example: 'The warm December was a statistical anomaly.', synonyms: ['irregularity', 'outlier'], collocations: ['a statistical anomaly'] },
    { word: 'to attenuate', pos: 'verb', definition: 'to make something weaker or less intense (formal)', example: 'Thick walls attenuate the traffic noise considerably.', synonyms: ['weaken', 'diminish'], collocations: ['attenuate the effect'] },
    { word: 'moot', pos: 'adjective', definition: 'debatable, or no longer relevant to decide', example: 'Whether it was legal is now a moot point.', synonyms: ['debatable', 'academic'], collocations: ['a moot point'] },
    { word: 'to forestall', pos: 'verb', definition: 'to prevent something by acting first', example: 'The statement was issued to forestall speculation.', synonyms: ['pre-empt', 'head off'], collocations: ['forestall criticism'] },
    { word: 'a stalwart', pos: 'noun', definition: 'a loyal, hard-working supporter of long standing', example: 'He is a stalwart of the local drama society.', synonyms: ['loyalist', 'mainstay'], collocations: ['a party stalwart'] },
    { word: 'insidious', pos: 'adjective', definition: 'spreading harm gradually and unnoticed', example: 'Burnout is insidious: it arrives one skipped lunch at a time.', synonyms: ['stealthy', 'creeping'], collocations: ['an insidious effect'] },
    { word: 'to capitulate', pos: 'verb', definition: 'to stop resisting and accept defeat or demands', example: 'The board capitulated to shareholder pressure.', synonyms: ['give in', 'yield'], collocations: ['capitulate to demands'] },
    { word: 'happenstance', pos: 'noun', definition: 'chance, especially when producing a good result', example: 'They met through sheer happenstance at a conference.', synonyms: ['coincidence', 'chance'], collocations: ['by happenstance'] },
  ];

  function todayIndex() {
    const days = Math.floor(Date.now() / 86400000);
    return days % WOTD.length;
  }

  /* Dashboard card: one hard word per day, rate it, hard ones join the deck. */
  function wotdCard() {
    const w = WOTD[todayIndex()];
    const today = CAE.util.todayKey();
    // Re-read on every render — the rating buttons re-render this card.
    const currentRating = () => {
      const state = CAE.storage.get('wotd', {});
      return state.day === today ? state.rating : null;
    };

    const card = el('div', { class: 'card wotd-card' });
    const body = el('div');

    const rate = (rating) => {
      CAE.storage.set('wotd', { day: today, rating });
      if (rating !== 'easy') {
        const added = CAE.storage.addVocabWords([w], 'wotd');
        // A hard word starts at the bottom of the ladder; a tricky one midway.
        if (added) {
          const entry = CAE.storage.getVocab().find((x) => x.word === w.word);
          if (entry && rating === 'tricky') CAE.storage.updateVocabWord(entry.id, { box: 2 });
        }
      }
      renderBody();
    };

    const renderBody = () => {
      const rated = currentRating();
      body.replaceChildren(
        el('div', { class: 'row', style: { alignItems: 'baseline' } },
          el('span', { class: 'card-title', style: { margin: '0' }, text: 'Word of the day' }),
          el('span', { style: { flex: '1' } }),
          el('a', { class: 'text-link small', href: '#/vocab', text: 'My vocabulary' }),
        ),
        el('div', { class: 'row', style: { alignItems: 'baseline', gap: '12px' } },
          el('div', { class: 'fc-word', style: { fontSize: '1.7rem', margin: '6px 0 2px' }, text: w.word }),
          el('span', { class: 'chip chip-term', text: w.pos })),
        el('p', { class: 'vb-def', text: w.definition, style: { margin: '8px 0 2px' } }),
        el('p', { class: 'vb-example', text: w.example }),
        rated
          ? el('div', { class: 'row', style: { marginTop: '10px' } },
              el('span', { class: 'badge ' + (rated === 'easy' ? 'good' : 'neutral'),
                text: rated === 'easy' ? 'You knew this one \u2014 see you tomorrow' :
                  rated === 'tricky' ? 'Marked tricky \u2014 saved to your deck' :
                    'Marked hard \u2014 saved to your deck for review' }))
          : el('div', { class: 'row', style: { marginTop: '10px' } },
              el('span', { class: 'muted small', text: 'Did you know it?' }),
              el('button', { class: 'btn btn-sm', on: { click: () => rate('easy') } }, 'Knew it'),
              el('button', { class: 'btn btn-sm', on: { click: () => rate('tricky') } }, 'Tricky'),
              el('button', { class: 'btn btn-sm', on: { click: () => rate('hard') } }, 'Hard \u2014 save it'),
            ),
      );
    };
    renderBody();
    card.append(body);
    return card;
  }

  /* ---------------- long-press any word to collect it ---------------- */

  function wordAtPoint(x, y) {
    let node = null;
    let offset = 0;
    if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(x, y);
      if (r) { node = r.startContainer; offset = r.startOffset; }
    } else if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      if (p) { node = p.offsetNode; offset = p.offset; }
    }
    if (!node || node.nodeType !== 3) return null;
    const text = node.textContent || '';
    const isW = (c) => !!c && /[A-Za-z\u00C0-\u024F\u2019'-]/.test(c);
    let i = offset;
    if (!isW(text[i]) && i > 0 && isW(text[i - 1])) i -= 1;
    if (!isW(text[i])) return null;
    let a = i;
    let b = i;
    while (a > 0 && isW(text[a - 1])) a -= 1;
    while (b < text.length && isW(text[b])) b += 1;
    const word = text.slice(a, b).replace(/^[\u2019'-]+|[\u2019'-]+$/g, '');
    if (word.length < 3 || word.length > 40 || /\d/.test(word)) return null;
    return word;
  }

  function initLongPress() {
    let timer = null;
    let sx = 0;
    let sy = 0;
    let popEl = null;
    let suppressMenu = false;
    let swallowClick = false;

    const closePop = () => {
      if (!popEl) return;
      popEl.remove();
      popEl = null;
      document.removeEventListener('click', onDoc, true);
      window.removeEventListener('scroll', closePop, true);
    };
    const onDoc = (e) => { if (popEl && !popEl.contains(e.target)) closePop(); };

    const showPop = (word, x, y) => {
      closePop();
      const already = CAE.storage.getVocab()
        .some((w) => w.word.toLowerCase().replace(/^to /, '') === word.toLowerCase());
      const btn = el('button', { class: 'gap-pop-opt', type: 'button', on: { click: async () => {
        btn.disabled = true;
        btn.replaceChildren(el('span', { text: 'Defining\u2026' }));
        try {
          const res = await CAE.api.generateVocabWords({ word });
          const added = CAE.storage.addVocabWords(res.words, 'practice');
          CAE.ui.toast(added ? '\u201c' + res.words[0].word + '\u201d saved to your vocabulary' : 'Already in your deck', added ? 'success' : 'info');
        } catch (err) {
          CAE.ui.toast(err && err.message ? err.message : 'Could not save that word.', 'error');
        }
        closePop();
      } } }, el('span', { class: 'option-letter', text: '+' }), el('span', { text: 'Add to vocabulary' }));

      popEl = el('div', { class: 'gap-pop', role: 'menu' },
        el('div', { class: 'gap-pop-head', text: '\u201c' + word + '\u201d' }),
        already ? el('p', { class: 'muted small', style: { padding: '0 8px 6px' }, text: 'Already in your deck.' }) : btn,
      );
      document.body.appendChild(popEl);
      const pr = popEl.getBoundingClientRect();
      popEl.style.left = Math.min(Math.max(8, x - 20), window.innerWidth - pr.width - 8) + 'px';
      popEl.style.top = (y + pr.height + 16 > window.innerHeight ? y - pr.height - 12 : y + 16) + 'px';
      setTimeout(() => {
        document.addEventListener('click', onDoc, true);
        window.addEventListener('scroll', closePop, true);
      }, 0);
    };

    const cancel = () => { clearTimeout(timer); timer = null; };

    document.addEventListener('pointerdown', (e) => {
      cancel();
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.target.closest('input, textarea, select, button, a, .flashcard, .gap-num, .gap-pop, .modal, .option, [role="button"]')) return;
      if (!e.target.closest('.view.active')) return;
      sx = e.clientX;
      sy = e.clientY;
      timer = setTimeout(() => {
        const word = wordAtPoint(sx, sy);
        if (!word) return;
        suppressMenu = true;
        swallowClick = true; // the finger/mouse release fires a click — ignore it
        setTimeout(() => { swallowClick = false; }, 800);
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) { /* optional */ } }
        showPop(word, sx, sy);
      }, 550);
    }, true);
    document.addEventListener('pointermove', (e) => {
      if (timer && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) cancel();
    }, true);
    document.addEventListener('pointerup', cancel, true);
    document.addEventListener('click', (e) => {
      if (swallowClick) {
        swallowClick = false;
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
    document.addEventListener('pointercancel', cancel, true);
    // Long-press on touch devices fires a context menu — swallow it once.
    document.addEventListener('contextmenu', (e) => {
      if (suppressMenu) { e.preventDefault(); suppressMenu = false; }
    }, true);
    window.addEventListener('hashchange', closePop);
  }

  CAE.vocab = { render, wotdCard, initLongPress };
})();
