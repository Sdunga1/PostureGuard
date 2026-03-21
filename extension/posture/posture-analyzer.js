'use strict';

// PostureGuard — Posture Analyzer (Thin Relay)
// Scoring and session tracking have moved to background.js for global tab sync.
// This module exists for backward compatibility — exposes getSessionData/resetSession
// which now proxy to background.js.

(function () {
  if (window.__postureAnalyzerInit) return;
  window.__postureAnalyzerInit = true;

  // ─── Session Data (proxied from background) ─────────────────

  async function getSessionData() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_DATA' });
      if (response && response.ok) {
        return response.data;
      }
    } catch (_e) {
      // Background not available
    }
    return {
      version: 1,
      sessionId: 'unknown',
      startTime: null,
      endTime: new Date().toISOString(),
      duration: 0,
      metrics: {
        avgPostureScore: 0,
        avgHeadTilt: 0,
        avgSlouchAngle: 0,
        avgScreenDistance: 0,
        alertCount: 0,
        worstPeriods: []
      }
    };
  }

  function resetSession() {
    // No-op locally — session lives in background
    console.log('[PostureGuard] Session reset requested (handled by background)');
  }

  // Expose for content.js and side panel
  window.PostureAnalyzer = { getSessionData, resetSession };

  console.log('[PostureGuard] Posture analyzer loaded (relay mode)');
})();
