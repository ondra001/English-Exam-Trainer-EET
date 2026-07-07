/* CAE Ace — secure backend proxy example (backend/server.js)
 *
 * Run:   ANTHROPIC_API_KEY=sk-ant-... node backend/server.js
 * Then open http://localhost:3000 — this server hosts BOTH the static app and
 * the /api/generate endpoint the app calls when CAE.config mode is 'backend'.
 *
 * Why this file exists: for any PUBLIC build (web host, Google Play TWA) the
 * Anthropic API key must live ONLY on the server. The browser sends just the
 * exercise type + parameters; this server builds the actual prompt (reusing
 * js/prompts.js — the same UMD module the app itself loads), calls Anthropic,
 * validates the model's JSON exactly like the client would, and returns the
 * parsed object. The client never sees the key and never sends raw prompts.
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY    (required) server-held Anthropic key
 *   ANTHROPIC_MODEL      model id, default 'claude-opus-4-8'
 *   PORT                 default 3000
 *   RATE_LIMIT           requests per window per IP, default 20
 *   RATE_WINDOW_MIN      sliding-window length in minutes, default 5
 *   DAILY_TOKEN_BUDGET   input+output tokens per UTC day, default 2,000,000
 */
'use strict';

const path = require('path');
const express = require('express');

/* The prompt builders are shared with the browser app. prompts.js is UMD, so
 * require() works in Node with zero duplication of exam logic. */
let prompts;
try {
  prompts = require('../js/prompts.js');
} catch (err) {
  console.error('Cannot load ../js/prompts.js — the backend reuses the app\'s prompt builders.');
  console.error('Start this server from the project (node backend/server.js) with js/prompts.js present.');
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
}

/* ── Configuration ─────────────────────────────────────────────────────── */

function envInt(name, fallback) {
  const n = parseInt(process.env[name], 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const PORT = envInt('PORT', 3000);
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const HARD_TOKEN_CAP = 12000;         // absolute per-request max_tokens ceiling
const ASSESS_MAX_TOKENS = 4000;      // writing assessment (bands + model answer)
const SPEAKING_MAX_TOKENS = 1500;    // a handful of sample speaking prompts

const RATE_LIMIT = envInt('RATE_LIMIT', 20);
const RATE_WINDOW_MS = envInt('RATE_WINDOW_MIN', 5) * 60 * 1000;
const DAILY_TOKEN_BUDGET = envInt('DAILY_TOKEN_BUDGET', 2000000);

if (!API_KEY) {
  console.error('');
  console.error('ANTHROPIC_API_KEY is not set — refusing to start.');
  console.error('This proxy exists precisely so the key lives on the server, never in the app.');
  console.error('Start it like:');
  console.error('  ANTHROPIC_API_KEY=sk-ant-...  node backend/server.js');
  console.error('(or set the variable in your hosting provider\'s secret manager).');
  console.error('');
  process.exit(1);
}

const DIFFICULTIES = ['standard', 'hard', 'c2'];
const TASK_TYPES = ['essay', 'email', 'letter', 'proposal', 'report', 'review'];
const PART_IDS = Object.keys(prompts.PARTS);

/* ── Abuse / cost protection: per-IP sliding-window rate limit ─────────── */

/* In-memory: fine for a single-process deployment. If you run multiple
 * instances behind a load balancer, move this to Redis or similar. */
const rateBuckets = new Map(); // ip -> array of request timestamps (ms)

function rateLimit(req, res, next) {
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
  const now = Date.now();
  const stamps = (rateBuckets.get(ip) || []).filter((t) => t > now - RATE_WINDOW_MS);
  if (stamps.length >= RATE_LIMIT) {
    rateBuckets.set(ip, stamps);
    const retryAfter = Math.max(1, Math.ceil((stamps[0] + RATE_WINDOW_MS - now) / 1000));
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Too many requests from this device — please wait ' + retryAfter + 's and try again.',
    });
  }
  stamps.push(now);
  rateBuckets.set(ip, stamps);
  next();
}

/* Periodically drop IPs whose whole window has expired, so the Map can't
 * grow without bound. */
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [ip, stamps] of rateBuckets) {
    if (!stamps.length || stamps[stamps.length - 1] <= cutoff) rateBuckets.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

/* ── Abuse / cost protection: daily token spend guard ──────────────────── */

/* In-memory counter of usage.input_tokens + usage.output_tokens reported by
 * the Anthropic API. Resets at UTC midnight. When exhausted, requests get a
 * 429 with Retry-After pointing at the reset. Restarting the server resets
 * the counter — persist it (file/Redis) if that matters to you. */
const spend = { day: utcDayKey(), tokens: 0 };

function utcDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function rollSpendDay() {
  const today = utcDayKey();
  if (today !== spend.day) {
    spend.day = today;
    spend.tokens = 0;
  }
}

function budgetExhausted() {
  rollSpendDay();
  return spend.tokens >= DAILY_TOKEN_BUDGET;
}

function recordUsage(usage) {
  if (!usage) return;
  rollSpendDay();
  spend.tokens += (usage.input_tokens || 0) + (usage.output_tokens || 0);
}

function secondsUntilUtcMidnight() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

/* ── WHERE TO PLUG IN AUTH ─────────────────────────────────────────────── *
 *
 * For a public deployment you almost certainly want one of these two models
 * instead of (or in addition to) plain per-IP rate limiting:
 *
 * (a) Your own accounts. Verify a session cookie or JWT here, before the
 *     rate limiter, and key the rate/spend counters by user id instead of IP:
 *
 *       app.use('/api', (req, res, next) => {
 *         const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
 *         const user = verifySessionToken(token);   // your auth system
 *         if (!user) return res.status(401).json({ error: 'Sign in required.' });
 *         req.user = user;                          // use req.user.id for limits
 *         next();
 *       });
 *
 * (b) Bring-your-own-key. Public users pay for their own usage: the client
 *     sends the user's Anthropic key in an 'x-user-api-key' header (js/api.js
 *     can be extended to forward the stored key in backend mode), and this
 *     server uses it INSTEAD of the server key — skipping the shared daily
 *     budget, since each user spends their own money. Uncomment to enable:
 *
 *       // in callModel(), replace the apiKey selection with:
 *       // const userKey = req.get('x-user-api-key');
 *       // const apiKey = /^sk-ant-[\w-]+$/.test(userKey || '') ? userKey : API_KEY;
 *       // const usingUserKey = apiKey !== API_KEY;
 *       // ...and only call recordUsage()/budgetExhausted() when !usingUserKey.
 *       // (You would thread `req` through handleRequest -> callModel.)
 *
 *     Note the key then transits your server per request but is never stored.
 * ──────────────────────────────────────────────────────────────────────── */

/* ── Anthropic call ────────────────────────────────────────────────────── */

class HttpError extends Error {
  constructor(status, message, retryAfter) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

async function callModel(promptText, maxTokens) {
  if (budgetExhausted()) {
    throw new HttpError(
      429,
      'The daily generation budget for this server is used up — it resets at midnight UTC.',
      secondsUntilUtcMidnight()
    );
  }

  const headers = {
    'content-type': 'application/json',
    'x-api-key': API_KEY,
    'anthropic-version': ANTHROPIC_VERSION,
  };
  const body = {
    model: MODEL,
    max_tokens: Math.min(maxTokens, HARD_TOKEN_CAP),
    messages: [{ role: 'user', content: promptText }],
  };

  /* claude-fable-5 runs safety classifiers that can decline a request with
   * stop_reason 'refusal'. Opting into server-side fallbacks makes the API
   * transparently re-serve such a request on claude-opus-4-8 in the same
   * call. Other models reject the parameter, so it is model-gated. */
  if (MODEL.indexOf('claude-fable-5') === 0) {
    headers['anthropic-beta'] = 'server-side-fallback-2026-06-01';
    body.fallbacks = [{ model: 'claude-opus-4-8' }];
  }

  let res;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new HttpError(502, 'Could not reach the Anthropic API — check the server\'s network connection.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  /* Count spend on every attempt, successful or not. On fallback responses
   * the top-level usage covers the attempt that produced the message, which
   * is accurate enough for a rough daily guard. */
  if (data && data.usage) recordUsage(data.usage);

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new HttpError(502, 'The server\'s Anthropic API key was rejected — check ANTHROPIC_API_KEY.');
    }
    if (res.status === 429) {
      const ra = parseInt(res.headers.get('retry-after'), 10);
      throw new HttpError(
        429,
        'The Anthropic API is rate-limiting this server — please try again shortly.',
        Number.isFinite(ra) && ra > 0 ? ra : 30
      );
    }
    if (res.status === 529 || res.status >= 500) {
      throw new HttpError(503, 'The model is overloaded right now — please try again in a moment.');
    }
    const detail = data && data.error && data.error.message ? ' (' + data.error.message + ')' : '';
    throw new HttpError(502, 'The Anthropic API rejected the request' + detail + '.');
  }

  /* Check stop_reason BEFORE reading content: a refusal returns HTTP 200
   * with empty or partial content. */
  if (data && data.stop_reason === 'refusal') {
    throw new HttpError(502, 'The model declined to generate this content — please try again (a fresh topic is picked automatically).');
  }

  const textBlock =
    data && Array.isArray(data.content)
      ? data.content.find((b) => b && b.type === 'text' && typeof b.text === 'string' && b.text)
      : null;
  if (!textBlock) {
    throw new HttpError(502, 'The model returned an empty response — please try again.');
  }
  return textBlock.text;
}

/* ── JSON extraction + validated generation (mirrors js/api.js) ────────── */

function extractJson(text) {
  let t = String(text).trim();
  t = t.replace(/```[a-zA-Z]*/g, ''); // strip markdown fences if present
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object found');
  return JSON.parse(t.slice(start, end + 1));
}

const JSON_NUDGE =
  '\n\nIMPORTANT: your previous reply was not valid JSON matching the schema. ' +
  'Return ONLY valid JSON matching the schema above. No preamble, no markdown, no backticks.';

/* One initial attempt + one retry with the JSON nudge, then a friendly 502. */
async function generateValidated(promptText, maxTokens, validate) {
  let lastProblem = 'invalid JSON';
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await callModel(attempt === 0 ? promptText : promptText + JSON_NUDGE, maxTokens);
    let obj;
    try {
      obj = extractJson(text);
    } catch (err) {
      lastProblem = 'the reply was not valid JSON';
      continue;
    }
    let problem;
    try {
      problem = validate(obj);
    } catch (err) {
      problem = 'validation failed: ' + (err && err.message ? err.message : 'unknown error');
    }
    if (!problem) return obj;
    lastProblem = problem;
  }
  throw new HttpError(502, 'The model could not produce a valid set (' + lastProblem + ') — please try again.');
}

/* ── Request validation: strict whitelist, reject everything else ──────── */

function unknownKeys(body, allowed) {
  const extra = Object.keys(body).filter((k) => allowed.indexOf(k) === -1);
  return extra.length ? 'Unexpected field: ' + extra[0] : null;
}

function seedProblem(seed) {
  if (seed === undefined) return null;
  if (typeof seed !== 'string' || !/^[a-z0-9-]{1,64}$/i.test(seed)) return 'Invalid seed.';
  return null;
}

function makeSeed() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* Returns { error } or { value } with defaults filled in. */
function validateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object.' };
  }

  if (body.type === 'generate') {
    const extra = unknownKeys(body, ['type', 'partId', 'difficulty', 'avoidTopics', 'seed', 'taskType']);
    if (extra) return { error: extra };
    if (typeof body.partId !== 'string' || PART_IDS.indexOf(body.partId) === -1) {
      return { error: 'Unknown partId.' };
    }
    if (body.taskType !== undefined &&
        (body.partId !== 'wri2' || TASK_TYPES.indexOf(body.taskType) === -1 || body.taskType === 'essay')) {
      return { error: 'taskType is only valid for wri2 and must be email, letter, proposal, report or review.' };
    }
    if (body.difficulty !== undefined && DIFFICULTIES.indexOf(body.difficulty) === -1) {
      return { error: 'Invalid difficulty.' };
    }
    if (body.avoidTopics !== undefined) {
      const ok =
        Array.isArray(body.avoidTopics) &&
        body.avoidTopics.length <= 20 &&
        body.avoidTopics.every((t) => typeof t === 'string' && t.length >= 1 && t.length <= 80);
      if (!ok) return { error: 'avoidTopics must be an array of up to 20 short strings.' };
    }
    const seedErr = seedProblem(body.seed);
    if (seedErr) return { error: seedErr };
    return {
      value: {
        type: 'generate',
        partId: body.partId,
        difficulty: body.difficulty || 'standard',
        avoidTopics: body.avoidTopics || [],
        seed: body.seed || makeSeed(),
        taskType: body.taskType,
      },
    };
  }

  if (body.type === 'assess') {
    const extra = unknownKeys(body, ['type', 'taskType', 'taskPrompt', 'answer']);
    if (extra) return { error: extra };
    if (typeof body.taskType !== 'string' || TASK_TYPES.indexOf(body.taskType) === -1) {
      return { error: 'Invalid taskType.' };
    }
    if (typeof body.taskPrompt !== 'string' || !body.taskPrompt.trim() || body.taskPrompt.length > 4000) {
      return { error: 'taskPrompt must be a non-empty string of at most 4000 characters.' };
    }
    if (typeof body.answer !== 'string' || !body.answer.trim() || body.answer.length > 6000) {
      return { error: 'answer must be a non-empty string of at most 6000 characters.' };
    }
    return {
      value: {
        type: 'assess',
        taskType: body.taskType,
        taskPrompt: body.taskPrompt,
        answer: body.answer,
      },
    };
  }

  if (body.type === 'vocab') {
    const extra = unknownKeys(body, ['type', 'count', 'avoidWords', 'seed', 'word']);
    if (extra) return { error: extra };
    if (body.count !== undefined && (!Number.isInteger(body.count) || body.count < 1 || body.count > 15)) {
      return { error: 'count must be an integer from 1 to 15.' };
    }
    if (body.word !== undefined && (typeof body.word !== 'string' || !body.word.trim() || body.word.length > 60)) {
      return { error: 'word must be a short non-empty string.' };
    }
    if (body.avoidWords !== undefined) {
      const ok = Array.isArray(body.avoidWords) && body.avoidWords.length <= 80 &&
        body.avoidWords.every((t) => typeof t === 'string' && t.length >= 1 && t.length <= 60);
      if (!ok) return { error: 'avoidWords must be an array of up to 80 short strings.' };
    }
    const seedErr = seedProblem(body.seed);
    if (seedErr) return { error: seedErr };
    return {
      value: {
        type: 'vocab',
        count: body.count || 10,
        avoidWords: body.avoidWords || [],
        seed: body.seed || makeSeed(),
        word: body.word,
      },
    };
  }

  if (body.type === 'speaking') {
    const extra = unknownKeys(body, ['type', 'part', 'seed']);
    if (extra) return { error: extra };
    if (!Number.isInteger(body.part) || body.part < 1 || body.part > 4) {
      return { error: 'part must be an integer from 1 to 4.' };
    }
    const seedErr = seedProblem(body.seed);
    if (seedErr) return { error: seedErr };
    return {
      value: { type: 'speaking', part: body.part, seed: body.seed || makeSeed() },
    };
  }

  return { error: "type must be 'generate', 'assess', 'speaking' or 'vocab'." };
}

function speakingValidator(part) {
  return (obj) => {
    if (!obj || typeof obj !== 'object') return 'not an object';
    if (Number(obj.part) !== part) return 'wrong part number';
    if (!Array.isArray(obj.prompts) || obj.prompts.length < 1) return 'missing prompts array';
    if (!obj.prompts.every((p) => typeof p === 'string' && p.trim())) return 'prompts must be non-empty strings';
    return null;
  };
}

/* ── App ───────────────────────────────────────────────────────────────── */

const app = express();
app.disable('x-powered-by');

/* If this server sits behind a reverse proxy (nginx, Cloudflare, a PaaS),
 * uncomment so req.ip reflects the real client for rate limiting:
 *   app.set('trust proxy', 1);
 */

/* CORS: none configured on purpose. The API is same-origin — this server
 * also hosts the static app, so the browser never makes a cross-origin
 * request and other websites cannot call your proxy from their pages.
 * If you deliberately host the app on a different origin, open it up
 * explicitly and narrowly, e.g.:
 *
 *   app.use('/api', (req, res, next) => {
 *     res.set('Access-Control-Allow-Origin', 'https://your-app.example');
 *     res.set('Access-Control-Allow-Headers', 'content-type');
 *     if (req.method === 'OPTIONS') return res.sendStatus(204);
 *     next();
 *   });
 */

/* Small request-body cap: real requests are tiny; 64kb comfortably covers
 * the longest writing answer while blocking junk payloads. */
app.use(express.json({ limit: '64kb' }));

app.post('/api/generate', rateLimit, async (req, res) => {
  try {
    const checked = validateBody(req.body);
    if (checked.error) return res.status(400).json({ error: checked.error });
    const b = checked.value;

    let result;
    if (b.type === 'generate') {
      const def = prompts.PARTS[b.partId];
      const topic = prompts.pickTopic(b.partId, b.avoidTopics);
      const promptText = prompts.buildGeneration(b.partId, {
        topic,
        difficulty: b.difficulty,
        avoid: b.avoidTopics,
        seed: b.seed,
        taskType: b.taskType,
      });
      const maxTokens = Math.min(def.maxTokens || ASSESS_MAX_TOKENS, HARD_TOKEN_CAP);
      const validate = typeof def.validate === 'function' ? (obj) => def.validate(obj) : () => null;
      result = await generateValidated(promptText, maxTokens, validate);
    } else if (b.type === 'assess') {
      const promptText = prompts.buildWritingAssessment({
        taskType: b.taskType,
        taskPrompt: b.taskPrompt,
        answer: b.answer,
      });
      result = await generateValidated(promptText, ASSESS_MAX_TOKENS, (obj) => prompts.validateAssessment(obj));
    } else if (b.type === 'vocab') {
      const promptText = prompts.buildVocab({
        count: b.count, avoid: b.avoidWords, seed: b.seed, word: b.word,
        topic: prompts.pickTopic('vocab', b.avoidWords.slice(0, 12)),
      });
      result = await generateValidated(promptText, 3000, (obj) => prompts.validateVocab(obj));
    } else {
      const promptText = prompts.buildSpeakingPrompts(b.part, { seed: b.seed });
      result = await generateValidated(promptText, SPEAKING_MAX_TOKENS, speakingValidator(b.part));
    }

    res.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Unexpected error on /api/generate:', err);
    res.status(500).json({ error: 'Unexpected server error — please try again.' });
  }
});

/* Anything else under /api is not a thing. */
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

/* Serve the static app from the project root (one level up), so running
 * `node backend/server.js` hosts the whole thing at http://localhost:PORT.
 * There are no secrets in the project files — the key lives only in env. */
app.use(express.static(path.join(__dirname, '..')));

/* Malformed JSON bodies and oversized payloads land here. */
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request too large.' });
  }
  if (err && err.status === 400) {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }
  console.error('Unhandled middleware error:', err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log('CAE Ace backend listening on http://localhost:' + PORT);
  console.log('  model:              ' + MODEL);
  console.log('  rate limit:         ' + RATE_LIMIT + ' requests / ' + RATE_WINDOW_MS / 60000 + ' min per IP');
  console.log('  daily token budget: ' + DAILY_TOKEN_BUDGET + ' tokens (resets at UTC midnight)');
  console.log('  Reminder: NEVER ship the Anthropic key client-side — it stays in ANTHROPIC_API_KEY here.');
  console.log("  Point the app at this proxy: set API_MODE 'backend' in js/config.js");
  console.log("  (or run localStorage.setItem('cae.apiMode', 'backend') in the browser console).");
});
