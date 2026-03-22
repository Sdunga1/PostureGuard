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

  async function initCamera(retries) {
    const maxRetries = retries || 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Clean up any leftover video element
        if (video && video.parentNode) {
          video.parentNode.removeChild(video);
        }

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
        console.warn('[PostureGuard] Camera attempt ' + attempt + '/' + maxRetries + ' failed:', err.name, '-', err.message);
        // Clean up failed attempt
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        if (video && video.parentNode) { video.parentNode.removeChild(video); video = null; }

        if (attempt < maxRetries) {
          // Wait before retrying — camera hardware may still be releasing
          await new Promise(r => setTimeout(r, 1000));
        } else {
          dispatchStatus('error', 'Camera error: ' + (err.name || 'unknown'));
          return false;
        }
      }
    }
    return false;
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

      // Store for live preview mesh overlay
      lastDetectionResult = result;
      if (previewVisible) drawMeshOverlay();

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

    // Check if calibration already exists — skip straight to live
    chrome.storage.local.get(['postureCalV1'], (result) => {
      if (result.postureCalV1) {
        dispatchStatus('live', 'Calibrated and monitoring');
      } else {
        dispatchStatus('ready', 'Detection ready \u2014 calibrate to begin');
      }
    });

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

  // ─── Camera Preview (Live Mode) ─────────────────────────────

  const PREVIEW_W = 240;
  const PREVIEW_H = 180;

  let previewEl = null;
  let previewCanvas = null;
  let previewCtx = null;
  let previewVisible = false;
  let lastDetectionResult = null;
  let currentScore = 75;

  // Face oval indices for outline
  const FACE_OVAL = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
  ];

  // Body skeleton connections (upper body only)
  const BODY_CONNECTIONS = [
    [5, 6],   // left shoulder → right shoulder
    [5, 7],   // left shoulder → left elbow
    [6, 8],   // right shoulder → right elbow
    [7, 9],   // left elbow → left wrist
    [8, 10],  // right elbow → right wrist
    [5, 11],  // left shoulder → left hip
    [6, 12],  // right shoulder → right hip
    [11, 12]  // left hip → right hip
  ];

  function getScoreColor(score) {
    if (score >= 70) return { main: '#52c41a', glow: 'rgba(82, 196, 26, 0.4)' };
    if (score >= 50) return { main: '#faad14', glow: 'rgba(250, 173, 20, 0.4)' };
    return { main: '#ff4d4f', glow: 'rgba(255, 77, 79, 0.4)' };
  }

  // Listen for score updates to color the mesh
  window.addEventListener('posture:score', (e) => {
    if (e.detail && e.detail.score !== undefined) {
      currentScore = e.detail.score;
    }
  });

  function drawMeshOverlay() {
    if (!previewCtx || !previewVisible || !lastDetectionResult) return;

    const ctx = previewCtx;
    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);

    const color = getScoreColor(currentScore);
    const result = lastDetectionResult;

    // Scale factors: detection runs at CAMERA_WIDTH x CAMERA_HEIGHT
    const sx = PREVIEW_W / CAMERA_WIDTH;
    const sy = PREVIEW_H / CAMERA_HEIGHT;

    // ─── Draw face mesh ───
    if (result.face && result.face.length > 0) {
      const face = result.face[0];
      const mesh = face.mesh || [];

      if (mesh.length > 0) {
        // Draw face oval outline
        ctx.strokeStyle = color.main;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = color.glow;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        for (let i = 0; i < FACE_OVAL.length; i++) {
          const idx = FACE_OVAL[i];
          if (idx < mesh.length) {
            // Mirror X for scaleX(-1) on video
            const x = PREVIEW_W - (mesh[idx][0] * sx);
            const y = mesh[idx][1] * sy;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();

        // Draw mesh dots (every 5th point for performance)
        ctx.shadowBlur = 0;
        ctx.fillStyle = color.main;
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < mesh.length; i += 5) {
          const x = PREVIEW_W - (mesh[i][0] * sx);
          const y = mesh[i][1] * sy;
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // Draw eye outlines
        const LEFT_EYE_IDX = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
        const RIGHT_EYE_IDX = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

        ctx.strokeStyle = color.main;
        ctx.lineWidth = 1;
        [LEFT_EYE_IDX, RIGHT_EYE_IDX].forEach((eyeIdx) => {
          ctx.beginPath();
          eyeIdx.forEach((idx, i) => {
            if (idx < mesh.length) {
              const x = PREVIEW_W - (mesh[idx][0] * sx);
              const y = mesh[idx][1] * sy;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
          });
          ctx.closePath();
          ctx.stroke();
        });
      }
    }

    // ─── Draw body skeleton ───
    if (result.body && result.body.length > 0) {
      const kp = result.body[0].keypoints;
      if (kp && kp.length > 0) {
        ctx.strokeStyle = color.main;
        ctx.lineWidth = 2;
        ctx.shadowColor = color.glow;
        ctx.shadowBlur = 4;

        BODY_CONNECTIONS.forEach(([a, b]) => {
          if (a < kp.length && b < kp.length) {
            const ka = kp[a];
            const kb = kp[b];
            if (ka.score > 0.3 && kb.score > 0.3) {
              ctx.beginPath();
              ctx.moveTo(PREVIEW_W - (ka.position[0] * sx), ka.position[1] * sy);
              ctx.lineTo(PREVIEW_W - (kb.position[0] * sx), kb.position[1] * sy);
              ctx.stroke();
            }
          }
        });

        // Draw joint dots
        ctx.shadowBlur = 0;
        ctx.fillStyle = color.main;
        kp.forEach((k, i) => {
          if (i <= 12 && k.score > 0.3) { // Upper body only (0-12)
            ctx.beginPath();
            ctx.arc(PREVIEW_W - (k.position[0] * sx), k.position[1] * sy, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
    }

    ctx.shadowBlur = 0;

    // Update preview border color to match score
    if (previewEl) {
      previewEl.style.borderColor = color.main;
      previewEl.style.boxShadow = '0 4px 16px ' + color.glow;
    }
  }

  function togglePreview() {
    if (!video || !stream) return;

    if (!previewEl) {
      previewEl = document.createElement('div');
      previewEl.id = 'posture-camera-preview';
      previewEl.style.cssText = [
        'position: fixed', 'bottom: 60px', 'left: 20px',
        'width: ' + PREVIEW_W + 'px', 'height: ' + PREVIEW_H + 'px',
        'border-radius: 10px', 'overflow: hidden',
        'border: 2px solid rgba(0, 224, 255, 0.6)',
        'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5)',
        'z-index: 2147483646',
        'cursor: grab', 'user-select: none'
      ].join('; ');

      const previewVideo = document.createElement('video');
      previewVideo.srcObject = stream;
      previewVideo.autoplay = true;
      previewVideo.muted = true;
      previewVideo.playsInline = true;
      previewVideo.style.cssText = [
        'position: absolute', 'top: 0', 'left: 0',
        'width: 100%', 'height: 100%',
        'object-fit: cover', 'transform: scaleX(-1)',
        'pointer-events: none'
      ].join('; ');
      previewEl.appendChild(previewVideo);

      // Canvas overlay for mesh
      previewCanvas = document.createElement('canvas');
      previewCanvas.width = PREVIEW_W;
      previewCanvas.height = PREVIEW_H;
      previewCanvas.style.cssText = [
        'position: absolute', 'top: 0', 'left: 0',
        'width: 100%', 'height: 100%',
        'pointer-events: none'
      ].join('; ');
      previewEl.appendChild(previewCanvas);
      previewCtx = previewCanvas.getContext('2d');

      // ─── Drag logic ───
      let isDragging = false;
      let dragX = 0;
      let dragY = 0;
      let elLeft = 20;
      let elTop = window.innerHeight - 60 - PREVIEW_H;

      previewEl.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragX = e.clientX - elLeft;
        dragY = e.clientY - elTop;
        previewEl.style.cursor = 'grabbing';
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        elLeft = Math.max(0, Math.min(window.innerWidth - PREVIEW_W, e.clientX - dragX));
        elTop = Math.max(0, Math.min(window.innerHeight - PREVIEW_H, e.clientY - dragY));
        previewEl.style.left = elLeft + 'px';
        previewEl.style.top = elTop + 'px';
        previewEl.style.bottom = 'auto';
      });

      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          previewEl.style.cursor = 'grab';
        }
      });

      document.documentElement.appendChild(previewEl);
    }

    previewVisible = !previewVisible;
    previewEl.style.display = previewVisible ? 'block' : 'none';
    console.log('[PostureGuard] Live preview:', previewVisible ? 'shown' : 'hidden');
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
      // Wait for camera hardware to fully release if we just stopped
      await new Promise(r => setTimeout(r, 500));
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

  window.addEventListener('posture:set-preview', (e) => {
    const shouldShow = e.detail.enabled;
    if (shouldShow && !previewVisible) {
      togglePreview(); // show it
    } else if (!shouldShow && previewVisible) {
      togglePreview(); // hide it
    }
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
