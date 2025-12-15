/**
 * Test Suite Factory
 * Creates the test suite instance with all necessary utilities
 */

import { getTestData } from "../tests/frontend-ui/test-data-setup.js";
import { CONFIG } from "../config.js";

/**
 * Collect comprehensive error information from browser
 */
async function collectErrorInfo(page, error) {
  const errorInfo = {
    originalError: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    url: page.url(),
    browserConsoleErrors: [],
    networkErrors: [],
    pageErrors: [],
    responseErrors: [],
  };

  try {
    // Collect console errors
    const consoleMessages = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    // Collect page errors
    page.on("pageerror", (pageError) => {
      errorInfo.pageErrors.push({
        message: pageError.message,
        stack: pageError.stack,
      });
    });

    // Collect network errors
    page.on("requestfailed", (request) => {
      errorInfo.networkErrors.push({
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText || "Unknown failure",
        headers: request.headers(),
      });
    });

    // Collect failed responses
    page.on("response", (response) => {
      if (!response.ok()) {
        errorInfo.responseErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
        });
      }
    });

    // Wait a moment to collect errors
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get current console errors (if page is still accessible)
    try {
      const consoleLogs = await page.evaluate(() => {
        return window.consoleErrors || [];
      });
      errorInfo.browserConsoleErrors = consoleLogs;
    } catch (e) {
      // Page might be closed, ignore
    }

    // Get network logs if available
    try {
      const networkLogs = await page.evaluate(() => {
        return window.networkErrors || [];
      });
      errorInfo.networkErrors.push(...networkLogs);
    } catch (e) {
      // Page might be closed, ignore
    }

    // Get page HTML snapshot for debugging
    try {
      errorInfo.pageHTML = await page.content();
      errorInfo.pageTitle = await page.title();
    } catch (e) {
      errorInfo.pageHTML = "Page not accessible";
    }

    // Get screenshot if possible
    try {
      errorInfo.screenshot = await page.screenshot({ encoding: "base64", fullPage: false });
    } catch (e) {
      errorInfo.screenshot = "Screenshot not available";
    }
  } catch (collectError) {
    errorInfo.collectionError = `Failed to collect error info: ${collectError.message}`;
  }

  return errorInfo;
}

