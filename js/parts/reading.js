/* CAE Ace — Reading parts (Paper 1, Parts 5–8): rue5, rue6, rue7, rue8.
 *
 * Registers part definitions consumed by CAE.ui.runPart(). Each def only
 * renders the generated set and marks the collected answers; the runner
 * drives generate → answer → check → results.
 *
 * Security invariant: all set content is model-generated and UNTRUSTED —
 * every string goes into the DOM via CAE.util.el() text nodes / textContent,
 * never innerHTML.
 */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const util = CAE.util;
  const ui = CAE.ui;

  /* ---------- shared helpers ---------- */

  function paragraphsFrom(text) {
    return String(text == null ? '' : text)
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function serifText(text) {
    return util.el(
      'div',
      { class: 'exercise-text' },
      paragraphsFrom(text).map((p) => util.el('p', { text: p }))
    );
  }

  function titleHeading(text) {
    return util.el('h3', { class: 'card-title', text: String(text) });
  }

  function letterBadge(letter) {
    return util.el('span', { class: 'option-letter', text: String(letter) });
  }

  function extractBlock(letter, heading, text) {
    return util.el(
      'div',
      { class: 'extract-block' },
      util.el(
        'div',
        { class: 'row' },
        letterBadge(letter),
        util.el('strong', { text: String(heading == null ? '' : heading) })
      ),
      paragraphsFrom(text).map((p) => util.el('p', { text: p }))
    );
  }

  function questionBlock(q, groupElement) {
    return util.el(
      'div',
      { class: 'question-block' },
      util.el(
        'p',
        {},
        util.el('span', { class: 'q-number', text: String(q.number) }),
        ' ' + String(q.question == null ? '' : q.question)
      ),
      groupElement
    );
  }

  // Collector shared by the option-group based parts (rue5/6/8).
  function mcCollector() {
    const groups = new Map(); // question number -> optionGroup handle
    return {
      add(number, group) {
        groups.set(number, group);
      },
      getAnswers() {
        const out = {};
        groups.forEach((group, n) => {
          out[n] = String(group.getValue() || '').toUpperCase();
        });
        return out;
      },
      unanswered() {
        let count = 0;
        groups.forEach((group) => {
          if (!group.getValue()) count += 1;
        });
        return count;
      },
    };
  }

  // Generic letter marking for MCQ / matching parts.
  // displayCorrect(letter) may enrich the shown key (e.g. "B — Dr Reyes").
  function markLetterItems(questions, answers, displayCorrect) {
    const list = questions || [];
    let score = 0;
    const items = list.map((q) => {
      const raw = answers && answers[q.number] != null ? answers[q.number] : '';
      const user = String(raw).trim().toUpperCase();
      const key = String(q.answer == null ? '' : q.answer).trim().toUpperCase();
      const correct = !!user && !!key && CAE.marking.letterCorrect(user, key);
      if (correct) score += 1;
      return {
        number: q.number,
        prompt: String(q.question || 'Question ' + q.number),
        userAnswer: user,
        correctAnswer: displayCorrect ? displayCorrect(key) : key,
        correct,
        explanation: String(q.explanation == null ? '' : q.explanation),
      };
    });
    return { score, total: list.length, items };
  }

  // rue8: shrink an optionGroup into a horizontal row of letter-only chips.
  // Option texts are '' — hide any empty text container so only the letter
  // badge shows, without touching whatever element carries the radio input.
  function compactLetterChips(groupElement) {
    groupElement.style.display = 'flex';
    groupElement.style.flexWrap = 'wrap';
    groupElement.style.gap = '0.5rem';
    util.$$('.option', groupElement).forEach((opt) => {
      opt.style.flex = '0 1 auto';
      opt.style.minWidth = '44px';
      opt.style.minHeight = '44px';
      opt.style.justifyContent = 'center';
      const badge = opt.querySelector('.option-letter');
      if (badge && !opt.getAttribute('aria-label')) {
        opt.setAttribute('aria-label', 'Section ' + badge.textContent.trim());
      }
      Array.from(opt.children).forEach((child) => {
        if (badge && (child === badge || child.contains(badge))) return;
        if (child.querySelector('input, select, textarea')) return;
        if (!child.textContent.trim()) child.style.display = 'none';
      });
    });
  }

  /* ---------- Part 5 — Multiple-choice reading ---------- */

  CAE.registerPart({
    id: 'rue5',
    render(set, host) {
      const collector = mcCollector();
      if (set.instructions) host.appendChild(ui.instructionsBox(set.instructions));
      // Desktop: text stays sticky on the left while the questions scroll.
      const textCol = util.el('div', { class: 'split-text' });
      if (set.title) textCol.appendChild(titleHeading(set.title));
      textCol.appendChild(serifText(set.text));
      const qCol = util.el('div', { class: 'split-q' });
      (set.questions || []).forEach((q) => {
        const group = ui.optionGroup({
          options: q.options || {},
          name: 'rue5-q' + q.number + '-' + util.uid(),
          onSelect: () => {},
        });
        collector.add(q.number, group);
        qCol.appendChild(questionBlock(q, group.element));
      });
      host.appendChild(util.el('div', { class: 'split-view' }, textCol, qCol));
      return collector;
    },
    mark(set, answers) {
      return markLetterItems(set.questions || [], answers);
    },
  });

  /* ---------- Part 6 — Cross-text multiple matching ---------- */

  CAE.registerPart({
    id: 'rue6',
    render(set, host) {
      const collector = mcCollector();
      const texts = set.texts || [];
      if (set.instructions) host.appendChild(ui.instructionsBox(set.instructions));
      const textCol = util.el('div', { class: 'split-text' });
      if (set.theme) textCol.appendChild(titleHeading(set.theme));
      texts.forEach((t) => {
        textCol.appendChild(extractBlock(String(t.id || '').toUpperCase(), t.author, t.text));
      });
      // Options carry the author names so the choice reads naturally.
      const options = {};
      texts.forEach((t) => {
        options[String(t.id || '').toUpperCase()] = String(t.author == null ? '' : t.author);
      });
      const qCol = util.el('div', { class: 'split-q' });
      (set.questions || []).forEach((q) => {
        const group = ui.optionGroup({
          options,
          name: 'rue6-q' + q.number + '-' + util.uid(),
          onSelect: () => {},
        });
        collector.add(q.number, group);
        qCol.appendChild(questionBlock(q, group.element));
      });
      host.appendChild(util.el('div', { class: 'split-view' }, textCol, qCol));
      return collector;
    },
    mark(set, answers) {
      const authorOf = {};
      (set.texts || []).forEach((t) => {
        authorOf[String(t.id || '').toUpperCase()] = String(t.author == null ? '' : t.author);
      });
      return markLetterItems(set.questions || [], answers, (letter) =>
        authorOf[letter] ? letter + ' — ' + authorOf[letter] : letter
      );
    },
  });

  /* ---------- Part 7 — Gapped text ---------- */

  CAE.registerPart({
    id: 'rue7',
    render(set, host) {
      const paragraphs = set.paragraphs || [];
      const letters = paragraphs
        .map((p) => String(p.letter || '').toUpperCase())
        .filter(Boolean);
      const selects = new Map(); // gap number -> <select>
      const chips = new Map(); // letter -> placement chip element

      // Duplicates are deliberately allowed until marking (candidates change
      // their minds); the chips only signal where each letter currently sits.
      function updatePlacements() {
        const placed = new Map();
        selects.forEach((sel, n) => {
          const v = String(sel.value || '').toUpperCase();
          if (!v) return;
          if (!placed.has(v)) placed.set(v, []);
          placed.get(v).push(n);
        });
        chips.forEach((chip, letter) => {
          const gaps = (placed.get(letter) || []).slice().sort((a, b) => a - b);
          if (gaps.length === 0) {
            chip.textContent = '';
            chip.classList.add('hidden');
          } else {
            chip.textContent =
              gaps.length === 1
                ? 'Placed in gap ' + gaps[0]
                : 'Placed in gaps ' + gaps.join(', ');
            chip.classList.remove('hidden');
          }
        });
      }

      if (set.instructions) host.appendChild(ui.instructionsBox(set.instructions));
      const textCol = util.el('div', { class: 'split-text' });
      if (set.title) textCol.appendChild(titleHeading(set.title));

      textCol.appendChild(
        ui.renderGappedText(String(set.text == null ? '' : set.text), (n) => {
          const num = Number(n);
          const sel = ui.selectInput(num, letters, { placeholder: '— select —' });
          selects.set(num, sel);
          sel.addEventListener('change', updatePlacements);
          return sel;
        })
      );

      const qCol = util.el('div', { class: 'split-q' });
      qCol.appendChild(titleHeading('The missing paragraphs'));
      qCol.appendChild(
        util.el('p', {
          class: 'muted small',
          text:
            'One paragraph is extra and fits nowhere. You can pick the same ' +
            'letter in more than one gap while you decide — it is only checked ' +
            'when you mark.',
        })
      );

      paragraphs.forEach((p) => {
        const letter = String(p.letter || '').toUpperCase();
        const chip = util.el('span', { class: 'chip hidden' });
        chips.set(letter, chip);
        qCol.appendChild(
          util.el(
            'div',
            { class: 'para-option' },
            util.el('div', { class: 'row' }, letterBadge(letter), chip),
            paragraphsFrom(p.text).map((t) => util.el('p', { text: t }))
          )
        );
      });

      host.appendChild(util.el('div', { class: 'split-view' }, textCol, qCol));

      return {
        getAnswers() {
          const out = {};
          selects.forEach((sel, n) => {
            out[n] = String(sel.value || '').toUpperCase();
          });
          return out;
        },
        unanswered() {
          let count = 0;
          selects.forEach((sel) => {
            if (!sel.value) count += 1;
          });
          return count;
        },
      };
    },
    mark(set, answers) {
      const list = set.answers || [];
      let score = 0;
      const items = list.map((a) => {
        const raw = answers && answers[a.number] != null ? answers[a.number] : '';
        const user = String(raw).trim().toUpperCase();
        const key = String(a.letter == null ? '' : a.letter).trim().toUpperCase();
        const correct = !!user && !!key && CAE.marking.letterCorrect(user, key);
        if (correct) score += 1;
        return {
          number: a.number,
          prompt: 'Gap ' + a.number,
          userAnswer: user,
          correctAnswer: key,
          correct,
          explanation: String(a.explanation == null ? '' : a.explanation),
        };
      });
      if (items.length && set.distractor) {
        const last = items[items.length - 1];
        const note =
          'Paragraph ' +
          String(set.distractor).toUpperCase() +
          ' was the extra one — it does not fit any gap.';
        last.explanation = last.explanation ? last.explanation + ' ' + note : note;
      }
      return { score, total: list.length, items };
    },
  });

  /* ---------- Part 8 — Multiple matching ---------- */

  CAE.registerPart({
    id: 'rue8',
    render(set, host) {
      const collector = mcCollector();
      const sections = set.sections || [];
      if (set.instructions) host.appendChild(ui.instructionsBox(set.instructions));
      const textCol = util.el('div', { class: 'split-text' });
      if (set.title) textCol.appendChild(titleHeading(set.title));
      sections.forEach((s) => {
        textCol.appendChild(extractBlock(String(s.id || '').toUpperCase(), s.title, s.text));
      });
      // Letter-only chips: empty option texts, badge carries the choice.
      const options = {};
      sections.forEach((s) => {
        options[String(s.id || '').toUpperCase()] = '';
      });
      const qCol = util.el('div', { class: 'split-q' });
      (set.questions || []).forEach((q) => {
        const group = ui.optionGroup({
          options,
          name: 'rue8-q' + q.number + '-' + util.uid(),
          onSelect: () => {},
        });
        compactLetterChips(group.element);
        collector.add(q.number, group);
        qCol.appendChild(questionBlock(q, group.element));
      });
      host.appendChild(util.el('div', { class: 'split-view' }, textCol, qCol));
      return collector;
    },
    mark(set, answers) {
      const titleOf = {};
      (set.sections || []).forEach((s) => {
        titleOf[String(s.id || '').toUpperCase()] = String(s.title == null ? '' : s.title);
      });
      return markLetterItems(set.questions || [], answers, (letter) =>
        titleOf[letter] ? letter + ' — ' + titleOf[letter] : letter
      );
    },
  });
})();
