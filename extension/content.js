'use strict';

// PostureGuard — Content Script
// Lightweight page-level coordinator. Listens for messages from
// background.js and relays to posture overlay modules.

(function () {
  if (window.__postureGuardContentInit) return;
  window.__postureGuardContentInit = true;

  // Listen for messages from background service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'SHOW_NUDGE':
        // Relay to overlay module via custom event
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

      default:
        break;
    }
    return false;
  });

  console.log('[PostureGuard] Content script loaded');
})();
