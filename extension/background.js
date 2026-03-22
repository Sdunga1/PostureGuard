'use strict';

// PostureGuard — Background Service Worker
// SINGLE SOURCE OF TRUTH for posture analysis, session tracking, and nudges.
// Content scripts send raw landmarks here; background scores, tracks, and pushes nudges.

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
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
let sessionDurationMs = 5 * 60 * 1000; // Default 5 minutes

// Landmark indices (Human.js / MediaPipe Face Mesh)
// Face mesh landmark indices (Human.js / MediaPipe)
const NOSE_TIP = 1;
const LEFT_EYE = 33;
const RIGHT_EYE = 362;
const CHIN = 152;
const FOREHEAD = 10;

// MoveNet body keypoint indices
const BODY_LEFT_EAR = 3;
const BODY_RIGHT_EAR = 4;
const BODY_LEFT_SHOULDER = 5;
const BODY_RIGHT_SHOULDER = 6;
const BODY_LEFT_HIP = 11;
const BODY_RIGHT_HIP = 12;
const BODY_CONFIDENCE_MIN = 0.3;

let calibration = null;         // Loaded from chrome.storage postureCalV1
let activeTabId = null;         // Which tab is currently running camera
let recentFrames = [];          // Rolling window of metric snapshots
let badPostureStart = null;
let alertTriggered = false;
let lastScoreBroadcast = 0;
let currentGoodStreakStart = null;  // Tracks consecutive good posture periods
let currentSlouchStart = null;     // Tracks distinct slouch events (score < 50)
let slouchConfirmed = false;       // True after 10s of continuous bad posture
let lastBodyMetricTs = 0;          // Throttle body metric sampling

// Global session (persists across tab switches)
let session = {
  startTime: null,
  scores: [],
  alerts: [],
  worstPeriods: [],
  bodyMetrics: [],      // Sampled body keypoint metrics (~1/sec)
  slouchEvents: [],     // Distinct slouch episodes {start, end, duration, avgScore}
  goodStreakMax: 0       // Longest consecutive good posture (ms)
};

// Rate limiting for Claude API calls
let sessionEnding = false;  // Guard against repeated session-end processing
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

// Notify all tabs that the background has restarted
async function notifyContentScriptsOfRestart() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'BACKGROUND_RESTARTED',
        settings: settings,
        hasCalibration: calibration !== null
      }).catch(() => {
        // Tab may not have content script, ignore
      });
    }
    console.log('[PostureGuard] Notified content scripts of restart');
  } catch (err) {
    console.warn('[PostureGuard] Failed to notify content scripts:', err.message);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[PostureGuard] Extension installed');
  // Reset monitoring state so toggle starts fresh after reload
  chrome.storage.local.set({ postureEnabled: false });
  loadSettings();
  loadCalibration();
});

chrome.runtime.onStartup.addListener(() => {
  loadSettings();
  loadCalibration();
  notifyContentScriptsOfRestart();
});


// Open side panel on extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// ─── Settings ─────────────────────────────────────────────────

async function loadSettings() {
  const stored = await chrome.storage.local.get([
    'postureEnabled', 'alertThresholdMs', 'apiKey', 'sessionDurationMs'
  ]);
  Object.assign(settings, stored);
  if (stored.sessionDurationMs !== null && stored.sessionDurationMs !== undefined) sessionDurationMs = stored.sessionDurationMs;
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
    if (key === 'sessionDurationMs') {
      sessionDurationMs = newValue;
      console.log('[PostureGuard BG] Session duration updated:', newValue);
    }
    // Reset session when monitoring is re-enabled
    if (key === 'postureEnabled' && newValue === true) {
      resetSession();
      console.log('[PostureGuard BG] Session reset — monitoring re-enabled');
    }
  }
});

// ─── Single-Tab Lock ──────────────────────────────────────────
// Only ONE tab owns the monitoring session. Camera runs there forever
// until that tab is closed or user disables monitoring.
// Other tabs cannot start monitoring — side panel shows "locked" state.

let ownerTabId = null;    // The ONE tab that owns the camera + session
let focusedTabId = null;  // Currently visible tab (for nudge delivery)

// Track focused tab for nudge delivery
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

// When owner tab is closed, release the lock and reset
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === ownerTabId) {
    console.log('[PostureGuard BG] Owner tab closed — session ended');
    ownerTabId = null;
    activeTabId = null;
    settings.postureEnabled = false;
    chrome.storage.local.set({ postureEnabled: false });
  }
});

