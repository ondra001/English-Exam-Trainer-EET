/* CAE Ace — DOM + misc helpers (CAE.util).
 * Every other module builds DOM through el(), so untrusted text (model output,
 * user answers, imported data) always lands in text nodes — never innerHTML.
 */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  function $$(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function appendAny(node, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) {
      for (const c of child) appendAny(node, c);
      return;
    }
    if (child instanceof Node) {
      node.appendChild(child);
      return;
    }
    node.appendChild(document.createTextNode(String(child)));
  }

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    // Allow el('div', child, child) — a string/Node/array second arg is a child.
    if (attrs != null && (typeof attrs !== 'object' || Array.isArray(attrs) || attrs instanceof Node)) {
      children.unshift(attrs);
      attrs = null;
    }
    if (attrs) {
      for (const key of Object.keys(attrs)) {
        const v = attrs[key];
        if (v == null) continue;
        switch (key) {
          case 'class': node.className = v; break;
          case 'id': node.id = v; break;
          case 'text': node.textContent = v; break;
          case 'value': node.value = v; break;
          case 'disabled': node.disabled = !!v; break;
          case 'checked': node.checked = !!v; break;
          case 'ariaLabel': node.setAttribute('aria-label', v); break;
          case 'tabindex': node.setAttribute('tabindex', v); break;
          case 'data':
            for (const k of Object.keys(v)) node.dataset[k] = v[k];
            break;
          case 'attr':
            for (const k of Object.keys(v)) node.setAttribute(k, v[k]);
            break;
          case 'on':
            for (const k of Object.keys(v)) {
              if (typeof v[k] === 'function') node.addEventListener(k, v[k]);
            }
            break;
          case 'style':
            for (const k of Object.keys(v)) node.style[k] = v[k];
            break;
          case 'type':
          case 'placeholder':
          case 'min':
          case 'max':
          case 'rows':
          case 'href':
          case 'target':
          case 'title':
          case 'role':
            node.setAttribute(key, v);
            break;
          default:
            node.setAttribute(key, v);
        }
      }
      // Links opened in a new tab must not leak window.opener.
      if (attrs.target === '_blank' && !node.getAttribute('rel')) {
        node.setAttribute('rel', 'noopener');
      }
    }
    appendAny(node, children);
    return node;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function uid() {
    return Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 9);
  }

  function shuffle(arr) {
    const out = Array.isArray(arr) ? arr.slice() : [];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = out[i];
      out[i] = out[j];
      out[j] = t;
    }
    return out;
  }

  function sample(arr) {
    if (!Array.isArray(arr) || !arr.length) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function pct(score, total) {
    const t = Number(total) || 0;
    if (t <= 0) return 0;
    return clamp(Math.round(((Number(score) || 0) / t) * 100), 0, 100);
  }

  function normalizeAnswer(s) {
    if (s == null) return '';
    let t = String(s)
      .replace(/[‘’ʼ]/g, "'")   // curly/modifier apostrophes -> '
      .replace(/[“”]/g, '"')          // curly double quotes -> "
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    t = t.replace(/^[.,;:!?"']+/, '').replace(/[.,;:!?"']+$/, '').trim();
    return t;
  }

  function countWords(s) {
    const t = String(s == null ? '' : s).trim();
    if (!t) return 0;
    return t.split(/\s+/).length;
  }

  function fmtTime(totalSeconds) {
    const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(sec).padStart(2, '0');
    return h >= 1 ? h + ':' + mm + ':' + ss : mm + ':' + ss;
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  function fmtDateTime(ts) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return fmtDate(ts) + ', ' + hh + ':' + mm;
  }

  function todayKey(ts = Date.now()) {
    const d = new Date(ts);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function debounce(fn, ms) {
    let t = null;
    return function debounced(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function download(filename, text, mime = 'application/json') {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  CAE.util = {
    $, $$, el, escapeHtml, uid, shuffle, sample, clamp, pct,
    normalizeAnswer, countWords, fmtTime, fmtDate, fmtDateTime,
    todayKey, debounce, download,
  };
})();
