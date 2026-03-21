'use strict';

/**
 * PostureGuard Auth Bridge — Content Script
 *
 * Runs on the health app /auth/extension page.
 * Reads token data from the DOM, stores it in chrome.storage.local,
 * and notifies the extension to close this tab.
 */

(function () {
  const AUTH_STORAGE_KEY = 'pg_auth';
  let found = false;

  function tryReadToken() {
    if (found) return true;

    const el = document.getElementById('postureguard-extension-token');
    if (!el) return false;

    const raw = el.getAttribute('data-token');
    if (!raw) return false;

    try {
      const tokenData = JSON.parse(raw);
      if (tokenData && tokenData.access_token) {
        found = true;

        // Store in chrome.storage.local
        chrome.storage.local.set({ [AUTH_STORAGE_KEY]: tokenData }, () => {
          console.log('[PostureGuard] Auth token received and stored');

          // Notify the extension (sidepanel/background) so it can close this tab
          chrome.runtime.sendMessage({ type: 'AUTH_TOKEN_RECEIVED' });
        });
        return true;
      }
    } catch (err) {
      console.error('[PostureGuard] Failed to parse token data:', err);
    }
    return false;
  }

  // Try immediately
  if (tryReadToken()) return;

  // MutationObserver for React renders
  const observer = new MutationObserver(() => {
    if (tryReadToken()) {
      observer.disconnect();
      clearInterval(pollId);
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  // Polling fallback — React state updates can sometimes be missed by MutationObserver
  const pollId = setInterval(() => {
    if (tryReadToken()) {
      clearInterval(pollId);
      observer.disconnect();
    }
  }, 500);

  // Safety timeout
  setTimeout(() => {
    clearInterval(pollId);
    observer.disconnect();
  }, 60000);
})();
