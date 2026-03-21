# PostureGuard — Complete Development Plan

## Context

**HackASU** (March 20–22, 2026) — 48-hour hackathon at ASU, hosted by Claude Builder Club. Track 1: Biology & Physical Health. Must use Claude/Anthropic tools meaningfully. Submission requires: YouTube video, public GitHub repo, deployed link, check-in 2/3 days.

**PostureGuard** — A Chrome extension that uses your webcam to detect bad posture in real time and uses Claude API to coach you back to health. Companion health app deployed on Vercel shows session reports, Claude-generated exercise recommendations, and visual exercise demos.

**Team split**: Sarath → Chrome Extension, Teammate → Health App. Both live in the same repo.

---

## Step 0: Project Setup

### 0.1 — Folder Structure (Monorepo)

```
PostureGuard/
├── .gitignore
├── README.md
├── LICENSE
├── CLAUDE.md                          # Claude Code guidelines for this project
│
├── extension/                         # Chrome Extension (Sarath)
│   ├── manifest.json                  # MV3 config
│   ├── background.js                  # Service worker — Claude API calls, message routing
│   ├── content.js                     # Lightweight page interaction (overlay injection)
│   │
│   ├── posture/                       # Core posture detection system
│   │   ├── posture-core.js            # Human.js init, webcam, detection loop, landmark processing
│   │   ├── posture-analyzer.js        # Angle calculations, posture scoring, threshold logic
│   │   ├── posture-overlay.js         # Visual feedback (status indicator, alerts, debug HUD)
│   │   ├── posture-overlay.css        # Overlay styles
│   │   └── posture-cal.js             # Calibration flow (baseline sitting position)
│   │
│   ├── sidepanel/                     # Extension UI
│   │   ├── sidepanel.html
│   │   ├── sidepanel.js
│   │   └── sidepanel.css
│   │
│   ├── lib/                           # Vendored libraries
│   │   └── human/                     # Human.js + TF models (vendored, not npm)
│   │       ├── human.esm.js
│   │       └── models/
│   │
│   ├── utils/
│   │   ├── debug-logger.js            # Centralized logging
│   │   ├── one-euro-filter.js         # Signal smoothing
│   │   └── qr-bridge.js              # QR code generation + session data encoding
│   │
│   └── icons/
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-48.png
│       └── icon-128.png
│
├── health-app/                        # Next.js Web App (Teammate)
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   │
│   ├── app/                           # Next.js App Router
│   │   ├── layout.js
│   │   ├── page.js                    # Landing / marketing page
│   │   ├── session/
│   │   │   └── page.js                # Session report dashboard (receives QR data)
│   │   └── api/
│   │       └── analyze/
│   │           └── route.js           # Claude API → exercise recommendations
│   │
│   ├── components/
│   │   ├── PostureDashboard.jsx       # Charts showing session metrics
│   │   ├── ExerciseCard.jsx           # Individual exercise with demo
│   │   ├── SessionSummary.jsx         # Claude-generated insights
│   │   └── PostureHeatmap.jsx         # Visual timeline of posture quality
│   │
│   ├── lib/
│   │   ├── claude.js                  # Claude API wrapper
│   │   └── decode-session.js          # Decode base64 session data from URL
│   │
│   └── public/
│       └── animations/                # Lottie JSON files for exercises
│
└── resources/                         # (gitignored) Internal reference materials
```

---

## Step 1: Chrome Extension — Posture Detection Core

**Owner: Sarath** | Priority: HIGHEST | This is the demo centerpiece.

### 1.1 — Extension Scaffold

**Files:** `extension/manifest.json`, `extension/background.js`, `extension/content.js`

- Create MV3 manifest with permissions: `sidePanel`, `storage`, `tabs`
- `host_permissions`: `<all_urls>` (overlay works on any page)
- Content scripts load posture modules at `document_idle`
- `web_accessible_resources` for Human.js models + overlay CSS
- Background service worker handles Claude API calls and message routing

