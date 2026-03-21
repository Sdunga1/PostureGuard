'use strict';

// PostureGuard — Background Service Worker
// SINGLE SOURCE OF TRUTH for posture analysis, session tracking, and nudges.
// Content scripts send raw landmarks here; background scores, tracks, and pushes nudges.

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-5-20241022';
const ANTHROPIC_VERSION = '2023-06-01';

// ─── Settings (synced via chrome.storage) ──────────────────────

const settings = {
  postureEnabled: false,
  alertThresholdMs: 5000,
  apiKey: ''
};

// ─── Centralized Posture Analyzer State ────────────────────────

const SCORE_BROADCAST_INTERVAL_MS = 1000;
const ROLLING_WINDOW_MS = 30000;

// Landmark indices (Human.js / MediaPipe Face Mesh)
const NOSE_TIP = 1;
const LEFT_EYE = 33;
const RIGHT_EYE = 362;
const CHIN = 152;
const FOREHEAD = 10;

let calibration = null;         // Loaded from chrome.storage postureCalV1
let activeTabId = null;         // Which tab is currently running camera
let recentFrames = [];          // Rolling window of metric snapshots
let badPostureStart = null;
let alertTriggered = false;
let lastScoreBroadcast = 0;

// Global session (persists across tab switches)
let session = {
  startTime: null,
  scores: [],
  alerts: [],
  worstPeriods: []
};

// Rate limiting for Claude API calls
let lastNudgeTime = 0;
const NUDGE_COOLDOWN_MS = 120000;

// Tip cache
const recentTips = [];
const MAX_CACHED_TIPS = 10;

const FALLBACK_TIPS = [
  'Your head is tilting forward \u2014 try pulling your chin back gently.',
  'Shoulders are uneven. Roll them back and down.',
  'You\'re leaning too close to the screen. Sit back to arm\'s length.',
  'Your head is tilting to one side. Center it over your shoulders.',
  'Time for a posture reset! Sit tall, feet flat, shoulders relaxed.',
  'You\'ve been slouching \u2014 imagine a string pulling the top of your head up.'
];

// ─── Initialization ───────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.log('[PostureGuard] Extension installed');
  loadSettings();
  loadCalibration();
});

chrome.runtime.onStartup.addListener(() => {
  loadSettings();
  loadCalibration();
});

// Open side panel on extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// ─── Settings ─────────────────────────────────────────────────

async function loadSettings() {
  const stored = await chrome.storage.local.get([
    'postureEnabled', 'alertThresholdMs', 'apiKey'
  ]);
  Object.assign(settings, stored);
}

async function loadCalibration() {
  const stored = await chrome.storage.local.get(['postureCalV1']);
  if (stored.postureCalV1) {
    calibration = stored.postureCalV1;
    console.log('[PostureGuard BG] Calibration loaded');
  }
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'local') return;
  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key in settings) {
      settings[key] = newValue;
    }
    if (key === 'postureCalV1') {
      calibration = newValue;
      console.log('[PostureGuard BG] Calibration updated');
    }
  }
});

// ─── Tab Lifecycle ────────────────────────────────────────────
// Camera stays running on the tab that started it (cameraTabId).
// We only track which tab is "focused" (focusedTabId) for sending nudges.
// Camera NEVER moves between tabs — it keeps running silently.

let cameraTabId = null;   // Tab running the camera (stays fixed)
let focusedTabId = null;  // Currently visible tab (for nudge display)

// Track which tab the user is looking at (for nudge delivery)
chrome.tabs.onActivated.addListener((activeInfo) => {
  focusedTabId = activeInfo.tabId;
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const tabs = await chrome.tabs.query({ active: true, windowId });
    if (tabs.length > 0) {
      focusedTabId = tabs[0].id;
    }
  } catch (_e) {
    // Window may not exist
  }
});

