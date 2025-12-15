/**
 * Performance Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runPerformanceTests(testSuite) {
    testSuite.logger.suiteStart("Performance Monitoring Tests");

    await testSuite.test("Get performance metrics via SDK", async () => {
      // Use SDK health.runDiagnostics for performance metrics
      if (typeof testSuite.krapi.health?.runDiagnostics !== "function") {
        throw new Error("krapi.health.runDiagnostics method not available - SDK must implement this method");
      }

      const diagnostics = await testSuite.krapi.health.runDiagnostics();

      // SDK returns diagnostics object
      testSuite.assert(diagnostics, "Should return diagnostics object");
      testSuite.assertHasData(diagnostics, "Diagnostics should have real data");
      testSuite.assert(
        Array.isArray(diagnostics.tests),
        "Diagnostics should have tests array"
      );
    });

    await testSuite.test("Get system health via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.health?.check !== "function") {
        throw new Error("krapi.health.check method not available");
      }

      const health = await testSuite.krapi.health.check();

      // SDK returns health object directly
      testSuite.assert(health, "Should return health object");
      testSuite.assert(
        typeof health.healthy === "boolean",
        "Health should have healthy boolean"
      );
    });
  }
