#!/usr/bin/env node
'use strict';

/**
 * Checks JavaScript syntax for all extension .js files
 * using Node's built-in parser (no dependencies).
 *
 * Usage:
 *   node scripts/check-syntax.js               (check all extension JS files)
 *   node scripts/check-syntax.js file1.js ...   (check specific files)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Directories to skip (vendor libs, downloaded models)
const SKIP_DIRS = ['extension/posture/human', 'extension/lib', 'extension/vendor'];

function getAllJsFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(path.join(__dirname, '..'), fullPath);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.some((skip) => relPath.startsWith(skip))) {
        continue;
      }
      results.push(...getAllJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

// Determine files to check
let files;
if (process.argv.length > 2) {
  // Specific files passed as arguments
  files = process.argv.slice(2).filter((f) => f.endsWith('.js'));
} else {
  // All extension JS files
  const extDir = path.join(__dirname, '..', 'extension');
  if (!fs.existsSync(extDir)) {
    console.log('\x1b[33m⚠ extension/ directory not found, skipping syntax check\x1b[0m');
    process.exit(0);
  }
  files = getAllJsFiles(extDir);
}

if (files.length === 0) {
  console.log('\x1b[33m⚠ No JS files to check\x1b[0m');
  process.exit(0);
}

let failed = 0;
let passed = 0;

for (const file of files) {
  try {
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
    passed++;
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : 'Unknown error';
    const relPath = path.relative(process.cwd(), file);
    console.error(`\x1b[31m✗ ${relPath}\x1b[0m`);
    console.error(`  ${stderr.trim()}\n`);
    failed++;
  }
}

console.log(`\nSyntax check: ${passed} passed, ${failed} failed (${files.length} total)\n`);

if (failed > 0) {
  console.error('\x1b[31m✗ Syntax check failed\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32m✓ All syntax checks passed\x1b[0m\n');
}
