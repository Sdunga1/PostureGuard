# PostureGuard Extension — Development Plan

> **Branch**: `feature/extension`
> **Owner**: Sarath (extension) | Teammate (health-app on `app/healthapp`)
> **Hackathon**: HackASU March 20-22, 2026

---

## User Flow

```
INSTALL → CALIBRATE → MONITOR → NUDGE → REPORT → HEALTH APP
```

1. **Install**: Load unpacked at `chrome://extensions` → grant camera permission
2. **Calibrate**: Open side panel → click "Calibrate" → sit in normal position → press Space → baseline saved
3. **Monitor**: Extension runs silently — webcam detects face landmarks via Human.js, computes posture angles every frame (~30fps)
4. **Nudge**: Bad posture for **5 seconds** (dev/testing threshold) → subtle corner overlay with Claude-powered coaching message
5. **Session Report**: End session → posture summary with scores, worst periods, time distribution
6. **QR/Link Bridge**: Scan QR or click link → Health App opens with session data pre-loaded → personalized stretches

> **Note**: The 5-second nudge threshold is for rapid testing during development.
> Production value: 30 seconds. Change via `BAD_POSTURE_ALERT_MS` in `posture-analyzer.js`.

---

## Architecture

```
┌─ Chrome Extension ──────────────────────────────────┐
│                                                      │
│  content.js ← injects posture scripts into page      │
│       ↓                                              │
│  posture-core.js ← webcam + Human.js face detection  │
│       ↓                                              │
│  posture-analyzer.js ← angles, scores, sessions      │
│       ↓                        ↓                     │
│  posture-overlay.js     posture-cal.js               │
│  (nudge UI on page)     (baseline calibration)       │
│       ↓                                              │
│  background.js ← Claude API calls + message routing  │
│       ↓                                              │
│  sidepanel.js ← settings, live stats, QR code        │
│       ↓                                              │
│  qr-bridge.js → postureguard.vercel.app/report       │
└──────────────────────────────────────────────────────┘
         ↓ (QR scan / link click)
┌─ Health App (teammate's branch: app/healthapp) ──────┐
│  Dashboard + Claude insights + 3D exercise demos     │
└──────────────────────────────────────────────────────┘
```

---

## Key Constants

| Constant | Dev Value | Production Value | Location |
|----------|-----------|-----------------|----------|
| `BAD_POSTURE_ALERT_MS` | 5000 (5s) | 30000 (30s) | `posture-analyzer.js` |
| `DETECTION_INTERVAL_MS` | 33 (~30fps) | 33 (~30fps) | `posture-core.js` |
| `CLAUDE_RATE_LIMIT_MS` | 120000 (2min) | 120000 (2min) | `background.js` |
| `SCORE_GOOD_THRESHOLD` | 70 | 70 | `posture-analyzer.js` |
| `SCORE_WARNING_THRESHOLD` | 50 | 50 | `posture-analyzer.js` |

---

## Phase 1 — Camera + Face Detection Pipeline

**Goal**: Get webcam running, Human.js loaded, landmarks detected.

### Tasks
- [ ] Download Human.js library (`human.esm.js`) + TensorFlow face models
- [ ] Place in `extension/posture/human/` (models in `human/models/`)
- [ ] Wire up `posture-core.js`:
  - Initialize camera via `getUserMedia()`
  - Load Human.js with face detection config
  - Start detection loop (~30fps, throttled at 33ms)
  - Extract 468 facial landmarks per frame
- [ ] Add camera preview toggle (small floating video for debug)
- [ ] Update `manifest.json`:
  - Add `web_accessible_resources` for Human.js + models
  - Verify content script injection order
- [ ] Update `content.js` to inject posture scripts into page

### Test
```
1. chrome://extensions → Load Unpacked → select extension/
2. Open any webpage
3. Allow camera permission
4. DevTools Console → filter [PostureGuard]
5. Expected: "Face detected, 468 landmarks" logs every ~33ms
```

### Files Touched
- `extension/posture/posture-core.js` (major rewrite)
- `extension/posture/human/human.esm.js` (new — download)
- `extension/posture/human/models/*` (new — download)
- `extension/manifest.json` (update resources)
- `extension/content.js` (update injection)

---

## Phase 2 — Posture Analysis Engine

**Goal**: Turn raw landmarks into posture metrics and scores.

### Tasks
- [ ] Implement `posture-analyzer.js`:
  - Forward head tilt: nose-to-eye distance ratio
  - Lateral tilt: angle between left/right eye landmarks
  - Face size tracking: proxy for screen distance
  - Slouch detection: face-size shrinking over time = leaning forward
- [ ] Apply One-Euro filter (`one-euro-filter.js`) to smooth landmark jitter
- [ ] Scoring system: 0-100 posture score per frame, rolling average
- [ ] Session tracking object:
  ```js
  session = {
    startTime, scores[], alerts[], worstPeriods[],
    avgScore, tiltDistribution, totalDuration
  }
  ```
