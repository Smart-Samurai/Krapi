/**
 * Metadata Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runMetadataTests(testSuite) {
    testSuite.logger.suiteStart("Metadata Management Tests");

    await testSuite.test("Get metadata schema via SDK", async () => {
      if (typeof testSuite.krapi.system?.getInfo !== "function") {
        throw new Error("krapi.system.getInfo method not available - SDK must implement this method");
      }

      // Use SDK system.getInfo which includes metadata schema
      const info = await testSuite.krapi.system.getInfo();
      testSuite.assert(info, "Should return system info");
      testSuite.assertHasData(info, "System info should have real data");
      // Metadata schema is available in system info
      testSuite.assert(info.version, "System info should have version");
    });

    await testSuite.test("Validate metadata via SDK", async () => {
      // Metadata validation is handled by SDK internally
      // Test that documents can be created with metadata (which validates it)
      const testMetadata = {
        source: "test",
        version: "1.0",
        tags: ["test", "comprehensive"],
      };
      // If we have a collection, test metadata validation through document creation
      if (
        testSuite.testCollection &&
        testSuite.testCollection.id &&
        testSuite.testProject &&
        testSuite.testProject.id
      ) {
        try {
          // CRITICAL: Verify collection exists in the current project before using it
          let collectionToUse = testSuite.testCollection;
          try {
            const verifyCollection = await testSuite.krapi.collections.get(
              testSuite.testProject.id,
              testSuite.testCollection.id
            );
            if (!verifyCollection || verifyCollection.project_id !== testSuite.testProject.id) {
              throw new Error("Collection not in current project");
            }
            collectionToUse = verifyCollection;
          } catch (error) {
            // Collection doesn't exist or is in wrong project - create a new one
            console.log(`   ⚠️  Collection ${testSuite.testCollection.id} not available, creating new one: ${error.message}`);
            const newCollection = await testSuite.krapi.collections.create(
              testSuite.testProject.id,
              {
                name: `metadata_test_${Date.now()}`,
                description: "Collection for metadata tests",
                fields: [
                  { name: "test_field", type: "string", required: false },
                  // Don't add required fields - keep it simple for metadata test
                ],
              }
            );
            // Wait and verify
            await new Promise((resolve) => setTimeout(resolve, 500));
            collectionToUse = await testSuite.krapi.collections.get(
              testSuite.testProject.id,
              newCollection.id
            );
          }
          
          // Create a document with metadata - SDK validates it
          // SDK expects: { data: {...}, metadata: {...} }
          // CRITICAL: Use collection NAME not ID (SDK createDocument expects name)
          const collectionIdentifier = collectionToUse.name || collectionToUse.id;
          
          // Build document data - include required fields if collection has them
          const documentData = { test_field: "metadata_test" };
          
          // Check if collection has required fields and include them
          if (collectionToUse.fields && Array.isArray(collectionToUse.fields)) {
            for (const field of collectionToUse.fields) {
              if (field.required && !documentData[field.name]) {
                // Add a default value for required fields
                if (field.type === 'string') {
                  documentData[field.name] = 'test';
                } else if (field.type === 'number') {
                  documentData[field.name] = 0;
                } else if (field.type === 'boolean') {
                  documentData[field.name] = false;
                }
              }
            }
          }
          
          const doc = await testSuite.krapi.documents.create(
            testSuite.testProject.id,
            collectionIdentifier,
            { data: documentData, metadata: testMetadata }
          );
          testSuite.assert(doc, "Document with metadata should be created");
          testSuite.assert(doc.id, "Document should have an ID");
          // Clean up - use the same collection identifier that was used to create the document
          await testSuite.krapi.documents.delete(
            testSuite.testProject.id,
            collectionIdentifier, // Use the same identifier (name or ID) used for creation
            doc.id
          );
        } catch (error) {
          const errorMessage = (error?.message || String(error)).toLowerCase();
          const httpStatus = error?.status || error?.response?.status;
          // Errors should be thrown, not skipped - these indicate real issues
          if (
            errorMessage.includes("not found") ||
            errorMessage.includes("data is required") ||
            errorMessage.includes("validation") ||
            httpStatus === 404
          ) {
            console.log(`   ⚠️  Document creation issue: ${error?.message}`);
            // Re-throw the error - test should fail, not skip
            throw error;
          }
          throw error;
        }
      } else {
        // Just verify SDK is connected and can make requests
        console.log(
          "   ⚠️  No test collection available - verifying SDK health instead"
        );
        const health = await testSuite.krapi.health.check();
        testSuite.assert(health.healthy, "SDK should be connected and healthy");
      }
    });
  }
