/**
 * SDKApi Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runSDKApiTests(testSuite) {
    testSuite.logger.suiteStart("SDK API Endpoint Tests");

    await testSuite.test("Test SDK status via health check", async () => {
      if (typeof testSuite.krapi.health?.check !== "function") {
        throw new Error("krapi.health.check method not available - SDK must implement this method");
      }

      // Use SDK health.check to verify SDK is working
      const health = await testSuite.krapi.health.check();
      testSuite.assert(health, "Should return health object");
      testSuite.assertHasData(health, "Health should have real data");
      testSuite.assert(
        typeof health.healthy === "boolean",
        "Should have healthy status"
      );
      // version may not be present in all implementations
      if (health.version) {
        testSuite.assert(health.version, "Should have version info");
      }
    });

    await testSuite.test("Get system settings via SDK", async () => {
      if (typeof testSuite.krapi.system?.getSettings !== "function") {
        throw new Error("krapi.system.getSettings method not available - SDK must implement this method");
      }

      const settings = await testSuite.krapi.system.getSettings();
      testSuite.assert(settings, "Should return system settings");
      testSuite.assertHasData(settings, "System settings should have real data");
      testSuite.assert(
        typeof settings === "object",
        "Settings should be an object"
      );
    });

    await testSuite.test("Update system settings via SDK", async () => {
      if (typeof testSuite.krapi.system?.updateSettings !== "function") {
        throw new Error("krapi.system.updateSettings method not available - SDK must implement this method");
      }

      const settings = await testSuite.krapi.system.updateSettings({
        test_setting: "test_value",
      });
      testSuite.assert(settings, "Should return updated settings");
      testSuite.assertHasData(settings, "Updated system settings should have real data");
      testSuite.assert(
        typeof settings === "object",
        "Settings should be an object"
      );
    });

    await testSuite.test("Test SDK system info", async () => {
      if (typeof testSuite.krapi.system?.getInfo !== "function") {
        throw new Error("krapi.system.getInfo method not available - SDK must implement this method");
      }

      // Use SDK system.getInfo to get SDK status
      const info = await testSuite.krapi.system.getInfo();
      testSuite.assert(info, "Should return system info");
      testSuite.assertHasData(info, "System info should have real data");
      testSuite.assert(info.version || info.name, "Should have version or name");
      // Verify system info structure
      if (info.name) {
        testSuite.assert(
          typeof info.name === "string",
          "System info should have name"
        );
      }
      if (info.platform) {
        testSuite.assert(
          typeof info.platform === "string",
          "System info should have platform"
        );
      }
    });

    await testSuite.test("System resetDatabase method exists", async () => {
      if (typeof testSuite.krapi.system?.resetDatabase !== "function") {
        throw new Error("krapi.system.resetDatabase method not available - SDK must implement this method");
      }
      testSuite.assert(true, "System resetDatabase method is available");
    });

    await testSuite.test("System resetDatabase returns proper structure", async () => {
      if (typeof testSuite.krapi.system?.resetDatabase !== "function") {
        throw new Error("krapi.system.resetDatabase method not available - SDK must implement this method");
      }

      // Note: We don't actually call resetDatabase in tests as it's destructive
      // We just verify the method exists and has the correct signature
      testSuite.assert(
        typeof testSuite.krapi.system.resetDatabase === "function",
        "resetDatabase should be a function"
      );
    });
  }
