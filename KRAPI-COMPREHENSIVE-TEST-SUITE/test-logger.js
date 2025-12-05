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
  testResult(name, status, duration, error = null) {
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
        this.testResults.errors.push({
          name,
          error: error.message || "Unknown error",
          stack: error.stack,
        });
      }
    }

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
   * Log summary
   */
  summary(total, passed, failed, duration, totalExpected = null) {
    const isQuickMode = process.env.STOP_ON_FIRST_FAILURE === "true";
    // Always use totalExpected if provided, otherwise fall back to total
    // totalExpected should always be 117 for the full test suite
    const totalTests = totalExpected !== null && totalExpected > 0 ? totalExpected : (total || 117);
    // Calculate success rate based on expected tests, not just tests that ran
    // If totalExpected is provided, use it; otherwise fall back to actual total
    const successRate = totalExpected && totalExpected > 0 
      ? ((passed / totalExpected) * 100).toFixed(1) 
      : (total > 0 ? ((passed / total) * 100).toFixed(1) : 0);
    
    if (this.minimal && !this.verbose) {
      // Minimal: compact summary - always show total expected (117)
      console.log("\n" + "=".repeat(60));
      if (isQuickMode && totalExpected !== null) {
        console.log(`Tests: ${passed}/${totalTests} (${total} executed before failure) | Duration: ${(duration / 1000).toFixed(2)}s`);
      } else {
        console.log(`Tests: ${passed}/${totalTests} passed (${successRate}%) | Duration: ${(duration / 1000).toFixed(2)}s`);
      }
      if (failed > 0) {
        console.log(`Failed: ${failed} ❌`);
      }
      console.log("=".repeat(60));
    } else {
      console.log("\n" + "=".repeat(60));
      
      console.log("TEST SUMMARY");
      console.log("=".repeat(60));
      
      if (isQuickMode && totalExpected !== null) {
        console.log("⚠️  QUICK MODE: Test execution stopped on first failure");
        console.log(`   • ${total} of ${totalExpected} tests executed before failure`);
        console.log("   • Fix the error and run again to continue");
        console.log("   • For full test suite results, use: pnpm run test:comprehensive");
        console.log("=".repeat(60));
      }
      // Always show total expected (79) even if fewer tests ran
      console.log(`Total: ${total}${totalExpected !== null && totalExpected > 0 ? ` of ${totalExpected} expected` : ""}`);
      console.log(`Passed: ${passed} ✅`);
      console.log(`Failed: ${failed} ${failed > 0 ? "❌" : ""}`);
      console.log(`Success Rate: ${successRate}%`);
      console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log("=".repeat(60));
    }
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
      this.testResults.errors.push({
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
      });
      // Update failed counter
      this.testResults.failed++;
    } else if (status === "PASSED") {
      // Update passed counter
      this.testResults.passed++;
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
      return { jsonFilename: null, txtFilename: null, errorsFilename: null };
    }

    // Calculate totals from results array (more reliable than counters)
    const passedCount = this.results.filter(
      (r) => r.status === "PASSED"
    ).length;
    const failedCount = this.results.filter(
      (r) => r.status === "FAILED"
    ).length;
    const totalTests = passedCount + failedCount;

    // Sync counters with actual results (in case they got out of sync)
    this.testResults.passed = passedCount;
    this.testResults.failed = failedCount;

    const duration = Date.now() - this.startTime;
    // Calculate success rate based on expected tests, not just tests that ran
    // If totalExpectedTests is set, use it; otherwise fall back to actual total
    const expectedTotal = this.totalExpectedTests || totalTests;
    const successRate =
      expectedTotal > 0 ? ((passedCount / expectedTotal) * 100).toFixed(1) : "0.0";

    const reportData = {
      summary: {
        totalTests,
        passed: passedCount,
        failed: failedCount,
        successRate: `${successRate}%`,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date().toISOString(),
      },
      environment: this.environment,
      testResults: this.results,
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

    // Create logs directory if it doesn't exist
    const logsDir = join(process.cwd(), "test-logs");
    if (!existsSync(logsDir)) {
      await mkdir(logsDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonFilename = join(logsDir, `test-results-${timestamp}.json`);
    const txtFilename = join(logsDir, `test-results-${timestamp}.txt`);
    const fullOutputFilename = join(logsDir, `test-full-output-${timestamp}.txt`);

    // Save JSON report
    await writeFile(jsonFilename, JSON.stringify(reportData, null, 2), "utf-8");

    // Generate human-readable text report
    let textReport = "=".repeat(80) + "\n";
    textReport += "KRAPI COMPREHENSIVE TEST SUITE RESULTS\n";
    textReport += "=".repeat(80) + "\n\n";

    textReport += "SUMMARY\n";
    textReport += "-".repeat(80) + "\n";
    if (this.totalExpectedTests && this.totalExpectedTests !== totalTests) {
      textReport += `Total Tests: ${totalTests} of ${this.totalExpectedTests} expected\n`;
    } else {
    textReport += `Total Tests: ${totalTests}\n`;
    }
    textReport += `Passed: ${passedCount}\n`;
    textReport += `Failed: ${failedCount}\n`;
    textReport += `Success Rate: ${successRate}%\n`;
    textReport += `Duration: ${duration}ms\n`;
    textReport += `Timestamp: ${new Date().toISOString()}\n\n`;

    textReport += "ENVIRONMENT\n";
    textReport += "-".repeat(80) + "\n";
    
    // Add service logs section if available (only error-level logs, not debug)
    if (this.serviceLogs && (this.serviceLogs.backend.length > 0 || this.serviceLogs.frontend.length > 0)) {
      textReport += "\nSERVICE LOGS (Error-level only)\n";
      textReport += "-".repeat(80) + "\n";
      
      // Filter to only error-level logs
      const backendErrors = this.serviceLogs.backend.filter(log => 
        log.type === "error" || log.type === "ERROR" || 
        (log.message && (log.message.includes("ERROR") || log.message.includes("error") || log.message.includes("❌")))
      );
      const frontendErrors = this.serviceLogs.frontend.filter(log => 
        log.type === "error" || log.type === "ERROR" || 
        (log.message && (log.message.includes("ERROR") || log.message.includes("error") || log.message.includes("❌")))
      );
      
      if (backendErrors.length > 0) {
        textReport += "\nBACKEND ERRORS:\n";
        backendErrors.forEach((log) => {
          textReport += `[${log.timestamp}] ${log.message}\n`;
        });
      }
      
      if (frontendErrors.length > 0) {
        textReport += "\nFRONTEND ERRORS:\n";
        frontendErrors.forEach((log) => {
          textReport += `[${log.timestamp}] ${log.message}\n`;
        });
      }
      
      textReport += "\n";
    }
    textReport += `Node Version: ${this.environment.nodeVersion || "N/A"}\n`;
    textReport += `Platform: ${this.environment.platform || "N/A"}\n`;
    textReport += `Architecture: ${this.environment.arch || "N/A"}\n`;
    textReport += `Frontend URL: ${this.environment.frontendUrl || "N/A"}\n`;
    textReport += `Backend URL: ${this.environment.backendUrl || "N/A"}\n\n`;

    if (this.testProject) {
      textReport += "TEST PROJECT\n";
      textReport += "-".repeat(80) + "\n";
      textReport += `ID: ${this.testProject.id}\n`;
      textReport += `Name: ${this.testProject.name}\n\n`;
    }

    if (this.testCollection) {
      textReport += "TEST COLLECTION\n";
      textReport += "-".repeat(80) + "\n";
      textReport += `ID: ${this.testCollection.id}\n`;
      textReport += `Name: ${this.testCollection.name}\n\n`;
    }

    textReport += "DETAILED TEST RESULTS\n";
    textReport += "-".repeat(80) + "\n\n";

    // Group tests by status
    const passedTests = this.results.filter((r) => r.status === "PASSED");
    const failedTests = this.results.filter((r) => r.status === "FAILED");

    if (passedTests.length > 0) {
      textReport += `PASSED TESTS (${passedTests.length})\n`;
      textReport += "-".repeat(80) + "\n";
      passedTests.forEach((result) => {
        textReport += `✅ ${result.test} (${result.duration}ms)\n`;
      });
      textReport += "\n";
    }

    if (failedTests.length > 0) {
      textReport += `FAILED TESTS (${failedTests.length})\n`;
      textReport += "-".repeat(80) + "\n";
      failedTests.forEach((result) => {
        textReport += `❌ ${result.test} (${result.duration}ms)\n`;
        textReport += `   Error: ${result.error}\n`;
        if (result.httpStatus) {
          textReport += `   HTTP Status: ${result.httpStatus} ${
            result.httpStatusText || ""
          }\n`;
        }
        if (result.code) {
          textReport += `   Error Code: ${result.code}\n`;
        }
        if (result.responseData) {
          textReport += `   Response Data: ${JSON.stringify(
            result.responseData,
            null,
            2
          )}\n`;
        }
        if (result.stack) {
          textReport += `   Stack Trace:\n${result.stack
            .split("\n")
            .map((line) => `      ${line}`)
            .join("\n")}\n`;
        }
        textReport += "\n";
      });
    }

    textReport += "=".repeat(80) + "\n";
    textReport += "END OF REPORT\n";
    textReport += "=".repeat(80) + "\n";

    // Save text report
    await writeFile(txtFilename, textReport, "utf-8");

    // Generate errors-only report (no debug logs, no passed tests)
    const errorsFilename = join(logsDir, `test-errors-${timestamp}.txt`);
    await this.saveErrorsOnlyReport(errorsFilename, {
      totalTests,
      passedCount,
      failedCount,
      successRate,
      duration,
    });

    // Save full output log (all stdout/stderr from services)
    if (this.fullOutputLog && this.fullOutputLog.length > 0) {
      let fullOutputReport = "=".repeat(80) + "\n";
      fullOutputReport += "KRAPI TEST SUITE - FULL OUTPUT LOG\n";
      fullOutputReport += "=".repeat(80) + "\n\n";
      fullOutputReport += `Timestamp: ${new Date().toISOString()}\n`;
      fullOutputReport += `Total Log Entries: ${this.fullOutputLog.length}\n\n`;
      fullOutputReport += "FULL SERVICE OUTPUT\n";
      fullOutputReport += "-".repeat(80) + "\n\n";
      
      this.fullOutputLog.forEach((log) => {
        const serviceTag = log.service === "backend" ? "[Backend]" : "[Frontend]";
        const typeTag = log.type === "stderr" ? "[ERROR]" : "[INFO]";
        fullOutputReport += `[${log.timestamp}] ${serviceTag} ${typeTag} ${log.message}\n`;
      });
      
      fullOutputReport += "\n" + "=".repeat(80) + "\n";
      fullOutputReport += "END OF FULL OUTPUT LOG\n";
      fullOutputReport += "=".repeat(80) + "\n";
      
      await writeFile(fullOutputFilename, fullOutputReport, "utf-8");
    }

    // Mark as saved to prevent duplicate saves
    this.filesSaved = true;

    console.log(`\n📄 Test results saved to:`);
    console.log(`   JSON: ${jsonFilename}`);
    console.log(`   Text: ${txtFilename}`);
    console.log(`   Errors Only: ${errorsFilename}`);
    if (this.fullOutputLog && this.fullOutputLog.length > 0) {
      console.log(`   Full Output: ${fullOutputFilename}`);
    }
    console.log(`\n💡 You can share these files to help diagnose issues.`);

    return { jsonFilename, txtFilename, errorsFilename, fullOutputFilename };
  }

  /**
   * Save errors-only report (no debug logs, no passed tests)
   */
  async saveErrorsOnlyReport(filename, summary) {
    let errorsReport = "=".repeat(80) + "\n";
    errorsReport += "KRAPI TEST SUITE - ERRORS ONLY\n";
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

    // Only include failed tests
    const failedTests = this.results.filter((r) => r.status === "FAILED");

    if (failedTests.length > 0) {
      // Group errors by source
      const errorsBySource = {
        SDK: [],
        SERVER: [],
        NETWORK: [],
        UNKNOWN: [],
      };
      
      failedTests.forEach((result) => {
        const source = result.errorSource || "UNKNOWN";
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
          errorsReport += `${testIndex++}. ❌ ${result.test} (${result.duration}ms)\n`;
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
          errorsReport += `${testIndex++}. ❌ ${result.test} (${result.duration}ms)\n`;
          errorsReport += `   Error: ${result.error || "Unknown error"}\n`;
          errorsReport += `   Category: ${result.errorCategory || "UNKNOWN"}\n`;
          errorsReport += `   Fix Location: ${result.fixLocation || "BACKEND"}\n`;
          
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
          errorsReport += `${testIndex++}. ❌ ${result.test} (${result.duration}ms)\n`;
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
          errorsReport += `${testIndex++}. ❌ ${result.test} (${result.duration}ms)\n`;
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
