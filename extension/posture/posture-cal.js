'use strict';

// PostureGuard — Posture Calibration
// Captures baseline sitting position by averaging landmarks over multiple frames.
// Shows live camera preview with green face border during calibration.

(function () {
  if (window.__postureCalInit) return;
  window.__postureCalInit = true;

  // ─── Configuration ────────────────────────────────────────────

  const CALIBRATION_FRAMES = 60;   // Number of frames to capture (~2s at 30fps)
  const COUNTDOWN_SECONDS = 3;

  // Landmark indices (Human.js / MediaPipe Face Mesh)
  const NOSE_TIP = 1;
  const LEFT_EYE = 33;
  const RIGHT_EYE = 362;
  const CHIN = 152;
  const FOREHEAD = 10;
  // Face contour landmarks for drawing the green border
  const FACE_OVAL = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
  ];

  // ─── State ────────────────────────────────────────────────────

  let isCalibrating = false;
  let collectedFrames = [];
  let overlayEl = null;
  let videoEl = null;
  let canvasEl = null;
  let canvasCtx = null;
  let statusEl = null;
  let progressEl = null;
  let instructionEl = null;

  // ─── Calibration UI ──────────────────────────────────────────

  function createOverlay() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'posture-cal-overlay';
    overlayEl.style.cssText = [
      'position: fixed', 'top: 0', 'left: 0', 'right: 0', 'bottom: 0',
      'background: rgba(0, 0, 0, 0.85)',
      'display: flex', 'flex-direction: column',
      'align-items: center', 'justify-content: center',
      'z-index: 2147483646', 'gap: 16px',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'color: white', 'pointer-events: all'
    ].join('; ');

    // Title
    const titleEl = document.createElement('div');
    titleEl.textContent = 'PostureGuard Calibration';
    titleEl.style.cssText = 'font-size: 20px; font-weight: 700; letter-spacing: 0.5px;';
    overlayEl.appendChild(titleEl);

    // Video container (with canvas overlay for face border)
    const videoContainer = document.createElement('div');
    videoContainer.style.cssText = [
      'position: relative',
      'width: 320px', 'height: 240px',
      'border-radius: 12px', 'overflow: hidden',
      'border: 3px solid rgba(255, 255, 255, 0.3)',
      'box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4)'
    ].join('; ');

    // Mirror video element
    videoEl = document.createElement('video');
    videoEl.autoplay = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.style.cssText = [
      'width: 100%', 'height: 100%',
      'object-fit: cover', 'transform: scaleX(-1)'
    ].join('; ');

    // Canvas overlay for drawing face outline
    canvasEl = document.createElement('canvas');
    canvasEl.width = 320;
    canvasEl.height = 240;
    canvasEl.style.cssText = [
      'position: absolute', 'top: 0', 'left: 0',
      'width: 100%', 'height: 100%',
      'pointer-events: none', 'transform: scaleX(-1)'
    ].join('; ');
    canvasCtx = canvasEl.getContext('2d');

    videoContainer.appendChild(videoEl);
    videoContainer.appendChild(canvasEl);
    overlayEl.appendChild(videoContainer);

    // Instruction text
    instructionEl = document.createElement('div');
    instructionEl.style.cssText = [
      'font-size: 18px', 'font-weight: 600',
      'text-align: center', 'max-width: 400px', 'line-height: 1.5'
    ].join('; ');
    overlayEl.appendChild(instructionEl);

    // Progress bar
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = [
      'width: 280px', 'height: 6px',
      'background: rgba(255, 255, 255, 0.2)',
      'border-radius: 3px', 'overflow: hidden'
    ].join('; ');

    progressEl = document.createElement('div');
    progressEl.style.cssText = [
      'width: 0%', 'height: 100%',
      'background: #52c41a',
      'border-radius: 3px',
      'transition: width 0.1s ease'
    ].join('; ');
    progressContainer.appendChild(progressEl);
    overlayEl.appendChild(progressContainer);

    // Status text
    statusEl = document.createElement('div');
    statusEl.style.cssText = 'font-size: 13px; color: rgba(255,255,255,0.6);';
    overlayEl.appendChild(statusEl);

    document.documentElement.appendChild(overlayEl);

    // Connect to camera stream
    connectCameraToPreview();
  }

  function connectCameraToPreview() {
    if (!videoEl) return;

    // Get the camera stream from PostureCore
    if (window.PostureCore && window.PostureCore.getStream()) {
      videoEl.srcObject = window.PostureCore.getStream();
      videoEl.play().catch(() => {});
      console.log('[PostureGuard] Calibration: connected to camera stream');
    } else {
      console.warn('[PostureGuard] Calibration: no camera stream available');
      if (instructionEl) {
        instructionEl.textContent = 'Enable monitoring first, then calibrate.';
      }
    }
  }

  function updateInstruction(text) {
    if (instructionEl) instructionEl.textContent = text;
  }

  function updateStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function updateProgress(fraction) {
    if (progressEl) progressEl.style.width = Math.round(fraction * 100) + '%';
  }

  function drawFaceOutline(landmarks, isGood) {
    if (!canvasCtx || !canvasEl) return;

    canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    // Draw face oval
    const color = isGood ? '#52c41a' : '#faad14'; // green if detected, yellow if not ready
    canvasCtx.strokeStyle = color;
    canvasCtx.lineWidth = 2.5;
    canvasCtx.shadowColor = color;
    canvasCtx.shadowBlur = 8;

    canvasCtx.beginPath();
    let started = false;
    for (const idx of FACE_OVAL) {
      if (landmarks[idx]) {
        const x = landmarks[idx][0] * canvasEl.width;
        const y = landmarks[idx][1] * canvasEl.height;
        if (!started) {
          canvasCtx.moveTo(x, y);
          started = true;
        } else {
          canvasCtx.lineTo(x, y);
        }
      }
    }
    canvasCtx.closePath();
    canvasCtx.stroke();

    // Reset shadow
    canvasCtx.shadowBlur = 0;

    // Draw nose/eye markers
    if (landmarks[NOSE_TIP]) {
      const nx = landmarks[NOSE_TIP][0] * canvasEl.width;
      const ny = landmarks[NOSE_TIP][1] * canvasEl.height;
      canvasCtx.fillStyle = color;
      canvasCtx.beginPath();
      canvasCtx.arc(nx, ny, 3, 0, Math.PI * 2);
      canvasCtx.fill();
    }
  }

  function removeOverlay() {
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null;
      videoEl = null;
      canvasEl = null;
      canvasCtx = null;
      statusEl = null;
      progressEl = null;
      instructionEl = null;
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

    // Draw face outline on canvas (green = good)
    drawFaceOutline(landmarks, true);

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

    const progress = collectedFrames.length / CALIBRATION_FRAMES;
    updateProgress(progress);
    updateStatus('Capturing frame ' + collectedFrames.length + ' of ' + CALIBRATION_FRAMES);

    if (collectedFrames.length >= CALIBRATION_FRAMES) {
      finishCalibration();
    }
  }

  // Listen to frames during countdown too (to show face outline before capture starts)
  function onPreviewFrame(event) {
    if (isCalibrating) return; // handled by onCalibrationFrame
    const { landmarks } = event.detail;
    drawFaceOutline(landmarks, false); // yellow during countdown
  }

  function finishCalibration() {
    isCalibrating = false;
    window.removeEventListener('posture:frame', onCalibrationFrame);
    window.removeEventListener('posture:frame', onPreviewFrame);

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

    // Show success
    updateInstruction('Calibration complete!');
    updateStatus('Your ideal posture has been saved.');
    updateProgress(1);

    // Draw final green outline with a thick glow
    if (canvasCtx && canvasEl) {
      canvasCtx.strokeStyle = '#52c41a';
      canvasCtx.lineWidth = 4;
      canvasCtx.shadowColor = '#52c41a';
      canvasCtx.shadowBlur = 16;
    }

    // Close overlay after 2 seconds
    setTimeout(() => {
      removeOverlay();

      // Update phase
      window.dispatchEvent(new CustomEvent('posture:status', {
        detail: { phase: 'live', note: 'Calibrated and monitoring', ts: performance.now() }
      }));
    }, 2000);

    collectedFrames = [];
  }

  async function startCalibration() {
    if (isCalibrating) return;

    // Create the overlay with camera preview
    createOverlay();

    // Listen for frames during countdown to show face outline
    window.addEventListener('posture:frame', onPreviewFrame);

    updateProgress(0);
    updateStatus('Position yourself in front of the camera');

    // Countdown
    for (let i = COUNTDOWN_SECONDS; i > 0; i--) {
      updateInstruction('Sit up straight... starting in ' + i);
      await new Promise(r => setTimeout(r, 1000));
    }

    // Start capture
    updateInstruction('Hold still \u2014 capturing your ideal posture...');
    window.removeEventListener('posture:frame', onPreviewFrame);

    collectedFrames = [];
    isCalibrating = true;
    window.addEventListener('posture:frame', onCalibrationFrame);
  }

  // ─── External Triggers ────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'START_CALIBRATION') {
      startCalibration();
    }
  });

  window.PostureCal = { startCalibration };

  console.log('[PostureGuard] Posture calibration loaded');
})();
