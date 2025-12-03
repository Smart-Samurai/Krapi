/**
 * SDKClient Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runSDKClientTests(testSuite) {
    testSuite.logger.suiteStart("SDK Client Tests");

    if (!testSuite.krapi) {
      throw new Error("KRAPI SDK not initialized - SDK must be initialized before running tests");
    }

    // Log krapi singleton structure for debugging (only in verbose mode)
    if (testSuite.logger.verbose) {
      console.log(
        `   krapi singleton structure: ${JSON.stringify(
          Object.keys(testSuite.krapi),
          null,
          2
        )}`
      );
      if (testSuite.krapi.projects) {
        console.log(
          `   krapi.projects structure: ${JSON.stringify(
            Object.keys(testSuite.krapi.projects),
            null,
            2
          )}`
        );
      } else {
        console.log("   ⚠️  krapi singleton doesn't have 'projects' property");
      }
    }

    await testSuite.test("SDK client can list projects", async () => {
      // Based on frontend usage: krapi.projects.getAll() returns Project[] directly
      if (typeof testSuite.krapi.projects?.getAll !== "function") {
        const availableMethods = Object.keys(testSuite.krapi.projects || {});
        throw new Error(
          `projects.getAll() method not found. Available methods: ${availableMethods.join(
            ", "
          )}`
        );
      }

      const result = await testSuite.krapi.projects.getAll();

      // SDK should return Project[] directly (as per frontend usage)
      if (Array.isArray(result)) {
        testSuite.assert(Array.isArray(result), "Should return projects array");
        return; // Success
      } else if (result && result.data && Array.isArray(result.data)) {
        // Handle wrapped response
        testSuite.assert(
          Array.isArray(result.data),
          "Should return projects array in data"
        );
        return; // Success
      } else {
        console.log("SDK getAll() response:", JSON.stringify(result, null, 2));
        throw new Error(
          `Unexpected response format from projects.getAll(): ${JSON.stringify(
            result
          )}`
        );
      }
    });

    await testSuite.test("SDK client can create project", async () => {
      if (typeof testSuite.krapi.projects?.create !== "function") {
        throw new Error("krapi.projects.create method not available");
      }

      const projectName = `SDK Test Project ${Date.now()}`;
      const result = await testSuite.krapi.projects.create({
        name: projectName,
        description: "Test project created via SDK",
      });

      // Handle different response formats
      let project = null;
      if (result && result.id) {
        // Direct project object
        project = result;
      } else if (result && result.data && result.data.id) {
        // Wrapped in { success, data }
        project = result.data;
      } else if (result && result.success && result.data) {
        project = result.data;
      } else {
        console.log(
          "SDK create project response:",
          JSON.stringify(result, null, 2)
        );
        throw new Error(
          `Unexpected response format: ${JSON.stringify(result)}`
        );
      }

      testSuite.assert(project && project.id, "Should return project ID");

      // Store for cleanup
      if (!testSuite.testProject) {
        testSuite.testProject = project;
        testSuite.logger.setTestProject(project);
      }
    });

    await testSuite.test("SDK client can get project by ID", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available");
      }
      if (typeof testSuite.krapi.projects?.get !== "function") {
        throw new Error("krapi.projects.get method not available");
      }

      const result = await testSuite.krapi.projects.get(testSuite.testProject.id);

      // Handle different response formats
      let project = null;
      if (result && result.id) {
        project = result;
      } else if (result && result.data) {
        project = result.data;
      } else {
        project = result;
      }

      testSuite.assert(
        project && project.id === testSuite.testProject.id,
        "Should return correct project"
      );
    });

    await testSuite.test("SDK client can create collection", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available");
      }
      if (typeof testSuite.krapi.collections?.create !== "function") {
        const availableMethods = Object.keys(testSuite.krapi.collections || {});
        throw new Error(
          `collections.create() method not found. Available methods: ${availableMethods.join(
            ", "
          )}`
        );
      }

      // Session token is already set from reconnect() in setup()
      // All HTTP clients (auth, collections, documents, etc.) are initialized with the token
      // No need to call setSessionToken() - it only updates auth client, not others

      // Use exactly like the frontend: krapi.collections.create(projectId, {...})
      const result = await testSuite.krapi.collections.create(testSuite.testProject.id, {
        name: "sdk_test_collection",
        description: "Test collection created via SDK",
        fields: [
          { name: "title", type: "string", required: true },
          { name: "value", type: "number", required: false },
        ],
      });

      // SDK returns Collection directly (as per frontend usage)
      testSuite.assert(result && result.id, "Should return collection ID");

      // Store collection for document tests if not already set
      if (!testSuite.testCollection) {
        testSuite.testCollection = result;
        testSuite.logger.setTestCollection(result);
        console.log(
          `   ✅ Stored collection for document tests: ${testSuite.testCollection.id} (${testSuite.testCollection.name})`
        );
      }
    });

    await testSuite.test("SDK client can create document", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available");
      }

      // CRITICAL: Always create a new collection for SDK client tests
      // Don't use testCollection from main setup - it might be in a different project or not exist
      console.log("   Creating collection for SDK document test...");
      if (typeof testSuite.krapi.collections?.create !== "function") {
        throw new Error(
          "krapi.collections.create method not available - cannot create test collection"
        );
      }

      // Session token is already set from reconnect() in setup()
      // All HTTP clients are initialized with the token during reconnect

      // Create collection via SDK (same as frontend) - ALWAYS create new one for this test
      const collection = await testSuite.krapi.collections.create(
        testSuite.testProject.id,
        {
          name: `sdk_doc_test_${Date.now()}`,
          description: "Collection for SDK document tests",
          fields: [
            { name: "title", type: "string", required: true },
            { name: "value", type: "number", required: false },
          ],
        }
      );

      console.log(
        `   ✅ Created collection: ${collection.id} (${collection.name}) in project ${testSuite.testProject.id}`
      );

      // CRITICAL: Wait and verify collection exists before using it
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Verify collection exists by querying it
      let verifiedCollection = null;
      for (let i = 0; i < 5; i++) {
        try {
          verifiedCollection = await testSuite.krapi.collections.get(
            testSuite.testProject.id,
            collection.id
          );
          if (verifiedCollection && verifiedCollection.id === collection.id) {
            console.log(`   ✅ Collection verified: ${verifiedCollection.id} (${verifiedCollection.name})`);
            break;
          }
        } catch (error) {
          console.log(`   ⚠️  Collection verification attempt ${i + 1} failed: ${error.message}`);
        }
        if (i < 4) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      if (!verifiedCollection) {
        throw new Error(`Collection ${collection.id} could not be verified after creation`);
      }

      // Use exactly like the frontend: krapi.documents.create(projectId, collectionId, { data })
      if (typeof testSuite.krapi.documents?.create !== "function") {
        const availableMethods = Object.keys(testSuite.krapi.documents || {});
        throw new Error(
          `documents.create() method not found. Available methods: ${availableMethods.join(
            ", "
          )}`
        );
      }

      // Session token is already set from reconnect() in setup()
      // All HTTP clients (including collections client used by documents) have the token

      // Use exactly like frontend: krapi.documents.create(projectId, collectionId, { data })
      // Use the collection we just created and verified - use NAME not ID (SDK expects name)
      const collectionIdentifier = verifiedCollection.name;
      console.log(`   🔍 Creating document in collection: ${collectionIdentifier} (ID: ${verifiedCollection.id})`);
      
      const document = await testSuite.krapi.documents.create(
        testSuite.testProject.id,
        collectionIdentifier,
        { data: { title: "SDK Test Document", value: 42 } }
      );

      // SDK returns Document directly (as per frontend usage)
      testSuite.assert(document && document.id, "Should return document ID");
      console.log(`   ✅ Created document via SDK: ${document.id}`);
    });

    await testSuite.test("SDK client can list documents", async () => {
      if (!testSuite.testProject) {
        throw new Error("No test project available");
      }

      // CRITICAL: Always create a new collection for SDK client tests
      // Don't use testCollection from main setup - it might be in a different project
      console.log("   Creating collection for SDK document list test...");
      if (typeof testSuite.krapi.collections?.create !== "function") {
        throw new Error(
          "krapi.collections.create method not available - cannot create test collection"
        );
      }

      // Session token is already set from reconnect() in setup()
      // All HTTP clients are initialized with the token during reconnect

      // Create collection via SDK (same as frontend) - ALWAYS create new one for this test
      const collection = await testSuite.krapi.collections.create(
        testSuite.testProject.id,
        {
          name: `sdk_doc_list_${Date.now()}`,
          description: "Collection for SDK document list tests",
          fields: [
            { name: "title", type: "string", required: true },
            { name: "value", type: "number", required: false },
          ],
        }
      );

      console.log(
        `   ✅ Created collection: ${collection.id} (${collection.name}) in project ${testSuite.testProject.id}`
      );

      // CRITICAL: Wait a moment and verify collection exists before using it
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Verify collection exists
      let verifiedCollection = null;
      for (let i = 0; i < 5; i++) {
        try {
          verifiedCollection = await testSuite.krapi.collections.get(
            testSuite.testProject.id,
            collection.id
          );
          if (verifiedCollection && verifiedCollection.id === collection.id) {
            console.log(`   ✅ Collection verified: ${verifiedCollection.id}`);
            break;
          }
        } catch (error) {
          console.log(`   ⚠️  Collection verification attempt ${i + 1} failed: ${error.message}`);
        }
        if (i < 4) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      if (!verifiedCollection) {
        throw new Error(`Collection ${collection.id} could not be verified after creation`);
      }

      // Use exactly like the frontend: krapi.documents.getAll(projectId, collectionId)
      if (typeof testSuite.krapi.documents?.getAll !== "function") {
        const availableMethods = Object.keys(testSuite.krapi.documents || {});
        throw new Error(
          `documents.getAll() method not found. Available methods: ${availableMethods.join(
            ", "
          )}`
        );
      }

      // Session token is already set from reconnect() in setup()
      // All HTTP clients (including collections client used by documents) have the token

      // Ensure we have at least one document to list (create one if needed)
      let documents = [];
      try {
        // Use the collection we just created and verified
        const collectionIdentifier = verifiedCollection.name || verifiedCollection.id;
        console.log(`   🔍 Listing documents in collection: ${collectionIdentifier} (ID: ${verifiedCollection.id})`);

        // Try to list documents first
        documents = await testSuite.krapi.documents.getAll(
          testSuite.testProject.id,
          collectionIdentifier
        );

        // SDK returns Document[] directly (as per frontend usage)
        if (!Array.isArray(documents)) {
          // Handle wrapped response
          documents = documents.data || documents.documents || [];
        }

        if (documents.length === 0) {
          console.log("   No documents found, creating one...");
          // Create a document using SDK (same as frontend)
          await testSuite.krapi.documents.create(
            testSuite.testProject.id,
            collectionIdentifier,
            { data: { title: "SDK List Test Document", value: 100 } }
          );

          // List again
          documents = await testSuite.krapi.documents.getAll(
            testSuite.testProject.id,
            collectionIdentifier
          );
          if (!Array.isArray(documents)) {
            documents = documents.data || documents.documents || [];
          }
        }
      } catch (error) {
        // If listing fails, try creating a document first
        console.log(
          `   Error listing documents, creating one first: ${error.message}`
        );
        const collectionIdentifier =
          testSuite.testCollection.name || testSuite.testCollection.id;
        await testSuite.krapi.documents.create(
          testSuite.testProject.id,
          collectionIdentifier,
          { data: { title: "SDK List Test Document", value: 100 } }
        );

        // List again
        documents = await testSuite.krapi.documents.getAll(
          testSuite.testProject.id,
          collectionIdentifier
        );
        if (!Array.isArray(documents)) {
          documents = documents.data || documents.documents || [];
        }
      }

      // SDK returns Document[] directly (as per frontend usage)
      testSuite.assert(Array.isArray(documents), "Should return documents array");
      testSuite.assert(documents.length > 0, "Should have at least one document");
      console.log(`   ✅ Listed ${documents.length} document(s) via SDK`);
    });
  }
