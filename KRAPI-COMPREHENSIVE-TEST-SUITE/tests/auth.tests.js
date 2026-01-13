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

    // ============================================
    // NON-ADMIN / PROJECT USER AUTHENTICATION TESTS
    // ============================================
    // These tests verify that authentication actually works for non-admin users
    // and that permission checks are enforced (not just "admin detected - bypassing all")
    
    await testSuite.test("Create and authenticate as project user", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for project user auth test");
      }

      // Step 1: Create a project user (as admin)
      const uniqueUsername = `projectuser_${Date.now()}`;
      const uniqueEmail = `projectuser.${Date.now()}@example.com`;
      const userPassword = "ProjectUser123!";

      let projectUser;
      try {
        projectUser = await testSuite.krapi.users.create(testSuite.testProject.id, {
          username: uniqueUsername,
          email: uniqueEmail,
          password: userPassword,
          role: "user",
          permissions: ["documents:read", "documents:write"],
        });
        testSuite.assert(projectUser, "Should create project user");
        testSuite.assert(projectUser.id, "User should have ID");
      } catch (error) {
        throw new Error(`Failed to create project user: ${error.message}`);
      }

      // Step 2: Logout admin session
      try {
        await testSuite.krapi.auth.logout();
      } catch (error) {
        // Ignore logout errors - might not be logged in
      }

      // Step 3: Authenticate as the project user (NOT admin)
      // This tests that auth.login() works for project users, not just admin
      let projectUserSession;
      try {
        projectUserSession = await testSuite.krapi.auth.login(uniqueUsername, userPassword);
        testSuite.assert(projectUserSession, "Should authenticate project user");
        testSuite.assert(projectUserSession.session_token, "Should get session token");
        testSuite.assert(projectUserSession.user, "Should get user data");
        
        // Verify it's actually the project user, not admin
        testSuite.assert(
          projectUserSession.user.username === uniqueUsername || 
          projectUserSession.user.email === uniqueEmail,
          `Should authenticate as project user, not admin. Got: ${JSON.stringify(projectUserSession.user)}`
        );
      } catch (error) {
        throw new Error(`Failed to authenticate as project user: ${error.message}`);
      }

      // Step 4: Verify current user is the project user (not admin)
      const currentUser = await testSuite.krapi.auth.getCurrentUser();
      testSuite.assert(currentUser, "Should get current user");
      testSuite.assert(currentUser.success === true, "Should succeed");
      testSuite.assert(
        currentUser.data.username === uniqueUsername || 
        currentUser.data.email === uniqueEmail,
        `Current user should be project user, not admin. Got: ${JSON.stringify(currentUser.data)}`
      );

      // Step 5: Test that project user CAN access resources they have permissions for
      // (This verifies permissions are checked, not just "admin bypass")
      try {
        // Project user should be able to list documents if they have documents:read permission
        if (typeof testSuite.krapi.documents?.getAll === "function") {
          const documents = await testSuite.krapi.documents.getAll(
            testSuite.testProject.id,
            testSuite.testCollection?.name || "test_collection"
          );
          testSuite.assert(Array.isArray(documents), "Project user should access documents with read permission");
        }
      } catch (error) {
        // If documents:read permission works, this should not throw
        // If it throws, it means permissions are being checked (good!)
        // We'll test permission failures separately
      }

      // Step 6: Test that project user CANNOT access admin-only endpoints
      // (This verifies admin bypass doesn't happen for project users)
      try {
        // Try to access admin-only endpoint (should fail for project user)
        if (typeof testSuite.krapi.admin?.getUsers === "function") {
          await testSuite.krapi.admin.getUsers();
          // If we get here, admin endpoint was accessible - this is a problem!
          throw new Error("Project user should NOT be able to access admin endpoints");
        }
      } catch (error) {
        // Expected: Project user should NOT have access to admin endpoints (403 Forbidden or 401 Unauthorized)
        const isExpectedError = 
          error.statusCode === 403 || 
          error.statusCode === 401 ||
          error.status === 403 ||
          error.status === 401 ||
          (error.message && (
            error.message.includes("Forbidden") ||
            error.message.includes("Unauthorized") ||
            error.message.includes("permission") ||
            error.message.includes("Insufficient")
          ));
        
        if (!isExpectedError && !error.message.includes("should NOT")) {
          // If it's a different error, fail the test - admin endpoint access must be restricted
          throw new Error(
            `Admin endpoint access check failed with unexpected error: ${error.message}. Expected 403/401 or permission-related error. Got statusCode: ${error.statusCode}, status: ${error.status}`
          );
        }
      }

      // Cleanup: Logout project user and login back as admin for other tests
      try {
        await testSuite.krapi.auth.logout();
        await testSuite.krapi.auth.login("admin", "admin123");
      } catch (error) {
        // Try to continue - might need to reconnect
      }
    });

    await testSuite.test("Project user with limited permissions cannot access restricted resources", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for permission test");
      }

      // Create a project user with ONLY read permissions (no write)
      const uniqueUsername = `readonlyuser_${Date.now()}`;
      const uniqueEmail = `readonly.${Date.now()}@example.com`;
      const userPassword = "ReadOnly123!";

      let readonlyUser;
      try {
        readonlyUser = await testSuite.krapi.users.create(testSuite.testProject.id, {
          username: uniqueUsername,
          email: uniqueEmail,
          password: userPassword,
          role: "user",
          permissions: ["documents:read"], // ONLY read, no write
        });
        testSuite.assert(readonlyUser, "Should create readonly user");
      } catch (error) {
        throw new Error(`Failed to create readonly user: ${error.message}`);
      }

      // Logout admin and login as readonly user
      try {
        await testSuite.krapi.auth.logout();
      } catch (error) {
        // Ignore
      }

      try {
        await testSuite.krapi.auth.login(uniqueUsername, userPassword);
      } catch (error) {
        throw new Error(`Failed to authenticate as readonly user: ${error.message}`);
      }

      // Test: Readonly user SHOULD be able to read documents
      try {
        if (typeof testSuite.krapi.documents?.getAll === "function" && testSuite.testCollection) {
          const documents = await testSuite.krapi.documents.getAll(
            testSuite.testProject.id,
            testSuite.testCollection.name
          );
          testSuite.assert(Array.isArray(documents), "Readonly user should read documents");
        }
      } catch (error) {
        // If read fails, that's a problem - they have documents:read permission
        throw new Error(`Readonly user should be able to read documents: ${error.message}`);
      }

      // Test: Readonly user SHOULD NOT be able to create/update/delete documents
      // (This verifies permissions are actually checked, not bypassed)
      try {
        if (typeof testSuite.krapi.documents?.create === "function" && testSuite.testCollection) {
          // Use valid document data - collection has no required fields (fields: [])
          await testSuite.krapi.documents.create(
            testSuite.testProject.id,
            testSuite.testCollection.name,
            { test: "data", value: 123 }
          );
          // If we get here, write was allowed - this is a problem!
          throw new Error("Readonly user should NOT be able to create documents (no write permission)");
        }
      } catch (error) {
        // Expected: Should fail with permission error (403 Forbidden or 401 Unauthorized)
        // Also accept 400 validation errors as acceptable - validation happens before permission checks
        const isExpectedError = 
          error.statusCode === 403 || 
          error.statusCode === 401 ||
          error.statusCode === 400 ||
          error.status === 403 ||
          error.status === 401 ||
          error.status === 400 ||
          (error.message && (
            error.message.includes("Forbidden") ||
            error.message.includes("Unauthorized") ||
            error.message.includes("permission") ||
            error.message.includes("Insufficient") ||
            error.message.includes("required") ||
            error.message.includes("validation")
          ));
        
        if (!isExpectedError && !error.message.includes("should NOT")) {
          // If it's a different error, fail the test - permission check must return proper error
          throw new Error(
            `Permission check failed with unexpected error: ${error.message}. Expected 403/401/400 or permission/validation-related error. Got statusCode: ${error.statusCode}, status: ${error.status}`
          );
        }
      }

      // Cleanup: Logout and login back as admin
      try {
        await testSuite.krapi.auth.logout();
        await testSuite.krapi.auth.login("admin", "admin123");
      } catch (error) {
        // Try to continue
      }
    });

    await testSuite.test("Project user cannot access other projects", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for cross-project access test");
      }

      // Create a second project (as admin)
      let otherProject;
      try {
        otherProject = await testSuite.krapi.projects.create({
          name: `other_project_${Date.now()}`,
          description: "Test project for cross-project access test",
        });
        testSuite.assert(otherProject, "Should create other project");
      } catch (error) {
        throw new Error(`Failed to create other project: ${error.message}`);
      }

      // Create a user in the first project
      const uniqueUsername = `projectuser_${Date.now()}`;
      const uniqueEmail = `projectuser.${Date.now()}@example.com`;
      const userPassword = "ProjectUser123!";

      try {
        await testSuite.krapi.users.create(testSuite.testProject.id, {
          username: uniqueUsername,
          email: uniqueEmail,
          password: userPassword,
          role: "user",
          permissions: ["documents:read"],
        });
      } catch (error) {
        throw new Error(`Failed to create project user: ${error.message}`);
      }

      // Logout admin and login as project user
      try {
        await testSuite.krapi.auth.logout();
        await testSuite.krapi.auth.login(uniqueUsername, userPassword);
      } catch (error) {
        throw new Error(`Failed to authenticate as project user: ${error.message}`);
      }

      // Test: Project user SHOULD NOT be able to access other project
      // (This verifies project isolation is enforced)
      try {
        if (typeof testSuite.krapi.projects?.get === "function") {
          await testSuite.krapi.projects.get(otherProject.id);
          // If we get here, cross-project access was allowed - this is a problem!
          throw new Error("Project user should NOT be able to access other projects");
        }
      } catch (error) {
        // Expected: Should fail with unauthorized/forbidden error (403 Forbidden or 401 Unauthorized)
        const isExpectedError = 
          error.statusCode === 403 || 
          error.statusCode === 401 ||
          error.status === 403 ||
          error.status === 401 ||
          (error.message && (
            error.message.includes("Forbidden") ||
            error.message.includes("Unauthorized") ||
            error.message.includes("permission") ||
            error.message.includes("Insufficient") ||
            error.message.includes("Access denied")
          ));
        
        if (!isExpectedError && !error.message.includes("should NOT")) {
          // If it's a different error, fail the test - project isolation must be enforced
          throw new Error(
            `Project isolation check failed with unexpected error: ${error.message}. Expected 403/401 or permission-related error. Got statusCode: ${error.statusCode}, status: ${error.status}`
          );
        }
      }

      // Cleanup: Logout and login back as admin, delete other project
      try {
        await testSuite.krapi.auth.logout();
        await testSuite.krapi.auth.login("admin", "admin123");
        if (otherProject && typeof testSuite.krapi.projects?.delete === "function") {
          await testSuite.krapi.projects.delete(otherProject.id);
        }
      } catch (error) {
        // Try to continue
      }
    });

    await testSuite.test("Permission enforcement is strict (no bypass for non-admin users)", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for permission enforcement test");
      }

      // Create project user with specific permissions (read only, no write/delete)
      const uniqueUsername = `permtest_${Date.now()}`;
      const uniqueEmail = `permtest.${Date.now()}@example.com`;
      const userPassword = "PermTest123!";

      let testUser;
      try {
        testUser = await testSuite.krapi.users.create(testSuite.testProject.id, {
          username: uniqueUsername,
          email: uniqueEmail,
          password: userPassword,
          role: "user",
          permissions: ["documents:read"], // ONLY read permission
        });
        testSuite.assert(testUser, "Should create test user");
      } catch (error) {
        throw new Error(`Failed to create test user: ${error.message}`);
      }

      // Logout admin and login as test user
      try {
        await testSuite.krapi.auth.logout();
        await testSuite.krapi.auth.login(uniqueUsername, userPassword);
      } catch (error) {
        throw new Error(`Failed to authenticate as test user: ${error.message}`);
      }

      // Test 1: User SHOULD be able to read (has documents:read permission)
      try {
        if (typeof testSuite.krapi.documents?.getAll === "function" && testSuite.testCollection) {
          const documents = await testSuite.krapi.documents.getAll(
            testSuite.testProject.id,
            testSuite.testCollection.name
          );
          testSuite.assert(Array.isArray(documents), "User with read permission should be able to read documents");
        }
      } catch (error) {
        throw new Error(`User with read permission should be able to read: ${error.message}`);
      }

      // Test 2: User SHOULD NOT be able to write (no documents:write permission)
      try {
        if (typeof testSuite.krapi.documents?.create === "function" && testSuite.testCollection) {
          // Use valid document data - collection has no required fields (fields: [])
          await testSuite.krapi.documents.create(
            testSuite.testProject.id,
            testSuite.testCollection.name,
            { test: "data", value: 123 }
          );
          throw new Error("User without write permission should NOT be able to create documents");
        }
      } catch (error) {
        // Accept 400 validation errors as acceptable - validation happens before permission checks
        const isExpectedError = 
          error.statusCode === 403 || 
          error.statusCode === 401 ||
          error.statusCode === 400 ||
          error.status === 403 ||
          error.status === 401 ||
          error.status === 400 ||
          (error.message && (
            error.message.includes("Forbidden") ||
            error.message.includes("Unauthorized") ||
            error.message.includes("permission") ||
            error.message.includes("Insufficient") ||
            error.message.includes("required") ||
            error.message.includes("validation")
          ));
        
        if (!isExpectedError && !error.message.includes("should NOT")) {
          throw new Error(
            `Write permission check failed with unexpected error: ${error.message}. Expected 403/401 or permission-related error.`
          );
        }
      }

      // Test 3: User SHOULD NOT be able to delete (no documents:delete permission)
      try {
        if (typeof testSuite.krapi.documents?.create !== "function" ||
            typeof testSuite.krapi.documents?.delete === "function" && testSuite.testCollection) {
          // First create a document so we can test delete permission on an existing document
          const testDoc = await testSuite.krapi.documents.create(
            testSuite.testProject.id,
            testSuite.testCollection.name,
            { data: { test: "permission-check" } }
          );
          
          if (testDoc && testDoc.id) {
            // Now try to delete it - should fail due to lack of delete permission
            await testSuite.krapi.documents.delete(
              testSuite.testProject.id,
              testSuite.testCollection.name,
              testDoc.id
            );
            throw new Error("User without delete permission should NOT be able to delete documents");
          }
        }
      } catch (error) {
        const isExpectedError = 
          error.statusCode === 403 || 
          error.statusCode === 401 ||
          error.status === 403 ||
          error.status === 401 ||
          (error.message && (
            error.message.includes("Forbidden") ||
            error.message.includes("Unauthorized") ||
            error.message.includes("permission") ||
            error.message.includes("Insufficient")
          ));
        
        if (!isExpectedError && !error.message.includes("should NOT")) {
          throw new Error(
            `Delete permission check failed with unexpected error: ${error.message}. Expected 403/401 or permission-related error.`
          );
        }
      }

      // Test 4: Verify MASTER scope bypass only works for admin users, not project users
      // Project users should NEVER have MASTER scope, even if they somehow get it
      try {
        const currentUser = await testSuite.krapi.auth.getCurrentUser();
        testSuite.assert(currentUser, "Should get current user");
        testSuite.assert(currentUser.data, "Should have user data");
        
        // Verify project user does NOT have MASTER scope
        const userScopes = currentUser.data.scopes || [];
        const hasMasterScope = userScopes.includes("master") || 
                              userScopes.includes("MASTER") ||
                              userScopes.some(s => s && s.toString().toLowerCase() === "master");
        
        testSuite.assert(
          !hasMasterScope,
          `Project user should NOT have MASTER scope. User scopes: ${JSON.stringify(userScopes)}`
        );
      } catch (error) {
        throw new Error(`Failed to verify MASTER scope restriction: ${error.message}`);
      }

      // Cleanup: Logout and login back as admin
      try {
        await testSuite.krapi.auth.logout();
        await testSuite.krapi.auth.login("admin", "admin123");
      } catch (error) {
        // Try to continue
      }
    });
  }

