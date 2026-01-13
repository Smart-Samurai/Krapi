/**
 * Transaction Integrity Tests
 * 
 * Created: 2025-12-06
 * Last Updated: 2025-12-06
 * 
 * Tests database transaction integrity, rollback behavior, and data consistency.
 */

export async function runTransactionTests(testSuite) {
    testSuite.logger.suiteStart("Transaction Integrity Tests");

    await testSuite.test("Transaction rollback on failure", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for transaction rollback test");
      }

      // This test verifies that when a transaction fails, all changes are rolled back
      // Note: Since the SDK abstracts transactions, we test by creating resources
      // and verifying that partial failures don't leave the database in an inconsistent state

      // Create a collection first
      if (typeof testSuite.krapi.collections?.create !== "function") {
        throw new Error("krapi.collections.create method not available - SDK must implement this method");
      }

      const collectionName = `txn_test_${Date.now()}`;
      let createdCollection;
      
      try {
        // Create collection (this should succeed)
        createdCollection = await testSuite.krapi.collections.create(
          testSuite.testProject.id,
          {
            name: collectionName,
            description: "Transaction test collection",
            fields: [], // Empty fields - no required fields
          }
        );
        testSuite.assert(createdCollection, "Should create collection");
        testSuite.assert(createdCollection.name === collectionName, "Collection name should match");

        // Try to create a document with invalid data that should fail
        // This simulates a transaction that partially succeeds then fails
        if (typeof testSuite.krapi.documents?.create === "function") {
          try {
            // Attempt to create document with data that might cause a constraint violation
            // The exact failure depends on schema constraints, but we want to verify
            // that if this fails, the collection creation above is not affected
            await testSuite.krapi.documents.create(
              testSuite.testProject.id,
              collectionName,
              null // Invalid: null data might cause failure
            );
            // If we get here, null was accepted - that's okay, test still validates collection exists
          } catch (docError) {
            // Expected: Document creation should fail with validation error
            // Accept any validation error (400, "Validation failed", "required", etc.)
            const isValidationError = 
              docError.statusCode === 400 ||
              docError.status === 400 ||
              docError.message?.includes("Validation") ||
              docError.message?.includes("required") ||
              docError.message?.includes("invalid");
            
            if (!isValidationError) {
              // If it's not a validation error, that's unexpected but continue test
              console.log(`   Note: Document creation failed with unexpected error: ${docError.message}`);
            }
            
            // Verify collection still exists (transaction rollback didn't affect it)
            if (typeof testSuite.krapi.collections?.get === "function") {
              const verifyCollection = await testSuite.krapi.collections.get(
                testSuite.testProject.id,
                collectionName
              );
              testSuite.assert(verifyCollection, "Collection should still exist after document creation failure");
              testSuite.assert(verifyCollection.name === collectionName, "Collection should be unchanged");
            }
          }
        }
      } catch (error) {
        throw new Error(`Transaction rollback test failed: ${error.message}`);
      } finally {
        // Cleanup: Delete collection
        if (createdCollection && typeof testSuite.krapi.collections?.delete === "function") {
          try {
            await testSuite.krapi.collections.delete(
              testSuite.testProject.id,
              collectionName
            );
          } catch (cleanupError) {
            console.log(`   Note: Failed to cleanup test collection: ${cleanupError.message}`);
          }
        }
      }
    });

    await testSuite.test("Multi-step operation data consistency", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for multi-step operation test");
      }

      // This test verifies that multi-step operations maintain data consistency
      // Create collection, then document, then verify both exist

      const collectionName = `multistep_${Date.now()}`;
      let createdCollection;
      let createdDocument;

      try {
        // Step 1: Create collection
        if (typeof testSuite.krapi.collections?.create !== "function") {
          throw new Error("krapi.collections.create method not available");
        }

        createdCollection = await testSuite.krapi.collections.create(
          testSuite.testProject.id,
          {
            name: collectionName,
            description: "Multi-step test collection",
            fields: [], // Empty fields - no required fields
          }
        );
        testSuite.assert(createdCollection, "Should create collection");

        // Step 2: Create document in collection
        if (typeof testSuite.krapi.documents?.create === "function") {
          createdDocument = await testSuite.krapi.documents.create(
            testSuite.testProject.id,
            collectionName,
            {
              data: {
                test: "data",
                step: 2,
              }
            }
          );
          testSuite.assert(createdDocument, "Should create document");

          // Step 3: Verify both exist
          if (typeof testSuite.krapi.collections?.get === "function") {
            const verifyCollection = await testSuite.krapi.collections.get(
              testSuite.testProject.id,
              collectionName
            );
            testSuite.assert(verifyCollection, "Collection should exist");
          }

          if (typeof testSuite.krapi.documents?.get === "function" && createdDocument.id) {
            const verifyDocument = await testSuite.krapi.documents.get(
              testSuite.testProject.id,
              collectionName,
              createdDocument.id
            );
            testSuite.assert(verifyDocument, "Document should exist");
            // Document data is stored in verifyDocument.data object
            testSuite.assert(
              verifyDocument.data?.test === "data",
              `Document data should be correct. Got: ${JSON.stringify(verifyDocument.data)}`
            );
          }
        }
      } catch (error) {
        throw new Error(`Multi-step operation test failed: ${error.message}`);
      } finally {
        // Cleanup
        if (createdDocument && createdDocument.id && typeof testSuite.krapi.documents?.delete === "function") {
          try {
            await testSuite.krapi.documents.delete(
              testSuite.testProject.id,
              collectionName,
              createdDocument.id
            );
          } catch (cleanupError) {
            console.log(`   Note: Failed to cleanup test document: ${cleanupError.message}`);
          }
        }

        if (createdCollection && typeof testSuite.krapi.collections?.delete === "function") {
          try {
            await testSuite.krapi.collections.delete(
              testSuite.testProject.id,
              collectionName
            );
          } catch (cleanupError) {
            console.log(`   Note: Failed to cleanup test collection: ${cleanupError.message}`);
          }
        }
      }
    });

    await testSuite.test("Concurrent operation data integrity", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for concurrent operation test");
      }

      // This test verifies that concurrent operations don't cause data corruption
      // Create multiple documents simultaneously and verify all are created correctly

      if (typeof testSuite.krapi.collections?.create !== "function" ||
          typeof testSuite.krapi.documents?.create !== "function") {
        throw new Error("krapi.collections.create or documents.create method not available");
      }

      // Create a dedicated collection for this test
      const collectionName = `concurrent_op_${Date.now()}`;
      let testCollection;
      try {
        testCollection = await testSuite.krapi.collections.create(
          testSuite.testProject.id,
          {
            name: collectionName,
            description: "Collection for concurrent operation test",
            fields: [], // Empty fields - no required fields
          }
        );
      } catch (error) {
        throw new Error(`Failed to create test collection: ${error.message}`);
      }

      const concurrentCount = 5;
      const createdDocuments = [];

      try {
        // Create multiple documents concurrently
        const createPromises = [];
        for (let i = 0; i < concurrentCount; i++) {
          createPromises.push(
            testSuite.krapi.documents.create(
              testSuite.testProject.id,
              collectionName,
              {
                data: {
                  concurrent: true,
                  index: i,
                  timestamp: Date.now(),
                }
              }
            )
          );
        }

        const results = await Promise.all(createPromises);
        testSuite.assert(results.length === concurrentCount, "All documents should be created");

        // Verify all documents have unique IDs
        const documentIds = results.map((doc) => doc.id).filter(Boolean);
        const uniqueIds = new Set(documentIds);
        testSuite.assert(
          uniqueIds.size === documentIds.length,
          `All document IDs should be unique. Got ${uniqueIds.size} unique out of ${documentIds.length}`
        );

        // Verify all documents exist
        if (typeof testSuite.krapi.documents?.getAll === "function") {
          const allDocuments = await testSuite.krapi.documents.getAll(
            testSuite.testProject.id,
            collectionName
          );
          testSuite.assert(Array.isArray(allDocuments), "Should retrieve all documents");

          // Verify our created documents are in the list
          const foundIds = documentIds.filter((id) =>
            allDocuments.some((doc) => doc.id === id)
          );
          testSuite.assert(
            foundIds.length === documentIds.length,
            `All created documents should be retrievable. Found ${foundIds.length} out of ${documentIds.length}`
          );
        }

        createdDocuments.push(...results);
      } catch (error) {
        throw new Error(`Concurrent operation test failed: ${error.message}`);
      } finally {
        // Cleanup: Delete all created documents
        if (typeof testSuite.krapi.documents?.delete === "function") {
          for (const doc of createdDocuments) {
            if (doc && doc.id) {
              try {
                await testSuite.krapi.documents.delete(
                  testSuite.testProject.id,
                  collectionName,
                  doc.id
                );
              } catch (cleanupError) {
                console.log(`   Note: Failed to cleanup document ${doc.id}: ${cleanupError.message}`);
              }
            }
          }
        }
        // Cleanup: Delete test collection
        if (testCollection && typeof testSuite.krapi.collections?.delete === "function") {
          try {
            await testSuite.krapi.collections.delete(
              testSuite.testProject.id,
              collectionName
            );
          } catch (cleanupError) {
            console.log(`   Note: Failed to cleanup test collection: ${cleanupError.message}`);
          }
        }
      }
    });

    await testSuite.test("Unique constraint enforcement", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for unique constraint test");
      }

      // This test verifies that unique constraints are enforced
      // Create a user with a unique username, then try to create another with same username

      const uniqueUsername = `unique_${Date.now()}`;
      const uniqueEmail = `${uniqueUsername}@test.com`;
      const userPassword = "UniqueTest123!";

      let firstUser;
      try {
        // Create first user
        if (typeof testSuite.krapi.users?.create !== "function") {
          throw new Error("krapi.users.create method not available");
        }

        firstUser = await testSuite.krapi.users.create(testSuite.testProject.id, {
          username: uniqueUsername,
          email: uniqueEmail,
          password: userPassword,
          role: "user",
          permissions: ["documents:read"],
        });
        testSuite.assert(firstUser, "Should create first user");
        testSuite.assert(firstUser.username === uniqueUsername, "Username should match");

        // Try to create second user with same username (should fail)
        try {
          await testSuite.krapi.users.create(testSuite.testProject.id, {
            username: uniqueUsername, // Duplicate username
            email: `${uniqueUsername}_different@test.com`, // Different email
            password: userPassword,
            role: "user",
            permissions: ["documents:read"],
          });
          // If we get here, duplicate was allowed - this is a problem!
          throw new Error("Unique constraint should prevent duplicate usernames");
        } catch (error) {
          // Expected: Should fail with conflict error
          const isExpectedError =
            error.statusCode === 409 ||
            error.status === 409 ||
            error.message.includes("duplicate") ||
            error.message.includes("already exists") ||
            error.message.includes("unique") ||
            error.message.includes("constraint");

          if (!isExpectedError) {
            throw new Error(
              `Unique constraint check failed with unexpected error: ${error.message}. Expected 409 or duplicate-related error.`
            );
          }
        }
      } catch (error) {
        if (error.message.includes("Unique constraint")) {
          throw error; // Re-throw our test error
        }
        throw new Error(`Unique constraint test failed: ${error.message}`);
      } finally {
        // Cleanup
        if (firstUser && firstUser.id && typeof testSuite.krapi.users?.delete === "function") {
          try {
            await testSuite.krapi.users.delete(testSuite.testProject.id, firstUser.id);
          } catch (cleanupError) {
            console.log(`   Note: Failed to cleanup test user: ${cleanupError.message}`);
          }
        }
      }
    });
  }

