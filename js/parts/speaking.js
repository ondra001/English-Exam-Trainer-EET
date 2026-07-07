/* CAE Ace — Speaking (spk).
 * Tips-only module: static exam-craft teaching content for the four Speaking
 * parts, plus AI-generated task prompts the user rehearses aloud on their own.
 * Per spec there is NO simulated examiner/candidate dialogue anywhere here.
 */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const el = (...args) => CAE.util.el(...args);
  const ROMAN = ['I', 'II', 'III', 'IV'];

  /* ── Static teaching content (authored, not model-generated) ──────────── */

  const PARTS_CONTENT = [
    {
      part: 1,
      name: 'Interview',
      chips: ['≈ 2 minutes', 'You ↔ examiner', 'No preparation time'],
      format:
        'The interlocutor asks you and your partner personal questions in turn — '
        + 'home town, work or study, free time, plans, experiences. You speak to the '
        + 'examiner, not to each other, and there is no thinking time.',
      examiner: [
        ['Grammar & Vocabulary', 'accurate everyday structures and precise, natural word choice — varied tenses, nothing that sounds memorised.'],
        ['Discourse Management', 'developed, relevant answers: two or three connected sentences, not one word and not a ramble.'],
        ['Pronunciation', 'clear, easy-to-follow speech with natural stress and intonation from your very first answer.'],
        ['Interactive Communication', 'you listen to the actual question and answer it directly, developing your reply without needing prompts.'],
        ['Global Achievement', 'you sound relaxed and natural talking about familiar topics at your level.'],
      ],
      tips: [
        'Extend every answer: statement → reason → example. Aim for two or three sentences — never a single word.',
        'Don’t recite a rehearsed self-introduction. Examiners are trained to spot memorised speeches, and they cap your marks.',
        'Show range naturally: “I’ve been living…”, “I used to…”, “I’m hoping to…” — three tenses in one answer is easy points.',
        'No experience of the topic? Say so and speculate anyway (“I’ve never tried it, but I imagine…”) — never fall silent.',
        'Answer the question you were actually asked first, then add your personal angle.',
        'Treat it as a warm-up you control: friendly energy genuinely improves your intonation score.',
      ],
      phraseGroups: [
        { label: 'Extending an answer', phrases: [
          'What I particularly enjoy about it is…',
          'The main reason I got into it was…',
          '…which is why I try to make time for it every week.',
        ] },
        { label: 'Buying time naturally', phrases: [
          'That’s an interesting question — I’d probably say…',
          'Funnily enough, I was thinking about this only the other day.',
        ] },
        { label: 'Experience & habits', phrases: [
          'I’ve been doing it on and off for about five years now.',
          'It’s not something I’ve ever tried, but I’d imagine it’s quite demanding.',
        ] },
        { label: 'Plans & hopes', phrases: [
          'Ideally, I’d like to end up working in…',
          'If everything goes to plan, I’ll be… by this time next year.',
        ] },
      ],
      practiceIntro:
        'Generate interview-style questions, then answer each one aloud in three or '
        + 'four full sentences — with a reason and an example every time.',
    },
    {
      part: 2,
      name: 'Long turn',
      chips: ['1 minute each', 'Two of three pictures', '30-second follow-up'],
      format:
        'You receive three pictures and two printed questions. Alone, you compare TWO '
        + 'of the three pictures and answer both questions, speaking for a full minute. '
        + 'Then you listen to your partner’s long turn about their pictures — and answer '
        + 'a 30-second follow-up question about them.',
      examiner: [
        ['Grammar & Vocabulary', 'comparative structures and a range of speculative language — “might”, “could”, “seems to”, “as though”.'],
        ['Discourse Management', 'an organised, connected minute: comparison first, both questions answered, no long pauses or list-like description.'],
        ['Pronunciation', 'sentence stress that highlights your contrasts (“whereas THIS one…”) rather than a flat delivery.'],
        ['Interactive Communication', 'in the follow-up you respond promptly and relevantly to your partner’s pictures — so listen while they speak.'],
        ['Global Achievement', 'the whole task completed within the minute: two pictures compared, both printed questions addressed.'],
      ],
      tips: [
        'Speculate, don’t describe. “They might be celebrating a hard-won victory” scores; “There are some people smiling” doesn’t.',
        'Compare throughout — never do picture one, then picture two. Use “whereas”, “while” and “both… but…” from your first sentence.',
        'Answer BOTH printed questions — they are the task. Signal it clearly: “As for why they might be doing this…”',
        'Pick the two pictures you have most to say about within the first couple of seconds, then commit.',
        'Keep talking the full minute. Finished early? Extend: how the people feel, what happens next, which situation you’d prefer.',
        'For your 30-second follow-up on your partner’s pictures, one developed idea beats three fragments.',
      ],
      phraseGroups: [
        { label: 'Comparing & contrasting', phrases: [
          'Both pictures show people…, but whereas the first…, the second…',
          'The most striking difference between them is…',
          'In contrast to the group in the first picture, …',
        ] },
        { label: 'Speculating', phrases: [
          'They could well be…',
          'She looks as though she’s about to…',
          'Judging by their expressions, I’d say…',
          'It’s hard to tell, but presumably…',
        ] },
        { label: 'Managing the minute', phrases: [
          'As for the second question, …',
          'What both situations seem to have in common is…',
        ] },
      ],
      practiceIntro:
        'The app can’t show photographs, so each prompt describes a picture pair in words '
        + 'plus the two questions. Visualise the scenes and speak for a full, timed minute per prompt.',
    },
    {
      part: 3,
      name: 'Collaborative task',
      chips: ['≈ 3 minutes', 'With your partner', 'Written prompts + decision'],
      format:
        'You and your partner discuss written prompts arranged around a central question '
        + '(about two minutes). Then the examiner asks a decision question, and you have '
        + 'one minute to try to reach a decision together.',
      examiner: [
        ['Grammar & Vocabulary', 'the language of opinion, evaluation and hypothesis, plus precise vocabulary for the topic.'],
        ['Discourse Management', 'contributions that link to what your partner just said, so the discussion develops instead of restarting.'],
        ['Pronunciation', 'intonation that signals interest, doubt and polite disagreement — it carries real meaning here.'],
        ['Interactive Communication', 'the key criterion in this part: initiating, responding, inviting your partner in, negotiating towards the decision.'],
        ['Global Achievement', 'a genuine two-way discussion sustained for the full task, ending with a real attempt at a decision.'],
      ],
      tips: [
        'Don’t race through every prompt — exploring two or three in depth scores better than a shallow tour of all five.',
        'React before you add: agree with, challenge or extend your partner’s point first, then bring in your own idea.',
        'Ask your partner genuine questions. Interactive Communication is a marked criterion, and inviting them in earns you marks.',
        'In the decision minute you don’t have to agree — negotiating and justifying matter more than the verdict itself.',
        'Disagree like a diplomat: concede something first (“That’s true up to a point…”), then counter.',
        'Balance the airtime. If your partner dries up, draw them back in — rescuing the conversation raises your score.',
      ],
      phraseGroups: [
        { label: 'Involving your partner', phrases: [
          'Shall we start with this one?',
          'What’s your take on that?',
          'Do you agree, or do you see it differently?',
        ] },
        { label: 'Agreeing & disagreeing politely', phrases: [
          'That’s a fair point, although I’d add that…',
          'I see what you mean, but wouldn’t you say…?',
          'Absolutely — and what’s more, …',
        ] },
        { label: 'Building on ideas', phrases: [
          'Following on from what you just said, …',
          'That actually ties in with this next prompt.',
        ] },
        { label: 'Reaching a decision', phrases: [
          'So, if we had to pick just one, …',
          'We seem to be leaning towards…, shall we settle on that?',
        ] },
      ],
      practiceIntro:
        'Rehearsing alone? Argue both sides aloud: respond to each prompt, then challenge '
        + 'your own point as if you were the partner — it drills the same language.',
    },
    {
      part: 4,
      name: 'Discussion',
      chips: ['≈ 5 minutes', 'Examiner-led', 'Abstract questions'],
      format:
        'The examiner asks broader, more abstract questions that develop the Part 3 themes. '
        + 'Questions may go to you, to your partner or to both of you — and you’re welcome '
        + 'to respond to each other’s answers.',
      examiner: [
        ['Grammar & Vocabulary', 'hypothetical and abstract language: conditionals, hedging (“arguably”, “to some extent”), nuanced adjectives.'],
        ['Discourse Management', 'fully developed arguments — position, justification, example, concession — organised on the fly.'],
        ['Pronunciation', 'clarity sustained through longer and more complex turns.'],
        ['Interactive Communication', 'taking natural opportunities to respond to your partner’s ideas, not only the examiner’s questions.'],
        ['Global Achievement', 'the part that most stretches you: thinking aloud about abstract issues with confidence.'],
      ],
      tips: [
        'Every answer = opinion + justification + example. “It depends” on its own is a wasted turn.',
        'Use concession to sound C2: “Admittedly…, but on balance I’d still argue…”',
        'Take a breath before hard questions — a thoughtful lead-in (“That’s quite a complex issue…”) beats a panicked silence.',
        'Join in (politely) on questions addressed to your partner: “Could I add something there?” — examiners want to see it.',
        'Lift the Part 3 ideas to the abstract level — society, the future, principles — rather than recycling your earlier points word for word.',
        'No opinion? Build one out loud. You’re marked on your language, not your convictions.',
      ],
      phraseGroups: [
        { label: 'Giving considered opinions', phrases: [
          'I’m inclined to think that…',
          'My gut feeling is that…, though I can see the counter-argument.',
        ] },
        { label: 'Conceding & countering', phrases: [
          'Admittedly…, but on balance…',
          'While it’s true that…, we shouldn’t overlook…',
        ] },
        { label: 'Hypothesising', phrases: [
          'If this trend continues, we may well see…',
          'Were that to happen, the consequences could be far-reaching.',
        ] },
        { label: 'Joining the discussion', phrases: [
          'Could I come in here?',
          'Just to pick up on that point, …',
        ] },
        { label: 'Buying thinking time', phrases: [
          'That’s not something I’ve given much thought to — but off the top of my head, I’d say…',
        ] },
      ],
      practiceIntro:
        'Answer each question aloud with an opinion, a justification and an example. '
        + 'Aim for 30–45 seconds per answer, and record yourself if you can.',
    },
  ];

  /* ── Renderers ─────────────────────────────────────────────────────────── */

  function renderIntroCard() {
    return el('section', { class: 'card card--open spk-intro', data: { paper: 'speaking' } },
      el('p', { class: 'overline' }, 'Paper 4 · About 15 minutes · Taken in pairs'),
      el('h2', { class: 'ink-stroke' }, 'How the Speaking test works'),
      el('p', {},
        'Two examiners sit in: the assessor awards 0–5 for each of four criteria — '
        + 'Grammar & Vocabulary, Discourse Management, Pronunciation and Interactive '
        + 'Communication — and the interlocutor adds a Global Achievement mark. '
        + 'Together these make a mark out of 75, which Cambridge converts to the '
        + 'Cambridge English Scale.'),
      el('p', {},
        'An app can’t examine your speaking, so your dashboard estimate is based on '
        + 'the other three papers only. What it can do: teach you the exam-craft below, '
        + 'hand you the phrases strong candidates reach for, and generate fresh task '
        + 'prompts to rehearse out loud — ideally recording yourself and listening back.'),
      el('p', { class: 'muted small' },
        'These are task prompts only — the app never simulates examiner or candidate dialogue.'),
    );
  }

  function renderExaminerWants(rows) {
    return el('ul', { class: 'spk-crit' },
      rows.map(([criterion, note]) =>
        el('li', {},
          el('strong', { class: 'spk-crit-name' }, criterion),
          el('span', { class: 'muted' }, note))));
  }

  function renderPhrases(groups) {
    return el('details', { class: 'spk-phrases' },
      el('summary', {}, 'Phrase bank'),
      groups.map((g) =>
        el('div', { class: 'spk-phrase-group' },
          el('p', { class: 'overline' }, g.label),
          el('div', { class: 'phrase-list' },
            g.phrases.map((p) => el('span', { class: 'chip chip-term' }, p))))));
  }

  function renderPractice(content) {
    const resultsHost = el('div', { attr: { 'aria-live': 'polite' } });
    const btn = el('button', {
      class: 'btn btn-inset',
      type: 'button',
      on: { click: load },
    }, 'Generate fresh prompts');

    function load() {
      btn.disabled = true;
      const spin = CAE.ui.spinner(resultsHost, { label: 'Writing fresh prompts…' });
      CAE.api.generateSpeakingPrompts(content.part)
        .then((res) => {
          spin.stop();
          btn.disabled = false;
          const prompts = (res && Array.isArray(res.prompts) ? res.prompts : [])
            .filter((p) => typeof p === 'string' && p.trim() !== '')
            .map((p) => p.trim());
          if (prompts.length === 0) {
            CAE.ui.errorBox(resultsHost, 'The model returned no usable prompts — please try again.', load);
            return;
          }
          resultsHost.textContent = '';
          resultsHost.appendChild(
            el('ol', { class: 'spk-prompt-list' }, prompts.map((p) => el('li', {}, p))));
          btn.textContent = 'Generate more';
        })
        .catch((err) => {
          spin.stop();
          btn.disabled = false;
          const msg = (err && err.message) || 'Could not generate prompts. Check your connection and try again.';
          CAE.ui.errorBox(resultsHost, msg, load);
        });
    }

    return el('div', { class: 'spk-practice' },
      el('h4', { class: 'spk-h' }, 'Rehearsal prompts'),
      el('p', { class: 'spk-practice-intro' }, content.practiceIntro),
      el('div', { class: 'row' }, btn),
      resultsHost);
  }

  function renderPartCard(content) {
    return el('section', { class: 'card card--open tips-card', data: { paper: 'speaking' } },
      el('header', { class: 'spk-part-head' },
        el('div', {},
          el('p', { class: 'overline' }, 'Speaking · Part ' + content.part),
          el('h3', { class: 'spk-title' }, content.name)),
        el('span', { class: 'spk-part-num', attr: { 'aria-hidden': 'true' } }, ROMAN[content.part - 1] || String(content.part))),
      el('div', { class: 'row spk-chips' },
        content.chips.map((c) => el('span', { class: 'chip chip-meta' }, c))),
      el('p', { class: 'spk-format' }, content.format),
      el('h4', { class: 'spk-h' }, 'What the examiner wants'),
      renderExaminerWants(content.examiner),
      el('h4', { class: 'spk-h' }, 'Exam-craft tips'),
      el('ul', { class: 'spk-tips' }, content.tips.map((t) => el('li', {}, t))),
      renderPhrases(content.phraseGroups),
      renderPractice(content));
  }

  function customRun(host, ctx) {
    void ctx; // tips module behaves identically in every mode
    host.textContent = '';
    host.appendChild(
      el('div', { class: 'stack' },
        renderIntroCard(),
        PARTS_CONTENT.map(renderPartCard)));
  }

  CAE.registerPart({ id: 'spk', customRun });
})();