### 1.2 — Human.js Integration (`posture/posture-core.js`)

**Pattern:** Non-blocking detection loop

1. Create hidden `<video>` element, request camera (`320×240`, `facingMode: 'user'`)
2. Load Human.js with config:
   - `backend: 'webgl'` (GPU-accelerated)
   - Face detection enabled (`maxDetected: 1`)
   - Body/hand detection disabled (performance)
3. Detection loop using `requestVideoFrameCallback` (with `requestAnimationFrame` fallback)
4. Guard against overlapping detects (`detectInProgress` flag)
5. Dispatch `posture:frame` custom events with landmark data
6. Dispatch `posture:status` events for phase changes (`loading → ready → calibrating → live → error`)
7. Throttle dispatches to ~30fps (`POINT_THROTTLE_MS = 33`)

**Key landmarks to extract (from Human.js 468-point face mesh):**
- Nose tip (index 1) — forward head position
- Left/right eye centers (indices 33, 362) — head tilt detection
- Chin (index 152) — vertical head angle
- Forehead (index 10) — face-to-camera distance approximation

### 1.3 — Posture Analysis (`posture/posture-analyzer.js`)

**Core metrics calculated every frame:**

| Metric | How to Calculate | Bad Threshold |
|--------|-----------------|---------------|
| Forward head tilt | Nose-to-eye-line distance ratio vs baseline | >15% deviation for 30s |
| Lateral head tilt | Angle between eye-line and horizontal | >10° for 30s |
| Slouch (lean forward) | Face bounding box size vs baseline (closer = larger) | >20% larger for 30s |
| Screen distance | Inter-pupillary distance ratio (shrinks with distance) | <70% of baseline |

**Scoring system:**
- Each metric: 0 (perfect) to 100 (worst)
- Overall posture score = weighted average
- Rolling window: evaluate over last 30 seconds (not per-frame)
- Apply One-Euro filter to raw landmarks before calculating angles

**Session tracking:**
- Accumulate metrics over session: `{ timestamps[], scores[], alerts[], worstPeriods[] }`
- Store in `chrome.storage.local` under key `currentSession`

### 1.4 — Calibration (`posture/posture-cal.js`)

**Flow:** User triggers from side panel → fullscreen overlay → "Sit in your normal good posture" → capture 60 frames → average → save baseline

1. Show semi-transparent overlay with instructions
2. 3-second countdown
3. Capture 60 frames of landmark positions → compute baseline ratios
4. Save to `chrome.storage.local` as `postureCalV1`
5. Dispatch `posture-cal:complete` event
6. Calibration required before first use; re-calibrate anytime via side panel

### 1.5 — Visual Overlay (`posture/posture-overlay.js`)

**Approach:** Minimal, non-intrusive — NOT a full-screen HUD

- Small fixed-position indicator (bottom-right corner)
- Color-coded: green (good) → yellow (warning) → red (bad posture)
- When posture is bad for 30+ seconds: gentle slide-in notification with Claude's tip
- All elements use `pointer-events: none` and `z-index: 2147483647`
- Debug HUD toggle (Alt+D): shows raw metrics, FPS, landmark visualization
- CSS injected via `chrome.runtime.getURL()` for web-accessible stylesheet

### 1.6 — Side Panel UI (`sidepanel/`)

**Controls:**
- Toggle: Enable/disable posture monitoring
- Button: Calibrate sitting position
- Slider: Alert sensitivity (how long bad posture before alert: 15s–120s)
- Status: Current posture score (live updating)
- Session stats: Duration, average score, alerts triggered
- Button: Generate session report (QR code for health app)
- Toggle: Debug mode

**Pattern:** Settings stored in `chrome.storage.local`, all components listen via `storage.onChanged`

### 1.7 — Claude API Integration (`background.js`)

**Two integration points:**

1. **Real-time nudges** (triggered when bad posture detected for threshold duration):
   - Send current metrics to Claude API
   - Prompt: "Given these posture metrics [JSON], provide a brief, encouraging 1-sentence tip"
   - Cache recent tips to avoid repetition
   - Display in overlay notification

2. **Session report** (triggered by user from side panel):
   - Compile full session data: duration, metric averages, worst periods, alert count
   - Send to Claude API with comprehensive prompt
   - Claude returns: summary, priority issues, personalized exercise recommendations
   - Encode report as base64 → generate QR code URL → display in side panel

**Claude API call pattern:**
```
POST https://api.anthropic.com/v1/messages
Headers: x-api-key, anthropic-version, content-type
Body: { model: "claude-sonnet-4-5-20241022", messages: [...], max_tokens: 500 }
```

### 1.8 — QR Code Bridge (`utils/qr-bridge.js`)

- Use `qrcode-generator` library (lightweight, no dependencies)
- Encode session report as: `https://postureguard.vercel.app/session?data=<base64>`
- If payload > 2KB, truncate to essential metrics (averages + top 3 worst periods)
- Display QR in side panel for phone scanning

---

## Step 2: Health App (Next.js on Vercel)

**Owner: Teammate** | Priority: HIGH

### 2.1 — Project Setup

```bash
cd health-app
npx create-next-app@latest . --tailwind --app --src=false
npm install recharts lottie-react
```

- Deploy via Vercel GitHub integration (push = deploy)
- Domain: `postureguard.vercel.app`

### 2.2 — Session Page (`app/session/page.js`)

- Read `data` query param → decode base64 → parse JSON
- If no data: show demo/sample session
- Render: `PostureDashboard`, `SessionSummary`, exercise recommendations

### 2.3 — Dashboard Components

**PostureDashboard.jsx** — Recharts line charts:
- Posture score over time (main chart)
- Individual metrics (head tilt, slouch, screen distance) as smaller charts
- Color-coded zones (green/yellow/red bands)

**SessionSummary.jsx** — Claude's analysis:
- Overall assessment text
- Key findings (bullet points)
- Time-based patterns ("You slouch most between 2–4pm")

**ExerciseCard.jsx** — Exercise recommendations:
- Exercise name + description
- Lottie animation or embedded YouTube video
- Sets/reps/duration
- Which posture issue it addresses

### 2.4 — Claude API Route (`app/api/analyze/route.js`)

- Server-side Claude API call (API key stays server-side via `ANTHROPIC_API_KEY` env var)
- Receives session metrics JSON
- Returns structured exercise recommendations
- This allows the health app to generate fresh analysis even without extension data

### 2.5 — Exercise Demo Content

**MVP approach:** Lottie animations from free libraries + YouTube embeds
- Chin tucks, neck stretches, shoulder rolls, cat-cow, wall angels
- Store Lottie JSON files in `public/animations/`
- Can upgrade to 3D (Three.js/Mixamo) later if time permits — teammate's call

---

## Step 3: Integration & Polish

### 3.1 — Shared Data Contract

Both extension and health app agree on this session data schema:

```json
{
  "version": 1,
  "sessionId": "uuid",
  "startTime": "ISO-8601",
  "endTime": "ISO-8601",
  "duration": 3600,
  "metrics": {
    "avgPostureScore": 72,
    "avgHeadTilt": 8.5,
    "avgSlouchAngle": 12.3,
    "avgScreenDistance": 85,
    "alertCount": 5,
    "worstPeriods": [
      { "start": 1200, "end": 1500, "score": 35, "issue": "forward_lean" }
    ]
  },
  "claudeAnalysis": {
    "summary": "...",
    "recommendations": [
      { "exercise": "chin_tucks", "reason": "...", "duration": "2min", "priority": 1 }
    ]
  }
}
```

### 3.2 — README.md

Professional README with:
- One-line pitch
- Problem statement (WHO stat: 1.7B affected)
- How it works (with diagram)
- Screenshots/GIFs
- Installation instructions (extension: load unpacked, health app: visit URL)
- Tech stack
- Privacy statement (camera never leaves device, only angles/metrics sent to Claude)
- Team members

### 3.3 — CLAUDE.md

Project guidelines for Claude Code:
- Coding style (2-space indent, semicolons, `'use strict'` IIFEs for content scripts)
- Naming: `camelCase` identifiers, `UPPER_SNAKE_CASE` for config constants
- Module pattern: each file handles ONE concern
- Testing: load unpacked in Chrome, use DevTools console
- Commit style: `feat:`, `fix:`, `refactor:` prefixes

---

## Step 4: Demo & Submission Prep

### 4.1 — Demo Script (for YouTube video + live judging)

1. Open any website in Chrome
2. Open PostureGuard side panel → show clean UI
3. Calibrate → sit up straight → green indicator
4. Deliberately slouch → watch it turn yellow → red → Claude nudge appears
5. Show side panel: live posture score updating
6. Generate session report → QR code appears
7. Scan with phone → health app loads with real session data
8. Show dashboard: charts, Claude analysis, exercise recommendations
9. Show an exercise demo (Lottie animation)

### 4.2 — Submission Checklist

- [ ] Public GitHub repo with clear README
- [ ] YouTube demo video (2–3 minutes)
- [ ] Deployed health app link (Vercel)
- [ ] Extension install instructions in README
- [ ] Privacy & ethics section in README

---

## Build Order (Priority Sequence)

| Order | Task | Owner | Est. Hours | Blocks |
|-------|------|-------|-----------|--------|
| 1 | Project setup (.gitignore, folder structure, manifest, CLAUDE.md) | Sarath | 1h | Nothing |
| 2 | Human.js webcam pipeline + detection loop | Sarath | 3h | Step 1 |
| 3 | Health app scaffold + Vercel deploy | Teammate | 2h | Nothing |
| 4 | Posture analyzer (angle math + scoring) | Sarath | 3h | Step 2 |
| 5 | Dashboard UI + Recharts | Teammate | 3h | Step 3 |
| 6 | Calibration flow | Sarath | 2h | Step 4 |
| 7 | Visual overlay (indicator + alerts) | Sarath | 2h | Step 4 |
| 8 | Side panel UI | Sarath | 2h | Step 6,7 |
| 9 | Claude API integration (nudges + reports) | Sarath | 3h | Step 8 |
| 10 | Exercise recommendations + demos | Teammate | 3h | Step 5 |
| 11 | QR code bridge (extension ↔ health app) | Both | 2h | Step 9,10 |
| 12 | Claude API route in health app | Teammate | 2h | Step 10 |
| 13 | Polish, README, demo video | Both | 3h | Step 11,12 |

**Critical path:** Steps 1→2→4→6→7→8→9→11→13 (Sarath, ~21h)
**Parallel path:** Steps 3→5→10→12→11→13 (Teammate, ~15h)

---

## Verification & Testing

1. **Extension loads**: `chrome://extensions` → Developer Mode → Load unpacked → no errors in console
2. **Webcam activates**: Camera permission prompt → video feed captured (check debug HUD with Alt+D)
3. **Landmarks detected**: Debug HUD shows face landmarks, FPS counter
4. **Posture scoring works**: Sit straight = high score, slouch = low score, values update in side panel
5. **Alerts trigger**: Maintain bad posture for threshold → overlay notification appears
6. **Claude nudges**: Alert contains Claude-generated personalized tip (check network tab for API call)
7. **Session report**: Click "Generate Report" → QR code appears in side panel
8. **QR → Health app**: Scan QR → `postureguard.vercel.app/session?data=...` loads → dashboard renders with correct data
9. **Health app charts**: Recharts renders posture timeline, metrics display correctly
10. **Exercise demos**: Lottie animations play, exercise cards show relevant recommendations
