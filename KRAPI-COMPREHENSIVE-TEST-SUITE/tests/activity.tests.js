/**
 * ActivityLogging Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runActivityLoggingTests(testSuite) {
    testSuite.logger.suiteStart("Activity Logging Tests");

    await testSuite.test("Get activity logs via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.activity?.query !== "function") {
        throw new Error("krapi.activity.query method not available - SDK must implement this method");
      }

      // LOG: What we're calling
      const queryParams = {};
      console.log("[TEST] Calling SDK method:", {
        method: "krapi.activity.query",
        parameters: queryParams,
        expectedReturnType: "ActivityLog[]",
        expectedFormat: "Array of activity log objects, may be empty array []",
        description: "SDK should return ActivityLog[] directly (not wrapped in ApiResponse)",
      });

      // Use a shorter timeout since this can hang if activity tables aren't ready
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Activity query timed out after 10s")),
          10000
        )
      );

      const queryPromise = testSuite.krapi.activity.query(queryParams);
      const logs = await Promise.race([queryPromise, timeoutPromise]);

      // LOG: What we received from SDK
      console.log("[TEST] activity.query received from SDK:", {
        type: typeof logs,
        isArray: Array.isArray(logs),
        isNull: logs === null,
        isUndefined: logs === undefined,
        keys: logs && typeof logs === "object" ? Object.keys(logs) : [],
        length: Array.isArray(logs) ? logs.length : "N/A",
        sample: Array.isArray(logs) && logs.length > 0 ? logs[0] : logs,
        fullResult: JSON.stringify(logs),
        expected: "ActivityLog[] (array, may be empty)",
        matches: Array.isArray(logs) ? "✅ Matches expected format" : "❌ Does NOT match expected format",
      });

      // SDK returns ActivityLog[] directly
      testSuite.assert(
        Array.isArray(logs),
        `Should return logs array. Got: ${typeof logs}. Expected: ActivityLog[] (array)`
      );
      testSuite.assertHasData(logs, "Activity logs should be returned (may be empty array but should be valid)");
    });

    await testSuite.test("Get activity stats via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.activity?.getStats !== "function") {
        throw new Error("krapi.activity.getStats method not available - SDK must implement this method");
      }

      // LOG: What we're calling
      console.log("[TEST] Calling SDK method:", {
        method: "krapi.activity.getStats",
        parameters: {},
        expectedReturnType: "{ total_actions: number, actions_by_type: Record<string, number>, actions_by_severity: Record<string, number>, actions_by_user: Record<string, number> }",
        expectedFormat: "Object with statistics about activity logs",
        description: "SDK should return activity statistics object",
      });

      // Use a shorter timeout since this can hang if activity tables aren't ready
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Activity stats timed out after 10s")),
          10000
        )
      );

      const statsPromise = testSuite.krapi.activity.getStats();
      const stats = await Promise.race([statsPromise, timeoutPromise]);

      // LOG: What we received from SDK
      console.log("[TEST] activity.getStats received from SDK:", {
        type: typeof stats,
        isArray: Array.isArray(stats),
        isNull: stats === null,
        isUndefined: stats === undefined,
        keys: stats && typeof stats === "object" ? Object.keys(stats) : [],
        hasTotalActions: stats && typeof stats === "object" && "total_actions" in stats,
        hasActionsByType: stats && typeof stats === "object" && "actions_by_type" in stats,
        sample: stats,
        fullResult: JSON.stringify(stats),
        expected: "Stats object with total_actions, actions_by_type, etc.",
        matches: stats && typeof stats === "object" && "total_actions" in stats ? "✅ Matches expected format" : "❌ Does NOT match expected format",
      });

      // SDK returns stats object
      testSuite.assert(stats, "Should return stats object");
      testSuite.assertHasData(stats, "Stats should have real data");
      testSuite.assert(
        typeof stats.total_actions === "number",
        "Stats should have total_actions"
      );
      // Verify stats structure
      if (stats.actions_by_type) {
        testSuite.assert(
          typeof stats.actions_by_type === "object",
          "Stats should have actions_by_type object"
        );
      }
    });

    await testSuite.test("Get recent activity via SDK", async () => {
      if (typeof testSuite.krapi.activity?.getRecent !== "function") {
        throw new Error("krapi.activity.getRecent method not available - SDK must implement this method");
      }

      const projectId = testSuite.testProject?.id;
      const limit = 10;

      // LOG: What we're calling
      console.log("[TEST] Calling SDK method:", {
        method: "krapi.activity.getRecent",
        parameters: { projectId, limit },
        expectedReturnType: "ActivityLog[]",
        expectedFormat: "Array of activity log objects, may be empty array []",
        description: "SDK should return ActivityLog[] directly (not wrapped in ApiResponse)",
      });

      const recent = await testSuite.krapi.activity.getRecent(projectId, limit);

      // LOG: What we received from SDK
      console.log("[TEST] activity.getRecent received from SDK:", {
        type: typeof recent,
        isArray: Array.isArray(recent),
        isNull: recent === null,
        isUndefined: recent === undefined,
        keys: recent && typeof recent === "object" ? Object.keys(recent) : [],
        length: Array.isArray(recent) ? recent.length : "N/A",
        sample: Array.isArray(recent) && recent.length > 0 ? recent[0] : recent,
        fullResult: JSON.stringify(recent),
        expected: "ActivityLog[] (array, may be empty)",
        matches: Array.isArray(recent) ? "✅ Matches expected format" : "❌ Does NOT match expected format",
      });

      testSuite.assert(
        Array.isArray(recent),
        `Should return array of activity logs. Got: ${typeof recent}. Expected: ActivityLog[] (array)`
      );
      // Recent activity may be empty if no activity exists, but should be a valid array
      testSuite.assertHasData(recent, "Recent activity should be returned (may be empty array but should be valid)");
      if (recent.length > 0) {
        testSuite.assertResponse(recent[0], ['id', 'timestamp'], "Activity log should have id and timestamp");
      }
    });

    await testSuite.test("Get user activity timeline via SDK", async () => {
      // SDK doesn't have getUserTimeline, so we use query with user_id filter
      if (typeof testSuite.krapi.activity?.query !== "function") {
        throw new Error("krapi.activity.query method not available - SDK must implement this method");
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const queryParams = {
        start_date: startDate,
        limit: 10,
      };

      // LOG: What we're calling
      console.log("[TEST] Calling SDK method:", {
        method: "krapi.activity.query",
        parameters: { ...queryParams, start_date: startDate.toISOString() },
        expectedReturnType: "ActivityLog[]",
        expectedFormat: "Array of activity log objects, may be empty array []",
        description: "SDK should return ActivityLog[] directly (not wrapped in ApiResponse)",
      });

      const timeline = await testSuite.krapi.activity.query(queryParams);

      // LOG: What we received from SDK
      console.log("[TEST] activity.timeline received from SDK:", {
        type: typeof timeline,
        isArray: Array.isArray(timeline),
        isNull: timeline === null,
        isUndefined: timeline === undefined,
        keys: timeline && typeof timeline === "object" ? Object.keys(timeline) : [],
        length: Array.isArray(timeline) ? timeline.length : "N/A",
        sample: Array.isArray(timeline) && timeline.length > 0 ? timeline[0] : timeline,
        fullResult: JSON.stringify(timeline),
        expected: "ActivityLog[] (array, may be empty)",
        matches: Array.isArray(timeline) ? "✅ Matches expected format" : "❌ Does NOT match expected format",
      });

      testSuite.assert(
        Array.isArray(timeline),
        `Should return array of activity logs. Got: ${typeof timeline}. Expected: ActivityLog[] (array)`
      );
      testSuite.assertHasData(timeline, "Timeline should be returned (may be empty array but should be valid)");
    });

    await testSuite.test("Log activity via SDK", async () => {
      if (typeof testSuite.krapi.activity?.log !== "function") {
        throw new Error("krapi.activity.log method not available - endpoint must be implemented");
      }

      const activityData = {
        user_id: "test-user",
        project_id: testSuite.testProject?.id,
        action: "test_action",
        resource_type: "test",
        resource_id: "test-id",
        severity: "info",
      };

      // LOG: What we're calling
      console.log("[TEST] Calling SDK method:", {
        method: "krapi.activity.log",
        parameters: activityData,
        expectedReturnType: "ActivityLog",
        expectedFormat: "Object with at least { id: string, action: string, resource_type: string, timestamp: Date }",
        description: "SDK should return the created ActivityLog object with generated id and timestamp",
      });

      const activity = await testSuite.krapi.activity.log(activityData);

      // LOG: What we received from SDK
      console.log("[TEST] activity.log received from SDK:", {
        type: typeof activity,
        isArray: Array.isArray(activity),
        isNull: activity === null,
        isUndefined: activity === undefined,
        keys: activity && typeof activity === "object" ? Object.keys(activity) : [],
        hasId: activity && typeof activity === "object" && "id" in activity,
        hasAction: activity && typeof activity === "object" && "action" in activity,
        hasTimestamp: activity && typeof activity === "object" && "timestamp" in activity,
        sample: activity,
        fullResult: JSON.stringify(activity),
        expected: "ActivityLog object with id, action, resource_type, timestamp",
        matches: activity && typeof activity === "object" && "id" in activity ? "✅ Matches expected format" : "❌ Does NOT match expected format",
      });
      
      // Validate response has real data - this will throw if activity is empty or missing fields
      testSuite.assertResponse(activity, ['id'], "Should return logged activity with ID");
      testSuite.assertHasData(activity, "Activity response should have real data");
      testSuite.assert(typeof activity.id === 'string' && activity.id.length > 0, "Activity ID should be a non-empty string");
    });

    await testSuite.test("Cleanup activity logs via SDK", async () => {
      // Check if cleanup method exists (SDK may use cleanOldLogs instead)
      // Try cleanup() first, then fall back to cleanOldLogs()
      let cleanupMethod = null;
      if (typeof testSuite.krapi.activity?.cleanup === "function") {
        cleanupMethod = testSuite.krapi.activity.cleanup.bind(testSuite.krapi.activity);
      } else if (typeof testSuite.krapi.activity?.cleanOldLogs === "function") {
        cleanupMethod = testSuite.krapi.activity.cleanOldLogs.bind(testSuite.krapi.activity);
      } else {
        throw new Error("krapi.activity.cleanup or krapi.activity.cleanOldLogs method not available - SDK must implement one of these methods");
      }

      const daysToKeep = 30;

      // LOG: What we're calling
      console.log("[TEST] Calling SDK method:", {
        method: cleanupMethod === testSuite.krapi.activity?.cleanup ? "krapi.activity.cleanup" : "krapi.activity.cleanOldLogs",
        parameters: { daysToKeep },
        expectedReturnType: "{ success: boolean, deleted_count: number }",
        expectedFormat: "Object with success flag and deleted_count",
        description: "SDK should return cleanup result object",
      });

      const result = await cleanupMethod(daysToKeep);

      // LOG: What we received from SDK
      console.log("[TEST] activity.cleanup received from SDK:", {
        type: typeof result,
        isArray: Array.isArray(result),
        isNull: result === null,
        isUndefined: result === undefined,
        keys: result && typeof result === "object" ? Object.keys(result) : [],
        hasSuccess: result && typeof result === "object" && "success" in result,
        hasDeletedCount: result && typeof result === "object" && "deleted_count" in result,
        sample: result,
        fullResult: JSON.stringify(result),
        expected: "Cleanup result object with success and deleted_count",
        matches: result && typeof result === "object" && "success" in result ? "✅ Matches expected format" : "❌ Does NOT match expected format",
      });

      testSuite.assert(result, "Should return cleanup result");
      testSuite.assertHasData(result, "Cleanup result should have real data");
      testSuite.assert(
        typeof result.success === "boolean",
        "Result should have success flag"
      );
      if (result.deleted_count !== undefined) {
        testSuite.assert(
          typeof result.deleted_count === "number",
          "Result should have deleted_count"
        );
      }
    });
  }