// When the tab running the camera is closed, try to start on another tab
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId === cameraTabId) {
    cameraTabId = null;
    activeTabId = null;

    if (!settings.postureEnabled) return;

    // Try to start camera on the currently focused tab
    if (focusedTabId) {
      try {
        const tab = await chrome.tabs.get(focusedTabId);
        if (tab.url && !tab.url.startsWith('chrome://') &&
            !tab.url.startsWith('edge://') &&
            !tab.url.startsWith('about:')) {
          cameraTabId = focusedTabId;
          activeTabId = focusedTabId;
          chrome.tabs.sendMessage(focusedTabId, {
            type: 'POSTURE_ENABLED_CHANGED',
            enabled: true
          }).catch(() => {});
          console.log('[PostureGuard BG] Camera restarted on tab', focusedTabId);
        }
      } catch (_e) {
        // Tab doesn't exist
      }
    }
  }
});

// ─── Posture Analysis (runs in background) ────────────────────

function calculateMetrics(landmarks, ts) {
  const nose = landmarks[NOSE_TIP];
  const leftEye = landmarks[LEFT_EYE];
  const rightEye = landmarks[RIGHT_EYE];
  const chin = landmarks[CHIN];
  const forehead = landmarks[FOREHEAD];

  if (!nose || !leftEye || !rightEye || !chin || !forehead) return null;

  const eyeMidY = (leftEye[1] + rightEye[1]) / 2;
  const eyeDx = rightEye[0] - leftEye[0];
  const eyeDy = rightEye[1] - leftEye[1];

  const forwardTilt = nose[1] - eyeMidY;
  const lateralTilt = Math.atan2(eyeDy, eyeDx) * (180 / Math.PI);
  const faceSize = Math.sqrt(
    Math.pow(forehead[0] - chin[0], 2) +
    Math.pow(forehead[1] - chin[1], 2)
  );
  const screenDistance = Math.sqrt(
    Math.pow(rightEye[0] - leftEye[0], 2) +
    Math.pow(rightEye[1] - leftEye[1], 2)
  );

  return { forwardTilt, lateralTilt, faceSize, screenDistance, ts };
}

function computeScore(metrics) {
  if (!calibration) return 100;

  const forwardScore = Math.min(100,
    Math.abs(metrics.forwardTilt - calibration.forwardTilt) /
    Math.abs(calibration.forwardTilt || 1) * 100 * 2
  );
  const lateralScore = Math.min(100,
    Math.abs(metrics.lateralTilt - calibration.lateralTilt) * 10
  );
  const slouchScore = Math.min(100,
    Math.abs(metrics.faceSize - calibration.faceSize) /
    Math.abs(calibration.faceSize || 1) * 100 * 2
  );
  const distanceScore = metrics.screenDistance < calibration.screenDistance * 0.7
    ? Math.min(100, (1 - metrics.screenDistance / calibration.screenDistance) * 200)
    : 0;

  const raw = (forwardScore * 0.35) + (lateralScore * 0.2) +
              (slouchScore * 0.3) + (distanceScore * 0.15);

  return Math.max(0, Math.min(100, Math.round(100 - raw)));
}

function processFrame(landmarks, ts, tabId) {
  if (!session.startTime) session.startTime = Date.now();

  const metrics = calculateMetrics(landmarks, ts);
  if (!metrics) return;

  // Rolling window
  recentFrames.push({ metrics, ts });
  const cutoff = ts - ROLLING_WINDOW_MS;
  recentFrames = recentFrames.filter(f => f.ts > cutoff);

  const score = computeScore(metrics);
  session.scores.push(score);

  // Alert logic
  if (score < 50) {
    if (!badPostureStart) badPostureStart = ts;

    if (!alertTriggered && (ts - badPostureStart) > settings.alertThresholdMs) {
      alertTriggered = true;
      session.alerts.push({ ts, score, metrics });

      // Trigger nudge
      handleNudgeRequest(metrics, tabId);
    }
  } else {
    if (badPostureStart && alertTriggered) {
      const frameDuration = 33;
      const frameCount = Math.max(1, Math.floor((ts - badPostureStart) / frameDuration));
      session.worstPeriods.push({
        start: badPostureStart,
        end: ts,
        score: Math.round(
          session.scores.slice(-frameCount).reduce((a, b) => a + b, 0) / frameCount
        ) || score
      });
    }
    badPostureStart = null;
    alertTriggered = false;
  }

  // Broadcast score (throttled)
  const now = performance.now();
  if (now - lastScoreBroadcast > SCORE_BROADCAST_INTERVAL_MS) {
    lastScoreBroadcast = now;

    const scoreMsg = { type: 'POSTURE_SCORE_UPDATE', score, metrics };

    // Send to camera tab (for its overlay)
    if (tabId) {
      chrome.tabs.sendMessage(tabId, scoreMsg).catch(() => {});
    }

    // Also send to focused tab if different (so passive tabs see live updates)
    if (focusedTabId && focusedTabId !== tabId) {
      chrome.tabs.sendMessage(focusedTabId, scoreMsg).catch(() => {});
    }

    // Broadcast to all extension pages (side panel on any tab)
    chrome.runtime.sendMessage(scoreMsg).catch(() => {});
  }
}

