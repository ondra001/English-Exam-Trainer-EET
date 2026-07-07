/* CAE Ace — Use of English part definitions (rue1–rue4).
 *
 *   rue1  Multiple-choice cloze      — inline numbered gap chips + A–D option groups
 *   rue2  Open cloze                 — inline typed gap inputs
 *   rue3  Word formation             — typed gap inputs with the CAPS root chip beside each
 *   rue4  Key word transformations   — sentence pair + keyword chip + wide gap input
 *
 * Registers defs consumed by the practice runner (CAE.ui.runPart) and the mock
 * test. All set content is model-generated and therefore untrusted: every piece
 * of it goes into the DOM via CAE.util.el() / textContent only.
 */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const { el } = CAE.util;
  const register = CAE.registerPart
    || ((def) => { (CAE.parts = CAE.parts || {})[def.id] = def; });

  // Gap inputs must not fight the typist: exam answers are lowercase words and
  // browser autocorrect/autocapitalise would silently change them.
  function hardenInput(input) {
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');
    return input;
  }

  function appendAll(host, nodes) {
    nodes.forEach((n) => { if (n != null) host.append(n); });
  }

  function headerNodes(set) {
    const nodes = [CAE.ui.instructionsBox(set.instructions || '')];
    if (set.title) nodes.push(el('h3', { class: 'card-title', text: set.title }));
    return nodes;
  }

  // Display string joining the main answer with accepted variants: "which / that".
  function acceptedDisplay(main, accepted) {
    const seen = [];
    const push = (s) => {
      if (typeof s !== 'string') return;
      const t = s.trim();
      if (t && !seen.some((x) => x.toLowerCase() === t.toLowerCase())) seen.push(t);
    };
    push(main);
    (Array.isArray(accepted) ? accepted : []).forEach(push);
    return seen.join(' / ');
  }

  function readAnswer(answers, number) {
    const v = answers ? answers[number] : undefined;
    return v == null ? '' : String(v).trim();
  }

  function tally(items) {
    return { score: items.filter((i) => i.correct).length, total: items.length, items };
  }

  /* ------------- shared typed-cloze machinery (rue2 / rue3) ------------- */

  // extraFor(gapNumber) may return a node rendered beside the input (rue3 root chip).
  function renderTypedCloze(set, host, extraFor) {
    host.textContent = '';
    const inputs = {};
    const nodes = headerNodes(set);
    nodes.push(CAE.ui.renderGappedText(set.text || '', (n) => {
      const num = Number(n);
      const input = hardenInput(CAE.ui.gapInput(num));
      inputs[num] = input;
      const extra = extraFor ? extraFor(num) : null;
      return extra ? el('span', {}, input, ' ', extra) : input;
    }));
    appendAll(host, nodes);
    return {
      getAnswers() {
        const out = {};
        Object.keys(inputs).forEach((k) => { out[k] = inputs[k].value.trim(); });
        return out;
      },
      unanswered() {
        return Object.keys(inputs).filter((k) => !inputs[k].value.trim()).length;
      },
    };
  }

  function markTypedCloze(set, answers, promptFor) {
    return tally((set.answers || []).map((item) => {
      const user = readAnswer(answers, item.number);
      const correct = !!user && CAE.marking.typedCorrect(user, item);
      return {
        number: item.number,
        prompt: promptFor(item),
        userAnswer: user,
        correctAnswer: acceptedDisplay(item.answer, item.accepted),
        correct,
        explanation: item.explanation || '',
      };
    }));
  }

  /* --------------------- rue1 — multiple-choice cloze -------------------- */

  register({
    id: 'rue1',

    render(set, host) {
      host.textContent = '';
      const questions = (set.questions || []).slice().sort((a, b) => a.number - b.number);
      const byNumber = {};
      questions.forEach((q) => { byNumber[q.number] = q; });
      const chips = {};
      const groups = {};
      const blocks = {};

      const jumpTo = (num) => {
        const block = blocks[num];
        if (!block) return;
        const reduce = window.matchMedia
          && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        block.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      };

      /* Answer-in-place popover: activating a gap number opens its four
       * options right beside the text, so the passage never leaves the
       * screen. The popover clicks the matching option button in the list
       * below — one source of truth, marking logic untouched. */
      let pop = null;
      const closePop = () => {
        if (!pop) return;
        pop.remove();
        pop = null;
        document.removeEventListener('click', onDocClick, true);
        window.removeEventListener('scroll', closePop, true);
        document.removeEventListener('keydown', onPopKey, true);
      };
      const onDocClick = (e) => { if (pop && !pop.contains(e.target)) closePop(); };
      const onPopKey = (e) => { if (e.key === 'Escape') closePop(); };

      const openPop = (num, chip) => {
        const q = byNumber[num];
        const group = groups[num];
        if (!q || !group) return;
        const anyBtn = group.buttons && (group.buttons.A || group.buttons.B);
        if (anyBtn && anyBtn.disabled) { jumpTo(num); return; } // marked — show the result instead
        if (pop && pop.dataset.gap === String(num)) { closePop(); return; }
        closePop();

        const current = group.getValue();
        pop = el('div', {
          class: 'gap-pop', role: 'menu', data: { gap: String(num) },
          ariaLabel: 'Options for gap ' + num,
        }, el('div', { class: 'gap-pop-head', text: 'Gap ' + num }));
        ['A', 'B', 'C', 'D'].forEach((letter) => {
          const word = q.options ? q.options[letter] : '';
          if (!word) return;
          pop.append(el('button', {
            class: 'gap-pop-opt' + (current === letter ? ' selected' : ''),
            type: 'button', role: 'menuitem',
            on: { click: () => {
              const b = group.buttons && group.buttons[letter];
              if (b) b.click();
              closePop();
            } },
          },
          el('span', { class: 'option-letter', text: letter }),
          el('span', { text: word })));
        });

        document.body.appendChild(pop);
        const r = chip.getBoundingClientRect();
        const pr = pop.getBoundingClientRect();
        const left = Math.min(Math.max(8, r.left - 12), window.innerWidth - pr.width - 8);
        let top = r.bottom + 8;
        if (top + pr.height > window.innerHeight - 8) top = Math.max(8, r.top - pr.height - 8);
        pop.style.left = left + 'px';
        pop.style.top = top + 'px';
        const first = pop.querySelector('.gap-pop-opt.selected') || pop.querySelector('.gap-pop-opt');
        if (first) first.focus();
        setTimeout(() => {
          document.addEventListener('click', onDocClick, true);
          window.addEventListener('scroll', closePop, true);
          document.addEventListener('keydown', onPopKey, true);
        }, 0);
      };
      window.addEventListener('hashchange', closePop, { once: true });

      // Reflect the chosen word inside the text so the passage can be re-read
      // in context; fall back to the bare number while unanswered.
      const setChip = (num, letter) => {
        const chip = chips[num];
        const q = byNumber[num];
        if (!chip || !q) return;
        const word = letter && q.options ? q.options[letter] || '' : '';
        chip.textContent = word ? num + ' · ' + word : String(num);
        chip.setAttribute('aria-label',
          'Gap ' + num + (word ? ' — chosen: ' + word : ' — not answered yet')
          + '. Activate to choose a word.');
      };

      const nodes = headerNodes(set);
      nodes.push(CAE.ui.renderGappedText(set.text || '', (n) => {
        const num = Number(n);
        const chip = el('span', {
          class: 'gap-num',
          text: String(num),
          role: 'button',
          tabindex: 0,
          ariaLabel: 'Gap ' + num + ' — not answered yet. Activate to choose a word.',
          on: {
            click: () => openPop(num, chip),
            keydown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPop(num, chip); }
            },
          },
        });
        chips[num] = chip;
        return chip;
      }));

      questions.forEach((q) => {
        const group = CAE.ui.optionGroup({
          options: q.options || {},
          name: 'rue1-' + q.number + '-' + CAE.util.uid(),
          onSelect: (letter) => {
            const v = (typeof letter === 'string' && letter) ? letter : group.getValue();
            setChip(q.number, v);
          },
        });
        groups[q.number] = group;
        blocks[q.number] = el('div', { class: 'question-block' },
          el('div', { class: 'q-number', text: 'Gap ' + q.number }),
          group.element);
        nodes.push(blocks[q.number]);
      });

      appendAll(host, nodes);
      return {
        getAnswers() {
          const out = {};
          questions.forEach((q) => {
            const v = groups[q.number].getValue();
            if (v) out[q.number] = v;
          });
          return out;
        },
        unanswered() {
          return questions.filter((q) => !groups[q.number].getValue()).length;
        },
      };
    },

    mark(set, answers) {
      return tally((set.questions || []).map((q) => {
        const user = readAnswer(answers, q.number).toUpperCase();
        const opts = q.options || {};
        const describe = (letter) => (letter ? letter + (opts[letter] ? ' — ' + opts[letter] : '') : '');
        return {
          number: q.number,
          prompt: 'Gap ' + q.number,
          userAnswer: describe(user),
          correctAnswer: describe(String(q.answer || '').toUpperCase()),
          correct: !!user && CAE.marking.letterCorrect(user, q.answer),
          explanation: q.explanation || '',
        };
      }));
    },
  });

  /* -------------------------- rue2 — open cloze -------------------------- */

  register({
    id: 'rue2',

    render(set, host) {
      return renderTypedCloze(set, host, null);
    },

    mark(set, answers) {
      return markTypedCloze(set, answers, (item) => 'Gap ' + item.number);
    },
  });

  /* ------------------------ rue3 — word formation ------------------------ */

  register({
    id: 'rue3',

    render(set, host) {
      const roots = {};
      (set.answers || []).forEach((a) => { roots[a.number] = a.root; });
      return renderTypedCloze(set, host, (num) => {
        const root = String(roots[num] || '').toUpperCase();
        if (!root) return null;
        return el('span', { class: 'chip', text: root, title: 'Root word for gap ' + num });
      });
    },

    mark(set, answers) {
      return markTypedCloze(set, answers, (item) => 'Gap ' + item.number
        + (item.root ? ' (' + String(item.root).toUpperCase() + ')' : ''));
    },
  });

  /* ------------------ rue4 — key word transformations -------------------- */

  register({
    id: 'rue4',

    render(set, host) {
      host.textContent = '';
      const inputs = {};
      const nodes = [CAE.ui.instructionsBox(set.instructions || '')];
      const items = (set.items || []).slice().sort((a, b) => a.number - b.number);

      items.forEach((item) => {
        const input = hardenInput(CAE.ui.gapInput(item.number));
        input.style.width = '18em';
        input.style.maxWidth = '100%';
        input.placeholder = '3–6 words';
        inputs[item.number] = input;

        const s2 = String(item.sentence2 || '');
        const gapAt = s2.indexOf('[[GAP]]');
        const p2 = el('p');
        if (gapAt === -1) {
          appendAll(p2, [s2, ' ', input]);
        } else {
          appendAll(p2, [s2.slice(0, gapAt), input, s2.slice(gapAt + '[[GAP]]'.length)]);
        }

        nodes.push(el('div', { class: 'kwt-item' },
          el('div', { class: 'q-number', text: String(item.number) }),
          el('p', { text: item.sentence1 || '' }),
          el('p', {},
            el('span', { class: 'chip' },
              el('strong', { text: String(item.keyword || '').toUpperCase() }))),
          p2));
      });

      appendAll(host, nodes);
      return {
        getAnswers() {
          const out = {};
          Object.keys(inputs).forEach((k) => { out[k] = inputs[k].value.trim(); });
          return out;
        },
        unanswered() {
          return Object.keys(inputs).filter((k) => !inputs[k].value.trim()).length;
        },
      };
    },

    mark(set, answers) {
      return tally((set.items || []).map((item) => {
        const user = readAnswer(answers, item.number);
        const res = user
          ? (CAE.marking.kwtCorrect(user, item) || { correct: false })
          : { correct: false };
        const correct = !!res.correct;

        // kwtCorrect explains keyword / 3–6-word failures; surface that reason
        // ahead of the item's own explanation so the student learns the rule.
        let explanation = item.explanation || '';
        if (!correct && user && res.reason) {
          let prefix = String(res.reason).trim();
          if (prefix && !/[.!?]$/.test(prefix)) prefix += '.';
          explanation = explanation ? prefix + ' ' + explanation : prefix;
        }

        return {
          number: item.number,
          prompt: (item.sentence1 || '') + ' — key word: '
            + String(item.keyword || '').toUpperCase(),
          userAnswer: user,
          correctAnswer: acceptedDisplay(null, item.accepted),
          correct,
          explanation,
        };
      }));
    },
  });
})();
