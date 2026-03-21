# PostureGuard — Claude Code Guidelines

## Project Overview
Chrome extension + Next.js health app for real-time posture detection and coaching via Claude API.

## Repository Structure
- `extension/` — Chrome Extension (Manifest V3)
- `health-app/` — Next.js web app deployed on Vercel

## Coding Style

### Extension (Vanilla JS)
- Two-space indentation, semicolons required
- `'use strict';` IIFE wrappers for content scripts
- `const`/`let` only — no `var`
- `camelCase` for identifiers, `UPPER_SNAKE_CASE` for config constants
- Each file handles ONE concern
- Route logging through `utils/debug-logger.js`

### Health App (Next.js)
- Follow Next.js App Router conventions
- Components in `components/`, utilities in `lib/`
- Use Tailwind CSS for styling

## Key Patterns
- **Chrome Storage as state**: All settings in `chrome.storage.local`, components sync via `storage.onChanged`
- **Custom events for IPC**: Content scripts communicate via `window.dispatchEvent(new CustomEvent(...))`
- **Non-blocking detection**: Always guard with `detectInProgress` flag, never block on `human.detect()`
- **Privacy-first**: Camera processed locally, only posture metrics (angles/scores) sent to Claude API

## Testing
- Extension: `chrome://extensions` → Developer Mode → Load unpacked → select `extension/` folder
- Health app: `cd health-app && npm run dev`
- Check DevTools console for `[PostureGuard]` prefixed logs

## Commit Style
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code restructure
- `docs:` documentation only
- `style:` formatting, no logic change
