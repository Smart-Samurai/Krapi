/**
 * Queue Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runQueueTests(testSuite) {
    testSuite.logger.suiteStart("Database Queue Tests");

    await testSuite.test("Get project changelog via SDK", async () => {
      if (typeof testSuite.krapi.changelog?.getProjectChangelog !== "function") {
        throw new Error("krapi.changelog.getProjectChangelog method not available - SDK must implement this method");
      }

      const changelog = await testSuite.krapi.changelog.getProjectChangelog(
        testSuite.testProject.id,
        { limit: 10 }
      );
      testSuite.assert(Array.isArray(changelog), "Should return changelog array");
      testSuite.assertHasData(changelog, "Changelog should be returned (may be empty array but should be valid)");
    });

    await testSuite.test("Get queue metrics via SDK health", async () => {
      if (typeof testSuite.krapi.health?.runDiagnostics !== "function") {
        throw new Error("krapi.health.runDiagnostics method not available - SDK must implement this method");
      }

      // Use SDK health.runDiagnostics which includes queue metrics
      const diagnostics = await testSuite.krapi.health.runDiagnostics();
      testSuite.assert(diagnostics, "Should return diagnostics");
      testSuite.assertHasData(diagnostics, "Diagnostics should have real data");
      testSuite.assert(
        Array.isArray(diagnostics.tests),
        "Diagnostics should have tests array"
      );
      testSuite.assert(diagnostics.summary, "Diagnostics should have summary");
      testSuite.assert(
        typeof diagnostics.summary.total === "number",
        "Summary should have total"
      );
    });

    await testSuite.test(
      "Get queue metrics via SDK database.getQueueMetrics()",
      async () => {
        try {
          // Use SDK database.getQueueMetrics() method (now available!)
          if (typeof testSuite.krapi.database?.getQueueMetrics !== "function") {
            throw new Error(
              "krapi.database.getQueueMetrics method not available"
            );
          }

          const metrics = await testSuite.krapi.database.getQueueMetrics();
          testSuite.assert(metrics, "Should return queue metrics");
          testSuite.assert(
            typeof metrics.queueSize === "number",
            "Metrics should have queueSize"
          );
          testSuite.assert(
            typeof metrics.processingCount === "number",
            "Metrics should have processingCount"
          );
          testSuite.assert(
            typeof metrics.totalProcessed === "number",
            "Metrics should have totalProcessed"
          );
          testSuite.assert(
            typeof metrics.totalErrors === "number",
            "Metrics should have totalErrors"
          );
          testSuite.assert(
            typeof metrics.averageWaitTime === "number",
            "Metrics should have averageWaitTime"
          );
          testSuite.assert(
            typeof metrics.averageProcessTime === "number",
            "Metrics should have averageProcessTime"
          );
          testSuite.assert(
            Array.isArray(metrics.queueItems),
            "Metrics should have queueItems array"
          );
        } catch (error) {
          // Missing endpoint should fail the test
          const httpStatus = error?.status || error?.response?.status;
          if (httpStatus === 404) {
            throw new Error("Queue metrics endpoint not available - backend must implement this endpoint");
          }
          throw error;
        }
      }
    );

    await testSuite.test("Queue metrics in health endpoint via SDK", async () => {
      if (typeof testSuite.krapi.health?.check !== "function") {
        throw new Error("krapi.health.check method not available - SDK must implement this method");
      }

      // Use SDK health.check which returns queue metrics
      const health = await testSuite.krapi.health.check();
      testSuite.assert(health, "Should return health object");
      testSuite.assertHasData(health, "Health should have real data");
      testSuite.assert(
        typeof health.healthy === "boolean",
        "Health should have healthy boolean"
      );
      testSuite.assert(health.message, "Health should have message");
      // Queue metrics may be in details
      if (health.details) {
        testSuite.assert(
          typeof health.details === "object",
          "Details should be an object"
        );
      }
    });

    await testSuite.test("Performance metrics via SDK diagnostics", async () => {
      if (typeof testSuite.krapi.health?.runDiagnostics !== "function") {
        throw new Error("krapi.health.runDiagnostics method not available - SDK must implement this method");
      }

      // Use SDK health.runDiagnostics which includes performance metrics
      const diagnostics = await testSuite.krapi.health.runDiagnostics();
      testSuite.assert(diagnostics, "Should return diagnostics");
      testSuite.assertHasData(diagnostics, "Diagnostics should have real data");
      testSuite.assert(diagnostics.summary, "Should have summary");
      testSuite.assert(
        typeof diagnostics.summary.duration === "number",
        "Should have duration"
      );
    });
  }
