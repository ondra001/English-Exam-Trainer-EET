/* CAE Ace — model API layer (CAE.api).
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  HOW TO SWAP TO A SECURE BACKEND FOR ANY PUBLIC RELEASE
 * ══════════════════════════════════════════════════════════════════════════
 *  Every model call in the whole app funnels through this file, and the raw
 *  network access lives in exactly ONE function below: request().
 *
 *  'direct' mode (private use ONLY):
 *      The browser POSTs straight to the Anthropic Messages API using the key
 *      the user pasted into Settings (stored only in this browser). This is
 *      what the header `anthropic-dangerous-direct-browser-access` enables —
 *      it is "dangerous" precisely because anyone with access to the page can
 *      read the key. Never ship a public build in this mode.
 *
 *  'backend' mode (REQUIRED for public / Google Play builds):
 *      The browser POSTs only { type, partId/params } to your own server at
 *      CAE.config.BACKEND_BASE (see backend/server.js). The server holds the
 *      Anthropic key in an environment variable, builds the prompt with the
 *      very same js/prompts.js builders, calls Anthropic, validates the JSON
 *      and returns the parsed object. The key never reaches the client.
 *
 *  To switch: set API_MODE to 'backend' in js/config.js (or, for a quick
 *  test, run  localStorage.setItem('cae.apiMode', 'backend')  in devtools),
 *  deploy backend/server.js, done. No changes are needed in this file or
 *  anywhere else — the swap is a config change, not a rewrite.
 * ══════════════════════════════════════════════════════════════════════════
 */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  class ApiError extends Error {
    constructor(message, kind) {
      super(message);
      this.name = 'ApiError';
      this.kind = kind || 'server'; // 'auth'|'rate'|'overloaded'|'network'|'badjson'|'server'
    }
  }

  const MSG = {
    noKey: 'No API key yet — open Settings and paste your Anthropic API key to generate content.',
    noGeminiKey: 'No API key yet — open Settings and paste your Google Gemini API key (free at aistudio.google.com) to generate content.',
    auth: 'Your API key was rejected — check it in Settings.',
    backendAuth: 'The server rejected this request — check the backend configuration.',
    rate: 'Hitting the rate limit — wait a few seconds, then try again.',
    overloaded: 'The AI service is very busy right now — please try again in a minute.',
    network: 'Could not reach the AI service — check your internet connection and try again.',
    badjson: 'The model returned something that could not be read as a valid task — please try again.',
    server: 'The AI service returned an unexpected error — please try again.',
  };

  const JSON_NUDGE = '\n\nIMPORTANT: Your previous output could not be used. Return ONLY valid JSON exactly matching the schema — no preamble, no commentary, no markdown, no backticks.';

  // Session freshness: topics (or generated titles/prompts) already used this
  // session, per part, so consecutive sets never repeat themselves.
  const usedTopics = new Map(); // partId -> string[]
  const USED_CAP = 12;

  function getUsed(key) {
    return (usedTopics.get(key) || []).slice();
  }

  function remember(key, value) {
    const v = typeof value === 'string' ? value.trim() : '';
    if (!v) return;
    const list = usedTopics.get(key) || [];
    if (!list.includes(v)) list.push(v);
    usedTopics.set(key, list.slice(-USED_CAP));
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function makeSeed() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function activeProvider() {
    return CAE.storage.getSettings().provider === 'gemini' ? 'gemini' : 'anthropic';
  }

  function activeKey() {
    const s = CAE.storage.getSettings();
    return String((activeProvider() === 'gemini' ? s.geminiKey : s.apiKey) || '').trim();
  }

  function hasKey() {
    return activeKey().length > 0;
  }

  /* The ONE place in the entire app that touches the network.
   * Retries exactly once (after 2s) on 429 / 529 / "overloaded", then throws
   * a friendly ApiError. Returns the parsed JSON body of a 2xx response. */
  async function request(url, headers, body, authMessage) {
    let retried = false;
    for (;;) {
      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
      } catch (e) {
        throw new ApiError(MSG.network, 'network');
      }

      let data = null;
      try {
        data = await res.json();
      } catch (e) { /* non-JSON body; handled below */ }

      if (res.ok) {
        if (data == null || typeof data !== 'object') throw new ApiError(MSG.badjson, 'badjson');
        return data;
      }

      const status = res.status;
      const errType = data && data.error && data.error.type ? String(data.error.type) : '';
      const errMsg = data && data.error && data.error.message ? String(data.error.message) : '';

      if (status === 401 || status === 403 ||
          (status === 400 && /api key not valid|api_key_invalid/i.test(errMsg + errType))) {
        throw new ApiError(authMessage || MSG.auth, 'auth');
      }
      const isOverloaded = status === 529 || /overloaded/i.test(errType) || /overloaded/i.test(errMsg);
      const isRate = status === 429 && !isOverloaded;
      if ((isRate || isOverloaded) && !retried) {
        retried = true;
        await delay(2000);
        continue;
      }
      if (isRate) throw new ApiError(MSG.rate, 'rate');
      if (isOverloaded) throw new ApiError(MSG.overloaded, 'overloaded');
      throw new ApiError(
        errMsg ? 'The AI service returned an error: ' + errMsg : MSG.server,
        'server');
    }
  }

  /* Raw prompt -> raw text. Direct (Anthropic) mode only; 'backend' mode uses
   * typed requests via backendCall() and 'mock' mode never reaches the network. */
  async function callModel(promptText, opts) {
    const o = opts || {};
    const mode = CAE.config.mode();
    if (mode !== 'direct') {
      throw new ApiError(
        mode === 'mock'
          ? 'Mock mode is offline — switch the API mode in Settings to call the model.'
          : 'Raw model calls are disabled in backend mode — the server builds all prompts.',
        'server');
    }
    const key = activeKey();
    if (!key) throw new ApiError(activeProvider() === 'gemini' ? MSG.noGeminiKey : MSG.noKey, 'auth');

    if (activeProvider() === 'gemini') {
      // Google Gemini free tier — same prompt, different wire format.
      const gdata = await request(
        CAE.config.GEMINI_API_BASE + CAE.config.GEMINI_MODEL + ':generateContent',
        { 'x-goog-api-key': key, 'content-type': 'application/json' },
        {
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: {
            maxOutputTokens: o.maxTokens || CAE.config.DEFAULT_MAX_TOKENS,
            responseMimeType: 'application/json',
            // Gemini 2.5 Flash spends output tokens on internal "thinking" by
            // default, which can truncate long JSON tasks mid-way. Turn it off.
            thinkingConfig: /2\.5-flash/.test(CAE.config.GEMINI_MODEL) ? { thinkingBudget: 0 } : undefined,
          },
        });
      const cand = gdata && Array.isArray(gdata.candidates) && gdata.candidates[0];
      const gtext = cand && cand.content && Array.isArray(cand.content.parts)
        ? cand.content.parts.map((pt) => pt.text || '').join('')
        : '';
      if (!gtext) throw new ApiError(MSG.badjson, 'badjson');
      return gtext;
    }

    const data = await request(CAE.config.API_BASE, {
      'x-api-key': key,
      'anthropic-version': CAE.config.ANTHROPIC_VERSION,
      // Required for browser CORS. Acceptable ONLY for private personal use —
      // see the block comment at the top of this file.
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    }, {
      model: CAE.config.MODEL,
      max_tokens: o.maxTokens || CAE.config.DEFAULT_MAX_TOKENS,
      messages: [{ role: 'user', content: promptText }],
    });

    const text = data && Array.isArray(data.content) && data.content[0] && data.content[0].text;
    if (typeof text !== 'string' || !text) throw new ApiError(MSG.badjson, 'badjson');
    return text;
  }

  async function backendCall(payload) {
    return request(CAE.config.BACKEND_BASE, {
      'content-type': 'application/json',
    }, payload, MSG.backendAuth);
  }

  /* Auto-close a truncated JSON payload: close open strings/arrays/objects
   * and drop dangling separators. The structural validate() step still runs
   * afterwards, so a repaired-but-incomplete set is rejected and retried. */
  function repairJson(t) {
    const stack = [];
    let inStr = false;
    let esc = false;
    for (const ch of t) {
      if (esc) { esc = false; continue; }
      if (inStr) {
        if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if (ch === '}' || ch === ']') stack.pop();
    }
    let out = t;
    if (inStr) out += '"';
    out = out.replace(/[,:]\s*$/, '');
    while (stack.length) out += stack.pop();
    return out;
  }

  /* Strip ``` fences if present, take first '{' onwards, JSON.parse —
   * with a repair pass for responses cut off at the token limit. */
  function extractJson(raw) {
    let t = String(raw == null ? '' : raw).trim();
    const fence = t.match(/^```[a-zA-Z]*\s*([\s\S]*?)\s*```?\s*$/);
    if (fence) t = fence[1];
    const start = t.indexOf('{');
    if (start < 0) throw new Error('No JSON object found in model output');
    const end = t.lastIndexOf('}');
    const slice = end > start ? t.slice(start, end + 1) : t.slice(start);
    try {
      return JSON.parse(slice);
    } catch (e) {
      // Truncated output (e.g. token-limit cut-off): try to close it up.
      return JSON.parse(repairJson(t.slice(start)));
    }
  }

  /* callModel -> extract JSON -> validate; one retry with a "valid JSON only"
   * nudge, then a friendly badjson ApiError. */
  async function generateJson(prompt, opts) {
    const o = opts || {};
    let lastProblem = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await callModel(attempt === 0 ? prompt : prompt + JSON_NUDGE,
        { maxTokens: o.maxTokens });
      let obj;
      try {
        obj = extractJson(raw);
      } catch (e) {
        lastProblem = '';
        continue;
      }
      const problem = typeof o.validate === 'function' ? o.validate(obj) : null;
      if (problem) {
        lastProblem = String(problem);
        continue;
      }
      return obj;
    }
    throw new ApiError(lastProblem ? MSG.badjson + ' (' + lastProblem + ')' : MSG.badjson, 'badjson');
  }

  function mockUnavailable() {
    return new ApiError('Mock data is unavailable — js/mock.js failed to load.', 'server');
  }

  async function generateSet(partId, opts) {
    const o = opts || {}; // { taskType } — wri2's chosen task type, if any
    const def = CAE.prompts.PARTS[partId];
    if (!def) throw new ApiError('Unknown exercise part: ' + partId, 'server');
    const mode = CAE.config.mode();

    if (mode === 'mock') {
      await delay(600); // let the loading state show, like a real call
      if (!CAE.mock) throw mockUnavailable();
      return CAE.mock.getSet(partId);
    }

    const settings = CAE.storage.getSettings();
    const difficulty = settings.difficulty || 'standard';
    const level = CAE.levels ? CAE.levels.activePrompt() : undefined;
    const levelId = CAE.levels ? CAE.levels.currentId() : undefined;
    const avoid = getUsed(partId);
    const seed = makeSeed();
    const maxTokens = def.maxTokens || CAE.config.DEFAULT_MAX_TOKENS;

    if (mode === 'backend') {
      const payload = { type: 'generate', partId, difficulty, avoidTopics: avoid, seed, level: levelId };
      if (o.taskType) payload.taskType = o.taskType;
      const set = await backendCall(payload);
      const problem = def.validate(set);
      if (problem) throw new ApiError(MSG.badjson + ' (' + problem + ')', 'badjson');
      // The server picks the topic; remember the visible theme so the next
      // request's avoid-list still steers the model away from repeats.
      remember(partId, set.title || set.theme || '');
      return set;
    }

    const topic = CAE.prompts.pickTopic(partId, avoid);
    const prompt = CAE.prompts.buildGeneration(partId, { topic, difficulty, avoid, seed, taskType: o.taskType, level });
    const set = await generateJson(prompt, {
      maxTokens,
      validate: (obj) => def.validate(obj),
    });
    remember(partId, topic);
    return set;
  }

  async function assessWriting(input) {
    const o = input || {};
    const mode = CAE.config.mode();

    if (mode === 'mock') {
      await delay(600);
      if (!CAE.mock) throw mockUnavailable();
      return CAE.mock.getAssessment();
    }

    if (mode === 'backend') {
      const assessment = await backendCall({
        type: 'assess',
        taskType: o.taskType,
        taskPrompt: o.taskPrompt,
        answer: o.answer,
        level: CAE.levels ? CAE.levels.currentId() : undefined,
      });
      const problem = CAE.prompts.validateAssessment(assessment);
      if (problem) throw new ApiError(MSG.badjson + ' (' + problem + ')', 'badjson');
      return assessment;
    }

    const prompt = CAE.prompts.buildWritingAssessment({
      taskType: o.taskType,
      taskPrompt: o.taskPrompt,
      answer: o.answer,
      level: CAE.levels ? CAE.levels.activePrompt() : undefined,
    });
    return generateJson(prompt, {
      maxTokens: CAE.config.DEFAULT_MAX_TOKENS,
      validate: (obj) => CAE.prompts.validateAssessment(obj),
    });
  }

  async function generateSpeakingPrompts(partNumber) {
    const part = Number(partNumber);
    const mode = CAE.config.mode();

    if (mode === 'mock') {
      await delay(600);
      if (!CAE.mock) throw mockUnavailable();
      return CAE.mock.getSpeaking(part);
    }

    const usedKey = 'spk' + part;
    const seed = makeSeed();
    const validate = (obj) => {
      if (!obj || typeof obj !== 'object') return 'not a JSON object';
      if (!Array.isArray(obj.prompts) || !obj.prompts.length) return 'missing "prompts" array';
      if (!obj.prompts.every((p) => typeof p === 'string' && p.trim())) return 'empty prompt entries';
      return null;
    };
    const finish = (obj) => {
      const prompts = obj.prompts.map((p) => String(p).trim());
      prompts.forEach((p) => remember(usedKey, p));
      return { part, prompts };
    };

    if (mode === 'backend') {
      const obj = await backendCall({ type: 'speaking', part, seed, level: CAE.levels ? CAE.levels.currentId() : undefined });
      const problem = validate(obj);
      if (problem) throw new ApiError(MSG.badjson + ' (' + problem + ')', 'badjson');
      return finish(obj);
    }

    const spkDef = CAE.prompts.PARTS.spk;
    const prompt = CAE.prompts.buildSpeakingPrompts(part, { seed, avoid: getUsed(usedKey), level: CAE.levels ? CAE.levels.activePrompt() : undefined });
    const obj = await generateJson(prompt, {
      maxTokens: (spkDef && spkDef.maxTokens) || 1200,
      validate,
    });
    return finish(obj);
  }

  /* Vocabulary builder: fresh hard words, or a single-word lookup. */
  async function generateVocabWords(opts) {
    const o = opts || {};
    const mode = CAE.config.mode();

    if (mode === 'mock') {
      await delay(600);
      if (!CAE.mock) throw mockUnavailable();
      return CAE.mock.getVocabWords(o.count || 10, o.word);
    }

    const seed = makeSeed();
    const validate = (obj) => CAE.prompts.validateVocab(obj);

    if (mode === 'backend') {
      const payload = { type: 'vocab', count: o.count || 10, seed, level: CAE.levels ? CAE.levels.currentId() : undefined };
      if (o.word) payload.word = String(o.word).slice(0, 60);
      else payload.avoidWords = (o.avoid || []).slice(0, 80);
      const obj = await backendCall(payload);
      const problem = validate(obj);
      if (problem) throw new ApiError(MSG.badjson + ' (' + problem + ')', 'badjson');
      return obj;
    }

    const prompt = CAE.prompts.buildVocab({
      count: o.count || 10,
      avoid: (o.avoid || []).slice(0, 80),
      topic: CAE.prompts.pickTopic('vocab', getUsed('vocab')),
      seed,
      word: o.word,
      level: CAE.levels ? CAE.levels.activePrompt() : undefined,
    });
    const obj = await generateJson(prompt, { maxTokens: 3000, validate });
    if (!o.word) remember('vocab', (obj.words[0] && obj.words[0].word) || '');
    return obj;
  }

  CAE.api = {
    hasKey,
    callModel,
    generateSet,
    assessWriting,
    generateSpeakingPrompts,
    generateVocabWords,
    ApiError,
  };
})();
