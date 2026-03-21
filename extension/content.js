'use strict';

// PostureGuard — Content Script
// Lightweight page-level coordinator. Listens for messages from
// background.js and relays to posture overlay modules.

(function () {
  if (window.__postureGuardContentInit) return;
  window.__postureGuardContentInit = true;

  // Listen for messages from background service worker
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case 'SHOW_NUDGE':
        window.dispatchEvent(new CustomEvent('posture:nudge', {
          detail: { tip: message.tip }
        }));
        sendResponse({ ok: true });
        break;

      case 'POSTURE_ENABLED_CHANGED':
        window.dispatchEvent(new CustomEvent('posture:toggle', {
          detail: { enabled: message.enabled }
        }));
        sendResponse({ ok: true });
        break;

      case 'TOGGLE_PREVIEW':
        window.dispatchEvent(new CustomEvent('posture:toggle-preview'));
        sendResponse({ ok: true });
        break;

      case 'START_CALIBRATION':
        if (window.PostureCal) {
          window.PostureCal.startCalibration();
        }
        sendResponse({ ok: true });
        break;

      case 'GET_SESSION_DATA':
        if (window.PostureAnalyzer) {
          sendResponse({ ok: true, data: window.PostureAnalyzer.getSessionData() });
        } else {
          sendResponse({ ok: false, error: 'Analyzer not loaded' });
        }
        break;

      case 'GET_STATUS':
        sendResponse({
          ok: true,
          phase: window.PostureCore ? window.PostureCore.getPhase() : 'loading'
        });
        break;

      default:
        break;
    }
    return false;
  });

  // Forward posture score updates to background for side panel
  window.addEventListener('posture:score', (e) => {
    chrome.runtime.sendMessage({
      type: 'POSTURE_SCORE_UPDATE',
      score: e.detail.score,
      metrics: e.detail.metrics,
      ts: e.detail.ts
    }).catch(() => {
      // Side panel might not be open; ignore
    });
  });

  // Forward status changes to background
  window.addEventListener('posture:status', (e) => {
    chrome.runtime.sendMessage({
      type: 'POSTURE_STATUS_UPDATE',
      phase: e.detail.phase,
      note: e.detail.note
    }).catch(() => {
      // Ignore if no listener
    });
  });

  console.log('[PostureGuard] Content script loaded');
})();
