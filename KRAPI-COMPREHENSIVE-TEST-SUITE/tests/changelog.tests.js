/**
 * Changelog Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runChangelogTests(testSuite) {
    testSuite.logger.suiteStart("Changelog Tests");

    await testSuite.test("Get project changelog via SDK", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available - project creation test must run first and succeed");
      }

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
  }
