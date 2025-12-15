/**
 * Download Restic Binaries for All Platforms
 * 
 * Downloads Restic binaries for Windows, Linux, and macOS (both x64 and ARM64)
 * and places them in the backend-server/bin directory.
 * 
 * Usage: node scripts/download-restic-binaries.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RESTIC_VERSION = '0.16.4';
const BIN_DIR = path.join(__dirname, '..', 'bin');

// Platform configurations
const PLATFORMS = [
  { name: 'win32-x64', file: `restic_${RESTIC_VERSION}_windows_amd64.zip`, extract: true },
  { name: 'linux-x64', file: `restic_${RESTIC_VERSION}_linux_amd64.bz2`, extract: true, decompress: 'bz2' },
  { name: 'darwin-x64', file: `restic_${RESTIC_VERSION}_darwin_amd64.bz2`, extract: true, decompress: 'bz2' },
  { name: 'darwin-arm64', file: `restic_${RESTIC_VERSION}_darwin_arm64.bz2`, extract: true, decompress: 'bz2' },
];

const BASE_URL = `https://github.com/restic/restic/releases/download/v${RESTIC_VERSION}`;

/**
 * Download a file from URL
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading ${url}...`);
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(err);
    });
  });
}

/**
 * Extract ZIP file
 */
function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    const AdmZip = require('adm-zip');
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(destDir, true);
      console.log(`✅ Extracted ${path.basename(zipPath)}`);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Decompress BZ2 file
 * Note: Node.js doesn't have built-in BZ2 support, so we use a workaround
 */
async function decompressBz2(bz2Path, destPath) {
  // Try using system bzip2 command first (if available - Linux/macOS)
  if (process.platform !== 'win32') {
    const { execSync } = require('child_process');
    try {
      // Check if bzip2 is available
      execSync('bzip2 --version', { stdio: 'ignore' });
      // Use system bzip2
      execSync(`bzip2 -d -c "${bz2Path}" > "${destPath}"`, { shell: true });
      console.log(`✅ Decompressed ${path.basename(bz2Path)} using system bzip2`);
      return;
    } catch {
      // bzip2 not available, continue to Node.js library
    }
  }
  
  // Use Node.js library (unbzip2-stream) for Windows or if bzip2 not available
  try {
    const unbzip2 = require('unbzip2-stream');
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(bz2Path);
      const output = fs.createWriteStream(destPath);
      const decompress = unbzip2();
      
      input.pipe(decompress).pipe(output);
      
      output.on('finish', () => {
        console.log(`✅ Decompressed ${path.basename(bz2Path)}`);
        resolve();
      });
      
      output.on('error', reject);
      input.on('error', reject);
    });
  } catch (error) {
    throw new Error(`BZ2 decompression failed: ${error.message}. Please install unbzip2-stream: npm install unbzip2-stream --save-dev`);
  }
}

/**
 * Make file executable (Unix-like systems)
 */
function makeExecutable(filePath) {
  try {
    fs.chmodSync(filePath, 0o755);
  } catch (error) {
    // Ignore errors on Windows
    if (process.platform !== 'win32') {
      console.warn(`⚠️  Could not make ${filePath} executable:`, error.message);
    }
  }
}

/**
 * Download and setup Restic binary for a platform
 * Returns { success: boolean, skipped: boolean }
 */
