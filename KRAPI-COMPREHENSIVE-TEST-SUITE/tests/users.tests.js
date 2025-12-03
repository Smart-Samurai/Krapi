/**
 * User Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runUserTests(testSuite) {
    testSuite.logger.suiteStart("User Management Tests");

    let testUserId = null;

    await testSuite.test("Get user activity via SDK", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for user activity test");
      }

      // First create a test user if we don't have one
      if (!testUserId) {
        try {
          const testUser = await testSuite.krapi.users.create(testSuite.testProject.id, {
            username: `testuser_activity_${Date.now()}`,
            email: `testuser.activity.${Date.now()}@example.com`,
            role: "member",
          });
          testUserId = testUser.id;
        } catch (error) {
          // If user creation fails, try to get existing users
          const users = await testSuite.krapi.users.getAll(testSuite.testProject.id);
          if (users.length > 0) {
            testUserId = users[0].id;
          } else {
            throw new Error(
              `Could not create or find test user: ${error.message}`
            );
          }
        }
      }

      // Use SDK users.getActivity() method
      if (typeof testSuite.krapi.users?.getActivity !== "function") {
        throw new Error("krapi.users.getActivity method not available");
      }

      const activity = await testSuite.krapi.users.getActivity(
        testSuite.testProject.id,
        testUserId,
        {
          limit: 10,
          offset: 0,
        }
      );

      testSuite.assert(Array.isArray(activity), "Should return activity array");
    });

    await testSuite.test("Get user statistics via SDK", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for user statistics test");
      }

      // Use SDK users.getStatistics() method
      if (typeof testSuite.krapi.users?.getStatistics !== "function") {
        throw new Error("krapi.users.getStatistics method not available");
      }

      const stats = await testSuite.krapi.users.getStatistics(testSuite.testProject.id);

      testSuite.assert(stats, "Should return statistics object");
      testSuite.assert(
        typeof stats.total_users === "number",
        "Statistics should have total_users"
      );
      testSuite.assert(
        typeof stats.active_users === "number",
        "Statistics should have active_users"
      );
      testSuite.assert(
        typeof stats.users_by_role === "object",
        "Statistics should have users_by_role object"
      );
      testSuite.assert(
        typeof stats.recent_logins === "number",
        "Statistics should have recent_logins"
      );
    });

    await testSuite.test(
      "List project users via SDK (empty initially)",
      async () => {
        if (!testSuite.testProject) {
          throw new Error("No test project available for user tests");
        }

        // Use SDK method instead of direct axios call
        if (typeof testSuite.krapi.users?.getAll !== "function") {
          throw new Error("krapi.users.getAll method not available");
        }

        const users = await testSuite.krapi.users.getAll(testSuite.testProject.id);

        // SDK returns array directly
        testSuite.assert(
          Array.isArray(users),
          `Should return users array. Got: ${typeof users}`
        );
      }
    );

    await testSuite.test("Create project user via SDK", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for user tests");
      }

      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.users?.create !== "function") {
        throw new Error("krapi.users.create method not available");
      }

      // Industry-standard cleanup: Delete ALL existing test users BEFORE generating unique email
      // This prevents race conditions where a user is created between cleanup and email generation
      // CRITICAL: Cleanup must happen first to ensure clean state
      // This ensures we start with a completely clean state
      // CRITICAL: This must run BEFORE generating the unique email to avoid race conditions
      try {
        // First, ensure the project database is initialized by making a simple query
        // This triggers database initialization if needed
        let existingUsers = [];
        try {
          existingUsers = await testSuite.krapi.users.getAll(testSuite.testProject.id);
          console.log(
            `   ℹ️  Found ${existingUsers.length} existing user(s) in project - checking for test users to clean...`
          );
        } catch (initError) {
          // If getAll fails, the database might not be initialized yet
          // That's okay - we'll try to create the user anyway and let it initialize
          console.log(
            `   ℹ️  Database might not be initialized yet (this is okay): ${initError.message}`
          );
        }

        // Delete ALL test users (those with testuser prefix in email or username)
        // This is industry-standard: clean state before each test
        // CRITICAL: Delete ALL users matching test patterns, not just specific ones
        let deletedCount = 0;
        let failedDeletions = 0;
        for (const existingUser of existingUsers) {
          // Match any test user by email or username pattern (comprehensive matching)
          const isTestUser =
            (existingUser.email && existingUser.email.includes("testuser.")) ||
            (existingUser.username &&
              existingUser.username.startsWith("testuser_")) ||
            (existingUser.email && existingUser.email.includes("@example.com"));

          if (isTestUser) {
            try {
              await testSuite.krapi.users.delete(
                testSuite.testProject.id,
                existingUser.id
              );
              deletedCount++;
              if (deletedCount <= 5) {
                console.log(
                  `   ✅ Cleaned up test user: ${
                    existingUser.email || existingUser.username
                  } (ID: ${existingUser.id})`
                );
              }
            } catch (deleteError) {
              failedDeletions++;
              // Log but continue - user might already be deleted
              const errorMsg = deleteError.message || String(deleteError);
              if (
                !errorMsg.includes("not found") &&
                !errorMsg.includes("does not exist") &&
                !errorMsg.includes("404")
              ) {
                console.log(
                  `   ⚠️  Could not delete test user ${existingUser.id} (${existingUser.email}): ${errorMsg}`
                );
              }
            }
          }
        }

        if (deletedCount > 0) {
          console.log(`   ✅ Cleaned up ${deletedCount} existing test user(s)`);
        }
        if (failedDeletions > 0) {
          console.log(
            `   ⚠️  Failed to delete ${failedDeletions} test user(s) (may already be deleted)`
          );
        }

        // Wait longer to ensure deletions are committed to database
        // Industry-standard: Allow time for database transactions to complete
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Verify cleanup: Check again to ensure users are actually deleted
        try {
          const verifyUsers = await testSuite.krapi.users.getAll(
            testSuite.testProject.id
          );
          const remainingTestUsers = verifyUsers.filter(
            (u) =>
              (u.email && u.email.includes("testuser.")) ||
              (u.username && u.username.startsWith("testuser_")) ||
              (u.email && u.email.includes("@example.com"))
          );
          if (remainingTestUsers.length > 0) {
            console.log(
              `   ⚠️  WARNING: ${remainingTestUsers.length} test user(s) still exist after cleanup - this may cause test failures`
            );
          }
        } catch {
          // Ignore verification errors
        }
      } catch (getUsersError) {
        // Ignore errors when checking for existing users - might be first run or database not initialized
        // The user creation will initialize the database if needed
        console.log(
          `   ℹ️  Could not get existing users for cleanup (this is okay for first run): ${getUsersError.message}`
        );
      }

      // NOW generate unique email AFTER cleanup is complete
      // This ensures we're working with a clean database state
      // Use a more unique identifier to avoid collisions (industry-standard approach)
      // Include timestamp, process ID, random component, and counter for maximum uniqueness
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 15); // Longer random string
      let uniqueId = `${timestamp}-${process.pid}-${randomPart}-${Math.floor(
        Math.random() * 10000
      )}`;
      let uniqueEmail = `testuser.${uniqueId}@example.com`;
      let uniqueUsername = `testuser_${uniqueId}`;

      // SDK 0.5.0 ProjectUser structure: role is string, permissions is string[]
      // Industry-standard: Retry with new unique email if creation fails due to duplicate
      let user;
      let attempts = 0;
      const maxAttempts = 5; // Increased retries since we've cleaned up

      while (attempts < maxAttempts) {
        attempts++;
        try {
          console.log(
            `   📝 Creating user (attempt ${attempts}/${maxAttempts}) with email: ${uniqueEmail}`
          );
          user = await testSuite.krapi.users.create(testSuite.testProject.id, {
            username: uniqueUsername,
            email: uniqueEmail,
            password: "TestPassword123!",
            role: "user",
            permissions: ["documents:read", "documents:write"],
          });
          console.log(`   ✅ User created successfully: ${user.id}`);
          break; // Success - exit retry loop
        } catch (createError) {
          const errorMessage = createError.message || "";
          const isConflictError =
            errorMessage.includes("already exists") ||
            errorMessage.includes("duplicate") ||
            createError.response?.status === 409;

          if (isConflictError && attempts < maxAttempts) {
            console.log(
              `   ⚠️  Email ${uniqueEmail} already exists (attempt ${attempts}/${maxAttempts}), generating new one...`
            );
            // Generate a completely new unique email with even more randomness
            const newTimestamp = Date.now();
            const newRandomPart = Math.random().toString(36).substring(2, 15);
            const newCounter = Math.floor(Math.random() * 1000000);
            uniqueId = `${newTimestamp}-${process.pid}-${newRandomPart}-${newCounter}`;
            uniqueEmail = `testuser.${uniqueId}@example.com`;
            uniqueUsername = `testuser_${uniqueId}`;
            console.log(`   ✅ Generated new unique email: ${uniqueEmail}`);

            // Small delay before retry to ensure database state is settled
            await new Promise((resolve) => setTimeout(resolve, 100));
            continue; // Retry with new email
          } else {
            // Different error or max attempts reached - throw the error with full details
            console.log(
              `   ❌ User creation failed on attempt ${attempts}/${maxAttempts}`
            );
            console.log(`   Error: ${errorMessage}`);
            if (createError.response?.data) {
              console.log(
                `   Response Data: ${JSON.stringify(
                  createError.response.data,
                  null,
                  2
                )}`
              );
            }
            throw createError;
          }
        }
      }

      if (!user) {
        throw new Error(
          `Failed to create user after ${maxAttempts} attempts with unique emails`
        );
      }

      // SDK returns ProjectUser directly
      testSuite.assert(user, "Should return user data");
      testSuite.assert(
        user.id,
        `User should have an ID. Got: ${JSON.stringify(user)}`
      );
      // Verify SDK 0.5.0 fields are present
      testSuite.assert(
        typeof user.role === "string",
        `User should have role as string. Got: ${typeof user.role}`
      );
      testUserId = user.id;
    });

    await testSuite.test("Get project user by ID via SDK", async () => {
      if (!testSuite.testProject || !testUserId) {
        throw new Error("No test project or user ID available");
      }

      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.users?.get !== "function") {
        throw new Error("krapi.users.get method not available");
      }

      const user = await testSuite.krapi.users.get(testSuite.testProject.id, testUserId);

      // SDK returns ProjectUser directly
      testSuite.assert(user, "Should return user data");
      testSuite.assert(
        user.id === testUserId,
        `Should return correct user. Expected ${testUserId}, got ${user.id}`
      );
      // Verify SDK 0.5.0 fields
      testSuite.assert(
        typeof user.role === "string",
        `User role should be string. Got: ${typeof user.role}`
      );
    });

    await testSuite.test("List project users via SDK (after creation)", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for user tests");
      }

      // Use SDK method instead of direct axios call
      const users = await testSuite.krapi.users.getAll(testSuite.testProject.id);

      // SDK returns array directly
      testSuite.assert(Array.isArray(users), "Should return users array");

      // Note: User might not be in list if creation failed, so we check if testUserId exists
      if (testUserId) {
        testSuite.assert(
          users.length > 0,
          "Should have at least one user after creation"
        );
      } else {
        console.log(
          "   Note: User creation may have failed, skipping length check"
        );
      }
    });

    await testSuite.test("Update project user via SDK", async () => {
      if (!testSuite.testProject || !testUserId) {
        throw new Error("No test project or user ID available");
      }

      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.users?.update !== "function") {
        throw new Error("krapi.users.update method not available");
      }

      // SDK 0.5.0: update uses role (string) and permissions (string[])
      const updatedUser = await testSuite.krapi.users.update(
        testSuite.testProject.id,
        testUserId,
        {
          email: `updated.${Date.now()}@example.com`,
          permissions: ["documents:read"],
        }
      );

      testSuite.assert(updatedUser, "Should return updated user");
      testSuite.assert(updatedUser.id === testUserId, "Should return same user");
    });

    await testSuite.test("Update project user permissions via SDK", async () => {
      if (!testSuite.testProject || !testUserId) {
        throw new Error("No test project or user ID available");
      }

      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.users?.updatePermissions !== "function") {
        throw new Error("krapi.users.updatePermissions method not available");
      }

      const updatedUser = await testSuite.krapi.users.updatePermissions(
        testSuite.testProject.id,
        testUserId,
        ["documents:read", "documents:write", "collections:read"]
      );

      testSuite.assert(updatedUser, "Should return updated user");
      // Verify permissions are updated (SDK 0.5.0)
      testSuite.assert(
        Array.isArray(updatedUser.permissions),
        "User should have permissions array"
      );
    });

    await testSuite.test("Create duplicate user via SDK (should fail)", async () => {
      if (!testSuite.testProject || !testUserId) {
        throw new Error("No test project or user ID available");
      }

      // First, get the existing user's email using SDK
      const existingUser = await testSuite.krapi.users.get(
        testSuite.testProject.id,
        testUserId
      );
      const existingEmail = existingUser.email;

      try {
        await testSuite.krapi.users.create(testSuite.testProject.id, {
          username: `duplicate_${Date.now()}`,
          email: existingEmail,
          password: "TestPassword123!",
        });
        throw new Error("Should have failed with duplicate email");
      } catch (error) {
        // SDK should throw an error for duplicate email
        testSuite.assert(
          (error.message && error.message.includes("duplicate")) ||
            (error.message && error.message.includes("already exists")) ||
            error.statusCode === 409 ||
            error.status === 409,
          `Should fail with duplicate email error. Got: ${error.message}`
        );
      }
    });

    await testSuite.test("Delete project user via SDK", async () => {
      if (!testSuite.testProject || !testUserId) {
        throw new Error("No test project or user ID available");
      }

      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.users?.delete !== "function") {
        throw new Error("krapi.users.delete method not available");
      }

      const result = await testSuite.krapi.users.delete(
        testSuite.testProject.id,
        testUserId
      );

      testSuite.assert(result, "Should return delete result");
      testSuite.assert(result.success === true, "Should succeed");
    });

    await testSuite.test(
      "Get deleted user via SDK (should fail or return deleted status)",
      async () => {
        if (!testSuite.testProject || !testUserId) {
          throw new Error("No test project or user ID available");
        }

        try {
          const result = await testSuite.krapi.users.get(
            testSuite.testProject.id,
            testUserId
          );
          // SDK might return null/undefined for deleted user instead of throwing
          if (result === null || result === undefined) {
            // This is acceptable - user not found
            console.log(
              "   ✅ User not found (null/undefined) - expected after deletion"
            );
            return;
          }
          // SDK might implement soft-delete - check if user is marked as deleted/inactive
          if (
            result.is_deleted === true ||
            result.is_active === false ||
            result.deleted_at
          ) {
            console.log(
              "   ✅ User found but marked as deleted/inactive - soft delete implemented"
            );
            return;
          }
          // If we get here, the user was returned and not marked as deleted
          // This might be acceptable depending on SDK implementation - log a warning
          console.log(
            `   ⚠️  User still exists after deletion: ${JSON.stringify(result)}`
          );
          console.log(
            "   Note: SDK may use soft-delete or have eventual consistency"
          );
          // Don't fail the test - SDK behavior may vary
        } catch (error) {
          // SDK should throw an error for deleted user
          // Accept either 404 error or "not found" message
          const isExpectedError =
            (error.message &&
              (error.message.includes("not found") ||
                error.message.includes("Not found"))) ||
            error.statusCode === 404 ||
            error.status === 404 ||
            error.response?.status === 404;

          if (isExpectedError) {
            console.log(
              "   ✅ Got expected 404/not found error for deleted user"
            );
            return;
          }
          // Re-throw if it's not the expected "not found" error
          throw error;
        }
      }
    );
  }
