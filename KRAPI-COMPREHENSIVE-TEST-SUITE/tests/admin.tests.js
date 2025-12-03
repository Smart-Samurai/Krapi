/**
 * Admin Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runAdminTests(testSuite) {
    testSuite.logger.suiteStart("Admin Management Tests");

    await testSuite.test("Get all admin users via SDK", async () => {
      if (typeof testSuite.krapi.admin?.getAllUsers !== "function") {
        throw new Error("krapi.admin.getAllUsers method not available - SDK must implement this method");
      }

      const users = await testSuite.krapi.admin.getAllUsers();
      testSuite.assert(Array.isArray(users), "Should return users array");
      testSuite.assertHasData(users, "Admin users should be returned (may be empty array but should be valid)");
    });

    await testSuite.test("Get admin user by ID via SDK", async () => {
      if (typeof testSuite.krapi.admin?.getUser !== "function") {
        throw new Error("krapi.admin.getUser method not available - SDK must implement this method");
      }

      // First get all users to find a user ID
      const users = await testSuite.krapi.admin.getAllUsers();
      if (users.length > 0) {
        const user = await testSuite.krapi.admin.getUser(users[0].id);
        testSuite.assert(user, "Should return user data");
        testSuite.assertHasData(user, "User data should have real data");
        testSuite.assert(user.id, "User should have an ID");
      } else {
        throw new Error("No admin users available to test getUser - getAllUsers must return at least one user");
      }
    });
  }