// When owner tab is reloaded, release the lock (content script dies on reload)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId === ownerTabId && changeInfo.status === 'loading') {
    console.log('[PostureGuard BG] Owner tab reloaded — releasing camera lock');
    ownerTabId = null;
    activeTabId = null;
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

/**
 * Extract body-level metrics from MoveNet keypoints.
 * Returns null if required keypoints are missing or low confidence.
 */
function calculateBodyMetrics(bodyKeypoints, ts) {
  if (!bodyKeypoints || !Array.isArray(bodyKeypoints)) return null;

  // Helper to safely read a keypoint's position
  function kpXY(index) {
    const kp = bodyKeypoints[index];
    if (!kp || (kp.score || 0) < BODY_CONFIDENCE_MIN) return null;
    const x = kp.position ? kp.position[0] : kp.x;
    const y = kp.position ? kp.position[1] : kp.y;
    if (x === undefined || y === undefined) return null;
    return { x, y };
  }

  const lShoulder = kpXY(BODY_LEFT_SHOULDER);
  const rShoulder = kpXY(BODY_RIGHT_SHOULDER);
  if (!lShoulder || !rShoulder) return null; // Shoulders required

  // Shoulder angle — deviation from horizontal (degrees)
  const shoulderAngle = Math.atan2(
    rShoulder.y - lShoulder.y,
    rShoulder.x - lShoulder.x
  ) * (180 / Math.PI);

  // Shoulder elevation — avg ear-to-shoulder distance (shrug detection)
  let shoulderElevation = null;
  const lEar = kpXY(BODY_LEFT_EAR);
  const rEar = kpXY(BODY_RIGHT_EAR);
  if (lEar && rEar) {
    const leftDist = Math.sqrt(
      Math.pow(lEar.x - lShoulder.x, 2) + Math.pow(lEar.y - lShoulder.y, 2)
    );
    const rightDist = Math.sqrt(
      Math.pow(rEar.x - rShoulder.x, 2) + Math.pow(rEar.y - rShoulder.y, 2)
    );
    shoulderElevation = (leftDist + rightDist) / 2;
  }

  // Trunk lateral lean — horizontal offset between shoulder midpoint and hip midpoint
  let trunkLean = null;
  const lHip = kpXY(BODY_LEFT_HIP);
  const rHip = kpXY(BODY_RIGHT_HIP);
  if (lHip && rHip) {
    const shoulderMidX = (lShoulder.x + rShoulder.x) / 2;
    const hipMidX = (lHip.x + rHip.x) / 2;
    trunkLean = shoulderMidX - hipMidX; // Positive = leaning right
  }

  return { shoulderAngle, shoulderElevation, trunkLean, ts };
}

let scoreLogCounter = 0;

function computeScore(metrics, bodyMetrics) {
  if (!calibration) return null; // No score without calibration

  // Forward head tilt deviation (more sensitive multiplier)
  const forwardDev = Math.abs(metrics.forwardTilt - calibration.forwardTilt);
  const forwardScore = Math.min(100,
    forwardDev / Math.max(Math.abs(calibration.forwardTilt), 0.01) * 150
  );

  // Lateral tilt deviation (degrees — even small tilt should register)
  const lateralDev = Math.abs(metrics.lateralTilt - calibration.lateralTilt);
  const lateralScore = Math.min(100, lateralDev * 15);

  // Slouch (face size change = distance change)
  const slouchDev = Math.abs(metrics.faceSize - calibration.faceSize);
  const slouchScore = Math.min(100,
    slouchDev / Math.max(Math.abs(calibration.faceSize), 0.01) * 150
  );

  // Screen distance (too close)
  const distRatio = metrics.screenDistance / Math.max(calibration.screenDistance, 0.01);
  const distanceScore = distRatio < 0.75
    ? Math.min(100, (1 - distRatio) * 250)
    : 0;

  // Body metrics (optional — only when keypoints + calibration available)
  const hasBodyCal = calibration.shoulderAngle !== undefined && calibration.shoulderAngle !== null;
  let shoulderScore = 0;
  let shrugScore = 0;
  let useBodyWeights = false;

  if (bodyMetrics && hasBodyCal) {
    // Shoulder asymmetry — deviation from calibrated angle
    const shoulderDev = Math.abs(bodyMetrics.shoulderAngle - calibration.shoulderAngle);
    shoulderScore = Math.min(100, shoulderDev * 20); // 5° = full penalty

    // Shrug detection — ear-to-shoulder distance shrink
    if (bodyMetrics.shoulderElevation !== null && calibration.shoulderElevation) {
      const elevDev = Math.abs(bodyMetrics.shoulderElevation - calibration.shoulderElevation);
      shrugScore = Math.min(100,
        elevDev / Math.max(calibration.shoulderElevation, 0.01) * 150
      );
    }

    useBodyWeights = true;
  }

  // Weighted average (higher = worse posture)
  let raw;
  if (useBodyWeights) {
    // Rebalanced: forward 30%, slouch 25%, lateral 20%, shoulder 10%, distance 10%, shrug 5%
    raw = (forwardScore * 0.30) + (lateralScore * 0.20) +
          (slouchScore * 0.25) + (distanceScore * 0.10) +
          (shoulderScore * 0.10) + (shrugScore * 0.05);
  } else {
    // Original weights (no body data)
    raw = (forwardScore * 0.35) + (lateralScore * 0.2) +
          (slouchScore * 0.3) + (distanceScore * 0.15);
  }

  const score = Math.max(0, Math.min(100, Math.round(100 - raw)));

  // Log periodically for debugging
  scoreLogCounter++;
  if (scoreLogCounter % 60 === 1) {
    const bodyLog = useBodyWeights
      ? '| shldr:' + shoulderScore.toFixed(1) + ' | shrug:' + shrugScore.toFixed(1)
      : '| body:off';
    console.log('[PostureGuard BG] Score:', score,
      '| fwd:', forwardScore.toFixed(1),
      '| lat:', lateralScore.toFixed(1),
      '| slouch:', slouchScore.toFixed(1),
      '| dist:', distanceScore.toFixed(1),
      bodyLog,
      '| raw:', raw.toFixed(1));
  }

  return score;
}