- [ ] `BAD_POSTURE_ALERT_MS = 5000` — trigger alert after 5s of bad posture
- [ ] Emit events: `posture:score`, `posture:alert`, `posture:session-update`

### Test
```
1. Reload extension
2. Sit up straight → console shows score ~85-100
3. Slouch forward → score drops to ~40-60
4. Tilt head left → lateral tilt metric spikes
5. Hold bad posture 5s → "ALERT triggered" in console
```

### Files Touched
- `extension/posture/posture-analyzer.js` (major rewrite)
- `extension/utils/one-euro-filter.js` (verify integration)

---

## Phase 3 — Calibration Flow

**Goal**: Let user set their "good posture" baseline.

### Tasks
- [ ] Implement `posture-cal.js`:
  - Guided overlay: "Sit up straight and press Space"
  - Capture baseline: nose position, eye angle, face size
  - Store in `chrome.storage.local` as `postureCalibration`
- [ ] Visual feedback during calibration (overlay with instructions + progress)
- [ ] Handle edge cases:
  - No face detected → "Move closer to camera"
  - Multiple faces → "Only one person please"
  - Poor lighting → "Improve lighting"
- [ ] Recalibrate option (reset baseline)
- [ ] Auto-detect when user leaves (no face for 10s → pause monitoring)

### Test
```
1. Open side panel → click "Calibrate"
2. Overlay appears with instructions
3. Sit straight → press Space → "Calibration saved!"
4. Slouch → scores are relative to YOUR baseline (not absolute)
5. Close tab, reopen → calibration persists
```

### Files Touched
- `extension/posture/posture-cal.js` (major rewrite)
- `extension/posture/posture-overlay.js` (calibration UI)

---

## Phase 4 — Real-time Nudge Overlay

**Goal**: Subtle on-page notification when posture degrades.

### Tasks
- [ ] Implement `posture-overlay.js`:
  - Small corner indicator (bottom-right, non-intrusive)
  - Score-based coloring: Green (70+) → Yellow (50-70) → Red (<50)
  - Nudge message area (text from Claude or fallback)
- [ ] Nudge trigger logic:
  - Bad posture sustained 5s → show nudge
  - Posture improves → auto-fade after 3s
  - Click to dismiss
- [ ] Fallback messages (when Claude API unavailable):
  - "Sit up straight — your head is tilting forward"
  - "Shoulders are uneven — try rolling them back"
- [ ] Overlay styles:
  - Glass-morphism design (backdrop-blur, subtle)
  - Dark/light mode aware
  - Never blocks page content

### Test
```
1. Reload extension, open any page
2. Maintain good posture → small green dot in corner
3. Slouch for 5s → nudge slides in with message
4. Sit up straight → nudge fades out
5. Click nudge → dismisses immediately
```

### Files Touched
- `extension/posture/posture-overlay.js` (major rewrite)
- `extension/posture/posture-overlay.css` (major rewrite)

---

## Phase 5 — Claude API Integration

**Goal**: Personalized coaching messages powered by Claude.

### Tasks
- [ ] `background.js` — Claude API handler:
  - HTTP POST to `https://api.anthropic.com/v1/messages`
  - API key from `chrome.storage.local` (user enters in settings)
  - Model: `claude-sonnet-4-20250514` (fast + cheap)
- [ ] System prompt engineering:
  ```
  You are a posture coach embedded in a Chrome extension.
  Given posture metrics, provide a brief (1-2 sentence) coaching nudge.
  Be specific about what's wrong and suggest a micro-correction.
  Never diagnose medical conditions. Be encouraging, not alarming.
  ```
- [ ] Message types:
  - **Nudge**: Real-time 1-2 sentence coaching (on alert trigger)
  - **Session summary**: End-of-session analysis with exercise recommendations
- [ ] Rate limiting: Max 1 Claude call per 2 minutes
- [ ] Fallback: If API fails/no key → use pre-written fallback messages
- [ ] Message passing: `background.js` ↔ `content.js` via `chrome.runtime.sendMessage`

### Test
```
1. Enter API key in side panel settings
2. Slouch for 5s → nudge appears with Claude-generated text
3. Check console: API call logged with response
4. Rapid slouching → only 1 API call per 2 min (rate limited)
5. Remove API key → fallback messages appear instead
```

### Files Touched
- `extension/background.js` (major rewrite)
- `extension/posture/posture-analyzer.js` (add message dispatch)

---

## Phase 6 — Side Panel UI

**Goal**: Control center — settings, live stats, session history.

