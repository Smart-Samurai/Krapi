/**
 * Test Suite Factory
 * Creates the test suite instance with all necessary utilities
 */

import { getTestData } from "../tests/frontend-ui/test-data-setup.js";

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
      const TEST_TIMEOUT = 10000;
      
      try {
        await context.setOffline(false);
        
        await Promise.race([
          testFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Test timeout after ${TEST_TIMEOUT}ms`)), TEST_TIMEOUT)
          )
        ]);
        
        await context.setOffline(false);
        const duration = Date.now() - startTime;
        const testName = critical ? `[CRITICAL] ${name}` : name;
        logger.testResult(testName, "PASSED", duration);
        results.passed++;
        results.total++;
      } catch (error) {
        try {
          await context.setOffline(false);
        } catch (e) {
          // Ignore errors restoring state
        }
        const duration = Date.now() - startTime;
        const testName = critical ? `[CRITICAL] ${name}` : name;
        logger.testResult(testName, "FAILED", duration, error);
        results.failed++;
        results.total++;
        
        if (critical && criticalTestsEnabled) {
          await exitEarly(
            `Critical test failed: "${name}" - ${error.message}`,
            true
          );
          return;
        }
        
        if (checkFailureRate()) {
          await exitEarly(
            `Failure rate ${((results.failed / results.total) * 100).toFixed(1)}% exceeds threshold of ${maxFailureRate}%`
          );
          return;
        }
        
        if (process.env.STOP_ON_FIRST_FAILURE === "true") {
          throw error;
        }
      }
    },
  };
}


