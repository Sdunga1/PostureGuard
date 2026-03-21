'use strict';

// PostureGuard — Content Script
// Forwards raw landmarks to background for centralized analysis.
// Receives scores and nudges back from background for overlay display.

(function () {
  if (window.__postureGuardContentInit) return;
  window.__postureGuardContentInit = true;

  // ─── Forward frames to background for centralized scoring ───

  window.addEventListener('posture:frame', (e) => {
    // Send raw landmarks to background — background does all analysis
    chrome.runtime.sendMessage({
      type: 'POSTURE_FRAME',
      landmarks: e.detail.landmarks,
      bodyKeypoints: e.detail.bodyKeypoints || null,
      confidence: e.detail.confidence,
      ts: e.detail.ts
    }).catch(() => {});
  });

  // Forward status changes to background
  window.addEventListener('posture:status', (e) => {
    chrome.runtime.sendMessage({
      type: 'POSTURE_STATUS_UPDATE',
      phase: e.detail.phase,
      note: e.detail.note
    }).catch(() => {});
  });

  // ─── Receive messages from background ───────────────────────

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

      case 'POSTURE_SCORE_UPDATE':
        // Relay score from background to overlay
        window.dispatchEvent(new CustomEvent('posture:score', {
          detail: { score: message.score, metrics: message.metrics }
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

  console.log('[PostureGuard] Content script loaded');
})();
