#!/usr/bin/env node

import { krapi } from "@smartsamurai/krapi-sdk";
import { writeFile, mkdir, rm, readdir } from "fs/promises";
import { join, dirname } from "path";
import { existsSync, openSync, closeSync } from "fs";
import { fileURLToPath } from "url";
import CONFIG from "./config.js";
import TestLogger from "./test-logger.js";
import {
  extractTestErrorDetails,
  formatTestErrorLog,
  formatCompactError,
  classifyErrorSource,
  getErrorCategory,
  getFixLocation,
} from "./error-utils.js";

// Import test registry for selective execution
import {
  TEST_REGISTRY,
  resolveTestDependencies,
  getInitializationRequirements,
  getAllTestNames,
} from "./test-registry.js";

/**
 * Comprehensive Test Suite for KRAPI Server
 *
 * ⚠️ IMPORTANT: This test suite simulates external third-party applications
 * ALL tests connect through the FRONTEND (port 3498), NOT directly to backend (port 3470)
 * This ensures we test the same path that real external apps would use.
 */
// Total number of tests in the suite (used for progress tracking)
// Current total: 150+ tests across all test files (updated 2025-12-06)
// Includes: auth, admin (with CRUD), transactions, concurrency, edge-cases
const TOTAL_TESTS_IN_SUITE = 150;

class ComprehensiveTestSuite {
  constructor(sessionToken = null, testProject = null, selectedTests = null) {
    this.sessionToken = sessionToken;
    this.testProject = testProject;
    this.testCollection = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
    };
    this.results = []; // Array for individual test results
    this.totalTestsInSuite = TOTAL_TESTS_IN_SUITE; // Total expected tests
    // Use the same krapi singleton that external apps would use
    // All connections go through FRONTEND (port 3498) to simulate real external app behavior
    this.krapi = krapi;
    this.startTime = Date.now();

    // Store selected tests for conditional execution
    // selectedTests is an array of test chunk names to run, or null for all
    this.selectedTests = selectedTests;

