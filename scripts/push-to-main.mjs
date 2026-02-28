#!/usr/bin/env node
/**
 * Add all changes, commit with a message, and push to origin main.
 * Usage: node scripts/push-to-main.mjs [commit message]
 * If no message, uses "chore: sync to main"
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const repoRoot = resolve(import.meta.dirname, '..');
const msg = process.argv[2] || 'chore: sync to main';

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: repoRoot, ...opts });
  } catch (e) {
    if (e.status !== undefined) throw e;
    throw new Error(e.message);
  }
}

function hasChanges() {
  const status = run('git status --porcelain');
  return status.trim().length > 0;
}

if (!existsSync(resolve(repoRoot, '.git'))) {
  console.error('Not a git repo');
  process.exit(1);
}

if (!hasChanges()) {
  console.log('No changes to commit.');
  process.exit(0);
}

run('git add -A');
execSync('git', ['commit', '-m', msg], { encoding: 'utf8', cwd: repoRoot });
run('git push origin main');
console.log('Pushed to origin main.');