function getSessionData() {
  const now = Date.now();
  const duration = session.startTime ? Math.round((now - session.startTime) / 1000) : 0;
  const avgScore = session.scores.length > 0
    ? Math.round(session.scores.reduce((a, b) => a + b, 0) / session.scores.length)
    : 0;

  return {
    version: 1,
    sessionId: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
    startTime: session.startTime ? new Date(session.startTime).toISOString() : null,
    endTime: new Date(now).toISOString(),
    duration,
    metrics: {
      avgPostureScore: avgScore,
      avgHeadTilt: average(recentFrames.map(f => f.metrics.lateralTilt)),
      avgSlouchAngle: average(recentFrames.map(f => f.metrics.forwardTilt)),
      avgScreenDistance: average(recentFrames.map(f => f.metrics.screenDistance)),
      alertCount: session.alerts.length,
      worstPeriods: session.worstPeriods.slice(0, 5)
    }
  };
}

function resetSession() { // eslint-disable-line no-unused-vars
  session = { startTime: null, scores: [], alerts: [], worstPeriods: [] };
  recentFrames = [];
  badPostureStart = null;
  alertTriggered = false;
}

function average(arr) {
  if (arr.length === 0) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
}

// ─── Message Routing ──────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'POSTURE_FRAME':
      // Central frame processing — the core of global sync
      // Track which tab is sending frames (has the camera)
      if (sender.tab?.id) {
        cameraTabId = sender.tab.id;
        activeTabId = sender.tab.id;
      }
      processFrame(message.landmarks, message.ts, sender.tab?.id);
      return false;

    case 'REQUEST_NUDGE':
      handleNudgeRequest(message.metrics, sender.tab?.id)
        .then(sendResponse);
      return true;

    case 'GENERATE_REPORT':
      handleReportRequest(message.sessionData || getSessionData())
        .then(sendResponse);
      return true;

    case 'GET_SESSION_DATA':
      sendResponse({ ok: true, data: getSessionData() });
      return false;

    case 'GET_CURRENT_STATE':
      // Side panel asks for full state on load/reopen
      sendResponse({
        ok: true,
        postureEnabled: settings.postureEnabled,
        isRunning: cameraTabId !== null,
        hasCalibration: calibration !== null,
        lastScore: session.scores.length > 0
          ? session.scores[session.scores.length - 1]
          : null,
        session: getSessionData()
      });
      return false;

    case 'GET_SETTINGS':
      sendResponse(settings);
      return false;

    case 'CAMERA_RELEASED':
      // A tab stopped its camera (user disabled monitoring)
      if (sender.tab?.id === cameraTabId) {
        cameraTabId = null;
        activeTabId = null;
        console.log('[PostureGuard BG] Camera released by tab', sender.tab?.id);
      }
      return false;

    case 'SHOULD_START_CAMERA':
      // A tab asks: "should I start the camera?"
      // Only if no other tab already has it running
      if (!cameraTabId && settings.postureEnabled) {
        sendResponse({ start: true });
      } else if (cameraTabId === sender.tab?.id) {
        // This tab already owns the camera — keep going
        sendResponse({ start: true });
      } else {
        sendResponse({ start: false, cameraTab: cameraTabId });
      }
      return false;

    case 'POSTURE_STATUS_UPDATE':
      // Relay to side panel
      chrome.runtime.sendMessage({
        type: 'POSTURE_STATUS_UPDATE',
        phase: message.phase,
        note: message.note
      }).catch(() => {});
      return false;

    case 'POSTURE_SCORE_UPDATE':
      // Already handled in processFrame; ignore duplicates from old analyzer
      return false;

    default:
      return false;
  }
});

