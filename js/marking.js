/* CAE Ace — answer checking and Cambridge scale conversion (CAE.marking). */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const norm = (s) => CAE.util.normalizeAnswer(s);

  function letterCorrect(user, answer) {
    return String(user || '').trim().toUpperCase() === String(answer || '').trim().toUpperCase();
  }

  function typedCorrect(user, answerObj) {
    const u = norm(user);
    if (!u) return false;
    const candidates = [answerObj.answer].concat(answerObj.accepted || []);
    return candidates.some((c) => norm(c) === u);
  }

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* Key word transformations: the answer must use the key word unchanged,
   * contain 3–6 words, and match one of the accepted variants. */
  function kwtCorrect(user, item) {
    const u = norm(user);
    if (!u) return { correct: false };
    const accepted = [].concat(item.accepted || []);
    if (accepted.some((a) => norm(a) === u)) return { correct: true };

    const kw = norm(item.keyword);
    const hasKeyword = kw && new RegExp('(^| )' + escapeRegex(kw) + '( |$)').test(u);
    if (!hasKeyword) {
      return { correct: false, reason: 'The key word must be used exactly as given' };
    }
    const kwt = (CAE.levels && CAE.levels.active && CAE.levels.active().prompt
      && CAE.levels.active().prompt.kwt) || { min: 3, max: 6 };
    const words = u.split(' ').filter(Boolean).length;
    if (words < kwt.min || words > kwt.max) {
      return { correct: false, reason: 'The gap must be filled with ' + kwt.min + '–' + kwt.max + ' words' };
    }
    return { correct: false };
  }

  function interpolate(anchors, x) {
    if (x <= anchors[0][0]) return anchors[0][1];
    for (let i = 1; i < anchors.length; i++) {
      const [x1, y1] = anchors[i];
      const [x0, y0] = anchors[i - 1];
      if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
    return anchors[anchors.length - 1][1];
  }

  /* The active CEFR level pack drives the score scale and grade bands. Falls
   * back to C1 Advanced (142–210) if js/levels.js has not loaded — this keeps
   * the original app's calibration exactly for C1 learners. */
  const C1_FALLBACK = {
    scale: { min: 142, max: 210, pass: 180, high: 200 },
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
  };

  function level() {
    return (CAE.levels && CAE.levels.active && CAE.levels.active()) || C1_FALLBACK;
  }

  function toScale(pctScore) {
    const L = level();
    const p = CAE.util.clamp(Number(pctScore) || 0, 0, 100);
    return Math.round(CAE.util.clamp(interpolate(L.pctAnchors, p), L.scale.min, L.scale.max));
  }

  /* Writing: mean band (0–5 across the four criteria) → scale.
   * Band 3 across the board is the conventional pass borderline. */
  function writingScale(avgBand) {
    const L = level();
    const b = CAE.util.clamp(Number(avgBand) || 0, 0, 5);
    return Math.round(CAE.util.clamp(interpolate(L.bandAnchors, b), L.scale.min, L.scale.max));
  }

  function gradeFor(scale) {
    const s = Number(scale) || 0;
    const bands = level().grades || C1_FALLBACK.grades;
    for (const band of bands) {
      if (s >= band.min) return { grade: band.grade, label: band.label };
    }
    return { grade: 'below', label: 'Below level' };
  }

  const FALLBACK_SKILL = {
    rue1: 'reading', rue2: 'uoe', rue3: 'uoe', rue4: 'uoe',
    rue5: 'reading', rue6: 'reading', rue7: 'reading', rue8: 'reading',
    lis1: 'listening', lis2: 'listening', lis3: 'listening', lis4: 'listening',
    wri1: 'writing', wri2: 'writing', spk: null,
  };

  function skillOf(partId) {
    const p = CAE.prompts && CAE.prompts.PARTS && CAE.prompts.PARTS[partId];
    if (p && p.skill !== undefined) return p.skill;
    return FALLBACK_SKILL[partId] !== undefined ? FALLBACK_SKILL[partId] : null;
  }

  /* Official weighting: parts 1–3 and 8 carry 1 mark per question; parts 4–7
   * carry 2. Reading = parts 1, 5–8; Use of English = parts 2–4. */
  function weightedRuePct(partResults) {
    const buckets = { reading: { got: 0, max: 0 }, uoe: { got: 0, max: 0 } };
    for (const r of partResults || []) {
      const skill = skillOf(r.partId);
      if (skill !== 'reading' && skill !== 'uoe') continue;
      const meta = CAE.prompts.PARTS[r.partId];
      const w = (meta && meta.markPerQuestion) || 1;
      buckets[skill].got += (r.score || 0) * w;
      buckets[skill].max += (r.total || 0) * w;
    }
    return {
      readingPct: CAE.util.pct(buckets.reading.got, buckets.reading.max),
      uoePct: CAE.util.pct(buckets.uoe.got, buckets.uoe.max),
    };
  }

  CAE.marking = {
    letterCorrect, typedCorrect, kwtCorrect,
    toScale, writingScale, gradeFor, weightedRuePct, skillOf,
  };
})();
