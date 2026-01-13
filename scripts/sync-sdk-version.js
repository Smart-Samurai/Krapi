#!/usr/bin/env node
/**
 * Sync SDK Version Script
 * 
 * Reads SDK version from .sdk-version.json and updates all package.json files
 * across the monorepo to use the same version.
 * If version is "latest", fetches the actual latest version from npm registry.
 * 
 * Usage: node scripts/sync-sdk-version.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const sdkVersionFile = path.join(rootDir, '.sdk-version.json');

// Package.json files that should have the SDK dependency
const packageJsonFiles = [
  path.join(rootDir, 'frontend-manager', 'package.json'),
  path.join(rootDir, 'backend-server', 'package.json'),
  path.join(rootDir, 'KRAPI-COMPREHENSIVE-TEST-SUITE', 'package.json'),
];

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function writeJsonFile(filePath, data) {
  try {
    const content = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    return false;
  }
}

function getLatestVersionFromNpm(packageName) {
  try {
    const version = execSync(`npm view ${packageName} version`, { encoding: 'utf8' }).trim();
    return version;
  } catch (error) {
    console.error(`❌ Failed to fetch latest version from npm: ${error.message}`);
    return null;
  }
}

async function syncSdkVersion() {
  console.log('🔄 Syncing SDK version across monorepo...\n');

  // Read SDK version from .sdk-version.json
  const sdkVersionConfig = readJsonFile(sdkVersionFile);
  if (!sdkVersionConfig) {
    console.error('❌ Failed to read .sdk-version.json');
    process.exit(1);
  }

  let sdkVersion = sdkVersionConfig.version;
  const sdkPackage = sdkVersionConfig.package || '@smartsamurai/krapi-sdk';

  // If version is "latest", fetch the actual latest version from npm
  // But keep .sdk-version.json as "latest" so it always fetches latest on next run
  let actualVersion = sdkVersion;
  if (sdkVersion === 'latest' || sdkVersion === '*') {
    console.log('📡 Fetching latest version from npm registry...');
    const latestVersion = getLatestVersionFromNpm(sdkPackage);
    if (latestVersion) {
      actualVersion = latestVersion;
      console.log(`✅ Found latest version: ${latestVersion}`);
      console.log(`📝 Using version ${latestVersion} in package.json files (keeping "latest" in .sdk-version.json)\n`);
    } else {
      console.error('❌ Failed to fetch latest version. Using "latest" as fallback.');
      process.exit(1);
    }
  }

  console.log(`📦 SDK Package: ${sdkPackage}`);
  console.log(`📌 SDK Version: ${actualVersion}\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  // Update each package.json
  for (const packageJsonPath of packageJsonFiles) {
    if (!fs.existsSync(packageJsonPath)) {
      console.log(`⏭️  Skipping (not found): ${path.relative(rootDir, packageJsonPath)}`);
      skippedCount++;
      continue;
    }

    const packageJson = readJsonFile(packageJsonPath);
    if (!packageJson) {
      skippedCount++;
      continue;
    }

    const relativePath = path.relative(rootDir, packageJsonPath);
    const hasDependency = packageJson.dependencies && packageJson.dependencies[sdkPackage];
    const hasDevDependency = packageJson.devDependencies && packageJson.devDependencies[sdkPackage];

    if (!hasDependency && !hasDevDependency) {
      console.log(`⏭️  Skipping (no SDK dependency): ${relativePath}`);
      skippedCount++;
      continue;
    }

    // Update version in dependencies or devDependencies
    let updated = false;
    if (hasDependency) {
      const currentVersion = packageJson.dependencies[sdkPackage];
      if (currentVersion !== actualVersion) {
        packageJson.dependencies[sdkPackage] = actualVersion;
        updated = true;
        console.log(`✅ Updated ${relativePath}`);
        console.log(`   ${currentVersion} → ${actualVersion}`);
      } else {
        console.log(`✓ Already synced: ${relativePath}`);
      }
    }

    if (hasDevDependency) {
      const currentVersion = packageJson.devDependencies[sdkPackage];
      if (currentVersion !== actualVersion) {
        packageJson.devDependencies[sdkPackage] = actualVersion;
        updated = true;
        console.log(`✅ Updated ${relativePath} (devDependency)`);
        console.log(`   ${currentVersion} → ${actualVersion}`);
      }
    }

    if (updated) {
      if (writeJsonFile(packageJsonPath, packageJson)) {
        updatedCount++;
      }
    } else {
      skippedCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Updated: ${updatedCount} files`);
  console.log(`   ⏭️  Skipped: ${skippedCount} files`);
  console.log(`\n✨ SDK version sync complete!`);
  console.log(`\n💡 Next step: Run 'npm run install:all' to install the updated SDK version.\n`);
}

// Run if called directly
if (require.main === module) {
  syncSdkVersion();
}

module.exports = { syncSdkVersion };

