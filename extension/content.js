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

  // ─── Warn before closing owner tab ───────────────────────────

  let isOwnerTab = false;

  function onBeforeUnload(e) {
    if (!isOwnerTab) return;
    e.preventDefault();
    // Chrome requires returnValue to be set for the dialog to show
    e.returnValue = 'PostureGuard is monitoring your posture. Close this tab?';
  }

  // When this tab starts the camera, mark as owner and add warning
  window.addEventListener('posture:status', (e) => {
    if (e.detail.phase === 'live' || e.detail.phase === 'ready') {
      isOwnerTab = true;
      window.addEventListener('beforeunload', onBeforeUnload);
    } else if (e.detail.phase === 'loading' && !isOwnerTab) {
      // Starting up — not owner yet
    }
  });

  // When monitoring is disabled, remove the warning
  window.addEventListener('posture:toggle', (e) => {
    if (!e.detail.enabled) {
      isOwnerTab = false;
      window.removeEventListener('beforeunload', onBeforeUnload);
    }
  });

  console.log('[PostureGuard] Content script loaded');
})();