async function setupPlatform(platform) {
  const url = `${BASE_URL}/${platform.file}`;
  const tempPath = path.join(BIN_DIR, platform.file);
  const finalName = platform.name.startsWith('win32') 
    ? `restic-${platform.name}.exe`
    : `restic-${platform.name}`;
  const finalPath = path.join(BIN_DIR, finalName);

  // Check if binary already exists
  if (fs.existsSync(finalPath)) {
    console.log(`⏭️  Skipping ${platform.name} - binary already exists: ${finalName}`);
    return { success: true, skipped: true };
  }

  try {
    // Download file
    await downloadFile(url, tempPath);

    // Extract/decompress
    if (platform.extract) {
      if (platform.file.endsWith('.zip')) {
        // Extract ZIP
        const extractDir = path.join(BIN_DIR, `temp-${platform.name}`);
        fs.mkdirSync(extractDir, { recursive: true });
        await extractZip(tempPath, extractDir);
        
        // Find restic.exe in extracted files
        const extractedFiles = fs.readdirSync(extractDir, { recursive: true });
        const resticFile = extractedFiles.find(f => 
          f.includes('restic') && (f.endsWith('.exe') || !f.includes('.'))
        );
        
        if (resticFile) {
          const sourcePath = path.join(extractDir, resticFile);
          fs.copyFileSync(sourcePath, finalPath);
          fs.rmSync(extractDir, { recursive: true, force: true });
        } else {
          throw new Error(`Could not find restic binary in ${extractDir}`);
        }
        
        // Clean up temp file
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } else if (platform.decompress === 'bz2') {
        // Decompress BZ2
        await decompressBz2(tempPath, finalPath);
        
        // Clean up temp file
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } else {
        // Just copy
        fs.copyFileSync(tempPath, finalPath);
        
        // Clean up temp file
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
      
      // Make executable (Unix-like)
      if (!platform.name.startsWith('win32')) {
        makeExecutable(finalPath);
      }
    } else {
      // Just rename
      fs.renameSync(tempPath, finalPath);
      if (!platform.name.startsWith('win32')) {
        makeExecutable(finalPath);
      }
    }

    console.log(`✅ Setup complete: ${finalName}`);
    return { success: true, skipped: false };
  } catch (error) {
    console.error(`❌ Failed to setup ${platform.name}:`, error.message);
    // Clean up on error
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }
    return { success: false, skipped: false };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Downloading Restic binaries for all platforms...\n');
  console.log(`Version: ${RESTIC_VERSION}`);
  console.log(`Target directory: ${BIN_DIR}\n`);

  // Create bin directory
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
    console.log(`📁 Created ${BIN_DIR}\n`);
  }

  // Check if adm-zip is available (for ZIP extraction)
  let hasAdmZip = false;
  try {
    require('adm-zip');
    hasAdmZip = true;
  } catch {
    console.log('⚠️  adm-zip not found. Installing...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install adm-zip --save-dev', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
      hasAdmZip = true;
    } catch {
      console.error('❌ Failed to install adm-zip. Please install it manually: npm install adm-zip --save-dev');
      process.exit(1);
    }
  }

  // Check if unbzip2-stream is available (for BZ2 decompression on Windows)
  let hasUnbzip2 = false;
  if (process.platform === 'win32') {
    try {
      require('unbzip2-stream');
      hasUnbzip2 = true;
    } catch {
      console.log('⚠️  unbzip2-stream not found. Installing for BZ2 support on Windows...');
      const { execSync } = require('child_process');
      try {
        execSync('npm install unbzip2-stream --save-dev', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
        hasUnbzip2 = true;
      } catch {
        console.warn('⚠️  Failed to install unbzip2-stream. BZ2 files may not decompress on Windows.');
        console.warn('   You may need to manually extract BZ2 files or install bzip2.');
      }
    }
  }

  // Download for each platform
  const results = [];
  for (const platform of PLATFORMS) {
    const result = await setupPlatform(platform);
    results.push({ platform: platform.name, ...result });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Download Summary');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const skipped = results.filter(r => r.skipped);
  const failed = results.filter(r => !r.success && !r.skipped);
  const downloaded = successful.filter(r => !r.skipped);
  
  if (skipped.length > 0) {
    console.log(`⏭️  Skipped (already exist): ${skipped.length}/${results.length}`);
    skipped.forEach(r => console.log(`   - ${r.platform}`));
  }
  
  if (downloaded.length > 0) {
    console.log(`✅ Downloaded: ${downloaded.length}/${results.length}`);
    downloaded.forEach(r => console.log(`   - ${r.platform}`));
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    failed.forEach(r => console.log(`   - ${r.platform}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (failed.length === 0) {
    if (skipped.length === results.length) {
      console.log('✅ All binaries already exist - no download needed!');
    } else {
      console.log('🎉 All binaries available successfully!');
    }
    console.log(`\nBinaries are located in: ${BIN_DIR}`);
    console.log('\nThe ResticBackupService will automatically use the correct binary for your platform.');
  } else {
    console.log('⚠️  Some binaries failed to download. Please check the errors above.');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };

