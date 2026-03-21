'use strict';

// PostureGuard — Posture Overlay
// Minimal, non-intrusive visual feedback for posture status.

(function () {
  if (window.__postureOverlayInit) return;
  window.__postureOverlayInit = true;

  // ─── Configuration ────────────────────────────────────────────

  const NUDGE_DISPLAY_MS = 8000;  // How long nudge stays visible
  const STYLE_ID = 'posture-overlay-style';
  const INDICATOR_ID = 'posture-indicator';
  const NUDGE_ID = 'posture-nudge';

  // ─── State ────────────────────────────────────────────────────

  let indicatorEl = null;
  let nudgeEl = null;
  let nudgeTimeout = null;
  // Current score tracked for potential future use (debug HUD, etc.)
  let currentScore = 100; // eslint-disable-line no-unused-vars

  // ─── Style Injection ──────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${INDICATOR_ID} {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #52c41a;
        border: 2px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 2147483647;
        pointer-events: none;
        transition: background 0.5s ease, transform 0.3s ease, box-shadow 0.5s ease;
      }

      #${INDICATOR_ID}.warning {
        background: #faad14;
        box-shadow: 0 2px 12px rgba(250, 173, 20, 0.4);
      }

      #${INDICATOR_ID}.bad {
        background: #ff4d4f;
        box-shadow: 0 2px 12px rgba(255, 77, 79, 0.4);
        animation: posture-pulse 2s ease-in-out infinite;
      }

      #${INDICATOR_ID}.hidden {
        display: none;
      }

      #${NUDGE_ID} {
        position: fixed;
        bottom: 50px;
        right: 20px;
        max-width: 320px;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        line-height: 1.5;
        border-radius: 10px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        z-index: 2147483647;
        pointer-events: none;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }

      #${NUDGE_ID}.visible {
        opacity: 1;
        transform: translateY(0);
      }

      #${NUDGE_ID} .nudge-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #faad14;
        margin-bottom: 4px;
      }

      @keyframes posture-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.3); }
      }
    `;
    document.documentElement.appendChild(style);
  }

  // ─── Element Creation ─────────────────────────────────────────

  function ensureElements() {
    if (!indicatorEl) {
      indicatorEl = document.createElement('div');
      indicatorEl.id = INDICATOR_ID;
      indicatorEl.classList.add('hidden');
      document.documentElement.appendChild(indicatorEl);
    }

    if (!nudgeEl) {
      nudgeEl = document.createElement('div');
      nudgeEl.id = NUDGE_ID;
      nudgeEl.innerHTML = `
        <div class="nudge-label">PostureGuard</div>
        <div class="nudge-text"></div>
      `;
      document.documentElement.appendChild(nudgeEl);
    }
  }

  // ─── Updates ──────────────────────────────────────────────────

  function updateIndicator(score) {
    if (!indicatorEl) return;

    indicatorEl.classList.remove('hidden', 'warning', 'bad');

    if (score >= 70) {
      // Green — good posture
    } else if (score >= 50) {
      indicatorEl.classList.add('warning');
    } else {
      indicatorEl.classList.add('bad');
    }

    currentScore = score;
  }

  function showNudge(tip) {
    if (!nudgeEl) return;

    const textEl = nudgeEl.querySelector('.nudge-text');
    if (textEl) textEl.textContent = tip;

    nudgeEl.classList.add('visible');

    if (nudgeTimeout) clearTimeout(nudgeTimeout);
    nudgeTimeout = setTimeout(() => {
      nudgeEl.classList.remove('visible');
    }, NUDGE_DISPLAY_MS);
  }

  function hideAll() {
    if (indicatorEl) indicatorEl.classList.add('hidden');
    if (nudgeEl) nudgeEl.classList.remove('visible');
  }

  // ─── Event Listeners ──────────────────────────────────────────

  window.addEventListener('posture:score', (e) => {
    updateIndicator(e.detail.score);
  });

  window.addEventListener('posture:nudge', (e) => {
    showNudge(e.detail.tip);
  });

  window.addEventListener('posture:status', (e) => {
    const { phase } = e.detail;
    if (phase === 'live') {
      ensureElements();
      if (indicatorEl) indicatorEl.classList.remove('hidden');
    } else {
      // Hide for loading, ready, error, disabled
      hideAll();
    }
  });

  window.addEventListener('posture:toggle', (e) => {
    if (!e.detail.enabled) {
      hideAll();
    }
  });

  // ─── Init ─────────────────────────────────────────────────────

  injectStyles();
  ensureElements();

  console.log('[PostureGuard] Posture overlay loaded');
})();
