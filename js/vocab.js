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
  const WOTD_C1 = [
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

  // Level-appropriate rotations for the other CEFR levels (A1 = basic everyday
  // words … C2 = sophisticated/literary lexis) so the Word of the Day matches
  // the level the learner has chosen.
  const WOTD_BY_LEVEL_EXTRA = {
    a1: [
      { word: 'a family', pos: 'noun', definition: 'a group of people who are related, like parents and children', example: 'My family has four people.', synonyms: [], collocations: ['a big family', 'a happy family'] },
      { word: 'a house', pos: 'noun', definition: 'a building where people live', example: 'We live in a small house.', synonyms: ['a home'], collocations: ['a new house', 'a big house'] },
      { word: 'to eat', pos: 'verb', definition: 'to put food in your mouth', example: 'I eat bread in the morning.', synonyms: [], collocations: ['eat lunch', 'eat dinner'] },
      { word: 'happy', pos: 'adjective', definition: 'feeling good and glad', example: 'She is happy today.', synonyms: ['glad'], collocations: ['very happy', 'a happy day'] },
      { word: 'to buy', pos: 'verb', definition: 'to get something and pay money for it', example: 'I want to buy some milk.', synonyms: [], collocations: ['buy food', 'buy a ticket'] },
      { word: 'water', pos: 'noun', definition: 'the clear drink that has no colour', example: 'Can I have some water, please?', synonyms: [], collocations: ['cold water', 'drink water'] },
      { word: 'big', pos: 'adjective', definition: 'large in size', example: 'That is a big dog.', synonyms: ['large'], collocations: ['a big house', 'a big city'] },
      { word: 'to help', pos: 'verb', definition: 'to do something good for someone', example: 'Can you help me, please?', synonyms: [], collocations: ['help someone', 'help at home'] },
      { word: 'a friend', pos: 'noun', definition: 'a person you like and know well', example: 'Tom is my best friend.', synonyms: [], collocations: ['a good friend', 'a best friend'] },
      { word: 'tired', pos: 'adjective', definition: 'needing to sleep or rest', example: 'I am tired, so I want to sleep.', synonyms: [], collocations: ['very tired', 'feel tired'] },
      { word: 'to go', pos: 'verb', definition: 'to move to another place', example: 'I go to school every day.', synonyms: [], collocations: ['go home', 'go to work'] },
      { word: 'a dog', pos: 'noun', definition: 'an animal that many people keep at home', example: 'The dog is very happy.', synonyms: [], collocations: ['a big dog', 'a small dog'] },
      { word: 'to like', pos: 'verb', definition: 'to think something is nice', example: 'I like apples.', synonyms: [], collocations: ['like food', 'like music'] },
      { word: 'cold', pos: 'adjective', definition: 'not hot; having a low temperature', example: 'The water is cold.', synonyms: [], collocations: ['cold water', 'a cold day'] },
      { word: 'a book', pos: 'noun', definition: 'pages with words that you read', example: 'I read a book in bed.', synonyms: [], collocations: ['a good book', 'read a book'] },
      { word: 'quickly', pos: 'adverb', definition: 'in a fast way', example: 'He runs quickly.', synonyms: ['fast'], collocations: ['walk quickly', 'run quickly'] },
    ],
    a2: [
      { word: 'to give up', pos: 'phrasal verb', definition: 'to stop trying to do something', example: 'The work was hard, but I did not give up.', synonyms: ['to quit'], collocations: ['give up smoking', 'never give up'] },
      { word: 'to look after', pos: 'phrasal verb', definition: 'to take care of someone or something', example: 'I look after my little brother after school.', synonyms: ['to care for'], collocations: ['look after children', 'look after a pet'] },
      { word: 'a journey', pos: 'noun', definition: 'a trip from one place to another', example: 'The journey to the city takes two hours.', synonyms: ['a trip'], collocations: ['a long journey', 'a train journey'] },
      { word: 'boring', pos: 'adjective', definition: 'not interesting or fun', example: 'The film was really boring.', synonyms: ['dull'], collocations: ['a boring film', 'a boring job'] },
      { word: 'to travel', pos: 'verb', definition: 'to go from one place to another, often far', example: 'I like to travel by train.', synonyms: [], collocations: ['travel abroad', 'travel by bus'] },
      { word: 'a feeling', pos: 'noun', definition: 'something you feel inside, like happiness or fear', example: 'I had a good feeling about the test.', synonyms: ['an emotion'], collocations: ['a strange feeling', 'a good feeling'] },
      { word: 'to worry', pos: 'verb', definition: 'to think that something bad may happen', example: 'Do not worry, everything is fine.', synonyms: [], collocations: ['worry about money', 'do not worry'] },
      { word: 'excited', pos: 'adjective', definition: 'very happy because something good is going to happen', example: 'The children are excited about the party.', synonyms: ['thrilled'], collocations: ['excited about', 'really excited'] },
      { word: 'a hobby', pos: 'noun', definition: 'something you enjoy doing in your free time', example: 'My hobby is painting.', synonyms: ['a pastime'], collocations: ['a favourite hobby', 'have a hobby'] },
      { word: 'to enjoy', pos: 'verb', definition: 'to get pleasure from something', example: 'I enjoy playing football with my friends.', synonyms: ['to love'], collocations: ['enjoy a meal', 'enjoy yourself'] },
      { word: 'to wake up', pos: 'phrasal verb', definition: 'to stop sleeping', example: 'I wake up at seven every morning.', synonyms: [], collocations: ['wake up early', 'wake up late'] },
      { word: 'weather', pos: 'noun', definition: 'the sun, rain, wind and temperature outside', example: 'The weather is sunny today.', synonyms: [], collocations: ['good weather', 'bad weather'] },
      { word: 'friendly', pos: 'adjective', definition: 'kind and nice to other people', example: 'Our new neighbour is very friendly.', synonyms: ['kind'], collocations: ['a friendly person', 'very friendly'] },
      { word: 'usually', pos: 'adverb', definition: 'most of the time; normally', example: 'I usually have coffee in the morning.', synonyms: ['normally'], collocations: ['usually do', 'usually go'] },
      { word: 'a ticket', pos: 'noun', definition: 'a small paper you buy to travel or enter a place', example: 'I bought a ticket for the concert.', synonyms: [], collocations: ['a train ticket', 'buy a ticket'] },
      { word: 'to arrive', pos: 'verb', definition: 'to get to a place', example: 'We arrive in London at noon.', synonyms: ['to reach'], collocations: ['arrive late', 'arrive home'] },
    ],
    b1: [
      { word: 'to sort out', pos: 'phrasal verb', definition: 'to deal with a problem and find a solution', example: 'I need to sort out my travel plans this week.', synonyms: ['to resolve', 'to fix'], collocations: ['sort out a problem', 'sort out the details'] },
      { word: 'to point out', pos: 'phrasal verb', definition: 'to tell someone about a fact they did not notice', example: 'She pointed out that the shop was already closed.', synonyms: ['to mention', 'to note'], collocations: ['point out a mistake', 'point out that'] },
      { word: 'reliable', pos: 'adjective', definition: 'that you can trust to work well or do the right thing', example: 'He is a reliable worker who is never late.', synonyms: ['dependable', 'trustworthy'], collocations: ['a reliable car', 'a reliable source'] },
      { word: 'to afford', pos: 'verb', definition: 'to have enough money to buy or do something', example: 'We cannot afford a new car this year.', synonyms: [], collocations: ['cannot afford', 'afford to buy'] },
      { word: 'an advantage', pos: 'noun', definition: 'something that helps you or is useful', example: 'Speaking two languages is a real advantage at work.', synonyms: ['a benefit'], collocations: ['a big advantage', 'take advantage of'] },
      { word: 'to deal with', pos: 'phrasal verb', definition: 'to take action to manage a problem or situation', example: 'It can be hard to deal with an angry customer.', synonyms: ['to handle', 'to manage'], collocations: ['deal with a problem', 'deal with people'] },
      { word: 'confident', pos: 'adjective', definition: 'sure that you can do something well', example: 'She felt confident before the interview.', synonyms: ['self-assured'], collocations: ['feel confident', 'confident about'] },
      { word: 'to improve', pos: 'verb', definition: 'to make something better or become better', example: 'I want to improve my English this year.', synonyms: ['to enhance', 'to develop'], collocations: ['improve your skills', 'improve quickly'] },
      { word: 'a solution', pos: 'noun', definition: 'a way to solve a problem', example: 'We finally found a solution to the problem.', synonyms: ['an answer'], collocations: ['a simple solution', 'find a solution'] },
      { word: 'eventually', pos: 'adverb', definition: 'in the end, after some time', example: 'The train was late, but it eventually arrived.', synonyms: ['finally', 'in the end'], collocations: ['eventually happen', 'eventually decide'] },
      { word: 'to realise', pos: 'verb', definition: 'to suddenly understand or notice something', example: 'I realised that I had left my keys at home.', synonyms: ['to understand'], collocations: ['realise a mistake', 'suddenly realise'] },
      { word: 'an opportunity', pos: 'noun', definition: 'a chance to do something good or useful', example: 'This job is a great opportunity for me.', synonyms: ['a chance'], collocations: ['a great opportunity', 'miss an opportunity'] },
      { word: 'to complain', pos: 'verb', definition: 'to say that you are not happy about something', example: 'He complained about the cold food.', synonyms: ['to grumble'], collocations: ['complain about', 'complain to the manager'] },
      { word: 'convenient', pos: 'adjective', definition: 'easy to use or good for your needs', example: 'The hotel is in a convenient place near the station.', synonyms: ['handy'], collocations: ['a convenient time', 'a convenient location'] },
      { word: 'to look forward to', pos: 'phrasal verb', definition: 'to feel happy about something that will happen', example: 'I am looking forward to the weekend.', synonyms: ['to anticipate'], collocations: ['look forward to seeing you', 'look forward to the holiday'] },
      { word: 'responsible', pos: 'adjective', definition: 'having the duty to take care of something', example: 'She is responsible for the whole team.', synonyms: ['accountable'], collocations: ['responsible for', 'a responsible person'] },
    ],
    b2: [
      { word: 'to enhance', pos: 'verb', definition: 'to improve the quality or value of something', example: 'Good lighting can really enhance a photograph.', synonyms: ['to improve', 'to boost'], collocations: ['enhance the experience', 'enhance performance'] },
      { word: 'a drawback', pos: 'noun', definition: 'a disadvantage or negative part of something', example: 'The main drawback of the plan is the high cost.', synonyms: ['a disadvantage', 'a downside'], collocations: ['a major drawback', 'the main drawback'] },
      { word: 'feasible', pos: 'adjective', definition: 'possible to do successfully; realistic', example: 'It is not feasible to finish the project by Friday.', synonyms: ['viable', 'realistic'], collocations: ['a feasible plan', 'technically feasible'] },
      { word: 'to come across', pos: 'phrasal verb', definition: 'to find or meet something by chance', example: 'I came across an old photo while cleaning.', synonyms: ['to encounter', 'to stumble upon'], collocations: ['come across a problem', 'come across as friendly'] },
      { word: 'to tackle', pos: 'verb', definition: 'to make a determined effort to deal with a problem', example: 'The government promised to tackle unemployment.', synonyms: ['to address', 'to confront'], collocations: ['tackle an issue', 'tackle a problem'] },
      { word: 'thorough', pos: 'adjective', definition: 'done carefully and completely, with attention to detail', example: 'The police carried out a thorough investigation.', synonyms: ['comprehensive', 'meticulous'], collocations: ['a thorough check', 'a thorough understanding'] },
      { word: 'a hassle', pos: 'noun', definition: 'something annoying that causes trouble or effort', example: 'Parking in the city centre is such a hassle.', synonyms: ['a nuisance', 'a bother'], collocations: ['a real hassle', 'too much hassle'] },
      { word: 'to cope', pos: 'verb', definition: 'to deal successfully with a difficult situation', example: 'She copes well with stress at work.', synonyms: ['to manage', 'to handle'], collocations: ['cope with pressure', 'cope with change'] },
      { word: 'inevitable', pos: 'adjective', definition: 'certain to happen and impossible to avoid', example: 'With so little rain, a water shortage was inevitable.', synonyms: ['unavoidable', 'certain'], collocations: ['an inevitable result', 'seem inevitable'] },
      { word: 'to hit the nail on the head', pos: 'idiom', definition: 'to describe exactly what is causing a situation or problem', example: 'You hit the nail on the head when you said she was overworked.', synonyms: ['to be spot on'], collocations: ['really hit the nail on the head'] },
      { word: 'significant', pos: 'adjective', definition: 'large or important enough to have an effect', example: 'There has been a significant rise in fuel prices.', synonyms: ['considerable', 'notable'], collocations: ['a significant increase', 'a significant impact'] },
      { word: 'to undermine', pos: 'verb', definition: 'to gradually weaken something or someone', example: 'Constant criticism can undermine a child’s confidence.', synonyms: ['to weaken', 'to erode'], collocations: ['undermine confidence', 'undermine authority'] },
      { word: 'a setback', pos: 'noun', definition: 'a problem that delays or stops progress', example: 'Losing the contract was a serious setback for the firm.', synonyms: ['a hitch', 'an obstacle'], collocations: ['a major setback', 'suffer a setback'] },
      { word: 'to bite the bullet', pos: 'idiom', definition: 'to force yourself to do something difficult or unpleasant', example: 'I finally bit the bullet and booked the dentist.', synonyms: ['to grit your teeth'], collocations: ['just bite the bullet'] },
      { word: 'versatile', pos: 'adjective', definition: 'able to be used or to work in many different ways', example: 'A smartphone is a remarkably versatile device.', synonyms: ['adaptable', 'flexible'], collocations: ['a versatile tool', 'a versatile player'] },
      { word: 'to grasp', pos: 'verb', definition: 'to understand something, especially something difficult', example: 'It took me a while to grasp the main idea.', synonyms: ['to comprehend', 'to understand'], collocations: ['grasp a concept', 'grasp the meaning'] },
    ],
    c2: [
      { word: 'to obfuscate', pos: 'verb', definition: 'to deliberately make something unclear or hard to understand', example: 'The report seemed designed to obfuscate rather than inform.', synonyms: ['to obscure', 'to muddle'], collocations: ['obfuscate the truth', 'obfuscate the issue'] },
      { word: 'a panacea', pos: 'noun', definition: 'a supposed remedy or solution for all problems', example: 'Technology is often wrongly presented as a panacea for every social ill.', synonyms: ['a cure-all', 'a universal remedy'], collocations: ['no panacea', 'a panacea for'] },
      { word: 'quixotic', pos: 'adjective', definition: 'extremely idealistic and impractical', example: 'His quixotic scheme to end all traffic was doomed from the start.', synonyms: ['idealistic', 'impractical'], collocations: ['a quixotic quest', 'a quixotic venture'] },
      { word: 'to inure', pos: 'verb', definition: 'to make someone used to something unpleasant over time', example: 'Years at the front had inured the soldiers to danger.', synonyms: ['to harden', 'to habituate'], collocations: ['inure someone to hardship'] },
      { word: 'ineffable', pos: 'adjective', definition: 'too great or beautiful to be expressed in words', example: 'She gazed at the mountains with a sense of ineffable wonder.', synonyms: ['indescribable', 'inexpressible'], collocations: ['ineffable joy', 'ineffable beauty'] },
      { word: 'to vitiate', pos: 'verb', definition: 'to spoil or reduce the effectiveness of something', example: 'A single false assumption can vitiate the entire argument.', synonyms: ['to impair', 'to undermine'], collocations: ['vitiate a contract', 'vitiate an argument'] },
      { word: 'perfunctory', pos: 'adjective', definition: 'done with little care or interest, merely as a duty', example: 'He gave the documents only a perfunctory glance.', synonyms: ['cursory', 'superficial'], collocations: ['a perfunctory nod', 'perfunctory manner'] },
      { word: 'an anathema', pos: 'noun', definition: 'something that is strongly disliked or detested', example: 'Censorship is anathema to a free press.', synonyms: ['a bane', 'an abomination'], collocations: ['anathema to', 'utter anathema'] },
      { word: 'to inveigh', pos: 'verb', definition: 'to protest or complain about something with great force', example: 'The columnist inveighed against the new tax for weeks.', synonyms: ['to rail', 'to fulminate'], collocations: ['inveigh against'] },
      { word: 'sanguine', pos: 'adjective', definition: 'cheerfully optimistic, even in a difficult situation', example: 'Despite the losses, she remained sanguine about the future.', synonyms: ['optimistic', 'hopeful'], collocations: ['sanguine about', 'remain sanguine'] },
      { word: 'to obviate', pos: 'verb', definition: 'to remove a difficulty so that dealing with it is no longer necessary', example: 'A clear contract can obviate the need for costly disputes.', synonyms: ['to preclude', 'to forestall'], collocations: ['obviate the need', 'obviate a problem'] },
      { word: 'a shibboleth', pos: 'noun', definition: 'an old belief or custom now regarded as outdated or meaningless', example: 'The party clung to the tired shibboleths of a bygone era.', synonyms: ['a truism', 'a cliché'], collocations: ['a political shibboleth', 'an empty shibboleth'] },
      { word: 'mendacious', pos: 'adjective', definition: 'not telling the truth; habitually lying', example: 'The witness gave a thoroughly mendacious account of events.', synonyms: ['untruthful', 'deceitful'], collocations: ['a mendacious claim', 'mendacious propaganda'] },
      { word: 'to coruscate', pos: 'verb', definition: 'to sparkle or flash brilliantly, often of wit or light', example: 'Her prose coruscates with sly, glittering humour.', synonyms: ['to sparkle', 'to scintillate'], collocations: ['coruscating wit', 'coruscating light'] },
      { word: 'lugubrious', pos: 'adjective', definition: 'looking or sounding sad and gloomy, often exaggeratedly so', example: 'The butler answered the door with a lugubrious expression.', synonyms: ['mournful', 'doleful'], collocations: ['a lugubrious tone', 'a lugubrious face'] },
      { word: 'to gainsay', pos: 'verb', definition: 'to deny or contradict a fact or statement', example: 'There is no gainsaying the scale of the achievement.', synonyms: ['to contradict', 'to dispute'], collocations: ['cannot gainsay', 'no gainsaying'] },
    ],
  };

  const WOTD_BY_LEVEL = Object.assign({ c1: WOTD_C1 }, WOTD_BY_LEVEL_EXTRA);

  function activeWotdList() {
    const id = (CAE.levels && CAE.levels.currentId && CAE.levels.currentId()) || 'c1';
    const list = WOTD_BY_LEVEL[id];
    return (Array.isArray(list) && list.length) ? list : WOTD_C1;
  }

  function todayIndex(len) {
    const days = Math.floor(Date.now() / 86400000);
    return days % (len || 1);
  }

  /* Dashboard card: one hard word per day, rate it, hard ones join the deck. */
  function wotdCard() {
    const list = activeWotdList();
    const w = list[todayIndex(list.length)];
    const today = CAE.util.todayKey();
    const levelId = (CAE.levels && CAE.levels.currentId && CAE.levels.currentId()) || 'c1';
    // Re-read on every render — the rating buttons re-render this card. The
    // rating is tied to the level, so switching level shows a fresh word.
    const currentRating = () => {
      const state = CAE.storage.get('wotd', {});
      return (state.day === today && state.level === levelId) ? state.rating : null;
    };

    const card = el('div', { class: 'card wotd-card' });
    const body = el('div');

    const rate = (rating) => {
      CAE.storage.set('wotd', { day: today, level: levelId, rating });
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
