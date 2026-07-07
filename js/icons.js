/* CAE Ace — minimalist duotone line-icon set (CAE.icons).
 * Hand-drawn 24×24 stroke icons, consistent 1.75 weight, currentColor,
 * with a soft 12%-opacity fill layer for depth.
 * The path strings are static constants (trusted), never user/model data. */
(() => {
  'use strict';
  window.CAE = window.CAE || {};

  const soft = (shapes) => '<g fill="currentColor" stroke="none" opacity=".12">' + shapes + '</g>';

  const P = {
    // Reading & Use of English
    rue1: soft('<rect x="10" y="9.6" width="7" height="4.8" rx="1.4"/>') +
      '<path d="M4 6h16M4 18h16M4 12h4.5M20 12h-1"/><rect x="10" y="9.6" width="7" height="4.8" rx="1.4"/>',
    rue2: '<path d="M4 6h16M4 12h9M4 18h16M16.5 10v4"/>',
    rue3: '<path d="M5 16.5 8.5 7l3.5 9.5M6.1 13.5h4.8M14.5 12h5.5m0 0-2.2-2.2M20 12l-2.2 2.2"/>',
    rue4: '<path d="M6 9h11.5M15 6.5 17.5 9 15 11.5M18 15H6.5M9 12.5 6.5 15 9 17.5"/>',
    rue5: soft('<path d="M12 6.4C10.5 4.9 8 4.4 4 4.4v14.2c4 0 6.5.5 8 2V6.4Z"/>') +
      '<path d="M12 6.4C10.5 4.9 8 4.4 4 4.4v14.2c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2V4.4c-4 0-6.5.5-8 2ZM12 6.4v14.2"/>',
    rue6: soft('<rect x="13" y="4" width="7" height="7" rx="1.5"/>') +
      '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    rue7: '<path d="M4 5h16M4 9h16M4 19h16M4 14h2.5M9.8 14h4.4M17.5 14h2.5"/>',
    rue8: soft('<circle cx="11" cy="11" r="6"/>') +
      '<circle cx="11" cy="11" r="6"/><path d="m19.5 19.5-4.2-4.2"/>',
    // Listening
    lis1: soft('<rect x="3.5" y="13.5" width="4.2" height="6.5" rx="1.9"/><rect x="16.3" y="13.5" width="4.2" height="6.5" rx="1.9"/>') +
      '<path d="M4 14.5V12a8 8 0 0 1 16 0v2.5"/><rect x="3.5" y="13.5" width="4.2" height="6.5" rx="1.9"/><rect x="16.3" y="13.5" width="4.2" height="6.5" rx="1.9"/>',
    lis2: '<path d="M3.5 12h2M8 8.5v7M12 5v14M16 8.5v7M20.5 12h-2"/>',
    lis3: soft('<rect x="9" y="3.5" width="6" height="11" rx="3"/>') +
      '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>',
    lis4: '<path d="M4 8h3.5c4 0 5 8 9 8H20M4 16h3.5c1.6 0 2.7-1.2 3.7-2.6M20 8h-3.5c-1.6 0-2.7 1.2-3.7 2.6M17.8 5.8 20 8l-2.2 2.2M17.8 13.8 20 16l-2.2 2.2"/>',
    // Writing
    wri1: soft('<path d="m14.7 4.6 4.7 4.7-2.1 2.1-4.7-4.7Z"/>') +
      '<path d="m14.7 4.6 4.7 4.7L8.2 20.5H3.5v-4.7L14.7 4.6ZM12.6 6.7l4.7 4.7"/>',
    wri2: soft('<path d="M14 3.5v4h4Z"/>') +
      '<path d="M6 3.5h8l4 4V20.5H6v-17ZM14 3.5v4h4M9 12.5h6M9 16h6"/>',
    // Speaking
    spk: soft('<path d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v6.4a2.8 2.8 0 0 1-2.8 2.8H12l-4.8 4v-4H6.8A2.8 2.8 0 0 1 4 13.2V6.8Z"/>') +
      '<path d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v6.4a2.8 2.8 0 0 1-2.8 2.8H12l-4.8 4v-4H6.8A2.8 2.8 0 0 1 4 13.2V6.8Z"/>',
  };

  // Skill / semantic aliases (dashboard stat cards, generic fallbacks).
  P.reading = P.rue5;
  P.uoe = P.rue3;
  P.listening = P.lis1;
  P.writing = P.wri1;
  P.speaking = P.spk;
  P.book = P.rue5;

  const NS = 'http://www.w3.org/2000/svg';

  /* Returns an inline SVG element for the given icon name. */
  function make(name, size) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size || 22));
    svg.setAttribute('height', String(size || 22));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.75');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = P[name] || P.book; // static trusted markup only
    return svg;
  }

  CAE.icons = {
    el: make,
    has: (name) => Object.prototype.hasOwnProperty.call(P, name),
  };
})();
