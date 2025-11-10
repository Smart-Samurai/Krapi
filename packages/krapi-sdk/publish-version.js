#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const packageJsonPath = path.join(__dirname, 'package.json');

// Read current package.json
function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

// Update version in package.json
function updateVersion(newVersion) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  return true;
}

// Validate version format (semver)
function isValidVersion(version) {
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(-[\w\.-]+)?(\+[\w\.-]+)?$/;
  return semverRegex.test(version);
}

// Main function
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    const currentVersion = getCurrentVersion();
    
    console.log('\n========================================');
    console.log('  KRAPI SDK Version Publisher');
    console.log('========================================\n');
    console.log(`Current version: ${currentVersion}\n`);

    const newVersion = await question('Enter new version number: ');

    if (!newVersion || !newVersion.trim()) {
      console.log('\n❌ Error: Version cannot be empty');
      rl.close();
      process.exit(1);
    }

    const trimmedVersion = newVersion.trim();

    if (!isValidVersion(trimmedVersion)) {
      console.log('\n❌ Error: Invalid version format. Please use semantic versioning (e.g., 1.2.3)');
      rl.close();
      process.exit(1);
    }

    if (trimmedVersion === currentVersion) {
      console.log('\n⚠️  Warning: New version is the same as current version.');
      const confirm = await question('Continue anyway? (y/N): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('\nCancelled.');
        rl.close();
        process.exit(0);
      }
    }

    console.log(`\n📝 Updating version from ${currentVersion} to ${trimmedVersion}...`);
    updateVersion(trimmedVersion);
    console.log('✅ Version updated successfully!\n');

    const confirmPublish = await question('Publish to npm registry? (y/N): ');
    if (confirmPublish.toLowerCase() !== 'y') {
      console.log('\n⚠️  Version updated but not published. You can publish later with: npm publish');
      rl.close();
      process.exit(0);
    }

    console.log('\n🚀 Publishing to npm registry...\n');
    rl.close();

    // Execute npm publish
    const { execSync } = require('child_process');
    try {
      execSync('npm publish', { 
        stdio: 'inherit',
        cwd: __dirname
      });
      console.log('\n✅ Successfully published to npm registry!');
    } catch (error) {
      console.error('\n❌ Error publishing to npm registry:', error.message);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();

