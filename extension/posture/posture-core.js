'use strict';

// PostureGuard — Posture Core
// Initializes Human.js, manages webcam, runs the detection loop,
// and dispatches posture:frame / posture:status events.

(function () {
  if (window.__postureCoreInit) return;
  window.__postureCoreInit = true;

  // ─── Configuration ────────────────────────────────────────────

  const POINT_THROTTLE_MS = 33;     // ~30fps dispatch rate
  const CAMERA_WIDTH = 320;
  const CAMERA_HEIGHT = 240;

  // ─── State ────────────────────────────────────────────────────

  let human = null;
  let video = null;
  let stream = null;
  let phase = 'loading'; // loading -> ready -> calibrating -> live -> error
  let detectInProgress = false;
  let lastPointTs = 0;
  let videoFrameHandle = null;
  let rafHandle = null;
  let enabled = false;
  let frameCount = 0;

  // ─── Status Dispatch ──────────────────────────────────────────

  function dispatchStatus(nextPhase, note) {
    if (phase !== nextPhase) {
      phase = nextPhase;
    }
    window.dispatchEvent(new CustomEvent('posture:status', {
      detail: { phase, note, ts: performance.now() }
    }));
    console.log('[PostureGuard] Status:', nextPhase, '-', note);
  }

  function dispatchFrame(landmarks, confidence, bodyKeypoints) {
    const now = performance.now();
    if (now - lastPointTs < POINT_THROTTLE_MS) return;
    lastPointTs = now;

    frameCount++;
    if (frameCount % 30 === 1) {
      const bodyInfo = bodyKeypoints ? ', body: ' + bodyKeypoints.length + ' keypoints' : '';
      console.log('[PostureGuard] Frame #' + frameCount +
        ', landmarks: ' + landmarks.length +
        ', confidence: ' + confidence.toFixed(2) + bodyInfo);
    }

    window.dispatchEvent(new CustomEvent('posture:frame', {
      detail: { landmarks, confidence, bodyKeypoints, ts: now }
    }));
  }

  // ─── Camera Setup ─────────────────────────────────────────────

  async function initCamera() {
    try {
      video = document.createElement('video');
      video.style.position = 'fixed';
      video.style.top = '-10000px';
      video.style.left = '-10000px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      document.body.appendChild(video);

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: CAMERA_WIDTH,
          height: CAMERA_HEIGHT,
          facingMode: 'user'
        }
      });

      video.srcObject = stream;
      await video.play();
      console.log('[PostureGuard] Camera initialized (' + CAMERA_WIDTH + 'x' + CAMERA_HEIGHT + ')');
      return true;
    } catch (err) {
      console.error('[PostureGuard] Camera init failed:', err);
      dispatchStatus('error', 'Camera access denied or unavailable');
      return false;
    }
  }

  // ─── Human.js Setup ───────────────────────────────────────────

  async function initHuman() {
    try {
      dispatchStatus('loading', 'Loading face detection model...');
      const humanUrl = chrome.runtime.getURL('posture/human/human.esm.js');
      const { Human } = await import(humanUrl);

      human = new Human({
        backend: 'webgl',
        modelBasePath: chrome.runtime.getURL('posture/human/models/'),
        face: {
          enabled: true,
          detector: { enabled: true, rotation: true, return: true, maxDetected: 1 },
          mesh: { enabled: true },
          iris: { enabled: true },
          emotion: { enabled: false },
          description: { enabled: false }
        },
        body: { enabled: true, modelPath: 'movenet-lightning.json', maxDetected: 1 },
        hand: { enabled: false },
        gesture: { enabled: false },
        object: { enabled: false },
        segmentation: { enabled: false }
      });

      console.log('[PostureGuard] Human.js loaded, warming up...');
      await human.warmup();
      console.log('[PostureGuard] Human.js ready');
      return true;
    } catch (err) {
      console.error('[PostureGuard] Human.js init failed:', err);
      dispatchStatus('error', 'Detection model failed to load');
      return false;
    }
  }

  // ─── Detection Loop ───────────────────────────────────────────

  async function processFrame() {
    if (!enabled || detectInProgress || !human || !video) return;

    detectInProgress = true;
    try {
      const result = await human.detect(video);

      // Extract body keypoints
      let bodyKeypoints = null;
      if (result.body && result.body.length > 0) {
        bodyKeypoints = result.body[0].keypoints || null;
      }

      if (result.face && result.face.length > 0) {
        const face = result.face[0];
        const landmarks = face.mesh || [];
        const confidence = face.faceScore || 0;

        if (landmarks.length > 0 && confidence > 0.5) {
          dispatchFrame(landmarks, confidence, bodyKeypoints);
        }
      }
    } catch (err) {
      console.error('[PostureGuard] Detection error:', err);
    } finally {
      detectInProgress = false;
    }
  }

  function startDetectionLoop() {
    if (!video) return;
    if (typeof video.requestVideoFrameCallback === 'function') {
      const onFrame = async () => {
        await processFrame();
        if (enabled) {
          videoFrameHandle = video.requestVideoFrameCallback(onFrame);
        }
      };
      videoFrameHandle = video.requestVideoFrameCallback(onFrame);
    } else {
      // Fallback: requestAnimationFrame
      const step = async () => {
        await processFrame();
        if (enabled) {
          rafHandle = requestAnimationFrame(step);
        }
      };
      rafHandle = requestAnimationFrame(step);
    }
    console.log('[PostureGuard] Detection loop started');
  }

  function stopDetectionLoop() {
    if (videoFrameHandle !== null && video) {
      video.cancelVideoFrameCallback?.(videoFrameHandle);
      videoFrameHandle = null;
    }
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  }

  // ─── Start / Stop ─────────────────────────────────────────────

  async function start() {
    if (enabled) return;
    dispatchStatus('loading', 'Initializing camera and detection model...');

    const cameraOk = await initCamera();
    if (!cameraOk) return;

    const humanOk = await initHuman();
    if (!humanOk) return;

    enabled = true;
    frameCount = 0;
    dispatchStatus('ready', 'Detection ready — waiting for calibration');
    startDetectionLoop();
  }

  function stop() {
    enabled = false;
    stopDetectionLoop();
    removePreview();

    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (video && video.parentNode) {
      video.parentNode.removeChild(video);
      video = null;
    }

    console.log('[PostureGuard] Stopped after ' + frameCount + ' frames');
    dispatchStatus('loading', 'Stopped');
  }

  // ─── Camera Preview (Debug) ──────────────────────────────────

  let previewEl = null;
  let previewVisible = false;

  function togglePreview() {
    if (!video || !stream) return;

    if (!previewEl) {
      previewEl = document.createElement('div');
      previewEl.id = 'posture-camera-preview';
      previewEl.style.cssText = [
        'position: fixed', 'bottom: 60px', 'left: 20px',
        'width: 160px', 'height: 120px',
        'border-radius: 8px', 'overflow: hidden',
        'border: 2px solid rgba(255, 255, 255, 0.6)',
        'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3)',
        'z-index: 2147483646', 'opacity: 0.85',
        'transition: opacity 0.3s ease'
      ].join('; ');

      const previewVideo = document.createElement('video');
      previewVideo.srcObject = stream;
      previewVideo.autoplay = true;
      previewVideo.muted = true;
      previewVideo.playsInline = true;
      previewVideo.style.cssText = [
        'width: 100%', 'height: 100%',
        'object-fit: cover', 'transform: scaleX(-1)'
      ].join('; ');
      previewEl.appendChild(previewVideo);
      document.documentElement.appendChild(previewEl);
    }

    previewVisible = !previewVisible;
    previewEl.style.display = previewVisible ? 'block' : 'none';
    console.log('[PostureGuard] Camera preview:', previewVisible ? 'shown' : 'hidden');
  }

  function removePreview() {
    if (previewEl && previewEl.parentNode) {
      previewEl.parentNode.removeChild(previewEl);
      previewEl = null;
      previewVisible = false;
    }
  }

  // ─── Event Listeners ──────────────────────────────────────────

  window.addEventListener('posture:toggle', async (e) => {
    if (e.detail.enabled) {
      // Check with background if we should own the camera
      try {
        const response = await chrome.runtime.sendMessage({ type: 'SHOULD_START_CAMERA' });
        if (response && response.start) {
          start();
        }
      } catch (_e) {
        start();
      }
    } else {
      stop();
      // Tell background we released the camera
      chrome.runtime.sendMessage({ type: 'CAMERA_RELEASED' }).catch(() => {});
    }
  });

  window.addEventListener('posture:toggle-preview', () => {
    togglePreview();
  });

  // Check if this tab should start the camera
  // Only one tab runs the camera — ask background first
  chrome.storage.local.get(['postureEnabled'], async (result) => {
    if (result.postureEnabled) {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'SHOULD_START_CAMERA' });
        if (response && response.start) {
          start();
        } else {
          console.log('[PostureGuard] Camera already running on another tab');
        }
      } catch (_e) {
        // Background not ready, try starting anyway
        start();
      }
    }
  });

  // Expose for other modules
  window.PostureCore = {
    start,
    stop,
    getPhase: () => phase,
    getStream: () => stream,
    togglePreview
  };

  console.log('[PostureGuard] Posture core loaded');
})();
