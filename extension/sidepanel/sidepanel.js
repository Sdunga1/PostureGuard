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
    debugToggle: document.getElementById('debug-toggle'),
    sessionSection: document.getElementById('session-section'),
    sessionDuration: document.getElementById('session-duration'),
    sessionAvg: document.getElementById('session-avg'),
    sessionAlerts: document.getElementById('session-alerts'),
    reportBtn: document.getElementById('report-btn'),
    qrSection: document.getElementById('qr-section'),
    qrContainer: document.getElementById('qr-container'),
    apiKeyInput: document.getElementById('api-key-input'),
    saveKeyBtn: document.getElementById('save-key-btn')
  };

  // ─── Settings ─────────────────────────────────────────────────

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
    if (els.debugToggle) {
      els.debugToggle.checked = settings.debugMode || false;
    }

    if (stored.postureCalV1 && els.calStatus) {
      els.calStatus.textContent = 'Calibrated';
      els.calStatus.classList.add('calibrated');
    }

    if (settings.apiKey && els.apiKeyInput) {
      els.apiKeyInput.value = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
    }

    updateStatusUI(settings.postureEnabled ? 'loading' : 'disabled');
  }

  async function saveSetting(key, value) {
    settings[key] = value;
    await chrome.storage.local.set({ [key]: value });
  }

  // ─── Send message to content script safely ──────────────────

  async function sendToActiveTab(message) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        console.warn('[PostureGuard] No active tab found');
        return null;
      }
      // Skip chrome://, edge://, about: pages where content scripts can't run
      if (tab.url && (tab.url.startsWith('chrome://') ||
                      tab.url.startsWith('edge://') ||
                      tab.url.startsWith('about:') ||
                      tab.url.startsWith('chrome-extension://'))) {
        console.warn('[PostureGuard] Cannot inject into:', tab.url);
        updateStatusUI('error');
        if (els.statusText) {
          els.statusText.textContent = 'Open a webpage first';
        }
        return null;
      }
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (err) {
      console.warn('[PostureGuard] Tab message failed:', err.message);
      // Content script may not be injected yet — try injecting it
      return null;
    }
  }

  // ─── Status UI ────────────────────────────────────────────────

  function updateStatusUI(phase) {
    if (!els.statusDot) return;
    els.statusDot.className = 'status-dot';

    switch (phase) {
      case 'disabled':
        els.statusDot.classList.add('off');
        els.statusText.textContent = 'Disabled';
        if (els.scoreSection) els.scoreSection.style.display = 'none';
        if (els.sessionSection) els.sessionSection.style.display = 'none';
        break;
      case 'loading':
        els.statusDot.classList.add('loading');
        els.statusText.textContent = 'Starting...';
        break;
      case 'ready':
        els.statusDot.classList.add('ready');
        els.statusText.textContent = 'Ready \u2014 Calibrate to begin';
        break;
      case 'live':
        els.statusDot.classList.add('live');
        els.statusText.textContent = 'Monitoring';
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
      updateStatusUI(enabled ? 'loading' : 'disabled');

      // Notify content script on active tab
      const response = await sendToActiveTab({
        type: 'POSTURE_ENABLED_CHANGED',
        enabled
      });

      if (!response && enabled) {
        // If sending failed, inform user
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

  if (els.debugToggle) {
    els.debugToggle.addEventListener('change', async (e) => {
      const debugOn = e.target.checked;
      await saveSetting('debugMode', debugOn);
      // Toggle camera preview
      await sendToActiveTab({ type: 'TOGGLE_PREVIEW' });
    });
  }

  if (els.saveKeyBtn) {
    els.saveKeyBtn.addEventListener('click', () => {
      const key = els.apiKeyInput.value.trim();
      if (key && !key.startsWith('\u2022')) {
        saveSetting('apiKey', key);
        els.apiKeyInput.value = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
      }
    });
  }

  if (els.reportBtn) {
    els.reportBtn.addEventListener('click', async () => {
      els.reportBtn.textContent = 'Generating...';
      els.reportBtn.disabled = true;

      try {
        const sessionResponse = await sendToActiveTab({ type: 'GET_SESSION_DATA' });

        if (sessionResponse && sessionResponse.ok) {
          // Request Claude analysis via background
          const result = await chrome.runtime.sendMessage({
            type: 'GENERATE_REPORT',
            sessionData: sessionResponse.data
          });

          if (result && result.analysis) {
            sessionResponse.data.claudeAnalysis = result.analysis;
          }

          if (els.qrSection) els.qrSection.style.display = '';
          if (els.qrContainer) {
            els.qrContainer.innerHTML =
              '<p style="font-size: 12px; color: #666; text-align: center;">' +
              'QR code generation ready.<br>Report data prepared for health app.</p>';
          }
        }
      } catch (err) {
        console.error('[PostureGuard] Report generation failed:', err);
      } finally {
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

  // ─── Listen for Messages from background/content ──────────────

  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case 'POSTURE_SCORE_UPDATE':
        if (els.scoreDisplay) {
          els.scoreDisplay.textContent = message.score;
        }
        break;
      case 'POSTURE_STATUS_UPDATE':
        updateStatusUI(message.phase);
        break;
    }
  });

  // ─── Init ─────────────────────────────────────────────────────

  loadSettings();
})();
