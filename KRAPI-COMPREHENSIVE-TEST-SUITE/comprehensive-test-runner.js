#!/usr/bin/env node

import { spawn, exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { krapi } from "@smartsamurai/krapi-sdk";
import fs from "fs";
import { rm, readdir, readFile } from "fs/promises";
import { existsSync, readFileSync, readdirSync } from "fs";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ComprehensiveTestRunner {
  constructor() {
    this.projectRoot = join(__dirname, "..");
    this.testSuiteRoot = __dirname;
    this.results = {
      passed: 0,
      failed: 0,
      errors: 0,
      total: 0,
    };
    this.sessionToken = null;
    this.testProject = null;
    this.testCollection = null;
    this.errors = [];
    this.testDetails = [];
    this.individualTestResults = [];
    this.failedAtSuite = null;
    this.totalSuites = 0;
    this.services = {
      backend: null,
      frontend: null,
    };
    // Log buffers for capturing service logs
    this.serviceLogs = {
      backend: [],
      frontend: [],
    };
    
    // Full output log buffer for complete test suite output
    this.fullOutputLog = [];

    // Check for --stop-on-first-failure flag or STOP_ON_FIRST_FAILURE env var
    if (
      process.argv.includes("--stop-on-first-failure") ||
      process.env.STOP_ON_FIRST_FAILURE === "true"
    ) {
      process.env.STOP_ON_FIRST_FAILURE = "true";
      this.log(
        "⚡ STOP_ON_FIRST_FAILURE mode enabled - tests will stop immediately on first failure",
        "INFO"
      );
    }
  }

  log(message, level = "INFO") {
    // Minimal mode: suppress most logs unless verbose
    const minimal = process.env.VERBOSE !== "true";

    if (minimal) {
      // In minimal mode, only show critical errors
      if (level === "CRITICAL" || level === "ERROR") {
        const levelEmoji = {
          ERROR: "❌",
          CRITICAL: "💥",
        };
        console.log(`${levelEmoji[level]} ${message}`);
      }
      return;
    }

    // Verbose mode: show all logs
    const timestamp = new Date().toISOString();
    const levelEmoji = {
      INFO: "ℹ️",
      SUCCESS: "✅",
      WARNING: "⚠️",
      ERROR: "❌",
      CRITICAL: "💥",
    };
    console.log(`${levelEmoji[level]} [${timestamp}] ${message}`);
  }

  async runCommand(command, options = {}) {
    if (!options.silent) {
      this.log(`Running: ${command}`, "INFO");
    }
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot,
        ...options,
      });
      if (stderr && !options.ignoreStderr && !options.silent) {
        // Filter out harmless npm warnings about deprecated config options
        const filteredStderr = stderr
          .split("\n")
          .filter((line) => {
            const trimmed = line.trim();
            return (
              trimmed &&
              !trimmed.includes(
                'Unknown env config "verify-deps-before-run"'
              ) &&
              !trimmed.includes('Unknown env config "_jsr-registry"') &&
              !trimmed.includes(
                "This will stop working in the next major version"
              )
            );
          })
          .join("\n");

        if (filteredStderr.trim()) {
          this.log(`Command stderr: ${filteredStderr}`, "WARNING");
        }
      }
      return { stdout, stderr, success: true };
    } catch (error) {
      if (!options.silent) {
        this.log(`Command failed: ${error.message}`, "ERROR");
      }
      return { stdout: error.stdout, stderr: error.stderr, success: false };
    }
  }

  async killProcessOnPort(port) {
    console.log(`🔄 killProcessOnPort(${port}) called`);
    try {
      console.log(`🔄 Trying lsof command for port ${port}...`);
      // Try Linux/Unix command first (lsof) - silently fail on Windows
      let result = await this.runCommand(`lsof -ti:${port}`, {
        ignoreStderr: true,
        silent: true, // Don't log command failures for cross-platform commands
      });
      if (result.success && result.stdout && result.stdout.trim()) {
        const pid = result.stdout.trim();
        if (pid) {
          this.log(`Killing process ${pid} on port ${port}`, "INFO");
          const killResult = await this.runCommand(`kill -9 ${pid}`, {
            ignoreStderr: true,
            silent: true,
          });
          if (killResult.success) {
            return; // Successfully killed, exit early
          }
        }
      }

      // Fallback to fuser (another Linux command) - silently fail on Windows
      result = await this.runCommand(`fuser -k ${port}/tcp`, {
        ignoreStderr: true,
        silent: true,
      });
      if (result.success) {
        return; // Successfully killed, exit early
      }

      // If both fail, try Windows commands as fallback
      result = await this.runCommand(`netstat -ano | findstr :${port}`, {
        ignoreStderr: true,
        silent: true,
      });
      if (result.success && result.stdout) {
        const lines = result.stdout.split("\n");
        const pids = new Set(); // Use Set to collect unique PIDs

        // Extract unique PIDs from netstat output
        for (const line of lines) {
          if (line.includes(`:${port}`)) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== "0" && /^\d+$/.test(pid)) {
              pids.add(pid);
            }
          }
        }

        // Kill each unique PID only once
        for (const pid of pids) {
          this.log(`Killing process ${pid} on port ${port}`, "INFO");
          await this.runCommand(`taskkill /PID ${pid} /F`, {
            ignoreStderr: true,
            silent: true, // Don't log "not found" errors - process already gone
          });
          // Silently continue regardless of result - process might already be gone
        }

        return; // Exit after processing all PIDs
      }

      // No processes found on this port - that's fine, just return silently
    } catch (error) {
      // Silently ignore cleanup errors - processes might already be gone
      // Don't log expected errors like "not found" or "No such process"
      // Ensure error doesn't cause unhandled rejection
      if (error && typeof error === "object" && error.message) {
        // Error is caught and handled - no need to rethrow
        return;
      }
    }
  }

  async cleanupExistingResources() {
    this.log("🧹 Cleaning up existing test resources...", "INFO");

    // Kill processes on test ports FIRST (before trying to delete locked files)
    this.log("   Killing any existing processes on test ports...", "INFO");
    await this.killProcessOnPort(3498); // Frontend
    await this.killProcessOnPort(3470); // Backend
    // No database port to clean up - using embedded SQLite

    // Additional cleanup: kill any next processes (silently fail on Windows)
    try {
      await this.runCommand("pkill -9 -f 'next dev'", {
        ignoreStderr: true,
        silent: true,
      });
      await this.runCommand("pkill -9 -f 'next-server'", {
        ignoreStderr: true,
        silent: true,
      });
    } catch (error) {
      // Ignore errors if processes don't exist
    }

    // Wait longer for processes to fully terminate and file handles to be released
    // SQLite on Windows needs extra time to release file locks
    // Industry standard: Wait for file handles to be released before attempting deletion
    this.log(
      "   Waiting for processes to terminate and file handles to be released...",
      "INFO"
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Additional wait on Windows for SQLite file locks to be released
    if (process.platform === "win32") {
      this.log("   Additional wait for Windows file lock release...", "INFO");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // Now cleanup database files after processes are killed
    await this.cleanupDatabaseFiles();

    // Cleanup Restic repository (for test isolation)
    await this.cleanupResticRepository();

    // Verify cleanup was successful
    await this.verifyDatabaseCleanup();

    this.log("✅ Cleanup complete", "SUCCESS");
  }

  /**
   * Cleanup Restic backup repository for test isolation
   */
  async cleanupResticRepository() {
    this.log("🧹 Cleaning up Restic repository...", "INFO");
    try {
      const backendDataDir = join(this.projectRoot, "backend-server", "data", "backups", "restic-repo");

      if (!fs.existsSync(backendDataDir)) {
        this.log("   No Restic repository found, skipping cleanup", "INFO");
        return;
      }

      // Delete the entire repository directory
      // This ensures tests start with a fresh repository
      try {
        await rm(backendDataDir, { recursive: true, force: true });
        this.log("   ✅ Restic repository cleaned up", "SUCCESS");
      } catch (error) {
        // On Windows, files might be locked - try again after a delay
        if (process.platform === "win32") {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          try {
            await rm(backendDataDir, { recursive: true, force: true });
            this.log("   ✅ Restic repository cleaned up (retry)", "SUCCESS");
          } catch (retryError) {
            this.log(
              `   ⚠️  Could not delete Restic repository: ${retryError.message}`,
              "WARNING"
            );
          }
        } else {
          this.log(
            `   ⚠️  Could not delete Restic repository: ${error.message}`,
            "WARNING"
          );
        }
      }
    } catch (error) {
      this.log(
        `   ⚠️  Error during Restic repository cleanup: ${error.message}`,
        "WARNING"
      );
    }
  }

  /**
   * Verify database cleanup was successful (industry-standard verification)
   * Ensures all database files are actually deleted before proceeding
   */
  async verifyDatabaseCleanup() {
    this.log("🔍 Verifying database cleanup...", "INFO");

    try {
      const { join } = await import("path");
      const { readdir } = await import("fs/promises");
      const { existsSync } = await import("fs");
      const { fileURLToPath } = await import("url");
      const { dirname } = await import("path");

      const testSuiteDir = dirname(fileURLToPath(import.meta.url));
      const projectRoot = join(testSuiteDir, "..");
      const backendDataDir = join(projectRoot, "backend-server", "data");

      if (!existsSync(backendDataDir)) {
        this.log(
          "   ✅ Database directory does not exist - cleanup verified",
          "SUCCESS"
        );
        return;
      }

      // Check main database files
      const mainDbFiles = [
        "krapi_main.db",
        "krapi_main.db-wal",
        "krapi_main.db-shm",
        "krapi.db",
        "krapi.db-wal",
        "krapi.db-shm",
      ];

      let mainDbFilesFound = 0;
      for (const dbFile of mainDbFiles) {
        const dbPath = join(backendDataDir, dbFile);
        if (existsSync(dbPath)) {
          mainDbFilesFound++;
          this.log(`   ⚠️  Main DB file still exists: ${dbFile}`, "WARN");
        }
      }

      // Check project databases
      const projectsDir = join(backendDataDir, "projects");
      let projectDbFilesFound = 0;

      if (existsSync(projectsDir)) {
        try {
          const projectFiles = await readdir(projectsDir);
          for (const fileName of projectFiles) {
            if (fileName.match(/\.db(-wal|-shm)?$/)) {
              projectDbFilesFound++;
              if (projectDbFilesFound <= 3) {
                this.log(
                  `   ⚠️  Project DB file still exists: ${fileName}`,
                  "WARN"
                );
              }
            }
          }
        } catch (error) {
          this.log(
            `   ⚠️  Could not verify projects directory: ${error.message}`,
            "WARN"
          );
        }
      }

      if (mainDbFilesFound === 0 && projectDbFilesFound === 0) {
        this.log(
          "   ✅ Database cleanup verified - all files deleted",
          "SUCCESS"
        );
      } else {
        this.log(
          `   ⚠️  Cleanup verification: ${mainDbFilesFound} main DB file(s) and ${projectDbFilesFound} project DB file(s) still exist`,
          "WARN"
        );
        this.log("   ℹ️  These files will be cleaned on next run", "INFO");
      }
    } catch (error) {
      this.log(`   ⚠️  Cleanup verification error: ${error.message}`, "WARN");
    }
  }

  async setupDockerEnvironment() {
    this.log(
      "💾 Using embedded SQLite database - no Docker setup needed",
      "INFO"
    );
    // SQLite database is embedded - no Docker setup required
    // Database file will be created automatically at backend-server/data/krapi.db
    this.log(
      "✅ SQLite database will be initialized on first connection",
      "SUCCESS"
    );
    return true;
  }

  async detectPackageManager() {
    // Detect package manager (prefer pnpm, fallback to npm)
    try {
      const { stdout } = await execAsync("which pnpm", {
        cwd: this.projectRoot,
      });
      if (stdout && stdout.trim()) {
        return "pnpm";
      }
    } catch {
      // pnpm not found
    }
    try {
      const { stdout } = await execAsync("which npm", {
        cwd: this.projectRoot,
      });
      if (stdout && stdout.trim()) {
        return "npm";
      }
    } catch {
      // npm not found
    }
    // Default to npm if neither found
    return "npm";
  }

  async updateDependencies() {
    this.log("📦 Updating all dependencies to latest versions...", "INFO");

    // Detect package manager
    const packageManager = await this.detectPackageManager();

    // Update dependencies in root
    this.log("   Updating root dependencies...", "INFO");
    const rootUpdateResult = await this.runCommand(
      packageManager === "pnpm" ? "pnpm update" : "npm update"
    );
    if (!rootUpdateResult.success) {
      this.log(
        `   ⚠️  Root dependency update had issues: ${rootUpdateResult.stderr}`,
        "WARNING"
      );
    } else {
      this.log("   ✅ Root dependencies updated", "SUCCESS");
    }

    // Install dependencies in root (to get latest SDK)
    this.log("   Installing root dependencies...", "INFO");
    const rootInstallResult = await this.runCommand(
      packageManager === "pnpm" ? "pnpm install" : "npm install"
    );
    if (!rootInstallResult.success) {
      throw new Error(
        `Failed to install root dependencies: ${rootInstallResult.stderr}`
      );
    }
    this.log("   ✅ Root dependencies installed", "SUCCESS");

    // Update dependencies in backend-server
    this.log("   Updating backend dependencies...", "INFO");
    const backendUpdateResult = await this.runCommand(
      packageManager === "pnpm"
        ? "cd backend-server && pnpm update"
        : "cd backend-server && npm update"
    );
    if (!backendUpdateResult.success) {
      this.log(
        `   ⚠️  Backend dependency update had issues: ${backendUpdateResult.stderr}`,
        "WARNING"
      );
    } else {
      this.log("   ✅ Backend dependencies updated", "SUCCESS");
    }

    // Install dependencies in backend-server
    this.log("   Installing backend dependencies...", "INFO");
    const backendInstallResult = await this.runCommand(
      packageManager === "pnpm"
        ? "cd backend-server && pnpm install"
        : "cd backend-server && npm install"
    );
    if (!backendInstallResult.success) {
      throw new Error(
        `Failed to install backend dependencies: ${backendInstallResult.stderr}`
      );
    }
    this.log("   ✅ Backend dependencies installed", "SUCCESS");

    // Update dependencies in frontend-manager
    this.log("   Updating frontend dependencies...", "INFO");
    const frontendUpdateResult = await this.runCommand(
      packageManager === "pnpm"
        ? "cd frontend-manager && pnpm update"
        : "cd frontend-manager && npm update"
    );
    if (!frontendUpdateResult.success) {
      this.log(
        `   ⚠️  Frontend dependency update had issues: ${frontendUpdateResult.stderr}`,
        "WARNING"
      );
    } else {
      this.log("   ✅ Frontend dependencies updated", "SUCCESS");
    }

    // Install dependencies in frontend-manager
    this.log("   Installing frontend dependencies...", "INFO");
    const frontendInstallResult = await this.runCommand(
      packageManager === "pnpm"
        ? "cd frontend-manager && pnpm install"
        : "cd frontend-manager && npm install"
    );
    if (!frontendInstallResult.success) {
      throw new Error(
        `Failed to install frontend dependencies: ${frontendInstallResult.stderr}`
      );
    }
    this.log("   ✅ Frontend dependencies installed", "SUCCESS");

    this.log("✅ All dependencies updated and installed", "SUCCESS");
  }

  async buildServices() {
    this.log("🔨 Building all services...", "INFO");

    // Detect package manager
    const packageManager = await this.detectPackageManager();
    this.log(`   Using package manager: ${packageManager}`, "INFO");

    // Rebuild better-sqlite3 to ensure native bindings are compiled
    // This is critical for SQLite to work - better-sqlite3 requires native bindings
    this.log("   Rebuilding better-sqlite3 native bindings...", "INFO");
    const rebuildResult = await this.runCommand(
      packageManager === "pnpm"
        ? "cd backend-server && pnpm rebuild better-sqlite3"
        : "cd backend-server && npm rebuild better-sqlite3",
      { cwd: this.projectRoot }
    );
    if (!rebuildResult.success) {
      this.log(
        "   Warning: better-sqlite3 rebuild failed, trying root rebuild...",
        "WARNING"
      );
      // Fallback: try rebuilding from root
      const rootRebuildResult = await this.runCommand(
        packageManager === "pnpm"
          ? "pnpm rebuild better-sqlite3"
          : "npm rebuild better-sqlite3 --force",
        { cwd: this.projectRoot }
      );
      if (!rootRebuildResult.success) {
        this.log(
          "   Warning: Root rebuild also failed, continuing anyway",
          "WARNING"
        );
      } else {
        this.log("   ✅ better-sqlite3 rebuild successful (root)", "SUCCESS");
      }
    } else {
      this.log("   ✅ better-sqlite3 rebuild successful", "SUCCESS");
    }

    // Build packages first
    this.log("   Building packages...", "INFO");
    const packagesResult = await this.runCommand(
      packageManager === "pnpm"
        ? "pnpm run build:packages"
        : "npm run build:packages"
    );
    if (!packagesResult.success) {
      const buildError = new Error(`Failed to build packages`);
      buildError.buildOutput =
        packagesResult.stdout || packagesResult.stderr || "";
      buildError.buildCommand =
        packageManager === "pnpm"
          ? "pnpm run build:packages"
          : "npm run build:packages";
      buildError.buildType = "packages";
      throw buildError;
    }
    this.log("✅ Packages built successfully", "SUCCESS");

    // Build backend
    this.log("   Building backend...", "INFO");
    const backendResult = await this.runCommand(
      packageManager === "pnpm"
        ? "pnpm run build:backend"
        : "npm run build:backend"
    );
    if (!backendResult.success) {
      const buildError = new Error(`Failed to build backend`);
      buildError.buildOutput =
        backendResult.stdout || backendResult.stderr || "";
      buildError.buildCommand =
        packageManager === "pnpm"
          ? "pnpm run build:backend"
          : "npm run build:backend";
      buildError.buildType = "backend";
      throw buildError;
    }
    this.log("✅ Backend built successfully", "SUCCESS");

    // Build frontend
    this.log("   Building frontend...", "INFO");
    const frontendResult = await this.runCommand(
      packageManager === "pnpm"
        ? "pnpm run build:frontend"
        : "npm run build:frontend"
    );
    if (!frontendResult.success) {
      const buildError = new Error(`Failed to build frontend`);
      buildError.buildOutput =
        frontendResult.stdout || frontendResult.stderr || "";
      buildError.buildCommand =
        packageManager === "pnpm"
          ? "pnpm run build:frontend"
          : "npm run build:frontend";
      buildError.buildType = "frontend";
      throw buildError;
    }
    this.log("✅ Frontend built successfully", "SUCCESS");

    this.log("✅ All services built successfully", "SUCCESS");
  }

  async cleanupDatabaseFiles() {
    this.log(
      "🧹 Cleaning up database files from previous test runs...",
      "INFO"
    );
    try {
      const backendDataDir = join(this.projectRoot, "backend-server", "data");

      if (!fs.existsSync(backendDataDir)) {
        this.log("   No database directory found, skipping cleanup", "INFO");
        return;
      }

      // Helper function to check if file is accessible (not locked)
      const isFileAccessible = (filePath) => {
        try {
          // Try to open file in read-write mode to check if it's locked
          const fd = fs.openSync(filePath, "r+");
          fs.closeSync(fd);
          return true;
        } catch {
          return false;
        }
      };

      // Helper function to retry file deletion (handles Windows file locking)
      const deleteFileWithRetry = async (
        filePath,
        fileName,
        maxRetries = 10
      ) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            // On Windows, check if file is accessible before trying to delete
            if (process.platform === "win32" && attempt > 1) {
              if (!isFileAccessible(filePath)) {
                // File is still locked, wait longer
                const waitTime = Math.min(2000 * attempt, 10000);
                this.log(
                  `   ⚠️  ${fileName} is still locked (attempt ${attempt}/${maxRetries}), waiting ${waitTime}ms...`,
                  "WARNING"
                );
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                continue;
              }
            }

            await rm(filePath, { force: true });
            return true;
          } catch (error) {
            if (attempt < maxRetries) {
              // Wait before retrying (exponential backoff, longer on Windows)
              const baseWait = process.platform === "win32" ? 2000 : 1000;
              const waitTime = Math.min(
                baseWait * Math.pow(2, attempt - 1),
                10000
              );
              this.log(
                `   ⚠️  Could not delete ${fileName} (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms...`,
                "WARNING"
              );
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            } else {
              this.log(
                `   ⚠️  Could not delete ${fileName} after ${maxRetries} attempts: ${error.message}`,
                "WARNING"
              );
              return false;
            }
          }
        }
        return false;
      };

      // Clean up main database files
      const mainDbFiles = [
        "krapi_main.db",
        "krapi_main.db-wal",
        "krapi_main.db-shm",
        "krapi.db",
        "krapi.db-wal",
        "krapi.db-shm",
      ];

      let deletedCount = 0;
      for (const dbFile of mainDbFiles) {
        const dbPath = join(backendDataDir, dbFile);
        if (fs.existsSync(dbPath)) {
          const deleted = await deleteFileWithRetry(dbPath, dbFile);
          if (deleted) {
            deletedCount++;
            this.log(`   ✅ Deleted ${dbFile}`, "SUCCESS");
          }
        }
      }

      // CRITICAL: Clean up ALL project databases (industry-standard cleanup)
      // Project databases are stored as .db files directly in the projects directory
      const projectsDir = join(backendDataDir, "projects");
      let projectDbDeletedCount = 0;

      if (fs.existsSync(projectsDir)) {
        try {
          // Get all files in projects directory
          const allFiles = await readdir(projectsDir, { withFileTypes: true });
          const totalFiles = allFiles.length;

          if (totalFiles > 0) {
            this.log(
              `   📊 Found ${totalFiles} project database file(s) - cleaning all...`,
              "INFO"
            );
          }

          // Delete ALL files in projects directory (they're all database files)
          for (const fileEntry of allFiles) {
            if (fileEntry.isFile()) {
              const fileName = fileEntry.name;
              const filePath = join(projectsDir, fileName);
              const deleted = await deleteFileWithRetry(filePath, fileName);
              if (deleted) {
                projectDbDeletedCount++;
                if (projectDbDeletedCount <= 20) {
                  this.log(`   ✅ Deleted project DB: ${fileName}`, "SUCCESS");
                } else if (projectDbDeletedCount === 21) {
                  this.log(
                    `   ✅ ... (deleting more files, showing summary at end)`,
                    "INFO"
                  );
                }
              }
            } else if (fileEntry.isDirectory()) {
              // Legacy: some old setups might have project directories
              const projectPath = join(projectsDir, fileEntry.name);
              let deleted = false;
              const maxRetries = process.platform === "win32" ? 15 : 8;
              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                  await rm(projectPath, { recursive: true, force: true });
                  deleted = true;
                  break;
                } catch (error) {
                  if (attempt < maxRetries) {
                    const baseWait = process.platform === "win32" ? 3000 : 1500;
                    const waitTime = Math.min(
                      baseWait * Math.pow(1.5, attempt - 1),
                      15000
                    );
                    await new Promise((resolve) =>
                      setTimeout(resolve, waitTime)
                    );
                  }
                }
              }
              if (deleted) {
                projectDbDeletedCount++;
                if (projectDbDeletedCount <= 20) {
                  this.log(
                    `   ✅ Deleted project directory: ${fileEntry.name}`,
                    "SUCCESS"
                  );
                }
              }
            }
          }

          // Second pass: Delete any remaining files
          try {
            const remainingFiles = await readdir(projectsDir);
            for (const fileName of remainingFiles) {
              const filePath = join(projectsDir, fileName);
              if (fs.existsSync(filePath)) {
                const deleted = await deleteFileWithRetry(filePath, fileName);
                if (deleted) {
                  projectDbDeletedCount++;
                }
              }
            }
          } catch {
            // Ignore errors in second pass
          }

          if (projectDbDeletedCount > 0) {
            this.log(
              `   ✅ Cleaned ${projectDbDeletedCount} project database file(s)`,
              "SUCCESS"
            );
          } else if (totalFiles === 0) {
            this.log(`   ✅ Projects directory was already empty`, "SUCCESS");
          }
        } catch (error) {
          this.log(
            `   ⚠️  Error cleaning projects directory: ${error.message}`,
            "WARNING"
          );
        }
      } else {
        this.log(
          `   ✅ Projects directory does not exist, nothing to clean`,
          "SUCCESS"
        );
      }

      if (deletedCount > 0) {
        this.log(
          `✅ Database cleanup complete (deleted ${deletedCount} file(s)/directory(ies))`,
          "SUCCESS"
        );
      } else {
        this.log("✅ No database files found to clean up", "SUCCESS");
      }
    } catch (error) {
      this.log(`⚠️  Database cleanup warning: ${error.message}`, "WARNING");
      // Don't throw - continue with tests even if cleanup fails
    }
  }

  /**
   * Sync configuration to .env files
   */
  async syncConfigToEnvFiles(config, allowedOrigins) {
    const { readFileSync, writeFileSync, existsSync } = await import("fs");
    const { join } = await import("path");
    
    // Helper to update .env file
    const updateEnvFile = (filePath, updates) => {
      if (!existsSync(filePath)) {
        // Create file if it doesn't exist
        const content = Object.entries(updates)
          .map(([key, value]) => `${key}=${value}`)
          .join("\n");
        writeFileSync(filePath, content, "utf8");
        return;
      }
      
      let content = readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const seenKeys = new Set();
      
      // Update existing keys
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("#")) continue;
        
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          if (key in updates) {
            lines[i] = `${key}=${updates[key]}`;
            seenKeys.add(key);
          }
        }
      }
      
      // Add new keys
      for (const [key, value] of Object.entries(updates)) {
        if (!seenKeys.has(key)) {
          lines.push(`${key}=${value}`);
        }
      }
      
      writeFileSync(filePath, lines.join("\n"), "utf8");
    };
    
    // Update root .env
    const rootEnvPath = join(this.projectRoot, ".env");
    updateEnvFile(rootEnvPath, {
      FRONTEND_URL: config.frontend.url,
      BACKEND_URL: config.backend.url,
      ALLOWED_ORIGINS: allowedOrigins.join(","),
      ENABLE_CORS: "true",
    });
    
    // Update frontend .env.local
    const frontendEnvPath = join(this.projectRoot, "frontend-manager", ".env.local");
    updateEnvFile(frontendEnvPath, {
      NEXT_PUBLIC_APP_URL: config.frontend.url,
      KRAPI_BACKEND_URL: config.backend.url,
      ALLOWED_ORIGINS: allowedOrigins.join(","),
    });
    
    // Update backend .env
    const backendEnvPath = join(this.projectRoot, "backend-server", ".env");
    updateEnvFile(backendEnvPath, {
      FRONTEND_URL: config.frontend.url,
      KRAPI_FRONTEND_URL: config.frontend.url,
      ALLOWED_ORIGINS: allowedOrigins.join(","),
      ENABLE_CORS: "true",
    });
  }

  /**
   * Configure app for tests
   * Sets up CORS, security settings, and other test-specific configuration
   */
  async configureAppForTests() {
    this.log("⚙️  Configuring app for tests...", "INFO");
    
    try {
      const packageManager = await this.detectPackageManager();
      const { readFileSync, writeFileSync, existsSync } = await import("fs");
      const { join } = await import("path");
      
      // Read current config
      const configPath = join(this.projectRoot, "config", "krapi-config.json");
      let config = {};
      
      if (existsSync(configPath)) {
        const configContent = readFileSync(configPath, "utf8");
        config = JSON.parse(configContent);
      }
      
      // Set test-specific allowed origins
      // Include some allowed origins and some that should be blocked
      const testAllowedOrigins = [
        "https://test-allowed.example.com",
        "https://app1.example.com",
        "https://app2.example.com",
        "https://app3.example.com",
      ];
      
      // Update config
      if (!config.security) config.security = {};
      if (!config.frontend) config.frontend = {};
      
      config.security.allowedOrigins = testAllowedOrigins;
      config.security.enableCors = true;
      config.frontend.url = "http://127.0.0.1:3498";
      config.backend = config.backend || {};
      config.backend.url = "http://127.0.0.1:3470";
      
      // Ensure config directory exists
      const configDir = join(this.projectRoot, "config");
      if (!existsSync(configDir)) {
        const { mkdirSync } = await import("fs");
        mkdirSync(configDir, { recursive: true });
      }
      
      // Write config
      writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      this.log("   ✅ Configuration file updated", "SUCCESS");
      
      // Sync to .env files manually (since we're in ES module context)
      this.log("   Syncing configuration to .env files...", "INFO");
      try {
        // Ensure localhost is always included in allowed origins
        const localhostOrigins = [
          "http://localhost",
          "http://localhost:3498",
          "http://localhost:3470",
          "http://127.0.0.1",
          "http://127.0.0.1:3498",
          "http://127.0.0.1:3470",
        ];
        const originsWithLocalhost = [...new Set([...localhostOrigins, ...testAllowedOrigins])];
        await this.syncConfigToEnvFiles(config, originsWithLocalhost);
        this.log("   ✅ Configuration synced to .env files", "SUCCESS");
      } catch (syncError) {
        this.log(
          `   ⚠️  Could not sync to .env files: ${syncError.message} (continuing anyway)`,
          "WARNING"
        );
      }
      
      this.log("✅ App configured for tests", "SUCCESS");
    } catch (error) {
      this.log(
        `⚠️  Failed to configure app for tests: ${error.message}`,
        "WARNING"
      );
      this.log("   Continuing with default configuration...", "INFO");
      // Don't throw - continue with default config
    }
  }

  async startServices() {
    this.log("🚀 Starting services...", "INFO");

    // Database files should already be cleaned up in cleanupExistingResources()
    // No need to clean again here

    // Detect package manager
    const packageManager = await this.detectPackageManager();

    // Start backend
    this.log("   Starting backend...", "INFO");
    const backendProcess = spawn(
      packageManager === "pnpm" ? "pnpm" : "npm",
      ["run", "dev:backend"],
      {
        cwd: this.projectRoot,
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      }
    );

    this.services.backend = backendProcess;

    // Log backend output only in verbose mode (suppress normal startup logs)
    const minimal = process.env.VERBOSE !== "true";

    // Capture important debug and error logs for debugging
    // These patterns help identify issues during test execution
    const backendImportantLogPatterns = [
      // Auth-related
      "AUTH DEBUG",
      "AUTH MIDDLEWARE",
      "getSessionByToken",
      "validateSessionToken",
      "authenticateAdmin",
      "Token validation",
      "Session found",
      "Session token",
      // Database-related
      "DB DEBUG",
      "SDK ADAPTER",
      "project_users",
      "queryMain",
      "queryProject",
      "no such table",
      "duplicate column",
      // Error-related
      "ERROR",
      "Error",
      "error:",
      "FAILED",
      "Failed",
      "failed",
      "SqliteError",
      "SQLITE_ERROR",
      // SDK-related
      "KrapiError",
      "CONFLICT",
      "NOT_FOUND",
      "VALIDATION_ERROR",
      "INTERNAL_ERROR",
      // User creation debugging
      "CREATE USER",
      "createUser",
      "getUserByEmail",
      "getUserByUsername",
    ];

    const isBackendImportantLog = (output) => {
      return backendImportantLogPatterns.some((pattern) =>
        output.includes(pattern)
      );
    };

    backendProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        // Always capture ALL output to full log
        this.fullOutputLog.push({
          timestamp: new Date().toISOString(),
          service: "backend",
          type: "stdout",
          message: output,
        });
        
        // Always capture important logs for debugging
        if (isBackendImportantLog(output)) {
          this.serviceLogs.backend.push({
            timestamp: new Date().toISOString(),
            type: "stdout",
            message: output,
          });
          // In minimal mode, show important logs inline
          if (minimal) {
            console.log(`   [Backend] ${output}`);
          }
        }

        // In verbose mode, log everything
        if (process.env.VERBOSE === "true") {
          this.log(`   Backend: ${output}`, "INFO");
        }
      }
    });

    backendProcess.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        // Always capture ALL output to full log
        this.fullOutputLog.push({
          timestamp: new Date().toISOString(),
          service: "backend",
          type: "stderr",
          message: output,
        });
        
        // Always capture ALL stderr - this is where errors appear
        this.serviceLogs.backend.push({
          timestamp: new Date().toISOString(),
          type: "stderr",
          message: output,
        });

        // Always show errors - stderr is important!
        // Filter out only harmless npm warnings
        const isHarmlessWarning =
          output.includes("Unknown env config") ||
          output.includes("ExperimentalWarning") ||
          output.includes("DeprecationWarning") ||
          (output.includes("npm warn") && !output.includes("error"));

        if (!isHarmlessWarning) {
          console.log(`   [Backend Error] ${output}`);
        }
      }
    });

    // Start frontend
    this.log("   Starting frontend...", "INFO");
    const frontendProcess = spawn(
      packageManager === "pnpm" ? "pnpm" : "npm",
      ["run", "dev:frontend"],
      {
        cwd: this.projectRoot,
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      }
    );

    this.services.frontend = frontendProcess;

    // Log frontend output - capture important debug and error logs
    const frontendImportantLogPatterns = [
      // Auth-related
      "AUTH DEBUG",
      "AUTH ME",
      "Failed to create authenticated backend SDK",
      "Failed to get current user",
      "Token validation",
      "Session token",
      "authenticateAdmin",
      // API errors
      "API ERROR",
      "createErrorResponse",
      "logApiError",
      // Error-related
      "ERROR",
      "Error",
      "error:",
      "FAILED",
      "Failed",
      "failed",
      // SDK-related
      "KrapiError",
      "CONFLICT",
      "NOT_FOUND",
      "VALIDATION_ERROR",
      "INTERNAL_ERROR",
      // User creation debugging
      "createUser",
      "getUserByEmail",
    ];

    const isFrontendImportantLog = (output) => {
      return frontendImportantLogPatterns.some((pattern) =>
        output.includes(pattern)
      );
    };

    frontendProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        // Always capture ALL output to full log
        this.fullOutputLog.push({
          timestamp: new Date().toISOString(),
          service: "frontend",
          type: "stdout",
          message: output,
        });
        
        // Always capture important logs for debugging
        if (isFrontendImportantLog(output)) {
          this.serviceLogs.frontend.push({
            timestamp: new Date().toISOString(),
            type: "stdout",
            message: output,
          });
          // In minimal mode, show important logs inline
          if (minimal) {
            console.log(`   [Frontend] ${output}`);
          }
        }

        // In verbose mode, log everything
        if (process.env.VERBOSE === "true") {
          this.log(`   Frontend: ${output}`, "INFO");
        }
      }
    });

    frontendProcess.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        // Always capture ALL output to full log
        this.fullOutputLog.push({
          timestamp: new Date().toISOString(),
          service: "frontend",
          type: "stderr",
          message: output,
        });
        
        // Always capture ALL stderr - this is where errors appear
        this.serviceLogs.frontend.push({
          timestamp: new Date().toISOString(),
          type: "stderr",
          message: output,
        });

        // Always show errors - stderr is important!
        // Filter out only harmless warnings
        const isHarmlessWarning =
          output.includes("ExperimentalWarning") ||
          output.includes("DeprecationWarning") ||
          output.includes("Fast Refresh") ||
          output.includes("compiled client and server") ||
          output.includes("Compiling");

        if (!isHarmlessWarning) {
          console.log(`   [Frontend Error] ${output}`);
        }
      }
    });

    // Wait for services to be ready using native fetch (before SDK is available)
    // ⚠️ Using native fetch for initial service detection only (SDK connects after services are up)
    this.log("⏳ Waiting for services to be ready...", "INFO");
    let servicesReady = false;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes

    while (!servicesReady && attempts < maxAttempts) {
      try {
        // Use native fetch for initial service detection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const frontendResponse = await fetch(
          "http://127.0.0.1:3498/api/health",
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        // Frontend must be ready (tests use frontend)
        if (frontendResponse.ok) {
          servicesReady = true;
          this.log("✅ Frontend service is ready", "SUCCESS");
          // SDK connection will be established in setupTestEnvironment
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          // Log detailed failure information
          this.log(
            `❌ Services failed to start after ${maxAttempts} attempts`,
            "ERROR"
          );
          this.log(`   Last error: ${error.message}`, "ERROR");

          // Final diagnostic check using fetch
          try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 2000);
            const frontendCheck = await fetch(
              "http://127.0.0.1:3498/api/health",
              { signal: controller.signal }
            );
            this.log(
              `   Frontend status: ${frontendCheck.status} (${
                frontendCheck.ok ? "healthy" : "unhealthy"
              })`,
              "INFO"
            );
          } catch (frontendError) {
            this.log(`   Frontend error: ${frontendError.message}`, "ERROR");
          }

          this.log(
            `   Note: Tests use frontend (port 3498), not backend directly`,
            "INFO"
          );

          // Check if processes are still running
          this.log(
            `   Backend process running: ${
              this.services.backend ? !this.services.backend.killed : false
            }`,
            "INFO"
          );
          this.log(
            `   Frontend process running: ${
              this.services.frontend ? !this.services.frontend.killed : false
            }`,
            "INFO"
          );

          throw new Error(
            `Services not ready after ${maxAttempts} attempts. Check logs above for details.`
          );
        }
        this.log(
          `⏳ Services not ready yet (attempt ${attempts}/${maxAttempts}), waiting...`,
          "INFO"
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    this.log("✅ All services started successfully", "SUCCESS");
  }

  async setupTestEnvironment() {
    this.log("🔧 Setting up test environment...", "INFO");

    try {
      // Initialize SDK connection (simulating external third-party app)
      this.log("   Initializing SDK connection...", "INFO");
      await krapi.connect({
        endpoint: "http://127.0.0.1:3498",
        timeout: 5000,
      });

      // Login using SDK (not direct axios)
      this.log("   Logging in via SDK...", "INFO");
      const loginResult = await krapi.auth.login("admin", "admin123");

      if (!loginResult.session_token) {
        throw new Error("No session token received from SDK login");
      }

      this.sessionToken = loginResult.session_token;
      this.log("✅ Authentication successful via SDK", "SUCCESS");

      // CRITICAL: Reconnect SDK with session token so ALL HTTP clients have it
      // The SDK's setSessionToken() only updates the auth client, not other clients.
      // By reconnecting with sessionToken in config, ALL clients get the token.
      this.log("   Reconnecting SDK with session token for all services...", "INFO");
      await krapi.connect({
        endpoint: "http://127.0.0.1:3498",
        sessionToken: this.sessionToken, // Pass token in config so all clients get it
        initializeClients: true,
        timeout: 5000,
      });
      this.log("   ✅ SDK reconnected with session token for all services", "SUCCESS");

      // Create test project here so it can be passed to test suite
      // This ensures collection is created in the correct project
      this.log("   Creating test project...", "INFO");
      const projectName = `Test Project ${Date.now()}`;
      this.testProject = await krapi.projects.create({
        name: projectName,
        description: "A test project for comprehensive testing",
      });
      this.log(
        `✅ Test project created: ${this.testProject.id}`,
        "SUCCESS"
      );
      this.log(
        "✅ Test environment ready - project created and ready for tests",
        "SUCCESS"
      );
    } catch (error) {
      this.log(
        `❌ Failed to setup test environment: ${error.message}`,
        "ERROR"
      );
      return false;
    }
    return true;
  }

  async runTest(testFile) {
    return new Promise(async (resolve, reject) => {
      try {
        this.log(`🧪 Running ${testFile}...`, "INFO");

        // Import and run the test class
        const testModule = await import(join(this.testSuiteRoot, testFile));
        const TestClass = testModule.default;

        if (!TestClass) {
          throw new Error(`No default export found in ${testFile}`);
        }

        // Create test instance and run
        const testInstance = new TestClass(this.sessionToken, this.testProject);
        await testInstance.runAll();

        this.log(`✅ ${testFile} PASSED`, "SUCCESS");
        this.results.passed++;
        resolve(true);
      } catch (error) {
        this.log(`❌ ${testFile} FAILED: ${error.message}`, "ERROR");
        this.results.failed++;
        reject(error);
      }
    });
  }

  async runAllTests() {
    this.log("🚀 Starting Comprehensive Test Suite", "INFO");
    const startTime = Date.now();
    this.startTime = startTime; // Store for global error handlers
    globalTestRunner = this; // Store globally for error handlers

    try {
      // Clean up existing resources
      await this.cleanupExistingResources();

      // Setup Docker environment
      await this.setupDockerEnvironment();

      // Update all dependencies to latest versions (including SDK)
      await this.updateDependencies();

      // Build all services
      try {
        await this.buildServices();
      } catch (buildError) {
        // Build failed - create a build error log file
        await this.logBuildError(buildError);
        throw buildError; // Re-throw to be caught by outer catch
      }

      // Configure app for tests (CORS, security settings, etc.)
      await this.configureAppForTests();

      // Start services
      await this.startServices();

      // Setup test environment
      const setupSuccess = await this.setupTestEnvironment();
      if (!setupSuccess) {
        this.log("❌ Test environment setup failed", "ERROR");
        return false;
      }

      // Load and run all comprehensive test files
      this.log("🧪 Running comprehensive test suite...", "INFO");

      const testFiles = ["comprehensive-unified-test.js"];

      this.log(`📋 Running ${testFiles.length} test suites`, "INFO");
      this.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "INFO"
      );

      this.totalSuites = testFiles.length;

      for (const testFile of testFiles) {
        try {
          this.log(`🔍 Running ${testFile}...`, "INFO");

          // Import and run the test file
          let testModule;
          let TestClass;
          try {
            testModule = await import(`./${testFile}`);
            TestClass = testModule.default;
          } catch (importError) {
            // If import fails, save error log and re-throw
            this.log(
              `❌ Failed to import ${testFile}: ${importError.message}`,
              "ERROR"
            );
            this.errors.push(
              `Failed to import ${testFile}: ${importError.message}`
            );
            await this.saveFatalErrorLog(
              importError,
              Date.now() - startTime,
              startTime
            );
            throw importError;
          }

          // Parse command-line arguments for test selection
          const { parseArguments, selectTestsToRun, printUsage } = await import(
            "./test-selector.js"
          );
          const { getAllTestNames } = await import("./test-registry.js");
          const config = parseArguments();

          // If --help is requested, show usage and exit
          if (process.argv.includes("--help") || process.argv.includes("-h")) {
            printUsage();
            process.exit(0);
          }

          // Determine which tests to run
          const testLogsDir = join(__dirname, "test-logs");
          const selectedTests = selectTestsToRun(config, testLogsDir);

          // Set stop-on-first-failure if requested
          if (config.stopOnFirstFailure) {
            process.env.STOP_ON_FIRST_FAILURE = "true";
          }

          // Create test instance with selected tests
          // Only pass selectedTests if it's a subset (not all tests)
          const allTestNames = getAllTestNames();
          const isSubset =
            selectedTests.length < allTestNames.length ||
            selectedTests.some((t) => !allTestNames.includes(t));
          const testInstance = new TestClass(
            this.sessionToken,
            this.testProject,
            isSubset ? selectedTests : null
          );

          // Pass service logs to test instance for inclusion in results
          if (
            testInstance.logger &&
            typeof testInstance.logger.setServiceLogs === "function"
          ) {
            testInstance.logger.setServiceLogs(this.serviceLogs);
          }
          
          // Pass full output log to test instance for inclusion in results
          if (
            testInstance.logger &&
            typeof testInstance.logger.setFullOutputLog === "function"
          ) {
            testInstance.logger.setFullOutputLog(this.fullOutputLog);
          }

          // Run the test suite
          this.log(`🔍 Running test suite: ${testFile}`, "INFO");
          let result;
          let testSuiteSavedLogs = false;
          try {
            result = await testInstance.runAll();
            // Check if test suite's logger saved files (it saves in finally block)
            testSuiteSavedLogs =
              testInstance.logger && testInstance.logger.filesSaved === true;
          } catch (error) {
            // Test suite threw an error (likely from STOP_ON_FIRST_FAILURE mode)
            // Check if test suite's logger saved files before the error (it saves in finally block)
            testSuiteSavedLogs =
              testInstance.logger && testInstance.logger.filesSaved === true;

            this.results.failed++;
            this.log(
              `❌ ${testFile} FAILED with error: ${error.message}`,
              "ERROR"
            );
            this.testDetails.push({
              test: testFile,
              status: "FAILED",
              error: error.message,
            });

            // Collect individual test results from the test framework if available
            if (testInstance.results && Array.isArray(testInstance.results)) {
              testInstance.results.forEach((testResult) => {
                this.individualTestResults.push({
                  suite: testFile,
                  test: testResult.test,
                  status: testResult.status,
                  duration: testResult.duration,
                  error: testResult.error,
                });
              });
            }

            // If STOP_ON_FIRST_FAILURE is enabled, stop immediately
            if (process.env.STOP_ON_FIRST_FAILURE === "true") {
              this.log(
                "⚡ STOP_ON_FIRST_FAILURE mode: Stopping test execution immediately",
                "CRITICAL"
              );
              break;
            }

            // Default behavior: stop on any test failure
            this.log(
              "🚨 TEST FAILURE DETECTED - STOPPING TEST SUITE IMMEDIATELY",
              "CRITICAL"
            );
            throw error;
          }

          // Collect individual test results from the test framework
          if (testInstance.results && Array.isArray(testInstance.results)) {
            testInstance.results.forEach((testResult) => {
              this.individualTestResults.push({
                suite: testFile,
                test: testResult.test,
                status: testResult.status,
                duration: testResult.duration,
                error: testResult.error,
              });
            });
          }

          // Update shared test project if available
          if (result === true && testInstance.testProject) {
            this.testProject = testInstance.testProject;
          }

          // testSuiteSavedLogs is already set above from the try/catch block

          // NOTE: Test suite's runAllTests() already saves results in its finally block
          // No need to save again here to avoid duplicate file output
          // The test suite handles all file saving internally

          if (result === true) {
            this.results.passed++;
            this.log(`✅ ${testFile} PASSED`, "SUCCESS");
            this.testDetails.push({
              test: testFile,
              status: "PASSED",
              error: null,
            });
          } else {
            this.results.failed++;
            this.log(`❌ ${testFile} FAILED`, "ERROR");
            this.testDetails.push({
              test: testFile,
              status: "FAILED",
              error: "Test returned false",
            });
            // If STOP_ON_FIRST_FAILURE is enabled, stop immediately
            if (process.env.STOP_ON_FIRST_FAILURE === "true") {
              this.log(
                "⚡ STOP_ON_FIRST_FAILURE mode: Stopping test execution immediately",
                "CRITICAL"
              );
              break;
            }

            // Default behavior: stop on any test failure
            this.log(
              "🚨 TEST FAILURE DETECTED - STOPPING TEST SUITE IMMEDIATELY",
              "CRITICAL"
            );
            throw new Error(`Test ${testFile} failed - stopping immediately`);
          }
          this.results.total++;
        } catch (error) {
          this.results.failed++;
          this.results.total++;
          this.failedAtSuite = testFile;
          const errorMessage = `❌ Failed to run ${testFile}: ${error.message}`;
          this.log(errorMessage, "ERROR");
          this.errors.push(errorMessage);
          this.testDetails.push({
            test: testFile,
            status: "ERROR",
            error: error.message,
          });

          // STOP IMMEDIATELY on any error
          this.log(
            "🚨 ERROR DETECTED - STOPPING TEST SUITE IMMEDIATELY",
            "CRITICAL"
          );
          throw error;
        }
      }

      // If we get here, all tests passed
      const duration = Date.now() - startTime;
      this.displayResults(duration);
      return true;
    } catch (error) {
      this.log(`💥 FATAL ERROR: ${error.message}`, "CRITICAL");

      // If it's a build error, ensure it's logged
      if (error.buildType || error.buildCommand) {
        await this.logBuildError(error);
      }

      // Mark as failed when fatal error occurs
      this.results.failed = 1;
      this.results.total = 1;
      const duration = Date.now() - startTime;

      // CRITICAL: Save log files even on fatal error
      // But check if test suite already saved logs to avoid duplicates
      // Pass testInstance if available (from error.testInstance)
      const testInstance = error.testInstance || null;
      await this.saveFatalErrorLog(error, duration, startTime, testInstance);

      this.displayResults(duration);
      return false;
    } finally {
      console.log("🔄 Entering finally block - starting cleanup...");
      await this.cleanup();
      console.log("🔄 Cleanup complete in finally block");
    }
  }

  /**
   * Check if test suite already saved logs (to avoid duplicates)
   */
  async hasTestSuiteSavedLogs() {
    try {
      const { join } = await import("path");
      const { readdir, stat } = await import("fs/promises");
      const { existsSync } = await import("fs");

      const logsDir = join(this.testSuiteRoot, "test-logs");
      if (!existsSync(logsDir)) {
        return false;
      }

      // Check if any log files were created in the last 5 seconds
      // (test suite saves logs in finally block, so they should be recent)
      const files = await readdir(logsDir);
      const now = Date.now();
      const fiveSecondsAgo = now - 5000;

      for (const file of files) {
        if (
          file.startsWith("test-errors-") ||
          file.startsWith("test-results-")
        ) {
          const filePath = join(logsDir, file);
          const stats = await stat(filePath);
          // If file was modified in the last 5 seconds, test suite likely saved it
          if (stats.mtimeMs > fiveSecondsAgo) {
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      // If we can't check, assume logs weren't saved (safer to save than not)
      return false;
    }
  }

  /**
   * Save fatal error logs when test suite crashes before tests can run
   * Only saves if test suite didn't already save logs
   */
  async saveFatalErrorLog(error, duration, startTime, testInstance = null) {
    try {
      // Check if test suite already saved logs (to avoid duplicates)
      // First check the logger's filesSaved flag if test instance is available
      let logsAlreadySaved = false;
      if (
        testInstance &&
        testInstance.logger &&
        testInstance.logger.filesSaved === true
      ) {
        logsAlreadySaved = true;
        this.log(
          "📄 Test suite logger already saved logs - skipping duplicate fatal error log",
          "INFO"
        );
      } else {
        // Fallback: check for recent log files
        logsAlreadySaved = await this.hasTestSuiteSavedLogs();
        if (logsAlreadySaved) {
          this.log(
            "📄 Test suite already saved logs (detected via file check) - skipping duplicate fatal error log",
            "INFO"
          );
        }
      }

      if (logsAlreadySaved) {
        return;
      }

      const { join } = await import("path");
      const { writeFile, mkdir } = await import("fs/promises");
      const { existsSync } = await import("fs");

      const logsDir = join(this.testSuiteRoot, "test-logs");
      if (!existsSync(logsDir)) {
        await mkdir(logsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const testResultsFile = join(logsDir, `test-results-${timestamp}.txt`);
      const testErrorsFile = join(logsDir, `test-errors-${timestamp}.txt`);
      const testResultsJsonFile = join(
        logsDir,
        `test-results-${timestamp}.json`
      );

      // Create error report
      let errorReport = "=".repeat(80) + "\n";
      errorReport += "KRAPI TEST SUITE - FATAL ERROR\n";
      errorReport += "=".repeat(80) + "\n\n";
      errorReport += `Timestamp: ${new Date().toISOString()}\n`;
      errorReport += `Duration: ${duration}ms\n\n`;
      errorReport += "ERROR MESSAGE\n";
      errorReport += "-".repeat(80) + "\n";
      errorReport += `${error.message}\n\n`;

      if (error.stack) {
        errorReport += "STACK TRACE\n";
        errorReport += "-".repeat(80) + "\n";
        errorReport += `${error.stack}\n\n`;
      }

      if (error.buildType || error.buildCommand) {
        errorReport += "BUILD INFORMATION\n";
        errorReport += "-".repeat(80) + "\n";
        errorReport += `Build Type: ${error.buildType || "unknown"}\n`;
        errorReport += `Build Command: ${error.buildCommand || "unknown"}\n\n`;
        if (error.buildOutput) {
          errorReport += "BUILD OUTPUT\n";
          errorReport += "-".repeat(80) + "\n";
          errorReport += `${error.buildOutput}\n\n`;
        }
      }

      // Add test runner state
      errorReport += "TEST RUNNER STATE\n";
      errorReport += "-".repeat(80) + "\n";
      errorReport += `Total Suites: ${this.totalSuites}\n`;
      errorReport += `Passed: ${this.results.passed}\n`;
      errorReport += `Failed: ${this.results.failed}\n`;
      errorReport += `Total: ${this.results.total}\n`;
      if (this.failedAtSuite) {
        errorReport += `Failed At Suite: ${this.failedAtSuite}\n`;
      }
      if (this.errors.length > 0) {
        errorReport += `\nErrors:\n`;
        this.errors.forEach((err, idx) => {
          errorReport += `  ${idx + 1}. ${err}\n`;
        });
      }

      errorReport += "\n" + "=".repeat(80) + "\n";
      errorReport += "END OF FATAL ERROR REPORT\n";
      errorReport += "=".repeat(80) + "\n";

      // Create results report
      let resultsReport = "=".repeat(80) + "\n";
      resultsReport += "KRAPI TEST SUITE - TEST RESULTS (FATAL ERROR)\n";
      resultsReport += "=".repeat(80) + "\n\n";
      resultsReport += `Timestamp: ${new Date().toISOString()}\n`;
      resultsReport += `Duration: ${duration}ms\n\n`;
      resultsReport += "SUMMARY\n";
      resultsReport += "-".repeat(80) + "\n";
      resultsReport += `Total Suites: ${this.totalSuites}\n`;
      resultsReport += `Passed: ${this.results.passed}\n`;
      resultsReport += `Failed: ${this.results.failed}\n`;
      resultsReport += `Total: ${this.results.total}\n\n`;
      resultsReport += "FATAL ERROR\n";
      resultsReport += "-".repeat(80) + "\n";
      resultsReport += `${error.message}\n`;
      if (error.stack) {
        resultsReport += `\nStack Trace:\n${error.stack}\n`;
      }
      resultsReport += "\n" + "=".repeat(80) + "\n";

      // Create JSON results
      const jsonResults = {
        summary: {
          totalTests: this.results.total,
          passed: this.results.passed,
          failed: this.results.failed,
          successRate:
            this.results.total > 0
              ? `${((this.results.passed / this.results.total) * 100).toFixed(
                  1
                )}%`
              : "0.0%",
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          fatalError: true,
        },
        testResults: this.testDetails.map((detail) => ({
          test: detail.test,
          status: detail.status,
          error: detail.error,
        })),
        individualTestResults: this.individualTestResults,
        fatalError: {
          message: error.message,
          stack: error.stack,
          buildType: error.buildType,
          buildCommand: error.buildCommand,
          buildOutput: error.buildOutput,
        },
        errors: this.errors,
        serviceLogs: this.serviceLogs,
      };

      // Write all files
      await writeFile(testErrorsFile, errorReport, "utf-8");
      await writeFile(testResultsFile, resultsReport, "utf-8");
      await writeFile(
        testResultsJsonFile,
        JSON.stringify(jsonResults, null, 2),
        "utf-8"
      );

      this.log(`📄 Fatal error logged to: ${testErrorsFile}`, "INFO");
      this.log(`📄 Test results saved to: ${testResultsFile}`, "INFO");
      this.log(`📄 JSON results saved to: ${testResultsJsonFile}`, "INFO");
    } catch (logError) {
      // If we can't log the fatal error, at least log that we tried
      console.error(
        "💥 CRITICAL: Could not save fatal error log:",
        logError.message
      );
      console.error("Original error:", error.message);
    }
  }

  /**
   * Log build errors to a file when builds fail
   */
  async logBuildError(buildError) {
    try {
      const { join } = await import("path");
      const { writeFile, mkdir } = await import("fs/promises");
      const { existsSync } = await import("fs");

      const logsDir = join(this.testSuiteRoot, "test-logs");
      if (!existsSync(logsDir)) {
        await mkdir(logsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const buildErrorFile = join(logsDir, `build-error-${timestamp}.txt`);

      let errorReport = "=".repeat(80) + "\n";
      errorReport += "KRAPI TEST SUITE - BUILD ERROR\n";
      errorReport += "=".repeat(80) + "\n\n";
      errorReport += `Timestamp: ${new Date().toISOString()}\n\n`;
      errorReport += `Build Type: ${buildError.buildType || "unknown"}\n`;
      errorReport += `Build Command: ${
        buildError.buildCommand || "unknown"
      }\n\n`;
      errorReport += "ERROR MESSAGE\n";
      errorReport += "-".repeat(80) + "\n";
      errorReport += `${buildError.message}\n\n`;

      if (buildError.buildOutput) {
        errorReport += "BUILD OUTPUT\n";
        errorReport += "-".repeat(80) + "\n";
        errorReport += `${buildError.buildOutput}\n\n`;
      }

      if (buildError.stack) {
        errorReport += "STACK TRACE\n";
        errorReport += "-".repeat(80) + "\n";
        errorReport += `${buildError.stack}\n\n`;
      }

      errorReport += "=".repeat(80) + "\n";
      errorReport += "END OF BUILD ERROR REPORT\n";
      errorReport += "=".repeat(80) + "\n";

      await writeFile(buildErrorFile, errorReport, "utf-8");
      this.log(`📄 Build error logged to: ${buildErrorFile}`, "INFO");

      // Also create a minimal test results file so the test runner can find it
      const testResultsFile = join(logsDir, `test-results-${timestamp}.txt`);
      const testErrorsFile = join(logsDir, `test-errors-${timestamp}.txt`);

      let resultsReport = "=".repeat(80) + "\n";
      resultsReport += "KRAPI TEST SUITE - BUILD FAILED\n";
      resultsReport += "=".repeat(80) + "\n\n";
      resultsReport += "SUMMARY\n";
      resultsReport += "-".repeat(80) + "\n";
      resultsReport += "Total Tests: 0\n";
      resultsReport += "Passed: 0\n";
      resultsReport += "Failed: 0\n";
      resultsReport += "Success Rate: 0%\n";
      resultsReport += `Duration: 0ms\n`;
      resultsReport += `Timestamp: ${new Date().toISOString()}\n\n`;
      resultsReport += "BUILD ERROR\n";
      resultsReport += "-".repeat(80) + "\n";
      resultsReport += `Build Type: ${buildError.buildType || "unknown"}\n`;
      resultsReport += `Error: ${buildError.message}\n`;
      if (buildError.buildOutput) {
        resultsReport += `\nBuild Output:\n${buildError.buildOutput.substring(
          0,
          2000
        )}${buildError.buildOutput.length > 2000 ? "\n... (truncated)" : ""}\n`;
      }
      resultsReport += "\n" + "=".repeat(80) + "\n";

      await writeFile(testResultsFile, resultsReport, "utf-8");
      await writeFile(testErrorsFile, errorReport, "utf-8");
    } catch (logError) {
      // If we can't log the build error, at least log that we tried
      console.error("Failed to log build error:", logError);
    }
  }

  async cleanup() {
    console.log("🔄 cleanup() method called");
    console.log("🔄 Services object:", this.services ? "exists" : "null");
    this.log("🧹 Cleaning up test environment...", "INFO");

    try {
      console.log("🔄 Inside try block");
      // Stop services with proper graceful shutdown
      if (this.services.backend) {
        console.log("🔄 Stopping backend...");
        console.log("🔄 Backend exitCode:", this.services.backend.exitCode);
        console.log("🔄 Backend killed:", this.services.backend.killed);
        try {
          this.log("   Stopping backend service gracefully...", "INFO");
          // Check if process is still alive before trying to kill
          if (
            this.services.backend.exitCode === null &&
            !this.services.backend.killed
          ) {
            console.log("🔄 Sending SIGTERM to backend...");
            this.services.backend.kill("SIGTERM");
            console.log("🔄 SIGTERM sent successfully");
            // Wait for graceful shutdown (backend needs time to close DB connections)
            console.log("🔄 Waiting 5s for backend to shutdown...");
            await new Promise((resolve) => setTimeout(resolve, 5000));
            console.log("🔄 Wait complete");

            // Check if process is still running
            console.log("🔄 Checking if backend still running...");
            console.log(
              "🔄 Backend killed:",
              this.services.backend.killed,
              "exitCode:",
              this.services.backend.exitCode
            );
            if (
              !this.services.backend.killed &&
              this.services.backend.exitCode === null
            ) {
              console.log("🔄 Backend still running, sending SIGKILL...");
              this.log(
                "   Backend still running, sending SIGKILL...",
                "WARNING"
              );
              this.services.backend.kill("SIGKILL");
              console.log("🔄 SIGKILL sent, waiting 2s...");
              // Wait after force kill
              await new Promise((resolve) => setTimeout(resolve, 2000));
              console.log("🔄 SIGKILL wait complete");
            } else {
              console.log("🔄 Backend stopped normally");
            }
          } else {
            console.log(
              "🔄 Backend already stopped (exitCode:",
              this.services.backend.exitCode,
              ")"
            );
          }
          console.log("🔄 Backend cleanup complete");
          this.log("✅ Backend service stopped", "SUCCESS");
        } catch (error) {
          console.log("🔄 Error stopping backend:", error.message);
          this.log(
            `   ⚠️  Error stopping backend: ${error.message}`,
            "WARNING"
          );
        }
      }

      if (this.services.frontend) {
        console.log("🔄 Stopping frontend...");
        console.log(
          "🔄 Frontend exitCode:",
          this.services.frontend.exitCode,
          "killed:",
          this.services.frontend.killed
        );
        try {
          this.log("   Stopping frontend service gracefully...", "INFO");
          if (
            this.services.frontend.exitCode === null &&
            !this.services.frontend.killed
          ) {
            console.log("🔄 Sending SIGTERM to frontend...");
            this.services.frontend.kill("SIGTERM");
            console.log("🔄 SIGTERM sent, waiting 3s...");
            // Wait for graceful shutdown
            await new Promise((resolve) => setTimeout(resolve, 3000));
            console.log("🔄 Frontend wait complete");

            // Check if process is still running
            if (
              !this.services.frontend.killed &&
              this.services.frontend.exitCode === null
            ) {
              console.log("🔄 Frontend still running, sending SIGKILL...");
              this.log(
                "   Frontend still running, sending SIGKILL...",
                "WARNING"
              );
              this.services.frontend.kill("SIGKILL");
              // Wait after force kill
              await new Promise((resolve) => setTimeout(resolve, 2000));
            } else {
              console.log("🔄 Frontend stopped normally");
            }
          } else {
            console.log("🔄 Frontend already stopped");
          }
          console.log("🔄 Frontend cleanup complete");
          this.log("✅ Frontend service stopped", "SUCCESS");
        } catch (error) {
          console.log("🔄 Error stopping frontend:", error.message);
          this.log(
            `   ⚠️  Error stopping frontend: ${error.message}`,
            "WARNING"
          );
        }
      }

      // Kill any remaining processes on ports (in case they're orphaned)
      console.log("🔄 Killing orphaned processes on ports...");
      this.log("   Checking for orphaned processes on ports...", "INFO");
      try {
        await this.killProcessOnPort(3498); // Frontend
        await this.killProcessOnPort(3470); // Backend
        console.log("🔄 Port cleanup complete");
      } catch (error) {
        console.log("🔄 Error killing processes on ports:", error.message);
        this.log(
          `   ⚠️  Error killing processes on ports: ${error.message}`,
          "WARNING"
        );
      }

      // Wait longer for file handles to be fully released (especially on Windows)
      // SQLite on Windows can take time to release file locks
      console.log("🔄 Waiting for file handles to be released...");
      this.log("   Waiting for file handles to be released...", "INFO");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log("🔄 File handle wait complete");

      // Now cleanup database files after services are fully stopped
      console.log("🔄 Cleaning up database files...");
      try {
        await this.cleanupDatabaseFiles();
        console.log("🔄 Database cleanup complete");
      } catch (error) {
        console.log("🔄 Error cleaning up database files:", error.message);
        this.log(
          `   ⚠️  Error cleaning up database files: ${error.message}`,
          "WARNING"
        );
      }

      console.log("🔄 All cleanup complete");
      this.log("✅ Cleanup complete", "SUCCESS");
    } catch (error) {
      console.log("🔄 Error during cleanup:", error.message);
      this.log(`⚠️  Error during cleanup: ${error.message}`, "WARNING");
      // Don't throw - cleanup errors shouldn't fail the test suite
    }
  }

  displayResults(duration) {
    this.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "INFO"
    );
    this.log("📊 TEST RESULTS SUMMARY", "INFO");
    this.log(`   Test Suites: ${this.results.total}`, "INFO");
    this.log(
      `   Individual Tests: ${this.individualTestResults.length}`,
      "INFO"
    );
    this.log(`   Passed: ${this.results.passed}`, "INFO");
    this.log(`   Failed: ${this.results.failed}`, "INFO");

    if (this.failedAtSuite) {
      const remainingSuites = this.totalSuites - this.results.total;
      this.log(`   Remaining Suites: ${remainingSuites}`, "INFO");
    }

    this.log(`   Duration: ${duration}ms`, "INFO");

    if (this.results.failed === 0) {
      this.log("🎉 ALL TESTS PASSED SUCCESSFULLY!", "SUCCESS");
    } else {
      this.log("❌ SOME TESTS FAILED - SEE ERRORS ABOVE", "ERROR");

      // Display collected errors at the end
      if (this.errors.length > 0) {
        this.log("", "INFO");
        this.log("🔍 ERROR SUMMARY:", "ERROR");
        this.errors.forEach((error, index) => {
          this.log(`   ${index + 1}. ${error}`, "ERROR");
        });
      }

      // Add error source analysis
      this.analyzeErrorSources();
    }

    // Log completion - no setTimeout needed, caller will wait
    this.log("✅ Results display completed", "SUCCESS");
  }

  /**
   * Analyze errors by source (SDK vs Server vs Network)
   */
  analyzeErrorSources() {
    try {
      // Read the latest JSON results file to get error classification
      const testLogsDir = join(__dirname, "test-logs");
      if (!existsSync(testLogsDir)) {
        return;
      }

      // Find the latest JSON results file
      const files = readdirSync(testLogsDir);
      const jsonFiles = files
        .filter((f) => f.startsWith("test-results-") && f.endsWith(".json"))
        .sort()
        .reverse();

      if (jsonFiles.length === 0) {
        return;
      }

      const latestJsonFile = join(testLogsDir, jsonFiles[0]);
      const jsonContent = readFileSync(latestJsonFile, "utf-8");
      const results = JSON.parse(jsonContent);

      // Group failed tests by error source
      const errorsBySource = {
        SDK: [],
        SERVER: [],
        NETWORK: [],
        UNKNOWN: [],
      };

      const failedTests = (results.testResults || []).filter(
        (t) => t.status === "FAILED"
      );
      failedTests.forEach((test) => {
        const source = test.errorSource || "UNKNOWN";
        if (errorsBySource[source]) {
          errorsBySource[source].push({
            test: test.test,
            category: test.errorCategory || "UNKNOWN",
            fixLocation: test.fixLocation || "UNKNOWN",
            error: test.error || "Unknown error",
          });
        } else {
          errorsBySource.UNKNOWN.push({
            test: test.test,
            category: test.errorCategory || "UNKNOWN",
            fixLocation: test.fixLocation || "UNKNOWN",
            error: test.error || "Unknown error",
          });
        }
      });

      // Display error source summary
      this.log("", "INFO");
      this.log("📋 ERROR SOURCE ANALYSIS:", "INFO");
      this.log(`   SDK Issues: ${errorsBySource.SDK.length}`, "INFO");
      this.log(`   Server Issues: ${errorsBySource.SERVER.length}`, "INFO");
      this.log(`   Network Issues: ${errorsBySource.NETWORK.length}`, "INFO");
      this.log(`   Unknown Issues: ${errorsBySource.UNKNOWN.length}`, "INFO");

      // Display categorized errors
      if (errorsBySource.SDK.length > 0) {
        this.log("", "INFO");
        this.log("   🔧 SDK ISSUES (fix in @smartsamurai/krapi-sdk):", "INFO");
        errorsBySource.SDK.slice(0, 5).forEach((err, idx) => {
          this.log(`      ${idx + 1}. ${err.test}`, "INFO");
          this.log(
            `         Category: ${err.category} | Fix: ${err.fixLocation}`,
            "INFO"
          );
        });
        if (errorsBySource.SDK.length > 5) {
          this.log(
            `      ... and ${errorsBySource.SDK.length - 5} more SDK issues`,
            "INFO"
          );
        }
      }

      if (errorsBySource.SERVER.length > 0) {
        this.log("", "INFO");
        this.log("   🖥️  SERVER ISSUES (fix in backend/frontend):", "INFO");
        errorsBySource.SERVER.slice(0, 5).forEach((err, idx) => {
          this.log(`      ${idx + 1}. ${err.test}`, "INFO");
          this.log(
            `         Category: ${err.category} | Fix: ${err.fixLocation}`,
            "INFO"
          );
        });
        if (errorsBySource.SERVER.length > 5) {
          this.log(
            `      ... and ${
              errorsBySource.SERVER.length - 5
            } more server issues`,
            "INFO"
          );
        }
      }

      if (errorsBySource.NETWORK.length > 0) {
        this.log("", "INFO");
        this.log("   🌐 NETWORK ISSUES (check connectivity):", "INFO");
        errorsBySource.NETWORK.slice(0, 5).forEach((err, idx) => {
          this.log(`      ${idx + 1}. ${err.test}`, "INFO");
        });
      }
    } catch (error) {
      // Don't fail if error analysis fails
      this.log(
        `   ⚠️  Could not analyze error sources: ${error.message}`,
        "WARNING"
      );
    }
  }
}

/**
 * Standalone function to save fatal error logs (can be called from global handlers)
 */
async function saveFatalErrorLogStandalone(error, testSuiteRoot) {
  try {
    const { join } = await import("path");
    const { writeFile, mkdir } = await import("fs/promises");
    const { existsSync } = await import("fs");

    const logsDir = join(testSuiteRoot, "test-logs");
    if (!existsSync(logsDir)) {
      await mkdir(logsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const testErrorsFile = join(logsDir, `test-errors-${timestamp}.txt`);
    const testResultsFile = join(logsDir, `test-results-${timestamp}.txt`);
    const testResultsJsonFile = join(logsDir, `test-results-${timestamp}.json`);

    // Create error report
    let errorReport = "=".repeat(80) + "\n";
    errorReport += "KRAPI TEST SUITE - UNCAUGHT FATAL ERROR\n";
    errorReport += "=".repeat(80) + "\n\n";
    errorReport += `Timestamp: ${new Date().toISOString()}\n\n`;
    errorReport += "ERROR MESSAGE\n";
    errorReport += "-".repeat(80) + "\n";
    errorReport += `${error.message || String(error)}\n\n`;

    if (error.stack) {
      errorReport += "STACK TRACE\n";
      errorReport += "-".repeat(80) + "\n";
      errorReport += `${error.stack}\n\n`;
    }

    errorReport += "\n" + "=".repeat(80) + "\n";
    errorReport += "END OF FATAL ERROR REPORT\n";
    errorReport += "=".repeat(80) + "\n";

    // Create results report
    let resultsReport = "=".repeat(80) + "\n";
    resultsReport += "KRAPI TEST SUITE - TEST RESULTS (UNCAUGHT FATAL ERROR)\n";
    resultsReport += "=".repeat(80) + "\n\n";
    resultsReport += `Timestamp: ${new Date().toISOString()}\n\n`;
    resultsReport += "FATAL ERROR\n";
    resultsReport += "-".repeat(80) + "\n";
    resultsReport += `${error.message || String(error)}\n`;
    if (error.stack) {
      resultsReport += `\nStack Trace:\n${error.stack}\n`;
    }
    resultsReport += "\n" + "=".repeat(80) + "\n";

    // Create JSON results
    const jsonResults = {
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 1,
        successRate: "0.0%",
        duration: "0ms",
        timestamp: new Date().toISOString(),
        fatalError: true,
        uncaughtException: true,
      },
      testResults: [],
      individualTestResults: [],
      fatalError: {
        message: error.message || String(error),
        stack: error.stack,
      },
      errors: [error.message || String(error)],
    };

    // Write all files
    await writeFile(testErrorsFile, errorReport, "utf-8");
    await writeFile(testResultsFile, resultsReport, "utf-8");
    await writeFile(
      testResultsJsonFile,
      JSON.stringify(jsonResults, null, 2),
      "utf-8"
    );

    console.error(`📄 Fatal error logged to: ${testErrorsFile}`);
    console.error(`📄 Test results saved to: ${testResultsFile}`);
    console.error(`📄 JSON results saved to: ${testResultsJsonFile}`);
  } catch (logError) {
    // If we can't log the fatal error, at least log that we tried
    console.error(
      "💥 CRITICAL: Could not save fatal error log:",
      logError.message
    );
    console.error("Original error:", error.message || String(error));
  }
}

// Store test runner instance globally so error handlers can access it
let globalTestRunner = null;

// Add global error handlers to catch any unhandled errors
// Note: These should only trigger for truly unexpected errors
process.on("uncaughtException", async (error) => {
  console.error("💥 UNCAUGHT EXCEPTION:", error);
  console.error("Stack:", error.stack);

  // Try to save logs before exiting
  if (globalTestRunner) {
    try {
      await globalTestRunner.saveFatalErrorLog(
        error,
        Date.now() - (globalTestRunner.startTime || Date.now()),
        globalTestRunner.startTime || Date.now()
      );
    } catch (logError) {
      console.error("Failed to save logs via runner:", logError);
    }
  } else {
    // Fallback: save logs directly using __dirname from module scope
    await saveFatalErrorLogStandalone(error, __dirname);
  }

  // Give a moment for logs to be written
  await new Promise((resolve) => setTimeout(resolve, 1000));
  process.exit(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("💥 UNHANDLED REJECTION:", reason);
  const error = reason instanceof Error ? reason : new Error(String(reason));
  if (error.stack) {
    console.error("Stack:", error.stack);
  }

  // Try to save logs before exiting
  if (globalTestRunner) {
    try {
      await globalTestRunner.saveFatalErrorLog(
        error,
        Date.now() - (globalTestRunner.startTime || Date.now()),
        globalTestRunner.startTime || Date.now()
      );
    } catch (logError) {
      console.error("Failed to save logs via runner:", logError);
    }
  } else {
    // Fallback: save logs directly using __dirname from module scope
    await saveFatalErrorLogStandalone(error, __dirname);
  }

  // Give a moment for logs to be written
  await new Promise((resolve) => setTimeout(resolve, 1000));
  process.exit(1);
});

/**
 * Find and read the latest test log file
 */
async function readLatestTestLog() {
  try {
    const testLogsDir = join(__dirname, "test-logs");
    if (!existsSync(testLogsDir)) {
      return null;
    }

    const files = await readdir(testLogsDir);
    const errorFiles = files
      .filter((f) => f.startsWith("test-errors-") && f.endsWith(".txt"))
      .sort()
      .reverse(); // Most recent first

    if (errorFiles.length === 0) {
      return null;
    }

    const latestErrorFile = join(testLogsDir, errorFiles[0]);
    const errorContent = await readFile(latestErrorFile, "utf-8");

    // Also read JSON file to get error classification
    const jsonFiles = files
      .filter((f) => f.startsWith("test-results-") && f.endsWith(".json"))
      .sort()
      .reverse();

    let errorAnalysis = null;
    if (jsonFiles.length > 0) {
      try {
        const latestJsonFile = join(testLogsDir, jsonFiles[0]);
        const jsonContent = await readFile(latestJsonFile, "utf-8");
        const results = JSON.parse(jsonContent);

        // Extract error source summary
        const failedTests = (results.testResults || []).filter(
          (t) => t.status === "FAILED"
        );
        const errorsBySource = {
          SDK: 0,
          SERVER: 0,
          NETWORK: 0,
          UNKNOWN: 0,
        };

        failedTests.forEach((test) => {
          const source = test.errorSource || "UNKNOWN";
          if (errorsBySource[source] !== undefined) {
            errorsBySource[source]++;
          } else {
            errorsBySource.UNKNOWN++;
          }
        });

        errorAnalysis = {
          total: failedTests.length,
          bySource: errorsBySource,
          failedTests: failedTests.map((t) => ({
            test: t.test,
            source: t.errorSource || "UNKNOWN",
            category: t.errorCategory || "UNKNOWN",
            fixLocation: t.fixLocation || "UNKNOWN",
            error: t.error || "Unknown error",
          })),
        };
      } catch (error) {
        // Ignore JSON parsing errors
        console.warn(
          "⚠️  Could not parse JSON results for error analysis:",
          error.message
        );
      }
    }

    const resultFiles = files
      .filter((f) => f.startsWith("test-results-") && f.endsWith(".txt"))
      .sort()
      .reverse();

    let resultContent = null;
    if (resultFiles.length > 0) {
      const latestResultFile = join(testLogsDir, resultFiles[0]);
      resultContent = await readFile(latestResultFile, "utf-8");
    }

    return {
      errorFile: latestErrorFile,
      errorContent,
      resultContent,
      errorAnalysis,
      timestamp: errorFiles[0].match(/test-errors-(.+)\.txt/)?.[1] || "unknown",
    };
  } catch (error) {
    console.error("⚠️  Failed to read latest test log:", error.message);
    return null;
  }
}

// Run the test suite
// CRITICAL: This must be a top-level await or properly handled promise
// The process will NOT exit until the promise resolves/rejects
(async () => {
  let runner = null;
  try {
    runner = new ComprehensiveTestRunner();
    globalTestRunner = runner; // Set early so error handlers can access it
    const success = await runner.runAllTests();

    // Wait a moment for any final output to flush and log files to be saved
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Read and display the latest test log file
    console.log("\n" + "=".repeat(80));
    console.log("📋 READING LATEST TEST LOG FILE");
    console.log("=".repeat(80));

    const latestLog = await readLatestTestLog();
    if (latestLog) {
      console.log(`\n📄 Latest error log: ${latestLog.errorFile}`);
      console.log(`   Timestamp: ${latestLog.timestamp}`);

      // Display error source analysis if available
      if (latestLog.errorAnalysis) {
        console.log("\n" + "=".repeat(80));
        console.log("📊 ERROR SOURCE ANALYSIS");
        console.log("=".repeat(80));
        console.log(`Total Failed Tests: ${latestLog.errorAnalysis.total}`);
        console.log(
          `   SDK Issues: ${latestLog.errorAnalysis.bySource.SDK} (fix in @smartsamurai/krapi-sdk)`
        );
        console.log(
          `   Server Issues: ${latestLog.errorAnalysis.bySource.SERVER} (fix in backend/frontend)`
        );
        console.log(
          `   Network Issues: ${latestLog.errorAnalysis.bySource.NETWORK} (check connectivity)`
        );
        console.log(
          `   Unknown Issues: ${latestLog.errorAnalysis.bySource.UNKNOWN} (manual investigation)`
        );

        // Show categorized errors with fix location hints
        if (latestLog.errorAnalysis.failedTests.length > 0) {
          console.log("\n" + "-".repeat(80));
          console.log("CATEGORIZED ERRORS WITH FIX LOCATIONS:");
          console.log("-".repeat(80));

          const bySource = {
            SDK: latestLog.errorAnalysis.failedTests.filter(
              (t) => t.source === "SDK"
            ),
            SERVER: latestLog.errorAnalysis.failedTests.filter(
              (t) => t.source === "SERVER"
            ),
            NETWORK: latestLog.errorAnalysis.failedTests.filter(
              (t) => t.source === "NETWORK"
            ),
            UNKNOWN: latestLog.errorAnalysis.failedTests.filter(
              (t) => t.source === "UNKNOWN"
            ),
          };

          if (bySource.SDK.length > 0) {
            console.log("\n🔧 SDK ISSUES:");
            bySource.SDK.slice(0, 10).forEach((err, idx) => {
              console.log(`   ${idx + 1}. ${err.test}`);
              console.log(
                `      Category: ${err.category} | Fix Location: ${err.fixLocation}`
              );
              console.log(
                `      Error: ${err.error.substring(0, 100)}${
                  err.error.length > 100 ? "..." : ""
                }`
              );
            });
            if (bySource.SDK.length > 10) {
              console.log(
                `   ... and ${bySource.SDK.length - 10} more SDK issues`
              );
            }
          }

          if (bySource.SERVER.length > 0) {
            console.log("\n🖥️  SERVER ISSUES:");
            bySource.SERVER.slice(0, 10).forEach((err, idx) => {
              console.log(`   ${idx + 1}. ${err.test}`);
              console.log(
                `      Category: ${err.category} | Fix Location: ${err.fixLocation}`
              );
              console.log(
                `      Error: ${err.error.substring(0, 100)}${
                  err.error.length > 100 ? "..." : ""
                }`
              );
            });
            if (bySource.SERVER.length > 10) {
              console.log(
                `   ... and ${bySource.SERVER.length - 10} more server issues`
              );
            }
          }

          if (bySource.NETWORK.length > 0) {
            console.log("\n🌐 NETWORK ISSUES:");
            bySource.NETWORK.slice(0, 10).forEach((err, idx) => {
              console.log(`   ${idx + 1}. ${err.test}`);
              console.log(
                `      Error: ${err.error.substring(0, 100)}${
                  err.error.length > 100 ? "..." : ""
                }`
              );
            });
          }

          if (bySource.UNKNOWN.length > 0) {
            console.log("\n❓ UNKNOWN ISSUES:");
            bySource.UNKNOWN.slice(0, 5).forEach((err, idx) => {
              console.log(`   ${idx + 1}. ${err.test}`);
              console.log(
                `      Error: ${err.error.substring(0, 100)}${
                  err.error.length > 100 ? "..." : ""
                }`
              );
            });
          }
        }
      }

      console.log("\n" + "-".repeat(80));
      console.log("FULL ERROR LOG:");
      console.log("-".repeat(80));
      console.log(latestLog.errorContent);
      console.log("-".repeat(80));
    } else {
      console.log("⚠️  No test log files found");
    }

    // Log the exit code we're about to use
    console.log(
      `\n✅ Test runner completing with exit code: ${success ? 0 : 1}`
    );

    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("💥 FATAL ERROR:", error);
    console.error("Stack:", error.stack);

    // Try to save logs before exiting
    if (runner) {
      try {
        const startTime = runner.startTime || Date.now();
        await runner.saveFatalErrorLog(
          error,
          Date.now() - startTime,
          startTime
        );
      } catch (logError) {
        console.error("Failed to save logs via runner:", logError);
        // Fallback to standalone
        await saveFatalErrorLogStandalone(error, __dirname);
      }
    } else {
      // Fallback: save logs directly using standalone function
      await saveFatalErrorLogStandalone(error, __dirname);
    }

    // Wait a moment for error output to flush and logs to be written
    await new Promise((resolve) => setTimeout(resolve, 2000));
    process.exit(1);
  }
})();
