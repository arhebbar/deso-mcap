#!/usr/bin/env node
/**
 * Installs a post-commit hook that runs "git push origin main" after every commit.
 * Run once: npm run setup:auto-push
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const hooksDir = resolve(repoRoot, '.git', 'hooks');
const hookPath = resolve(hooksDir, 'post-commit');

const hookContent = `#!/bin/sh
# Auto-push to origin main after every commit (installed by npm run setup:auto-push)
git push origin main
`;

if (!existsSync(resolve(repoRoot, '.git'))) {
  console.error('Not a git repository.');
  process.exit(1);
}

mkdirSync(hooksDir, { recursive: true });
writeFileSync(hookPath, hookContent, 'utf8');
// Make executable on Unix; on Windows Git will still run it
try {
  const { chmodSync } = await import('fs');
  chmodSync(hookPath, 0o755);
} catch {
  // ignore on Windows if chmod not needed
}
console.log('Installed post-commit hook:', hookPath);
console.log('After every "git commit", "git push origin main" will run automatically.');
