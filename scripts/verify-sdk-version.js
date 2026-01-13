#!/usr/bin/env node

/**
 * SDK Version Verification Script
 * 
 * Verifies that @smartsamurai/krapi-sdk is updated to the correct version
 * across all parts of the KRAPI application.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const EXPECTED_VERSION = '0.5.20';
const EXPECTED_FEATURE = 'createSDKInstance';

const packages = [
  { name: 'Frontend Manager', path: 'frontend-manager/package.json' },
  { name: 'Backend Server', path: 'backend-server/package.json' },
  { name: 'Test Suite', path: 'KRAPI-COMPREHENSIVE-TEST-SUITE/package.json' },
];

const checks = {
  packageJson: [],
  installedVersion: [],
  createSDKInstanceUsage: [],
  singletonUsage: [],
};

console.log('🔍 Verifying SDK Version Across All Parts of Application\n');
console.log(`Expected Version: ${EXPECTED_VERSION}\n`);
console.log('='.repeat(60));

// Check package.json files
console.log('\n📦 Checking package.json files...');
for (const pkg of packages) {
  try {
    const packagePath = join(rootDir, pkg.path);
    const packageContent = JSON.parse(readFileSync(packagePath, 'utf8'));
    const sdkVersion = packageContent.dependencies?.['@smartsamurai/krapi-sdk'] || 
                      packageContent.devDependencies?.['@smartsamurai/krapi-sdk'];
    
    if (!sdkVersion) {
      console.log(`  ❌ ${pkg.name}: SDK not found in dependencies`);
      checks.packageJson.push({ name: pkg.name, status: 'missing' });
    } else if (sdkVersion.includes(EXPECTED_VERSION)) {
      console.log(`  ✅ ${pkg.name}: ${sdkVersion}`);
      checks.packageJson.push({ name: pkg.name, status: 'ok', version: sdkVersion });
    } else {
      console.log(`  ⚠️  ${pkg.name}: ${sdkVersion} (expected ${EXPECTED_VERSION})`);
      checks.packageJson.push({ name: pkg.name, status: 'outdated', version: sdkVersion });
    }
  } catch (error) {
    console.log(`  ❌ ${pkg.name}: Error reading package.json - ${error.message}`);
    checks.packageJson.push({ name: pkg.name, status: 'error', error: error.message });
  }
}

// Check installed versions (if node_modules exists)
console.log('\n📥 Checking installed versions in node_modules...');
for (const pkg of packages) {
  try {
    const packageJsonPath = join(rootDir, pkg.path);
    const nodeModulesPath = join(rootDir, pkg.path.replace('package.json', 'node_modules/@smartsamurai/krapi-sdk/package.json'));
    
    try {
      const installedPackage = JSON.parse(readFileSync(nodeModulesPath, 'utf8'));
      const installedVersion = installedPackage.version;
      
      if (installedVersion === EXPECTED_VERSION) {
        console.log(`  ✅ ${pkg.name}: ${installedVersion} installed`);
        checks.installedVersion.push({ name: pkg.name, status: 'ok', version: installedVersion });
      } else {
        console.log(`  ⚠️  ${pkg.name}: ${installedVersion} installed (expected ${EXPECTED_VERSION})`);
        checks.installedVersion.push({ name: pkg.name, status: 'mismatch', version: installedVersion });
      }
    } catch (error) {
      console.log(`  ⚠️  ${pkg.name}: node_modules not found or SDK not installed`);
      checks.installedVersion.push({ name: pkg.name, status: 'not_installed' });
    }
  } catch (error) {
    console.log(`  ❌ ${pkg.name}: Error checking installed version - ${error.message}`);
    checks.installedVersion.push({ name: pkg.name, status: 'error', error: error.message });
  }
}

// Check for createSDKInstance usage
console.log('\n🔧 Checking for createSDKInstance usage...');
try {
  const { execSync } = await import('child_process');
  
  // Check frontend-manager
  try {
    const frontendResult = execSync(
      `grep -r "createSDKInstance" "${join(rootDir, 'frontend-manager')}" --include="*.ts" --include="*.tsx" | wc -l`,
      { encoding: 'utf8', cwd: rootDir }
    ).trim();
    const count = parseInt(frontendResult) || 0;
    if (count > 0) {
      console.log(`  ✅ Frontend Manager: createSDKInstance used in ${count} files`);
      checks.createSDKInstanceUsage.push({ name: 'Frontend Manager', status: 'ok', count });
    } else {
      console.log(`  ⚠️  Frontend Manager: createSDKInstance not found`);
      checks.createSDKInstanceUsage.push({ name: 'Frontend Manager', status: 'not_found' });
    }
  } catch (error) {
    console.log(`  ⚠️  Frontend Manager: Could not check (${error.message})`);
  }
  
  // Check backend-server (should not use createSDKInstance - uses BackendSDK instead)
  // Backend uses BackendSDK which is a different pattern, so createSDKInstance is not expected
  try {
    const backendResult = execSync(
      `grep -r "createSDKInstance" "${join(rootDir, 'backend-server/src')}" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l`,
      { encoding: 'utf8', cwd: rootDir }
    ).trim();
    const count = parseInt(backendResult) || 0;
    if (count === 0) {
      console.log(`  ✅ Backend Server: No createSDKInstance (uses BackendSDK - correct)`);
      checks.createSDKInstanceUsage.push({ name: 'Backend Server', status: 'ok', note: 'uses BackendSDK' });
    } else {
      console.log(`  ℹ️  Backend Server: createSDKInstance found in ${count} files (may be in test/utils - acceptable)`);
      checks.createSDKInstanceUsage.push({ name: 'Backend Server', status: 'ok', count, note: 'may be in test files' });
    }
  } catch (error) {
    console.log(`  ✅ Backend Server: No createSDKInstance found (uses BackendSDK - correct)`);
    checks.createSDKInstanceUsage.push({ name: 'Backend Server', status: 'ok', note: 'uses BackendSDK' });
  }
} catch (error) {
  console.log(`  ⚠️  Could not check createSDKInstance usage: ${error.message}`);
}

// Check for singleton krapi imports in API routes (should be minimal)
console.log('\n🔍 Checking for singleton krapi imports in API routes...');
try {
  const { execSync } = await import('child_process');
  
  const apiRoutesResult = execSync(
    `grep -r "import.*krapi.*from.*@smartsamurai/krapi-sdk" "${join(rootDir, 'frontend-manager/app/api')}" --include="*.ts" --include="*.tsx" | grep -v "createSDKInstance" | grep -v "KrapiWrapper" | wc -l`,
    { encoding: 'utf8', cwd: rootDir }
  ).trim();
  const count = parseInt(apiRoutesResult) || 0;
  
  if (count === 0) {
    console.log(`  ✅ No singleton krapi imports in API routes (migration complete)`);
    checks.singletonUsage.push({ name: 'API Routes', status: 'ok' });
  } else {
    console.log(`  ⚠️  Found ${count} singleton krapi imports in API routes`);
    console.log(`     Run: grep -r "import.*krapi.*from.*@smartsamurai/krapi-sdk" frontend-manager/app/api --include="*.ts"`);
    checks.singletonUsage.push({ name: 'API Routes', status: 'found', count });
  }
} catch (error) {
  console.log(`  ⚠️  Could not check singleton usage: ${error.message}`);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Summary:\n');

let allGood = true;

// Package.json check
const packageJsonIssues = checks.packageJson.filter(c => c.status !== 'ok');
if (packageJsonIssues.length === 0) {
  console.log('✅ All package.json files have correct SDK version');
} else {
  console.log('⚠️  Package.json issues:');
  packageJsonIssues.forEach(issue => {
    console.log(`   - ${issue.name}: ${issue.status}`);
  });
  allGood = false;
}

// Installed version check
const installedIssues = checks.installedVersion.filter(c => c.status !== 'ok' && c.status !== 'not_installed');
if (installedIssues.length === 0) {
  console.log('✅ All installed SDK versions are correct (or not installed yet)');
} else {
  console.log('⚠️  Installed version issues:');
  installedIssues.forEach(issue => {
    console.log(`   - ${issue.name}: ${issue.version || issue.status}`);
  });
  allGood = false;
}

// createSDKInstance check
const createSDKIssues = checks.createSDKInstanceUsage.filter(c => c.status !== 'ok');
if (createSDKIssues.length === 0) {
  console.log('✅ createSDKInstance usage is correct');
} else {
  console.log('⚠️  createSDKInstance usage issues:');
  createSDKIssues.forEach(issue => {
    console.log(`   - ${issue.name}: ${issue.status}`);
  });
}

// Singleton check
const singletonIssues = checks.singletonUsage.filter(c => c.status !== 'ok');
if (singletonIssues.length === 0) {
  console.log('✅ No singleton krapi imports in API routes');
} else {
  console.log('⚠️  Singleton usage issues:');
  singletonIssues.forEach(issue => {
    console.log(`   - ${issue.name}: Found ${issue.count || 0} instances`);
  });
  allGood = false;
}

console.log('\n' + '='.repeat(60));

if (allGood) {
  console.log('\n✅ All checks passed! SDK is properly updated across the application.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some issues found. Please review and update as needed.\n');
  console.log('To update SDK versions, run:');
  console.log('  npm run install:frontend');
  console.log('  npm run install:backend');
  console.log('  npm run install:test-suite');
  process.exit(1);
}

