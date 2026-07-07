/* Cambridge Trainer — CEFR level packs (CAE.levels).
 *
 * The app was originally hard-wired to Cambridge C1 Advanced (CAE). This module
 * turns "the exam level" into data: each pack carries the exam name, the
 * reported-score scale, per-level difficulty phrasing, writing word counts and
 * the grade bands. Prompts, marking and the dashboard all read the ACTIVE pack
 * (chosen in Settings / the level picker) instead of hard-coded C1 constants.
 *
 * The C1 pack is deliberately calibrated to reproduce the original behaviour
 * exactly (same scale anchors and grade bands), so nothing changes for a C1
 * learner. Other levels are generated from their scale + CEFR neighbours.
 *
 * NOTE ON AUTHENTICITY: every level currently reuses the C1-derived task set
 * (Reading & Use of English, Listening, Writing, Speaking) but generates the
 * CONTENT at the chosen level. Faithful per-exam paper structures (e.g. A2 Key
 * has no separate Use of English paper) are a later phase; `examAccurate`
 * flags which packs already match the real paper exactly.
 */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  /* Build the three difficulty phrasings for a level from its CEFR label and
   * the level one step up (the "stretch" target). Mirrors the original C1
   * wording so the standard/hard/stretch tiers read naturally at any level. */
  function difficultyFor(cefr, aspire) {
    return {
      standard: 'challenging but fair, calibrated so a strong ' + cefr + ' candidate scores about 80%',
      hard: 'top-of-' + cefr + ': subtle distractors and lower-frequency lexis, calibrated so a strong ' + cefr + ' candidate scores about 65%',
      c2: 'a ' + aspire + ' stretch: ' + aspire + '-level vocabulary, idiom and inference, calibrated so a strong ' + cefr + ' candidate scores about 55%',
    };
  }

  /* Grade bands derived from a scale. A = top of range (next CEFR up),
   * C = pass mark, plus a "just below" and "below" band. */
  function gradesFor(scale, below, aspire) {
    const b = Math.round(scale.pass + (scale.high - scale.pass) * 0.65);
    const under = Math.round(scale.pass - (scale.pass - scale.min) * 0.4);
    return [
      { min: scale.high, grade: 'A', label: 'Grade A · ' + aspire + ' level' },
      { min: b, grade: 'B', label: 'Grade B · pass' },
      { min: scale.pass, grade: 'C', label: 'Grade C · pass' },
      { min: under, grade: below, label: below + ' level — below the ' + scale.pass + ' pass mark' },
      { min: 0, grade: 'below', label: 'Below ' + below + ' level' },
    ];
  }

  /* Percent-correct → scale, and mean-writing-band → scale, as interpolation
   * anchors. Generated from the scale unless a pack overrides them (C1 does,
   * to stay bit-for-bit identical to the original app). */
  function pctAnchorsFor(scale) {
    return [[0, scale.min], [55, scale.pass], [85, scale.high], [100, scale.max]];
  }
  function bandAnchorsFor(scale) {
    return [[0, scale.min], [3, scale.pass], [4.5, scale.high], [5, scale.max]];
  }

  function makeLevel(def) {
    const scale = def.scale;
    const level = Object.assign({
      examAccurate: false,
      grades: def.grades || gradesFor(scale, def.below, def.aspire),
      pctAnchors: def.pctAnchors || pctAnchorsFor(scale),
      bandAnchors: def.bandAnchors || bandAnchorsFor(scale),
      difficulty: def.difficulty || difficultyFor(def.cefr, def.aspire),
    }, def);

    // The compact spec that crosses into the (framework-free) prompt builders.
    level.prompt = {
      examWriter: def.examWriter,
      cefr: def.cefr,
      below: def.below,
      aspire: def.aspire,
      writing: def.writing,
      kwt: def.kwt || { min: 3, max: 6 },
      scale: { min: scale.min, max: scale.max, pass: scale.pass, high: scale.high },
      difficulty: level.difficulty,
    };
    return level;
  }

  // B2 First & C2 Proficiency share one Reading & Use of English shape: 7 parts,
  // WITHOUT C1's cross-text multiple matching (rue6). Gapped text (rue7) then
  // reads as Part 6 and multiple matching (rue8) as Part 7. (Verified against
  // cambridgeenglish.org.) Listening/Writing keep the shared task set for now.
  const NO_CROSSTEXT_PARTS = [
    'rue1', 'rue2', 'rue3', 'rue4', 'rue5', 'rue7', 'rue8',
    'lis1', 'lis2', 'lis3', 'lis4', 'wri1', 'wri2', 'spk',
  ];
  const NO_CROSSTEXT_OVERRIDES = {
    rue7: { number: 6, label: 'Reading & UoE · Part 6' },
    rue8: { number: 7, label: 'Reading & UoE · Part 7' },
  };

  // Lower levels (A1/A2/B1) have NO separate Use of English paper and no
  // word-formation or key-word-transformation tasks (verified vs
  // cambridgeenglish.org). Their reading-style tasks are presented as a single
  // "Reading" paper. This builds the skill-grouped layout for the practice
  // browser; the writing sub-line is filled in per level by the app.
  function combinedGroups(readingIds, readingSub) {
    return [
      { ids: readingIds, no: 'Paper 1', title: 'Reading', paper: 'reading', sub: readingSub },
      { ids: ['wri1', 'wri2'], no: 'Paper 2', title: 'Writing', paper: 'writing', sub: 'Short guided writing with examiner-style feedback' },
      { ids: ['lis1', 'lis2', 'lis3', 'lis4'], no: 'Paper 3', title: 'Listening', paper: 'listening', sub: 'Recordings played aloud, with questions' },
      { ids: ['spk'], no: 'Paper 4', title: 'Speaking', paper: 'speaking', sub: 'Tips, marking criteria and rehearsal prompts' },
    ];
  }

  const LIST = [
    makeLevel({
      id: 'a1', cefr: 'A1', order: 1, below: 'pre-A1', aspire: 'A2',
      name: 'A1 Beginner', exam: 'A1 foundation practice', examShort: 'A1',
      examWriter: 'A1-level English (Cambridge-style beginner)',
      structureNote: 'Foundation practice — Cambridge has no standard adult A1 exam (the adult ladder starts at A2 Key). Simple reading, word gaps and very short writing at A1 level.',
      tagline: 'First words and phrases — introduce yourself and cope with very simple, everyday situations.',
      scale: { min: 80, max: 120, pass: 100, high: 118 },
      writing: { min: 20, max: 35 },
      parts: ['rue1', 'rue2', 'rue5', 'lis1', 'lis2', 'lis3', 'lis4', 'wri1', 'wri2', 'spk'],
      readingPaperName: 'Reading',
      groups: combinedGroups(['rue1', 'rue2', 'rue5'], 'Very short texts, simple multiple choice and single-word gaps'),
      partOverrides: {
        wri1: { name: 'Short message', desc: 'Write a very short message (a few sentences) — with simple feedback and a model answer.' },
        wri2: { name: 'Short note', desc: 'Write a few sentences about a picture or everyday topic — with feedback.' },
      },
    }),
    makeLevel({
      id: 'a2', cefr: 'A2', order: 2, below: 'A1', aspire: 'B1',
      name: 'A2 Key', exam: 'A2 Key (KET)', examShort: 'KET',
      examWriter: 'Cambridge A2 Key (KET)',
      structureNote: 'A2 Key has no separate Use of English paper and no word-formation or key-word-transformation tasks. Reading & Use-of-English-style tasks are level-adapted from the closest supported types; Listening still uses the C1 template for now.',
      tagline: 'Basic everyday English — simple exchanges, short notes and familiar topics.',
      scale: { min: 100, max: 150, pass: 120, high: 140 },
      writing: { min: 25, max: 35 },
      parts: ['rue1', 'rue2', 'rue5', 'rue8', 'lis1', 'lis2', 'lis3', 'lis4', 'wri1', 'wri2', 'spk'],
      readingPaperName: 'Reading & Writing',
      groups: combinedGroups(['rue1', 'rue2', 'rue5', 'rue8'], 'Signs and short texts, matching, multiple choice and single-word gaps — no separate Use of English paper at A2'),
      partOverrides: {
        wri1: { name: 'Short message', desc: 'Write a short email or note from a few prompts — with instant feedback and a model answer.' },
        wri2: { name: 'Short story', desc: 'Write a short story or note — with feedback, corrections and a model answer.' },
      },
    }),
    makeLevel({
      id: 'b1', cefr: 'B1', order: 3, below: 'A2', aspire: 'B2',
      name: 'B1 Preliminary', exam: 'B1 Preliminary (PET)', examShort: 'PET',
      examWriter: 'Cambridge B1 Preliminary (PET)',
      structureNote: 'B1 Preliminary has no separate Use of English paper and no word-formation or key-word-transformation tasks. Reading tasks (incl. sentence-level gapped text) are level-adapted from the closest supported types; Listening still uses the C1 template for now.',
      tagline: 'Everyday written and spoken English — deal with most situations while travelling or at work.',
      scale: { min: 120, max: 170, pass: 140, high: 160 },
      writing: { min: 90, max: 110 },
      parts: ['rue1', 'rue2', 'rue5', 'rue7', 'rue8', 'lis1', 'lis2', 'lis3', 'lis4', 'wri1', 'wri2', 'spk'],
      readingPaperName: 'Reading',
      groups: combinedGroups(['rue1', 'rue2', 'rue5', 'rue7', 'rue8'], 'Short texts, multiple choice, gapped text and single-word gaps — no separate Use of English paper at B1'),
      partOverrides: {
        wri1: { name: 'Email', desc: 'Reply to an email using the notes (~100 words) — with examiner-style feedback and a model answer.' },
        wri2: { name: 'Article or story', desc: 'Write an article or a story (~100 words) — with feedback, corrections and a model answer.' },
      },
    }),
    makeLevel({
      id: 'b2', cefr: 'B2', order: 4, below: 'B1', aspire: 'C1',
      name: 'B2 First', exam: 'B2 First (FCE)', examShort: 'FCE',
      examWriter: 'Cambridge B2 First (FCE)',
      structureNote: 'Reading & Use of English is exam-accurate: 7 parts, 52 questions, no cross-text task. (Gapped text uses paragraph-style insertion; the real B2 uses sentences.) Listening still uses the C1 template for now.',
      tagline: 'Upper-intermediate — the confident, independent English employers and universities recognise.',
      scale: { min: 140, max: 190, pass: 160, high: 180 },
      writing: { min: 140, max: 190 },
      kwt: { min: 2, max: 5 },
      parts: NO_CROSSTEXT_PARTS,
      partOverrides: NO_CROSSTEXT_OVERRIDES,
    }),
    makeLevel({
      id: 'c1', cefr: 'C1', order: 5, below: 'B2', aspire: 'C2',
      name: 'C1 Advanced', exam: 'C1 Advanced (CAE)', examShort: 'CAE',
      examWriter: 'Cambridge C1 Advanced (CAE)',
      examAccurate: true,
      tagline: 'Advanced — the high-level English for demanding academic and professional life.',
      scale: { min: 142, max: 210, pass: 180, high: 200 },
      writing: { min: 220, max: 260 },
      kwt: { min: 3, max: 6 },
      // Preserve the original app's exact calibration for C1.
      pctAnchors: [
        [0, 142], [20, 150], [40, 168], [55, 180], [62, 185],
        [70, 191], [80, 200], [90, 206], [100, 210],
      ],
      bandAnchors: [
        [0, 142], [1, 152], [2, 166], [3, 180], [3.5, 187],
        [4, 194], [4.5, 202], [5, 210],
      ],
      grades: [
        { min: 200, grade: 'A', label: 'Grade A · C2 level' },
        { min: 193, grade: 'B', label: 'Grade B · pass' },
        { min: 180, grade: 'C', label: 'Grade C · pass' },
        { min: 160, grade: 'B2', label: 'B2 level — below the 180 pass mark' },
        { min: 0, grade: 'below', label: 'Below B2 level' },
      ],
    }),
    makeLevel({
      id: 'c2', cefr: 'C2', order: 6, below: 'C1', aspire: 'C2',
      name: 'C2 Proficiency', exam: 'C2 Proficiency (CPE)', examShort: 'CPE',
      examWriter: 'Cambridge C2 Proficiency (CPE)',
      structureNote: 'Reading & Use of English is exam-accurate: 7 parts, no cross-text task, with the widened 3–8 word key-word transformation. (The gapped-text task uses 6 gaps; the real C2 uses 7, for 53 questions.) Listening still uses the C1 template for now.',
      tagline: 'Mastery — English at the highest level, fluent, precise and fully nuanced.',
      scale: { min: 180, max: 230, pass: 200, high: 220 },
      writing: { min: 240, max: 280 },
      kwt: { min: 3, max: 8 },
      parts: NO_CROSSTEXT_PARTS,
      partOverrides: NO_CROSSTEXT_OVERRIDES,
    }),
  ];

  const BY_ID = {};
  LIST.forEach((l) => { BY_ID[l.id] = l; });

  const DEFAULT_ID = 'c1';

  function get(id) {
    return BY_ID[id] || BY_ID[DEFAULT_ID];
  }

  function currentId() {
    try {
      const s = CAE.storage.getSettings();
      if (s && s.level && BY_ID[s.level]) return s.level;
    } catch (e) { /* storage not ready */ }
    return DEFAULT_ID;
  }

  function active() {
    return get(currentId());
  }

  // The ordered part IDs a level includes. A pack may set its own `parts`
  // (a subset/reordering of the master js/prompts.js ORDER) to match its real
  // paper structure; otherwise it falls back to the full set (C1-style).
  function activeOrder() {
    const o = active().parts;
    if (Array.isArray(o) && o.length) return o.slice();
    return (CAE.prompts && Array.isArray(CAE.prompts.ORDER)) ? CAE.prompts.ORDER.slice() : [];
  }

  // A part's display metadata for the active level: the shared js/prompts.js
  // definition, with any per-level `partOverrides` (e.g. renumbered labels for
  // levels whose paper has fewer parts) merged on top.
  function partView(id) {
    const base = (CAE.prompts && CAE.prompts.PARTS && CAE.prompts.PARTS[id]) || {};
    const ov = (active().partOverrides && active().partOverrides[id]) || {};
    return Object.assign({}, base, ov);
  }

  CAE.levels = {
    DEFAULT_ID,
    list: () => LIST.slice(),
    get,
    currentId,
    active,
    activeScale: () => active().scale,
    activePrompt: () => active().prompt,
    activeGrades: () => active().grades,
    activeOrder,
    inActiveOrder: (id) => activeOrder().indexOf(id) !== -1,
    partView,
  };
})();
