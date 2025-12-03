/**
 * Auth Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runAuthTests(testSuite) {
    testSuite.logger.suiteStart("Authentication Tests");

    await testSuite.test("Login with valid credentials via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.auth?.login !== "function") {
        throw new Error("krapi.auth.login method not available");
      }

      const loginResult = await testSuite.krapi.auth.login("admin", "admin123");

      // SDK returns { session_token, expires_at, user, scopes }
      testSuite.assert(loginResult, "Login should return result");
      testSuite.assert(loginResult.session_token, "Session token should be present");
    });

    await testSuite.test("Login with invalid credentials via SDK", async () => {
      try {
        await testSuite.krapi.auth.login("admin", "wrongpassword");
        throw new Error("Should have failed");
      } catch (error) {
        // SDK should throw an error for invalid credentials
        testSuite.assert(
          (error.message &&
            (error.message.includes("Invalid") ||
              error.message.includes("Unauthorized") ||
              error.message.includes("credentials"))) ||
            error.statusCode === 401 ||
            error.status === 401,
          `Should fail with auth error. Got: ${error.message}`
        );
      }
    });

    await testSuite.test("Get current user via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.auth?.getCurrentUser !== "function") {
        throw new Error("krapi.auth.getCurrentUser method not available");
      }

      const result = await testSuite.krapi.auth.getCurrentUser();

      testSuite.assert(result, "Should return result");
      testSuite.assert(result.success === true, "Should succeed");
      // SDK returns { success, data: user }
      const user = result.data;
      testSuite.assert(
        user && user.username === "admin",
        `Should return admin user. Got: ${JSON.stringify(user)}`
      );
    });

    await testSuite.test("Register new user via SDK", async () => {
      if (typeof testSuite.krapi.auth?.register !== "function") {
        throw new Error("krapi.auth.register method not available - endpoint must be implemented");
      }

      // Generate unique username to avoid conflicts
      const uniqueUsername = `testuser_${Date.now()}`;
      const result = await testSuite.krapi.auth.register({
        username: uniqueUsername,
        email: `${uniqueUsername}@test.com`,
        password: "TestPassword123!",
      });

      // Validate response has real data - this will throw if result is empty or missing fields
      testSuite.assertResponse(result, ['success', 'user'], "Registration result should have success and user fields");
      testSuite.assertHasData(result, "Registration response should have real data");
      testSuite.assert(result.success === true, "Registration should succeed");
      testSuite.assertResponse(result.user, ['username', 'email'], "Registered user should have username and email");
      testSuite.assert(result.user.username === uniqueUsername, "Should return registered user with correct username");
    });

    await testSuite.test("Logout via SDK", async () => {
      if (typeof testSuite.krapi.auth?.logout !== "function") {
        throw new Error("krapi.auth.logout method not available - SDK must implement this method");
      }

      const result = await testSuite.krapi.auth.logout();
      testSuite.assert(result, "Should return logout result");
      testSuite.assert(
        typeof result.success === "boolean",
        "Result should have success flag"
      );
    });

    await testSuite.test("Refresh session via SDK", async () => {
      if (typeof testSuite.krapi.auth?.refreshSession !== "function") {
        throw new Error("krapi.auth.refreshSession method not available - SDK must implement this method");
      }

      const result = await testSuite.krapi.auth.refreshSession();
      testSuite.assert(result, "Should return refresh result");
      testSuite.assert(result.session_token, "Result should have session_token");
      testSuite.assert(result.expires_at, "Result should have expires_at");
    });
  }

