/**
 * Admin Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-12-06
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

    // ============================================
    // ADMIN USER CRUD OPERATIONS TESTS
    // ============================================

    await testSuite.test("Create admin user via SDK", async () => {
      if (typeof testSuite.krapi.admin?.createUser !== "function") {
        throw new Error("krapi.admin.createUser method not available - SDK must implement this method");
      }

      // Generate unique username/email to avoid conflicts
      const uniqueId = `testadmin_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const uniqueUsername = uniqueId;
      const uniqueEmail = `${uniqueId}@test.com`;
      const userPassword = "TestAdmin123!";

      let createdUser;
      try {
        createdUser = await testSuite.krapi.admin.createUser({
          username: uniqueUsername,
          email: uniqueEmail,
          password: userPassword,
          role: "admin",
          access_level: "full",
          permissions: ["admin:read", "admin:write"],
          active: true,
        });

        testSuite.assert(createdUser, "Should create admin user");
        testSuite.assert(createdUser.id, "User should have ID");
        testSuite.assert(createdUser.username === uniqueUsername, "Username should match");
        testSuite.assert(createdUser.email === uniqueEmail, "Email should match");
        testSuite.assert(createdUser.role === "admin", "Role should be set");
        testSuite.assert(createdUser.access_level === "full", "Access level should be set");
        testSuite.assert(Array.isArray(createdUser.permissions), "Permissions should be array");
        // Check if user is active - SDK should return boolean
        testSuite.assert(
          createdUser.active === true,
          `User should be active. Got: ${JSON.stringify(createdUser.active)}`
        );

        // Verify password is NOT stored in plaintext
        testSuite.assert(
          !createdUser.password,
          "Password should not be returned in response"
        );
        testSuite.assert(
          !createdUser.password_hash || createdUser.password_hash !== userPassword,
          "Password hash should not be plaintext password"
        );
      } catch (error) {
        throw new Error(`Failed to create admin user: ${error.message}`);
      } finally {
        // Cleanup: Delete created user
        if (createdUser && createdUser.id && typeof testSuite.krapi.admin?.deleteUser === "function") {
          try {
            await testSuite.krapi.admin.deleteUser(createdUser.id);
          } catch (cleanupError) {
            // Log but don't fail test on cleanup error
            console.log(`   Note: Failed to cleanup test admin user: ${cleanupError.message}`);
          }
        }
      }
    });

    await testSuite.test("Create admin user with duplicate username should fail", async () => {
      if (typeof testSuite.krapi.admin?.createUser !== "function") {
        throw new Error("krapi.admin.createUser method not available - SDK must implement this method");
      }

      // Generate unique username/email
      const uniqueId = `duplicate_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const uniqueUsername = uniqueId;
      const uniqueEmail = `${uniqueId}@test.com`;
      const userPassword = "TestAdmin123!";

      let createdUser;
      try {
        // Create first user
        createdUser = await testSuite.krapi.admin.createUser({
          username: uniqueUsername,
          email: uniqueEmail,
          password: userPassword,
          role: "admin",
          access_level: "full",
          permissions: [],
          active: true,
        });
        testSuite.assert(createdUser, "First user should be created");

        // Try to create duplicate username
        try {
          await testSuite.krapi.admin.createUser({
            username: uniqueUsername, // Duplicate username
            email: `${uniqueId}_different@test.com`, // Different email
            password: userPassword,
            role: "admin",
            access_level: "full",
            permissions: [],
            active: true,
          });
          // If we get here, duplicate was allowed - this is a problem!
          throw new Error("Duplicate username should not be allowed");
        } catch (error) {
          // Expected: Should fail with conflict error (409) or database constraint error
          const isExpectedError =
            error.statusCode === 409 ||
            error.status === 409 ||
            error.message.includes("duplicate") ||
            error.message.includes("already exists") ||
            error.message.includes("unique") ||
            error.message.includes("conflict") ||
            error.message.includes("UNIQUE constraint") ||
            error.message.includes("constraint failed");
          
          if (!isExpectedError) {
            throw new Error(
              `Duplicate username check failed with unexpected error: ${error.message}. Expected 409 or duplicate-related error.`
            );
          }
        }
      } catch (error) {
        if (error.message.includes("Duplicate username")) {
          throw error; // Re-throw our test error
        }
        throw new Error(`Failed to test duplicate username: ${error.message}`);
      } finally {
        // Cleanup
        if (createdUser && createdUser.id && typeof testSuite.krapi.admin?.deleteUser === "function") {
          try {
            await testSuite.krapi.admin.deleteUser(createdUser.id);
          } catch (cleanupError) {
            console.log(`   Note: Failed to cleanup test admin user: ${cleanupError.message}`);
          }
        }
      }
    });

    await testSuite.test("Update admin user via SDK", async () => {
      if (typeof testSuite.krapi.admin?.createUser !== "function" || 
          typeof testSuite.krapi.admin?.updateUser !== "function") {
        throw new Error("krapi.admin.createUser or updateUser method not available - SDK must implement these methods");
      }

      // Generate unique username/email
      const uniqueId = `update_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const uniqueUsername = uniqueId;
      const uniqueEmail = `${uniqueId}@test.com`;
      const userPassword = "TestAdmin123!";

      let createdUser;
      try {
        // Create user
        createdUser = await testSuite.krapi.admin.createUser({
          username: uniqueUsername,
          email: uniqueEmail,
          password: userPassword,
          role: "admin",
          access_level: "full",
          permissions: ["admin:read"],
          active: true,
        });
        testSuite.assert(createdUser, "Should create admin user");

        // Update user
        const updatedEmail = `${uniqueId}_updated@test.com`;
        const updatedRole = "developer"; // Use allowed role: 'master_admin', 'admin', 'developer'
        const updatedPermissions = ["admin:read", "admin:write", "admin:delete"];

        const updatedUser = await testSuite.krapi.admin.updateUser(createdUser.id, {
          email: updatedEmail,
          role: updatedRole,
          permissions: updatedPermissions,
        });

        testSuite.assert(updatedUser, "Should return updated user");
        testSuite.assert(updatedUser.id === createdUser.id, "User ID should not change");
        testSuite.assert(updatedUser.email === updatedEmail, "Email should be updated");
        testSuite.assert(updatedUser.role === updatedRole, "Role should be updated");
        testSuite.assert(
          Array.isArray(updatedUser.permissions) &&
          updatedUser.permissions.length === updatedPermissions.length,
          "Permissions should be updated"
        );

        // Verify update persisted by fetching user again
        if (typeof testSuite.krapi.admin?.getUser === "function") {
          const fetchedUser = await testSuite.krapi.admin.getUser(createdUser.id);
          testSuite.assert(fetchedUser, "Should fetch updated user");
          testSuite.assert(fetchedUser.email === updatedEmail, "Updated email should persist");
          testSuite.assert(fetchedUser.role === updatedRole, "Updated role should persist");
        }
      } catch (error) {
        throw new Error(`Failed to update admin user: ${error.message}`);
      } finally {
        // Cleanup
        if (createdUser && createdUser.id && typeof testSuite.krapi.admin?.deleteUser === "function") {
          try {
            await testSuite.krapi.admin.deleteUser(createdUser.id);
          } catch (cleanupError) {
            console.log(`   Note: Failed to cleanup test admin user: ${cleanupError.message}`);
          }
        }
      }
    });

    await testSuite.test("Update non-existent admin user should fail", async () => {
      if (typeof testSuite.krapi.admin?.updateUser !== "function") {
        throw new Error("krapi.admin.updateUser method not available - SDK must implement this method");
      }

      const nonExistentId = `nonexistent_${Date.now()}`;
      
      try {
        await testSuite.krapi.admin.updateUser(nonExistentId, {
          email: "updated@test.com",
        });
        // If we get here, update succeeded for non-existent user - this is a problem!
        throw new Error("Update should fail for non-existent user");
      } catch (error) {
        // Expected: Should fail with 404
        const isExpectedError =
          error.statusCode === 404 ||
          error.status === 404 ||
          error.message.includes("not found") ||
          error.message.includes("does not exist");
        
        if (!isExpectedError) {
          throw new Error(
            `Update non-existent user check failed with unexpected error: ${error.message}. Expected 404 or not found error.`
          );
        }
      }
    });

    await testSuite.test("Delete admin user via SDK", async () => {
      if (typeof testSuite.krapi.admin?.createUser !== "function" || 
          typeof testSuite.krapi.admin?.deleteUser !== "function") {
        throw new Error("krapi.admin.createUser or deleteUser method not available - SDK must implement these methods");
      }

      // Generate unique username/email
      const uniqueId = `delete_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const uniqueUsername = uniqueId;
      const uniqueEmail = `${uniqueId}@test.com`;
      const userPassword = "TestAdmin123!";

      let createdUser;
      try {
        // Create user
        createdUser = await testSuite.krapi.admin.createUser({
          username: uniqueUsername,
          email: uniqueEmail,
          password: userPassword,
          role: "admin",
          access_level: "full",
          permissions: [],
          active: true,
        });
        testSuite.assert(createdUser, "Should create admin user");
        testSuite.assert(createdUser.id, "User should have ID");

        // Delete user - SDK returns boolean in server mode, { success: true } in client mode
        const deleteResult = await testSuite.krapi.admin.deleteUser(createdUser.id);
        // Handle both boolean (server mode) and object (client mode) responses
        const isSuccess = deleteResult === true || 
                         (deleteResult && typeof deleteResult === 'object' && deleteResult.success === true);
        testSuite.assert(
          isSuccess,
          `Delete should succeed. Got: ${JSON.stringify(deleteResult)}`
        );

        // Verify user is deleted by trying to get it
        if (typeof testSuite.krapi.admin?.getUser === "function") {
          try {
            await testSuite.krapi.admin.getUser(createdUser.id);
            // If we get here, user still exists - this is a problem!
            throw new Error("Deleted user should not be retrievable");
          } catch (error) {
            // Expected: Should fail with 404
            const isExpectedError =
              error.statusCode === 404 ||
              error.status === 404 ||
              error.message.includes("not found") ||
              error.message.includes("does not exist");
            
            if (!isExpectedError) {
              throw new Error(
                `Get deleted user check failed with unexpected error: ${error.message}. Expected 404 or not found error.`
              );
            }
          }
        }
      } catch (error) {
        if (error.message.includes("Deleted user") || error.message.includes("Get deleted")) {
          throw error; // Re-throw our test errors
        }
        throw new Error(`Failed to delete admin user: ${error.message}`);
      } finally {
        // Extra cleanup in case delete didn't work
        if (createdUser && createdUser.id && typeof testSuite.krapi.admin?.deleteUser === "function") {
          try {
            await testSuite.krapi.admin.deleteUser(createdUser.id);
          } catch (cleanupError) {
            // Ignore - user might already be deleted
          }
        }
      }
    });

    await testSuite.test("Delete non-existent admin user should fail", async () => {
      if (typeof testSuite.krapi.admin?.deleteUser !== "function") {
        throw new Error("krapi.admin.deleteUser method not available - SDK must implement this method");
      }

      const nonExistentId = `nonexistent_${Date.now()}`;
      
      try {
        const result = await testSuite.krapi.admin.deleteUser(nonExistentId);
        // If delete returns false/null, that's acceptable (user not found)
        // But if it returns success=true, that's a problem
        if (result === true || (result && result.success === true)) {
          throw new Error("Delete should not succeed for non-existent user");
        }
        // If result is false/null, that's expected behavior
      } catch (error) {
        // Expected: Should fail with 404 or return false
        const isExpectedError =
          error.statusCode === 404 ||
          error.status === 404 ||
          error.message.includes("not found") ||
          error.message.includes("does not exist");
        
        if (!isExpectedError) {
          throw new Error(
            `Delete non-existent user check failed with unexpected error: ${error.message}. Expected 404 or not found error.`
          );
        }
      }
    });

    await testSuite.test("Default admin user cannot be deleted", async () => {
      if (typeof testSuite.krapi.admin?.getAllUsers !== "function" || 
          typeof testSuite.krapi.admin?.deleteUser !== "function") {
        throw new Error("krapi.admin.getAllUsers or deleteUser method not available - SDK must implement these methods");
      }

      // Find default admin user (username = "admin")
      const users = await testSuite.krapi.admin.getAllUsers();
      const defaultAdmin = users.find((u) => u.username === "admin");

      if (!defaultAdmin) {
        throw new Error("Default admin user not found - cannot test deletion protection");
      }

      try {
        await testSuite.krapi.admin.deleteUser(defaultAdmin.id);
        // If we get here, default admin was deleted - this is a critical problem!
        throw new Error("Default admin user should NOT be deletable");
      } catch (error) {
        // Expected: Should fail with error preventing deletion
        const isExpectedError =
          error.statusCode === 403 ||
          error.status === 403 ||
          error.statusCode === 400 ||
          error.status === 400 ||
          error.message.includes("cannot be deleted") ||
          error.message.includes("protected") ||
          error.message.includes("default admin") ||
          error.message.includes("not allowed");
        
        if (!isExpectedError) {
          throw new Error(
            `Default admin deletion protection check failed with unexpected error: ${error.message}. Expected 403/400 or protection-related error.`
          );
        }
      }
    });

    await testSuite.test("Create admin user and authenticate", async () => {
      if (typeof testSuite.krapi.admin?.createUser !== "function") {
        throw new Error("krapi.admin.createUser method not available - SDK must implement this method");
      }

      // Generate unique username/email
      const uniqueId = `auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const uniqueUsername = uniqueId;
      const uniqueEmail = `${uniqueId}@test.com`;
      const userPassword = "TestAdmin123!";

      let createdUser;
      try {
        // Create admin user
        createdUser = await testSuite.krapi.admin.createUser({
          username: uniqueUsername,
          email: uniqueEmail,
          password: userPassword,
          role: "admin",
          access_level: "full",
          permissions: ["admin:read", "admin:write"],
          active: true,
        });
        testSuite.assert(createdUser, "Should create admin user");
        testSuite.assert(createdUser.id, "User should have ID");

        // Logout current session
        try {
          await testSuite.krapi.auth.logout();
        } catch (error) {
          // Ignore logout errors
        }

        // Login as new admin user
        if (typeof testSuite.krapi.auth?.login !== "function") {
          throw new Error("krapi.auth.login method not available");
        }

        const loginResult = await testSuite.krapi.auth.login(uniqueUsername, userPassword);
        testSuite.assert(loginResult, "Login should succeed");
        testSuite.assert(loginResult.session_token, "Session token should be present");
        testSuite.assert(loginResult.user, "User data should be present");
        testSuite.assert(
          loginResult.user.username === uniqueUsername || loginResult.user.email === uniqueEmail,
          "Should authenticate as new admin user"
        );

        // Verify new admin user can access admin endpoints
        if (typeof testSuite.krapi.admin?.getAllUsers === "function") {
          const users = await testSuite.krapi.admin.getAllUsers();
          testSuite.assert(Array.isArray(users), "New admin should access admin endpoints");
        }
      } catch (error) {
        throw new Error(`Failed to create and authenticate admin user: ${error.message}`);
      } finally {
        // Cleanup: Logout and login back as default admin
        try {
          await testSuite.krapi.auth.logout();
          await testSuite.krapi.auth.login("admin", "admin123");
        } catch (error) {
          // Try to continue
        }

        // Delete created user
        if (createdUser && createdUser.id && typeof testSuite.krapi.admin?.deleteUser === "function") {
          try {
            await testSuite.krapi.admin.deleteUser(createdUser.id);
          } catch (cleanupError) {
            console.log(`   Note: Failed to cleanup test admin user: ${cleanupError.message}`);
          }
        }
      }
    });
  }
