/**
 * CMSIntegration Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runCMSIntegrationTests(testSuite) {
    testSuite.logger.suiteStart("CMS Integration Tests");

    await testSuite.test("Full CMS workflow via SDK", async () => {
      // Create a new project with unique name to avoid conflicts
      const uniqueId =
        Date.now().toString(36) + Math.random().toString(36).substring(2);
      const projectName = `CMS Test Project ${uniqueId}`;

      // Use SDK methods for full CMS workflow
      if (typeof testSuite.krapi.projects?.create !== "function") {
        throw new Error("krapi.projects.create method not available");
      }

      // Step 1: Create project via SDK
      const project = await testSuite.krapi.projects.create({
        name: projectName,
        description: "Project for CMS integration testing",
      });
      testSuite.assert(project, "Project creation should succeed");
      testSuite.assert(project.id, "Project should have ID");

      // Step 2: Create a collection via SDK
      if (typeof testSuite.krapi.collections?.create !== "function") {
        throw new Error("krapi.collections.create method not available");
      }

      const collection = await testSuite.krapi.collections.create(project.id, {
        name: "cms_content",
        description: "CMS content collection",
        fields: [
          { name: "title", type: "string", required: true },
          { name: "content", type: "text", required: true },
          { name: "published", type: "boolean", required: false },
        ],
      });
      testSuite.assert(collection, "Collection creation should succeed");

      // Step 3: Create content via SDK
      if (typeof testSuite.krapi.documents?.create !== "function") {
        throw new Error("krapi.documents.create method not available");
      }

      const document = await testSuite.krapi.documents.create(
        project.id,
        collection.name,
        {
          data: {
            title: "CMS Test Content",
            content: "This is test content for CMS integration",
            published: true,
          },
        }
      );
      testSuite.assert(document, "Content creation should succeed");
      testSuite.assert(document.id, "Document should have ID");

      // Step 4: Get content via SDK
      if (typeof testSuite.krapi.documents?.get !== "function") {
        throw new Error("krapi.documents.get method not available");
      }

      const retrievedDoc = await testSuite.krapi.documents.get(
        project.id,
        collection.name,
        document.id
      );
      testSuite.assert(retrievedDoc, "Content retrieval should succeed");
      testSuite.assert(
        retrievedDoc.data?.title === "CMS Test Content",
        "Should return correct content"
      );

      // Step 5: Update content via SDK
      if (typeof testSuite.krapi.documents?.update !== "function") {
        throw new Error("krapi.documents.update method not available");
      }

      const updatedDoc = await testSuite.krapi.documents.update(
        project.id,
        collection.name,
        document.id,
        {
          data: {
            title: "Updated CMS Content",
            content: "Updated content for CMS integration",
            published: false,
          },
        }
      );
      testSuite.assert(updatedDoc, "Content update should succeed");

      // Step 6: Delete content via SDK
      if (typeof testSuite.krapi.documents?.delete !== "function") {
        throw new Error("krapi.documents.delete method not available");
      }

      const deleteResult = await testSuite.krapi.documents.delete(
        project.id,
        collection.name,
        document.id
      );
      testSuite.assert(
        deleteResult || deleteResult?.success,
        "Content deletion should succeed"
      );

      // Step 7: Delete collection via SDK
      if (typeof testSuite.krapi.collections?.delete !== "function") {
        throw new Error("krapi.collections.delete method not available");
      }

      const deleteCollectionResult = await testSuite.krapi.collections.delete(
        project.id,
        collection.name
      );
      testSuite.assert(
        deleteCollectionResult || deleteCollectionResult?.success,
        "Collection deletion should succeed"
      );

      // Step 8: Delete project via SDK
      if (typeof testSuite.krapi.projects?.delete !== "function") {
        throw new Error("krapi.projects.delete method not available");
      }

      const deleteProjectResult = await testSuite.krapi.projects.delete(project.id);
      testSuite.assert(
        deleteProjectResult || deleteProjectResult?.success,
        "Project deletion should succeed"
      );
    });
  }
