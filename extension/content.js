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

  // ─── Owner tab warning + banner ──────────────────────────────

  let isOwnerTab = false;
  let bannerEl = null;

  function onBeforeUnload(e) {
    if (!isOwnerTab) return;
    e.preventDefault();
    e.returnValue = '';
  }

  function showOwnerBanner() {
    if (bannerEl) return;
    bannerEl = document.createElement('div');
    bannerEl.id = 'postureguard-owner-banner';
    bannerEl.style.cssText = [
      'position: fixed', 'top: 0', 'left: 0', 'right: 0',
      'height: 32px', 'z-index: 2147483647',
      'background: linear-gradient(90deg, #5b21b6, #7c3aed)',
      'color: white', 'display: flex', 'align-items: center',
      'justify-content: center', 'gap: 8px',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'font-size: 12px', 'font-weight: 500',
      'box-shadow: 0 2px 8px rgba(0,0,0,0.2)',
      'letter-spacing: 0.3px'
    ].join('; ');

    // Green pulse dot
    const dot = document.createElement('span');
    dot.style.cssText = [
      'width: 8px', 'height: 8px', 'border-radius: 50%',
      'background: #52c41a', 'display: inline-block',
      'animation: pg-pulse 2s ease-in-out infinite'
    ].join('; ');

    // Text
    const text = document.createElement('span');
    text.textContent = 'PostureGuard is monitoring \u2014 closing this tab will end your session';

    bannerEl.appendChild(dot);
    bannerEl.appendChild(text);

    // Add pulse animation
    const style = document.createElement('style');
    style.id = 'pg-banner-style';
    style.textContent = '@keyframes pg-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }';
    document.documentElement.appendChild(style);
    document.documentElement.appendChild(bannerEl);
  }

  function removeOwnerBanner() {
    if (bannerEl && bannerEl.parentNode) {
      bannerEl.parentNode.removeChild(bannerEl);
      bannerEl = null;
    }
    const style = document.getElementById('pg-banner-style');
    if (style) style.remove();
  }

  // When this tab starts monitoring, show banner + add close warning
  window.addEventListener('posture:status', (e) => {
    if (e.detail.phase === 'live' || e.detail.phase === 'ready') {
      isOwnerTab = true;
      window.addEventListener('beforeunload', onBeforeUnload);
      showOwnerBanner();
    }
  });

  // When monitoring is disabled, remove everything
  window.addEventListener('posture:toggle', (e) => {
    if (!e.detail.enabled) {
      isOwnerTab = false;
      window.removeEventListener('beforeunload', onBeforeUnload);
      removeOwnerBanner();
    }
  });

  console.log('[PostureGuard] Content script loaded');
})();