// ─── Claude API Integration ───────────────────────────────────

async function callClaudeAPI(systemPrompt, userMessage) {
  if (!settings.apiKey) {
    return { error: 'API key not configured. Set it in the PostureGuard side panel.' };
  }

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[PostureGuard BG] Claude API error:', err);
      return { error: 'API error: ' + response.status };
    }

    const data = await response.json();
    return { content: data.content[0].text };
  } catch (err) {
    console.error('[PostureGuard BG] Claude API fetch error:', err);
    return { error: err.message };
  }
}

function getFallbackTip() {
  const unused = FALLBACK_TIPS.filter(t => !recentTips.includes(t));
  const pool = unused.length > 0 ? unused : FALLBACK_TIPS;
  const tip = pool[Math.floor(Math.random() * pool.length)];
  recentTips.push(tip);
  if (recentTips.length > MAX_CACHED_TIPS) recentTips.shift();
  return tip;
}

// Send nudge via both in-page overlay AND OS-level notification
function sendNudge(tip, _triggerTab) {
  // 1. In-page overlay — send to the FOCUSED tab (where user is looking)
  const displayTab = focusedTabId || activeTabId;
  if (displayTab) {
    chrome.tabs.sendMessage(displayTab, { type: 'SHOW_NUDGE', tip }).catch(() => {});
  }

  // 2. OS-level notification (visible even outside Chrome)
  chrome.notifications.create('posture-nudge-' + Date.now(), {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: 'PostureGuard',
    message: tip,
    priority: 1,
    silent: false
  }, () => {
    // Notification created
  });
}

async function handleNudgeRequest(metrics, tabId) {
  const now = Date.now();
  const targetTab = tabId || activeTabId;

  if (now - lastNudgeTime < NUDGE_COOLDOWN_MS || !settings.apiKey) {
    const tip = getFallbackTip();
    sendNudge(tip, targetTab);
    return { content: tip, source: 'fallback' };
  }

  lastNudgeTime = now;

  const systemPrompt = [
    'You are PostureGuard, a friendly posture coach embedded in a Chrome extension.',
    'Given posture metrics, provide a brief, encouraging 1-sentence tip.',
    'Be specific about what the user should adjust.',
    'Never diagnose medical conditions. Be encouraging, not alarming.',
    'Do not repeat these recent tips: ' + recentTips.join('; ')
  ].join(' ');

  const userMessage = 'Current posture metrics: ' + JSON.stringify(metrics);
  const result = await callClaudeAPI(systemPrompt, userMessage);

  const tip = result.content || getFallbackTip();
  recentTips.push(tip);
  if (recentTips.length > MAX_CACHED_TIPS) recentTips.shift();

  sendNudge(tip, targetTab);

  return result;
}

async function handleReportRequest(sessionData) {
  if (!settings.apiKey) {
    return { error: 'API key not configured' };
  }

  const systemPrompt = [
    'You are PostureGuard, an AI posture analyst.',
    'Given a session\'s posture data, provide:',
    '1. A 2-sentence summary of overall posture quality',
    '2. Top 3 issues identified (with specific metrics)',
    '3. 3-5 recommended exercises with: name, reason, duration, priority (1=highest)',
    '',
    'Respond in valid JSON:',
    '{"summary":"string","issues":["string"],"recommendations":[{"exercise":"string","reason":"string","duration":"string","priority":number}]}'
  ].join('\n');

  const userMessage = 'Session data: ' + JSON.stringify(sessionData);
  const result = await callClaudeAPI(systemPrompt, userMessage);

  if (result.content) {
    try {
      const parsed = JSON.parse(result.content);
      return { analysis: parsed };
    } catch (_e) {
      return { analysis: { summary: result.content, issues: [], recommendations: [] } };
    }
  }

  return result;
}
