/* CAE Ace — localStorage layer (CAE.storage).
 * All keys are prefixed 'cae.' and JSON-serialized. Every read/write is guarded
 * so a full quota, disabled storage, or corrupted value degrades gracefully.
 * Privacy: everything here stays on the user's device; exportData() strips the
 * API key so an exported file can never leak it.
 */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const PREFIX = 'cae.';

  const SETTINGS_DEFAULTS = {
    provider: 'anthropic',    // 'anthropic' (premium) | 'gemini' (free tier)
    apiKey: '',               // Anthropic key
    geminiKey: '',            // Google Gemini key
    level: 'c1',              // active CEFR level pack (see js/levels.js)
    onboarded: false,         // has the first-run level picker been shown
    theme: 'auto',            // 'auto' | 'light' | 'dark'
    difficulty: 'standard',   // 'standard' | 'hard' | 'c2'
    timerMode: 'off',         // 'off' | 'official' | 'custom'
    customMinutes: 10,
    strictTiming: false,
    listenVoice: '',
    listenRate: 1,
    playTwice: true,
    baselineScore: null,      // Cambridge scale 142–210, or null if not set
    targetScore: null,        // Cambridge scale 142–210, or null if not set
  };

  const CAPS = { attempts: 500, mocks: 50, review: 200, vocab: 1000 };

  // Per-level data: each CEFR level keeps its OWN attempts, mocks, review list,
  // drafts and vocab deck, so switching level never mixes progress. Settings
  // (API key, theme, the active level itself) stay global. A scoped key is
  // stored as e.g. 'cae.b2.attempts'; 'cae.attempts' would be the legacy shape.
  const SCOPED = { attempts: 1, mocks: 1, review: 1, drafts: 1, vocab: 1 };

  // Read the active level directly from raw storage to avoid recursing through
  // getSettings()/get() (settings is never scoped, so there is no loop).
  function currentLevel() {
    try {
      const raw = localStorage.getItem(PREFIX + 'settings');
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.level) return String(s.level);
      }
    } catch (e) { /* storage unavailable or corrupt */ }
    return 'c1';
  }

  function realKey(key) {
    return SCOPED[key] ? currentLevel() + '.' + key : key;
  }

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + realKey(key));
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + realKey(key), JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('CAE.storage: could not save "' + key + '"', e);
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(PREFIX + realKey(key));
    } catch (e) { /* storage unavailable */ }
  }

  function getList(key) {
    const v = get(key, []);
    return Array.isArray(v) ? v : [];
  }

  function getSettings() {
    const stored = get('settings', {});
    const safe = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    return Object.assign({}, SETTINGS_DEFAULTS, safe);
  }

  function saveSettings(patch) {
    const merged = Object.assign({}, getSettings(), patch || {});
    set('settings', merged);
    return merged;
  }

  function logAttempt(entry) {
    const attempt = Object.assign({}, entry, {
      id: CAE.util.uid(),
      date: Date.now(),
    });
    const list = getList('attempts');
    list.unshift(attempt);
    set('attempts', list.slice(0, CAPS.attempts));
    return attempt;
  }

  function getAttempts() {
    return getList('attempts');
  }

  function logMockResult(entry) {
    const result = Object.assign({}, entry, {
      id: CAE.util.uid(),
      date: Date.now(),
    });
    const list = getList('mocks');
    list.unshift(result);
    set('mocks', list.slice(0, CAPS.mocks));
    return result;
  }

  function getMockResults() {
    return getList('mocks');
  }

  function getReviewList() {
    return getList('review');
  }

  function addToReview(item) {
    if (!item || typeof item !== 'object') return;
    const list = getReviewList();
    const dup = list.some((r) =>
      r && r.partId === item.partId &&
      r.prompt === item.prompt &&
      r.correctAnswer === item.correctAnswer);
    if (dup) return;
    list.unshift(Object.assign({}, item, { id: CAE.util.uid(), date: Date.now() }));
    set('review', list.slice(0, CAPS.review));
  }

  function removeFromReview(id) {
    set('review', getReviewList().filter((r) => !r || r.id !== id));
  }

  function getDrafts() {
    return getList('drafts');
  }

  function saveDraft(draft) {
    const d = Object.assign({}, draft);
    if (!d.id) d.id = CAE.util.uid();
    d.updated = Date.now();
    const list = getDrafts().filter((x) => x && x.id !== d.id);
    list.unshift(d);
    set('drafts', list);
    return d;
  }

  function deleteDraft(id) {
    set('drafts', getDrafts().filter((d) => !d || d.id !== id));
  }

  function exportData() {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const full = localStorage.key(i);
        if (!full || full.indexOf(PREFIX) !== 0) continue;
        const short = full.slice(PREFIX.length);
        let value;
        try {
          value = JSON.parse(localStorage.getItem(full));
        } catch (e) {
          continue; // raw non-JSON values (e.g. the cae.apiMode dev override) are not app data
        }
        if (short === 'settings' && value && typeof value === 'object') {
          value = Object.assign({}, value);
          delete value.apiKey;    // never export API keys
          delete value.geminiKey;
        }
        data[short] = value;
      }
    } catch (e) { /* storage unavailable — export whatever we gathered */ }
    return JSON.stringify({
      app: CAE.config.APP_NAME,
      version: CAE.config.VERSION,
      exportedAt: Date.now(),
      data,
    }, null, 2);
  }

  // Matches both the legacy bare form ('attempts') and the per-level form
  // ('b2.attempts', 'c1.vocab', …).
  const ARRAY_RE = /^([a-z0-9]+\.)?(attempts|mocks|review|drafts|vocab)$/;

  function importData(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(String(jsonString));
    } catch (e) {
      return { ok: false, error: 'That file is not valid JSON.' };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'That file does not look like an English Exam Trainer export.' };
    }
    const data = (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data))
      ? parsed.data
      : parsed;

    const arrayKeys = Object.keys(data).filter((k) => ARRAY_RE.test(k));
    const hasSettings = data.settings !== undefined;
    if (!arrayKeys.length && !hasSettings) {
      return { ok: false, error: 'No English Exam Trainer data found in that file.' };
    }
    for (const k of arrayKeys) {
      if (!Array.isArray(data[k])) {
        return { ok: false, error: 'The "' + k + '" section has the wrong format.' };
      }
    }
    if (hasSettings &&
        (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings))) {
      return { ok: false, error: 'The "settings" section has the wrong format.' };
    }

    // The API key never travels in exports, so keep the one already on device.
    const currentApiKey = getSettings().apiKey;
    const currentGeminiKey = getSettings().geminiKey;

    // Wipe existing settings + every level's app arrays, then write the import.
    try {
      const doomed = [];
      for (let i = 0; i < localStorage.length; i++) {
        const full = localStorage.key(i);
        if (!full || full.indexOf(PREFIX) !== 0) continue;
        const short = full.slice(PREFIX.length);
        if (short === 'settings' || ARRAY_RE.test(short)) doomed.push(full);
      }
      doomed.forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } });
    } catch (e) { /* storage unavailable */ }

    if (hasSettings) {
      const s = Object.assign({}, SETTINGS_DEFAULTS, data.settings);
      s.apiKey = currentApiKey;
      s.geminiKey = currentGeminiKey;
      try { localStorage.setItem(PREFIX + 'settings', JSON.stringify(s)); } catch (e) { /* ignore */ }
    } else if (currentApiKey || currentGeminiKey) {
      saveSettings({ apiKey: currentApiKey, geminiKey: currentGeminiKey });
    }

    for (const k of arrayKeys) {
      const baseName = k.replace(/^[a-z0-9]+\./, '');
      // Legacy bare keys land in the (now-current) level's namespace; already
      // namespaced keys are written verbatim so multi-level exports round-trip.
      const target = (k === baseName) ? (currentLevel() + '.' + baseName) : k;
      const clean = data[k].filter((x) => x && typeof x === 'object');
      const capped = CAPS[baseName] ? clean.slice(0, CAPS[baseName]) : clean;
      try { localStorage.setItem(PREFIX + target, JSON.stringify(capped)); } catch (e) { /* ignore */ }
    }
    return { ok: true };
  }

  function clearAll() {
    try {
      const doomed = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* storage unavailable */ }
  }

  /* ---------- vocabulary deck ---------- */

  function getVocab() {
    const v = get('vocab', []);
    return Array.isArray(v) ? v : [];
  }

  /* Adds flashcard entries, skipping words already in the deck
   * (case-insensitive). Returns how many were actually added. */
  function addVocabWords(entries, source) {
    const list = getVocab();
    const have = new Set(list.map((w) => String(w.word || '').toLowerCase().trim()));
    let added = 0;
    for (const e of entries || []) {
      const key = String(e.word || '').toLowerCase().trim();
      if (!key || have.has(key)) continue;
      have.add(key);
      list.unshift({
        source: source || 'generated', // 'generated' | 'manual' | 'practice' | 'wotd'
        id: 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        word: String(e.word).trim(),
        pos: String(e.pos || '').trim(),
        definition: String(e.definition || '').trim(),
        example: String(e.example || '').trim(),
        synonyms: (Array.isArray(e.synonyms) ? e.synonyms : []).map(String).slice(0, 5),
        collocations: (Array.isArray(e.collocations) ? e.collocations : []).map(String).slice(0, 4),
        box: 1,               // Leitner box 1-5
        due: Date.now(),      // due immediately for the first review
        added: Date.now(),
        seen: 0,
        right: 0,
      });
      added += 1;
    }
    set('vocab', list.slice(0, CAPS.vocab));
    return added;
  }

  function updateVocabWord(id, patch) {
    const list = getVocab();
    const i = list.findIndex((w) => w.id === id);
    if (i === -1) return;
    list[i] = Object.assign({}, list[i], patch);
    set('vocab', list);
  }

  function removeVocabWord(id) {
    set('vocab', getVocab().filter((w) => w.id !== id));
  }

  CAE.storage = {
    get, set, remove,
    getVocab, addVocabWords, updateVocabWord, removeVocabWord,
    getSettings, saveSettings,
    logAttempt, getAttempts,
    logMockResult, getMockResults,
    getReviewList, addToReview, removeFromReview,
    getDrafts, saveDraft, deleteDraft,
    exportData, importData, clearAll,
  };
})();
