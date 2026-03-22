'use strict';

// ── PostureGuard URL Config ──────────────────────────────────────────────────
// Toggle this single flag to switch between local dev and production.
// Set to true when testing locally, false before pushing to main.

const USE_LOCALHOST = true;

const HEALTH_APP_URL = USE_LOCALHOST
  ? 'http://localhost:3000'
  : 'https://posture-guard-hackasu.vercel.app';