export function createTestSuite(logger, page, testData, context, results, checkFailureRate, exitEarly, maxFailureRate, criticalTestsEnabled) {
  return {
    logger,
    page,
    testData: testData || getTestData(),
    assert: (condition, message) => {
      if (!condition) {
        throw new Error(message || "Assertion failed");
      }
    },
    test: async (name, testFunction, options = {}) => {
      const { critical = false } = options;
      const startTime = Date.now();
      const TEST_TIMEOUT = CONFIG.TEST_TIMEOUT; // Single timeout constant - 20 seconds
      
      // Set up error collection
      const consoleErrors = [];
      const networkErrors = [];
      const pageErrors = [];
      const responseErrors = [];

      const consoleHandler = (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") {
          consoleErrors.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location(),
          });
        }
      };

      const pageErrorHandler = (error) => {
        pageErrors.push({
          message: error.message,
          stack: error.stack,
        });
      };

      const requestFailedHandler = (request) => {
        networkErrors.push({
          url: request.url(),
          method: request.method(),
          failure: request.failure()?.errorText || "Unknown failure",
        });
      };

      const responseHandler = async (response) => {
        if (!response.ok()) {
          try {
            const body = await response.text().catch(() => "Could not read response body");
            responseErrors.push({
              url: response.url(),
              status: response.status(),
              statusText: response.statusText(),
              headers: response.headers(),
              body: body.substring(0, 500), // Limit body size
            });
          } catch (e) {
            responseErrors.push({
              url: response.url(),
              status: response.status(),
              statusText: response.statusText(),
              error: `Failed to read response: ${e.message}`,
            });
          }
        }
      };

      page.on("console", consoleHandler);
      page.on("pageerror", pageErrorHandler);
      page.on("requestfailed", requestFailedHandler);
      page.on("response", responseHandler);
      
      try {
        await context.setOffline(false);
        
        // Race the test function against timeout - STRICT MODE: fail immediately on timeout
        await Promise.race([
          testFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`[STRICT MODE] Test timeout after ${TEST_TIMEOUT}ms - test took too long`)), TEST_TIMEOUT)
          )
        ]);
        
        await context.setOffline(false);
        const duration = Date.now() - startTime;
        const testName = critical ? `[CRITICAL] ${name}` : name;
        logger.testResult(testName, "PASSED", duration);
        results.passed++;
        results.total++;
      } catch (error) {
        // STRICT MODE: Any error fails immediately - no recovery, no continuation
        try {
          await context.setOffline(false);
        } catch (e) {
          // Ignore errors restoring state
        }

        // Collect comprehensive error information
        const errorInfo = await collectErrorInfo(page, error);

        // Build comprehensive error message
        let fullErrorMessage = `[STRICT MODE] Test failed: "${name}"\n`;
        fullErrorMessage += `Original Error: ${error.message}\n`;
        fullErrorMessage += `Stack: ${error.stack}\n`;
        fullErrorMessage += `URL: ${errorInfo.url}\n`;
        fullErrorMessage += `Duration: ${Date.now() - startTime}ms\n\n`;

        if (consoleErrors.length > 0) {
          fullErrorMessage += `Browser Console Errors (${consoleErrors.length}):\n`;
          consoleErrors.forEach((err, i) => {
            fullErrorMessage += `  ${i + 1}. [${err.type}] ${err.text}\n`;
            if (err.location) {
              fullErrorMessage += `     Location: ${JSON.stringify(err.location)}\n`;
            }
          });
          fullErrorMessage += `\n`;
        }

        if (pageErrors.length > 0) {
          fullErrorMessage += `Page Errors (${pageErrors.length}):\n`;
          pageErrors.forEach((err, i) => {
            fullErrorMessage += `  ${i + 1}. ${err.message}\n`;
            if (err.stack) {
              fullErrorMessage += `     Stack: ${err.stack}\n`;
            }
          });
          fullErrorMessage += `\n`;
        }

        if (networkErrors.length > 0) {
          fullErrorMessage += `Network Errors (${networkErrors.length}):\n`;
          networkErrors.forEach((err, i) => {
            fullErrorMessage += `  ${i + 1}. ${err.method} ${err.url}\n`;
            fullErrorMessage += `     Failure: ${err.failure}\n`;
            if (err.headers) {
              fullErrorMessage += `     Headers: ${JSON.stringify(err.headers)}\n`;
            }
          });
          fullErrorMessage += `\n`;
        }

        if (responseErrors.length > 0) {
          fullErrorMessage += `Failed HTTP Responses (${responseErrors.length}):\n`;
          responseErrors.forEach((err, i) => {
            fullErrorMessage += `  ${i + 1}. ${err.status} ${err.statusText} - ${err.url}\n`;
            if (err.headers) {
              fullErrorMessage += `     Headers: ${JSON.stringify(err.headers)}\n`;
            }
            if (err.body) {
              fullErrorMessage += `     Body: ${err.body}\n`;
            }
            if (err.error) {
              fullErrorMessage += `     Error: ${err.error}\n`;
            }
          });
          fullErrorMessage += `\n`;
        }

        // Add page info
        try {
          fullErrorMessage += `\nPage Info:\n`;
          fullErrorMessage += `  Title: ${await page.title()}\n`;
          fullErrorMessage += `  URL: ${page.url()}\n`;
          const viewport = page.viewportSize();
          fullErrorMessage += `  Viewport: ${viewport ? `${viewport.width}x${viewport.height}` : 'N/A'}\n`;
        } catch (e) {
          fullErrorMessage += `\nPage Info: Not accessible (${e.message})\n`;
        }

        // Log the full error message to console for debugging
        console.error("\n" + "=".repeat(80));
        console.error("FULL ERROR DETAILS:");
        console.error("=".repeat(80));
        console.error(fullErrorMessage);
        console.error("=".repeat(80) + "\n");

        const duration = Date.now() - startTime;
        const testName = critical ? `[CRITICAL] ${name}` : name;
        logger.testResult(testName, "FAILED", duration, new Error(fullErrorMessage));
        results.failed++;
        results.total++;
        
        // STRICT MODE: Exit immediately on ANY failure - no exceptions
          await exitEarly(
          fullErrorMessage,
          true // Always exit early in strict mode
        );
        throw new Error(fullErrorMessage); // Re-throw with full error info
      } finally {
        // Clean up event listeners
        page.off("console", consoleHandler);
        page.off("pageerror", pageErrorHandler);
        page.off("requestfailed", requestFailedHandler);
        page.off("response", responseHandler);
      }
    },
  };
}


