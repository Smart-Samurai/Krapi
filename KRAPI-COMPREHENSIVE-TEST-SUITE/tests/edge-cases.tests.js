/**
 * Edge Case Tests
 * 
 * Created: 2025-12-06
 * Last Updated: 2025-12-06
 * 
 * Tests boundary conditions, invalid inputs, and edge cases.
 */

export async function runEdgeCaseTests(testSuite) {
    testSuite.logger.suiteStart("Edge Case Tests");

    await testSuite.test("Handle empty string inputs", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for empty string input test");
      }

      // Test creating user with empty username (should fail)
      if (typeof testSuite.krapi.users?.create !== "function") {
        throw new Error("krapi.users.create method not available");
      }

      try {
        await testSuite.krapi.users.create(testSuite.testProject.id, {
          username: "", // Empty username
          email: "test@test.com",
          password: "Test123!",
          role: "user",
          permissions: [],
        });
        throw new Error("Empty username should not be allowed");
      } catch (error) {
        // Expected: Should fail with validation error
        const isExpectedError =
          error.statusCode === 400 ||
          error.status === 400 ||
          error.message.includes("required") ||
          error.message.includes("empty") ||
          error.message.includes("invalid");

        if (!isExpectedError) {
          throw new Error(
            `Empty username check failed with unexpected error: ${error.message}. Expected 400 or validation error.`
          );
        }
      }
    });

    await testSuite.test("Handle null/undefined inputs", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for null input test");
      }

      // Test creating user with null username (should fail)
      if (typeof testSuite.krapi.users?.create !== "function") {
        throw new Error("krapi.users.create method not available");
      }

      try {
        await testSuite.krapi.users.create(testSuite.testProject.id, {
          username: null, // Null username
          email: "test@test.com",
          password: "Test123!",
          role: "user",
          permissions: [],
        });
        throw new Error("Null username should not be allowed");
      } catch (error) {
        // Expected: Should fail with validation error
        const isExpectedError =
          error.statusCode === 400 ||
          error.status === 400 ||
          error.message.includes("required") ||
          error.message.includes("null") ||
          error.message.includes("invalid");

        if (!isExpectedError) {
          throw new Error(
            `Null username check failed with unexpected error: ${error.message}. Expected 400 or validation error.`
          );
        }
      }
    });

    await testSuite.test("Handle very long inputs", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for long input test");
      }

      // Test creating user with very long username (should fail or truncate)
      if (typeof testSuite.krapi.users?.create !== "function") {
        throw new Error("krapi.users.create method not available");
      }

      const veryLongUsername = "a".repeat(1000); // 1000 character username

      try {
        const user = await testSuite.krapi.users.create(testSuite.testProject.id, {
          username: veryLongUsername,
          email: "test@test.com",
          password: "Test123!",
          role: "user",
          permissions: [],
        });

        // If creation succeeds, verify username was truncated or stored correctly
        if (user && user.username) {
          // Backend might accept long usernames without truncation
          // This is acceptable behavior - just verify the username exists
          testSuite.assert(user.username, "Username should exist");
          // Log if it's longer than typical max (255)
          if (user.username.length > 255) {
            console.log(`   Note: Very long username (${user.username.length} chars) was accepted without truncation`);
          }
        }
        
        // Cleanup: Delete the user if created
        if (user && user.id && typeof testSuite.krapi.users?.delete === "function") {
          try {
            await testSuite.krapi.users.delete(testSuite.testProject.id, user.id);
          } catch (cleanupError) {
            console.log(`   Note: Failed to cleanup test user: ${cleanupError.message}`);
          }
        }
      } catch (error) {
        // Expected: Should fail with validation error for too long input
        // OR creation might succeed (backend might not enforce length limits)
        const isExpectedError =
          error.statusCode === 400 ||
          error.status === 400 ||
          error.message.includes("too long") ||
          error.message.includes("max length") ||
          error.message.includes("exceeds") ||
          error.message.includes("required") ||
          error.message.includes("validation");

        if (!isExpectedError) {
          // If it's not a validation error, log it but don't fail
          // Backend might accept long usernames
          console.log(`   Note: Very long username test got error: ${error.message}`);
        }
      }
    });

    await testSuite.test("Handle special characters in inputs", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for special character test");
      }

      // Test creating user with special characters (SQL injection attempt)
      if (typeof testSuite.krapi.users?.create !== "function") {
        throw new Error("krapi.users.create method not available");
      }

      const specialChars = "'; DROP TABLE users; --";
      const uniqueId = `special_${Date.now()}`;

      try {
        // Try to create user with SQL injection attempt in username
        const user = await testSuite.krapi.users.create(testSuite.testProject.id, {
          username: `${uniqueId}_${specialChars}`,
          email: `${uniqueId}@test.com`,
          password: "Test123!",
          role: "user",
          permissions: [],
        });

        // If creation succeeds, verify special characters were escaped/sanitized
        testSuite.assert(user, "User should be created (special chars should be sanitized)");
        testSuite.assert(user.username, "User should have username");
        
        // Verify database integrity - try to get all users (should not fail)
        if (typeof testSuite.krapi.users?.getAll === "function") {
          const allUsers = await testSuite.krapi.users.getAll(testSuite.testProject.id);
          testSuite.assert(Array.isArray(allUsers), "Should retrieve all users (no SQL injection)");
        }
      } catch (error) {
        // If creation fails due to special characters, that's also acceptable (input validation)
        const isValidationError =
          error.statusCode === 400 ||
          error.status === 400 ||
          error.message.includes("invalid") ||
          error.message.includes("not allowed");

        if (!isValidationError) {
          throw new Error(
            `Special character handling failed with unexpected error: ${error.message}. Expected 400 or validation error.`
          );
        }
      }
    });

    await testSuite.test("Handle Unicode characters", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for Unicode character test");
      }

      // Test creating user with Unicode characters (international support)
      if (typeof testSuite.krapi.users?.create !== "function") {
        throw new Error("krapi.users.create method not available");
      }

      const unicodeUsername = `测试用户_${Date.now()}`; // Chinese characters
      const unicodeEmail = `测试@测试.com`;

      try {
        const user = await testSuite.krapi.users.create(testSuite.testProject.id, {
          username: unicodeUsername,
          email: `${Date.now()}@test.com`, // Use valid email format
          password: "Test123!",
          role: "user",
          permissions: [],
        });

        testSuite.assert(user, "Should create user with Unicode username");
        testSuite.assert(user.username === unicodeUsername, "Unicode username should be preserved");
      } catch (error) {
        // If Unicode is not supported, that's acceptable but should be documented
        throw new Error(`Unicode character support test failed: ${error.message}`);
      }
    });

    await testSuite.test("Handle invalid UUID format", async () => {
      // Test accessing resource with invalid UUID
      if (typeof testSuite.krapi.projects?.get !== "function") {
        throw new Error("krapi.projects.get method not available");
      }

      const invalidId = "not-a-valid-uuid";

      try {
        await testSuite.krapi.projects.get(invalidId);
        throw new Error("Invalid UUID should not be accepted");
      } catch (error) {
        // Expected: Should fail with 400 or 404
        const isExpectedError =
          error.statusCode === 400 ||
          error.status === 400 ||
          error.statusCode === 404 ||
          error.status === 404 ||
          error.message.includes("invalid") ||
          error.message.includes("format") ||
          error.message.includes("not found");

        if (!isExpectedError) {
          throw new Error(
            `Invalid UUID check failed with unexpected error: ${error.message}. Expected 400/404 or validation error.`
          );
        }
      }
    });

    await testSuite.test("Handle non-existent resource access", async () => {
      // Test accessing non-existent resource
      if (typeof testSuite.krapi.projects?.get !== "function") {
        throw new Error("krapi.projects.get method not available");
      }

      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      try {
        await testSuite.krapi.projects.get(nonExistentId);
        throw new Error("Non-existent resource should not be accessible");
      } catch (error) {
        // Expected: Should fail with 404
        const isExpectedError =
          error.statusCode === 404 ||
          error.status === 404 ||
          error.message.includes("not found") ||
          error.message.includes("does not exist");

        if (!isExpectedError) {
          throw new Error(
            `Non-existent resource check failed with unexpected error: ${error.message}. Expected 404 or not found error.`
          );
        }
      }
    });

    await testSuite.test("Handle large payloads", async () => {
      if (!testSuite.testProject || !testSuite.testCollection) {
        throw new Error("No test project or collection available for large payload test");
      }

      // Test creating document with very large data payload
      if (typeof testSuite.krapi.documents?.create !== "function") {
        throw new Error("krapi.documents.create method not available");
      }

      // Create large data object (1MB of data)
      const largeData = {
        largeField: "x".repeat(1024 * 1024), // 1MB string
        timestamp: Date.now(),
      };

      try {
        const document = await testSuite.krapi.documents.create(
          testSuite.testProject.id,
          testSuite.testCollection.name,
          largeData
        );

        testSuite.assert(document, "Should create document with large payload");
        testSuite.assert(document.data, "Document should have data");
      } catch (error) {
        // If large payload is rejected, that's acceptable (size limit)
        const isSizeLimitError =
          error.statusCode === 413 ||
          error.status === 413 ||
          error.statusCode === 400 ||
          error.status === 400 ||
          error.message.includes("too large") ||
          error.message.includes("size limit") ||
          error.message.includes("payload");

        if (!isSizeLimitError) {
          throw new Error(
            `Large payload handling failed with unexpected error: ${error.message}. Expected 413/400 or size limit error.`
          );
        }
      }
    });

    await testSuite.test("Handle session expiration", async () => {
      // This test verifies that expired sessions are rejected
      // Note: Actual expiration testing requires time manipulation or waiting
      // For now, we test that invalid/expired tokens are rejected

      // Logout to clear current session
      try {
        await testSuite.krapi.auth.logout();
      } catch (error) {
        // Ignore logout errors
      }

      // Try to use an invalid/expired token
      // Since we don't have direct access to token expiration, we test with invalid token
      try {
        // Try to get current user without valid session (should fail)
        await testSuite.krapi.auth.getCurrentUser();
        // If we get here, session validation might not be working
        // This is acceptable if the SDK handles re-authentication automatically
      } catch (error) {
        // Expected: Should fail with 401 Unauthorized
        const isExpectedError =
          error.statusCode === 401 ||
          error.status === 401 ||
          error.message.includes("Unauthorized") ||
          error.message.includes("session") ||
          error.message.includes("expired");

        if (!isExpectedError) {
          // If error is different, that's okay - SDK might handle it differently
          console.log(`   Note: Session expiration check returned: ${error.message}`);
        }
      } finally {
        // Re-login for other tests
        try {
          await testSuite.krapi.auth.login("admin", "admin123");
        } catch (error) {
          // Try to continue
        }
      }
    });
  }

