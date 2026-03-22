'use strict';

/**
 * PostureGuard Auth Module
 *
 * Manages authentication by delegating to the health app.
 * No Supabase client needed — the extension only stores tokens.
 *
 * Flow:
 * 1. User clicks "Sign In" → extension opens health app /auth/extension in a tab
 * 2. User logs in on health app (Google or email)
 * 3. Health app renders token data in a hidden DOM element
 * 4. Extension content script (auth-bridge.js) reads it, stores in chrome.storage,
 *    and sends AUTH_TOKEN_RECEIVED message
 * 5. Extension closes the auth tab and updates UI
 */

const AUTH_STORAGE_KEY = 'pg_auth';

const PostureGuardAuth = {
  _authTabId: null,

  /**
   * Get the stored auth data (access_token, refresh_token, user, expires_at).
   * Returns null if not authenticated.
   */
  async getAuth() {
    const result = await chrome.storage.local.get(AUTH_STORAGE_KEY);
    const auth = result[AUTH_STORAGE_KEY];
    if (!auth || !auth.access_token) return null;
    return auth;
  },

  /**
   * Get just the access token (for API calls).
   * Auto-refreshes if expired.
   * Returns null if not authenticated.
   */
  async getAccessToken() {
    const auth = await this.getAuth();
    if (!auth) return null;

    // Check if token is expired (with 60s buffer)
    if (auth.expires_at && (Date.now() / 1000) > (auth.expires_at - 60)) {
      const refreshed = await this.refreshToken();
      return refreshed ? refreshed.access_token : null;
    }

    return auth.access_token;
  },

  /**
   * Refresh the access token using the stored refresh token.
   * Returns the new auth data, or null if refresh failed.
   */
  async refreshToken() {
    const auth = await this.getAuth();
    if (!auth || !auth.refresh_token) return null;

    try {
      const healthAppUrl = typeof HEALTH_APP_URL !== 'undefined' ? HEALTH_APP_URL : 'https://posture-guard-hackasu.vercel.app';
      const res = await fetch(healthAppUrl + '/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: auth.refresh_token })
      });

      if (!res.ok) {
        console.warn('[PostureGuard] Token refresh failed:', res.status);
        return null;
      }

      const newAuth = await res.json();
      await this.setAuth(newAuth);
      console.log('[PostureGuard] Token refreshed successfully');
      return newAuth;
    } catch (err) {
      console.warn('[PostureGuard] Token refresh error:', err.message);
      return null;
    }
  },

  /**
   * Get the current user object.
   * Returns null if not authenticated.
   */
  async getUser() {
    const auth = await this.getAuth();
    return auth ? auth.user : null;
  },

  /**
   * Store auth data from the health app.
   */
  async setAuth(data) {
    await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: data });
  },

  /**
   * Clear auth data (sign out).
   */
  async signOut() {
    await chrome.storage.local.remove([AUTH_STORAGE_KEY, 'apiKey']);
  },

  /**
   * Check if the token has expired.
   */
  async isExpired() {
    const auth = await this.getAuth();
    if (!auth || !auth.expires_at) return true;
    return Date.now() / 1000 > auth.expires_at;
  },

  /**
   * Open the health app login page to authenticate.
   * Returns the tab ID so we can close it later.
   */
  async startLogin(healthAppUrl) {
    const url = healthAppUrl + '/auth/extension';
    const tab = await chrome.tabs.create({ url });
    this._authTabId = tab.id;
    return tab.id;
  },

  /**
   * Close the auth tab if it's still open.
   */
  async closeAuthTab() {
    if (this._authTabId) {
      try {
        await chrome.tabs.remove(this._authTabId);
      } catch (_e) {
        // Tab may already be closed
      }
      this._authTabId = null;
    }
  },
};

// Export for use in sidepanel.js
window.PostureGuardAuth = PostureGuardAuth;
