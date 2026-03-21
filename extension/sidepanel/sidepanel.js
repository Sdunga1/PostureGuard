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

  let sessionEnded = false; // Flag to prevent UI reset after session completes

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
      // Content script not injected on this tab — silently ignore
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

      if (!enabled) {
        updateStatusUI('disabled');
      } else {
        // Show "Starting..." briefly — will update to "Monitoring" once frames arrive
        updateStatusUI('loading');
      }

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
        // Get session data from background (global session, not tab-specific)
        const sessionResponse = await chrome.runtime.sendMessage({ type: 'GET_SESSION_DATA' });

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

  // ─── Session Complete UI ──────────────────────────────────────

  function showSessionCompleteUI(sessionData) {
    sessionEnded = true;

    // Stop session timer
    if (sessionUpdateInterval) {
      clearInterval(sessionUpdateInterval);
      sessionUpdateInterval = null;
    }

    // Update status
    if (els.statusDot) {
      els.statusDot.className = 'status-dot';
      els.statusDot.classList.add('off');
    }
    if (els.statusText) {
      els.statusText.textContent = 'Session complete (2 min)';
    }
    if (els.postureToggle) els.postureToggle.checked = false;

    // Show final session stats
    if (sessionData) {
      if (els.scoreDisplay) {
        els.scoreDisplay.textContent = sessionData.metrics.avgPostureScore || '--';
      }
      if (els.scoreSection) els.scoreSection.style.display = '';
      if (els.sessionSection) els.sessionSection.style.display = '';
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

    // Highlight report button
    if (els.reportBtn) {
      els.reportBtn.style.background = '#5b21b6';
      els.reportBtn.style.color = '#fff';
      els.reportBtn.style.fontWeight = '600';
      els.reportBtn.textContent = 'Generate Report \u2192';
      els.reportBtn.disabled = false;
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
        if (!sessionEnded) {
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

      // Restore calibration badge
      if (state.hasCalibration && els.calStatus) {
        els.calStatus.textContent = 'Calibrated';
        els.calStatus.classList.add('calibrated');
      }

      // Restore monitoring status
      if (state.isRunning) {
        updateStatusUI('live');
      } else if (state.postureEnabled && state.hasCalibration) {
        updateStatusUI('live');
      } else if (state.postureEnabled) {
        updateStatusUI('ready');
      }
    } catch (_e) {
      // Background not ready yet
    }
  }

  // ─── Init ─────────────────────────────────────────────────────

  loadSettings();
  restoreState();
})();
