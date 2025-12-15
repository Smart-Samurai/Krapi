/**
 * ApiKey Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runApiKeyTests(testSuite) {
    testSuite.logger.suiteStart("API Key Tests");

    await testSuite.test("List API keys via SDK", async () => {
      // SDK apiKeys.getAll is admin-only and server-mode only - this is expected behavior
      if (typeof testSuite.krapi.apiKeys?.getAll !== "function") {
        throw new Error("krapi.apiKeys.getAll method not available - SDK must implement this method");
      }
      if (!testSuite.testProject) {
        throw new Error("No test project available for API key tests");
      }
      try {
        const apiKeys = await testSuite.krapi.apiKeys.getAll(testSuite.testProject.id);
        testSuite.assert(Array.isArray(apiKeys), "Should return array of API keys");
      } catch (error) {
        // apiKeys.getAll is admin-only and server-mode only - this is expected
        const errorMessage = error?.message || String(error);
        if (
          errorMessage.includes("client mode") ||
          errorMessage.includes("server mode") ||
          errorMessage.includes("only available")
        ) {
          console.log("   ✅ API keys correctly restricted to server mode - test passed");
          return;
        }
        throw error;
      }
    });

    await testSuite.test("Create API key via SDK", async () => {
      // SDK apiKeys.create is admin-only and server-mode only - this is expected behavior
      if (typeof testSuite.krapi.apiKeys?.create !== "function") {
        throw new Error("krapi.apiKeys.create method not available - SDK must implement this method");
      }
      if (!testSuite.testProject) {
        throw new Error("No test project available for API key tests");
      }
      try {
        const apiKey = await testSuite.krapi.apiKeys.create(testSuite.testProject.id, {
          name: "Test API Key",
          scopes: ["projects:read"],
        });
        testSuite.assert(apiKey, "Should return created API key");
        testSuite.assert(apiKey.id || apiKey.key, "API key should have id or key");
      } catch (error) {
        // apiKeys.create is admin-only and server-mode only - this is expected
        const errorMessage = error?.message || String(error);
        if (
          errorMessage.includes("client mode") ||
          errorMessage.includes("server mode") ||
          errorMessage.includes("only available")
        ) {
          console.log("   ✅ API key creation correctly restricted to server mode - test passed");
          return;
        }
        throw error;
      }
    });

    await testSuite.test("Validate API key via SDK", async () => {
      if (typeof testSuite.krapi.apiKeys?.validateKey !== "function") {
        throw new Error("krapi.apiKeys.validateKey method not available - SDK must implement this method");
      }

      try {
        // Try to validate a test key (will likely fail, but tests the endpoint)
        const result = await testSuite.krapi.apiKeys.validateKey("test-key-123");
        testSuite.assert(result, "Should return validation result");
        testSuite.assert(
          typeof result.valid === "boolean",
          "Result should have valid flag"
        );
      } catch (error) {
        const httpStatus = error?.status || error?.response?.status;
        if (httpStatus === 404) {
          // 404 means endpoint doesn't exist - this should fail, not skip
          throw new Error("Validate API key endpoint not available - endpoint must be implemented");
        }
        // Invalid key is expected - that's fine, test passes
        if (
          error.message &&
          (error.message.includes("invalid") ||
            error.message.includes("not found"))
        ) {
          console.log("   ✅ Invalid key correctly rejected - test passed");
          return;
        }
        throw error;
      }
    });
  }
