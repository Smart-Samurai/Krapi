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
import { readdir, readFile } from "fs/promises";
import { existsSync } from "fs";

// Import modular components
import { buildFrontend } from "./lib/frontend-build.js";
import { cleanupPorts } from "./lib/port-cleanup.js";
import { startBackend, stopBackend } from "./lib/backend-process.js";
import { startFrontend, stopFrontend } from "./lib/frontend-process.js";
import { initializeBrowser, checkFrontendHealth, closeBrowser } from "./lib/browser-manager.js";
import { createTestSuite } from "./lib/test-suite-factory.js";
import { runAllPhases } from "./lib/test-phases.js";
import { countTotalTests } from "./lib/count-tests.js";

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
      totalExpected: 0, // Total number of tests that should exist in the suite
    };
    // Disable early exit by default - run all tests to get complete picture
    // Set EXIT_ON_FIRST_FAILURE=true to enable early exit for debugging
    this.exitOnFirstFailure = process.env.EXIT_ON_FIRST_FAILURE === "true";
    this.maxFailureRate = this.exitOnFirstFailure ? 0 : parseFloat(process.env.MAX_FAILURE_RATE || "100");
    this.shouldExitEarly = false;
    this.criticalTestsEnabled = process.env.CRITICAL_TESTS_ENABLED === "true";
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
      logsDirectory: "frontend-ui-test-logs", // Separate directory for UI test logs
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
    // Don't exit early by default - run all tests
    // Only exit if explicitly enabled via EXIT_ON_FIRST_FAILURE=true
    if (this.exitOnFirstFailure && this.results.failed > 0) {
      this.shouldExitEarly = true;
      return true;
    }
    // Check failure rate only if we have enough tests run and maxFailureRate is set
    if (this.results.total === 0) return false;
    const failureRate = (this.results.failed / this.results.total) * 100;
    // Only exit if failure rate exceeds threshold AND maxFailureRate is less than 100
    if (this.maxFailureRate < 100 && this.results.total >= 3 && failureRate > this.maxFailureRate) {
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
    this.log(`   Tests Run: ${this.results.total}${this.results.totalExpected > 0 ? ` / ${this.results.totalExpected} (expected)` : ''}`, "INFO");
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
    
    // Save logs before exiting
    this.log("💾 Saving test results to files before exit...", "INFO");
    try {
      const savedFiles = await this.logger.saveResultsToFile();
      if (savedFiles.jsonFilename) {
        this.log(`✅ Test results saved to: ${savedFiles.jsonFilename}`, "SUCCESS");
        if (savedFiles.errorsFilename) {
          this.log(`✅ Errors report saved to: ${savedFiles.errorsFilename}`, "SUCCESS");
        }
      }
    } catch (error) {
      this.log(`⚠️  Failed to save test results: ${error.message}`, "WARNING");
    }
    
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

      // Step 5.5: Count total tests in suite
      this.log("📊 Counting total tests in suite...", "INFO");
      try {
        this.results.totalExpected = await countTotalTests();
        this.logger.setTotalExpectedTests(this.results.totalExpected);
        this.log(`✅ Found ${this.results.totalExpected} tests in suite`, "SUCCESS");
      } catch (error) {
        this.log(`⚠️  Could not count tests: ${error.message}. Using default.`, "WARNING");
        this.results.totalExpected = 77; // Default fallback
        this.logger.setTotalExpectedTests(this.results.totalExpected);
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
        this.criticalTestsEnabled,
        this.exitOnFirstFailure
      );

      // Set logger start time
      this.logger.startTime = this.startTime;

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

      // Summary will be displayed after saving results (matching comprehensive format)

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

      // Save test results to files
      this.log("💾 Saving test results to files...", "INFO");
      try {
        const savedFiles = await this.logger.saveResultsToFile();
        if (savedFiles.jsonFilename) {
          this.log(`✅ Test results saved to: ${savedFiles.jsonFilename}`, "SUCCESS");
          if (savedFiles.errorsFilename) {
            this.log(`✅ Errors report saved to: ${savedFiles.errorsFilename}`, "SUCCESS");
          }
        }
      } catch (error) {
        this.log(`⚠️  Failed to save test results: ${error.message}`, "WARNING");
      }
    } catch (error) {
      this.log(`❌ Test suite failed: ${error.message}`, "ERROR");
      
      // Try to save results even on failure
      try {
        await this.logger.saveResultsToFile();
      } catch (saveError) {
        // Ignore save errors on failure
      }
      
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    this.log("🧹 Cleaning up...", "INFO");
    
    // CRITICAL: Delete all projects via API/SDK BEFORE stopping services
    // This ensures projects are properly deleted from the database
    // Only do this if cleanup is enabled and services are still running
    if (CONFIG.CLEANUP_AFTER_TESTS !== false) {
      this.log("   Deleting all test projects via API...", "INFO");
      try {
        // Check if services are still running
        const frontendStillRunning = this.frontendProcess && 
          this.frontendProcess.exitCode === null && 
          !this.frontendProcess.killed;
        const backendStillRunning = this.backendProcess && 
          this.backendProcess.exitCode === null && 
          !this.backendProcess.killed;
        
        if (frontendStillRunning && backendStillRunning) {
          // Try to delete all projects via resetTestData
          await resetTestData();
          this.log("   ✅ All projects deleted via API", "SUCCESS");
        } else {
          this.log("   ⚠️  Services not running - skipping project deletion via API", "WARNING");
          this.log("   ℹ️  Projects will be cleaned up via database file deletion", "INFO");
        }
      } catch (error) {
        this.log(`   ⚠️  Error deleting projects via API: ${error.message}`, "WARNING");
        this.log("   ℹ️  Projects will be cleaned up via database file deletion", "INFO");
      }
    }
    
    // Save logs if not already saved (in case cleanup is called before logs are saved)
    try {
      const savedFiles = await this.logger.saveResultsToFile();
      if (savedFiles.jsonFilename) {
        this.log(`✅ Test results saved to: ${savedFiles.jsonFilename}`, "SUCCESS");
      }
    } catch (error) {
      // Ignore save errors during cleanup
    }
    
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

/**
 * Read latest test log files (matching comprehensive test format)
 */
async function readLatestTestLog() {
  try {
    const testLogsDir = join(__dirname, "frontend-ui-test-logs");
    if (!existsSync(testLogsDir)) {
      return null;
    }

    const files = await readdir(testLogsDir);
    
    // Find result files (JSON and TXT)
    const jsonFiles = files
      .filter((f) => f.startsWith("test-results-") && f.endsWith(".json"))
      .sort()
      .reverse();
    
    // If no result files exist, return null
    if (jsonFiles.length === 0) {
      return null;
    }
    
    // Get timestamp from the most recent result file
    const timestampFile = jsonFiles[0];
    const timestamp = timestampFile.match(/test-results-(.+)\.json/)?.[1] || "unknown";
    
    // Try to find error file with matching timestamp
    const errorFiles = files
      .filter((f) => f.startsWith("test-errors-") && f.endsWith(".txt") && f.includes(timestamp))
      .sort()
      .reverse();
    
    let latestErrorFile = null;
    if (errorFiles.length > 0) {
      latestErrorFile = join(testLogsDir, errorFiles[0]);
    }
    
    return {
      errorFile: latestErrorFile,
      timestamp,
      jsonFile: jsonFiles.length > 0 ? join(testLogsDir, jsonFiles[0]) : null,
    };
  } catch (error) {
    console.error("⚠️  Failed to read latest test log:", error.message);
    return null;
  }
}

// Main execution
async function main() {
  const runner = new FrontendUITestRunner();
  let success = false;
  
  try {
    await runner.runAllTests();
    success = true;
  } catch (error) {
    console.error("❌ Test suite failed:", error);
    success = false;
  }
  
  // Display final summary after cleanup (matching comprehensive test format)
  console.log("\n" + "=".repeat(80));
  console.log("📋 READING LATEST TEST LOG FILE");
  console.log("=".repeat(80));
  
  const latestLog = await readLatestTestLog();
  if (latestLog && latestLog.jsonFile) {
    console.log(`\n📄 Latest test results: ${latestLog.jsonFile}`);
    if (latestLog.errorFile) {
      console.log(`📄 Latest error log: ${latestLog.errorFile}`);
    }
    console.log(`   Timestamp: ${latestLog.timestamp}`);
    
    try {
      const jsonContent = await readFile(latestLog.jsonFile, "utf-8");
      const jsonResults = JSON.parse(jsonContent);
      const summary = jsonResults.summary || {};
      const failedCount = summary.failed || 0;
      const passedCount = summary.passed || 0;
      const totalCount = summary.totalTests || 0;
      const duration = summary.duration || "0ms";
      
      // Get failed test names
      let failedTests = [];
      if (jsonResults.testResults) {
        failedTests = jsonResults.testResults
          .filter((t) => t.status === "FAILED")
          .map((t) => t.test || t.name || "Unknown test");
      }
      if (jsonResults.failedTests && jsonResults.failedTests.length > 0) {
        failedTests = [
          ...failedTests,
          ...jsonResults.failedTests.map((t) => t.name || t.test || "Unknown test")
        ];
      }
      failedTests = [...new Set(failedTests)];
      
      // Get total expected tests from results
      const totalExpected = jsonResults.summary?.totalExpected || jsonResults.totalExpected || totalCount;
      
      // Display summary (matching comprehensive test format exactly)
      console.log("\n" + "=".repeat(60));
      console.log("TEST RESULTS SUMMARY");
      console.log("=".repeat(60));
      console.log(`Duration: ${duration}`);
      console.log(`Tests Expected: ${totalExpected}`);
      console.log(`Tests Ran: ${totalCount}`);
      if (totalExpected > 0 && totalCount < totalExpected) {
        console.log(`⚠️  Warning: Only ${totalCount} of ${totalExpected} tests ran (${totalExpected - totalCount} tests skipped due to early exit)`);
      }
      console.log(`Passed: ${passedCount}`);
      console.log(`Failed: ${failedCount}`);
      
      // Show failed test names
      if (failedTests.length > 0) {
        console.log("\nFailed Tests:");
        failedTests.forEach((testName, index) => {
          console.log(`  ${index + 1}. ${testName}`);
        });
      }
      
      // Show log file names
      console.log("\nLog Files:");
      if (latestLog.jsonFile) {
        const jsonFileName = latestLog.jsonFile.split(/[/\\]/).pop();
        console.log(`  - ${jsonFileName}`);
      }
      if (latestLog.errorFile) {
        const errorFileName = latestLog.errorFile.split(/[/\\]/).pop();
        console.log(`  - ${errorFileName}`);
      }
      console.log("=".repeat(60));
      
      success = failedCount === 0;
    } catch (error) {
      if (!success) {
        console.log("\n❌ Test suite failed (could not parse results)");
      }
    }
  } else if (!success) {
    console.log("\n❌ Test suite failed (no results file available)");
  } else {
    console.log("⚠️  No test log files found");
  }
  
  console.log(`\n✅ Test runner completing with exit code: ${success ? 0 : 1}`);
  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] && process.argv[1].endsWith('frontend-ui-test-runner.js')) {
  main();
}

export { FrontendUITestRunner };
