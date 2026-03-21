'use strict';

// PostureGuard — Posture Calibration
// Captures baseline sitting position by averaging landmarks over multiple frames.

(function () {
  if (window.__postureCalInit) return;
  window.__postureCalInit = true;

  // ─── Configuration ────────────────────────────────────────────

  const CALIBRATION_FRAMES = 60;   // Number of frames to capture
  const COUNTDOWN_SECONDS = 3;

  // Landmark indices
  const NOSE_TIP = 1;
  const LEFT_EYE = 33;
  const RIGHT_EYE = 362;
  const CHIN = 152;
  const FOREHEAD = 10;

  // ─── State ────────────────────────────────────────────────────

  let isCalibrating = false;
  let collectedFrames = [];
  let overlayEl = null;
  let statusEl = null;

  // ─── UI ───────────────────────────────────────────────────────

  function showOverlay(text) {
    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.id = 'posture-cal-overlay';
      overlayEl.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        z-index: 2147483646;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: white; pointer-events: all;
      `;

      statusEl = document.createElement('div');
      statusEl.style.cssText = `
        font-size: 24px; font-weight: 600;
        text-align: center; max-width: 500px; line-height: 1.5;
      `;
      overlayEl.appendChild(statusEl);
      document.documentElement.appendChild(overlayEl);
    }
    statusEl.textContent = text;
  }

  function removeOverlay() {
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null;
      statusEl = null;
    }
  }

  // ─── Calibration Logic ────────────────────────────────────────

  function onCalibrationFrame(event) {
    if (!isCalibrating) return;

    const { landmarks } = event.detail;
    const nose = landmarks[NOSE_TIP];
    const leftEye = landmarks[LEFT_EYE];
    const rightEye = landmarks[RIGHT_EYE];
    const chin = landmarks[CHIN];
    const forehead = landmarks[FOREHEAD];

    if (!nose || !leftEye || !rightEye || !chin || !forehead) return;

    const eyeMidY = (leftEye[1] + rightEye[1]) / 2;
    const eyeDx = rightEye[0] - leftEye[0];
    const eyeDy = rightEye[1] - leftEye[1];

    collectedFrames.push({
      forwardTilt: nose[1] - eyeMidY,
      lateralTilt: Math.atan2(eyeDy, eyeDx) * (180 / Math.PI),
      faceSize: Math.sqrt(
        Math.pow(forehead[0] - chin[0], 2) +
        Math.pow(forehead[1] - chin[1], 2)
      ),
      screenDistance: Math.sqrt(
        Math.pow(rightEye[0] - leftEye[0], 2) +
        Math.pow(rightEye[1] - leftEye[1], 2)
      )
    });

    showOverlay(`Capturing... ${collectedFrames.length} / ${CALIBRATION_FRAMES}`);

    if (collectedFrames.length >= CALIBRATION_FRAMES) {
      finishCalibration();
    }
  }

  function finishCalibration() {
    isCalibrating = false;
    window.removeEventListener('posture:frame', onCalibrationFrame);

    // Average all collected frames
    const avg = {
      forwardTilt: 0,
      lateralTilt: 0,
      faceSize: 0,
      screenDistance: 0
    };

    for (const frame of collectedFrames) {
      avg.forwardTilt += frame.forwardTilt;
      avg.lateralTilt += frame.lateralTilt;
      avg.faceSize += frame.faceSize;
      avg.screenDistance += frame.screenDistance;
    }

    const n = collectedFrames.length;
    avg.forwardTilt /= n;
    avg.lateralTilt /= n;
    avg.faceSize /= n;
    avg.screenDistance /= n;
    avg.ts = Date.now();
    avg.version = 1;

    // Save to storage
    chrome.storage.local.set({ postureCalV1: avg });

    // Notify analyzer
    window.dispatchEvent(new CustomEvent('posture-cal:complete', { detail: avg }));

    showOverlay('Calibration complete!');
    setTimeout(removeOverlay, 1500);

    // Update phase
    window.dispatchEvent(new CustomEvent('posture:status', {
      detail: { phase: 'live', note: 'Calibrated and monitoring', ts: performance.now() }
    }));

    collectedFrames = [];
  }

  async function startCalibration() {
    if (isCalibrating) return;

    showOverlay('Sit up straight in your normal good posture...');

    // Countdown
    for (let i = COUNTDOWN_SECONDS; i > 0; i--) {
      showOverlay(`Sit up straight... starting in ${i}`);
      await new Promise(r => setTimeout(r, 1000));
    }

    showOverlay('Hold still — capturing baseline...');
    collectedFrames = [];
    isCalibrating = true;
    window.addEventListener('posture:frame', onCalibrationFrame);
  }

  // ─── External Triggers ────────────────────────────────────────

  // Triggered from side panel via storage or message
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'START_CALIBRATION') {
      startCalibration();
    }
  });

  window.PostureCal = { startCalibration };

  console.log('[PostureGuard] Posture calibration loaded');
})();
