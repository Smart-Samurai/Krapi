#!/usr/bin/env node

/**
 * Smart better-sqlite3 Rebuild Script
 * 
 * Only rebuilds better-sqlite3 if:
 * - The binary doesn't exist
 * - Node version changed
 * - Platform changed
 * - better-sqlite3 version changed
 * 
 * This significantly speeds up npm install during test runs.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BETTER_SQLITE3_PATH = path.join(__dirname, '..', 'node_modules', 'better-sqlite3');
const BINARY_PATH = path.join(BETTER_SQLITE3_PATH, 'build', 'Release', 'better_sqlite3.node');
const CACHE_FILE = path.join(__dirname, '..', '.sqlite-rebuild-cache.json');

function getNodeVersion() {
  return process.version;
}

function getPlatform() {
  return `${os.platform()}-${os.arch()}`;
}

function getBetterSqlite3Version() {
  try {
    const packageJson = path.join(BETTER_SQLITE3_PATH, 'package.json');
    if (fs.existsSync(packageJson)) {
      const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
      return pkg.version;
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
}

function binaryExists() {
  return fs.existsSync(BINARY_PATH);
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch (error) {
    // Ignore errors, will rebuild
  }
  return null;
}

function saveCache(cache) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    // Ignore errors
  }
}

function needsRebuild() {
  // Check if binary exists
  if (!binaryExists()) {
    console.log('📦 better-sqlite3 binary not found, rebuilding...');
    return true;
  }

  // Load cache
  const cache = loadCache();
  if (!cache) {
    console.log('📦 No rebuild cache found, rebuilding to be safe...');
    return true;
  }

  // Check node version
  const currentNodeVersion = getNodeVersion();
  if (cache.nodeVersion !== currentNodeVersion) {
    console.log(`📦 Node version changed (${cache.nodeVersion} → ${currentNodeVersion}), rebuilding...`);
    return true;
  }

  // Check platform
  const currentPlatform = getPlatform();
  if (cache.platform !== currentPlatform) {
    console.log(`📦 Platform changed (${cache.platform} → ${currentPlatform}), rebuilding...`);
    return true;
  }

  // Check better-sqlite3 version
  const currentVersion = getBetterSqlite3Version();
  if (currentVersion && cache.betterSqlite3Version !== currentVersion) {
    console.log(`📦 better-sqlite3 version changed (${cache.betterSqlite3Version} → ${currentVersion}), rebuilding...`);
    return true;
  }

  // All checks passed, no rebuild needed
  console.log('✅ better-sqlite3 binary is up to date, skipping rebuild');
  return false;
}

function rebuild() {
  try {
    console.log('🔨 Rebuilding better-sqlite3...');
    execSync('npm rebuild better-sqlite3', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    
    // Save cache after successful rebuild
    const cache = {
      nodeVersion: getNodeVersion(),
      platform: getPlatform(),
      betterSqlite3Version: getBetterSqlite3Version(),
      rebuiltAt: new Date().toISOString(),
    };
    saveCache(cache);
    
    console.log('✅ better-sqlite3 rebuild complete');
    return true;
  } catch (error) {
    console.error('⚠️  better-sqlite3 rebuild failed, but continuing...');
    console.error(error.message);
    // Don't throw - allow install to continue
    return false;
  }
}

// Main execution
if (needsRebuild()) {
  rebuild();
} else {
  // Update cache timestamp even if we didn't rebuild
  const cache = loadCache();
  if (cache) {
    cache.lastChecked = new Date().toISOString();
    saveCache(cache);
  }
}









