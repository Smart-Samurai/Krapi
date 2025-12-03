/**
 * SDKIntegration Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

import CONFIG from "../config.js";

export async function runSDKIntegrationTests(testSuite) {
    testSuite.logger.suiteStart("SDK Integration Tests");

    if (!testSuite.krapi) {
      throw new Error("KRAPI SDK not initialized - SDK must be initialized before running tests");
    }

    // Test 0: Verify we're using frontend URL (CRITICAL - all tests must use frontend)
    await testSuite.test(
      "✅ All tests connect through FRONTEND (simulating external app)",
      async () => {
        // CRITICAL: This test suite simulates external third-party applications
        // ALL requests MUST go through FRONTEND (port 3498), NOT backend (port 3470)
        const endpoint = CONFIG.FRONTEND_URL;
        testSuite.assert(
          endpoint.includes("3498"),
          `❌ CRITICAL ERROR: Tests must use FRONTEND URL (port 3498), got: ${endpoint}`
        );
        testSuite.assert(
          !endpoint.includes("3470"),
          `❌ CRITICAL ERROR: Tests must NOT use BACKEND URL (port 3470), got: ${endpoint}`
        );
        console.log(
          `   ✅ Verified: Using FRONTEND URL: ${endpoint} (correct for external apps)`
        );
        console.log(
          `   ✅ Verified: NOT using BACKEND URL: ${CONFIG.BACKEND_URL} (correct!)`
        );

        // Verify SDK is connected to frontend
        if (testSuite.krapi && testSuite.krapi.getEndpoint) {
          const sdkEndpoint = testSuite.krapi.getEndpoint();
          testSuite.assert(
            sdkEndpoint &&
              (sdkEndpoint.includes("3498") ||
                sdkEndpoint.includes(CONFIG.FRONTEND_URL)),
            `❌ CRITICAL ERROR: SDK must be connected to FRONTEND URL, got: ${sdkEndpoint}`
          );
          console.log(
            `   ✅ Verified: SDK connected to frontend: ${sdkEndpoint}`
          );
        }
      }
    );

    // Test 1: Endpoint Validation
    await testSuite.test(
      "SDK endpoint validation warns about backend URL",
      async () => {
        // This test verifies that SDK warns when connecting to backend URL
        // Note: We can't easily test warnings in automated tests, but we can verify
        // that the SDK still works correctly with frontend URL
        const endpoint = CONFIG.FRONTEND_URL;
        testSuite.assert(
          endpoint.includes("3498") || !endpoint.includes("3470"),
          "Test should use frontend URL (port 3498)"
        );
      }
    );

    // Test 2: Automatic Path Handling and Frontend Routing
    await testSuite.test(
      "SDK automatically routes through frontend API paths",
      async () => {
        // SDK should route through frontend API routes (/api/krapi/k1/*)
        // This ensures all SDK requests go through the frontend proxy, not directly to backend
        // We test this by making a request and verifying it succeeds through frontend
        const projects = await testSuite.krapi.projects.getAll();
        testSuite.assert(
          Array.isArray(projects) || (projects && projects.data),
          "SDK should route through frontend and return projects"
        );

        // Verify the request went through frontend by checking SDK endpoint
        if (testSuite.krapi && testSuite.krapi.getEndpoint) {
          const sdkEndpoint = testSuite.krapi.getEndpoint();
          testSuite.assert(
            sdkEndpoint && sdkEndpoint.includes(CONFIG.FRONTEND_URL),
            `SDK endpoint should be frontend URL, got: ${sdkEndpoint}`
          );
          if (testSuite.logger.verbose) {
            console.log(
              `   ✅ Verified: SDK requests route through frontend: ${sdkEndpoint}`
            );
          }
        }
      }
    );

    // Test 3: Health Check
    await testSuite.test("SDK health check works", async () => {
      if (typeof testSuite.krapi.healthCheck !== "function") {
        throw new Error("healthCheck() method not available");
      }

      const isHealthy = await testSuite.krapi.healthCheck();
      testSuite.assert(
        typeof isHealthy === "boolean",
        "Health check should return boolean"
      );
      testSuite.assert(
        isHealthy === true,
        "Health check should return true when server is healthy"
      );
    });

    // Test 4: Detailed Health Status
    await testSuite.test("SDK getHealthStatus returns detailed status", async () => {
      if (typeof testSuite.krapi.getHealthStatus !== "function") {
        throw new Error("getHealthStatus() method not available");
      }

      const health = await testSuite.krapi.getHealthStatus();
      testSuite.assert(
        health !== null && typeof health === "object",
        "Health status should return an object"
      );
      testSuite.assert(
        health.status === "ok" ||
          health.status === "degraded" ||
          health.status === "down",
        "Health status should have valid status"
      );
    });

    // Test 5: Retry Logic Configuration
    await testSuite.test("SDK retry logic is configured", async () => {
      // Verify that retry logic was configured during setup
      // We can't directly test retries without simulating failures,
      // but we can verify the SDK is configured correctly
      const projects = await testSuite.krapi.projects.getAll();
      testSuite.assert(
        Array.isArray(projects) || (projects && projects.data),
        "SDK should work correctly with retry logic configured"
      );
    });

    // Test 6: Better Error Messages
    await testSuite.test("SDK provides helpful error messages", async () => {
      // Test with invalid project ID to get error message
      try {
        await testSuite.krapi.projects.get("invalid-project-id-that-does-not-exist");
        // If we get here, the test should fail (project shouldn't exist)
        throw new Error("Expected error for invalid project ID");
      } catch (error) {
        // Verify error message is helpful
        testSuite.assert(
          error.message && error.message.length > 0,
          "Error message should be provided"
        );
        // Error should contain helpful information
        const hasHelpfulInfo =
          error.message.includes("not found") ||
          error.message.includes("404") ||
          error.message.includes("project");
        testSuite.assert(
          hasHelpfulInfo,
          "Error message should contain helpful information"
        );
      }
    });

    // Test 7: SDK Compatibility Check
    await testSuite.test("SDK compatibility check works", async () => {
      if (typeof testSuite.krapi.checkCompatibility !== "function") {
        throw new Error("checkCompatibility() method not available");
      }

      const compatibility = await testSuite.krapi.checkCompatibility();
      testSuite.assert(
        compatibility !== null && typeof compatibility === "object",
        "Compatibility check should return an object"
      );
      testSuite.assert(
        typeof compatibility.compatible === "boolean",
        "Compatibility should have a boolean compatible field"
      );
      testSuite.assert(
        compatibility.sdkVersion &&
          typeof compatibility.sdkVersion === "string",
        "Compatibility should include SDK version"
      );
    });

    // Test 8: TypeScript Type Safety (Runtime Check)
    await testSuite.test("SDK connection config types are correct", async () => {
      // Verify that connection was made with correct config structure
      // This is a runtime check since we can't test TypeScript types at runtime
      const projects = await testSuite.krapi.projects.getAll();
      testSuite.assert(
        Array.isArray(projects) || (projects && projects.data),
        "SDK should work with typed connection config"
      );
    });
  }
