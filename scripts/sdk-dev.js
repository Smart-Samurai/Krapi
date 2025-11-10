#!/usr/bin/env node

/**
 * SDK Development Helper Script
 * 
 * Allows switching between npm package and local SDK for development/debugging.
 * 
 * Usage:
 *   node scripts/sdk-dev.js link    - Use local SDK (file:../packages/krapi-sdk)
 *   node scripts/sdk-dev.js unlink  - Use npm package (@smartsamurai/krapi-sdk)
 *   node scripts/sdk-dev.js status  - Check current mode
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_PKG = path.join(ROOT_DIR, 'backend-server', 'package.json');
const FRONTEND_PKG = path.join(ROOT_DIR, 'frontend-manager', 'package.json');
const TEST_SUITE_PKG = path.join(ROOT_DIR, 'KRAPI-COMPREHENSIVE-TEST-SUITE', 'package.json');
const MCP_PKG = path.join(ROOT_DIR, 'packages', 'krapi-mcp-server', 'package.json');

const SDK_PACKAGE_NAME = '@smartsamurai/krapi-sdk';
const LOCAL_SDK_PATH = 'file:../packages/krapi-sdk';
const NPM_VERSION = '^0.1.0';

function readPackageJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    process.exit(1);
  }
}

function writePackageJson(filePath, pkg) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    process.exit(1);
  }
}

function updateDependency(pkg, useLocal) {
  if (!pkg.dependencies || !pkg.dependencies[SDK_PACKAGE_NAME]) {
    return false;
  }

  const currentValue = pkg.dependencies[SDK_PACKAGE_NAME];
  const newValue = useLocal ? LOCAL_SDK_PATH : NPM_VERSION;
  
  if (currentValue === newValue) {
    return false; // No change needed
  }

  pkg.dependencies[SDK_PACKAGE_NAME] = newValue;
  return true;
}

function linkSDK() {
  console.log('🔗 Linking local SDK for development...\n');
  
  let changed = false;
  const packages = [
    { path: BACKEND_PKG, name: 'backend-server' },
    { path: FRONTEND_PKG, name: 'frontend-manager' },
    { path: TEST_SUITE_PKG, name: 'test-suite' },
    { path: MCP_PKG, name: 'mcp-server' },
  ];

  for (const pkg of packages) {
    if (!fs.existsSync(pkg.path)) {
      console.log(`⏭️  Skipping ${pkg.name} (package.json not found)`);
      continue;
    }

    const pkgJson = readPackageJson(pkg.path);
    if (updateDependency(pkgJson, true)) {
      writePackageJson(pkg.path, pkgJson);
      console.log(`✅ Updated ${pkg.name} to use local SDK`);
      changed = true;
    } else {
      console.log(`ℹ️  ${pkg.name} already using local SDK or SDK not found`);
    }
  }

  if (changed) {
    console.log('\n📦 Installing dependencies...');
    try {
      execSync('pnpm install', { cwd: ROOT_DIR, stdio: 'inherit' });
      console.log('\n✅ SDK linked! Your app will now use the local SDK from packages/krapi-sdk');
      console.log('💡 Make sure to build the SDK: cd packages/krapi-sdk && pnpm run build');
    } catch (error) {
      console.error('\n❌ Failed to install dependencies. Run: pnpm install');
      process.exit(1);
    }
  } else {
    console.log('\n✅ All packages already using local SDK');
  }
}

function unlinkSDK() {
  console.log('🔌 Unlinking local SDK (switching to npm package)...\n');
  
  let changed = false;
  const packages = [
    { path: BACKEND_PKG, name: 'backend-server' },
    { path: FRONTEND_PKG, name: 'frontend-manager' },
    { path: TEST_SUITE_PKG, name: 'test-suite' },
    { path: MCP_PKG, name: 'mcp-server' },
  ];

  for (const pkg of packages) {
    if (!fs.existsSync(pkg.path)) {
      console.log(`⏭️  Skipping ${pkg.name} (package.json not found)`);
      continue;
    }

    const pkgJson = readPackageJson(pkg.path);
    if (updateDependency(pkgJson, false)) {
      writePackageJson(pkg.path, pkgJson);
      console.log(`✅ Updated ${pkg.name} to use npm package`);
      changed = true;
    } else {
      console.log(`ℹ️  ${pkg.name} already using npm package or SDK not found`);
    }
  }

  if (changed) {
    console.log('\n📦 Installing dependencies...');
    try {
      execSync('pnpm install', { cwd: ROOT_DIR, stdio: 'inherit' });
      console.log('\n✅ SDK unlinked! Your app will now use the npm package');
    } catch (error) {
      console.error('\n❌ Failed to install dependencies. Run: pnpm install');
      process.exit(1);
    }
  } else {
    console.log('\n✅ All packages already using npm package');
  }
}

function checkStatus() {
  console.log('📊 Checking SDK dependency status...\n');
  
  const packages = [
    { path: BACKEND_PKG, name: 'backend-server' },
    { path: FRONTEND_PKG, name: 'frontend-manager' },
    { path: TEST_SUITE_PKG, name: 'test-suite' },
    { path: MCP_PKG, name: 'mcp-server' },
  ];

  let usingLocal = 0;
  let usingNpm = 0;
  let notFound = 0;

  for (const pkg of packages) {
    if (!fs.existsSync(pkg.path)) {
      console.log(`⏭️  ${pkg.name}: package.json not found`);
      notFound++;
      continue;
    }

    const pkgJson = readPackageJson(pkg.path);
    const sdkDep = pkgJson.dependencies?.[SDK_PACKAGE_NAME];
    
    if (!sdkDep) {
      console.log(`❌ ${pkg.name}: SDK dependency not found`);
      notFound++;
    } else if (sdkDep.startsWith('file:')) {
      console.log(`🔗 ${pkg.name}: Using LOCAL SDK (${sdkDep})`);
      usingLocal++;
    } else {
      console.log(`📦 ${pkg.name}: Using NPM package (${sdkDep})`);
      usingNpm++;
    }
  }

  console.log('\n📈 Summary:');
  console.log(`   Local SDK: ${usingLocal}`);
  console.log(`   NPM package: ${usingNpm}`);
  console.log(`   Not found: ${notFound}`);
  
  if (usingLocal > 0 && usingNpm > 0) {
    console.log('\n⚠️  Warning: Mixed mode detected! Some packages use local SDK, others use npm.');
  } else if (usingLocal > 0) {
    console.log('\n💡 All packages using local SDK. Run: node scripts/sdk-dev.js unlink');
  } else if (usingNpm > 0) {
    console.log('\n💡 All packages using npm package. Run: node scripts/sdk-dev.js link');
  }
}

// Main
const command = process.argv[2];

switch (command) {
  case 'link':
    linkSDK();
    break;
  case 'unlink':
    unlinkSDK();
    break;
  case 'status':
    checkStatus();
    break;
  default:
    console.log('SDK Development Helper\n');
    console.log('Usage:');
    console.log('  node scripts/sdk-dev.js link    - Use local SDK for development');
    console.log('  node scripts/sdk-dev.js unlink  - Use npm package');
    console.log('  node scripts/sdk-dev.js status  - Check current mode\n');
    console.log('Examples:');
    console.log('  # Switch to local SDK for debugging');
    console.log('  node scripts/sdk-dev.js link');
    console.log('  cd packages/krapi-sdk && pnpm run build');
    console.log('  cd ../.. && pnpm run dev:all\n');
    console.log('  # Switch back to npm package');
    console.log('  node scripts/sdk-dev.js unlink\n');
    process.exit(1);
}


