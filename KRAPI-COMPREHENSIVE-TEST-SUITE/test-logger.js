/**
 * Test Logger - Unified logging mechanism for console output and file results
 * Handles both real-time console logging and comprehensive result file generation
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { classifyErrorSource, getErrorCategory, getFixLocation } from "./error-utils.js";

class TestLogger {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.showPassed = options.showPassed !== false; // Show passed tests by default
    this.showFailed = options.showFailed !== false; // Always show failed tests
    this.grouped = options.grouped !== false; // Group logs by test suite
    this.minimal = options.minimal !== false; // Minimal console output by default
    this.currentSuite = null;
    this.suiteStats = {};

    // Result tracking for file output
    this.results = [];
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
    };
    this.startTime = Date.now();
    this.environment = options.environment || {};
    this.testProject = null;
    this.testCollection = null;
    this.serviceLogs = {
      backend: [],
      frontend: [],
    };
    this.fullOutputLog = []; // Full output log from test runner (all stdout/stderr)
    this.filesSaved = false; // Track if files have already been saved to prevent duplicates
    this.totalExpectedTests = null; // Store expected total tests for accurate success rate calculation
    this.logsDirectory = options.logsDirectory || "test-logs"; // Custom logs directory (default: test-logs)
  }

  /**
   * Set service logs from test runner
   */
  setServiceLogs(serviceLogs) {
    this.serviceLogs = serviceLogs || { backend: [], frontend: [] };
  }
  
  /**
   * Set full output log from test runner
   */
  setFullOutputLog(fullOutputLog) {
    this.fullOutputLog = fullOutputLog || [];
  }

  /**
   * Format HTTP error response
   */
  formatHttpError(error) {
    if (!error.response) {
      return {
        code: error.code || "UNKNOWN",
        message: error.message,
      };
    }

    const { status, statusText, data } = error.response;
    return {
      code: error.code || "HTTP_ERROR",
      status,
      statusText,
      message: data?.error || error.message,
      details: this.verbose ? data : undefined,
    };
  }

  /**
   * Log test result
   */
  testResult(name, status, duration, error = null, errorDetails = null) {
    const durationStr =
      duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`;

    // Update suite stats if we have a current suite
    if (this.currentSuite && this.suiteStats[this.currentSuite]) {
      if (status === "PASSED") {
        this.suiteStats[this.currentSuite].passed++;
      } else {
        this.suiteStats[this.currentSuite].failed++;
      }
    }

    // Update global test results
    if (status === "PASSED") {
      this.testResults.passed++;
    } else {
      this.testResults.failed++;
      if (error) {
        const errorObj = {
          name,
          test: name, // Also set test field for consistency
          error: error.message || "Unknown error",
          stack: error.stack,
        };
        
        // Add structured error details if provided
        if (errorDetails) {
          errorObj.details = errorDetails;
        }
        
        this.testResults.errors.push(errorObj);
      }
    }
    
    // CRITICAL: Also record the test result so it appears in JSON logs
    // This was missing - tests were being counted but not saved to JSON!
    this.recordTestResult(name, status, duration, error, errorDetails);

    if (status === "PASSED") {
      // In minimal mode, only show passed tests if verbose is enabled
      if (this.minimal && !this.verbose) {
        // Show progress indicator only
        process.stdout.write(".");
      } else if (this.showPassed) {
        console.log(`✅ ${name} (${durationStr})`);
      }
    } else {
      // Show compact error details in console (detailed info goes to log files)
      console.log(`\n${"═".repeat(70)}`);
      console.log(`❌ TEST FAILED: ${name} (${durationStr})`);
      console.log(`${"═".repeat(70)}`);
      
      if (error) {
        // Extract essential error information only
        const errorMessage = error.message || "Unknown error";
        const errorCode = error.code || error.response?.data?.code || "UNKNOWN";
        const httpStatus = error.response?.status || error.status || "N/A";
        const responseData = error.response?.data;
        
        console.log(`Error: ${errorMessage}`);
        console.log(`Code: ${errorCode} | Status: ${httpStatus}`);
        
        // Show only relevant response data (error messages, not full objects)
        if (responseData) {
          if (responseData.error || responseData.message) {
            console.log(`Response: ${responseData.error || responseData.message}`);
          } else if (typeof responseData === "string") {
            console.log(`Response: ${responseData.substring(0, 200)}${responseData.length > 200 ? "..." : ""}`);
          }
        }
        
        // Show stack trace (first 3 lines only, filtered for relevance)
        if (error.stack) {
          const stackLines = error.stack.split("\n");
          const relevantStack = stackLines
            .slice(0, 3)
            .filter((line) => {
              // Keep test files and relevant code, filter out node_modules noise
              return !line.includes("node_modules") || line.includes("test") || line.includes("krapi");
            });
          
          if (relevantStack.length > 0) {
            console.log(`\nStack (first 3 lines):`);
            relevantStack.forEach(line => console.log(`   ${line}`));
          }
        }
      }
      
      console.log(`${"─".repeat(70)}\n`);
    }
  }

  /**
   * Log suite start
   */
  suiteStart(name) {
    this.currentSuite = name;
    this.suiteStats[name] = { passed: 0, failed: 0, startTime: Date.now() };
    if (this.grouped) {
      if (this.minimal && !this.verbose) {
        // Minimal: just suite name
        console.log(`\n📦 ${name}`);
      } else {
        console.log(`\n📦 ${name}`);
        console.log("─".repeat(60));
      }
    }
  }

  /**
   * Log suite end
   */
  suiteEnd(name) {
    const stats = this.suiteStats[name];
    if (!stats) return;

    const duration = Date.now() - stats.startTime;
    const total = stats.passed + stats.failed;
    const successRate =
      total > 0 ? ((stats.passed / total) * 100).toFixed(1) : 0;

    if (this.grouped) {
      if (this.minimal && !this.verbose) {
        // Minimal: just stats on same line
        const status = stats.failed === 0 ? "✅" : "❌";
        console.log(`   ${status} ${stats.passed}/${total} (${successRate}%)`);
      } else {
        console.log("─".repeat(60));
        console.log(
          `   ${stats.passed}/${total} passed (${successRate}%) - ${duration}ms`
        );
      }
    }

    this.currentSuite = null;
  }

  /**
   * Log HTTP request (only in verbose mode)
   */
  httpRequest(method, url, status, duration) {
    if (!this.verbose) return;

    const statusEmoji =
      status >= 200 && status < 300
        ? "✅"
        : status >= 400 && status < 500
        ? "⚠️"
        : status >= 500
        ? "❌"
        : "ℹ️";
    console.log(
      `   ${statusEmoji} ${method} ${url} → ${status} (${duration}ms)`
    );
  }

  /**
   * Log info message (only in verbose mode)
   */
  info(message) {
    if (this.verbose) {
      console.log(`ℹ️  ${message}`);
    }
    // Always log to file, but not console in minimal mode
  }

  /**
   * Log warning (shown only if not minimal or if verbose)
   */
  warn(message) {
    if (!this.minimal || this.verbose) {
      console.log(`⚠️  ${message}`);
    }
  }

  /**
   * Log error (always shown, but minimal details in minimal mode)
   */
  error(message, details = null) {
    if (this.minimal && !this.verbose) {
      // Minimal: just brief message
      console.log(`❌ ${message.split("\n")[0]}`);
    } else {
      console.log(`❌ ${message}`);
      if (details && this.verbose) {
        console.log(`   Details:`, details);
      }
    }
  }

  /**
   * Log success (shown only if not minimal or if verbose)
   */
  success(message) {
    if (!this.minimal || this.verbose) {
      console.log(`✅ ${message}`);
    }
  }

  /**
   * Log summary - simplified format
   */
  summary(total, passed, failed, duration, totalExpected = null) {
    // Simple summary - always minimal format
    console.log("\n" + "=".repeat(60));
    console.log("TEST RESULTS SUMMARY");
    console.log("=".repeat(60));
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Tests Ran: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log("=".repeat(60));
  }

  /**
   * Update suite stats
   */
  updateSuiteStats(status) {
    if (this.currentSuite && this.suiteStats[this.currentSuite]) {
      if (status === "PASSED") {
        this.suiteStats[this.currentSuite].passed++;
      } else {
        this.suiteStats[this.currentSuite].failed++;
      }
    }
  }

  /**
   * Record test result (for file output)
   * @param {string} name - Test name
   * @param {string} status - PASSED or FAILED
   * @param {number} duration - Test duration in ms
   * @param {Error|null} error - Error object if failed
   * @param {Object|null} sdkErrorDetails - Enhanced SDK error details from error-utils
   */
  recordTestResult(name, status, duration, error = null, sdkErrorDetails = null) {
    const result = {
      test: name,
      status: status,
      duration: duration,
      timestamp: new Date().toISOString(),
    };

    if (status === "FAILED" && error) {
      // Classify error source and category
      const errorSource = classifyErrorSource(error);
      const errorCategory = getErrorCategory(error);
      const fixLocation = getFixLocation(error);
      
      // Use SDK error details if provided, otherwise extract from error
      if (sdkErrorDetails) {
        result.error = sdkErrorDetails.errorMessage || error.message;
        result.errorCode = sdkErrorDetails.errorCode || error.code || null;
        result.errorStatus = sdkErrorDetails.errorStatus || error.response?.status || null;
        result.errorDetails = sdkErrorDetails.errorDetails || null;
        result.errorTimestamp = sdkErrorDetails.errorTimestamp || null;
      } else {
        result.error = error.message;
        result.errorCode = error.code || null;
        result.errorStatus = error.response?.status || null;
      }
      
      // Add error classification fields
      result.errorSource = errorSource;
      result.errorCategory = errorCategory;
      result.fixLocation = fixLocation;
      
      result.stack = error.stack || null;
      result.httpStatus = error.response?.status || null;
      result.httpStatusText = error.response?.statusText || null;
      result.responseData = error.response?.data || null;

      // Also add to errors array with enhanced details
      const errorEntry = {
        test: name,
        error: result.error,
        errorCode: result.errorCode,
        errorStatus: result.errorStatus,
        errorDetails: result.errorDetails,
        errorSource: errorSource,
        errorCategory: errorCategory,
        fixLocation: fixLocation,
        stack: error.stack || null,
        code: error.code || null,
        status: error.response?.status || null,
        statusText: error.response?.statusText || null,
        responseData: error.response?.data || null,
      };
      
      // Note: errorDetails parameter is not used here - it's passed to testResult() method instead
      
      this.testResults.errors.push(errorEntry);
      // Don't update counters here - testResult() already handles them to avoid double-counting
    } else if (status === "PASSED") {
      // Don't update counters here - testResult() already handles them to avoid double-counting
    }

    this.results.push(result);
  }

  /**
   * Set test project/collection for file output
   */
  setTestProject(project) {
    this.testProject = project;
  }

  setTestCollection(collection) {
    this.testCollection = collection;
  }

  setTotalExpectedTests(totalExpected) {
    this.totalExpectedTests = totalExpected;
  }

  /**
   * Save results to files (JSON and TXT)
   */
  async saveResultsToFile() {
    // Prevent duplicate saves - if files were already saved, skip
    if (this.filesSaved) {
      return { jsonFilename: null, errorsFilename: null };
    }

    // Calculate totals from both passed results and failed errors
    // EXCLUDE suite-level failures from individual test counts
    const individualTestResults = this.results.filter(
      (r) => r.test !== "Test Suite"
    );
    const passedCount = individualTestResults.length; // All results are PASSED tests
    const failedCount = this.testResults.errors.filter(
      (e) => !(e.name || e.test)?.includes("Test Suite") // Exclude suite-level errors
    ).length;
    const totalTests = passedCount + failedCount;

    // Check for suite-level failures (separate from individual tests)
    const suiteFailures = this.results.filter(
      (r) => r.test === "Test Suite" && r.status === "FAILED"
    );

    // Sync counters with actual results (in case they got out of sync)
    this.testResults.passed = passedCount;
    this.testResults.failed = failedCount;

    const duration = Date.now() - this.startTime;
    // Calculate success rate based on actual tests that ran, not expected tests
    // Success rate should never exceed 100% - use actual totalTests as denominator
    const successRate =
      totalTests > 0 ? ((passedCount / totalTests) * 100).toFixed(1) : "0.0";

    const reportData = {
      summary: {
        totalTests,
        totalExpected: this.totalExpectedTests || totalTests, // Include expected total
        passed: passedCount,
        failed: failedCount,
        successRate: `${successRate}%`,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date().toISOString(),
        suiteFailed: suiteFailures.length > 0,
        suiteFailureMessage: suiteFailures.length > 0 ? suiteFailures[0].error : null,
      },
      environment: this.environment,
      testResults: individualTestResults, // Only individual tests, not suite-level
      suiteFailures: suiteFailures, // Suite-level failures separate
      failedTests: this.testResults.errors,
      testProject: this.testProject
        ? {
            id: this.testProject.id,
            name: this.testProject.name,
          }
        : null,
      testCollection: this.testCollection
        ? {
            id: this.testCollection.id,
            name: this.testCollection.name,
          }
        : null,
      serviceLogs: this.serviceLogs || { backend: [], frontend: [] },
    };

    // Fix the failed count by counting actual failed tests (more reliable)
    const actualFailedCount = reportData.failedTests.filter(
      (e) => {
        const fieldValue = e.name || e.test || "";
        return !fieldValue.includes("Test Suite");
      }
    ).length;
    reportData.summary.failed = actualFailedCount;
    reportData.summary.totalTests = passedCount + actualFailedCount;

    // Create logs directory if it doesn't exist
    const logsDir = join(process.cwd(), this.logsDirectory);
    if (!existsSync(logsDir)) {
      await mkdir(logsDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonFilename = join(logsDir, `test-results-${timestamp}.json`);

    // Save JSON report (only JSON, no duplicate TXT)
    await writeFile(jsonFilename, JSON.stringify(reportData, null, 2), "utf-8");

    // Generate errors-only report (no debug logs, no passed tests) - only if there are errors
    const errorsFilename = join(logsDir, `test-errors-${timestamp}.txt`);
    if (failedCount > 0 || suiteFailures.length > 0) {
      await this.saveErrorsOnlyReport(errorsFilename, {
        totalTests,
        passedCount,
        failedCount,
        successRate,
        duration,
        suiteFailures,
      });
    }

    // Mark as saved to prevent duplicate saves
    this.filesSaved = true;

    console.log(`\n📄 Test results saved to:`);
    console.log(`   JSON: ${jsonFilename}`);
    if (failedCount > 0 || suiteFailures.length > 0) {
      console.log(`   Errors Only: ${errorsFilename}`);
    }

    return { 
      jsonFilename, 
      errorsFilename: (failedCount > 0 || suiteFailures.length > 0) ? errorsFilename : null 
    };
  }

  /**
   * Save errors-only report (no debug logs, no passed tests)
   */
  async saveErrorsOnlyReport(filename, summary) {
    let errorsReport = "=".repeat(80) + "\n";
    // Use different title based on logs directory
    const errorsTitle = this.logsDirectory === "frontend-ui-test-logs"
      ? "KRAPI FRONTEND UI TEST SUITE - ERRORS ONLY"
      : "KRAPI TEST SUITE - ERRORS ONLY";
    errorsReport += `${errorsTitle}\n`;
    errorsReport += "=".repeat(80) + "\n\n";

    errorsReport += "SUMMARY\n";
    errorsReport += "-".repeat(80) + "\n";
    errorsReport += `Total Tests: ${summary.totalTests}\n`;
    errorsReport += `Passed: ${summary.passedCount}\n`;
    errorsReport += `Failed: ${summary.failedCount}\n`;
    errorsReport += `Success Rate: ${summary.successRate}%\n`;
    errorsReport += `Duration: ${summary.duration}ms\n`;
    errorsReport += `Timestamp: ${new Date().toISOString()}\n\n`;

    errorsReport += "ENVIRONMENT\n";
    errorsReport += "-".repeat(80) + "\n";
    errorsReport += `Node Version: ${this.environment.nodeVersion || "N/A"}\n`;
    errorsReport += `Platform: ${this.environment.platform || "N/A"}\n`;
    errorsReport += `Architecture: ${this.environment.arch || "N/A"}\n`;
    errorsReport += `Frontend URL: ${this.environment.frontendUrl || "N/A"}\n`;
    errorsReport += `Backend URL: ${this.environment.backendUrl || "N/A"}\n\n`;

    if (this.testProject) {
      errorsReport += "TEST PROJECT\n";
      errorsReport += "-".repeat(80) + "\n";
      errorsReport += `ID: ${this.testProject.id}\n`;
      errorsReport += `Name: ${this.testProject.name}\n\n`;
    }

    if (this.testCollection) {
      errorsReport += "TEST COLLECTION\n";
      errorsReport += "-".repeat(80) + "\n";
      errorsReport += `ID: ${this.testCollection.id}\n`;
      errorsReport += `Name: ${this.testCollection.name}\n\n`;
    }

    // Only include failed individual tests (exclude suite-level failures)
    // Check both this.results (from recordTestResult) and this.testResults.errors (from testResult)
    const failedResults = this.results.filter(
      (r) => r.status === "FAILED" && r.test !== "Test Suite"
    );
    const failedErrors = this.testResults.errors.filter(
      (e) => !(e.name || e.test)?.includes("Test Suite")
    );
    
    // Combine both sources and deduplicate by test name
    const failedTestsMap = new Map();
    failedResults.forEach((r) => {
      const key = r.test || r.name || "Unknown";
      if (!failedTestsMap.has(key)) {
        failedTestsMap.set(key, r);
      }
    });
    failedErrors.forEach((e) => {
      const key = e.test || e.name || "Unknown";
      if (!failedTestsMap.has(key)) {
        // Convert error object to result format
        failedTestsMap.set(key, {
          test: e.test || e.name,
          name: e.name || e.test,
          status: "FAILED",
          error: e.error,
          errorSource: e.errorSource,
          errorCategory: e.errorCategory,
          fixLocation: e.fixLocation,
          duration: e.duration,
          stack: e.stack,
          details: e.details,
        });
      }
    });
    const failedTests = Array.from(failedTestsMap.values());
    
    // Handle suite-level failures separately
    const suiteFailures = summary.suiteFailures || [];

    if (failedTests.length > 0 || suiteFailures.length > 0) {
      // Add suite failures section if they exist
      if (suiteFailures.length > 0) {
        errorsReport += "SUITE-LEVEL FAILURES\n";
        errorsReport += "=".repeat(80) + "\n";
        errorsReport += "These are failures at the test suite level, not individual test failures.\n\n";
        suiteFailures.forEach((failure) => {
          errorsReport += `Test Suite Error: ${failure.error || "Unknown error"}\n`;
          if (failure.stack) {
            errorsReport += `Stack Trace:\n${failure.stack}\n`;
          }
          errorsReport += "\n" + "-".repeat(80) + "\n\n";
        });
      }
      // Group errors by source
      const errorsBySource = {
        SDK: [],
        SERVER: [],
        NETWORK: [],
        UNKNOWN: [],
      };
      
      failedTests.forEach((result) => {
        const source = result.errorSource || "UNKNOWN";
        // Find corresponding error entry for detailed error info
        // Error entries use 'name', results use 'test' - check both
        const errorEntry = this.testResults.errors.find(
          e => (e.test || e.name) === (result.test || result.name)
        );
        if (errorEntry?.details) {
          result.errorDetails = errorEntry.details;
        }
        if (errorsBySource[source]) {
          errorsBySource[source].push(result);
        } else {
          errorsBySource.UNKNOWN.push(result);
        }
      });
      
      // Add error source summary
      errorsReport += "ERROR SOURCE SUMMARY\n";
      errorsReport += "-".repeat(80) + "\n";
      errorsReport += `SDK Issues: ${errorsBySource.SDK.length}\n`;
      errorsReport += `Server Issues: ${errorsBySource.SERVER.length}\n`;
      errorsReport += `Network Issues: ${errorsBySource.NETWORK.length}\n`;
      errorsReport += `Unknown Issues: ${errorsBySource.UNKNOWN.length}\n\n`;
      
      // Group errors by source with section headers
      let testIndex = 1;
      
      // SDK Issues
      if (errorsBySource.SDK.length > 0) {
        errorsReport += "SDK ISSUES\n";
        errorsReport += "=".repeat(80) + "\n\n";
        errorsReport += "These errors indicate issues in the SDK package (@smartsamurai/krapi-sdk).\n";
        errorsReport += "Fix Location: SDK team should address these.\n\n";
        
        errorsBySource.SDK.forEach((result) => {
          const testName = result.test || result.name || "Unknown test";
          errorsReport += `${testIndex++}. ❌ ${testName} (${result.duration}ms)\n`;
          errorsReport += `   Error: ${result.error || "Unknown error"}\n`;
          errorsReport += `   Category: ${result.errorCategory || "UNKNOWN"}\n`;
          errorsReport += `   Fix Location: ${result.fixLocation || "SDK"}\n`;
          
          if (result.httpStatus) {
            errorsReport += `   HTTP Status: ${result.httpStatus} ${
              result.httpStatusText || ""
            }\n`;
          }
          
          if (result.code) {
            errorsReport += `   Error Code: ${result.code}\n`;
          }
          
          // Include only relevant response data (no verbose debug)
          if (result.responseData) {
            const responseData = result.responseData;
            if (responseData.error || responseData.message) {
              errorsReport += `   Error Message: ${responseData.error || responseData.message}\n`;
            }
          }
          
          // Limit stack trace to first 5 lines, filter node_modules
          if (result.stack) {
            const stackLines = result.stack.split("\n");
            const relevantStack = stackLines
              .slice(0, 5)
              .filter((line) => {
                return !line.includes("node_modules") || line.includes("test") || line.includes("krapi-sdk");
              });
            
            if (relevantStack.length > 0) {
              errorsReport += `   Stack Trace (first 5 lines):\n${relevantStack
                .map((line) => `      ${line}`)
                .join("\n")}\n`;
            }
          }
          
          errorsReport += "\n";
        });
      }
      
      // Server Issues
      if (errorsBySource.SERVER.length > 0) {
        errorsReport += "SERVER ISSUES\n";
        errorsReport += "=".repeat(80) + "\n\n";
        errorsReport += "These errors indicate issues in the backend or frontend server code.\n";
        errorsReport += "Fix Location: Check backend routes, handlers, and frontend API routes.\n\n";
        
        errorsBySource.SERVER.forEach((result) => {
          const testName = result.test || result.name || "Unknown test";
          errorsReport += `${testIndex++}. ❌ ${testName} (${result.duration}ms)\n`;
          errorsReport += `   Error: ${result.error || "Unknown error"}\n`;
          errorsReport += `   Category: ${result.errorCategory || "UNKNOWN"}\n`;
          errorsReport += `   Fix Location: ${result.fixLocation || "BACKEND"}\n`;
          
          // Include structured error details if available (from test-suite-factory)
          const errorEntry = this.testResults.errors.find(e => e.test === result.test);
          if (errorEntry?.details) {
            const details = errorEntry.details;
            if (details.browserConsoleErrors?.length > 0) {
              errorsReport += `   Browser Console Errors (${details.browserConsoleErrors.length}):\n`;
              details.browserConsoleErrors.forEach((err, i) => {
                errorsReport += `     ${i + 1}. [${err.type}] ${err.text}\n`;
              });
            }
            if (details.pageErrors?.length > 0) {
              errorsReport += `   Page Errors (${details.pageErrors.length}):\n`;
              details.pageErrors.forEach((err, i) => {
                errorsReport += `     ${i + 1}. ${err.message}\n`;
              });
            }
            if (details.failedHttpResponses?.length > 0) {
              errorsReport += `   Failed HTTP Responses (${details.failedHttpResponses.length}):\n`;
              details.failedHttpResponses.forEach((err, i) => {
                errorsReport += `     ${i + 1}. ${err.status} ${err.statusText} - ${err.url}\n`;
              });
            }
            if (details.directBackendCalls?.length > 0) {
              errorsReport += `   Direct Backend Calls (Architecture Violation):\n`;
              details.directBackendCalls.forEach((call, i) => {
                errorsReport += `     ${i + 1}. ${call.method} ${call.url}\n`;
              });
            }
            if (details.sdkRouteCalls?.length > 0) {
              errorsReport += `   SDK Route Calls (${details.sdkRouteCalls.length}):\n`;
              details.sdkRouteCalls.forEach((call, i) => {
                errorsReport += `     ${i + 1}. ${call.method} ${call.url} (status: ${call.status || 'pending'})\n`;
              });
            }
            if (details.pageInfo) {
              errorsReport += `   Page Info: ${details.pageInfo.title} | ${details.pageInfo.url}\n`;
            }
          }
          
          if (result.httpStatus) {
            errorsReport += `   HTTP Status: ${result.httpStatus} ${
              result.httpStatusText || ""
            }\n`;
          }
          
          if (result.code) {
            errorsReport += `   Error Code: ${result.code}\n`;
          }
          
          // Include only relevant response data
          if (result.responseData) {
            const responseData = result.responseData;
            if (responseData.error || responseData.message) {
              errorsReport += `   Error Message: ${responseData.error || responseData.message}\n`;
            }
            if (responseData.requestedPath) {
              errorsReport += `   Requested Path: ${responseData.requestedPath}\n`;
            }
            if (responseData.method) {
              errorsReport += `   Method: ${responseData.method}\n`;
            }
          }
          
          // Limit stack trace to first 5 lines
          if (result.stack) {
            const stackLines = result.stack.split("\n");
            const relevantStack = stackLines
              .slice(0, 5)
              .filter((line) => {
                return !line.includes("node_modules") || line.includes("test") || line.includes("backend") || line.includes("frontend");
              });
            
            if (relevantStack.length > 0) {
              errorsReport += `   Stack Trace (first 5 lines):\n${relevantStack
                .map((line) => `      ${line}`)
                .join("\n")}\n`;
            }
          }
          
          errorsReport += "\n";
        });
      }
      
      // Network Issues
      if (errorsBySource.NETWORK.length > 0) {
        errorsReport += "NETWORK ISSUES\n";
        errorsReport += "=".repeat(80) + "\n\n";
        errorsReport += "These errors indicate network connectivity problems.\n";
        errorsReport += "Fix Location: Check server availability, ports, and network configuration.\n\n";
        
        errorsBySource.NETWORK.forEach((result) => {
          const testName = result.test || result.name || "Unknown test";
          errorsReport += `${testIndex++}. ❌ ${testName} (${result.duration}ms)\n`;
          errorsReport += `   Error: ${result.error || "Unknown error"}\n`;
          errorsReport += `   Category: ${result.errorCategory || "UNKNOWN"}\n`;
          errorsReport += `   Fix Location: ${result.fixLocation || "NETWORK"}\n`;
          
          if (result.code) {
            errorsReport += `   Error Code: ${result.code}\n`;
          }
          
          errorsReport += "\n";
        });
      }
      
      // Unknown Issues
      if (errorsBySource.UNKNOWN.length > 0) {
        errorsReport += "UNKNOWN ISSUES\n";
        errorsReport += "=".repeat(80) + "\n\n";
        errorsReport += "These errors could not be classified. Manual investigation needed.\n\n";
        
        errorsBySource.UNKNOWN.forEach((result) => {
          const testName = result.test || result.name || "Unknown test";
          errorsReport += `${testIndex++}. ❌ ${testName} (${result.duration}ms)\n`;
          errorsReport += `   Error: ${result.error || "Unknown error"}\n`;
          
          if (result.httpStatus) {
            errorsReport += `   HTTP Status: ${result.httpStatus}\n`;
          }
          
          errorsReport += "\n";
        });
      }
    } else {
      errorsReport += "✅ NO ERRORS - ALL TESTS PASSED\n";
      errorsReport += "=".repeat(80) + "\n";
    }

    errorsReport += "=".repeat(80) + "\n";
    errorsReport += "END OF ERRORS REPORT\n";
    errorsReport += "=".repeat(80) + "\n";

    await writeFile(filename, errorsReport, "utf-8");
  }
}

export default TestLogger;
