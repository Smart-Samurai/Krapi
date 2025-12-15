#!/usr/bin/env node

/**
 * Frontend UI Test Runner - Main Orchestrator
 * 
 * Coordinates all test components to run comprehensive browser-based tests
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { CONFIG } from "./config.js";
import TestLogger from "./test-logger.js";
import { setupTestDataWithReset, resetTestData } from "./tests/frontend-ui/test-data-setup.js";

// Import modular components
import { buildFrontend } from "./lib/frontend-build.js";
import { cleanupPorts } from "./lib/port-cleanup.js";
import { startBackend, stopBackend } from "./lib/backend-process.js";
import { startFrontend, stopFrontend } from "./lib/frontend-process.js";
import { initializeBrowser, checkFrontendHealth, closeBrowser } from "./lib/browser-manager.js";
import { createTestSuite } from "./lib/test-suite-factory.js";
import { runAllPhases } from "./lib/test-phases.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class FrontendUITestRunner {
  constructor() {
    this.projectRoot = join(__dirname, "..");
    this.testSuiteRoot = __dirname;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.testSuite = null;
    this.startTime = null;
    this.backendProcess = null;
    this.frontendProcess = null;
    this.packageManager = null;
    this.results = {
      passed: 0,
      failed: 0,
      errors: 0,
      total: 0,
    };
    this.maxFailureRate = parseFloat(process.env.MAX_FAILURE_RATE || "50");
    this.shouldExitEarly = false;
    this.criticalTestsEnabled = process.env.CRITICAL_TESTS_ENABLED !== "false";
    this.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      frontendUrl: CONFIG.FRONTEND_URL,
      timestamp: new Date().toISOString(),
      testMode: "frontend-ui-browser-testing",
    };
    this.logger = new TestLogger({
      verbose: process.env.VERBOSE === "true",
      showPassed: process.env.HIDE_PASSED !== "true",
      grouped: true,
      minimal: process.env.VERBOSE !== "true",
      environment: this.environment,
    });
  }

  log(message, level = "INFO") {
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

  checkFailureRate() {
    if (this.results.total === 0) return false;
    const failureRate = (this.results.failed / this.results.total) * 100;
    if (this.results.total >= 3 && failureRate > this.maxFailureRate) {
      this.shouldExitEarly = true;
      return true;
    }
    return false;
  }

  async cleanupDatabases() {
    try {
      const fs = await import("fs");
      const path = await import("path");
      
      const projectsDbDir = path.join(this.projectRoot, "backend-server", "data", "projects");
      const mainDbPath = path.join(this.projectRoot, "backend-server", "data", "krapi.db");
      
      // Delete all project database files
      if (fs.existsSync(projectsDbDir)) {
        const files = fs.readdirSync(projectsDbDir);
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(projectsDbDir, file));
          } catch (e) {
            // Ignore errors - file might be locked
          }
        }
        this.log(`   Deleted ${files.length} project database files`, "INFO");
      }
      
      // Delete main database files (krapi.db, krapi.db-wal, krapi.db-shm)
      const mainDbFiles = [mainDbPath, `${mainDbPath}-wal`, `${mainDbPath}-shm`];
      for (const dbFile of mainDbFiles) {
        if (fs.existsSync(dbFile)) {
          try {
            fs.unlinkSync(dbFile);
          } catch (e) {
            // Ignore errors - file might be locked
          }
        }
      }
      this.log("   Main database deleted", "INFO");
      
      this.log("✅ Database cleanup complete", "SUCCESS");
    } catch (error) {
      this.log(`⚠️  Database cleanup error: ${error.message}`, "WARNING");
    }
  }

  async exitEarly(reason, isCritical = false) {
    this.log("", "INFO");
    this.log("═══════════════════════════════════════════════════════════", isCritical ? "CRITICAL" : "WARNING");
    this.log(`⚠️  EARLY EXIT: ${isCritical ? "Critical test failed" : "Failure rate threshold exceeded"}`, isCritical ? "CRITICAL" : "WARNING");
    this.log("═══════════════════════════════════════════════════════════", isCritical ? "CRITICAL" : "WARNING");
    this.log(`   Reason: ${reason}`, isCritical ? "CRITICAL" : "WARNING");
    if (!isCritical) {
      this.log(`   Max Failure Rate: ${this.maxFailureRate}%`, "WARNING");
      this.log(`   Current Failure Rate: ${this.results.total > 0 ? ((this.results.failed / this.results.total) * 100).toFixed(1) : 0}%`, "WARNING");
    }
    this.log(`   Tests Run: ${this.results.total}`, "INFO");
    this.log(`   Passed: ${this.results.passed}`, "SUCCESS");
    this.log(`   Failed: ${this.results.failed}`, "ERROR");
    this.log("", "INFO");
    if (isCritical) {
      this.log("   Critical tests are foundational - if they fail, other tests", "INFO");
      this.log("   that depend on them will also fail. Examples:", "INFO");
      this.log("   - Authentication failures prevent all authenticated tests", "INFO");
      this.log("   - Page existence failures prevent all page-specific tests", "INFO");
      this.log("   - Service health failures prevent all functionality tests", "INFO");
      this.log("", "INFO");
      this.log("   To disable critical test mode, set CRITICAL_TESTS_ENABLED=false", "INFO");
    } else {
      this.log("   This usually indicates:", "INFO");
      this.log("   - Services are not running", "INFO");
      this.log("   - Network connectivity issues", "INFO");
      this.log("   - Frontend/backend configuration problems", "INFO");
      this.log("", "INFO");
      this.log("   To disable early exit, set MAX_FAILURE_RATE=100", "INFO");
      this.log("   To adjust threshold, set MAX_FAILURE_RATE=<percentage>", "INFO");
    }
    this.log("═══════════════════════════════════════════════════════════", isCritical ? "CRITICAL" : "WARNING");
    
    await this.cleanup();
    process.exit(1);
  }

  async runAllTests() {
    this.startTime = Date.now();
    this.log("🚀 Starting Frontend UI Test Suite", "INFO");
    this.log(`   Frontend URL: ${CONFIG.FRONTEND_URL}`, "INFO");

    try {
      // Step 0: Clean up any existing processes on ports
      this.log("📦 Step 0: Cleaning up ports...", "INFO");
      await cleanupPorts(this.log.bind(this));

      // Step 0.5: Clean up old database files for fresh schema
      this.log("🗄️  Step 0.5: Cleaning up database files...", "INFO");
      await this.cleanupDatabases();

      // Step 1: Build frontend for production
      this.log("📦 Step 1: Building frontend for production...", "INFO");
      try {
        this.packageManager = await buildFrontend(this.projectRoot, this.log.bind(this));
        this.log("✅ Build step completed", "SUCCESS");
      } catch (error) {
        this.log(`❌ Build error: ${error.message}`, "ERROR");
        if (error.buildOutput) {
          this.log(`   Build output: ${error.buildOutput.substring(0, 500)}`, "ERROR");
        }
        if (this.criticalTestsEnabled) {
          await this.exitEarly(
            `Frontend build failed: ${error.message}. Cannot run tests without a successful build.`,
            true
          );
        } else {
          throw error;
        }
      }

      // Step 2: Start backend
      this.log("📦 Step 2: Starting backend...", "INFO");
      try {
        this.backendProcess = await startBackend(this.projectRoot, this.packageManager, this.log.bind(this));
        this.log("✅ Backend started", "SUCCESS");
      } catch (error) {
        this.log(`❌ Backend start error: ${error.message}`, "ERROR");
        if (this.criticalTestsEnabled) {
          await this.exitEarly(
            `Backend startup failed: ${error.message}. Cannot run tests without a running backend.`,
            true
          );
        } else {
          throw error;
        }
      }

      // Step 3: Start frontend in production mode
      this.log("📦 Step 3: Starting frontend in production mode...", "INFO");
      try {
        this.frontendProcess = await startFrontend(this.projectRoot, this.packageManager, this.log.bind(this));
        this.log("✅ Frontend started", "SUCCESS");
      } catch (error) {
        this.log(`❌ Frontend start error: ${error.message}`, "ERROR");
        if (this.criticalTestsEnabled) {
          await this.exitEarly(
            `Frontend startup failed: ${error.message}. Cannot run tests without a running frontend.`,
            true
          );
        } else {
          throw error;
        }
      }

      // Step 4: Initialize browser
      this.log("📦 Step 4: Initializing browser...", "INFO");
      const browserData = await initializeBrowser(this.log.bind(this));
      this.browser = browserData.browser;
      this.context = browserData.context;
      this.page = browserData.page;

      // Step 5: Check frontend health
      try {
        await checkFrontendHealth(this.page, this.log.bind(this));
      } catch (error) {
        if (this.criticalTestsEnabled) {
          await this.exitEarly(
            `Frontend health check failed: ${error.message}. Frontend must be running for tests to work.`,
            true
          );
        } else {
          throw error;
        }
      }

      // Step 6: Reset database and setup test data
      this.log("🗑️  Resetting database for fresh test state...", "INFO");
      let testData = null;
      try {
        testData = await setupTestDataWithReset();
        this.log("✅ Database reset and test data setup complete", "SUCCESS");
      } catch (error) {
        this.log(`⚠️  Database reset/test data setup failed: ${error.message}. Tests will continue but may fail.`, "WARNING");
        testData = { projects: [], collections: [], documents: [], users: [], apiKeys: [] };
      }

      // Step 7: Create test suite
      this.testSuite = createTestSuite(
        this.logger,
        this.page,
        testData,
        this.context,
        this.results,
        this.checkFailureRate.bind(this),
        this.exitEarly.bind(this),
        this.maxFailureRate,
        this.criticalTestsEnabled
      );

      // Step 8: Run all test phases
      const ensureBrowserOnline = async () => {
        try {
          await this.context.setOffline(false);
          await this.page.waitForTimeout(500);
        } catch (error) {
          // Ignore errors
        }
      };

      await runAllPhases(
        this.testSuite,
        this.page,
        this.log.bind(this),
        this.checkFailureRate.bind(this),
        this.exitEarly.bind(this),
        ensureBrowserOnline
      );

      // Print summary
      this.log("", "INFO");
      this.log("═══════════════════════════════════════════════════════════", "INFO");
      this.log("📊 Frontend UI Test Suite Summary", "INFO");
      this.log("═══════════════════════════════════════════════════════════", "INFO");
      const totalDuration = this.startTime ? Date.now() - this.startTime : 0;
      this.log(`✅ Passed: ${this.results.passed}`, "SUCCESS");
      this.log(`❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? "ERROR" : "SUCCESS");
      this.log(`📊 Total: ${this.results.total}`, "INFO");
      this.log(`📈 Success Rate: ${this.results.total > 0 ? ((this.results.passed / this.results.total) * 100).toFixed(1) : 0}%`, "INFO");
      this.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(1)}s (${(totalDuration / 60000).toFixed(1)}min)`, "INFO");
      this.log("═══════════════════════════════════════════════════════════", "INFO");
      
      if (this.results.failed > 0) {
        this.log("⚠️  Some tests failed. Review the output above for details.", "WARNING");
      } else {
        this.log("✅ All Frontend UI tests completed successfully!", "SUCCESS");
      }

      // Cleanup test data if configured
      if (CONFIG.CLEANUP_AFTER_TESTS !== false) {
        this.log("🧹 Cleaning up test data...", "INFO");
        try {
          await resetTestData();
          this.log("✅ Test data cleanup complete", "SUCCESS");
        } catch (error) {
          this.log(`⚠️  Test data cleanup failed: ${error.message}`, "WARNING");
        }
      }
    } catch (error) {
      this.log(`❌ Test suite failed: ${error.message}`, "ERROR");
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    this.log("🧹 Cleaning up...", "INFO");
    
    try {
      await stopFrontend(this.frontendProcess, this.log.bind(this));
      await stopBackend(this.backendProcess, this.log.bind(this));
      await closeBrowser(this.browser, this.context, this.page, this.log.bind(this));
      this.log("✅ Cleanup complete", "SUCCESS");
    } catch (error) {
      this.log(`⚠️  Cleanup error: ${error.message}`, "WARNING");
    }
  }
}

// Main execution
async function main() {
  const runner = new FrontendUITestRunner();
  
  try {
    await runner.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] && process.argv[1].endsWith('frontend-ui-test-runner.js')) {
  main();
}

export { FrontendUITestRunner };
