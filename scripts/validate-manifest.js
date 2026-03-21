#!/usr/bin/env node
'use strict';

/**
 * Validates extension/manifest.json:
 * - Valid JSON syntax
 * - Required MV3 fields present
 * - No duplicate permissions
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'extension', 'manifest.json');

const REQUIRED_FIELDS = ['manifest_version', 'name', 'version', 'permissions'];

let exitCode = 0;

function fail(msg) {
  console.error(`\x1b[31m✗ MANIFEST: ${msg}\x1b[0m`);
  exitCode = 1;
}

function pass(msg) {
  console.log(`\x1b[32m✓ MANIFEST: ${msg}\x1b[0m`);
}

// 1. File exists
if (!fs.existsSync(MANIFEST_PATH)) {
  fail('extension/manifest.json not found');
  process.exit(1);
}

// 2. Valid JSON
let manifest;
try {
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  manifest = JSON.parse(raw);
  pass('Valid JSON');
} catch (err) {
  fail(`Invalid JSON — ${err.message}`);
  process.exit(1);
}

// 3. Manifest V3
if (manifest.manifest_version !== 3) {
  fail(`Expected manifest_version 3, got ${manifest.manifest_version}`);
} else {
  pass('Manifest V3');
}

// 4. Required fields
for (const field of REQUIRED_FIELDS) {
  if (!(field in manifest)) {
    fail(`Missing required field: "${field}"`);
  }
}

// 5. No duplicate permissions
if (Array.isArray(manifest.permissions)) {
  const dupes = manifest.permissions.filter((p, i, arr) => arr.indexOf(p) !== i);
  if (dupes.length > 0) {
    fail(`Duplicate permissions: ${dupes.join(', ')}`);
  } else {
    pass(`${manifest.permissions.length} permissions, no duplicates`);
  }
}

// 6. Service worker exists (if declared)
if (manifest.background?.service_worker) {
  const swPath = path.join(__dirname, '..', 'extension', manifest.background.service_worker);
  if (!fs.existsSync(swPath)) {
    fail(`Service worker file missing: ${manifest.background.service_worker}`);
  } else {
    pass(`Service worker exists: ${manifest.background.service_worker}`);
  }
}

if (exitCode === 0) {
  console.log('\n\x1b[32m✓ Manifest validation passed\x1b[0m\n');
} else {
  console.error('\n\x1b[31m✗ Manifest validation failed\x1b[0m\n');
}

process.exit(exitCode);
