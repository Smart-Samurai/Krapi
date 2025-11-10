#!/usr/bin/env node

/**
 * Cross-platform script to check for outdated packages
 * Always exits successfully (exit code 0) even if packages are outdated
 */

const { execSync } = require('child_process');

try {
  execSync('npm outdated', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  // npm outdated exits with non-zero when packages are outdated
  // This is expected behavior, so we ignore the error
  // and exit successfully
}

process.exit(0);

