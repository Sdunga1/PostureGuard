'use strict';

// PostureGuard — Posture Analyzer
// Calculates posture metrics from face landmarks and maintains session state.

(function () {
  if (window.__postureAnalyzerInit) return;
  window.__postureAnalyzerInit = true;

  // ─── Configuration ────────────────────────────────────────────

  const ALERT_THRESHOLD_MS = 30000;          // Bad posture duration before alert
  const ROLLING_WINDOW_MS = 30000;           // Evaluation window
  const SCORE_DISPATCH_INTERVAL_MS = 1000;   // Score update rate

  // Landmark indices (Human.js / MediaPipe Face Mesh)
  const NOSE_TIP = 1;
  const LEFT_EYE = 33;
  const RIGHT_EYE = 362;
  const CHIN = 152;
  const FOREHEAD = 10;

  // ─── State ────────────────────────────────────────────────────

  let calibration = null;  // Baseline from posture-cal.js
  let recentFrames = [];   // Rolling window of metric snapshots
  let badPostureStart = null;
  let alertTriggered = false;
  let lastScoreDispatch = 0;

  // Session accumulator
  let session = {
    startTime: null,
    timestamps: [],
    scores: [],
    alerts: [],
    worstPeriods: []
  };

  // One-Euro filters for smoothing
  let filterNoseY, filterEyeAngle, filterFaceSize;

  function initFilters() {
    if (typeof window.createOneEuroFilter === 'function') {
      filterNoseY = window.createOneEuroFilter(0.4, 0.0025, 1.0);
      filterEyeAngle = window.createOneEuroFilter(0.3, 0.002, 1.0);
      filterFaceSize = window.createOneEuroFilter(0.3, 0.002, 1.0);
    }
  }

  // ─── Metric Calculations ──────────────────────────────────────

  function calculateMetrics(landmarks, ts) {
    const nose = landmarks[NOSE_TIP];
    const leftEye = landmarks[LEFT_EYE];
    const rightEye = landmarks[RIGHT_EYE];
    const chin = landmarks[CHIN];
    const forehead = landmarks[FOREHEAD];

    if (!nose || !leftEye || !rightEye || !chin || !forehead) return null;

    // Eye midpoint
    const eyeMidY = (leftEye[1] + rightEye[1]) / 2;

    // Forward head tilt: nose-to-eye-line vertical distance ratio
    const noseToEyeY = nose[1] - eyeMidY;
    const smoothNoseY = filterNoseY ? filterNoseY(noseToEyeY, ts) : noseToEyeY;

    // Lateral head tilt: angle of eye line vs horizontal
    const eyeDx = rightEye[0] - leftEye[0];
    const eyeDy = rightEye[1] - leftEye[1];
    const eyeAngle = Math.atan2(eyeDy, eyeDx) * (180 / Math.PI);
    const smoothEyeAngle = filterEyeAngle ? filterEyeAngle(eyeAngle, ts) : eyeAngle;

    // Slouch: face bounding box size (forehead to chin distance)
    const faceHeight = Math.sqrt(
      Math.pow(forehead[0] - chin[0], 2) +
      Math.pow(forehead[1] - chin[1], 2)
    );
    const smoothFaceSize = filterFaceSize ? filterFaceSize(faceHeight, ts) : faceHeight;

    // Inter-pupillary distance (screen distance proxy)
    const ipd = Math.sqrt(
      Math.pow(rightEye[0] - leftEye[0], 2) +
      Math.pow(rightEye[1] - leftEye[1], 2)
    );

    return {
      forwardTilt: smoothNoseY,
      lateralTilt: smoothEyeAngle,
      faceSize: smoothFaceSize,
      screenDistance: ipd,
      ts
    };
  }

  function computeScore(metrics) {
    if (!calibration) return 100; // No baseline = assume perfect

    // Score each metric: 0 = perfect, 100 = worst
    const forwardScore = Math.min(100,
      Math.abs(metrics.forwardTilt - calibration.forwardTilt) /
      calibration.forwardTilt * 100 * 2
    );

    const lateralScore = Math.min(100,
      Math.abs(metrics.lateralTilt - calibration.lateralTilt) * 10
    );

    const slouchScore = Math.min(100,
      Math.abs(metrics.faceSize - calibration.faceSize) /
      calibration.faceSize * 100 * 2
    );

    const distanceScore = metrics.screenDistance < calibration.screenDistance * 0.7
      ? Math.min(100, (1 - metrics.screenDistance / calibration.screenDistance) * 200)
      : 0;

    // Weighted average (higher = worse posture)
    const raw = (forwardScore * 0.35) + (lateralScore * 0.2) +
                (slouchScore * 0.3) + (distanceScore * 0.15);

    // Invert: 100 = perfect, 0 = worst
    return Math.max(0, Math.min(100, 100 - raw));
  }

  // ─── Frame Processing ─────────────────────────────────────────

  function onPostureFrame(event) {
    const { landmarks, ts } = event.detail;

    if (!session.startTime) session.startTime = Date.now();

    const metrics = calculateMetrics(landmarks, ts);
    if (!metrics) return;

    // Add to rolling window
    recentFrames.push({ metrics, ts });
    const cutoff = ts - ROLLING_WINDOW_MS;
    recentFrames = recentFrames.filter(f => f.ts > cutoff);

    // Compute score
    const score = computeScore(metrics);

    // Track session
    session.timestamps.push(ts);
    session.scores.push(score);

    // Alert logic
    const thresholdMs = calibration ? ALERT_THRESHOLD_MS : 30000;
    if (score < 50) {
      if (!badPostureStart) badPostureStart = ts;

      if (!alertTriggered && (ts - badPostureStart) > thresholdMs) {
        alertTriggered = true;
        const alertData = {
          ts,
          score,
          metrics: {
            forwardTilt: metrics.forwardTilt,
            lateralTilt: metrics.lateralTilt,
            faceSize: metrics.faceSize,
            screenDistance: metrics.screenDistance
          }
        };
        session.alerts.push(alertData);

        // Request Claude nudge via background.js
        chrome.runtime.sendMessage({
          type: 'REQUEST_NUDGE',
          metrics: alertData.metrics
        });
      }
    } else {
      if (badPostureStart && alertTriggered) {
        const frameDuration = 33; // approximate ms per frame
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

    // Dispatch score update (throttled)
    if (ts - lastScoreDispatch > SCORE_DISPATCH_INTERVAL_MS) {
      lastScoreDispatch = ts;
      window.dispatchEvent(new CustomEvent('posture:score', {
        detail: { score, metrics, ts }
      }));
    }
  }

  // ─── Calibration ──────────────────────────────────────────────

  window.addEventListener('posture-cal:complete', (e) => {
    calibration = e.detail;
    console.log('[PostureGuard] Calibration set:', calibration);
  });

  // Load saved calibration
  chrome.storage.local.get(['postureCalV1'], (result) => {
    if (result.postureCalV1) {
      calibration = result.postureCalV1;
      console.log('[PostureGuard] Loaded saved calibration');
    }
  });

  // ─── Session Data Access ──────────────────────────────────────

  function getSessionData() {
    const now = Date.now();
    const duration = session.startTime ? Math.round((now - session.startTime) / 1000) : 0;
    const avgScore = session.scores.length > 0
      ? Math.round(session.scores.reduce((a, b) => a + b, 0) / session.scores.length)
      : 0;

    return {
      version: 1,
      sessionId: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

  function resetSession() {
    session = { startTime: null, timestamps: [], scores: [], alerts: [], worstPeriods: [] };
    recentFrames = [];
    badPostureStart = null;
    alertTriggered = false;
  }

  function average(arr) {
    if (arr.length === 0) return 0;
    return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
  }

  // ─── Init ─────────────────────────────────────────────────────

  initFilters();
  window.addEventListener('posture:frame', onPostureFrame);

  window.PostureAnalyzer = { getSessionData, resetSession };

  console.log('[PostureGuard] Posture analyzer loaded');
})();