### Tasks
- [ ] `sidepanel.html` layout:
  - Header: PostureGuard logo + tagline
  - Status: Current score (live), session duration, alert count
  - Controls: Start/Stop monitoring, Calibrate button
  - Settings: API key input, nudge threshold toggle, sound on/off
  - Session report: Score chart, worst periods, Claude summary
  - QR code area (Phase 7)
- [ ] `sidepanel.js`:
  - Load settings from `chrome.storage.local`
  - Listen to `chrome.storage.onChanged` for live updates
  - Display live score (updated via messages from content script)
  - Handle button clicks → send messages to background/content
- [ ] `sidepanel.css`:
  - Clean, modern design
  - Score visualization (circular gauge or bar)
  - Responsive within side panel width (~350px)

### Test
```
1. Right-click extension icon → "Open side panel"
2. Live score updates as you move
3. Toggle monitoring on/off → detection starts/stops
4. Enter API key → saved to storage
5. End session → summary appears with stats
```

### Files Touched
- `extension/sidepanel/sidepanel.html` (major rewrite)
- `extension/sidepanel/sidepanel.js` (major rewrite)
- `extension/sidepanel/sidepanel.css` (major rewrite)

---

## Phase 7 — Session Report + QR Bridge

**Goal**: Package session data and hand off to Health App.

### Tasks
- [ ] Session report JSON structure:
  ```json
  {
    "version": "1.0",
    "sessionId": "uuid",
    "timestamp": "ISO-8601",
    "duration": 14400,
    "avgScore": 72,
    "scoreTimeline": [[0, 85], [60, 72], ...],
    "alerts": [{ "time": 300, "type": "forward_tilt", "duration": 45 }],
    "worstPeriods": [{ "start": 7200, "end": 7500, "avgScore": 38 }],
    "tiltDistribution": { "forward": 0.4, "left": 0.15, "right": 0.05, "good": 0.4 },
    "recommendations": ["chin_tucks", "shoulder_rolls"]
  }
  ```
- [ ] `qr-bridge.js`:
  - Encode report → Base64 → URL: `postureguard.vercel.app/report?data=<base64>`
  - For large payloads: truncate timeline to key points
  - Generate QR code using `qrcode-generator` library
- [ ] Add QR code library to `extension/lib/`
- [ ] Side panel: "View Report" button → generates QR + copyable link
- [ ] Copy-to-clipboard fallback

### Test
```
1. Run a session for a few minutes
2. Click "View Report" in side panel
3. QR code appears
4. Scan with phone → health app loads with YOUR data
5. Click "Copy Link" → paste in browser → same result
```

### Files Touched
- `extension/utils/qr-bridge.js` (rewrite)
- `extension/lib/qrcode-generator.js` (new — add library)
- `extension/sidepanel/sidepanel.js` (add report UI)

---

## Assets Needed

| Asset | Source | Size | Status |
|-------|--------|------|--------|
| `human.esm.js` | [vladmandic/human](https://github.com/vladmandic/human) | ~1.5MB | Needed |
| Face detection models | vladmandic/human/models | ~3-4MB | Needed |
| Extension icons (16/32/48/128) | Create or generate | ~10KB | Needed |
| QR code library | qrcode-generator | ~30KB | Needed |

---

## Storage Keys (chrome.storage.local)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `monitoringEnabled` | boolean | false | Is posture detection active |
| `postureCalibration` | object | null | Baseline posture data |
| `claudeApiKey` | string | '' | User's Anthropic API key |
| `nudgeThresholdMs` | number | 5000 | Bad posture duration before nudge |
| `soundEnabled` | boolean | false | Play chime on nudge |
| `sessionHistory` | array | [] | Past session summaries |
| `currentSession` | object | null | Active session data |

---

## Testing Checklist

```
For each phase, before moving to the next:
1. chrome://extensions → Reload extension (🔄 button)
2. Open any webpage
3. Open DevTools → Console → filter [PostureGuard]
4. Verify no errors in console
5. Verify expected behavior (see phase-specific tests above)
6. Test edge cases: no camera, deny permission, multiple tabs
```

---

## Deployment for Demo

- **Extension**: GitHub repo + "Load Unpacked" instructions
- **Health App**: `postureguard.vercel.app` (teammate deploys)
- **Demo video**: Record full flow — install → calibrate → detect → nudge → QR → health app
- **Live demo**: Turn it on during the pitch — judges watch their own posture analyzed

---

## Timeline (Hackathon Weekend)

| When | What |
|------|------|
| Friday evening | Phase 1 + 2 (camera + analysis — core pipeline) |
| Saturday morning | Phase 3 + 4 (calibration + nudge overlay) |
| Saturday afternoon | Phase 5 (Claude API integration) |
| Saturday evening | Phase 6 (side panel UI polish) |
| Sunday morning | Phase 7 (QR bridge + health app integration) |
| Sunday afternoon | Polish, demo video, presentation prep |
