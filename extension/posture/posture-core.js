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
  let phase = 'loading'; // loading → ready → calibrating → live → error
  let detectInProgress = false;
  let lastPointTs = 0;
  let videoFrameHandle = null;
  let rafHandle = null;
  let enabled = false;

  // ─── Status Dispatch ──────────────────────────────────────────

  function dispatchStatus(nextPhase, note) {
    if (phase !== nextPhase) {
      phase = nextPhase;
    }
    window.dispatchEvent(new CustomEvent('posture:status', {
      detail: { phase, note, ts: performance.now() }
    }));
  }

  function dispatchFrame(landmarks, confidence) {
    const now = performance.now();
    if (now - lastPointTs < POINT_THROTTLE_MS) return;
    lastPointTs = now;

    window.dispatchEvent(new CustomEvent('posture:frame', {
      detail: { landmarks, confidence, ts: now }
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
      const humanUrl = chrome.runtime.getURL('lib/human/human.esm.js');
      const { Human } = await import(humanUrl);

      human = new Human({
        backend: 'webgl',
        modelBasePath: chrome.runtime.getURL('lib/human/models/'),
        face: {
          enabled: true,
          detector: { enabled: true, rotation: true, return: true, maxDetected: 1 },
          mesh: { enabled: true },
          iris: { enabled: false },
          emotion: { enabled: false },
          description: { enabled: false }
        },
        body: { enabled: false },
        hand: { enabled: false },
        gesture: { enabled: false },
        object: { enabled: false },
        segmentation: { enabled: false }
      });

      await human.warmup();
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

      if (result.face && result.face.length > 0) {
        const face = result.face[0];
        const landmarks = face.mesh || [];
        const confidence = face.faceScore || 0;

        if (landmarks.length > 0 && confidence > 0.5) {
          dispatchFrame(landmarks, confidence);
        }
      }
    } catch (err) {
      console.error('[PostureGuard] Detection error:', err);
    } finally {
      detectInProgress = false;
    }
  }

  function startDetectionLoop() {
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
    dispatchStatus('ready', 'Detection ready — waiting for calibration');
    startDetectionLoop();
  }

  function stop() {
    enabled = false;
    stopDetectionLoop();

    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (video && video.parentNode) {
      video.parentNode.removeChild(video);
      video = null;
    }

    dispatchStatus('loading', 'Stopped');
  }

  // ─── Event Listeners ──────────────────────────────────────────

  window.addEventListener('posture:toggle', (e) => {
    if (e.detail.enabled) {
      start();
    } else {
      stop();
    }
  });

  // Check initial state from storage
  chrome.storage.local.get(['postureEnabled'], (result) => {
    if (result.postureEnabled) {
      start();
    }
  });

  // Expose for other modules
  window.PostureCore = { start, stop, getPhase: () => phase };

  console.log('[PostureGuard] Posture core loaded');
})();
