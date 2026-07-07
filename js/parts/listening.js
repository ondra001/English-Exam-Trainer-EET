/* CAE Ace — Listening paper (Parts 1–4): lis1..lis4.
 *
 * Contains a module-internal speechSynthesis player (no audio files needed).
 * Scripts stay hidden during the task; the transcript is revealed after marking.
 */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
  const CHUNK_LEN = 200; // long utterances silently die in some engines; keep chunks short

  /* ------------------------------------------------------------------ */
  /* Voices — getVoices() is empty until 'voiceschanged' in Chrome, so    */
  /* cache eagerly, refresh on the event, and re-check lazily at play.    */
  /* ------------------------------------------------------------------ */

  let voiceCache = [];
  function refreshVoices() {
    if (!synth) return;
    try { voiceCache = synth.getVoices() || []; } catch (e) { voiceCache = []; }
  }
  if (synth) {
    refreshVoices();
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', refreshVoices);
    } else {
      synth.onvoiceschanged = refreshVoices;
    }
  }

  function englishVoices() {
    if (!voiceCache.length) refreshVoices();
    return voiceCache.filter((v) => /^en([-_]|$)/i.test(v.lang || ''));
  }

  function preferredVoice() {
    if (!voiceCache.length) refreshVoices();
    const want = String(CAE.storage.getSettings().listenVoice || '').trim().toLowerCase();
    if (want) {
      const hit = voiceCache.find((v) => (v.name || '').toLowerCase() === want) ||
                  voiceCache.find((v) => (v.name || '').toLowerCase().indexOf(want) !== -1);
      if (hit) return hit;
    }
    const en = englishVoices();
    return en.find((v) => /^en[-_]gb/i.test(v.lang || '')) ||
           en.find((v) => /^en[-_]us/i.test(v.lang || '')) ||
           en[0] || null;
  }

  // Distinct voice per speaker where possible; a single-voice engine falls
  // back to distinct pitches so a dialogue is still followable by ear.
  function assignVoices(speakers) {
    const map = {};
    const primary = preferredVoice();
    if (speakers.length < 2) {
      speakers.forEach((sp) => { map[sp] = { voice: primary, pitch: 1 }; });
      return map;
    }
    const pool = [];
    if (primary) pool.push(primary);
    englishVoices().forEach((v) => { if (pool.indexOf(v) === -1) pool.push(v); });
    const pitches = [1, 0.85, 1.12, 0.92, 1.06];
    speakers.forEach((sp, i) => {
      if (pool.length >= 2) {
        // wrap around the pool; if there are more speakers than voices, vary
        // pitch on each wrap so reused voices still sound different
        map[sp] = {
          voice: pool[i % pool.length],
          pitch: pitches[Math.floor(i / pool.length) % pitches.length],
        };
      } else {
        map[sp] = { voice: primary, pitch: pitches[i % pitches.length] };
      }
    });
    return map;
  }

  /* ------------------------------------------------------------------ */
  /* Text chunking — sentence boundaries, ~200 chars per utterance        */
  /* ------------------------------------------------------------------ */

  function splitSentences(text) {
    const t = String(text || '').trim();
    if (!t) return [];
    const m = t.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g);
    return m ? m.map((s) => s.trim()).filter(Boolean) : [t];
  }

  function hardSplit(sentence) {
    const pieces = [];
    let rest = sentence;
    while (rest.length > CHUNK_LEN + 60) {
      let cut = rest.lastIndexOf(' ', CHUNK_LEN);
      if (cut < 40) cut = CHUNK_LEN;
      pieces.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) pieces.push(rest);
    return pieces;
  }

  function chunkText(text) {
    const chunks = [];
    let cur = '';
    const flush = () => { if (cur) chunks.push(cur); cur = ''; };
    splitSentences(text).forEach((sentence) => {
      hardSplit(sentence).forEach((piece) => {
        if (cur && cur.length + piece.length + 1 > CHUNK_LEN) flush();
        cur = cur ? cur + ' ' + piece : piece;
      });
    });
    flush();
    return chunks;
  }

  /* ------------------------------------------------------------------ */
  /* Player registry + global cleanup                                     */
  /* ------------------------------------------------------------------ */

  const players = new Set();

  function stopAllPlayers() {
    players.forEach((p) => {
      p.halt('Stopped.');
      if (p.element && !p.element.isConnected) players.delete(p);
    });
    if (synth) {
      try { synth.cancel(); } catch (e) { /* some engines throw when idle */ }
    }
  }

  // CRITICAL: never let TTS keep talking after the user navigates away.
  window.addEventListener('hashchange', stopAllPlayers);

  /* ------------------------------------------------------------------ */
  /* The player                                                           */
  /* ------------------------------------------------------------------ */

  function createPlayer(script) {
    const el = CAE.util.el;
    const scriptArr = (Array.isArray(script) ? script : [])
      .filter((seg) => seg && String(seg.text || '').trim());

    const root = el('div', { class: 'player' });

    if (!synth) {
      root.appendChild(el('p', { class: 'muted small' },
        "This browser doesn't support speech synthesis, so the recording can't be played aloud. " +
        'You can still attempt the questions — the transcript is revealed after you check your answers.'));
      return { element: root, destroy() {}, halt() {} };
    }
    if (!scriptArr.length) {
      root.appendChild(el('p', { class: 'muted small' }, 'No audio script was provided for this recording.'));
      return { element: root, destroy() {}, halt() {} };
    }

    let playing = false;
    let plays = 0;        // completed plays only — stopping mid-way doesn't count
    let session = 0;      // invalidates stale onend/onerror after cancel()
    let resumeTimer = null;
    let keepAlive = null; // holds utterances so Chrome's GC can't kill onend mid-speech

    root.classList.add('player-deck');

    const playBtn = el('button', {
      class: 'player-btn player-btn-play', type: 'button', ariaLabel: 'Play recording',
    }, '▶');
    const stopBtn = el('button', {
      class: 'player-btn player-btn-stop', type: 'button', disabled: true, ariaLabel: 'Stop playback',
    }, '■');
    const playsEl = el('span', { class: 'player-plays' }, '');
    const statusEl = el('p', { class: 'player-status', attr: { 'aria-live': 'polite' } }, '');
    const eq = el('span', { class: 'player-eq', attr: { 'aria-hidden': 'true' } },
      el('i'), el('i'), el('i'));

    root.appendChild(el('div', { class: 'player-controls' }, playBtn, stopBtn));
    root.appendChild(el('div', { class: 'player-meta' },
      el('div', { class: 'player-topline' },
        el('span', { class: 'player-tracklabel' }, eq, 'Recording'),
        playsEl),
      statusEl));

    const cfg = () => CAE.storage.getSettings();

    function renderState(customStatus) {
      const s = cfg();
      root.classList.toggle('is-playing', playing);
      const lockedOut = !playing && s.playTwice && s.strictTiming && plays >= 2;
      playBtn.disabled = playing || lockedOut;
      playBtn.title = lockedOut
        ? 'In the real exam each recording is played twice only. Turn off strict timing in Settings to listen again.'
        : (playing ? 'Playing' : (plays > 0 ? 'Play the recording again' : 'Play the recording'));
      stopBtn.disabled = !playing;
      playsEl.textContent = s.playTwice
        ? plays + ' / 2 plays'
        : plays + (plays === 1 ? ' play' : ' plays');
      if (customStatus !== undefined) { statusEl.textContent = customStatus; return; }
      if (playing) { statusEl.textContent = 'Playing…'; return; }
      if (plays === 0) {
        statusEl.textContent = s.playTwice
          ? 'Ready — in the exam you hear each recording twice.'
          : 'Ready.';
      } else if (s.playTwice) {
        statusEl.textContent = plays <= 2
          ? 'Played ' + plays + ' of 2'
          : 'Played ' + plays + ' — the exam allows only 2';
      } else {
        statusEl.textContent = 'Played ' + plays + (plays === 1 ? ' time' : ' times');
      }
    }

    function clearResume() {
      if (resumeTimer) { clearInterval(resumeTimer); resumeTimer = null; }
    }

    function finish(mySession) {
      if (mySession !== session || !playing) return;
      playing = false;
      clearResume();
      keepAlive = null;
      plays += 1;
      renderState();
    }

    // Stop without counting a completed play. Does NOT call synth.cancel()
    // itself — callers decide (a global cancel would cut off other players).
    function halt(customStatus) {
      session += 1;
      const was = playing;
      playing = false;
      clearResume();
      keepAlive = null;
      if (was) renderState(customStatus);
    }

    function buildQueue(rate) {
      const speakers = [];
      scriptArr.forEach((seg) => {
        const name = String(seg.speaker || 'Narrator');
        if (speakers.indexOf(name) === -1) speakers.push(name);
      });
      const cast = assignVoices(speakers);
      const queue = [];
      scriptArr.forEach((seg) => {
        const part = cast[String(seg.speaker || 'Narrator')] || { voice: null, pitch: 1 };
        chunkText(seg.text).forEach((chunk) => {
          const u = new SpeechSynthesisUtterance(chunk);
          if (part.voice) {
            u.voice = part.voice;
            u.lang = part.voice.lang || 'en-GB';
          } else {
            u.lang = 'en-GB';
          }
          u.pitch = part.pitch;
          u.rate = rate;
          queue.push(u);
        });
      });
      return queue;
    }

    function play() {
      if (playing) return;
      const s = cfg();
      if (s.playTwice && s.strictTiming && plays >= 2) return; // button disabled; belt & braces
      refreshVoices();
      stopAllPlayers(); // one global audio channel — silence any other player first
      session += 1;
      const mySession = session;
      const rate = CAE.util.clamp(Number(s.listenRate) || 1, 0.5, 2);
      const queue = buildQueue(rate);
      if (!queue.length) { renderState('Nothing to play.'); return; }
      queue[queue.length - 1].onend = () => finish(mySession);
      queue[queue.length - 1].onerror = () => {
        // real failure (not our own cancel — that bumps `session` first)
        if (mySession === session && playing) halt('Playback failed — press Play to try again.');
      };
      keepAlive = queue;
      playing = true;
      renderState();
      // Some engines drop speak() issued immediately after cancel(); breathe first.
      setTimeout(() => {
        if (mySession !== session) return;
        queue.forEach((u) => {
          try { synth.speak(u); } catch (e) { /* skip a bad chunk rather than die */ }
        });
        clearResume();
        let idleTicks = 0;
        resumeTimer = setInterval(() => {
          if (mySession !== session || !playing) { clearResume(); return; }
          if (!root.isConnected) {
            // view was replaced without a hashchange (e.g. mock test advanced)
            halt();
            try { synth.cancel(); } catch (e) { /* ignore */ }
            return;
          }
          let busy = false;
          try { busy = synth.speaking || synth.pending; } catch (e) { busy = false; }
          if (busy) {
            idleTicks = 0;
            // Chrome quirk: long sessions silently pause; periodic resume() unsticks them.
            try { synth.resume(); } catch (e) { /* ignore */ }
          } else {
            idleTicks += 1;
            if (idleTicks >= 2) finish(mySession); // engine never fired onend
          }
        }, 3000);
      }, 60);
    }

    function stopClicked() {
      if (!playing) return;
      halt('Stopped.');
      try { synth.cancel(); } catch (e) { /* ignore */ }
    }

    playBtn.addEventListener('click', play);
    stopBtn.addEventListener('click', stopClicked);

    const api = {
      element: root,
      halt,
      destroy() {
        const was = playing;
        halt();
        if (was) {
          try { synth.cancel(); } catch (e) { /* ignore */ }
        }
        players.delete(api);
      },
    };

    // prune players whose DOM is long gone (previous sets in this view)
    players.forEach((p) => {
      if (p !== api && p.element && !p.element.isConnected) players.delete(p);
    });
    players.add(api);

    renderState();
    return api;
  }

  /* ------------------------------------------------------------------ */
  /* Shared marking / transcript helpers                                  */
  /* ------------------------------------------------------------------ */

  function letterDisplay(letter, options) {
    if (!letter) return '';
    const text = options && options[letter];
    return text ? letter + ' — ' + text : letter;
  }

  function markMcq(questions, answers) {
    const items = (questions || []).map((q) => {
      const user = String(answers[q.number] || '').toUpperCase();
      const key = String(q.answer || '').toUpperCase();
      return {
        number: q.number,
        prompt: q.question || ('Question ' + q.number),
        userAnswer: user ? letterDisplay(user, q.options) : '',
        correctAnswer: letterDisplay(key, q.options),
        correct: user ? CAE.marking.letterCorrect(user, key) : false,
        explanation: q.explanation || '',
      };
    });
    return { score: items.filter((i) => i.correct).length, total: items.length, items };
  }

  function speakerLine(speaker, text) {
    const el = CAE.util.el;
    return el('p', { class: 'speaker-line' },
      el('span', { class: 'speaker' }, String(speaker || 'Speaker')),
      String(text || ''));
  }

  function transcriptFor(partId, set) {
    const el = CAE.util.el;
    if (partId === 'lis2' || partId === 'lis3') {
      return CAE.ui.transcript(set.script || []);
    }
    const wrap = el('div', { class: 'transcript' });
    if (partId === 'lis1') {
      (set.extracts || []).forEach((ex, i) => {
        wrap.appendChild(el('p', { class: 'overline ts-extract' }, 'Extract ' + (ex.id || i + 1)));
        if (ex.situation) wrap.appendChild(el('p', { class: 'extract-situation' }, ex.situation));
        (ex.script || []).forEach((line) => wrap.appendChild(speakerLine(line.speaker, line.text)));
      });
    } else { // lis4
      (set.extracts || []).forEach((ex, i) => {
        wrap.appendChild(speakerLine(ex.speakerLabel || ('Speaker ' + (ex.id || i + 1)), ex.text));
      });
    }
    return wrap;
  }

  function makeAfterMark(partId) {
    return function afterMark(set, host) {
      const el = CAE.util.el;
      host.appendChild(el('section', { class: 'card' },
        el('h3', { class: 'card-title' }, 'Tapescript'),
        el('p', { class: 'muted small' },
          'Kept sealed during the task, just as in the exam hall — open it to check what you heard.'),
        el('details', {},
          el('summary', {}, 'Reveal the tapescript'),
          transcriptFor(partId, set))));
    };
  }

  function register(def) {
    if (typeof CAE.registerPart === 'function') {
      CAE.registerPart(def);
    } else {
      CAE.parts = CAE.parts || {};
      CAE.parts[def.id] = def;
    }
  }

  function questionBlock(q, optionGroupEl) {
    const el = CAE.util.el;
    return el('div', { class: 'question-block' },
      el('p', {},
        el('strong', { class: 'q-number' }, String(q.number)),
        String(q.question || '')),
      optionGroupEl);
  }

  /* ------------------------------------------------------------------ */
  /* Part 1 — three extracts, 2 MCQs each (A–C)                           */
  /* ------------------------------------------------------------------ */

  register({
    id: 'lis1',
    render(set, host) {
      const el = CAE.util.el;
      const groups = {};
      host.appendChild(CAE.ui.instructionsBox(set.instructions ||
        'You will hear three short extracts. For each question, choose the answer (A, B or C) which fits best according to what you hear.'));
      (set.extracts || []).forEach((ex, i) => {
        const card = el('section', { class: 'card extract-block' },
          el('h3', { class: 'card-title' }, 'Extract ' + (ex.id || i + 1)),
          ex.situation ? el('p', { class: 'extract-situation' }, ex.situation) : null,
          createPlayer(ex.script).element);
        (ex.questions || []).forEach((q) => {
          const og = CAE.ui.optionGroup({
            options: q.options || {},
            name: 'lis1-q' + q.number + '-' + CAE.util.uid(),
          });
          groups[q.number] = og;
          card.appendChild(questionBlock(q, og.element));
        });
        host.appendChild(card);
      });
      return {
        getAnswers() {
          const out = {};
          Object.keys(groups).forEach((n) => { out[n] = groups[n].getValue() || ''; });
          return out;
        },
        unanswered() {
          return Object.keys(groups).filter((n) => !groups[n].getValue()).length;
        },
      };
    },
    mark(set, answers) {
      const flat = [];
      (set.extracts || []).forEach((ex, i) => {
        (ex.questions || []).forEach((q) => {
          flat.push(Object.assign({}, q, {
            question: 'Extract ' + (ex.id || i + 1) + ': ' + String(q.question || ''),
          }));
        });
      });
      return markMcq(flat, answers);
    },
    afterMark: makeAfterMark('lis1'),
    renderTranscript(set) { return transcriptFor('lis1', set); },
  });

  /* ------------------------------------------------------------------ */
  /* Part 2 — monologue, 8 sentence-completion gaps                       */
  /* ------------------------------------------------------------------ */

  register({
    id: 'lis2',
    render(set, host) {
      const el = CAE.util.el;
      const inputs = {};
      host.appendChild(CAE.ui.instructionsBox(set.instructions ||
        'You will hear a monologue. Complete each sentence with a word or short phrase.'));
      const card = el('section', { class: 'card' },
        set.situation ? el('p', { class: 'extract-situation' }, set.situation) : null,
        createPlayer(set.script).element);
      const list = el('div', { class: 'stack' });
      (set.questions || []).forEach((q) => {
        const input = CAE.ui.gapInput(q.number, { width: 16 });
        inputs[q.number] = input;
        const line = el('div', { class: 'question-block' },
          el('strong', { class: 'q-number' }, String(q.number)));
        const pieces = String(q.sentence || '').split('[[GAP]]');
        pieces.forEach((txt, i) => {
          if (i === 1) line.appendChild(input);
          else if (i > 1) line.appendChild(el('span', { class: 'muted' }, ' ______ '));
          if (txt) line.appendChild(document.createTextNode(txt));
        });
        if (pieces.length === 1) {
          // model omitted the marker — still give the candidate somewhere to type
          line.appendChild(document.createTextNode(' '));
          line.appendChild(input);
        }
        list.appendChild(line);
      });
      card.appendChild(list);
      host.appendChild(card);
      return {
        getAnswers() {
          const out = {};
          Object.keys(inputs).forEach((n) => { out[n] = String(inputs[n].value || '').trim(); });
          return out;
        },
        unanswered() {
          return Object.keys(inputs).filter((n) => !String(inputs[n].value || '').trim()).length;
        },
      };
    },
    mark(set, answers) {
      const items = (set.questions || []).map((q) => {
        const user = String(answers[q.number] || '').trim();
        const accepted = (q.accepted || []).filter(Boolean);
        return {
          number: q.number,
          prompt: 'Q' + q.number + ': ' + String(q.sentence || '').split('[[GAP]]').join('______'),
          userAnswer: user,
          correctAnswer: String(q.answer || '') +
            (accepted.length ? ' (also accepted: ' + accepted.join(', ') + ')' : ''),
          correct: user
            ? CAE.marking.typedCorrect(user, { answer: q.answer, accepted })
            : false,
          explanation: q.explanation || '',
        };
      });
      return { score: items.filter((i) => i.correct).length, total: items.length, items };
    },
    afterMark: makeAfterMark('lis2'),
    renderTranscript(set) { return transcriptFor('lis2', set); },
  });

  /* ------------------------------------------------------------------ */
  /* Part 3 — interview/dialogue, 6 MCQs (A–D)                            */
  /* ------------------------------------------------------------------ */

  register({
    id: 'lis3',
    render(set, host) {
      const el = CAE.util.el;
      const groups = {};
      host.appendChild(CAE.ui.instructionsBox(set.instructions ||
        'You will hear an interview. For each question, choose the answer (A, B, C or D) which fits best according to what you hear.'));
      const card = el('section', { class: 'card' },
        set.situation ? el('p', { class: 'extract-situation' }, set.situation) : null,
        createPlayer(set.script).element);
      (set.questions || []).forEach((q) => {
        const og = CAE.ui.optionGroup({
          options: q.options || {},
          name: 'lis3-q' + q.number + '-' + CAE.util.uid(),
        });
        groups[q.number] = og;
        card.appendChild(questionBlock(q, og.element));
      });
      host.appendChild(card);
      return {
        getAnswers() {
          const out = {};
          Object.keys(groups).forEach((n) => { out[n] = groups[n].getValue() || ''; });
          return out;
        },
        unanswered() {
          return Object.keys(groups).filter((n) => !groups[n].getValue()).length;
        },
      };
    },
    mark(set, answers) { return markMcq(set.questions, answers); },
    afterMark: makeAfterMark('lis3'),
    renderTranscript(set) { return transcriptFor('lis3', set); },
  });

  /* ------------------------------------------------------------------ */
  /* Part 4 — five monologues, two matching tasks of 5 (A–H)              */
  /* ------------------------------------------------------------------ */

  const LIS4_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  register({
    id: 'lis4',
    render(set, host) {
      const el = CAE.util.el;
      const selects = {};
      host.appendChild(CAE.ui.instructionsBox(set.instructions ||
        'You will hear five short extracts on the same theme. Complete both tasks: for each speaker, choose the correct option (A–H). Each task has three options you do not need.'));
      if (set.theme) host.appendChild(el('p', { class: 'extract-situation' }, 'Theme: ' + set.theme));

      (set.extracts || []).forEach((ex, i) => {
        const label = ex.speakerLabel || ('Speaker ' + (ex.id || i + 1));
        host.appendChild(el('section', { class: 'card extract-block' },
          el('h3', { class: 'card-title' }, label),
          createPlayer([{ speaker: label, text: ex.text }]).element));
      });

      [set.task1, set.task2].forEach((task, ti) => {
        if (!task) return;
        const letters = Object.keys(task.options || {});
        const useLetters = letters.length ? letters : LIS4_LETTERS;
        const card = el('section', { class: 'card' },
          el('h3', { class: 'card-title' }, 'Task ' + (ti + 1)),
          task.heading ? el('p', { class: 'lis4-heading' }, task.heading) : null);
        const optList = el('div', { class: 'lis4-bank' });
        useLetters.forEach((L) => {
          optList.appendChild(el('div', { class: 'row' },
            el('span', { class: 'option-letter' }, L),
            el('span', {}, String((task.options || {})[L] || ''))));
        });
        card.appendChild(optList);
        card.appendChild(el('p', { class: 'small muted' }, 'Choose one letter for each speaker:'));
        const rows = el('div', { class: 'stack lis4-match' });
        (task.questions || []).forEach((q) => {
          const sel = CAE.ui.selectInput(q.number, useLetters, { placeholder: '—' });
          selects[q.number] = sel;
          rows.appendChild(el('div', { class: 'row' },
            el('span', { class: 'lis4-speaker' }, 'Speaker ' + q.speaker),
            sel));
        });
        card.appendChild(rows);
        host.appendChild(card);
      });

      return {
        getAnswers() {
          const out = {};
          Object.keys(selects).forEach((n) => { out[n] = String(selects[n].value || ''); });
          return out;
        },
        unanswered() {
          return Object.keys(selects).filter((n) => !String(selects[n].value || '')).length;
        },
      };
    },
    mark(set, answers) {
      const items = [];
      [set.task1, set.task2].forEach((task, ti) => {
        if (!task) return;
        (task.questions || []).forEach((q) => {
          const user = String(answers[q.number] || '').toUpperCase();
          const key = String(q.answer || '').toUpperCase();
          items.push({
            number: q.number,
            prompt: 'Task ' + (ti + 1) + ' · Speaker ' + q.speaker +
              (task.heading ? ' — ' + task.heading : ''),
            userAnswer: user ? letterDisplay(user, task.options) : '',
            correctAnswer: letterDisplay(key, task.options),
            correct: user ? CAE.marking.letterCorrect(user, key) : false,
            explanation: q.explanation || '',
          });
        });
      });
      return { score: items.filter((i) => i.correct).length, total: items.length, items };
    },
    afterMark: makeAfterMark('lis4'),
    renderTranscript(set) { return transcriptFor('lis4', set); },
  });
})();
