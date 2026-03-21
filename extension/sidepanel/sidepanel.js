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
    alertThresholdMs: 30000,
    debugMode: false,
    apiKey: ''
  };

  async function loadSettings() {
    const stored = await chrome.storage.local.get([
      'postureEnabled', 'alertThresholdMs', 'debugMode', 'apiKey', 'postureCalV1'
    ]);
    Object.assign(settings, stored);

    // Update UI
    els.postureToggle.checked = settings.postureEnabled;
    els.thresholdSlider.value = (settings.alertThresholdMs || 30000) / 1000;
    els.thresholdValue.textContent = `${els.thresholdSlider.value}s`;
    els.debugToggle.checked = settings.debugMode || false;

    if (stored.postureCalV1) {
      els.calStatus.textContent = 'Calibrated';
      els.calStatus.classList.add('calibrated');
    }

    if (settings.apiKey) {
      els.apiKeyInput.value = '••••••••';
    }

    updateStatusUI(settings.postureEnabled ? 'ready' : 'disabled');
  }

  async function saveSetting(key, value) {
    settings[key] = value;
    await chrome.storage.local.set({ [key]: value });
  }

  // ─── Status UI ────────────────────────────────────────────────

  function updateStatusUI(phase) {
    els.statusDot.className = 'status-dot';

    switch (phase) {
      case 'disabled':
        els.statusDot.classList.add('off');
        els.statusText.textContent = 'Disabled';
        els.scoreSection.style.display = 'none';
        els.sessionSection.style.display = 'none';
        break;
      case 'loading':
        els.statusDot.classList.add('loading');
        els.statusText.textContent = 'Starting...';
        break;
      case 'ready':
        els.statusDot.classList.add('ready');
        els.statusText.textContent = 'Ready — Calibrate to begin';
        break;
      case 'live':
        els.statusDot.classList.add('live');
        els.statusText.textContent = 'Monitoring';
        els.scoreSection.style.display = '';
        els.sessionSection.style.display = '';
        break;
      case 'error':
        els.statusDot.classList.add('error');
        els.statusText.textContent = 'Error';
        break;
    }
  }

  // ─── Event Handlers ───────────────────────────────────────────

  els.postureToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await saveSetting('postureEnabled', enabled);

    // Notify content script on active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'POSTURE_ENABLED_CHANGED',
        enabled
      });
    }

    updateStatusUI(enabled ? 'loading' : 'disabled');
  });

  els.calibrateBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: 'START_CALIBRATION' });
    }
  });

  els.thresholdSlider.addEventListener('input', (e) => {
    const seconds = parseInt(e.target.value, 10);
    els.thresholdValue.textContent = `${seconds}s`;
    saveSetting('alertThresholdMs', seconds * 1000);
  });

  els.debugToggle.addEventListener('change', (e) => {
    saveSetting('debugMode', e.target.checked);
  });

  els.saveKeyBtn.addEventListener('click', () => {
    const key = els.apiKeyInput.value.trim();
    if (key && !key.startsWith('••')) {
      saveSetting('apiKey', key);
      els.apiKeyInput.value = '••••••••';
    }
  });

  els.reportBtn.addEventListener('click', async () => {
    // Request session data and Claude report via background
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    els.reportBtn.textContent = 'Generating...';
    els.reportBtn.disabled = true;

    try {
      // Get session data from content script
      const sessionData = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_SESSION_DATA'
      });

      // Request Claude analysis via background
      const result = await chrome.runtime.sendMessage({
        type: 'GENERATE_REPORT',
        sessionData
      });

      if (result.analysis) {
        sessionData.claudeAnalysis = result.analysis;
      }

      // Generate QR code
      // TODO: Integrate qrcode-generator library
      els.qrSection.style.display = '';
      els.qrContainer.innerHTML = `
        <p style="font-size: 12px; color: #666; text-align: center;">
          QR code generation ready.<br>
          Report data prepared for health app.
        </p>
      `;
    } catch (err) {
      console.error('[PostureGuard] Report generation failed:', err);
    } finally {
      els.reportBtn.textContent = 'Generate Report';
      els.reportBtn.disabled = false;
    }
  });

  // ─── Listen for Storage Changes ───────────────────────────────

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes.postureCalV1 && changes.postureCalV1.newValue) {
      els.calStatus.textContent = 'Calibrated';
      els.calStatus.classList.add('calibrated');
    }
  });

  // ─── Listen for Messages ──────────────────────────────────────

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'POSTURE_SCORE_UPDATE') {
      els.scoreDisplay.textContent = message.score;
    }
    if (message.type === 'POSTURE_STATUS') {
      updateStatusUI(message.phase);
    }
  });

  // ─── Init ─────────────────────────────────────────────────────

  loadSettings();
})();