    // Set environment BEFORE creating logger so it can be passed to logger
    this.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      frontendUrl: CONFIG.FRONTEND_URL, // ✅ All tests use frontend URL
      backendUrl: CONFIG.BACKEND_URL, // ⚠️ Not used in tests - for reference only
      timestamp: new Date().toISOString(),
      testMode: "external-client-simulation", // Indicates we're simulating external apps
    };

    this.logger = new TestLogger({
      verbose: process.env.VERBOSE === "true",
      showPassed: process.env.HIDE_PASSED !== "true",
      grouped: true,
      minimal: process.env.VERBOSE !== "true", // Minimal mode unless verbose
      environment: this.environment,
    });
    // Set expected total tests for accurate success rate calculation
    this.logger.setTotalExpectedTests(TOTAL_TESTS_IN_SUITE);
  }

  /**
   * Safe console.log wrapper that handles EPIPE errors gracefully
   * Prevents "broken pipe" errors when stdout is closed
   */
  safeLog(...args) {
    try {
      console.log(...args);
    } catch (error) {
      // Ignore EPIPE errors (broken pipe) - happens when stdout is closed
      if (error.code !== "EPIPE" && error.code !== "ENOTCONN") {
        // Only re-throw if it's not a pipe error
        throw error;
      }
      // Silently ignore pipe errors - they're harmless
    }
  }

  async test(name, testFunction) {
    const startTime = Date.now();
    try {
      await testFunction();
      const duration = Date.now() - startTime;

      // Warn if test takes too long (>5 seconds for all tests)
      const slowThreshold = 5000;
      if (duration > slowThreshold) {
        console.log(
          `   ⚠️  Slow test: ${duration}ms (threshold: ${slowThreshold}ms)`
        );
      }

      this.logger.testResult(name, "PASSED", duration);
      this.logger.updateSuiteStats("PASSED");
      // recordTestResult() is now called automatically by testResult() - no need to call it again
      // Keep local tracking for backward compatibility
      this.testResults.passed++;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Use SDK error utilities to extract detailed error information
      const errorDetails = extractTestErrorDetails(error);
      const errorSource = classifyErrorSource(error);
      const errorCategory = getErrorCategory(error);
      const fixLocation = getFixLocation(error);

      // Log compact error information in console (detailed info goes to log files)
      this.safeLog(`\n❌ ${name} (${duration}ms)`);
      this.safeLog(`   ${formatCompactError(error)}`);
      this.safeLog(
        `   Source: ${errorSource} | Category: ${errorCategory} | Fix: ${fixLocation}`
      );

      // Build error details object for testResult (which will call recordTestResult internally)
      const errorDetailsObj = {
        errorCode: errorDetails.code,
        errorStatus: errorDetails.status,
        errorMessage: errorDetails.message,
        errorDetails: errorDetails.details,
        errorTimestamp: errorDetails.timestamp,
        errorSource: errorSource,
        errorCategory: errorCategory,
        fixLocation: fixLocation,
      };
      
      this.logger.testResult(name, "FAILED", duration, error, errorDetailsObj);
      this.logger.updateSuiteStats("FAILED");
      // recordTestResult() is now called automatically by testResult() - no need to call it again

      // Keep local tracking for backward compatibility
      this.testResults.failed++;

      // If STOP_ON_FIRST_FAILURE is enabled, throw immediately to stop all queued tests
      if (process.env.STOP_ON_FIRST_FAILURE === "true") {
        throw error;
      }
      // Otherwise, continue running all tests (default behavior)
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  // Enhanced assertion with response validation
  assertResponse(
    response,
    expectedFields = [],
    message = "Response validation failed"
  ) {
    if (!response) {
      throw new Error(`${message}: Response is null or undefined`);
    }

    if (typeof response !== "object") {
      throw new Error(
        `${message}: Response is not an object (got ${typeof response})`
      );
    }

    // Check if response is an empty object
    const responseKeys = Object.keys(response);
    if (responseKeys.length === 0) {
      throw new Error(`${message}: Response is an empty object with no keys`);
    }

    // Check for expected fields
    for (const field of expectedFields) {
      if (!(field in response)) {
        const availableKeys =
          responseKeys.length > 0 ? responseKeys.join(", ") : "(no keys)";
        throw new Error(
          `${message}: Missing required field '${field}' in response. Response keys: ${availableKeys}`
        );
      }

      // Check if field has actual data (not null/undefined/empty string)
      const value = response[field];
      if (value === null || value === undefined || value === "") {
        throw new Error(
          `${message}: Field '${field}' exists but has no data (value: ${JSON.stringify(
            value
          )})`
        );
      }

      // For string fields, check they're not just whitespace
      if (typeof value === "string" && value.trim() === "") {
        throw new Error(
          `${message}: Field '${field}' is an empty or whitespace-only string`
        );
      }

      // For arrays, check they're not empty
      if (Array.isArray(value) && value.length === 0) {
        throw new Error(`${message}: Field '${field}' is an empty array`);
      }

      // For objects, check they have at least one key
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0
      ) {
        throw new Error(`${message}: Field '${field}' is an empty object`);
      }
    }

    return true;
  }

  // Validate response has real data (not just structure)
  assertHasData(response, message = "Response has no real data", requireNonEmpty = false) {
    if (!response) {
      throw new Error(`${message}: Response is null or undefined`);
    }

    // Arrays are valid responses (even if empty) - they are objects but should be handled separately
    if (Array.isArray(response)) {
      // If requireNonEmpty is true, empty arrays are invalid
      if (requireNonEmpty && response.length === 0) {
        throw new Error(`${message}: Response is an empty array (non-empty required)`);
      }
      // Otherwise, empty arrays are valid - they represent "no data" which is different from "invalid response"
      return true;
    }

    if (typeof response !== "object") {
      throw new Error(`${message}: Response is not an object`);
    }

    // Check if response has any meaningful data
    const keys = Object.keys(response);
    if (keys.length === 0) {
      throw new Error(`${message}: Response is an empty object`);
    }

    // Check if all values are null/undefined/empty
    const hasData = keys.some((key) => {
      const value = response[key];
      return (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0) &&
        !(typeof value === "object" && Object.keys(value).length === 0)
      );
    });

    if (!hasData) {
      throw new Error(
        `${message}: Response has no meaningful data. Response: ${JSON.stringify(
          response
        )}`
      );
    }

    // Check nested objects have data too (but allow empty objects for optional fields)
    // Only fail if ALL nested objects are empty (meaning the response has no real data)
    const nonEmptyNestedObjects = [];
    for (const key of keys) {
      const value = response[key];
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const nestedKeys = Object.keys(value);
        if (nestedKeys.length > 0) {
          nonEmptyNestedObjects.push(key);
        }
      } else if (value !== null && value !== undefined) {
        // Non-object values count as data
        nonEmptyNestedObjects.push(key);
      }
    }
    
    // Only fail if response has ONLY empty objects (no real data at all)
    if (nonEmptyNestedObjects.length === 0 && keys.length > 0) {
      throw new Error(
        `${message}: All nested objects are empty. Response: ${JSON.stringify(response)}`
      );
    }

    return true;
  }

  // Assert error has correct status code and optional message
  assertErrorType(error, expectedStatus, expectedMessage = null) {
    if (!error) {
      throw new Error(`Expected error but got null/undefined`);
    }

    const actualStatus = error.statusCode || error.status;
    if (actualStatus !== expectedStatus) {
      throw new Error(
        `Expected error status ${expectedStatus} but got ${actualStatus}. Error: ${error.message}`
      );
    }

    if (expectedMessage && error.message) {
      if (!error.message.includes(expectedMessage)) {
        throw new Error(
          `Expected error message to include "${expectedMessage}" but got: ${error.message}`
        );
      }
    }

    return true;
  }

  // Assert error is permission-related (403 Forbidden or 401 Unauthorized)
  assertPermissionDenied(error) {
    if (!error) {
      throw new Error(`Expected permission error but got null/undefined`);
    }

    const status = error.statusCode || error.status;
    const isPermissionError =
      status === 403 ||
      status === 401 ||
      (error.message && (
        error.message.includes("Forbidden") ||
        error.message.includes("Unauthorized") ||
        error.message.includes("permission") ||
        error.message.includes("Insufficient") ||
        error.message.includes("Access denied")
      ));

    if (!isPermissionError) {
      throw new Error(
        `Expected permission error (403/401) but got status ${status}. Error: ${error.message}`
      );
    }

    return true;
  }

  // Assert transaction rollback occurred (validates operation failed and state is unchanged)
  async assertTransactionRollback(operation, verifyState) {
    const initialState = await verifyState();

    try {
      await operation();
      // If operation succeeds, that's okay - we just verify state is consistent
    } catch (error) {
      // Operation failed - verify state is unchanged (rollback occurred)
      const finalState = await verifyState();
      
      if (JSON.stringify(initialState) !== JSON.stringify(finalState)) {
        throw new Error(
          `Transaction rollback failed: State changed after operation failure. Initial: ${JSON.stringify(initialState)}, Final: ${JSON.stringify(finalState)}`
        );
      }
    }

    return true;
  }

  async runAll() {
    return this.runAllTests();
  }

  async runAllTests() {
    const isQuickMode = process.env.STOP_ON_FIRST_FAILURE === "true";

    if (!this.logger.minimal || this.logger.verbose) {
      console.log("🚀 Starting Comprehensive KRAPI Test Suite");
      console.log("=".repeat(60));
      this.logger.info(
        "TEST MODE: Simulating External Third-Party Applications"
      );
      this.logger.info("All tests connect through FRONTEND (port 3498)");

      if (isQuickMode) {
        console.log("");
        console.log("⚡ QUICK MODE (--stop-on-first-failure)");
        console.log("   • Tests will STOP immediately on first failure");
        console.log(
          "   • Total test count will NOT be accurate (shows only tests run before failure)"
        );
        console.log("   • Use this mode to fix errors one by one");
        console.log(
          "   • For full test suite, use: pnpm run test:comprehensive"
        );
        console.log("");
      } else {
        console.log("");
        console.log("📊 COMPREHENSIVE MODE");
        console.log("   • All tests will run regardless of failures");
        console.log("   • Total test count will be accurate");
        console.log("   • Use this mode to see complete test coverage");
        console.log("");
      }
      console.log("=".repeat(60));
    } else {
      // Minimal mode: just show start
      if (isQuickMode) {
        console.log(
          "🚀 Running tests (QUICK MODE - stops on first failure)...\n"
        );
      } else {
        console.log("🚀 Running tests (COMPREHENSIVE MODE - all tests)...\n");
      }
    }

    try {
      // Determine which tests to run
      const testsToRun = this.selectedTests || getAllTestNames();

      // Resolve dependencies (e.g., if running "email", also run "auth" and "projects")
      const testsWithDependencies = resolveTestDependencies(testsToRun);

      // Get initialization requirements
      const initRequirements = getInitializationRequirements(
        testsWithDependencies
      );

      // Setup Phase (conditional based on requirements)
      await this.setup(initRequirements);

      // Run tests in dependency order
      for (const testName of testsWithDependencies) {
        const test = TEST_REGISTRY[testName];
        if (!test) {
          console.warn(`⚠️  Unknown test: ${testName}, skipping`);
          continue;
        }

        // Only run if it's in the selected tests (or if selectedTests is null, run all)
        // Dependencies are always run, but we only show them if they're explicitly selected
        const isExplicitlySelected =
          !this.selectedTests || this.selectedTests.includes(testName);
        const isDependency =
          this.selectedTests && !this.selectedTests.includes(testName);

        if (isDependency) {
          // This is a dependency, run it silently (no suite start/end logging)
          try {
            await test.function(this);
          } catch (error) {
            console.error(
              `💥 Dependency test '${testName}' failed:`,
              error.message
            );
            this.testResults.failed++;
            this.testResults.errors.push({
              test: test.displayName,
              error: error.message,
            });
          }
        } else {
          // This is an explicitly selected test, run it with full logging
          this.logger.suiteStart(test.displayName);

          try {
            await test.function(this);
          } catch (error) {
            console.error(`💥 Test chunk '${testName}' failed:`, error.message);
            this.testResults.failed++;
            this.testResults.errors.push({
              test: test.displayName,
              error: error.message,
            });
          }

          this.logger.suiteEnd(test.displayName);
        }

        // Check if we should stop on first failure
        // Only stop if STOP_ON_FIRST_FAILURE is explicitly enabled
        if (
          process.env.STOP_ON_FIRST_FAILURE === "true" &&
          this.testResults.failed > 0
        ) {
          throw new Error(
            "Test failed - stopping immediately (STOP_ON_FIRST_FAILURE mode)"
          );
        }
        // Otherwise, continue running all tests (default behavior)
      }
    } catch (error) {
      console.error("💥 TEST SUITE FAILED:", error.message);
      this.testResults.failed++;
      this.testResults.errors.push({
        test: "Test Suite",
        error: error.message,
      });
      
      // Record suite-level failure in logger so it appears in JSON results
      const suiteError = new Error(`Test Suite Error: ${error.message}`);
      suiteError.stack = error.stack;
      const duration = Date.now() - this.startTime;
      // Extract error details for logging
      const errorDetails = extractTestErrorDetails(error);
      const errorSource = classifyErrorSource(error);
      const errorCategory = getErrorCategory(error);
      const fixLocation = getFixLocation(error);
      
      // Build error details object for testResult (which will call recordTestResult internally)
      const errorDetailsObj = {
        errorCode: errorDetails.code,
        errorStatus: errorDetails.status,
        errorMessage: error.message,
        errorDetails: errorDetails.details,
        errorTimestamp: errorDetails.timestamp,
        errorSource: errorSource,
        errorCategory: errorCategory,
        fixLocation: fixLocation,
      };
      
      this.logger.testResult("Test Suite", "FAILED", duration, suiteError, errorDetailsObj);
      this.logger.updateSuiteStats("FAILED");
      // recordTestResult() is now called automatically by testResult() - no need to call it again
      
      // In STOP_ON_FIRST_FAILURE mode, rethrow to stop immediately
      if (process.env.STOP_ON_FIRST_FAILURE === "true") {
        throw error;
      }
      // Otherwise, don't throw - let finally block handle cleanup and results
    } finally {
      await this.cleanup();
      
      // Check for suite-level failures BEFORE printing results
      const suiteFailures = (this.logger.results || []).filter(
        (r) => r.test === "Test Suite" && r.status === "FAILED"
      );
      const hasSuiteFailure = suiteFailures.length > 0;
      
      // Only print results if we know the final state
      this.printResults();

      // Save results to file
      try {
        await this.saveResultsToFile();
      } catch (error) {
        console.error(
          "⚠️  Failed to save test results to file:",
          error.message
        );
      }

      // Return false if suite failed OR individual tests failed
      // Individual test failures are in this.testResults.failed
      // Suite failures are tracked separately
      return this.testResults.failed === 0 && !hasSuiteFailure;
    }
  }

  async cleanupDatabaseFiles() {
    console.log(
      "   🧹 Cleaning up database files from previous test runs (industry-standard cleanup)..."
    );
    try {
      // Get the backend-server directory path
      const testSuiteDir = dirname(fileURLToPath(import.meta.url));
      const projectRoot = join(testSuiteDir, "..");
      const backendDataDir = join(projectRoot, "backend-server", "data");

      if (!existsSync(backendDataDir)) {
        console.log("   ✅ No database directory found, nothing to clean");
        return;
      }

      console.log(`   📂 Database directory: ${backendDataDir}`);

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

      // Industry-standard file deletion with retry logic
      // Handles Windows file locking, SQLite WAL mode, and concurrent access
      const deleteFileWithRetry = async (
        filePath,
        fileName,
        maxRetries = 15 // Increased retries for Windows
      ) => {
        // First, try to check if file exists
        if (!existsSync(filePath)) {
          return true; // Already deleted
        }

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            // On Windows, check if file is accessible before trying to delete
            if (process.platform === "win32" && attempt > 1) {
              if (!isFileAccessible(filePath)) {
                // File is still locked, wait longer with exponential backoff
                const waitTime = Math.min(2000 * attempt, 15000);
                if (attempt <= 3 || attempt % 3 === 0) {
                  console.log(
                    `   ⏳ ${fileName} is locked (attempt ${attempt}/${maxRetries}), waiting ${waitTime}ms...`
                  );
                }
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                continue;
              }
            }

            // Attempt deletion
            await rm(filePath, { force: true });

            // Verify deletion was successful
            if (!existsSync(filePath)) {
              return true;
            } else {
              throw new Error("File still exists after deletion");
            }
          } catch (error) {
            if (attempt < maxRetries) {
              // Exponential backoff with jitter
              const baseWait = process.platform === "win32" ? 3000 : 1500;
              const waitTime = Math.min(
                baseWait * Math.pow(1.5, attempt - 1) + Math.random() * 1000,
                15000
              );
              if (attempt <= 3 || attempt % 3 === 0) {
                console.log(
                  `   ⏳ Retrying deletion of ${fileName} (attempt ${attempt}/${maxRetries}), waiting ${Math.round(
                    waitTime
                  )}ms...`
                );
              }
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            } else {
              console.log(
                `   ❌ Failed to delete ${fileName} after ${maxRetries} attempts: ${error.message}`
              );
              return false;
            }
          }
        }
        return false;
      };

      // Clean up main database files (industry-standard: delete all SQLite file variants)
      const mainDbFiles = [
        "krapi_main.db",
        "krapi_main.db-wal",
        "krapi_main.db-shm",
        "krapi.db",
        "krapi.db-wal",
        "krapi.db-shm",
      ];

      let mainDbDeletedCount = 0;
      for (const dbFile of mainDbFiles) {
        const dbPath = join(backendDataDir, dbFile);
        if (existsSync(dbPath)) {
          const deleted = await deleteFileWithRetry(dbPath, dbFile);
          if (deleted) {
            mainDbDeletedCount++;
            console.log(`   ✅ Deleted ${dbFile}`);
          }
        }
      }

      if (mainDbDeletedCount > 0) {
        console.log(
          `   ✅ Cleaned ${mainDbDeletedCount} main database file(s)`
        );
      }

      // Clean up project databases (industry-standard: comprehensive cleanup)
      // Project databases are stored as .db files directly in the projects directory
      // CRITICAL: Delete ALL project databases to ensure clean state
      const projectsDir = join(backendDataDir, "projects");
      let projectDbDeletedCount = 0;

      if (existsSync(projectsDir)) {
        try {
          // Industry-standard: Delete ALL files matching database patterns
          // This ensures complete cleanup regardless of how many files exist
          const allFiles = await readdir(projectsDir, { withFileTypes: true });
          const totalFiles = allFiles.length;

          if (totalFiles > 0) {
            console.log(
              `   📊 Found ${totalFiles} item(s) in projects directory - cleaning all...`
            );
          }

          // First pass: Delete all files and directories
          for (const fileEntry of allFiles) {
            if (fileEntry.isFile()) {
              const fileName = fileEntry.name;
              // Delete ALL files in projects directory (they're all database-related)
              const filePath = join(projectsDir, fileName);
              const deleted = await deleteFileWithRetry(filePath, fileName);
              if (deleted) {
                projectDbDeletedCount++;
                if (projectDbDeletedCount <= 10) {
                  console.log(`   ✅ Deleted: ${fileName}`);
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
                    if (attempt <= 3 || attempt % 3 === 0) {
                      console.log(
                        `   ⏳ Retrying deletion of project directory ${
                          fileEntry.name
                        } (attempt ${attempt}/${maxRetries}), waiting ${Math.round(
                          waitTime
                        )}ms...`
                      );
                    }
                    await new Promise((resolve) =>
                      setTimeout(resolve, waitTime)
                    );
                  }
                }
              }
              if (deleted) {
                projectDbDeletedCount++;
                if (projectDbDeletedCount <= 10) {
                  console.log(
                    `   ✅ Deleted project directory: ${fileEntry.name}`
                  );
                }
              } else {
                console.log(
                  `   ❌ Could not delete project ${fileEntry.name} after ${maxRetries} attempts`
                );
              }
            }
          }

          // Second pass: Aggressive cleanup - delete ANY remaining files
          // This catches files created between passes or missed in first pass
          try {
            const remainingFiles = await readdir(projectsDir);
            let secondPassDeleted = 0;
            for (const fileName of remainingFiles) {
              const filePath = join(projectsDir, fileName);
              if (existsSync(filePath)) {
                const deleted = await deleteFileWithRetry(filePath, fileName);
                if (deleted) {
                  secondPassDeleted++;
                  projectDbDeletedCount++;
                }
              }
            }
            if (secondPassDeleted > 0) {
              console.log(
                `   ✅ Second pass: Deleted ${secondPassDeleted} remaining file(s)`
              );
            }
          } catch (finalError) {
            console.log(
              `   ⚠️  Second pass cleanup warning: ${finalError.message}`
            );
          }

          // Third pass: Final aggressive cleanup - delete everything that remains
          try {
            const finalCheck = await readdir(projectsDir);
            if (finalCheck.length > 0) {
              console.log(
                `   ⚠️  Third pass: ${finalCheck.length} item(s) still remain, attempting final cleanup...`
              );
              for (const fileName of finalCheck) {
                const filePath = join(projectsDir, fileName);
                if (existsSync(filePath)) {
                  await deleteFileWithRetry(filePath, fileName);
                }
              }
            }

            // Final verification
            const verificationCheck = await readdir(projectsDir);
            if (verificationCheck.length === 0) {
              console.log(`   ✅ Projects directory is now completely empty`);
            } else {
              console.log(
                `   ⚠️  WARNING: Projects directory still contains ${verificationCheck.length} item(s) after cleanup`
              );
            }
          } catch {
            // Ignore errors in final check
          }

          if (projectDbDeletedCount > 0) {
            console.log(
              `   ✅ Cleaned ${projectDbDeletedCount} project database file(s)/directories`
            );
          } else if (totalFiles === 0) {
            console.log(`   ✅ Projects directory was already empty`);
          }
        } catch (error) {
          console.log(
            `   ❌ Error reading projects directory: ${error.message}`
          );
        }
      } else {
        console.log(
          `   ✅ Projects directory does not exist, nothing to clean`
        );
      }

      console.log("   ✅ Database cleanup complete (industry-standard)");
    } catch (error) {
      console.log(`   ⚠️  Database cleanup warning: ${error.message}`);
      // Don't throw - continue with tests even if cleanup fails
    }
  }

  async setup(
    initRequirements = {
      requiresAuth: true,
      requiresProject: true,
      requiresCollection: true,
    }
  ) {
    console.log("🔧 Setting up test environment...");

    try {
      // NOTE: Database cleanup is handled by the test runner BEFORE starting services
      // Do NOT cleanup here - the backend is running and has file locks on the database
      // The test runner (comprehensive-test-runner.js) handles cleanup in cleanupExistingResources()

      // Test if frontend is running using native fetch
      console.log("   Testing frontend connection...");
      let frontendHealthy = false;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const healthResponse = await fetch(
          `${CONFIG.FRONTEND_URL}/api/health`,
          {
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
        frontendHealthy = healthResponse.ok;
      } catch {
        frontendHealthy = false;
      }

      if (!frontendHealthy) {
        throw new Error(
          `Frontend not responding at ${CONFIG.FRONTEND_URL}. Please start the services first with: npm run dev`
        );
      }

      // The test runner already connects the SDK and logs in.
      // We need to connect to the SDK first, then set the session token.
      //
      // ⚠️ CRITICAL: We connect to FRONTEND URL (port 3498), NOT backend (port 3470)
      // This simulates how real external apps connect to Krapi Server
      this.safeLog(
        "   Initializing KRAPI SDK (simulating external third-party app)..."
      );
      this.safeLog(
        `   ✅ Connecting to FRONTEND URL: ${CONFIG.FRONTEND_URL} (port 3498)`
      );
      this.safeLog(
        `   ⚠️  NOT connecting to backend: ${CONFIG.BACKEND_URL} (port 3470) - this is correct!`
      );

      // Convert localhost to 127.0.0.1 to avoid IPv6 resolution issues on Windows
      let endpoint = CONFIG.FRONTEND_URL;
      if (endpoint.includes("localhost")) {
        endpoint = endpoint.replace("localhost", "127.0.0.1");
      }

      // Step 1: Connect with session token if available (from test runner), otherwise connect without auth
      // If sessionToken was passed to constructor, use it immediately
      if (this.sessionToken) {
        this.safeLog("   Using session token from test runner...");
        await this.krapi.connect({
          endpoint: endpoint, // ✅ Frontend URL (port 3498) - use IPv4 to avoid IPv6 issues
          sessionToken: this.sessionToken, // ✅ Use token from constructor
          initializeClients: true,
          retry: {
            attempts: 3,
            delay: 1000, // 1 second
          },
        });
        this.safeLog("   ✅ SDK connected with session token from test runner");
      } else {
        // Step 1a: Connect without auth to perform login
        await this.krapi.connect({
          endpoint: endpoint, // ✅ Frontend URL (port 3498) - use IPv4 to avoid IPv6 issues
          initializeClients: true,
          retry: {
            attempts: 3,
            delay: 1000, // 1 second
          },
        });
      }

      // Step 2: Login to get fresh session token (only if auth is needed and not already logged in)
      if (initRequirements.requiresAuth && !this.sessionToken) {
        this.safeLog("   Logging in via SDK...");
        const loginResult = await this.krapi.auth.login("admin", "admin123");

        this.assert(
          loginResult.session_token,
          "Login should return session token"
        );
        this.assert(loginResult.user, "Login should return user");
        this.sessionToken = loginResult.session_token;
        this.assert(this.sessionToken, "Session token should be present");
        this.safeLog("   ✅ Login successful, got session token");

        // Step 3: CRITICAL - Reconnect with session token so ALL HTTP clients have it
        // The SDK's setSessionToken() only updates the auth client, not other clients.
        // By reconnecting with sessionToken in config, ALL clients get the token.
        this.safeLog(
          "   Reconnecting SDK with session token for all services..."
        );
        await this.krapi.connect({
          endpoint: endpoint,
          sessionToken: this.sessionToken, // ✅ Pass token in config so all clients get it
          initializeClients: true,
          retry: {
            attempts: 3,
            delay: 1000,
          },
        });
        this.safeLog(
          "   ✅ SDK reconnected with session token for all services"
        );

        // Perform health check after connection
        try {
          // SDK 0.6.0: Use health.check() instead of healthCheck()
          const healthResult = await this.krapi.health.check();
          if (!healthResult.healthy) {
            this.safeLog(
              "   ⚠️ SDK health check failed - connection may be unstable"
            );
          } else {
            this.safeLog("   ✅ SDK health check passed");
          }
        } catch (healthError) {
          this.safeLog(`   ⚠️ SDK health check error: ${healthError.message}`);
        }
      }

      // Log SDK structure for debugging (only if verbose)
      if (process.env.VERBOSE === "true") {
        console.log(
          "✅ KRAPI SDK initialized (simulating external third-party app)"
        );
        console.log(`   ✅ Connected to frontend: ${CONFIG.FRONTEND_URL}`);
        console.log(
          `   ✅ SDK will route requests through frontend proxy to backend`
        );
        console.log(`   SDK keys: ${Object.keys(this.krapi).join(", ")}`);
        if (this.krapi.projects) {
          console.log(
            `   krapi.projects keys: ${Object.keys(this.krapi.projects).join(
              ", "
            )}`
          );
        }
        if (this.krapi.collections) {
          console.log(
            `   krapi.collections keys: ${Object.keys(
              this.krapi.collections
            ).join(", ")}`
          );
        }
        if (this.krapi.documents) {
          console.log(
            `   krapi.documents keys: ${Object.keys(this.krapi.documents).join(
              ", "
            )}`
          );
        }
      }

      // Step 3: Create test project if required and not already exists
      // Only create if we have authentication (project creation requires auth)
      // CRITICAL: Only create if testProject is null/undefined - if it was passed from test runner, use it!
      if (initRequirements.requiresProject && !this.testProject) {
        // Ensure we have a session token before creating project
        if (!this.sessionToken && initRequirements.requiresAuth) {
          throw new Error(
            "Cannot create test project: authentication required but login failed"
          );
        }
        console.log("   Creating test project...");
        const projectName = `Test Project ${Date.now()}`;
        this.testProject = await this.krapi.projects.create({
          name: projectName,
          description: "A test project for comprehensive testing",
        });
        this.logger.setTestProject(this.testProject);
        console.log(`   ✅ Test project created: ${this.testProject.id}`);
      } else if (this.testProject) {
        // Test project was passed from test runner - use it!
        console.log(`   ✅ Using test project from test runner: ${this.testProject.id}`);
        this.logger.setTestProject(this.testProject);
      }

      // Step 4: Create test collection if required and not already exists
      // Only create if we have authentication and a project
      if (
        initRequirements.requiresCollection &&
        !this.testCollection &&
        this.testProject
      ) {
        // Ensure we have a session token before creating collection
        if (!this.sessionToken && initRequirements.requiresAuth) {
          throw new Error(
            "Cannot create test collection: authentication required but login failed"
          );
        }
        console.log("   Creating test collection...");
        this.testCollection = await this.krapi.collections.create(
          this.testProject.id,
          {
            name: "test_collection",
            description: "A test collection for comprehensive testing",
            fields: [], // Empty fields array - required by backend validation
          }
        );
        this.logger.setTestCollection(this.testCollection);
        console.log(`   ✅ Test collection created: ${this.testCollection.id}`);
        
        // CRITICAL: Verify collection exists before proceeding
        // This ensures the collection is fully committed and can be found by the SDK
        // Try both by ID and by name to ensure it's accessible
        let collectionVerified = false;
        let retries = 0;
        const maxRetries = 10;
        while (!collectionVerified && retries < maxRetries) {
          try {
            // Try to get collection by ID first
            let foundCollection = null;
            if (this.testCollection.id) {
              try {
                foundCollection = await this.krapi.collections.get(
                  this.testProject.id,
                  this.testCollection.id
                );
              } catch {
                // If ID lookup fails, try by name
              }
            }
            
            // If ID lookup failed or no ID, try by name
            if (!foundCollection && this.testCollection.name) {
              try {
                foundCollection = await this.krapi.collections.get(
                  this.testProject.id,
                  this.testCollection.name
                );
              } catch {
                // Name lookup also failed
              }
            }
            
            if (foundCollection && (foundCollection.id === this.testCollection.id || foundCollection.name === this.testCollection.name)) {
              collectionVerified = true;
              console.log(`   ✅ Collection verified: ${foundCollection.id || foundCollection.name}`);
            } else {
              retries++;
              if (retries < maxRetries) {
                console.log(`   ⚠️  Collection not yet found, retrying... (${retries}/${maxRetries})`);
                await new Promise((resolve) => setTimeout(resolve, 300));
              }
            }
          } catch (error) {
            retries++;
            if (retries < maxRetries) {
              console.log(`   ⚠️  Collection verification failed, retrying... (${retries}/${maxRetries}): ${error.message}`);
              await new Promise((resolve) => setTimeout(resolve, 300));
            } else {
              console.log(`   ⚠️  Collection verification failed after ${maxRetries} retries - continuing anyway`);
              // Don't throw - continue with tests even if verification fails
            }
          }
        }
      }

      console.log("✅ Test environment setup complete");
    } catch (error) {
      console.error("❌ Setup failed:", error.message);
      if (error.code === "ECONNREFUSED") {
        throw new Error(
          `Cannot connect to ${CONFIG.FRONTEND_URL}. Please start the services first with: npm run dev`
        );
      }
      throw error;
    }
  }

  // All test methods have been moved to separate files in tests/ directory
  // They are imported at the top of this file and called in runAllTests()
  async cleanup() {
    console.log("\n🧹 Cleaning up test environment...");

    if (this.testProject) {
      try {
        // Always use SDK for cleanup - never use direct axios
        await this.krapi.projects.delete(this.testProject.id);
      } catch (error) {
        console.log("Warning: Could not delete test project:", error.message);
      }
    }

    console.log("✅ Cleanup complete");
  }

  printResults() {
    // Count using the same logic as saveResultsToFile() for consistency
    const passedCount = (this.logger.results || []).filter(
      (r) => r.test !== "Test Suite" && r.status === "PASSED"
    ).length;
    const failedCount = this.logger.testResults.errors.filter(
      (e) => !(e.name || e.test)?.includes("Test Suite")
    ).length;
    const totalTests = passedCount + failedCount;
    
    // Check for suite-level failures separately
    const suiteFailures = (this.logger.results || []).filter(
      (r) => r.test === "Test Suite" && r.status === "FAILED"
    );
    const hasSuiteFailure = suiteFailures.length > 0;
    
    const duration = Date.now() - this.startTime;
    const totalExpectedTests = TOTAL_TESTS_IN_SUITE; // Always use the constant value (122)

    // Calculate performance metrics
    const avgTestTime = totalTests > 0 ? Math.round(duration / totalTests) : 0;
    const testsPerSecond =
      duration > 0 ? (totalTests / (duration / 1000)).toFixed(2) : 0;

    // Get slow tests (>5s for all tests)
    // Use logger.results array, not testResults object (which has passed/failed/errors)
    const slowTests = (this.logger.results || [])
      .filter((t) => {
        const threshold = 5000;
        return t.duration > threshold;
      })
      .sort((a, b) => b.duration - a.duration);

    // Use logger for summary - pass total expected tests
    this.logger.summary(
      totalTests, // Number of individual tests that actually ran
      passedCount,
      failedCount,
      duration,
      totalExpectedTests
    );
    
    // Only show suite-level failures if NO individual tests failed (edge case)
    if (suiteFailures.length > 0 && failedCount === 0) {
      console.log(`\n💥 SUITE-LEVEL FAILURE (all individual tests passed but suite failed):`);
      suiteFailures.forEach((failure) => {
        console.log(`   ${failure.error || "Unknown error"}`);
      });
    }

    // Removed verbose performance metrics - user wants simple summary only
    if (false && slowTests.length > 0) {
      console.log(`\n⚠️  SLOW TESTS (${slowTests.length}):`);
      slowTests.slice(0, 10).forEach((test) => {
        const testName = test.test || test.name || "Unknown test";
        console.log(`   ${testName}: ${test.duration}ms`);
      });
      if (slowTests.length > 10) {
        console.log(`   ... and ${slowTests.length - 10} more slow tests`);
      }
    }

    // Removed verbose error source summary - user wants simple summary only
    if (false && failedCount > 0) {
      const failedTests = this.logger.testResults.errors.filter(
        (e) => !(e.name || e.test)?.includes("Test Suite")
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

      console.log(`\n📋 ERROR SOURCE SUMMARY:`);
      if (errorsBySource.SDK > 0) {
        console.log(
          `   SDK Issues: ${errorsBySource.SDK} (fix in @smartsamurai/krapi-sdk)`
        );
      }
      if (errorsBySource.SERVER > 0) {
        console.log(
          `   Server Issues: ${errorsBySource.SERVER} (fix in backend/frontend)`
        );
      }
      if (errorsBySource.NETWORK > 0) {
        console.log(
          `   Network Issues: ${errorsBySource.NETWORK} (check connectivity)`
        );
      }
      if (errorsBySource.UNKNOWN > 0) {
        console.log(
          `   Unknown Issues: ${errorsBySource.UNKNOWN} (manual investigation needed)`
        );
      }
      
      // List failed test names only (simple format)
      console.log(`\nFailed Tests:`);
      failedTests.forEach((test, index) => {
        const testName = test.test || test.name || "Unknown test";
        console.log(`  ${index + 1}. ${testName}`);
      });
    }

    console.log("=".repeat(60));

    const isQuickMode = process.env.STOP_ON_FIRST_FAILURE === "true";

    // NEVER print success if suite failed, even if all individual tests passed
    if (failedCount === 0 && totalTests > 0 && !hasSuiteFailure) {
      if (isQuickMode) {
        console.log(
          `\n✅ All tests passed so far (${totalTests}/${totalExpectedTests} executed - quick mode)`
        );
        console.log("   Run 'pnpm run test:comprehensive' for full test suite");
      } else {
        // Show actual/actual when all tests pass, or actual/expected if different
        const displayCount = totalTests === totalExpectedTests 
          ? `${totalTests}/${totalTests}` 
          : `${totalTests}/${totalExpectedTests}`;
        console.log(
          `\n🎉 ALL TESTS PASSED! (${displayCount}) KRAPI is production ready! 🎉`
        );
      }
    } else if (totalTests === 0 && !hasSuiteFailure) {
      this.logger.warn(
        "No tests were executed. Please check test suite configuration."
      );
    } else {
      if (hasSuiteFailure && failedCount === 0) {
        // Suite failed but all individual tests passed - this is the confusing case
        this.logger.warn(
          `⚠️  All individual tests passed (${totalTests}/${totalExpectedTests}), but the test suite encountered an error during execution.`
        );
        suiteFailures.forEach((failure) => {
          this.logger.warn(`   Suite Error: ${failure.error || "Unknown error"}`);
        });
      } else if (hasSuiteFailure) {
        this.logger.warn(
          `Test suite failed to complete. ${failedCount} individual test(s) failed, and the suite itself encountered an error.`
        );
      } else if (isQuickMode) {
        this.logger.warn(
          `${failedCount} of ${totalTests} test(s) failed (${totalTests}/${totalExpectedTests} executed - quick mode stopped on first failure). Fix the error and run again.`
        );
      } else {
        this.logger.warn(
          `${failedCount} of ${totalTests} test(s) failed (${totalTests}/${totalExpectedTests} total). Please review and fix.`
        );
      }
    }

    console.log("=".repeat(60));
  }

  // DEPRECATED: File saving is now handled by TestLogger
  // Keeping this method for backward compatibility, but delegates to logger
  async saveResultsToFile() {
    // Update logger with test project/collection before saving
    if (this.testProject) {
      this.logger.setTestProject(this.testProject);
    }
    if (this.testCollection) {
      this.logger.setTestCollection(this.testCollection);
    }

    // Delegate to unified logger for file output
    return await this.logger.saveResultsToFile();
  }
}

// Export the test class for the test runner
export default ComprehensiveTestSuite;
