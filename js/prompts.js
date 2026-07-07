/* CAE Ace — part metadata, JSON schemas, prompt builders (CAE.prompts).
 *
 * UMD: this file is loaded by the browser app AND require()d by
 * backend/server.js, so the prompt builders exist in exactly one place.
 * It must not reference window/document/CAE anywhere except the final
 * attachment lines. */
(function (factory) {
  'use strict';
  const mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  if (typeof window !== 'undefined') {
    window.CAE = window.CAE || {};
    window.CAE.prompts = mod;
  }
})(function () {
  'use strict';

  /* Duplicated from config.js on purpose: Node must be able to load this
   * file standalone. */
  const TOPICS = [
    'science', 'culture', 'work', 'environment', 'technology',
    'travel', 'psychology', 'history', 'arts',
  ];
  const ANGLES = [
    'an unexpected discovery', 'a controversial trend', 'everyday life',
    'a personal journey', 'the near future', 'a surprising tradition',
    'city versus countryside', 'learning a skill', 'a famous failure',
    'behind the scenes', 'a changing industry', 'an unusual community',
    'the science behind it', 'a revival of something old', 'crossing cultures',
  ];

  const DIFFICULTY = {
    standard: 'challenging but fair, calibrated so a strong C1 candidate scores about 80%',
    hard: 'top-of-C1: subtle distractors and lower-frequency lexis, calibrated so a strong C1 candidate scores about 65%',
    c2: 'a C2 stretch: C2-level vocabulary, idiom and inference, calibrated so a strong C1 candidate scores about 55%',
  };

  const WRI2_TYPES = ['email', 'letter', 'proposal', 'report', 'review'];

  /* The prompt-relevant fields of a CEFR level pack (see js/levels.js). The app
   * passes the ACTIVE level in as opts.level; this default keeps the builders
   * (and the Node backend, which require()s this file) working as C1 Advanced
   * when no level is supplied. */
  const DEFAULT_LEVEL = {
    examWriter: 'Cambridge C1 Advanced (CAE)',
    cefr: 'C1', below: 'B2', aspire: 'C2',
    writing: { min: 220, max: 260 },
    scale: { min: 142, max: 210, pass: 180, high: 200 },
    difficulty: DIFFICULTY,
  };

  /* ---------- validation helpers ---------- */

  const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
  const isNum = (v) => typeof v === 'number' && isFinite(v);

  function gapNumbers(text) {
    const found = [];
    const re = /\[\[(\d+)\]\]/g;
    let m;
    while ((m = re.exec(String(text || ''))) !== null) found.push(Number(m[1]));
    return found;
  }

  function hasGaps(text, count) {
    const nums = gapNumbers(text);
    for (let i = 1; i <= count; i++) if (nums.indexOf(i) === -1) return false;
    return nums.length === count;
  }

  function checkOptions(options, letters) {
    if (!options || typeof options !== 'object') return false;
    return letters.every((l) => isStr(options[l]));
  }

  function checkMcq(questions, count, letters) {
    if (!Array.isArray(questions) || questions.length !== count) {
      return 'expected ' + count + ' questions';
    }
    for (const q of questions) {
      if (!q || !isNum(q.number)) return 'question missing number';
      if (!checkOptions(q.options, letters)) return 'question ' + q.number + ' has incomplete options';
      if (letters.indexOf(q.answer) === -1) return 'question ' + q.number + ' has an invalid answer letter';
      if (!isStr(q.explanation)) return 'question ' + q.number + ' is missing an explanation';
    }
    return null;
  }

  function checkScript(script) {
    if (!Array.isArray(script) || !script.length) return 'missing script';
    for (const seg of script) {
      if (!seg || !isStr(seg.speaker) || !isStr(seg.text)) return 'script segments need speaker and text';
    }
    return null;
  }

  const LETTERS = 'ABCDEFGH'.split('');

  /* ---------- shared schema fragments ---------- */

  const EXPLAIN_NOTE = 'Every explanation must teach: say briefly why the answer is right and, where useful, why the tempting distractors are wrong.';

  /* ---------- part definitions ---------- */

  const PARTS = {};

  function definePart(def) {
    PARTS[def.id] = def;
  }

  definePart({
    id: 'rue1', paper: 'rue', skill: 'reading', number: 1,
    name: 'Multiple-choice cloze', label: 'Reading & UoE · Part 1', icon: '🧩',
    desc: 'A short text with 8 gaps — pick the word (A–D) that fits each one. Tests vocabulary, collocations, phrasal verbs and linkers.',
    questionCount: 8, officialMinutes: 8, maxTokens: 8000, markPerQuestion: 1,
    schemaHint: `{
  "instructions": "string",
  "title": "string",
  "text": "a ~150-word text with the gaps written literally as [[1]] [[2]] ... [[8]]",
  "questions": [
    { "number": 1, "options": { "A": "word", "B": "word", "C": "word", "D": "word" },
      "answer": "B", "explanation": "why B collocates and the others do not" }
  ]
}`,
    format: 'Write one coherent ~150-word text with a title and exactly 8 numbered gaps marked literally [[1]] to [[8]]. For each gap give four options A–D of the same word class where exactly one is correct; the other three must be plausible near-synonyms that fail on collocation, dependent preposition, phrasal-verb meaning or register. Cover a mix of: collocations, phrasal verbs, fixed phrases, linkers, shades of meaning.',
    validate(set) {
      if (!set || typeof set !== 'object') return 'not a JSON object';
      if (!isStr(set.instructions) || !isStr(set.text)) return 'missing instructions or text';
      if (!hasGaps(set.text, 8)) return 'text must contain gaps [[1]]..[[8]]';
      return checkMcq(set.questions, 8, ['A', 'B', 'C', 'D']);
    },
  });

  definePart({
    id: 'rue2', paper: 'rue', skill: 'uoe', number: 2,
    name: 'Open cloze', label: 'Reading & UoE · Part 2', icon: '✏️',
    desc: 'A short text with 8 gaps — type one word in each. Tests grammar and function words.',
    questionCount: 8, officialMinutes: 8, maxTokens: 7000, markPerQuestion: 1,
    schemaHint: `{
  "instructions": "string",
  "title": "string",
  "text": "a ~150-word text with gaps [[1]] ... [[8]]",
  "answers": [
    { "number": 1, "answer": "which", "accepted": ["that"], "explanation": "string" }
  ]
}`,
    format: 'Write one coherent ~150-word text with a title and exactly 8 gaps marked [[1]] to [[8]]. Each gap takes exactly ONE word, and the answers must be mostly grammar/function words: articles, prepositions, pronouns, relative pronouns, auxiliaries, conjunctions, quantifiers, words in fixed phrases. List every legitimate alternative single-word answer in "accepted" (empty array if the answer is unique).',
    validate(set) {
      if (!set || typeof set !== 'object') return 'not a JSON object';
      if (!isStr(set.instructions) || !isStr(set.text)) return 'missing instructions or text';
      if (!hasGaps(set.text, 8)) return 'text must contain gaps [[1]]..[[8]]';
      if (!Array.isArray(set.answers) || set.answers.length !== 8) return 'expected 8 answers';
      for (const a of set.answers) {
        if (!a || !isNum(a.number) || !isStr(a.answer) || !isStr(a.explanation)) return 'answers need number, answer, explanation';
      }
      return null;
    },
  });

  definePart({
    id: 'rue3', paper: 'rue', skill: 'uoe', number: 3,
    name: 'Word formation', label: 'Reading & UoE · Part 3', icon: '🔤',
    desc: 'A short text with 8 gaps — transform the CAPITALISED root word to fit each one.',
    questionCount: 8, officialMinutes: 8, maxTokens: 7000, markPerQuestion: 1,
    schemaHint: `{
  "instructions": "string",
  "title": "string",
  "text": "a ~150-word text with gaps [[1]] ... [[8]]",
  "answers": [
    { "number": 1, "root": "DECIDE", "answer": "decisive", "accepted": [], "explanation": "string" }
  ]
}`,
    format: 'Write one coherent ~150-word text with a title and exactly 8 gaps marked [[1]] to [[8]]. For each gap give a root word in CAPITALS that must be transformed to fit (noun/verb/adjective/adverb changes, prefixes and suffixes, plurals, compounds). Include at least one NEGATIVE form (e.g. UN-/IN-/-LESS) and at least one adverb. The transformed word must be genuinely required by the grammar of the sentence.',
    validate(set) {
      if (!set || typeof set !== 'object') return 'not a JSON object';
      if (!isStr(set.instructions) || !isStr(set.text)) return 'missing instructions or text';
      if (!hasGaps(set.text, 8)) return 'text must contain gaps [[1]]..[[8]]';
      if (!Array.isArray(set.answers) || set.answers.length !== 8) return 'expected 8 answers';
      for (const a of set.answers) {
        if (!a || !isNum(a.number) || !isStr(a.root) || !isStr(a.answer) || !isStr(a.explanation)) {
          return 'answers need number, root, answer, explanation';
        }
      }
      return null;
    },
  });

  definePart({
    id: 'rue4', paper: 'rue', skill: 'uoe', number: 4,
    name: 'Key word transformations', label: 'Reading & UoE · Part 4', icon: '🔁',
    desc: 'Rewrite a sentence using a given key word so the meaning stays the same — 3 to 6 words per gap.',
    questionCount: 6, officialMinutes: 10, maxTokens: 7000, markPerQuestion: 2,
    schemaHint: `{
  "instructions": "string",
  "items": [
    { "number": 1,
      "sentence1": "the original sentence",
      "keyword": "TURNED",
      "sentence2": "The event [[GAP]] a great success.",
      "accepted": ["turned out to be"],
      "explanation": "string" }
  ]
}`,
    format: 'Write exactly 6 items. Each item: "sentence1" (the original), "keyword" in CAPITALS, and "sentence2" — a paraphrase with the missing part marked literally [[GAP]] so that the completed sentence2 means the same as sentence1. The gap must take 3–6 words INCLUDING the key word, and the key word may not be changed in any way. Test grammar transformations (passives, inversion, conditionals, reported speech, comparatives, wishes) combined with lexis (collocations, phrasal verbs, fixed phrases). In "accepted", list ALL common correct answers (each 3–6 words containing the key word). Vary the contexts across the six items.',
    validate(set) {
      if (!set || typeof set !== 'object') return 'not a JSON object';
      if (!isStr(set.instructions)) return 'missing instructions';
      if (!Array.isArray(set.items) || set.items.length !== 6) return 'expected 6 items';
      for (const it of set.items) {
        if (!it || !isNum(it.number) || !isStr(it.sentence1) || !isStr(it.keyword) || !isStr(it.sentence2)) {
          return 'items need number, sentence1, keyword, sentence2';
        }
        if (it.sentence2.indexOf('[[GAP]]') === -1) return 'item ' + it.number + ' sentence2 must contain [[GAP]]';
        if (!Array.isArray(it.accepted) || !it.accepted.length || !it.accepted.every(isStr)) {
          return 'item ' + it.number + ' needs a non-empty accepted array';
        }
        if (!isStr(it.explanation)) return 'item ' + it.number + ' is missing an explanation';
      }
      return null;
    },
  });

  definePart({
    id: 'rue5', paper: 'rue', skill: 'reading', number: 5,
    name: 'Multiple-choice reading', label: 'Reading & UoE · Part 5', icon: '📖',
    desc: 'A long text with 6 four-option questions on detail, opinion, tone, purpose and implication.',
    questionCount: 6, officialMinutes: 15, maxTokens: 10000, markPerQuestion: 2,
    schemaHint: `{
  "instructions": "string",
  "title": "string",
  "text": "a ~700-word text; separate paragraphs with a blank line",
  "questions": [
    { "number": 1, "question": "string",
      "options": { "A": "", "B": "", "C": "", "D": "" },
      "answer": "C", "explanation": "string" }
  ]
}`,
    format: 'Write one engaging ~700-word text (feature article, essay or fiction extract) with a title, paragraphs separated by blank lines. Then 6 four-option multiple-choice questions IN TEXT ORDER testing: detail, opinion/attitude, tone, purpose, implication, and reference (e.g. "What does \'it\' refer to…"). Each distractor must echo words that appear in the text but be wrong for the question asked.',
    validate(set) {
      if (!set || typeof set !== 'object') return 'not a JSON object';
      if (!isStr(set.instructions) || !isStr(set.title) || !isStr(set.text)) return 'missing instructions, title or text';
      if (set.text.split(/\s+/).length < 300) return 'text is too short for Part 5';
      const err = checkMcq(set.questions, 6, ['A', 'B', 'C', 'D']);
      if (err) return err;
      for (const q of set.questions) if (!isStr(q.question)) return 'questions need question text';
      return null;
    },
  });

  definePart({
    id: 'rue6', paper: 'rue', skill: 'reading', number: 6,
    name: 'Cross-text multiple matching', label: 'Reading & UoE · Part 6', icon: '🗂️',
    desc: 'Four short expert texts on one theme — decide which writers agree, disagree or differ.',
    questionCount: 4, officialMinutes: 12, maxTokens: 9000, markPerQuestion: 2,
    schemaHint: `{
  "instructions": "string",
  "theme": "string",
  "texts": [ { "id": "A", "author": "a plausible expert name", "text": "~110 words" } ],
  "questions": [
    { "number": 1, "question": "Which expert takes a different view from the others on ...?",
      "answer": "B", "explanation": "string" }
  ]
}`,
    format: 'Write four short texts (~100–120 words each) with ids A–D, each by a different named expert/reviewer, all on ONE theme, expressing clearly distinguishable opinions that partly overlap and partly conflict. Then 4 questions of the cross-text kind: "Which expert shares X\'s opinion about …?", "Which expert takes a different view from the others on …?". Answering must require COMPARING opinions across texts, not just finding a fact in one.',
    validate(set) {
      if (!set || typeof set !== 'object') return 'not a JSON object';
      if (!isStr(set.instructions) || !isStr(set.theme)) return 'missing instructions or theme';
      if (!Array.isArray(set.texts) || set.texts.length !== 4) return 'expected 4 texts';
      const ids = ['A', 'B', 'C', 'D'];
      for (let i = 0; i < 4; i++) {
        const t = set.texts[i];
        if (!t || t.id !== ids[i] || !isStr(t.text) || !isStr(t.author)) return 'texts must be A–D with author and text';
      }
      if (!Array.isArray(set.questions) || set.questions.length !== 4) return 'expected 4 questions';
      for (const q of set.questions) {
        if (!q || !isNum(q.number) || !isStr(q.question) || ids.indexOf(q.answer) === -1 || !isStr(q.explanation)) {
          return 'questions need number, question, answer A–D, explanation';
        }
      }
      return null;
    },
  });

  definePart({
    id: 'rue7', paper: 'rue', skill: 'reading', number: 7,
    name: 'Gapped text', label: 'Reading & UoE · Part 7', icon: '🧷',
    desc: 'Six paragraphs have been removed from a text — put them back in the right places (one is a decoy).',
    questionCount: 6, officialMinutes: 15, maxTokens: 10000, markPerQuestion: 2,
    schemaHint: `{
  "instructions": "string",
  "title": "string",
  "text": "the main text with the six gaps written literally as [[1]] ... [[6]] on their own lines between paragraphs",
  "paragraphs": [ { "letter": "A", "text": "a removed paragraph" } ],
  "answers": [ { "number": 1, "letter": "D", "explanation": "the cohesion clue" } ],
  "distractor": "G"
}`,
    format: 'Write a ~700-word text with a title from which 6 paragraphs have been removed. In "text", mark each gap literally [[1]] to [[6]], each on its own line between remaining paragraphs (never before the first paragraph). Provide SEVEN paragraph options A–G in "paragraphs" (shuffled order), where exactly one (the "distractor") fits nowhere. Cohesion clues — pronoun reference, linkers, time sequence, lexical echoes — must make each correct placement uniquely right. Explanations must point at the specific clue.',
    validate(set) {
      if (!set || typeof set !== 'object') return 'not a JSON object';
      if (!isStr(set.instructions) || !isStr(set.text)) return 'missing instructions or text';
      if (!hasGaps(set.text, 6)) return 'text must contain gaps [[1]]..[[6]]';
      if (!Array.isArray(set.paragraphs) || set.paragraphs.length !== 7) return 'expected 7 paragraph options';
      const letters = set.paragraphs.map((p) => p && p.letter);
      for (const l of 'ABCDEFG') if (letters.indexOf(l) === -1) return 'paragraph letters must be A–G';
      if (!set.paragraphs.every((p) => isStr(p.text))) return 'paragraph options need text';
      if (!Array.isArray(set.answers) || set.answers.length !== 6) return 'expected 6 answers';
      for (const a of set.answers) {
        if (!a || !isNum(a.number) || 'ABCDEFG'.indexOf(a.letter) === -1 || !isStr(a.explanation)) {
          return 'answers need number, letter A–G, explanation';
        }
      }
      return null;
    },
  });

  definePart({
    id: 'rue8', paper: 'rue', skill: 'reading', number: 8,
    name: 'Multiple matching', label: 'Reading & UoE · Part 8', icon: '🔎',
    desc: 'Scan sections of a text to find where 10 specific things are mentioned.',
    questionCount: 10, officialMinutes: 14, maxTokens: 10000, markPerQuestion: 1,
    schemaHint: `{
  "instructions": "string",
  "title": "string",
  "sections": [ { "id": "A", "title": "optional heading", "text": "~130 words" } ],
  "questions": [
    { "number": 1, "question": "In which section does the writer mention ...?",
      "answer": "C", "explanation": "string" }
  ]
}`,
    format: 'Write one themed text divided into 4–6 sections with ids A, B, C… (e.g. different people\'s accounts, or aspects of one subject), ~600–700 words in total. Then 10 questions of the kind "In which section is … mentioned?" where each answer is found in exactly ONE section; several sections must be used more than once and the ideas must be paraphrased (not word-matched) in the questions.',
    validate(set) {
      if (!set || typeof set !== 'object') return 'not a JSON object';
      if (!isStr(set.instructions) || !isStr(set.text || 'x')) return 'missing instructions';
      if (!Array.isArray(set.sections) || set.sections.length < 4 || set.sections.length > 6) {
        return 'expected 4–6 sections';
      }
      const ids = [];
      for (const s of set.sections) {
        if (!s || !isStr(s.id) || !isStr(s.text)) return 'sections need id and text';
        ids.push(s.id);
      }
      if (!Array.isArray(set.questions) || set.questions.length !== 10) return 'expected 10 questions';
      for (const q of set.questions) {
        if (!q || !isNum(q.number) || !isStr(q.question) || ids.indexOf(q.answer) === -1 || !isStr(q.explanation)) {
          return 'questions need number, question, a valid section answer, explanation';
        }
      }
      return null;
    },
  });

  /* ---------- listening ---------- */

  const SCRIPT_NOTE = 'Scripts must be natural spoken English suitable for text-to-speech: contractions, discourse markers, no stage directions, no sound effects, nothing in brackets. Answers must be genuinely derivable from the script alone, with CAE-style distraction (the wrong options are mentioned or hinted at too, but do not answer the question).';

  definePart({
    id: 'lis1', paper: 'listening', skill: 'listening', number: 1,
    name: 'Short extracts', label: 'Listening · Part 1', icon: '🎧',
    desc: 'Three short conversations, two questions each (A–C). Tests gist, attitude, opinion and agreement.',
    questionCount: 6, officialMinutes: 9, maxTokens: 9000, markPerQuestion: 1,
    schemaHint: `{
  "instructions": "string",
  "extracts": [
    { "id": 1,
      "situation": "You hear two friends discussing ...",
      "script": [ { "speaker": "Man", "text": "..." }, { "speaker": "Woman", "text": "..." } ],
      "questions": [
        { "number": 1, "question": "string", "options": { "A": "", "B": "", "C": "" },
          "answer": "A", "explanation": "string" }
      ] }
  ]
}`,
    format: 'Write THREE unrelated extracts. Each: a one-line "situation" ("You hear …"), a dialogue of ~40–60 seconds of speech (~120–160 words) between two speakers as alternating turns, and TWO three-option (A–C) questions testing gist, attitude, opinion, agreement or function. Question numbers run 1–6 across the extracts. ' + SCRIPT_NOTE,
    validate(set) {
      if (!set || typeof set !== 'object') return 'not a JSON object';
      if (!isStr(set.instructions)) return 'missing instructions';
      if (!Array.isArray(set.extracts) || set.extracts.length !== 3) return 'expected 3 extracts';
      for (const ex of set.extracts) {
        if (!ex || !isStr(ex.situation)) return 'extracts need a situation line';
        const scriptErr = checkScript(ex.script);
        if (scriptErr) return scriptErr;
        const err = checkMcq(ex.questions, 2, ['A', 'B', 'C']);
        if (err) return err;
        for (const q of ex.questions) if (!isStr(q.question)) return 'questions need question text';
      }
      return null;
    },
  });

  definePart({
    id: 'lis2', paper: 'listening', skill: 'listening', number: 2,
    name: 'Sentence completion', label: 'Listening · Part 2', icon: '📝',
    desc: 'A monologue with 8 sentences to complete — type the word or short phrase you hear.',
    questionCount: 8, officialMinutes: 10, maxTokens: 9000, markPerQuestion: 1,
    schemaHint: `{
  "instructions": "string",
  "situation": "string",
  "script": [ { "speaker": "Presenter", "text": "the whole talk, split into a few segments" } ],
  "questions": [
    { "number": 1, "sentence": "The speaker first worked as a [[GAP]].",
      "answer": "park ranger", "accepted": ["ranger"], "explanation": "string" }
  ]
}`,
    format: 'Write a ~2–3 minute monologue (~350–450 words) by one named speaker giving a talk on a specific subject, split into 3–6 script segments (same speaker). Then 8 sentence-completion items IN SCRIPT ORDER: each "sentence" contains the marker [[GAP]] and the answer is 1–3 words heard VERBATIM in the script. Place plausible-but-wrong candidate words near each answer in the script (classic CAE distraction). ' + SCRIPT_NOTE,
    validate(set) {
      if (!set || typeof set !== 'object') return 'not a JSON object';
      if (!isStr(set.instructions) || !isStr(set.situation)) return 'missing instructions or situation';
      const scriptErr = checkScript(set.script);
      if (scriptErr) return scriptErr;
      if (!Array.isArray(set.questions) || set.questions.length !== 8) return 'expected 8 questions';
      for (const q of set.questions) {
        if (!q || !isNum(q.number) || !isStr(q.sentence) || !isStr(q.answer) || !isStr(q.explanation)) {
          return 'questions need number, sentence, answer, explanation';
        }
        if (q.sentence.indexOf('[[GAP]]') === -1) return 'question ' + q.number + ' sentence must contain [[GAP]]';
      }
      return null;
    },
  });

  definePart({
    id: 'lis3', paper: 'listening', skill: 'listening', number: 3,
    name: 'Interview', label: 'Listening · Part 3', icon: '🎙️',
    desc: 'A longer interview or discussion with 6 four-option questions on opinion and attitude.',
    questionCount: 6, officialMinutes: 9, maxTokens: 9000, markPerQuestion: 1,
    schemaHint: `{
  "instructions": "string",
  "situation": "string",
  "script": [ { "speaker": "Interviewer", "text": "..." }, { "speaker": "Dr Reyes", "text": "..." } ],
  "questions": [
    { "number": 1, "question": "string", "options": { "A": "", "B": "", "C": "", "D": "" },
      "answer": "D", "explanation": "string" }
  ]
}`,
    format: 'Write a ~3 minute interview (~450–550 words) between an interviewer and one named guest (or two guests) with alternating turns. Then 6 four-option (A–D) questions IN ORDER testing opinion, attitude, feeling, agreement and detail. ' + SCRIPT_NOTE,
    validate(set) {
      if (!set || typeof set !== 'object') return 'not a JSON object';
      if (!isStr(set.instructions) || !isStr(set.situation)) return 'missing instructions or situation';
      const scriptErr = checkScript(set.script);
      if (scriptErr) return scriptErr;
      const err = checkMcq(set.questions, 6, ['A', 'B', 'C', 'D']);
      if (err) return err;
      for (const q of set.questions) if (!isStr(q.question)) return 'questions need question text';
      return null;
    },
  });

  definePart({
    id: 'lis4', paper: 'listening', skill: 'listening', number: 4,
    name: 'Multiple matching', label: 'Listening · Part 4', icon: '🔀',
    desc: 'Five short speakers, two matching tasks — match each speaker to the right statement (A–H).',
    questionCount: 10, officialMinutes: 12, maxTokens: 9000, markPerQuestion: 1,
    schemaHint: `{
  "instructions": "string",
  "theme": "string",
  "extracts": [ { "id": 1, "speakerLabel": "Speaker 1", "text": "~70-word monologue" } ],
  "task1": { "heading": "Match each speaker to ...",
    "options": { "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "" },
    "questions": [ { "number": 21, "speaker": 1, "answer": "F", "explanation": "string" } ] },
  "task2": { "heading": "...", "options": { "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "" },
    "questions": [ { "number": 26, "speaker": 1, "answer": "C", "explanation": "string" } ] }
}`,
    format: 'Write FIVE short monologues (~60–80 words each) by different speakers, all on ONE theme (e.g. why they changed careers). Then TWO matching tasks. TASK ONE: one aspect (e.g. each speaker\'s reason), 8 options A–H, questions numbered 21–25 matching speakers 1–5. TASK TWO: a DIFFERENT aspect (e.g. how each speaker feels now), fresh 8 options A–H, questions numbered 26–30. Three options per task go unused but must be plausible; each speaker\'s words must clearly justify both of their answers. ' + SCRIPT_NOTE,
    validate(set) {
      if (!set || typeof set !== 'object') return 'not a JSON object';
      if (!isStr(set.instructions)) return 'missing instructions';
      if (!Array.isArray(set.extracts) || set.extracts.length !== 5) return 'expected 5 extracts';
      for (const ex of set.extracts) {
        if (!ex || !isStr(ex.speakerLabel) || !isStr(ex.text)) return 'extracts need speakerLabel and text';
      }
      for (const key of ['task1', 'task2']) {
        const t = set[key];
        if (!t || !isStr(t.heading)) return key + ' needs a heading';
        if (!checkOptions(t.options, LETTERS)) return key + ' needs options A–H';
        if (!Array.isArray(t.questions) || t.questions.length !== 5) return key + ' needs 5 questions';
        for (const q of t.questions) {
          if (!q || !isNum(q.number) || !isNum(q.speaker) || q.speaker < 1 || q.speaker > 5) {
            return key + ' questions need number and speaker 1–5';
          }
          if (LETTERS.indexOf(q.answer) === -1) return key + ' answers must be A–H';
          if (!isStr(q.explanation)) return key + ' questions need explanations';
        }
      }
      return null;
    },
  });

  /* ---------- writing ---------- */

  function validateWritingTask(set, requireEssay) {
    if (!set || typeof set !== 'object') return 'not a JSON object';
    if (!isStr(set.instructions) || !isStr(set.title) || !isStr(set.scenario) || !isStr(set.prompt)) {
      return 'missing instructions, title, scenario or prompt';
    }
    if (!isStr(set.taskType)) return 'missing taskType';
    if (requireEssay) {
      if (set.taskType !== 'essay') return 'taskType must be "essay"';
      if (!Array.isArray(set.bullets) || set.bullets.length !== 2 || !set.bullets.every(isStr)) {
        return 'essay tasks need exactly 2 bullet points';
      }
    } else {
      if (WRI2_TYPES.indexOf(set.taskType) === -1) return 'taskType must be email, letter, proposal, report or review';
    }
    return null;
  }

  definePart({
    id: 'wri1', paper: 'writing', skill: 'writing', number: 1,
    name: 'Essay (compulsory)', label: 'Writing · Part 1', icon: '🖋️',
    desc: 'A guided essay-style task, AI-marked against the four Cambridge criteria with corrections and a model answer.',
    questionCount: 0, officialMinutes: 45, maxTokens: 4000, markPerQuestion: 1,
    schemaHint: `{
  "instructions": "string",
  "taskType": "essay",
  "title": "string",
  "scenario": "the context, e.g. 'Your class has attended a panel discussion on ...'",
  "prompt": "the essay question the candidate must answer",
  "bullets": ["first aspect to discuss", "second aspect to discuss"],
  "notes": "reminder that they must add a third idea of their own and give reasons",
  "targetWords": { "min": 220, "max": 260 }
}`,
    format: 'Create ONE CAE Writing Part 1 essay task. "scenario": a context sentence (the candidate attended a class discussion / seminar / panel about the topic). "prompt": the essay question. "bullets": exactly TWO aspects to discuss. "notes": state the candidate must also introduce a THIRD idea of their own and give reasons for their point of view. Register: formal/neutral academic. 220–260 words.',
    validate(set) { return validateWritingTask(set, true); },
  });

  definePart({
    id: 'wri2', paper: 'writing', skill: 'writing', number: 2,
    name: 'Email, proposal, report or review', label: 'Writing · Part 2', icon: '📄',
    desc: 'Choose a task type and get banded feedback with corrections and a model answer.',
    questionCount: 0, officialMinutes: 45, maxTokens: 4000, markPerQuestion: 1,
    schemaHint: `{
  "instructions": "string",
  "taskType": "email | letter | proposal | report | review",
  "title": "string",
  "scenario": "who you are, who you are writing to, and why",
  "prompt": "the full task, weaving in three content points the answer must cover",
  "notes": "register and reader guidance",
  "targetWords": { "min": 220, "max": 260 }
}`,
    format: 'Create ONE CAE Writing Part 2 task of the requested type. "scenario": a realistic situation (who the candidate is, who they are writing to, why). "prompt": the full task, weaving in THREE content points the answer must cover. "notes": the target reader and the register expected. 220–260 words.',
    validate(set) { return validateWritingTask(set, false); },
  });

  /* ---------- speaking (fresh rehearsal prompts only) ---------- */

  definePart({
    id: 'spk', paper: 'speaking', skill: null, number: 0,
    name: 'Speaking — tips & rehearsal', label: 'Speaking', icon: '🗣️',
    desc: 'What the examiner wants in each part, how it\'s marked, useful phrases, and fresh prompts to rehearse aloud.',
    questionCount: 0, officialMinutes: 15, maxTokens: 2000, markPerQuestion: 1,
    schemaHint: '{ "part": 2, "prompts": ["...", "..."] }',
    format: 'Speaking practice prompts.',
    validate(obj) {
      if (!obj || typeof obj !== 'object') return 'not a JSON object';
      if (!Array.isArray(obj.prompts) || !obj.prompts.length) return 'missing prompts';
      return null;
    },
  });

  const ORDER = [
    'rue1', 'rue2', 'rue3', 'rue4', 'rue5', 'rue6', 'rue7', 'rue8',
    'lis1', 'lis2', 'lis3', 'lis4', 'wri1', 'wri2', 'spk',
  ];

  /* ---------- topic rotation ---------- */

  function pickTopic(partId, usedTopics) {
    const used = (usedTopics || []).map((t) => String(t).toLowerCase());
    for (let attempt = 0; attempt < 40; attempt++) {
      const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
      const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
      const combo = topic + ' — ' + angle;
      const clash = used.some((u) => u === combo.toLowerCase() ||
        (attempt < 20 && u.indexOf(topic) !== -1)); // early tries also avoid the base topic
      if (!clash) return combo;
    }
    return TOPICS[Math.floor(Math.random() * TOPICS.length)] + ' — ' +
      ANGLES[Math.floor(Math.random() * ANGLES.length)];
  }

  /* ---------- generation prompt ---------- */

  function buildGeneration(partId, opts) {
    const o = opts || {};
    const part = PARTS[partId];
    if (!part) throw new Error('Unknown part: ' + partId);

    const L = o.level || DEFAULT_LEVEL;
    const diffMap = L.difficulty || DIFFICULTY;
    const difficulty = diffMap[o.difficulty] || diffMap.standard || DIFFICULTY.standard;
    const avoid = (o.avoid || []).filter(Boolean);

    let format = part.format;
    let schemaHint = part.schemaHint;
    if (partId === 'wri2') {
      const type = WRI2_TYPES.indexOf(o.taskType) !== -1
        ? o.taskType
        : WRI2_TYPES[Math.floor(Math.random() * WRI2_TYPES.length)];
      format = format.replace('of the requested type', 'of type "' + type.toUpperCase() + '"') +
        ' The "taskType" field must be "' + type + '".';
    }
    // Adapt the writing length to the chosen level (C1 = 220–260 by default).
    if (part.paper === 'writing' && L.writing) {
      const wc = L.writing.min + '–' + L.writing.max + ' words';
      format = format.replace(/220–260 words/g, wc);
      schemaHint = schemaHint.replace(/"min": 220, "max": 260/g,
        '"min": ' + L.writing.min + ', "max": ' + L.writing.max);
      // Below B2 there is no academic essay: keep the task short and everyday
      // (the JSON shape is unchanged so validation still passes).
      if (L.cefr === 'A1' || L.cefr === 'A2' || L.cefr === 'B1') {
        format += ' LEVEL NOTE: this is a ' + L.cefr + '-level task — the scenario, topic and language must be simple and everyday, suitable for a ' + L.cefr + ' learner; the content points should be short and concrete; do NOT write an academic or abstract essay.';
      }
    }
    // Adapt the key-word-transformation length to the level (B2 2–5, C1 3–6, C2 3–8).
    if (partId === 'rue4' && L.kwt) {
      format = format.replace(/3–6 words/g, L.kwt.min + '–' + L.kwt.max + ' words');
    }

    return [
      'You are a ' + L.examWriter + ' exam item writer. Produce ONE authentic, exam-accurate ' +
        part.label + ' (' + part.name + ') task at ' + L.cefr + ' level.',
      '',
      'FORMAT — follow the official format exactly:',
      format,
      '',
      'DIFFICULTY: ' + difficulty + '.',
      'TOPIC: ' + (o.topic || 'your choice — something fresh and engaging') + '.',
      avoid.length
        ? 'Do NOT reuse these topics/titles already used this session: ' + avoid.join('; ') + '.'
        : 'This is the first task of the session — pick a fresh angle.',
      'Vary vocabulary and sentence structures; avoid clichés and stock examples.',
      EXPLAIN_NOTE,
      'Uniqueness seed: ' + (o.seed || '') + ' — use it only to make this task different from any other; never mention it.',
      '',
      'Return ONLY valid JSON matching this schema (the markers like [[1]] and [[GAP]] are literal text):',
      schemaHint,
      'No preamble, no markdown, no backticks — the response must start with { and end with }.',
    ].join('\n');
  }

  /* ---------- writing assessment ---------- */

  const ASSESS_SCHEMA_HINT = `{
  "bands": { "content": 0-5, "communicativeAchievement": 0-5, "organisation": 0-5, "language": 0-5 },
  "estimatedScale": 142-210,
  "overallComment": "3-4 sentences of overall feedback",
  "strengths": ["specific things done well"],
  "corrections": [ { "original": "exact words quoted from the answer", "improved": "the corrected version", "note": "what the problem was" } ],
  "modelAnswer": "a full improved 220-260 word model answer to the same task"
}`;

  function buildWritingAssessment(input) {
    const o = input || {};
    const L = o.level || DEFAULT_LEVEL;
    const sc = L.scale;
    const band4 = Math.round((sc.pass + sc.max) / 2);
    const wc = L.writing.min + '–' + L.writing.max + ' words';
    const schemaHint = ASSESS_SCHEMA_HINT
      .replace('142-210', sc.min + '-' + sc.max)
      .replace('220-260 word', L.writing.min + '-' + L.writing.max + ' word');
    return [
      'You are a senior ' + L.examWriter + ' writing examiner. Assess the candidate\'s answer below against the four official criteria, each on a band from 0 to 5:',
      '- Content: all parts of the task covered; the reader is fully informed.',
      '- Communicative Achievement: the conventions of the ' + (o.taskType || 'task') + ' genre; register held consistently; ideas communicated effectively.',
      '- Organisation: logical structure, paragraphing, linking devices, cohesion.',
      '- Language: range and accuracy of vocabulary and grammar; errors that impede vs. slips.',
      '',
      'Band guide: 5 = fully operational ' + L.cefr + ' with ' + L.aspire + ' flashes; 3 = borderline pass at ' + L.cefr + '; 1 = clearly below ' + L.cefr + '; use whole numbers.',
      'Set "estimatedScale" on the Cambridge English Scale (' + sc.min + '–' + sc.max + '), consistent with the bands: an average band of 3 corresponds to about ' + sc.pass + ', 4 to about ' + band4 + ', 5 to ' + sc.max + '.',
      'In "corrections", quote the candidate\'s EXACT words in "original" and fix them in "improved" — pick the 4–8 most instructive problems (grammar, vocabulary, register, cohesion). Be specific, kind and useful.',
      'In "modelAnswer", write a full improved answer (' + wc + ') to the same task at a strong ' + L.cefr + '/' + L.aspire + ' level, keeping the candidate\'s ideas where possible.',
      '',
      'THE TASK (' + (o.taskType || 'writing') + '):',
      String(o.taskPrompt || ''),
      '',
      'THE CANDIDATE\'S ANSWER:',
      '<<<ANSWER',
      String(o.answer || ''),
      'ANSWER>>>',
      '',
      'Return ONLY valid JSON matching this schema:',
      schemaHint,
      'No preamble, no markdown, no backticks — the response must start with { and end with }.',
    ].join('\n');
  }

  function validateAssessment(obj) {
    if (!obj || typeof obj !== 'object') return 'not a JSON object';
    const b = obj.bands;
    if (!b || typeof b !== 'object') return 'missing bands';
    for (const k of ['content', 'communicativeAchievement', 'organisation', 'language']) {
      if (!isNum(b[k]) || b[k] < 0 || b[k] > 5) return 'band "' + k + '" must be a number 0–5';
    }
    if (!isNum(obj.estimatedScale)) return 'missing estimatedScale';
    if (!isStr(obj.overallComment)) return 'missing overallComment';
    if (!Array.isArray(obj.corrections)) return 'missing corrections array';
    for (const c of obj.corrections) {
      if (!c || !isStr(c.original) || !isStr(c.improved)) return 'corrections need original and improved';
    }
    if (!isStr(obj.modelAnswer)) return 'missing modelAnswer';
    return null;
  }

  /* ---------- speaking rehearsal prompts ---------- */

  const SPEAKING_STYLE = {
    1: 'Part 1 (Interview) questions: personal but C1-worthy questions about experiences, preferences, plans and opinions (e.g. "What kind of place would you most like to live in, and why?"). One question per prompt.',
    2: 'Part 2 (Long turn) tasks described in words (no pictures needed): name three related situations/scenes the candidate imagines, then the TWO questions they must address while comparing two of them, e.g. "Compare two of these situations and say why the people might have chosen them and how they might be feeling." One complete task per prompt.',
    3: 'Part 3 (Collaborative task) tasks: a central question plus five short written prompts to discuss (list them in the prompt), ending with the decision question asked after the discussion. One complete task per prompt.',
    4: 'Part 4 (Discussion) questions: deeper opinion questions that extend a Part 3 theme — abstract, two-sided, C1-level. One question per prompt.',
  };

  function buildSpeakingPrompts(partNumber, opts) {
    const o = opts || {};
    const L = o.level || DEFAULT_LEVEL;
    const style = (SPEAKING_STYLE[Number(partNumber)] || SPEAKING_STYLE[1]).replace(/C1/g, L.cefr);
    const avoid = (o.avoid || []).filter(Boolean);
    return [
      'You are a ' + L.examWriter + ' speaking examiner preparing FRESH rehearsal prompts a candidate can practise answering aloud on their own.',
      'Write 4 prompts in the style of the ' + L.examWriter + ' Speaking test. ' + style,
      'These are task prompts ONLY — do not write any example answers, dialogues or candidate/examiner exchanges.',
      avoid.length ? 'Avoid anything close to these prompts already used: ' + avoid.join(' | ') : '',
      'Uniqueness seed: ' + (o.seed || '') + ' — never mention it.',
      '',
      'Return ONLY valid JSON: { "part": ' + Number(partNumber) + ', "prompts": ["...", "...", "...", "..."] }',
      'No preamble, no markdown, no backticks.',
    ].filter(Boolean).join('\n');
  }


  /* ---------- vocabulary builder ---------- */

  const VOCAB_SCHEMA_HINT = `{
  "words": [
    { "word": "to mitigate", "pos": "verb",
      "definition": "to make something less severe or serious",
      "example": "Planting trees helps mitigate the effects of urban heat.",
      "synonyms": ["alleviate", "lessen"],
      "collocations": ["mitigate the risk", "mitigate the impact"] }
  ]
}`;

  function validateVocab(obj) {
    if (!obj || typeof obj !== 'object') return 'not a JSON object';
    if (!Array.isArray(obj.words) || !obj.words.length || obj.words.length > 15) {
      return 'expected 1-15 words';
    }
    for (const w of obj.words) {
      if (!w || !isStr(w.word) || !isStr(w.pos) || !isStr(w.definition) || !isStr(w.example)) {
        return 'each word needs word, pos, definition, example';
      }
      if (w.synonyms !== undefined && !Array.isArray(w.synonyms)) return 'synonyms must be an array';
      if (w.collocations !== undefined && !Array.isArray(w.collocations)) return 'collocations must be an array';
    }
    return null;
  }

  function buildVocab(opts) {
    const o = opts || {};
    const L = o.level || DEFAULT_LEVEL;
    if (isStr(o.word)) {
      return [
        'You are a ' + L.examWriter + ' vocabulary coach. Create ONE flashcard entry for the word or phrase below, exactly as a strong learner dictionary would, pitched at ' + L.cefr + ' level.',
        'Word or phrase: "' + o.word.trim() + '"',
        'Give: its part of speech; a learner-friendly definition (max 20 words); one natural example sentence that shows typical usage; 2-4 close synonyms; 1-3 common collocations.',
        'If it is misspelled, use the most likely intended word instead.',
        'Return ONLY valid JSON matching this schema (a single entry in the array):',
        VOCAB_SCHEMA_HINT,
        'No preamble, no markdown, no backticks.',
      ].join('\n');
    }
    const count = Math.min(15, Math.max(1, Number(o.count) || 10));
    const avoid = (o.avoid || []).filter(Boolean);
    return [
      'You are a ' + L.examWriter + ' vocabulary coach. Produce ' + count + ' vocabulary flashcard entries that genuinely move a candidate from ' + L.below + ' to ' + L.cefr + '/' + L.aspire + ' — the lexis that earns marks in Reading & Use of English and impresses in Writing and Speaking at ' + L.cefr + ' level.',
      'Mix the categories across the set: useful single words, phrasal verbs, strong collocations, idiomatic phrases, and linkers appropriate to ' + L.cefr + '. All must be current, natural English a candidate could actually deploy.',
      'Topic flavour for this batch: ' + (o.topic || 'general academic and everyday life') + '.',
      avoid.length ? 'Do NOT include any of these (already in the learner\'s deck): ' + avoid.join(', ') + '.' : '',
      'For each entry give: the word/phrase (verbs with "to", idioms in citation form); part of speech; a learner-friendly definition (max 20 words); one natural example sentence at ' + L.cefr + ' level; 2-4 close synonyms; 1-3 common collocations.',
      'Uniqueness seed: ' + (o.seed || '') + ' — never mention it.',
      'Return ONLY valid JSON matching this schema:',
      VOCAB_SCHEMA_HINT,
      'No preamble, no markdown, no backticks.',
    ].filter(Boolean).join('\n');
  }

  return {
    PARTS,
    ORDER,
    pickTopic,
    buildGeneration,
    buildWritingAssessment,
    buildSpeakingPrompts,
    ASSESS_SCHEMA_HINT,
    validateAssessment,
    buildVocab,
    validateVocab,
    VOCAB_SCHEMA_HINT,
  };
});
