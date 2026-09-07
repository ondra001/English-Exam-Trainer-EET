/* English Exam Trainer — Gemini model resolution (CAE.models).
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 * The app used to hard-wire one Gemini model id in config.js
 * ('gemini-2.5-flash'). Google adds, renames, re-tiers and retires models
 * constantly, and — crucially — a given API key does NOT see the whole
 * catalogue: a key made today and a key made a year ago can be offered
 * different model sets. A hard-wired id therefore works for whoever the app
 * was written against and 404s ("model not found for API version v1beta") for
 * somebody else, usually a NEW user. Symptom: every AI-generated feature is
 * dead for that person while working perfectly for everyone else.
 *
 * So we never trust a single id:
 *   1. ASK    — ListModels tells us what THIS key can actually call.
 *   2. RANK   — sorted by tier then version number, so a model released after
 *               this code was written (gemini-3.9-flash, gemini-4-flash, …)
 *               automatically wins with nobody editing this file.
 *   3. FALL BACK — a call that comes back "no such model" or "quota
 *               exhausted" retries down the ranked list, and whatever id
 *               worked is remembered for next time.
 * A user who wants a specific model can still pin one in Settings; even a
 * pinned id falls back rather than bricking the app, so a pin left over from
 * a retired model can never strand anyone.
 *
 * The raw network call lives in CAE.api (see js/api.js) — this file is pure
 * policy: ranking, caching and error classification.
 * ───────────────────────────────────────────────────────────────────────────
 */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  /* Seed list: used on the very first call, before ListModels has ever run,
   * and as a safety net if discovery is blocked. Newest-first. This list is
   * ALLOWED to go stale — discovery + ranking is what keeps the app current,
   * this is only what we try while we are still ignorant. The trailing
   * '-latest' alias always resolves to something Google considers current, so
   * it is a good final guess if every explicit id here has been retired. */
  const SEED_CHAIN = [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'gemini-flash-latest',
  ];

  const CACHE_KEY = 'geminiModels';    // { ts, ids: [...] } — global, not per level
  const WORKING_KEY = 'geminiWorking'; // last model id that actually answered
  const CACHE_TTL = 24 * 60 * 60 * 1000;
  const MAX_TRIES = 6;                 // how many models one request may walk

  // Models that failed as "not available to this key" during THIS page
  // session. Not persisted: availability and quota both come back.
  const failed = new Set();

  /* ---------- id parsing & ranking ---------- */

  /* 'gemini-3.6-flash' -> { major: 3, minor: 6, rest: '-flash-' }.
   * `rest` is padded with dashes at both ends so a plain /-flash-/ test can
   * match a segment sitting at either end of the string. */
  function parse(id) {
    const m = /^(?:models\/)?gemini-(\d+)(?:\.(\d+))?-(.+)$/.exec(String(id || '').trim());
    if (!m) return null;
    return {
      id: String(id).replace(/^models\//, ''),
      major: Number(m[1]),
      minor: m[2] ? Number(m[2]) : 0,
      rest: '-' + m[3] + '-',
    };
  }

  // Specialist models that cannot do "prompt in, JSON text out": image, audio,
  // speech, live/streaming, embedding and robotics variants.
  const NOT_TEXT = /-(image|imagen|tts|transcribe|live|audio|native|speech|embedding|vision|computer|robotics|veo|lyria)-/;
  const UNSTABLE = /-(preview|exp|experimental|rc)-/;

  /* Can this id generate the JSON exam tasks the app needs? */
  function isUsable(id) {
    const p = parse(id);
    return !!p && !NOT_TEXT.test(p.rest);
  }

  /* Higher is better. Tier dominates version on purpose: this app runs on
   * Gemini's FREE tier, where 'flash' has by far the most generous quota and
   * is easily strong enough for exam tasks. Within a tier the newest version
   * wins, which is what makes future models work with no code change. */
  function rank(id) {
    const p = parse(id);
    if (!p) return -1;
    const isLite = /-lite-/.test(p.rest);
    const tier = isLite ? 1 : /-pro-/.test(p.rest) ? 2 : /-flash-/.test(p.rest) ? 3 : 0;
    const version = p.major * 1000 + p.minor * 10;
    const stable = UNSTABLE.test(p.rest) ? 0 : 5;
    return tier * 1000000 + version + stable;
  }

  /* Best-first, de-duplicated, unusable ids dropped. */
  function sortIds(ids) {
    const seen = new Set();
    const out = [];
    for (const raw of ids || []) {
      const id = String(raw || '').replace(/^models\//, '').trim();
      if (!id || seen.has(id) || !isUsable(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out.sort((a, b) => rank(b) - rank(a));
  }

  /* ---------- discovered-list cache ---------- */

  function cached() {
    const v = CAE.storage.get(CACHE_KEY, null);
    if (!v || typeof v !== 'object' || !Array.isArray(v.ids)) return null;
    return v;
  }

  function cachedIds() {
    const c = cached();
    return c ? c.ids.slice() : [];
  }

  function cacheIsFresh() {
    const c = cached();
    return !!c && typeof c.ts === 'number' && (Date.now() - c.ts) < CACHE_TTL;
  }

  function setCachedIds(ids) {
    const sorted = sortIds(ids);
    CAE.storage.set(CACHE_KEY, { ts: Date.now(), ids: sorted });
    // A model that reappears in a fresh listing deserves another chance.
    for (const id of sorted) failed.delete(id);
    return sorted;
  }

  function pinned() {
    const s = CAE.storage.getSettings();
    return String(s.geminiModel || '').replace(/^models\//, '').trim();
  }

  function working() {
    return String(CAE.storage.get(WORKING_KEY, '') || '').trim();
  }

  function noteWorking(id) {
    if (id && working() !== id) CAE.storage.set(WORKING_KEY, id);
  }

  /* Drop the remembered choice so ranking decides afresh — what "Automatic"
   * has to mean after a pin is cleared, or it would silently keep using the
   * model that was pinned. */
  function forgetWorking() {
    CAE.storage.set(WORKING_KEY, '');
  }

  function noteFailed(id) {
    if (!id) return;
    failed.add(id);
    if (working() === id) CAE.storage.set(WORKING_KEY, '');
  }

  /* ---------- what to try, in order ---------- */

  /* Pinned choice first (if any), then the id that worked last time, then the
   * discovered catalogue, then the seed list. Anything already known-dead this
   * session is filtered out, which is also what guarantees the retry walk in
   * api.js terminates: the candidate list strictly shrinks. */
  function candidates() {
    const list = [];
    const push = (id) => {
      const v = String(id || '').replace(/^models\//, '').trim();
      if (v && !failed.has(v) && !list.includes(v)) list.push(v);
    };
    push(pinned());
    push(working());
    for (const id of cachedIds()) push(id);
    for (const id of SEED_CHAIN) push(id);
    return list.slice(0, MAX_TRIES);
  }

  /* ---------- per-model request shaping ---------- */

  /* Thinking control, which is model-family specific and a 400 if you get it
   * wrong. These tasks are long structured JSON, and thinking tokens come out
   * of the SAME output budget — left on full, a task can be truncated
   * mid-JSON. So we ask for as little thinking as each family allows:
   *   Gemini 3.x  — thinkingLevel; 'low' is accepted by every 3.x model
   *                 ('minimal' exists only on some, so it is not safe here).
   *   Gemini 2.5 flash / flash-lite — thinkingBudget: 0 disables it outright.
   *   Gemini 2.5 pro — cannot disable thinking; send nothing.
   *   Anything unrecognised — send nothing and let the model default.
   * Sending both fields in one request is an explicit 400, hence either/or.
   * If a future family rejects whatever we pick, api.js retries once with no
   * thinkingConfig at all, so this can never be the thing that breaks a user. */
  function thinkingConfig(id) {
    const p = parse(id);
    if (!p) return undefined;
    if (p.major >= 3) return { thinkingLevel: 'low' };
    if (p.major === 2 && p.minor === 5 && /-flash-/.test(p.rest)) return { thinkingBudget: 0 };
    return undefined;
  }

  /* ---------- error classification ---------- */

  /* "This key cannot use this model" — as opposed to a bad key or a real
   * outage. Google phrases it several ways depending on endpoint and age of
   * the model, so match the family of wordings rather than one string. */
  function looksUnavailable(err) {
    if (!err) return false;
    if (err.status === 404) return true;
    if (err.status !== 400 && err.status !== 403) return false;
    const msg = String(err.detail || err.message || '');
    if (/api[_ -]?key/i.test(msg)) return false; // that is an auth problem, not a model one
    return /not found|not supported|unsupported|does not exist|no access|not available|not allowed|deprecated|retired|unavailable in|does not have access/i.test(msg);
  }

  /* The thinking parameters were rejected (wrong family, or Google changed
   * the contract) — worth one retry with them removed. */
  function looksThinkingRejected(err) {
    if (!err || err.status !== 400) return false;
    return /thinking|thought/i.test(String(err.detail || err.message || ''));
  }

  CAE.models = {
    SEED_CHAIN,
    rank, sortIds, isUsable,
    candidates, cachedIds, setCachedIds, cacheIsFresh,
    pinned, working, noteWorking, noteFailed, forgetWorking,
    thinkingConfig,
    looksUnavailable, looksThinkingRejected,
  };
})();
