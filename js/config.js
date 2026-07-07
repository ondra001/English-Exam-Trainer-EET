/* CAE Ace — configuration.
 *
 * ── HOW API ACCESS WORKS ────────────────────────────────────────────────────
 * All model calls go through CAE.api.callModel() (js/api.js), which reads the
 * values below. Three modes:
 *
 *   'direct'  — the browser calls the Anthropic API itself using the key the
 *               user pastes into Settings (stored only in this browser's
 *               localStorage). ONLY for private, personal use: anyone who can
 *               open devtools on your machine can read the key.
 *   'backend' — the browser calls YOUR server at BACKEND_BASE (see
 *               backend/server.js). The Anthropic key lives only on the
 *               server. THIS is the mode any public / Google Play build must
 *               ship with — never ship an Anthropic key inside the app.
 *   'mock'    — offline fixtures from js/mock.js; for development/demo only.
 *
 * To publish publicly: set API_MODE to 'backend', deploy backend/server.js
 * (see README.md), and you're done — no other code changes are needed.
 * For local testing you can also override the mode without editing this file:
 *   localStorage.setItem('cae.apiMode', 'mock')   // or 'direct' / 'backend'
 * ───────────────────────────────────────────────────────────────────────────
 */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const API_MODE = 'direct'; // private build default; use 'backend' for any public build

  CAE.config = {
    API_MODE,
    mode() {
      try {
        const o = localStorage.getItem('cae.apiMode');
        if (o === 'direct' || o === 'backend' || o === 'mock') return o;
      } catch (e) { /* storage unavailable */ }
      return API_MODE;
    },

    API_BASE: 'https://api.anthropic.com/v1/messages',
    BACKEND_BASE: '/api/generate',
    MODEL: 'claude-opus-4-8',

    /* Free engine: Google Gemini's free tier (aistudio.google.com). Users pick
     * the provider in Settings; both keys stay in this browser only. */
    GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models/',
    GEMINI_MODEL: 'gemini-2.5-flash',
    ANTHROPIC_VERSION: '2023-06-01',
    DEFAULT_MAX_TOKENS: 8000,

    TOPICS: [
      'science', 'culture', 'work', 'environment', 'technology',
      'travel', 'psychology', 'history', 'arts',
    ],
    ANGLES: [
      'an unexpected discovery', 'a controversial trend', 'everyday life',
      'a personal journey', 'the near future', 'a surprising tradition',
      'city versus countryside', 'learning a skill', 'a famous failure',
      'behind the scenes', 'a changing industry', 'an unusual community',
      'the science behind it', 'a revival of something old', 'crossing cultures',
    ],

    PASS_SCORE: 180,
    C2_SCORE: 200,
    SCALE_MIN: 142,
    SCALE_MAX: 210,

    APP_NAME: 'Cambridge Trainer',
    VERSION: '1.1.0',
  };
})();
