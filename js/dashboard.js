/* CAE Ace — dashboard: score estimate, per-skill marks ledger, progress chart,
 * mock history, weak areas, export/import (demoted to the colophon). */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const U = CAE.util;

  const SKILLS = [
    { key: 'reading', name: 'Reading', icon: '📖' },
    { key: 'uoe', name: 'Use of English', icon: '🧩' },
    { key: 'listening', name: 'Listening', icon: '🎧' },
    { key: 'writing', name: 'Writing', icon: '✍️' },
  ];
  const SKILL_KEYS = SKILLS.map((s) => s.key);

  /* Colorblind-safe categorical palette (validated slot order; per-theme steps).
   * Point styles differ per series so identity never relies on color alone. */
  const SERIES = {
    reading: { light: '#2a78d6', dark: '#3987e5', point: 'circle' },
    uoe: { light: '#1baf7a', dark: '#199e70', point: 'rect' },
    listening: { light: '#eda100', dark: '#c98500', point: 'triangle' },
    writing: { light: '#4a3aa7', dark: '#9085e9', point: 'rectRot' },
  };

  // The active CEFR level pack drives the dashboard's scale and labels. Falls
  // back to C1 Advanced (142–210) if js/levels.js is unavailable.
  const LV_FALLBACK = {
    cefr: 'C1', aspire: 'C2', below: 'B2', exam: 'C1 Advanced (CAE)',
    scale: { min: 142, max: 210, pass: 180, high: 200 },
    grades: [{ min: 200 }, { min: 193 }, { min: 180 }, { min: 160 }, { min: 0 }],
  };
  function LV() { return (CAE.levels && CAE.levels.active && CAE.levels.active()) || LV_FALLBACK; }
  function PASS() { return LV().scale.pass; }
  function TOPMARK() { return LV().scale.high; }
  // The grade ladder runs from the "below pass" boundary up to the scale ceiling.
  function trackMin() {
    const g = LV().grades;
    return (g && g[3] && typeof g[3].min === 'number') ? g[3].min : LV().scale.min;
  }
  function trackMax() { return LV().scale.max; }

  let chartInstance = null;
  let chartState = null; // { canvas, rows } — kept so refreshTheme() can rebuild
  let lastHost = null;
  let lastStreakSeen = null; // session-scoped: the seal stamps once, then only on increment

  // ── helpers ────────────────────────────────────────────────────────────────

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  // Canvas needs concrete colors: turn a token hex into an rgba() with alpha.
  function withAlpha(hex, alpha) {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return hex;
    let h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function isDark() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function trackPos(value) {
    return U.clamp(((value - trackMin()) / (trackMax() - trackMin())) * 100, 0, 100);
  }

  // Set a ladder fill's width once it's in the document, so the .8s ease plays.
  function fillTo(fillEl, pctWidth) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fillEl.style.width = pctWidth + '%';
    }));
  }

  // Tier-1 heading: numbered Fraunces-italic section head with a hairline.
  function sectionHead(no, title, note) {
    return U.el('h3', { class: 'section-head' },
      no ? U.el('span', { class: 'sh-no' }, no) : null,
      title,
      note ? U.el('span', { class: 'sh-note' }, note) : null);
  }

  /* Personal anchors from Settings. Defensive: the fields may be absent,
   * null, or out of range (valid scores are 142–210). */
  function personalScores() {
    let baseline = null;
    let target = null;
    try {
      const s = CAE.storage.getSettings();
      const sc = LV().scale;
      const b = Number(s.baselineScore || null);
      const t = Number(s.targetScore || null);
      if (Number.isFinite(b) && b >= sc.min && b <= sc.max) baseline = Math.round(b);
      if (Number.isFinite(t) && t >= sc.min && t <= sc.max) target = Math.round(t);
    } catch (e) { /* settings unavailable — treat as unset */ }
    return { baseline, target };
  }

  function partName(partId) {
    const p = CAE.prompts && CAE.prompts.PARTS && CAE.prompts.PARTS[partId];
    return p ? p.name : partId;
  }

  function partsOfSkill(skillKey) {
    const P = CAE.prompts.PARTS;
    return CAE.prompts.ORDER.filter((id) => P[id] && P[id].skill === skillKey
      && (!CAE.levels || CAE.levels.inActiveOrder(id)));
  }

  function attemptScale(a) {
    if (a.paper === 'writing' && typeof a.scale === 'number') return a.scale;
    return CAE.marking.toScale(a.pctScore);
  }

  /* Per-skill scale estimates from the last 5 attempts of each skill.
   * Reading/UoE/Listening: weighted mean pct (weight = marks in the set) -> toScale.
   * Writing: mean of the stored per-attempt scale values. */
  function skillEstimates(attempts) {
    const out = {};
    SKILLS.forEach((s) => {
      const all = attempts.filter((a) => a.paper === s.key);
      const last5 = all.slice(0, 5);
      if (!last5.length) { out[s.key] = null; return; }
      let scale;
      let trendVals;
      if (s.key === 'writing') {
        const scales = last5.map(attemptScale);
        scale = Math.round(scales.reduce((x, y) => x + y, 0) / scales.length);
        trendVals = scales;
      } else {
        const sumS = last5.reduce((x, a) => x + (Number(a.score) || 0), 0);
        const sumT = last5.reduce((x, a) => x + (Number(a.total) || 0), 0);
        const p = sumT > 0
          ? (sumS / sumT) * 100
          : last5.reduce((x, a) => x + (Number(a.pctScore) || 0), 0) / last5.length;
        scale = CAE.marking.toScale(p);
        trendVals = last5.map((a) => Number(a.pctScore) || 0);
      }
      out[s.key] = { scale, totalCount: all.length, trendVals };
    });
    return out;
  }

  // trendVals is newest-first; compare newest vs the mean of the older ones.
  function trendOf(vals) {
    if (!vals || vals.length < 2) return null;
    const last = vals[0];
    const older = vals.slice(1);
    const avg = older.reduce((a, b) => a + b, 0) / older.length;
    if (last - avg > 2) return 'up';
    if (avg - last > 2) return 'down';
    return 'flat';
  }

  function streakDays(attempts) {
    if (!attempts.length) return 0;
    const days = new Set(attempts.map((a) => U.todayKey(a.date)));
    const cur = new Date();
    cur.setHours(12, 0, 0, 0); // noon: immune to DST hour shifts when stepping days
    if (!days.has(U.todayKey(cur.getTime()))) {
      cur.setDate(cur.getDate() - 1);
      if (!days.has(U.todayKey(cur.getTime()))) return 0;
    }
    let n = 0;
    while (days.has(U.todayKey(cur.getTime()))) {
      n += 1;
      cur.setDate(cur.getDate() - 1);
    }
    return n;
  }

  function weekStartTs() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
    return d.getTime();
  }

  function avgPctByPart(attempts) {
    const acc = {};
    attempts.forEach((a) => {
      if (!a.partId) return;
      const e = acc[a.partId] || (acc[a.partId] = { sum: 0, n: 0 });
      e.sum += Number(a.pctScore) || 0;
      e.n += 1;
    });
    Object.keys(acc).forEach((id) => { acc[id].avg = acc[id].sum / acc[id].n; });
    return acc;
  }

  function weakestPartId(attempts, est) {
    let skill = null;
    let best = Infinity;
    SKILLS.forEach((s) => {
      const e = est[s.key];
      if (e && e.scale < best) { best = e.scale; skill = s.key; }
    });
    if (!skill) return 'rue1';
    const parts = partsOfSkill(skill);
    if (!parts.length) return 'rue1';
    const byPart = avgPctByPart(attempts);
    const unpracticed = parts.find((id) => !byPart[id]);
    if (unpracticed) return unpracticed;
    let worst = parts[0];
    let w = Infinity;
    parts.forEach((id) => {
      if (byPart[id] && byPart[id].avg < w) { w = byPart[id].avg; worst = id; }
    });
    return worst;
  }

  // ── hero masthead ──────────────────────────────────────────────────────────

  // Compact letterpress-tab wording for each grade band.
  function gradeTabText(overall) {
    const L = LV();
    const sc = L.scale;
    const bMark = Math.round(sc.pass + (sc.high - sc.pass) * 0.65);
    if (overall >= sc.high) return L.aspire + ' · Grade A';
    if (overall >= bMark) return L.cefr + ' · Grade B';
    if (overall >= sc.pass) return L.cefr + ' · Grade C';
    if (overall >= trackMin()) return L.below;
    return 'Below ' + L.below;
  }

  function heroCard(overall, attempts, est) {
    const el = U.el;
    const hasScore = overall !== null;
    const { baseline, target } = personalScores();
    // The goal marker only exists when it adds information beyond 180/200.
    const goal = (target !== null
      && target !== PASS()
      && target !== TOPMARK()) ? target : null;

    const scoreEl = el('div', { class: 'score-big', ariaLabel: 'Estimated overall Cambridge scale score' },
      hasScore ? '' : '—');

    const scoreRow = el('div', { class: 'dash-score-row' },
      scoreEl,
      el('span', { class: 'dash-caption' }, 'estimated overall score, Cambridge scale'));
    if (hasScore) {
      const g = CAE.marking.gradeFor(overall);
      scoreRow.append(el('span', { class: 'grade-tab', title: g.label }, gradeTabText(overall)));
      if (baseline !== null) {
        const delta = overall - baseline;
        const deltaKind = delta > 0 ? 'good' : (delta < 0 ? 'bad' : 'neutral');
        const deltaText = delta === 0
          ? 'level with your last exam'
          : (delta > 0 ? '+' : '−') + Math.abs(delta) + ' since your last exam';
        scoreRow.append(el('span', {
          class: 'badge ' + deltaKind,
          title: 'Compared with your starting point of ' + baseline,
        }, deltaText));
      }
    }

    const chips = [];
    if (baseline !== null) {
      chips.push(el('span', {
        class: 'chip chip-meta',
        title: 'Your last real exam result — change it any time in Settings',
      }, 'Starting point · ' + baseline));
    }
    if (baseline === null && target === null) {
      chips.push(el('button', {
        class: 'btn btn-ghost dash-add-score',
        type: 'button',
        title: 'Record your last exam score and a goal in Settings (the ⚙ button, top right)',
        on: {
          click: () => {
            const b = document.getElementById('settings-btn');
            if (b) b.click();
          },
        },
      }, '+ Add your last score'));
    }
    const chipsRow = chips.length ? el('div', { class: 'dash-hero-chips' }, chips) : null;

    // The grade ladder: 160→210 with ruler ticks at 180 (pass) and 200 (A/C2).
    let fillClass = 'progress-fill';
    if (hasScore && overall >= PASS()) fillClass += ' over-pass';
    if (hasScore && overall >= TOPMARK()) fillClass += ' over-c2';
    const fill = el('div', { class: fillClass, style: { width: '0%' } });

    const marker = (value, labelText, extraClass) => el('span', {
      class: 'progress-marker' + (extraClass ? ' ' + extraClass : ''),
      style: { left: trackPos(value) + '%' },
    }, el('span', { class: 'marker-label' }, labelText));

    const L0 = LV();
    const ladderRange = trackMin() + ' to ' + trackMax();
    const trackLabel = (hasScore
      ? 'Grade ladder from ' + ladderRange + ': your estimate is ' + overall + '.'
      : 'Grade ladder from ' + ladderRange + '.')
      + ' ' + PASS() + ' is the ' + L0.cefr + ' pass mark; ' + TOPMARK() + ' is Grade A, ' + L0.aspire + ' level.'
      + (goal !== null ? ' Your goal is ' + goal + '.' : '');

    const track = el('div', { class: 'progress-track dash-hero-track', role: 'img', ariaLabel: trackLabel },
      fill,
      marker(PASS(), PASS() + ' · ' + L0.cefr + ' pass'),
      marker(TOPMARK(), TOPMARK() + ' · A/' + L0.aspire),
      goal !== null ? marker(goal, goal + ' · goal', 'dash-goal-marker') : null);
    if (hasScore) fillTo(fill, trackPos(overall));

    const weakId = weakestPartId(attempts, est);
    const practiceBtn = el('button', {
      class: 'btn btn-primary',
      type: 'button',
      title: partName(weakId),
      on: { click: () => { location.hash = '#/part/' + weakId; } },
    }, 'Practise your weakest area');

    if (hasScore) {
      // Animate once the element is in the document.
      requestAnimationFrame(() => CAE.ui.animateNumber(scoreEl, overall, { from: LV().scale.min, ms: 700 }));
    }

    return el('div', { class: 'card dash-hero' },
      scoreRow,
      hasScore ? null : el('p', { class: 'muted', style: { margin: '6px 0 0' } },
        'Finish one practice set and your estimate appears here.'),
      chipsRow,
      track,
      el('p', { class: 'muted small', style: { margin: '0' } },
        'An estimate from your recent practice sets — not an official Cambridge result.'),
      el('div', { class: 'row', style: { marginTop: '14px' } }, practiceBtn));
  }

  // ── streak line (one ruled ledger line under the hero) ─────────────────────

  function streakLine(attempts) {
    const el = U.el;
    const streak = streakDays(attempts);
    const stampNow = streak > 0 && (lastStreakSeen === null || streak > lastStreakSeen);
    lastStreakSeen = streak;
    const sets = attempts.length;
    const week = attempts.filter((a) => a.date >= weekStartTs()).length;

    const num = (n) => el('span', { class: 'num' }, String(n));
    const text = el('p', { class: 'sl-text' });
    if (streak > 0) {
      text.append('Day ', num(streak), ' of your streak — ',
        num(sets), sets === 1 ? ' set completed' : ' sets completed', ', ');
      if (sets > 0 && week === sets) text.append('all this week.');
      else text.append(num(week), ' this week.');
      text.append(' Don’t break the chain.');
    } else {
      text.append('No streak yet — one set today starts it. ',
        num(sets), sets === 1 ? ' set completed' : ' sets completed', ', ',
        num(week), ' this week.');
    }

    const seal = streak > 0
      ? el('div', {
          class: 'streak-seal' + (stampNow ? ' stamp' : ''),
          role: 'img',
          ariaLabel: streak + '-day study streak',
        },
          el('span', { class: 'seal-count' }, String(streak)),
          el('span', { class: 'seal-label' }, streak === 1 ? 'day' : 'days'))
      : null;

    return el('div', { class: 'dash-streakline' }, seal, text);
  }

  // ── marks ledger (per-skill rows) ──────────────────────────────────────────

  function skillLedger(est) {
    const el = U.el;

    const populated = SKILLS.filter((s) => est[s.key]);
    const empty = SKILLS.filter((s) => !est[s.key]);

    let n = 0;
    const idx = () => {
      n += 1;
      return el('span', { class: 'lr-idx' }, (n < 10 ? '0' : '') + n);
    };

    const rows = [];
    populated.forEach((s) => {
      const e = est[s.key];
      const scoreEl = el('span', { class: 'lr-score' }, String(e.scale));
      const t = trendOf(e.trendVals);
      if (t) {
        const map = {
          up: { glyph: '↗', label: 'Improving', color: 'var(--good)' },
          down: { glyph: '↘', label: 'Slipping', color: 'var(--bad)' },
          flat: { glyph: '→', label: 'Steady', color: 'var(--muted)' },
        }[t];
        scoreEl.append(el('span', {
          class: 'dash-trend',
          title: map.label,
          ariaLabel: map.label,
          style: { color: map.color },
        }, map.glyph));
      }

      const fill = el('div', {
        class: 'progress-fill' + (e.scale >= PASS() ? ' over-pass' : ''),
        style: { width: '0%' },
      });
      fillTo(fill, trackPos(e.scale));

      rows.push(el('div', {
        class: 'ledger-row',
        data: { paper: s.key },
        title: 'Average of your last ' + Math.min(e.totalCount, 5) + ' ' + s.name + ' sets',
      },
        idx(),
        el('span', { class: 'lr-name' }, s.name, ' ',
          el('span', { class: 'small muted' },
            '· ' + e.totalCount + (e.totalCount === 1 ? ' set' : ' sets'))),
        el('div', { class: 'progress-track mini', attr: { 'aria-hidden': 'true' } }, fill),
        scoreEl));
    });

    empty.forEach((s) => {
      const first = partsOfSkill(s.key)[0] || 'rue1';
      rows.push(el('div', { class: 'ledger-row is-empty', data: { paper: s.key } },
        idx(),
        el('span', { class: 'lr-name' }, s.name),
        el('a', { class: 'lr-begin', href: '#/part/' + first }, 'no sets yet — begin →')));
    });

    // Speaking is tips-only: an open ledger line pointing at the phrase book.
    rows.push(el('div', { class: 'ledger-row is-empty', data: { paper: 'speaking' } },
      idx(),
      el('span', { class: 'lr-name' }, 'Speaking'),
      el('a', {
        class: 'lr-begin',
        href: '#/part/spk',
        ariaLabel: 'Speaking — tips and useful phrases',
      }, 'tips & useful phrases →')));

    return el('div', { class: 'card card--open' },
      sectionHead('01', 'Marks by paper', 'last 5 sets'),
      el('div', { class: 'ledger' }, rows));
  }

  // ── progress chart ─────────────────────────────────────────────────────────

  function destroyChart() {
    if (chartInstance) {
      try { chartInstance.destroy(); } catch (e) { /* already gone */ }
      chartInstance = null;
    }
  }

  function refLinesPlugin(colors) {
    return {
      id: 'caeRefLines',
      afterDatasetsDraw(c) {
        const y = c.scales.y;
        const area = c.chartArea;
        const ctx = c.ctx;
        if (!y || !area) return;
        const lines = [
          { v: PASS(), label: 'Pass · ' + PASS(), color: colors.pass },
          { v: TOPMARK(), label: LV().aspire + ' · ' + TOPMARK(), color: colors.c2 },
        ];
        ctx.save();
        lines.forEach((ln) => {
          const py = y.getPixelForValue(ln.v);
          if (py < area.top || py > area.bottom) return;
          ctx.strokeStyle = ln.color;
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(area.left, py);
          ctx.lineTo(area.right, py);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = ln.color;
          ctx.font = '10px ' + colors.font;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText(ln.label, area.right - 4, py - 3);
        });
        ctx.restore();
      },
    };
  }

  /* Each series signs off with its latest value printed at the line's end —
   * the annotated margin of a marked script. */
  function endLabelsPlugin(colors) {
    return {
      id: 'caeEndLabels',
      afterDatasetsDraw(c) {
        const ctx = c.ctx;
        ctx.save();
        ctx.font = '10px ' + colors.font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        c.data.datasets.forEach((ds, di) => {
          const meta = c.getDatasetMeta(di);
          if (!meta || meta.hidden) return;
          let last = -1;
          ds.data.forEach((v, i) => { if (v !== null && v !== undefined) last = i; });
          if (last < 0 || !meta.data[last]) return;
          const pt = meta.data[last];
          ctx.fillStyle = ds.borderColor;
          ctx.fillText(String(ds.data[last]), pt.x + 7, pt.y);
        });
        ctx.restore();
      },
    };
  }

  function buildChart(canvas, rows) {
    if (typeof Chart === 'undefined' || !canvas.isConnected) return null;
    const dark = isDark();
    const ink = cssVar('--ink', dark ? '#eaebf3' : '#191d2b');
    const surface = cssVar('--surface', dark ? '#181c29' : '#fffdf7');
    const faint = cssVar('--faint', dark ? '#6d7387' : '#8e94a6');
    const line = cssVar('--line', dark ? '#2b3044' : '#e2dbc8');
    const good = cssVar('--good', '#22693f');
    const accent = cssVar('--accent', dark ? '#93a5ff' : '#2b46d4');
    const sans = cssVar('--sans', 'system-ui, sans-serif');
    const mono = cssVar('--mono', 'Consolas, monospace');

    const labels = rows.map((r) => U.fmtDate(r.date));
    const datasets = [];
    SKILLS.forEach((s) => {
      const data = rows.map((r) => (r.paper === s.key ? attemptScale(r) : null));
      if (!data.some((v) => v !== null)) return;
      const color = dark ? SERIES[s.key].dark : SERIES[s.key].light;
      datasets.push({
        label: s.name,
        data,
        borderColor: color,
        backgroundColor: withAlpha(color, 0.06),
        pointBackgroundColor: color,
        pointBorderColor: color,
        pointStyle: SERIES[s.key].point,
        pointRadius: 3.5,
        pointHoverRadius: 6,
        pointHitRadius: 12,
        borderWidth: 2,
        spanGaps: true,
        tension: 0.25,
        fill: 'origin',
      });
    });

    return new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 180 },
        interaction: { mode: 'nearest', intersect: false },
        layout: { padding: { right: 30 } },
        scales: {
          x: {
            grid: { display: false },
            border: { color: line },
            ticks: {
              color: faint,
              font: { family: mono, size: 11 },
              maxTicksLimit: 4,
              maxRotation: 0,
              autoSkip: true,
              // Consecutive attempts share a date — print each day once.
              callback(value, index, ticks) {
                const lab = labels[value] != null ? labels[value] : '';
                const prev = index > 0 && ticks[index - 1]
                  ? labels[ticks[index - 1].value] : null;
                return lab === prev ? undefined : lab;
              },
            },
          },
          y: {
            min: LV().scale.min - 2,
            max: LV().scale.max + 2,
            // The only horizontal rules are the dashed pass / top-grade lines.
            grid: { display: false },
            border: { display: false },
            ticks: { color: faint, font: { family: mono, size: 11 }, stepSize: 20 },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: ink,
              font: { family: sans, size: 12 },
              usePointStyle: true,
              boxWidth: 8,
              boxHeight: 8,
              padding: 14,
            },
          },
          tooltip: {
            backgroundColor: surface,
            borderColor: line,
            borderWidth: 1,
            titleColor: ink,
            bodyColor: ink,
            titleFont: { family: sans, size: 12, weight: 'bold' },
            bodyFont: { family: sans, size: 12 },
            padding: 12,
            cornerRadius: 10,
            displayColors: false,
            callbacks: {
              label(item) {
                const r = rows[item.dataIndex];
                if (!r) return '';
                return item.dataset.label + ': ' + partName(r.partId) + ' — '
                  + Math.round(Number(r.pctScore) || 0) + '% (scale ' + item.parsed.y + ')';
              },
            },
          },
        },
      },
      plugins: [
        refLinesPlugin({ pass: good, c2: accent, font: mono }),
        endLabelsPlugin({ font: mono }),
      ],
    });
  }

  function chartCard(attempts) {
    const el = U.el;
    const card = el('div', { class: 'card card--open' },
      sectionHead('02', 'Progress over time'));

    if (typeof Chart === 'undefined') {
      card.append(el('div', { class: 'empty-state' },
        el('p', {}, 'The chart couldn’t load.'),
        el('p', { class: 'muted small' },
          'You may be offline. Your results are still saved; the chart will appear next time the app is online.')));
      return card;
    }

    const rows = attempts
      .filter((a) => SKILL_KEYS.includes(a.paper))
      .slice(0, 60)
      .reverse(); // chronological

    if (rows.length < 2) {
      card.append(el('div', { class: 'empty-state' },
        el('p', {}, rows.length === 0
          ? 'Your first set starts the chart.'
          : 'One more set and your progress line begins.'),
        el('a', { href: '#/parts', class: 'btn btn-ghost' }, 'Browse exam parts')));
      return card;
    }

    const canvas = el('canvas', { ariaLabel: 'Line chart of scale scores per attempt, by skill', role: 'img' });
    card.append(
      el('div', { style: { position: 'relative', height: '280px' } }, canvas),
      el('p', { class: 'fig-caption' },
        'Fig. 1 — estimated scale score per attempt · dashed rules mark ' + PASS() + ' (pass) and ' + TOPMARK() + ' (' + LV().aspire + ').'));

    chartState = { canvas, rows };
    requestAnimationFrame(() => {
      if (chartState && chartState.canvas === canvas) chartInstance = buildChart(canvas, rows);
    });
    return card;
  }

  function refreshTheme() {
    if (!chartState) return;
    destroyChart();
    if (chartState.canvas.isConnected) {
      chartInstance = buildChart(chartState.canvas, chartState.rows);
    }
  }

  // ── recent mocks ───────────────────────────────────────────────────────────

  function mocksCard() {
    const el = U.el;
    const mocks = CAE.storage.getMockResults().slice(0, 5);
    const card = el('div', { class: 'card card--open' },
      sectionHead('03', 'Recent mock tests'));

    if (!mocks.length) {
      card.append(el('div', { class: 'empty-state' },
        el('p', {}, 'No mock tests yet.'),
        el('p', { class: 'muted small' }, 'Timed papers in one sitting — the truest rehearsal.'),
        el('a', { href: '#/mock', class: 'btn btn-ghost' }, 'Take a full mock test')));
      return card;
    }

    const list = el('div', {});
    mocks.forEach((m) => {
      const sc = m.scales || {};
      const overall = typeof sc.overall === 'number' ? sc.overall : null;
      const kind = overall === null ? 'neutral' : (overall >= PASS() ? 'good' : 'bad');
      const mini = ['reading', 'uoe', 'listening', 'writing']
        .map((k, i) => ['R', 'UoE', 'L', 'W'][i] + ' ' + (typeof sc[k] === 'number' ? sc[k] : '—'))
        .join(' · ');
      list.append(el('div', { class: 'dash-list-row' },
        el('div', {},
          el('div', { class: 'small', style: { fontWeight: '500' } }, U.fmtDate(m.date)),
          el('div', { class: 'muted dash-mini-scores' }, mini)),
        el('div', { class: 'row', style: { gap: '10px', flexWrap: 'nowrap' } },
          el('span', { class: 'dash-mock-overall' }, overall === null ? '—' : String(overall)),
          el('span', { class: 'badge ' + kind }, String(m.verdict || '—')))));
    });
    card.append(list);
    return card;
  }

  // ── weak areas ─────────────────────────────────────────────────────────────

  function weakAreasCard(attempts) {
    const el = U.el;
    const card = el('div', { class: 'card card--open' },
      sectionHead('04', 'Where to focus'));

    const byPart = avgPctByPart(attempts);
    const rows = Object.keys(byPart)
      .filter((id) => CAE.prompts.PARTS[id])
      .map((id) => ({ id, avg: byPart[id].avg, n: byPart[id].n }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3);

    if (!rows.length) {
      card.append(el('div', { class: 'empty-state' },
        el('p', {}, 'Nothing to mark yet.'),
        el('p', { class: 'muted small' }, 'Complete a few sets and your weak spots will surface here.')));
      return card;
    }

    const list = el('div', {});
    rows.forEach((r) => {
      const p = CAE.prompts.PARTS[r.id];
      list.append(el('div', { class: 'dash-list-row' },
        el('div', {},
          el('div', { class: 'small', style: { fontWeight: '500' } }, p.name),
          el('div', { class: 'muted small' }, p.label + ' · avg ' + Math.round(r.avg) + '%')),
        el('a', { href: '#/part/' + r.id, class: 'text-link' }, 'Practise')));
    });
    card.append(list);
    return card;
  }

  // ── your data (demoted to the colophon foot) ───────────────────────────────

  function renderColophonActions() {
    const el = U.el;
    const hostEl = document.getElementById('colophon-actions');
    if (!hostEl) return;

    const fileInput = el('input', {
      type: 'file',
      class: 'hidden',
      attr: { accept: '.json,application/json' },
      ariaLabel: 'Import progress file',
      on: {
        change: () => {
          const f = fileInput.files && fileInput.files[0];
          if (!f) return;
          f.text().then((text) => {
            const res = CAE.storage.importData(text);
            if (res && res.ok) {
              CAE.ui.toast('Data imported', 'success');
              if (lastHost) render(lastHost);
            } else {
              CAE.ui.toast((res && res.error) || 'That file isn’t a valid Cambridge Trainer export.', 'error');
            }
          }).catch(() => {
            CAE.ui.toast('Couldn’t read that file.', 'error');
          }).then(() => { fileInput.value = ''; });
        },
      },
    });

    const exportBtn = el('button', {
      class: 'text-link no-arrow', type: 'button',
      title: 'Download your attempts, mock results, drafts and settings as a JSON file',
      on: {
        click: () => {
          U.download('cambridge-trainer-progress.json', CAE.storage.exportData());
          CAE.ui.toast('Data exported', 'success');
        },
      },
    }, 'Export data');

    const importBtn = el('button', {
      class: 'text-link no-arrow', type: 'button',
      title: 'Restore a Cambridge Trainer export file',
      on: { click: () => fileInput.click() },
    }, 'Import data');

    const clearBtn = el('button', {
      class: 'text-link danger no-arrow', type: 'button',
      on: {
        click: async () => {
          const first = await CAE.ui.confirm(
            'Delete ALL your Cambridge Trainer data for every level — attempts, mock results, drafts and settings?',
            { danger: true });
          if (!first) return;
          const second = await CAE.ui.confirm(
            'Are you absolutely sure? This cannot be undone.',
            { danger: true });
          if (!second) return;
          CAE.storage.clearAll();
          CAE.ui.toast('All data deleted');
          if (lastHost) render(lastHost);
        },
      },
    }, 'Delete all data');

    hostEl.replaceChildren(exportBtn, importBtn, clearBtn, fileInput);
  }

  // ── render ─────────────────────────────────────────────────────────────────

  function render(host) {
    lastHost = host;
    destroyChart();
    chartState = null;

    const attempts = CAE.storage.getAttempts();
    const est = skillEstimates(attempts);
    const available = SKILLS.map((s) => est[s.key]).filter(Boolean);
    const overall = available.length
      ? Math.round(available.reduce((a, e) => a + e.scale, 0) / available.length)
      : null;

    host.textContent = '';
    host.append(
      U.el('div', { class: 'dash-head' },
        U.el('div', { class: 'overline' }, LV().exam + ' · study record'),
        U.el('h2', { class: 'ink-stroke' }, 'Your progress')),
      heroCard(overall, attempts, est),
      streakLine(attempts),
      (CAE.vocab && CAE.vocab.wotdCard) ? CAE.vocab.wotdCard() : U.el('span', { class: 'hidden' }),
      skillLedger(est),
      chartCard(attempts),
      U.el('div', { class: 'grid2' }, mocksCard(), weakAreasCard(attempts)));

    renderColophonActions();
  }

  CAE.dashboard = { render, refreshTheme };
})();
