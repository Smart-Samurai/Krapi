#!/usr/bin/env node
/**
 * Cleanup script to remove pnpm files and node_modules
 * Prepares the project to use npm instead of pnpm
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");

console.log("🧹 Cleaning up for npm...\n");

// Files to delete
const filesToDelete = ["pnpm-lock.yaml", "pnpm-workspace.yaml"];

// Directories to delete
const dirsToDelete = [
  "node_modules",
  "backend-server/node_modules",
  "frontend-manager/node_modules",
  "backend-server/packages/krapi-logger/node_modules",
  "backend-server/packages/krapi-error-handler/node_modules",
  "backend-server/packages/krapi-monitor/node_modules",
  "KRAPI-COMPREHENSIVE-TEST-SUITE/node_modules",
];

let deletedFiles = 0;
let deletedDirs = 0;

// Delete files
console.log("📄 Deleting pnpm files...");
filesToDelete.forEach((file) => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`  ✓ Deleted ${file}`);
      deletedFiles++;
    } catch (err) {
      console.error(`  ✗ Failed to delete ${file}: ${err.message}`);
    }
  } else {
    console.log(`  ⊘ ${file} not found (already deleted)`);
  }
});

// Delete directories
console.log("\n📁 Deleting node_modules directories...");
dirsToDelete.forEach((dir) => {
  const dirPath = path.join(rootDir, dir);
  if (fs.existsSync(dirPath)) {
    try {
      if (process.platform === "win32") {
        // Windows: use rmdir /s /q
        execSync(`rmdir /s /q "${dirPath}"`, { stdio: "inherit" });
      } else {
        // Unix: use rm -rf
        execSync(`rm -rf "${dirPath}"`, { stdio: "inherit" });
      }
      console.log(`  ✓ Deleted ${dir}`);
      deletedDirs++;
    } catch (err) {
      console.error(`  ✗ Failed to delete ${dir}: ${err.message}`);
    }
  } else {
    console.log(`  ⊘ ${dir} not found (already deleted)`);
  }
});

console.log(`\n✅ Cleanup complete!`);
console.log(
  `   Deleted ${deletedFiles} file(s) and ${deletedDirs} directory/ies`
);
console.log(`\n📦 Next steps:`);
console.log(`   1. Run: npm install`);
console.log(`   2. Run: npm run build:packages`);
console.log(`   3. Run: npm run build:all`);
