/* Gemini model resolution + fallback tests.
 *
 *   node tests/gemini-models.test.js
 *
 * No dependencies and no network: it loads the app's real config.js,
 * storage.js, models.js and api.js into a node vm with a fake window,
 * localStorage and fetch, then drives the Gemini path through the failures
 * that actually strand users — a key that is not served the model we asked
 * for, an exhausted per-model free-tier quota, a rejected thinking parameter,
 * a stale pinned model, and a genuinely bad key. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const APP = path.join(__dirname, '..', 'js');

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

let fetchLog = [];
let fetchImpl = async () => { throw new Error('no fetch stub'); };

const sandbox = {
  console,
  localStorage,
  setTimeout,
  clearTimeout,
  Date,
  Math,
  JSON,
  fetch: (...a) => fetchImpl(...a),
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of ['config.js', 'storage.js', 'models.js', 'api.js']) {
  vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), sandbox, { filename: f });
}
const CAE = sandbox.CAE;
const M = CAE.models;

let failures = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { failures++; console.log('FAIL ' + name + '\n  got  ' + JSON.stringify(got) + '\n  want ' + JSON.stringify(want)); }
  else console.log('ok   ' + name);
}

/* ---------- 1. ranking over the real catalogue ---------- */
const CATALOGUE = [
  'models/gemini-3.8-flash', 'models/gemini-3.7-flash', 'models/gemini-3.6-flash',
  'models/gemini-3.5-flash', 'models/gemini-3.5-flash-lite', 'models/gemini-3.1-flash-lite',
  'models/gemini-3.1-pro-preview', 'models/gemini-3-flash-preview', 'models/gemini-2.5-flash',
  'models/gemini-2.5-pro', 'models/gemini-2.5-flash-lite',
  // noise that must be dropped:
  'models/gemini-3.1-flash-image', 'models/gemini-3-pro-image', 'models/gemini-3.5-transcribe',
  'models/gemini-2.5-flash-preview-tts', 'models/gemini-2.5-flash-native-audio-preview-12-2025',
  'models/gemini-embedding-001', 'models/veo-3.1-generate-preview', 'models/gemini-robotics-er-2-preview',
  'models/gemini-3.1-flash-live-preview', 'models/gemini-2.5-computer-use-preview-10-2025',
];
const sorted = M.sortIds(CATALOGUE);
check('best model is the newest stable flash', sorted[0], 'gemini-3.8-flash');
check('flash models rank ahead of pro', sorted.slice(0, 6), [
  'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash',
  'gemini-3-flash-preview', 'gemini-2.5-flash',
]);
check('image/tts/audio/live/embedding/robotics dropped', sorted.filter((i) =>
  /image|tts|transcribe|audio|live|embedding|robotics|veo|computer/.test(i)), []);
check('pro before lite', sorted.indexOf('gemini-2.5-pro') < sorted.indexOf('gemini-3.5-flash-lite'), true);

/* a model released after this code was written must win on its own */
check('unseen future model outranks everything', M.sortIds(CATALOGUE.concat(['models/gemini-4.2-flash']))[0], 'gemini-4.2-flash');
check('stable beats preview at equal version',
  M.sortIds(['gemini-3.6-flash', 'gemini-3.6-flash-preview'])[0], 'gemini-3.6-flash');

/* ---------- 2. thinking config per family ---------- */
check('3.6 uses thinkingLevel', M.thinkingConfig('gemini-3.6-flash'), { thinkingLevel: 'low' });
check('3.8 uses thinkingLevel', M.thinkingConfig('gemini-3.8-flash'), { thinkingLevel: 'low' });
check('4.x (future) uses thinkingLevel', M.thinkingConfig('gemini-4-flash'), { thinkingLevel: 'low' });
check('2.5 flash disables thinking budget', M.thinkingConfig('gemini-2.5-flash'), { thinkingBudget: 0 });
check('2.5 pro sends nothing (cannot disable)', M.thinkingConfig('gemini-2.5-pro'), undefined);
check('never sends both fields', Object.keys(M.thinkingConfig('gemini-3.6-flash')).length, 1);

/* ---------- 3. error classification ---------- */
const mkErr = (status, detail) => ({ status, detail, message: '' });
check('404 = unavailable', M.looksUnavailable(mkErr(404, 'models/gemini-2.5-flash is not found for API version v1beta')), true);
check('403 naming the model = unavailable', M.looksUnavailable(mkErr(403, 'Caller does not have access to the model')), true);
check('403 naming the key = NOT a model problem', M.looksUnavailable(mkErr(403, 'API key not valid')), false);
check('429 is not a model problem', M.looksUnavailable(mkErr(429, 'Resource has been exhausted')), false);
check('thinking rejection detected', M.looksThinkingRejected(mkErr(400, 'thinking_level is not supported for this model')), true);

/* ---------- 4. the live fallback walk ---------- */
/* Each scenario gets a freshly loaded copy of the app modules, which is what a
 * page reload gives a real user — the "dead this session" set starts empty. */
function fresh() {
  const s = new Map();
  const box = {
    console, setTimeout, clearTimeout, Date, Math, JSON,
    localStorage: {
      getItem: (k) => (s.has(k) ? s.get(k) : null),
      setItem: (k, v) => s.set(k, String(v)),
      removeItem: (k) => s.delete(k),
    },
    fetch: (...a) => fetchImpl(...a),
  };
  box.window = box;
  box.globalThis = box;
  vm.createContext(box);
  for (const f of ['config.js', 'storage.js', 'models.js', 'api.js']) {
    vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), box, { filename: f });
  }
  return box.CAE;
}

let live = CAE; // the CAE instance the most recent scenario ran against

async function run(name, opts) {
  live = fresh();
  live.storage.saveSettings({ provider: 'gemini', geminiKey: 'AIzaTESTKEY', geminiModel: opts.pin || '' });
  fetchLog = [];
  fetchImpl = async (url, init) => {
    fetchLog.push(String(url));
    if (String(url).includes('?pageSize')) {
      if (!opts.listing) return { ok: false, status: 500, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ models: opts.listing.map((n) => ({ name: 'models/' + n, supportedGenerationMethods: ['generateContent'] })) }) };
    }
    const model = String(url).match(/models\/([^:]+):/)[1];
    const verdict = opts.serve(model, JSON.parse(init.body));
    if (verdict === 'ok') {
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"answer":"' + model + '"}' }] } }] }) };
    }
    return { ok: false, status: verdict.status, json: async () => ({ error: { message: verdict.msg, status: 'X' } }) };
  };
  let out;
  try { out = await live.api.callModel('hello', { maxTokens: 100 }); }
  catch (e) { out = 'ERROR:' + e.kind + ':' + e.message; }
  console.log('\n--- ' + name + ' ---');
  console.log('result: ' + out);
  console.log('calls:  ' + fetchLog.map((u) => u.replace('https://generativelanguage.googleapis.com/v1beta/models', '').replace(':generateContent', '')).join('  ->  '));
  return out;
}

(async () => {
  // (a) The reported bug: a NEW key that is not served the hard-wired model.
  //     Old code died here. New code should discover and recover.
  let r = await run('new key: seed models 404, listing offers 3.6', {
    listing: ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-pro'],
    serve: (m) => (m === 'gemini-3.6-flash' ? 'ok'
      : { status: 404, msg: 'models/' + m + ' is not found for API version v1beta' }),
  });
  check('recovers on a key that only has 3.6', r, '{"answer":"gemini-3.6-flash"}');
  check('remembers what worked', live.models.working(), 'gemini-3.6-flash');

  // (b) Same key, second request: must go straight to the known-good model.
  fetchLog = [];
  await live.api.callModel('hello again', { maxTokens: 100 });
  check('second call makes exactly one request', fetchLog.length, 1);
  check('...to the remembered model', /gemini-3.6-flash/.test(fetchLog[0]), true);

  // (c) Per-model daily quota exhausted -> step to the next model, not an error.
  r = await run('free-tier daily quota gone on the top models', {
    listing: ['gemini-3.8-flash', 'gemini-3.6-flash'],
    serve: (m) => (m === 'gemini-3.6-flash' ? 'ok'
      : { status: 429, msg: 'Quota exceeded for quota metric per day' }),
  });
  check('walks past every exhausted model to one with budget left', r, '{"answer":"gemini-3.6-flash"}');
  check('did not give up with a rate-limit error', /ERROR/.test(r), false);

  // (d) Google changes the thinking contract -> retry the same model plainly.
  let sawThinking = null;
  r = await run('model rejects thinkingLevel', {
    listing: ['gemini-3.8-flash'],
    serve: (m, body) => {
      const t = body.generationConfig.thinkingConfig;
      if (t) { sawThinking = t; return { status: 400, msg: 'thinking_level is not supported' }; }
      return 'ok';
    },
  });
  check('retries without thinkingConfig', r, '{"answer":"gemini-3.8-flash"}');
  check('...having first tried thinkingLevel', sawThinking, { thinkingLevel: 'low' });

  // (e) A genuinely bad key must still say "bad key", not "no models".
  r = await run('invalid key', {
    listing: null,
    serve: () => ({ status: 400, msg: 'API key not valid. Please pass a valid API key.' }),
  });
  check('bad key still reported as auth', r.startsWith('ERROR:auth'), true);

  // (f) A pinned model that has been retired must not strand the user.
  r = await run('stale pin', {
    pin: 'gemini-2.0-flash',
    listing: ['gemini-3.6-flash'],
    serve: (m) => (m === 'gemini-2.0-flash' ? { status: 404, msg: 'not found' } : 'ok'),
  });
  check('stale pin falls back instead of bricking', r, '{"answer":"gemini-3.6-flash"}');

  // (g) Everything is dead -> one clear, actionable message.
  r = await run('nothing available at all', {
    listing: null,
    serve: () => ({ status: 404, msg: 'not found' }),
  });
  check('clear final error', /Refresh model list/.test(r), true);
  check('bounded number of attempts', fetchLog.length <= 8, true);

  console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'all checks passed'));
  process.exit(failures ? 1 : 0);
})();
