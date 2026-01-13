/**
 * Concurrency Tests
 * 
 * Created: 2025-12-06
 * Last Updated: 2025-12-06
 * 
 * Tests concurrent operations, race conditions, and data integrity under load.
 */

export async function runConcurrencyTests(testSuite) {
    testSuite.logger.suiteStart("Concurrency Tests");

    await testSuite.test("Concurrent document creation", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for concurrent document creation test");
      }

      if (typeof testSuite.krapi.collections?.create !== "function" ||
          typeof testSuite.krapi.documents?.create !== "function") {
        throw new Error("krapi.collections.create or documents.create method not available - SDK must implement these methods");
      }

      // Create a dedicated collection for this test to avoid field conflicts
      const collectionName = `concurrent_doc_${Date.now()}`;
      let testCollection;
      try {
        testCollection = await testSuite.krapi.collections.create(
          testSuite.testProject.id,
          {
            name: collectionName,
            description: "Collection for concurrent document creation test",
            fields: [], // Empty fields - no required fields
          }
        );
      } catch (error) {
        throw new Error(`Failed to create test collection: ${error.message}`);
      }

      const concurrentCount = 10;
      const createdDocuments = [];

      try {
        // Create multiple documents simultaneously
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
                  data: `concurrent-data-${i}`,
                }
              }
            )
          );
        }

        const results = await Promise.all(createPromises);
        testSuite.assert(results.length === concurrentCount, `Should create all ${concurrentCount} documents`);

        // Verify all documents have unique IDs
        const documentIds = results.map((doc) => doc.id).filter(Boolean);
        const uniqueIds = new Set(documentIds);
        testSuite.assert(
          uniqueIds.size === documentIds.length,
          `All document IDs should be unique. Got ${uniqueIds.size} unique out of ${documentIds.length}`
        );

        // Verify all documents have correct data
        for (let i = 0; i < results.length; i++) {
          const doc = results[i];
          testSuite.assert(doc, `Document ${i} should be created`);
          testSuite.assert(doc.id, `Document ${i} should have ID`);
          // Document data is stored in doc.data object
          testSuite.assert(
            doc.data?.index === i && doc.data?.concurrent === true,
            `Document ${i} should have correct data. Got: ${JSON.stringify(doc.data)}`
          );
        }

        // Verify all documents are retrievable
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
        throw new Error(`Concurrent document creation test failed: ${error.message}`);
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

    await testSuite.test("Concurrent user creation", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for concurrent user creation test");
      }

      if (typeof testSuite.krapi.users?.create !== "function") {
        throw new Error("krapi.users.create method not available - SDK must implement this method");
      }

      const concurrentCount = 5;
      const createdUsers = [];

      try {
        // Create multiple users simultaneously with unique usernames
        const createPromises = [];
        for (let i = 0; i < concurrentCount; i++) {
          const uniqueId = `concurrent_user_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`;
          createPromises.push(
            testSuite.krapi.users.create(testSuite.testProject.id, {
              username: uniqueId,
              email: `${uniqueId}@test.com`,
              password: "ConcurrentTest123!",
              role: "user",
              permissions: ["documents:read"],
            })
          );
        }

        const results = await Promise.all(createPromises);
        testSuite.assert(results.length === concurrentCount, `Should create all ${concurrentCount} users`);

        // Verify all users have unique IDs
        const userIds = results.map((user) => user.id).filter(Boolean);
        const uniqueIds = new Set(userIds);
        testSuite.assert(
          uniqueIds.size === userIds.length,
          `All user IDs should be unique. Got ${uniqueIds.size} unique out of ${userIds.length}`
        );

        // Verify all users have unique usernames
        const usernames = results.map((user) => user.username).filter(Boolean);
        const uniqueUsernames = new Set(usernames);
        testSuite.assert(
          uniqueUsernames.size === usernames.length,
          `All usernames should be unique. Got ${uniqueUsernames.size} unique out of ${usernames.length}`
        );

        // Verify all users are retrievable
        if (typeof testSuite.krapi.users?.getAll === "function") {
          const allUsers = await testSuite.krapi.users.getAll(testSuite.testProject.id);
          testSuite.assert(Array.isArray(allUsers), "Should retrieve all users");

          // Verify our created users are in the list
          const foundIds = userIds.filter((id) =>
            allUsers.some((user) => user.id === id)
          );
          testSuite.assert(
            foundIds.length === userIds.length,
            `All created users should be retrievable. Found ${foundIds.length} out of ${userIds.length}`
          );
        }

        createdUsers.push(...results);
      } catch (error) {
        throw new Error(`Concurrent user creation test failed: ${error.message}`);
      } finally {
        // Cleanup: Delete all created users
        if (typeof testSuite.krapi.users?.delete === "function") {
          for (const user of createdUsers) {
            if (user && user.id) {
              try {
                await testSuite.krapi.users.delete(testSuite.testProject.id, user.id);
              } catch (cleanupError) {
                console.log(`   Note: Failed to cleanup user ${user.id}: ${cleanupError.message}`);
              }
            }
          }
        }
      }
    });

    await testSuite.test("Concurrent updates to same document", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for concurrent update test");
      }

      if (typeof testSuite.krapi.collections?.create !== "function" ||
          typeof testSuite.krapi.documents?.create !== "function" ||
          typeof testSuite.krapi.documents?.update !== "function") {
        throw new Error("krapi.collections.create, documents.create or update method not available - SDK must implement these methods");
      }

      // Create a dedicated collection for this test
      const collectionName = `concurrent_update_${Date.now()}`;
      let testCollection;
      try {
        testCollection = await testSuite.krapi.collections.create(
          testSuite.testProject.id,
          {
            name: collectionName,
            description: "Collection for concurrent update test",
            fields: [], // Empty fields - no required fields
          }
        );
      } catch (error) {
        throw new Error(`Failed to create test collection: ${error.message}`);
      }

      let createdDocument;
      try {
        // Create a document first
        createdDocument = await testSuite.krapi.documents.create(
          testSuite.testProject.id,
          collectionName,
          {
            data: {
              counter: 0,
              updates: [],
            }
          }
        );
        testSuite.assert(createdDocument, "Should create document");
        testSuite.assert(createdDocument.id, "Document should have ID");

        // Attempt concurrent updates
        const concurrentCount = 5;
        const updatePromises = [];
        for (let i = 0; i < concurrentCount; i++) {
          updatePromises.push(
            testSuite.krapi.documents.update(
              testSuite.testProject.id,
              collectionName,
              createdDocument.id,
              {
                data: {
                  counter: i + 1,
                  updateIndex: i,
                  timestamp: Date.now(),
                }
              }
            )
          );
        }

        // All updates should complete (last-write-wins or conflict resolution)
        const results = await Promise.allSettled(updatePromises);
        
        // At least some updates should succeed
        const successfulUpdates = results.filter((r) => r.status === "fulfilled").length;
        testSuite.assert(
          successfulUpdates > 0,
          `At least some updates should succeed. Got ${successfulUpdates} successful out of ${concurrentCount}`
        );

        // Verify final document state
        if (typeof testSuite.krapi.documents?.get === "function") {
          const finalDocument = await testSuite.krapi.documents.get(
            testSuite.testProject.id,
            collectionName,
            createdDocument.id
          );
          testSuite.assert(finalDocument, "Should retrieve final document");
          // Document data is stored in finalDocument.data object
          testSuite.assert(
            typeof finalDocument.data?.counter === "number",
            `Document should have counter field. Got: ${JSON.stringify(finalDocument.data)}`
          );
        }
      } catch (error) {
        throw new Error(`Concurrent update test failed: ${error.message}`);
      } finally {
        // Cleanup: Delete document
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

    await testSuite.test("Concurrent collection creation", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available for concurrent collection creation test");
      }

      if (typeof testSuite.krapi.collections?.create !== "function") {
        throw new Error("krapi.collections.create method not available - SDK must implement this method");
      }

      const concurrentCount = 5;
      const createdCollections = [];

      try {
        // Create multiple collections simultaneously with unique names
        const createPromises = [];
        for (let i = 0; i < concurrentCount; i++) {
          const uniqueName = `concurrent_collection_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`;
          createPromises.push(
            testSuite.krapi.collections.create(testSuite.testProject.id, {
              name: uniqueName,
              description: `Concurrent collection ${i}`,
              fields: [], // Empty fields - no required fields
            })
          );
        }

        const results = await Promise.all(createPromises);
        testSuite.assert(results.length === concurrentCount, `Should create all ${concurrentCount} collections`);

        // Verify all collections have unique IDs
        const collectionIds = results.map((col) => col.id || col.name).filter(Boolean);
        const uniqueIds = new Set(collectionIds);
        testSuite.assert(
          uniqueIds.size === collectionIds.length,
          `All collection IDs/names should be unique. Got ${uniqueIds.size} unique out of ${collectionIds.length}`
        );

        // Verify all collections have unique names
        const names = results.map((col) => col.name).filter(Boolean);
        const uniqueNames = new Set(names);
        testSuite.assert(
          uniqueNames.size === names.length,
          `All collection names should be unique. Got ${uniqueNames.size} unique out of ${names.length}`
        );

        createdCollections.push(...results);
      } catch (error) {
        throw new Error(`Concurrent collection creation test failed: ${error.message}`);
      } finally {
        // Cleanup: Delete all created collections
        if (typeof testSuite.krapi.collections?.delete === "function") {
          for (const col of createdCollections) {
            if (col && (col.id || col.name)) {
              try {
                await testSuite.krapi.collections.delete(
                  testSuite.testProject.id,
                  col.name || col.id
                );
              } catch (cleanupError) {
                console.log(`   Note: Failed to cleanup collection ${col.name || col.id}: ${cleanupError.message}`);
              }
            }
          }
        }
      }
    });
  }