function processFrame(landmarks, bodyKeypoints, ts, tabId) {
  if (sessionEnding) return; // Session is ending, ignore new frames

  if (!session.startTime) session.startTime = Date.now();

  // Ensure calibration is loaded (service worker may have restarted)
  if (!calibration) {
    chrome.storage.local.get(['postureCalV1'], (result) => {
      if (result.postureCalV1) {
        calibration = result.postureCalV1;
        console.log('[PostureGuard BG] Calibration reloaded from storage');
      }
    });
  }

  // Check if session time limit reached
  if (session.startTime) {
    const elapsed = Date.now() - session.startTime;
    if (sessionDurationMs > 0 && elapsed >= sessionDurationMs) {
      sessionEnding = true; // Prevent re-entry
      console.log('[PostureGuard BG] Session time limit reached (' + Math.round(elapsed / 1000) + 's)');

      const finalSession = getSessionData();

      // Save session-ended state to storage so side panel can detect it
      chrome.storage.local.set({
        postureEnabled: false,
        sessionComplete: true,
        lastSession: finalSession
      });
      settings.postureEnabled = false;

      // Notify all extension pages (side panel) FIRST
      chrome.runtime.sendMessage({
        type: 'SESSION_ENDED',
        session: finalSession
      }).catch(() => {});

      // Stop camera on owner tab AFTER side panel gets the message
      setTimeout(() => {
        if (ownerTabId) {
          chrome.tabs.sendMessage(ownerTabId, {
            type: 'POSTURE_ENABLED_CHANGED',
            enabled: false
          }).catch(() => {});
        }
        ownerTabId = null;
        activeTabId = null;
      }, 500);

      return;
    }
  }

  const metrics = calculateMetrics(landmarks, ts);
  if (!metrics) return;

  const bodyMetrics = calculateBodyMetrics(bodyKeypoints, ts);

  // Rolling window
  recentFrames.push({ metrics, bodyMetrics, ts });
  const cutoff = ts - ROLLING_WINDOW_MS;
  recentFrames = recentFrames.filter(f => f.ts > cutoff);

  // Sample body metrics (~1/sec, same throttle as score broadcast)
  if (bodyMetrics && (ts - lastBodyMetricTs > SCORE_BROADCAST_INTERVAL_MS)) {
    lastBodyMetricTs = ts;
    session.bodyMetrics.push(bodyMetrics);
  }

  const score = computeScore(metrics, bodyMetrics);
  if (score === null) return; // No calibration yet — don't score or broadcast

  session.scores.push(score);

  // ── Alert logic ──
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
      const avgScore = Math.round(
        session.scores.slice(-frameCount).reduce((a, b) => a + b, 0) / frameCount
      ) || score;

      // Determine dominant issue during this bad period
      const recentBad = recentFrames.filter(f => f.ts >= badPostureStart && f.ts <= ts);
      const issue = detectDominantIssue(recentBad);

      session.worstPeriods.push({
        start: badPostureStart,
        end: ts,
        score: avgScore,
        issue: issue
      });
    }
    badPostureStart = null;
    alertTriggered = false;
  }

  // ── Slouch event tracking (distinct from alert-based worstPeriods) ──
  if (score < 50) {
    if (!currentSlouchStart) currentSlouchStart = ts;
    // Confirm slouch after 10 seconds of continuous bad posture
    if (!slouchConfirmed && (ts - currentSlouchStart) > 10000) {
      slouchConfirmed = true;
    }
  } else if (score >= 60) {
    // Exited slouch — record event if it was confirmed (>10s)
    if (currentSlouchStart && slouchConfirmed) {
      const slouchScores = session.scores.slice(
        -Math.max(1, Math.floor((ts - currentSlouchStart) / 33))
      );
      session.slouchEvents.push({
        start: currentSlouchStart,
        end: ts,
        duration: Math.round((ts - currentSlouchStart) / 1000),
        avgScore: slouchScores.length > 0
          ? Math.round(slouchScores.reduce((a, b) => a + b, 0) / slouchScores.length)
          : score
      });
    }
    currentSlouchStart = null;
    slouchConfirmed = false;
  }

  // ── Good streak tracking ──
  if (score >= 70) {
    if (!currentGoodStreakStart) currentGoodStreakStart = ts;
  } else {
    if (currentGoodStreakStart) {
      const streakMs = ts - currentGoodStreakStart;
      if (streakMs > session.goodStreakMax) {
        session.goodStreakMax = streakMs;
      }
      currentGoodStreakStart = null;
    }
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

/**
 * Determine which metric contributed most to a bad posture period.
 * Looks at recent frames and finds the metric with the highest deviation.
 */
function detectDominantIssue(frames) {
  if (!frames.length || !calibration) return 'unknown';

  let maxDev = 0;
  let dominant = 'forward_head';

  const avgForward = average(frames.map(f => f.metrics.forwardTilt));
  const avgLateral = average(frames.map(f => f.metrics.lateralTilt));
  const avgFaceSize = average(frames.map(f => f.metrics.faceSize));
  const avgScreenDist = average(frames.map(f => f.metrics.screenDistance));

  const forwardDev = Math.abs(avgForward - calibration.forwardTilt) /
    Math.max(Math.abs(calibration.forwardTilt), 0.01);
  if (forwardDev > maxDev) { maxDev = forwardDev; dominant = 'forward_head'; }

  const lateralDev = Math.abs(avgLateral - calibration.lateralTilt) * 0.1;
  if (lateralDev > maxDev) { maxDev = lateralDev; dominant = 'lateral_tilt'; }

  const slouchDev = Math.abs(avgFaceSize - calibration.faceSize) /
    Math.max(Math.abs(calibration.faceSize), 0.01);
  if (slouchDev > maxDev) { maxDev = slouchDev; dominant = 'slouch'; }

  const distRatio = avgScreenDist / Math.max(calibration.screenDistance, 0.01);
  const distDev = distRatio < 0.75 ? (1 - distRatio) : 0;
  if (distDev > maxDev) { maxDev = distDev; dominant = 'screen_distance'; }

  // Check shoulder if body data available
  const bodyFrames = frames.filter(f => f.bodyMetrics);
  if (bodyFrames.length > 0 && calibration.shoulderAngle !== undefined) {
    const avgShoulder = average(bodyFrames.map(f => f.bodyMetrics.shoulderAngle));
    const shoulderDev = Math.abs(avgShoulder - calibration.shoulderAngle) * 0.15;
    if (shoulderDev > maxDev) { dominant = 'shoulder_asymmetry'; }
  }

  return dominant;
}

function getSessionData() {
  const now = Date.now();
  const duration = session.startTime ? Math.round((now - session.startTime) / 1000) : 0;
  const scores = session.scores;
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  // Close any open good streak
  let goodStreakMax = session.goodStreakMax;
  if (currentGoodStreakStart) {
    const openStreak = performance.now() - currentGoodStreakStart;
    if (openStreak > goodStreakMax) goodStreakMax = openStreak;
  }

  // Upright percentage (score >= 70)
  const uprightCount = scores.filter(s => s >= 70).length;
  const uprightPercent = scores.length > 0
    ? Math.round((uprightCount / scores.length) * 100)
    : 0;

  // Posture trend — first half avg vs second half avg (positive = declined)
  let postureTrend = 0;
  if (scores.length >= 10) {
    const mid = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, mid);
    const secondHalf = scores.slice(mid);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    postureTrend = Math.round(firstAvg - secondAvg); // Positive = got worse
  }

  // Body metric averages (from sampled data)
  const bm = session.bodyMetrics;
  const avgShoulderAngle = bm.length > 0
    ? average(bm.map(m => m.shoulderAngle))
    : null;
  const avgShoulderElevation = bm.length > 0
    ? average(bm.filter(m => m.shoulderElevation !== null).map(m => m.shoulderElevation))
    : null;
  const avgTrunkLean = bm.filter(m => m.trunkLean !== null).length > 0
    ? average(bm.filter(m => m.trunkLean !== null).map(m => m.trunkLean))
    : null;

  // Slouch event stats
  const slouchEvents = session.slouchEvents.slice(0, 5);
  const avgSlouchDuration = session.slouchEvents.length > 0
    ? Math.round(session.slouchEvents.reduce((a, e) => a + e.duration, 0) / session.slouchEvents.length)
    : 0;

  return {
    version: 2,
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
      worstPeriods: session.worstPeriods.slice(0, 5),
      // Behavioral metrics
      uprightPercent,
      slouchEventCount: session.slouchEvents.length,
      slouchEvents,
      avgSlouchDuration,
      longestGoodStreak: Math.round(goodStreakMax / 1000),
      postureTrend,
      // Body metrics
      avgShoulderAngle,
      avgShoulderElevation,
      avgTrunkLean
    }
  };
}

