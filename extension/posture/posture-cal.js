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
  let videoContainerEl = null;
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
    videoContainerEl = document.createElement('div');
    videoContainerEl.style.cssText = [
      'position: relative',
      'width: 480px', 'height: 360px',
      'border-radius: 12px', 'overflow: hidden',
      'border: 2px solid #00d4ff',
      'box-shadow: 0 0 20px rgba(0, 212, 255, 0.3)',
      'transition: border-color 0.5s ease, box-shadow 0.5s ease'
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
    canvasEl.width = 480;
    canvasEl.height = 360;
    canvasEl.style.cssText = [
      'position: absolute', 'top: 0', 'left: 0',
      'width: 100%', 'height: 100%',
      'pointer-events: none', 'transform: scaleX(-1)'
    ].join('; ');
    canvasCtx = canvasEl.getContext('2d');

    videoContainerEl.appendChild(videoEl);
    videoContainerEl.appendChild(canvasEl);
    overlayEl.appendChild(videoContainerEl);

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

  // Face mesh triangulation connections (Delaunay-style, subset for performance)
  // These connect the 468 landmarks into a wireframe mesh
  const MESH_CONNECTIONS = [
    // Forehead region
    [10, 338], [338, 297], [297, 332], [332, 284], [284, 251],
    [10, 109], [109, 67], [67, 103], [103, 54], [54, 21],
    [10, 151], [151, 9], [9, 8], [8, 168], [168, 6], [6, 197],
    // Left eyebrow
    [46, 53], [53, 52], [52, 65], [65, 55], [55, 107],
    [70, 63], [63, 105], [105, 66], [66, 107],
    // Right eyebrow
    [276, 283], [283, 282], [282, 295], [295, 285], [285, 336],
    [300, 293], [293, 334], [334, 296], [296, 336],
    // Left eye
    [33, 7], [7, 163], [163, 144], [144, 145], [145, 153],
    [153, 154], [154, 155], [155, 133], [133, 173], [173, 157],
    [157, 158], [158, 159], [159, 160], [160, 161], [161, 246], [246, 33],
    // Right eye
    [362, 382], [382, 381], [381, 380], [380, 374], [374, 373],
    [373, 390], [390, 249], [249, 263], [263, 466], [466, 388],
    [388, 387], [387, 386], [386, 385], [385, 384], [384, 398], [398, 362],
    // Nose bridge & tip
    [168, 6], [6, 197], [197, 195], [195, 5], [5, 4],
    [4, 1], [1, 19], [19, 94], [94, 2], [2, 164],
    // Nose sides
    [98, 240], [240, 75], [75, 59], [59, 166], [166, 219],
    [327, 460], [460, 305], [305, 289], [289, 392], [392, 439],
    // Lips outer
    [61, 185], [185, 40], [40, 39], [39, 37], [37, 0], [0, 267],
    [267, 269], [269, 270], [270, 409], [409, 291],
    [291, 375], [375, 321], [321, 405], [405, 314], [314, 17],
    [17, 84], [84, 181], [181, 91], [91, 146], [146, 61],
    // Lips inner
    [78, 191], [191, 80], [80, 81], [81, 82], [82, 13], [13, 312],
    [312, 311], [311, 310], [310, 415], [415, 308],
    [308, 324], [324, 318], [318, 402], [402, 317], [317, 14],
    [14, 87], [87, 178], [178, 88], [88, 95], [95, 78],
    // Jawline
    [21, 162], [162, 127], [127, 234], [234, 93], [93, 132],
    [132, 58], [58, 172], [172, 136], [136, 150], [150, 149],
    [149, 176], [176, 148], [148, 152],
    [251, 389], [389, 356], [356, 454], [454, 323], [323, 361],
    [361, 288], [288, 397], [397, 365], [365, 379], [379, 378],
    [378, 400], [400, 377], [377, 152],
    // Cheek structure
    [116, 123], [123, 147], [147, 213], [213, 192], [192, 214],
    [345, 352], [352, 376], [376, 433], [433, 416], [416, 434],
    // Cross connections forehead to eyes
    [70, 46], [300, 276], [63, 53], [293, 283],
    // Eye to nose
    [133, 243], [243, 244], [244, 245], [245, 122], [122, 6],
    [362, 463], [463, 464], [464, 465], [465, 351], [351, 6]
  ];

  // MoveNet body skeleton connections
  // MoveNet keypoints: 0=nose, 1=leftEye, 2=rightEye, 3=leftEar, 4=rightEar,
  // 5=leftShoulder, 6=rightShoulder, 7=leftElbow, 8=rightElbow,
  // 9=leftWrist, 10=rightWrist, 11=leftHip, 12=rightHip,
  // 13=leftKnee, 14=rightKnee, 15=leftAnkle, 16=rightAnkle
  const BODY_CONNECTIONS = [
    // Head to shoulders
    [0, 1], [0, 2], [1, 3], [2, 4],
    // Shoulders
    [5, 6],
    // Left arm
    [5, 7], [7, 9],
    // Right arm
    [6, 8], [8, 10],
    // Torso
    [5, 11], [6, 12], [11, 12],
    // Left leg
    [11, 13], [13, 15],
    // Right leg
    [12, 14], [14, 16]
  ];

  // Scan animation state
  let scanLineY = 0;
  let scanDirection = 1;
  let pulsePhase = 0;

  function drawFaceOutline(landmarks, isCapturing, bodyKeypoints) {
    if (!canvasCtx || !canvasEl) return;

    const w = canvasEl.width;
    const h = canvasEl.height;
    canvasCtx.clearRect(0, 0, w, h);

    pulsePhase += 0.05;
    const pulse = 0.6 + 0.4 * Math.sin(pulsePhase); // 0.6-1.0 pulsing

    // Color scheme
    const mainColor = isCapturing ? '#52c41a' : '#00d4ff'; // green when capturing, cyan during countdown
    const dimColor = isCapturing ? 'rgba(82, 196, 26, 0.15)' : 'rgba(0, 212, 255, 0.12)';
    const dotColor = isCapturing ? 'rgba(82, 196, 26, 0.7)' : 'rgba(0, 212, 255, 0.5)';

    // ── 1. Draw mesh wireframe connections ──
    canvasCtx.strokeStyle = dimColor;
    canvasCtx.lineWidth = 0.5;
    for (const [a, b] of MESH_CONNECTIONS) {
      if (landmarks[a] && landmarks[b]) {
        const ax = landmarks[a][0] * w;
        const ay = landmarks[a][1] * h;
        const bx = landmarks[b][0] * w;
        const by = landmarks[b][1] * h;
        canvasCtx.beginPath();
        canvasCtx.moveTo(ax, ay);
        canvasCtx.lineTo(bx, by);
        canvasCtx.stroke();
      }
    }

    // ── 2. Draw landmark dots ──
    const dotSize = 1.2;
    canvasCtx.fillStyle = dotColor;
    // Draw a subset of landmarks for the mesh point effect (every 3rd)
    for (let i = 0; i < Math.min(landmarks.length, 468); i += 3) {
      if (landmarks[i]) {
        const x = landmarks[i][0] * w;
        const y = landmarks[i][1] * h;
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, dotSize, 0, Math.PI * 2);
        canvasCtx.fill();
      }
    }

    // ── 3. Draw face oval (main outline, glowing) ──
    canvasCtx.strokeStyle = mainColor;
    canvasCtx.lineWidth = 2;
    canvasCtx.shadowColor = mainColor;
    canvasCtx.shadowBlur = 12 * pulse;
    canvasCtx.globalAlpha = pulse;

    canvasCtx.beginPath();
    let started = false;
    for (const idx of FACE_OVAL) {
      if (landmarks[idx]) {
        const x = landmarks[idx][0] * w;
        const y = landmarks[idx][1] * h;
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
    canvasCtx.globalAlpha = 1;
    canvasCtx.shadowBlur = 0;

    // ── 4. Draw key feature outlines (eyes, brows, lips) ──
    const featureColor = isCapturing ? 'rgba(82, 196, 26, 0.6)' : 'rgba(0, 212, 255, 0.4)';
    canvasCtx.strokeStyle = featureColor;
    canvasCtx.lineWidth = 1;

    // Left eye outline
    drawFeaturePath(landmarks, [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33], w, h);
    // Right eye outline
    drawFeaturePath(landmarks, [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362], w, h);
    // Lips
    drawFeaturePath(landmarks, [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61], w, h);

    // ── 5. Key landmark markers (nose, eyes, chin) ──
    const markerColor = isCapturing ? '#52c41a' : '#00d4ff';
    const keyPoints = [NOSE_TIP, LEFT_EYE, RIGHT_EYE, CHIN, FOREHEAD];
    canvasCtx.fillStyle = markerColor;
    canvasCtx.shadowColor = markerColor;
    canvasCtx.shadowBlur = 6;
    for (const idx of keyPoints) {
      if (landmarks[idx]) {
        const x = landmarks[idx][0] * w;
        const y = landmarks[idx][1] * h;
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, 3, 0, Math.PI * 2);
        canvasCtx.fill();
      }
    }
    canvasCtx.shadowBlur = 0;

    // ── 6. Body skeleton ──
    if (bodyKeypoints && bodyKeypoints.length > 0) {
      const bodyColor = isCapturing ? '#52c41a' : '#00d4ff';
      const bodyDim = isCapturing ? 'rgba(82, 196, 26, 0.3)' : 'rgba(0, 212, 255, 0.25)';

      // Draw skeleton connections
      canvasCtx.strokeStyle = bodyDim;
      canvasCtx.lineWidth = 2.5;
      for (const [a, b] of BODY_CONNECTIONS) {
        const kpA = bodyKeypoints[a];
        const kpB = bodyKeypoints[b];
        if (kpA && kpB && kpA.score > 0.3 && kpB.score > 0.3) {
          // Body keypoints use pixel positions relative to input image
          const ax = (kpA.position ? kpA.position[0] : kpA.x) / 320 * w;
          const ay = (kpA.position ? kpA.position[1] : kpA.y) / 240 * h;
          const bx = (kpB.position ? kpB.position[0] : kpB.x) / 320 * w;
          const by = (kpB.position ? kpB.position[1] : kpB.y) / 240 * h;

          canvasCtx.beginPath();
          canvasCtx.moveTo(ax, ay);
          canvasCtx.lineTo(bx, by);
          canvasCtx.stroke();
        }
      }

      // Draw body keypoint dots
      canvasCtx.fillStyle = bodyColor;
      canvasCtx.shadowColor = bodyColor;
      canvasCtx.shadowBlur = 6;
      for (const kp of bodyKeypoints) {
        if (kp && kp.score > 0.3) {
          const x = (kp.position ? kp.position[0] : kp.x) / 320 * w;
          const y = (kp.position ? kp.position[1] : kp.y) / 240 * h;
          // Larger dots for shoulders and hips (important for posture)
          const part = kp.part || '';
          const radius = (part.includes('Shoulder') || part.includes('Hip')) ? 5 : 3;
          canvasCtx.beginPath();
          canvasCtx.arc(x, y, radius, 0, Math.PI * 2);
          canvasCtx.fill();
        }
      }
      canvasCtx.shadowBlur = 0;

      // Draw shoulder alignment line (prominent — key for posture)
      const lShoulder = bodyKeypoints[5];
      const rShoulder = bodyKeypoints[6];
      if (lShoulder && rShoulder && lShoulder.score > 0.3 && rShoulder.score > 0.3) {
        const lx = (lShoulder.position ? lShoulder.position[0] : lShoulder.x) / 320 * w;
        const ly = (lShoulder.position ? lShoulder.position[1] : lShoulder.y) / 240 * h;
        const rx = (rShoulder.position ? rShoulder.position[0] : rShoulder.x) / 320 * w;
        const ry = (rShoulder.position ? rShoulder.position[1] : rShoulder.y) / 240 * h;

        canvasCtx.strokeStyle = bodyColor;
        canvasCtx.lineWidth = 2;
        canvasCtx.shadowColor = bodyColor;
        canvasCtx.shadowBlur = 10 * pulse;
        canvasCtx.beginPath();
        canvasCtx.moveTo(lx, ly);
        canvasCtx.lineTo(rx, ry);
        canvasCtx.stroke();
        canvasCtx.shadowBlur = 0;
      }
    }

    // ── 7. Scanning line effect ──
    scanLineY += 2 * scanDirection;
    if (scanLineY > h) scanDirection = -1;
    if (scanLineY < 0) scanDirection = 1;

    const gradient = canvasCtx.createLinearGradient(0, scanLineY - 15, 0, scanLineY + 15);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.5, isCapturing ? 'rgba(82, 196, 26, 0.25)' : 'rgba(0, 212, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    canvasCtx.fillStyle = gradient;
    canvasCtx.fillRect(0, scanLineY - 15, w, 30);

    // ── 7. Corner brackets (tech frame effect) ──
    const bracketLen = 20;
    const bracketInset = 8;
    canvasCtx.strokeStyle = mainColor;
    canvasCtx.lineWidth = 2;
    canvasCtx.globalAlpha = 0.6;

    // Top-left
    canvasCtx.beginPath();
    canvasCtx.moveTo(bracketInset, bracketInset + bracketLen);
    canvasCtx.lineTo(bracketInset, bracketInset);
    canvasCtx.lineTo(bracketInset + bracketLen, bracketInset);
    canvasCtx.stroke();
    // Top-right
    canvasCtx.beginPath();
    canvasCtx.moveTo(w - bracketInset - bracketLen, bracketInset);
    canvasCtx.lineTo(w - bracketInset, bracketInset);
    canvasCtx.lineTo(w - bracketInset, bracketInset + bracketLen);
    canvasCtx.stroke();
    // Bottom-left
    canvasCtx.beginPath();
    canvasCtx.moveTo(bracketInset, h - bracketInset - bracketLen);
    canvasCtx.lineTo(bracketInset, h - bracketInset);
    canvasCtx.lineTo(bracketInset + bracketLen, h - bracketInset);
    canvasCtx.stroke();
    // Bottom-right
    canvasCtx.beginPath();
    canvasCtx.moveTo(w - bracketInset - bracketLen, h - bracketInset);
    canvasCtx.lineTo(w - bracketInset, h - bracketInset);
    canvasCtx.lineTo(w - bracketInset, h - bracketInset - bracketLen);
    canvasCtx.stroke();

    canvasCtx.globalAlpha = 1;
  }

  function drawFeaturePath(landmarks, indices, w, h) {
    canvasCtx.beginPath();
    let started = false;
    for (const idx of indices) {
      if (landmarks[idx]) {
        const x = landmarks[idx][0] * w;
        const y = landmarks[idx][1] * h;
        if (!started) {
          canvasCtx.moveTo(x, y);
          started = true;
        } else {
          canvasCtx.lineTo(x, y);
        }
      }
    }
    canvasCtx.stroke();
  }

  function removeOverlay() {
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null;
      videoContainerEl = null;
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

    // Draw full body + face mesh on canvas (green = capturing)
    drawFaceOutline(landmarks, true, event.detail.bodyKeypoints);

    if (!nose || !leftEye || !rightEye || !chin || !forehead) return;

    const eyeMidY = (leftEye[1] + rightEye[1]) / 2;
    const eyeDx = rightEye[0] - leftEye[0];
    const eyeDy = rightEye[1] - leftEye[1];

    // Body keypoint helper
    const bkp = event.detail.bodyKeypoints;
    function bodyXY(index) {
      const kp = bkp && bkp[index];
      if (!kp || (kp.score || 0) < 0.3) return null;
      return {
        x: kp.position ? kp.position[0] : kp.x,
        y: kp.position ? kp.position[1] : kp.y
      };
    }

    const frameData = {
      forwardTilt: nose[1] - eyeMidY,
      lateralTilt: Math.atan2(eyeDy, eyeDx) * (180 / Math.PI),
      faceSize: Math.sqrt(
        Math.pow(forehead[0] - chin[0], 2) +
        Math.pow(forehead[1] - chin[1], 2)
      ),
      screenDistance: Math.sqrt(
        Math.pow(rightEye[0] - leftEye[0], 2) +
        Math.pow(rightEye[1] - leftEye[1], 2)
      ),
      // Body metrics (null if keypoints unavailable)
      shoulderAngle: null,
      shoulderElevation: null,
      trunkLean: null
    };

    // Shoulder angle
    const lS = bodyXY(5);
    const rS = bodyXY(6);
    if (lS && rS) {
      frameData.shoulderAngle = Math.atan2(rS.y - lS.y, rS.x - lS.x) * (180 / Math.PI);

      // Shoulder elevation (ear-to-shoulder distance)
      const lE = bodyXY(3);
      const rE = bodyXY(4);
      if (lE && rE) {
        const leftDist = Math.sqrt(Math.pow(lE.x - lS.x, 2) + Math.pow(lE.y - lS.y, 2));
        const rightDist = Math.sqrt(Math.pow(rE.x - rS.x, 2) + Math.pow(rE.y - rS.y, 2));
        frameData.shoulderElevation = (leftDist + rightDist) / 2;
      }

      // Trunk lean
      const lH = bodyXY(11);
      const rH = bodyXY(12);
      if (lH && rH) {
        const shoulderMidX = (lS.x + rS.x) / 2;
        const hipMidX = (lH.x + rH.x) / 2;
        frameData.trunkLean = shoulderMidX - hipMidX;
      }
    }

    collectedFrames.push(frameData);

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
    const { landmarks, bodyKeypoints } = event.detail;
    drawFaceOutline(landmarks, false, bodyKeypoints); // cyan during countdown
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

    // Body metric baselines (additive — null if body not visible during calibration)
    const bodyFrames = collectedFrames.filter(f => f.shoulderAngle !== null);
    if (bodyFrames.length > 0) {
      avg.shoulderAngle = bodyFrames.reduce((s, f) => s + f.shoulderAngle, 0) / bodyFrames.length;
      const elevFrames = bodyFrames.filter(f => f.shoulderElevation !== null);
      avg.shoulderElevation = elevFrames.length > 0
        ? elevFrames.reduce((s, f) => s + f.shoulderElevation, 0) / elevFrames.length
        : null;
      const leanFrames = bodyFrames.filter(f => f.trunkLean !== null);
      avg.trunkLean = leanFrames.length > 0
        ? leanFrames.reduce((s, f) => s + f.trunkLean, 0) / leanFrames.length
        : null;
    } else {
      avg.shoulderAngle = null;
      avg.shoulderElevation = null;
      avg.trunkLean = null;
    }

    // Save to storage
    chrome.storage.local.set({ postureCalV1: avg });

    // Notify analyzer
    window.dispatchEvent(new CustomEvent('posture-cal:complete', { detail: avg }));

    // Show success with green flash
    updateInstruction('\u2713  Calibration complete!');
    updateStatus('Your ideal posture has been saved.');
    updateProgress(1);

    // Flash the canvas green for success
    if (canvasCtx && canvasEl) {
      canvasCtx.fillStyle = 'rgba(82, 196, 26, 0.25)';
      canvasCtx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    }

    // Turn video container border green
    if (videoContainerEl) {
      videoContainerEl.style.borderColor = '#52c41a';
      videoContainerEl.style.boxShadow = '0 0 30px rgba(82, 196, 26, 0.5)';
    }

    // Close overlay after 2.5 seconds
    setTimeout(() => {
      removeOverlay();

      // Update phase
      window.dispatchEvent(new CustomEvent('posture:status', {
        detail: { phase: 'live', note: 'Calibrated and monitoring', ts: performance.now() }
      }));
    }, 2500);

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
