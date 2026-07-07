/* CAE Ace — flexible exam timer (CAE.timer).
 * Off / official / custom, never auto-submits unless strict timing is on. */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  function create({ seconds, strict = false, onExpire, label = 'Timer' } = {}) {
    const { el, fmtTime } = CAE.util;
    const total = Math.max(1, Math.round(seconds || 60));

    let startedAt = null;   // timestamp of the current running stretch
    let banked = 0;         // seconds elapsed in previous stretches
    let interval = null;
    let expiredFired = false;
    let stopped = false;

    const timeEl = el('span', { class: 'timer-time', text: fmtTime(total), ariaLabel: label + ' remaining' });
    const pauseBtn = el('button', {
      class: 'btn btn-ghost btn-sm', title: 'Pause / resume', ariaLabel: 'Pause or resume timer',
      on: { click: () => { running() ? pause() : start(); } },
    }, '⏸');
    const resetBtn = el('button', {
      class: 'btn btn-ghost btn-sm', title: 'Reset timer', ariaLabel: 'Reset timer',
      on: { click: reset },
    }, '↺');
    const widget = el('span', { class: 'timer-widget', role: 'timer' }, timeEl, pauseBtn, resetBtn);

    function elapsed() {
      return banked + (startedAt !== null ? (Date.now() - startedAt) / 1000 : 0);
    }

    function running() {
      return startedAt !== null;
    }

    function paint() {
      const remain = total - elapsed();
      if (remain >= 0) {
        timeEl.textContent = fmtTime(Math.ceil(remain));
        widget.classList.toggle('warning', remain <= 60 && remain > 0);
        widget.classList.remove('expired');
        return;
      }
      // Time's up.
      widget.classList.remove('warning');
      widget.classList.add('expired');
      if (strict) {
        if (!expiredFired) {
          expiredFired = true;
          timeEl.textContent = '0:00';
          stop();
          if (typeof onExpire === 'function') onExpire();
        }
        return;
      }
      // Study mode: keep counting up so the user can see the overtime.
      timeEl.textContent = '+' + fmtTime(Math.floor(-remain));
      if (!expiredFired) {
        expiredFired = true;
        if (CAE.ui && CAE.ui.toast) CAE.ui.toast('Time\'s up — carry on and finish in your own time.');
      }
    }

    function start() {
      if (stopped || running()) return;
      startedAt = Date.now();
      pauseBtn.textContent = '⏸';
      if (!interval) interval = setInterval(paint, 250);
      paint();
    }

    function pause() {
      if (!running()) return;
      banked = elapsed();
      startedAt = null;
      pauseBtn.textContent = '▶';
      paint();
    }

    function reset() {
      banked = 0;
      expiredFired = false;
      stopped = false;
      if (running()) startedAt = Date.now();
      widget.classList.remove('expired', 'warning');
      paint();
    }

    function stop() {
      if (running()) banked = elapsed();
      startedAt = null;
      stopped = true;
      if (interval) { clearInterval(interval); interval = null; }
      pauseBtn.disabled = true;
      resetBtn.disabled = true;
    }

    function destroy() {
      stop();
      widget.remove();
    }

    paint();
    return {
      element: widget,
      start, pause, reset, stop, destroy,
      isRunning: running,
      remaining: () => Math.max(0, total - elapsed()),
    };
  }

  /* Reads the user's timer settings for a practice part.
   * Returns null (no timer) or { seconds, strict }.
   * Accepts a part id (uses its official minutes) or a plain number of minutes. */
  function resolveConfig(partIdOrMinutes) {
    const s = CAE.storage.getSettings();
    if (s.timerMode === 'off') return null;

    let minutes;
    if (typeof partIdOrMinutes === 'number') {
      minutes = partIdOrMinutes;
    } else {
      const meta = CAE.prompts && CAE.prompts.PARTS && CAE.prompts.PARTS[partIdOrMinutes];
      minutes = (meta && meta.officialMinutes) || 10;
    }
    if (s.timerMode === 'custom') minutes = s.customMinutes || 10;

    return { seconds: Math.round(minutes * 60), strict: !!s.strictTiming };
  }

  CAE.timer = { create, resolveConfig };
})();