function resetSession() {
  session = {
    startTime: null, scores: [], alerts: [], worstPeriods: [],
    bodyMetrics: [], slouchEvents: [], goodStreakMax: 0
  };
  recentFrames = [];
  badPostureStart = null;
  alertTriggered = false;
  sessionEnding = false;
  currentGoodStreakStart = null;
  currentSlouchStart = null;
  slouchConfirmed = false;
  lastBodyMetricTs = 0;
}

function average(arr) {
  if (arr.length === 0) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
}

// ─── Message Routing ──────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'POSTURE_FRAME':
      // Central frame processing — only accept frames from the owner tab
      if (sender.tab?.id && sender.tab.id === ownerTabId) {
        activeTabId = sender.tab.id;
        processFrame(message.landmarks, message.bodyKeypoints || null, message.ts, sender.tab.id);
      }
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
        isRunning: ownerTabId !== null,
        hasCalibration: calibration !== null,
        ownerTabId: ownerTabId,
        senderTabId: sender.tab?.id || null,
        isOwner: sender.tab?.id === ownerTabId,
        sessionComplete: session.scores.length > 0 && !ownerTabId && !settings.postureEnabled,
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
      // Owner tab stopped its camera (user disabled monitoring)
      if (sender.tab?.id === ownerTabId) {
        ownerTabId = null;
        activeTabId = null;
        console.log('[PostureGuard BG] Camera released by owner tab', sender.tab?.id);
      }
      return false;

    case 'SHOULD_START_CAMERA': {
      // A tab asks: "should I start the camera?"
      // The content script already checked postureEnabled — we just manage ownership.
      const requestingTab = sender.tab?.id || null;

      // If there's a stale owner, verify it still exists
      if (ownerTabId && ownerTabId !== requestingTab) {
        chrome.tabs.get(ownerTabId).then(() => {
          // Owner tab still exists — deny
          sendResponse({ start: false, ownerTab: ownerTabId });
        }).catch(() => {
          // Owner tab no longer exists — release stale lock and grant
          console.log('[PostureGuard BG] Stale owner', ownerTabId, 'gone, granting to', requestingTab);
          ownerTabId = requestingTab;
          activeTabId = null;
          sendResponse({ start: true });
        });
        return true; // Async response
      }

      if (!ownerTabId) {
        // No owner — grant to requester
        ownerTabId = requestingTab;
        sendResponse({ start: true });
        console.log('[PostureGuard BG] Tab', ownerTabId, 'claimed ownership');
      } else if (ownerTabId === requestingTab) {
        // Same tab asking again — allow
        sendResponse({ start: true });
      } else {
        // Different tab already owns it
        sendResponse({ start: false, ownerTab: ownerTabId });
      }
      return false;
    }

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
    'Given a session\'s posture data (which may include shoulder metrics, upright%, slouch events, and posture trend), provide:',
    '1. A 2-sentence summary of overall posture quality',
    '2. Top 3 issues identified (reference specific metrics — e.g. upright%, shoulder angle, slouch events, trend)',
    '3. 3-5 recommended exercises with: name, reason, duration, priority (1=highest)',
    '',
    'Note: postureTrend > 0 means posture declined over the session (fatigue). uprightPercent is time with good posture.',
    'worstPeriods include an "issue" field indicating the dominant problem (forward_head, lateral_tilt, slouch, screen_distance, shoulder_asymmetry).',
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
