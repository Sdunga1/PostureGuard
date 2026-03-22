'use strict';

// PostureGuard — Side Panel UI
// Controls for posture monitoring, calibration, settings, and session reports.

(function () {
  // ─── Element References ─────────────────────────────────────

  const els = {
    postureToggle: document.getElementById('posture-toggle'),
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    scoreSection: document.getElementById('score-section'),
    scoreDisplay: document.getElementById('score-display'),
    calibrateBtn: document.getElementById('calibrate-btn'),
    calStatus: document.getElementById('cal-status'),
    thresholdSlider: document.getElementById('threshold-slider'),
    thresholdValue: document.getElementById('threshold-value'),
    durationSelect: document.getElementById('duration-select'),
    debugToggle: document.getElementById('debug-toggle'),
    sessionSection: document.getElementById('session-section'),
    sessionDuration: document.getElementById('session-duration'),
    sessionAvg: document.getElementById('session-avg'),
    sessionAlerts: document.getElementById('session-alerts'),
    reportBtn: document.getElementById('report-btn'),
    qrSection: document.getElementById('qr-section'),
    qrContainer: document.getElementById('qr-container'),
    apiKeyInput: document.getElementById('api-key-input'),
    saveKeyBtn: document.getElementById('save-key-btn'),
    settingsGearBtn: document.getElementById('settings-gear-btn'),
    settingsOverlay: document.getElementById('settings-overlay'),
    settingsCloseBtn: document.getElementById('settings-close-btn'),
    // Auth elements
    welcomeScreen: document.getElementById('welcome-screen'),
    mainApp: document.getElementById('main-app'),
    authSignoutBtn: document.getElementById('auth-signout-btn'),
    authName: document.getElementById('auth-name'),
    authEmailDisplay: document.getElementById('auth-email-display'),
    authAvatar: document.getElementById('auth-avatar'),
    dropdownAvatar: document.getElementById('dropdown-avatar'),
    profileBtn: document.getElementById('profile-btn'),
    profileDropdown: document.getElementById('profile-dropdown'),
    profileInitial: document.getElementById('profile-initial'),
    dropdownInitial: document.getElementById('dropdown-initial'),
    authGoogleBtn: document.getElementById('auth-google-btn'),
    authError: document.getElementById('auth-error'),
    vaultStatus: document.getElementById('vault-status'),
    settingsSection: document.getElementById('settings-section')
  };

  // ─── Auth State ────────────────────────────────────────────────
  let currentUser = null;

  function updateAuthUI(user) {
    currentUser = user;
    if (user) {
      // Show main app, hide welcome
      if (els.welcomeScreen) els.welcomeScreen.style.display = 'none';
      if (els.mainApp) els.mainApp.style.display = '';

      const name = user.name || user.email?.split('@')[0] || 'User';
      const email = user.email || '';
      const initial = (name.charAt(0) || 'U').toUpperCase();

      if (els.authName) els.authName.textContent = name;
      if (els.authEmailDisplay) els.authEmailDisplay.textContent = email;
      if (els.profileInitial) els.profileInitial.textContent = initial;
      if (els.dropdownInitial) els.dropdownInitial.textContent = initial;

      const avatar = user.avatar_url;
      if (avatar) {
        if (els.authAvatar) { els.authAvatar.src = avatar; els.authAvatar.style.display = ''; }
        if (els.dropdownAvatar) { els.dropdownAvatar.src = avatar; els.dropdownAvatar.style.display = ''; }
        if (els.profileInitial) els.profileInitial.style.display = 'none';
        if (els.dropdownInitial) els.dropdownInitial.style.display = 'none';
      } else {
        if (els.authAvatar) els.authAvatar.style.display = 'none';
        if (els.dropdownAvatar) els.dropdownAvatar.style.display = 'none';
        if (els.profileInitial) els.profileInitial.style.display = '';
        if (els.dropdownInitial) els.dropdownInitial.style.display = '';
      }
    } else {
      // Show welcome, hide main app
      if (els.welcomeScreen) els.welcomeScreen.style.display = '';
      if (els.mainApp) els.mainApp.style.display = 'none';
    }
  }

  async function initAuth() {
    const auth = window.PostureGuardAuth;
    if (!auth) return;

    // Check existing stored session
    const user = await auth.getUser();
    updateAuthUI(user);

    if (user) {
      await syncVaultToLocal();
    }

    // Listen for auth changes via chrome.storage (set by auth-bridge.js)
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area !== 'local' || !changes.pg_auth) return;

      const newAuth = changes.pg_auth.newValue;
      if (newAuth && newAuth.user) {
        updateAuthUI(newAuth.user);
        await syncVaultToLocal();
      } else {
        updateAuthUI(null);
        await chrome.storage.local.remove('apiKey');
      }
    });

    // Listen for AUTH_TOKEN_RECEIVED from auth-bridge content script
    chrome.runtime.onMessage.addListener(async (message) => {
      if (message.type === 'AUTH_TOKEN_RECEIVED') {
        stopAuthPoll();
        // Close the auth tab
        await auth.closeAuthTab();
        // Refresh UI immediately (storage.onChanged should also fire, but be safe)
        const user = await auth.getUser();
        if (user) {
          updateAuthUI(user);
          await syncVaultToLocal();
        }
      }
    });
  }

  async function syncVaultToLocal() {
    try {
      const token = await window.PostureGuardAuth.getAccessToken();
      if (!token) return;

      const response = await fetch(getHealthAppUrl() + '/api/vault', {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (response.ok) {
        const { key } = await response.json();
        if (key) {
          await chrome.storage.local.set({ apiKey: key });
          settings.apiKey = key;
          if (els.apiKeyInput) els.apiKeyInput.value = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
          showVaultStatus('Key synced from cloud', false);
        }
      }
    } catch (err) {
      console.warn('[PostureGuard] Vault sync failed:', err.message);
    }
  }

  async function saveKeyToVault(key) {
    const token = await window.PostureGuardAuth?.getAccessToken();
    if (!token) return false;

    try {
      const response = await fetch(getHealthAppUrl() + '/api/vault', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key })
      });

      if (response.ok) {
        showVaultStatus('Saved securely in cloud', false);
        return true;
      }
    } catch (err) {
      console.warn('[PostureGuard] Vault save failed:', err.message);
    }
    return false;
  }

  function showVaultStatus(msg, isError) {
    if (els.vaultStatus) {
      els.vaultStatus.textContent = msg;
      els.vaultStatus.style.display = '';
      els.vaultStatus.className = 'vault-status' + (isError ? ' error' : '');
      setTimeout(() => { els.vaultStatus.style.display = 'none'; }, 4000);
    }
  }

  function getHealthAppUrl() {
    // Use localhost for dev, Vercel for production
    return 'http://localhost:3000';
  }

  // ─── Settings ─────────────────────────────────────────────────

  let sessionEnded = false; // Flag to prevent UI reset after session completes
  let userPaused = false;   // Flag to block status updates while user manually paused

  const settings = {
    postureEnabled: false,
    alertThresholdMs: 5000,
    debugMode: false,
    apiKey: ''
  };

  async function loadSettings() {
    const stored = await chrome.storage.local.get([
      'postureEnabled', 'alertThresholdMs', 'debugMode', 'apiKey', 'postureCalV1'
    ]);
    Object.assign(settings, stored);

    // Update UI
    if (els.postureToggle) {
      els.postureToggle.checked = settings.postureEnabled;
    }
    if (els.thresholdSlider) {
      els.thresholdSlider.value = (settings.alertThresholdMs || 5000) / 1000;
      els.thresholdValue.textContent = els.thresholdSlider.value + 's';
    }
    if (els.durationSelect) {
      const durationVal = (stored.sessionDurationMs !== null && stored.sessionDurationMs !== undefined) ? stored.sessionDurationMs : 60000;
      els.durationSelect.value = durationVal;
    }
    if (els.debugToggle) {
      els.debugToggle.checked = settings.debugMode || false;
    }

    // Only show "Calibrated" if monitoring is enabled
    if (stored.postureCalV1 && els.calStatus && settings.postureEnabled) {
      els.calStatus.textContent = 'Calibrated';
      els.calStatus.classList.add('calibrated');
    } else if (els.calStatus) {
      els.calStatus.textContent = 'Not calibrated';
      els.calStatus.classList.remove('calibrated');
    }

    if (settings.apiKey && els.apiKeyInput) {
      els.apiKeyInput.value = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
    }

    // Don't reset UI if session just ended — let the session-complete screen stay
    if (!settings.postureEnabled && !sessionEnded) {
      updateStatusUI('disabled');
    }
  }

  async function saveSetting(key, value) {
    settings[key] = value;
    await chrome.storage.local.set({ [key]: value });
  }

  // ─── Send message to content script safely ──────────────────

  async function sendToActiveTab(message, silent) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return null;

      // Skip chrome://, edge://, about: pages where content scripts can't run
      if (tab.url && (tab.url.startsWith('chrome://') ||
                      tab.url.startsWith('edge://') ||
                      tab.url.startsWith('about:') ||
                      tab.url.startsWith('chrome-extension://'))) {
        if (!silent) {
          updateStatusUI('error');
          if (els.statusText) {
            els.statusText.textContent = 'Open a webpage first';
          }
        }
        return null;
      }
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (_err) {
      // Content script is stale (extension was reloaded).
      // Auto-reload the tab to get a fresh content script, then retry.
      if (!silent) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          if (els.statusText) {
            els.statusText.textContent = 'Reconnecting...';
          }
          await chrome.tabs.reload(tab.id);
          // Wait for tab to finish loading
          await new Promise(resolve => {
            const listener = (tabId, info) => {
              if (tabId === tab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
              }
            };
            chrome.tabs.onUpdated.addListener(listener);
            // Safety timeout
            setTimeout(() => {
              chrome.tabs.onUpdated.removeListener(listener);
              resolve();
            }, 5000);
          });
          // Retry the message with the fresh content script
          try {
            return await chrome.tabs.sendMessage(tab.id, message);
          } catch (_retryErr) {
            return null;
          }
        }
      }
      return null;
    }
  }

  // ─── Status UI ────────────────────────────────────────────────

  let typingInterval = null;

  function startTypingAnimation(text) {
    if (typingInterval) clearInterval(typingInterval);
    let dots = 0;
    const base = text.replace(/\.+$/, '');
    els.statusText.textContent = base;
    typingInterval = setInterval(() => {
      dots = (dots + 1) % 4;
      els.statusText.textContent = base + '.'.repeat(dots || 1);
    }, 400);
  }

  function stopTypingAnimation() {
    if (typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
  }

  function updateStatusUI(phase) {
    if (!els.statusDot) return;
    els.statusDot.className = 'status-dot';
    stopTypingAnimation();

    const isMonitoring = phase === 'live' || phase === 'ready' || phase === 'loading';

    // Lock/unlock settings + calibration based on state
    if (els.settingsSection) {
      if (isMonitoring) {
        els.settingsSection.classList.remove('disabled-section');
      } else {
        els.settingsSection.classList.add('disabled-section');
      }
    }

    // Calibration section locking
    const calSection = els.calibrateBtn?.closest('.section');
    if (calSection) {
      if (isMonitoring || phase === 'paused') {
        calSection.classList.remove('disabled-section');
      } else {
        calSection.classList.add('disabled-section');
      }
    }

    // Calibrate button state
    if (els.calibrateBtn) {
      if (phase === 'ready' || phase === 'live' || phase === 'paused') {
        els.calibrateBtn.disabled = false;
      } else {
        els.calibrateBtn.disabled = true;
      }
    }

    switch (phase) {
      case 'disabled':
        els.statusDot.classList.add('off');
        els.statusText.textContent = 'Disabled';
        if (els.scoreSection) els.scoreSection.style.display = 'none';
        if (els.sessionSection) els.sessionSection.style.display = 'none';
        if (els.calibrateBtn) els.calibrateBtn.textContent = 'Calibrate Posture';
        break;
      case 'loading':
        els.statusDot.classList.add('loading');
        startTypingAnimation('Starting');
        break;
      case 'ready':
        els.statusDot.classList.add('ready');
        els.statusText.textContent = 'Calibrate to start';
        break;
      case 'live':
        els.statusDot.classList.add('live');
        els.statusText.textContent = 'Monitoring';
        if (els.scoreSection) els.scoreSection.style.display = '';
        if (els.sessionSection) els.sessionSection.style.display = '';
        if (els.calibrateBtn) els.calibrateBtn.textContent = 'Recalibrate Posture';
        // Disable report during active session
        if (els.reportBtn) { els.reportBtn.disabled = true; els.reportBtn.className = 'btn btn-secondary'; }
        break;
      case 'paused':
        els.statusDot.classList.add('ready');
        els.statusText.textContent = 'Paused';
        if (els.scoreSection) els.scoreSection.style.display = '';
        if (els.sessionSection) els.sessionSection.style.display = '';
        if (els.reportBtn) { els.reportBtn.disabled = true; els.reportBtn.className = 'btn btn-secondary'; }
        break;
      case 'session-complete':
        els.statusDot.classList.add('session-complete');
        els.statusText.textContent = 'Start a new session';
        // Score stays visible, session stays visible
        if (els.scoreSection) els.scoreSection.style.display = '';
        if (els.sessionSection) els.sessionSection.style.display = '';
        break;
      case 'error':
        els.statusDot.classList.add('error');
        els.statusText.textContent = 'Error';
        break;
    }
  }

  // ─── Event Handlers ───────────────────────────────────────────

  if (els.postureToggle) {
    els.postureToggle.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await saveSetting('postureEnabled', enabled);

      if (!enabled) {
        if (sessionEnded) {
          updateStatusUI('session-complete');
        } else {
          const hasCalibration = await chrome.storage.local.get('postureCalV1');
          if (hasCalibration.postureCalV1) {
            userPaused = true;
            updateStatusUI('paused');
          } else {
            updateStatusUI('disabled');
          }
        }
      } else {
        userPaused = false;
        updateStatusUI('loading');
        sessionEnded = false;
        lastSavedSessionUrl = null;
      }

      // Notify content script on active tab
      const response = await sendToActiveTab({
        type: 'POSTURE_ENABLED_CHANGED',
        enabled
      });

      if (!response && enabled) {
        updateStatusUI('error');
        if (els.statusText) {
          els.statusText.textContent = 'Open a webpage and try again';
        }
      }
    });
  }

  if (els.calibrateBtn) {
    els.calibrateBtn.addEventListener('click', async () => {
      await sendToActiveTab({ type: 'START_CALIBRATION' });
    });
  }

  if (els.thresholdSlider) {
    els.thresholdSlider.addEventListener('input', (e) => {
      const seconds = parseInt(e.target.value, 10);
      els.thresholdValue.textContent = seconds + 's';
      saveSetting('alertThresholdMs', seconds * 1000);
    });
  }

  if (els.durationSelect) {
    els.durationSelect.addEventListener('change', (e) => {
      saveSetting('sessionDurationMs', parseInt(e.target.value, 10));
    });
  }

  if (els.debugToggle) {
    els.debugToggle.addEventListener('change', async (e) => {
      const debugOn = e.target.checked;
      await saveSetting('debugMode', debugOn);
      // Toggle camera preview
      await sendToActiveTab({ type: 'SET_PREVIEW', enabled: debugOn });
    });
  }

  if (els.saveKeyBtn) {
    els.saveKeyBtn.addEventListener('click', async () => {
      const key = els.apiKeyInput.value.trim();
      if (key && !key.startsWith('\u2022')) {
        // Save locally
        await saveSetting('apiKey', key);
        els.apiKeyInput.value = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';

        // Also save to vault if logged in
        if (currentUser) {
          await saveKeyToVault(key);
        }

        // Close settings panel after saving
        if (els.settingsOverlay) els.settingsOverlay.style.display = 'none';
      }
    });
  }

  // ─── Auth Event Listeners ──────────────────────────────────────

  // Single "Sign In" button — opens health app login page
  const signInBtn = els.authGoogleBtn || els.authSigninBtn;
  let authPollId = null;

  function stopAuthPoll() {
    if (authPollId) {
      clearInterval(authPollId);
      authPollId = null;
    }
  }

  if (signInBtn) {
    signInBtn.addEventListener('click', async () => {
      signInBtn.disabled = true;
      signInBtn.textContent = 'Waiting for sign in...';

      try {
        await window.PostureGuardAuth.startLogin(getHealthAppUrl());

        // Poll for auth completion as a fallback
        // (in case chrome.storage.onChanged event is missed)
        stopAuthPoll();
        authPollId = setInterval(async () => {
          const user = await window.PostureGuardAuth.getUser();
          if (user) {
            stopAuthPoll();
            updateAuthUI(user);
            await syncVaultToLocal();
            await window.PostureGuardAuth.closeAuthTab();
            signInBtn.disabled = false;
            signInBtn.textContent = 'Sign In';
          }
        }, 1000);

        // Stop polling after 2 minutes
        setTimeout(stopAuthPoll, 120000);
      } catch (err) {
        console.warn('[PostureGuard] Failed to open login:', err.message);
        signInBtn.disabled = false;
        signInBtn.textContent = 'Sign In';
      }
    });

    // Re-enable button when auth storage changes (success or tab closed without signing in)
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.pg_auth) {
        stopAuthPoll();
        signInBtn.disabled = false;
        signInBtn.textContent = 'Sign In';
      }
    });

    // Also re-enable if user closes the auth tab manually
    chrome.tabs.onRemoved.addListener((tabId) => {
      if (tabId === window.PostureGuardAuth?._authTabId) {
        stopAuthPoll();
        window.PostureGuardAuth._authTabId = null;
        signInBtn.disabled = false;
        signInBtn.textContent = 'Sign In';
      }
    });
  }

  if (els.authSignoutBtn) {
    els.authSignoutBtn.addEventListener('click', async () => {
      els.authSignoutBtn.disabled = true;
      els.authSignoutBtn.textContent = 'Signing out...';

      try {
        // Stop monitoring before logging out
        if (settings.postureEnabled) {
          await saveSetting('postureEnabled', false);
          if (els.postureToggle) els.postureToggle.checked = false;
          await sendToActiveTab({ type: 'POSTURE_ENABLED_CHANGED', enabled: false });
          updateStatusUI('disabled');
        }

        // Clear auth data
        await window.PostureGuardAuth.signOut();
      } catch (err) {
        console.warn('[PostureGuard] Logout failed:', err.message);
      }

      if (els.profileDropdown) els.profileDropdown.style.display = 'none';
      updateAuthUI(null);

      // Re-enable button
      els.authSignoutBtn.disabled = false;
      els.authSignoutBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0v2z"/><path d="M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3z"/></svg> Sign Out';
    });
  }

  // Profile dropdown toggle
  if (els.profileBtn) {
    els.profileBtn.addEventListener('click', () => {
      if (els.profileDropdown) {
        const isOpen = els.profileDropdown.style.display !== 'none';
        els.profileDropdown.style.display = isOpen ? 'none' : '';
      }
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (els.profileDropdown && els.profileBtn &&
        !els.profileBtn.contains(e.target) &&
        !els.profileDropdown.contains(e.target)) {
      els.profileDropdown.style.display = 'none';
    }
  });

  // Settings gear — open/close settings overlay
  if (els.settingsGearBtn) {
    els.settingsGearBtn.addEventListener('click', () => {
      if (els.settingsOverlay) els.settingsOverlay.style.display = 'flex';
    });
  }
  if (els.settingsCloseBtn) {
    els.settingsCloseBtn.addEventListener('click', () => {
      if (els.settingsOverlay) els.settingsOverlay.style.display = 'none';
    });
  }
  // Close on overlay background click
  if (els.settingsOverlay) {
    els.settingsOverlay.addEventListener('click', (e) => {
      if (e.target === els.settingsOverlay) {
        els.settingsOverlay.style.display = 'none';
      }
    });
  }

  // ─── Report Loading Animation Helpers ───────────────────────
  function createReportLoading() {
    const html = `
      <div class="report-loading" id="report-loading">
        <div class="report-loading-top">
          <div class="silhouette-container" id="silhouette">
            <svg class="silhouette-svg" viewBox="0 0 80 100">
              <!-- Body fill -->
              <ellipse class="body-fill" cx="40" cy="22" rx="14" ry="16"/>
              <path class="body-fill" d="M20,45 Q20,35 40,35 Q60,35 60,45 L58,75 Q58,80 40,80 Q22,80 22,75 Z"/>
              <!-- Body outline -->
              <ellipse class="body-outline" cx="40" cy="22" rx="14" ry="16"/>
              <path class="body-outline" d="M20,45 Q20,35 40,35 Q60,35 60,45 L58,75 Q58,80 40,80 Q22,80 22,75 Z"/>
              <!-- Shoulders -->
              <line class="body-outline" x1="8" y1="48" x2="20" y2="42"/>
              <line class="body-outline" x1="72" y1="48" x2="60" y2="42"/>
              <!-- Arms -->
              <line class="body-outline" x1="8" y1="48" x2="12" y2="72"/>
              <line class="body-outline" x1="72" y1="48" x2="68" y2="72"/>
              <!-- Spine hint -->
              <line class="body-outline" x1="40" y1="38" x2="40" y2="75" style="opacity:0.15"/>
            </svg>
            <div class="scan-line"></div>
          </div>
        </div>
        <div class="report-steps">
          <div class="report-steps-fill" id="steps-fill"></div>
          <div class="report-step" id="step-1">
            <div class="step-circle">1</div>
            <span class="step-label">Collecting session metrics</span>
          </div>
          <div class="report-step" id="step-2">
            <div class="step-circle">2</div>
            <span class="step-label">Analyzing posture patterns</span>
          </div>
          <div class="report-step" id="step-3">
            <div class="step-circle">3</div>
            <span class="step-label">Generating AI recommendations</span>
          </div>
          <div class="report-step" id="step-4">
            <div class="step-circle">4</div>
            <span class="step-label">Building your report</span>
          </div>
        </div>
      </div>`;
    return html;
  }

  function advanceStep(stepNum, totalSteps) {
    // Mark previous steps as done
    for (let i = 1; i < stepNum; i++) {
      const el = document.getElementById('step-' + i);
      if (el) {
        el.classList.remove('active');
        el.classList.add('done');
        el.querySelector('.step-circle').textContent = '✓';
      }
    }
    // Mark current step as active
    const current = document.getElementById('step-' + stepNum);
    if (current) {
      current.classList.add('active');
    }
    // Update fill line height
    const fill = document.getElementById('steps-fill');
    if (fill) {
      const pct = ((stepNum - 1) / (totalSteps - 1)) * 100;
      fill.style.height = pct + '%';
    }
    // Change silhouette color on last step
    if (stepNum === totalSteps) {
      const sil = document.getElementById('silhouette');
      if (sil) sil.classList.add('scan-done');
    }
  }

  function completeAllSteps(totalSteps) {
    for (let i = 1; i <= totalSteps; i++) {
      const el = document.getElementById('step-' + i);
      if (el) {
        el.classList.remove('active');
        el.classList.add('done');
        el.querySelector('.step-circle').textContent = '✓';
      }
    }
    const fill = document.getElementById('steps-fill');
    if (fill) fill.style.height = '100%';
    const sil = document.getElementById('silhouette');
    if (sil) sil.classList.add('scan-done');
  }

  if (els.reportBtn) {
    els.reportBtn.addEventListener('click', async () => {
      // Replace button with loading animation
      const sessionSection = els.reportBtn.parentElement;
      const originalContent = els.reportBtn.outerHTML;
      els.reportBtn.style.display = 'none';
      sessionSection.insertAdjacentHTML('beforeend', createReportLoading());

      const TOTAL_STEPS = 4;

      try {
        // Step 1: Collect metrics
        advanceStep(1, TOTAL_STEPS);
        const sessionResponse = await chrome.runtime.sendMessage({ type: 'GET_SESSION_DATA' });

        if (sessionResponse && sessionResponse.ok) {
          // Step 2: Analyze patterns
          await new Promise(r => setTimeout(r, 600));
          advanceStep(2, TOTAL_STEPS);

          // Step 3: AI recommendations
          await new Promise(r => setTimeout(r, 500));
          advanceStep(3, TOTAL_STEPS);
          const result = await chrome.runtime.sendMessage({
            type: 'GENERATE_REPORT',
            sessionData: sessionResponse.data
          });

          if (result && result.analysis) {
            sessionResponse.data.claudeAnalysis = result.analysis;
          }

          // Step 4: Build report
          advanceStep(4, TOTAL_STEPS);
          await new Promise(r => setTimeout(r, 400));
          completeAllSteps(TOTAL_STEPS);
          await new Promise(r => setTimeout(r, 600));

          // Save session to cloud if logged in (reuse auto-saved URL if available)
          let sessionUrl = null;
          let saveFailed = false;
          if (currentUser) {
            if (lastSavedSessionUrl) {
              sessionUrl = lastSavedSessionUrl;
            } else {
              sessionUrl = await postSessionToCloud(sessionResponse.data);
              if (!sessionUrl) saveFailed = true;
              else lastSavedSessionUrl = sessionUrl;
            }
          }

          if (els.qrSection) els.qrSection.style.display = '';
          if (els.qrContainer) {
            if (sessionUrl) {
              els.qrContainer.innerHTML =
                '<p style="font-size: 12px; color: var(--color-success); text-align: center;">' +
                'Session saved! Open your health app:</p>' +
                '<button id="open-app-btn" class="btn btn-primary" style="width:100%;margin-top:8px;font-size:13px;">Open Health App</button>' +
                '<button id="copy-link-btn" class="btn btn-secondary" style="width:100%;margin-top:6px;font-size:12px;">Copy Link</button>';

              const openBtn = document.getElementById('open-app-btn');
              if (openBtn) {
                openBtn.addEventListener('click', () => {
                  window.open(sessionUrl, '_blank', 'width=1200,height=800,menubar=no,toolbar=no');
                });
              }

              const copyBtn = document.getElementById('copy-link-btn');
              if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                  navigator.clipboard.writeText(sessionUrl);
                  copyBtn.textContent = 'Copied!';
                  setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, 2000);
                });
              }
            } else if (saveFailed) {
              els.qrContainer.innerHTML =
                '<p style="font-size: 12px; color: #f59e0b; text-align: center;">' +
                'Could not save session. Try generating the report again.</p>' +
                '<button id="retry-save-btn" class="btn btn-secondary" style="width:100%;margin-top:8px;font-size:12px;">Retry Save</button>';

              const retryBtn = document.getElementById('retry-save-btn');
              if (retryBtn) {
                retryBtn.addEventListener('click', async () => {
                  retryBtn.textContent = 'Saving...';
                  retryBtn.disabled = true;
                  const url = await postSessionToCloud(sessionResponse.data);
                  if (url) {
                    els.qrContainer.innerHTML =
                      '<p style="font-size: 12px; color: var(--color-success); text-align: center;">' +
                      'Session saved!</p>' +
                      '<button id="open-app-btn2" class="btn btn-primary" style="width:100%;margin-top:8px;font-size:13px;">Open Health App</button>';
                    const btn = document.getElementById('open-app-btn2');
                    if (btn) btn.addEventListener('click', () => window.open(url, '_blank'));
                  } else {
                    retryBtn.textContent = 'Retry Save';
                    retryBtn.disabled = false;
                  }
                });
              }
            } else {
              els.qrContainer.innerHTML =
                '<p style="font-size: 12px; color: #666; text-align: center;">' +
                'Sign in to save sessions and share reports.</p>';
            }
          }
        }
      } catch (err) {
        console.error('[PostureGuard] Report generation failed:', err);
      } finally {
        // Remove loading animation, restore button
        const loadingEl = document.getElementById('report-loading');
        if (loadingEl) loadingEl.remove();
        els.reportBtn.style.display = '';
        els.reportBtn.textContent = 'Generate Report';
        els.reportBtn.disabled = false;
      }
    });
  }

  // ─── Listen for Storage Changes ───────────────────────────────

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes.postureCalV1 && changes.postureCalV1.newValue && els.calStatus) {
      els.calStatus.textContent = 'Calibrated';
      els.calStatus.classList.add('calibrated');
    }
  });

  // ─── Session Complete UI ──────────────────────────────────────

  function showSessionCompleteUI(sessionData) {
    sessionEnded = true;

    // Stop session timer
    if (sessionUpdateInterval) {
      clearInterval(sessionUpdateInterval);
      sessionUpdateInterval = null;
    }

    // Use proper state machine phase
    if (els.postureToggle) els.postureToggle.checked = false;
    updateStatusUI('session-complete');

    // Show final session stats
    if (sessionData) {
      if (els.scoreDisplay) {
        els.scoreDisplay.textContent = sessionData.metrics.avgPostureScore || '--';
      }
      if (els.sessionDuration) {
        els.sessionDuration.textContent = Math.floor(sessionData.duration / 60) + 'm';
      }
      if (els.sessionAvg) {
        els.sessionAvg.textContent = sessionData.metrics.avgPostureScore || '--';
      }
      if (els.sessionAlerts) {
        els.sessionAlerts.textContent = sessionData.metrics.alertCount || 0;
      }
    }

    // Add "Session complete" label inside session card
    const durationMin = sessionData ? Math.ceil(sessionData.duration / 60) : 1;
    const sessionH2 = els.sessionSection?.querySelector('h2');
    if (sessionH2) {
      sessionH2.textContent = `Session Complete (${durationMin} min)`;
    }

    // Highlight report button with gradient
    if (els.reportBtn) {
      els.reportBtn.className = 'btn btn-report';
      els.reportBtn.textContent = 'Generate Report \u2192';
      els.reportBtn.disabled = false;
    }

    // Auto-save session to cloud if logged in
    if (currentUser && sessionData) {
      autoSaveSession(sessionData);
    }
  }

  // ─── Listen for Messages from background/content ──────────────

  let sessionStartTime = null;
  let sessionUpdateInterval = null;

  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case 'POSTURE_SCORE_UPDATE':
        if (els.scoreDisplay) {
          els.scoreDisplay.textContent = message.score;
          if (els.scoreSection) els.scoreSection.style.display = '';
        }
        // Start session timer if not already running
        if (!sessionStartTime) {
          sessionStartTime = Date.now();
          startSessionTimer();
        }
        break;
      case 'POSTURE_STATUS_UPDATE':
        if (!sessionEnded && !userPaused) {
          updateStatusUI(message.phase);
        }
        break;
      case 'SESSION_ENDED':
        showSessionCompleteUI(message.session);
        break;
    }
  });

  // Update session stats every 5 seconds
  function startSessionTimer() {
    if (sessionUpdateInterval) return;
    sessionUpdateInterval = setInterval(async () => {
      // Stop polling if session ended
      if (sessionEnded) {
        clearInterval(sessionUpdateInterval);
        sessionUpdateInterval = null;
        return;
      }
      try {
        const state = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_STATE' });
        if (state && state.ok && state.session) {
          if (els.sessionSection) els.sessionSection.style.display = '';
          if (els.sessionDuration) {
            els.sessionDuration.textContent = Math.floor(state.session.duration / 60) + 'm';
          }
          if (els.sessionAvg) {
            els.sessionAvg.textContent = state.session.metrics.avgPostureScore || '--';
          }
          if (els.sessionAlerts) {
            els.sessionAlerts.textContent = state.session.metrics.alertCount || 0;
          }
        }
      } catch (_e) {
        // Background not available
      }
    }, 5000);
  }

  // ─── Lock controls on non-owner tabs ─────────────────────────

  function lockControls(message) {
    // Disable all interactive controls
    if (els.postureToggle) els.postureToggle.disabled = true;
    if (els.calibrateBtn) els.calibrateBtn.disabled = true;
    if (els.thresholdSlider) els.thresholdSlider.disabled = true;
    if (els.debugToggle) els.debugToggle.disabled = true;
    if (els.reportBtn) els.reportBtn.disabled = true;

    // Show locked message
    if (els.statusDot) {
      els.statusDot.className = 'status-dot';
      els.statusDot.classList.add('loading');
    }
    if (els.statusText) {
      els.statusText.textContent = message || 'Monitoring active on another tab';
    }
  }

  // ─── Restore state from background on (re)open ──────────────

  async function restoreState() {
    try {
      // Get the active tab ID so we can check if WE are the owner
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const myTabId = activeTab ? activeTab.id : null;

      const state = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_STATE' });
      if (!state || !state.ok) return;

      // Check ownership: are we the owner tab?
      const isOwner = !state.ownerTabId || state.ownerTabId === myTabId;

      // If monitoring is running on ANOTHER tab, lock this panel
      if (state.isRunning && !isOwner) {
        lockControls('Monitoring active on another tab');

        // Still show the live score (read-only)
        if (state.lastScore !== null && els.scoreDisplay) {
          els.scoreDisplay.textContent = state.lastScore;
          if (els.scoreSection) els.scoreSection.style.display = '';
        }
        if (state.session && els.sessionSection) {
          els.sessionSection.style.display = '';
          if (els.sessionDuration) {
            els.sessionDuration.textContent = Math.floor(state.session.duration / 60) + 'm';
          }
          if (els.sessionAvg) {
            els.sessionAvg.textContent = state.session.metrics.avgPostureScore || '--';
          }
          if (els.sessionAlerts) {
            els.sessionAlerts.textContent = state.session.metrics.alertCount || 0;
          }
        }
        return;
      }

      // Session just completed — show report prompt
      if (state.sessionComplete) {
        showSessionCompleteUI(state.session);
        if (state.hasCalibration && els.calStatus) {
          els.calStatus.textContent = 'Calibrated';
          els.calStatus.classList.add('calibrated');
        }
        return;
      }

      // This IS the owner tab (or no owner yet) — full controls available

      // Restore score display
      if (state.lastScore !== null && els.scoreDisplay) {
        els.scoreDisplay.textContent = state.lastScore;
        if (els.scoreSection) els.scoreSection.style.display = '';
      }

      // Restore session stats
      if (state.session && state.isRunning && els.sessionSection) {
        els.sessionSection.style.display = '';
        if (els.sessionDuration) {
          els.sessionDuration.textContent = Math.floor(state.session.duration / 60) + 'm';
        }
        if (els.sessionAvg) {
          els.sessionAvg.textContent = state.session.metrics.avgPostureScore || '--';
        }
        if (els.sessionAlerts) {
          els.sessionAlerts.textContent = state.session.metrics.alertCount || 0;
        }
      }

      // Restore calibration badge + button text
      if (state.hasCalibration && els.calStatus) {
        els.calStatus.textContent = 'Calibrated';
        els.calStatus.classList.add('calibrated');
        if (els.calibrateBtn) els.calibrateBtn.textContent = 'Recalibrate Posture';
      }

      // Restore monitoring status using proper state machine
      if (state.isRunning || state.postureEnabled) {
        if (state.isRunning && state.hasCalibration) {
          updateStatusUI('live');
        } else if (state.hasCalibration) {
          updateStatusUI('ready');
        } else {
          updateStatusUI('ready');
        }
      }
    } catch (_e) {
      // Background not ready yet
    }
  }

  // ─── Auto-Save Session to Cloud ─────────────────────────────────

  let lastSavedSessionUrl = null;
  let autoSaveInProgress = false;

  async function autoSaveSession(sessionData) {
    if (autoSaveInProgress || lastSavedSessionUrl) return;
    autoSaveInProgress = true;
    try {
      const url = await postSessionToCloud(sessionData);
      if (url) {
        lastSavedSessionUrl = url;
        const sessionH2 = els.sessionSection?.querySelector('h2');
        if (sessionH2 && !sessionH2.textContent.includes('Saved')) {
          sessionH2.textContent += ' \u2714 Saved';
        }
      }
    } catch (err) {
      console.warn('[PostureGuard] Auto-save failed:', err.message);
    } finally {
      autoSaveInProgress = false;
    }
  }

  // ─── Post Session to Cloud ──────────────────────────────────────

  async function postSessionToCloud(sessionData) {
    const token = await window.PostureGuardAuth?.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(getHealthAppUrl() + '/api/sessions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionData: sessionData,
          claudeAnalysis: sessionData.claudeAnalysis || null
        })
      });

      if (response.ok) {
        const { id } = await response.json();
        return getHealthAppUrl() + '/?id=' + id;
      }
    } catch (err) {
      console.warn('[PostureGuard] Session post failed:', err.message);
    }
    return null;
  }

  // ─── Init ─────────────────────────────────────────────────────

  loadSettings();
  restoreState();
  initAuth();
})();
