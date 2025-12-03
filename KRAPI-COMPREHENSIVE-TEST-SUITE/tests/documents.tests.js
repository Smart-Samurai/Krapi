/**
 * Document Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runDocumentTests(testSuite) {
    testSuite.logger.suiteStart("Document CRUD & Operations Tests");

    await testSuite.test("Create single document via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.documents?.create !== "function") {
        throw new Error("krapi.documents.create method not available");
      }

      const document = await testSuite.krapi.documents.create(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        {
          data: {
            title: "Test Document",
            status: "todo",
            priority: 1,
            is_active: true,
            description: "A test document",
          },
        }
      );

      // SDK returns Document directly
      testSuite.assert(document, "Document creation should succeed");
      testSuite.assert(document.id, "Document should have an ID");
    });

    await testSuite.test("Get document by ID via SDK", async () => {
      // First create a document to get
      const createdDoc = await testSuite.krapi.documents.create(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        {
          data: {
            title: "Document to Get",
            status: "in_progress",
            priority: 2,
            is_active: true,
            description: "Document for get test",
          },
        }
      );
      const documentId = createdDoc.id;

      // Use SDK method to get document
      const document = await testSuite.krapi.documents.get(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        documentId
      );

      testSuite.assert(document, "Should return document");
      testSuite.assert(document.id === documentId, "Should return correct document");
    });

    await testSuite.test("Update document via SDK", async () => {
      // First create a document to update
      const createdDoc = await testSuite.krapi.documents.create(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        {
          data: {
            title: "Document to Update",
            status: "todo",
            priority: 1,
            is_active: true,
            description: "Document for update test",
          },
        }
      );
      const documentId = createdDoc.id;

      // Use SDK method to update document
      const updatedDoc = await testSuite.krapi.documents.update(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        documentId,
        {
          data: {
            title: "Updated Document",
            status: "done",
            priority: 3,
            is_active: false,
            description: "Updated description",
          },
        }
      );

      testSuite.assert(updatedDoc, "Should return updated document");
      testSuite.assert(
        updatedDoc.data?.title === "Updated Document",
        "Should update title"
      );
    });

    await testSuite.test("Create multiple test documents via SDK", async () => {
      const documentsData = [
        {
          data: {
            title: "Test Document 1",
            status: "archived",
            priority: 1,
            is_active: false,
            description: "First test document",
          },
        },
        {
          data: {
            title: "Test Document 2",
            status: "done",
            priority: 2,
            is_active: true,
            description: "Second test document",
          },
        },
        {
          data: {
            title: "Test Document 3",
            status: "in_progress",
            priority: 3,
            is_active: true,
            description: "Third test document",
          },
        },
      ];

      for (const doc of documentsData) {
        const document = await testSuite.krapi.documents.create(
          testSuite.testProject.id,
          testSuite.testCollection.name,
          doc
        );
        testSuite.assert(document, "Document creation should succeed");
        testSuite.assert(document.id, "Document should have an ID");
      }
    });

    await testSuite.test("Get all documents via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.documents?.getAll !== "function") {
        throw new Error("krapi.documents.getAll method not available");
      }

      const documents = await testSuite.krapi.documents.getAll(
        testSuite.testProject.id,
        testSuite.testCollection.name
      );

      // SDK returns Document[] directly
      testSuite.assert(Array.isArray(documents), "Should return documents array");
      testSuite.assert(documents.length > 0, "Should have documents");
    });

    await testSuite.test("Get documents with pagination via SDK", async () => {
      const documents = await testSuite.krapi.documents.getAll(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        { limit: 2, offset: 0 }
      );

      testSuite.assert(Array.isArray(documents), "Should return documents array");
      testSuite.assert(documents.length <= 2, "Should respect limit");
    });

    await testSuite.test("Filter documents by status via SDK", async () => {
      // Create a document with specific status
      await testSuite.krapi.documents.create(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        {
          data: {
            title: "Todo Document",
            status: "todo",
            priority: 1,
            is_active: true,
            description: "Document with todo status",
          },
        }
      );

      // Use SDK getAll method with filter for filtering
      // SDK doesn't have a query method, use getAll with filter option
      if (typeof testSuite.krapi.documents?.getAll !== "function") {
        throw new Error("krapi.documents.getAll method not available");
      }

      const documents = await testSuite.krapi.documents.getAll(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        { filter: { status: "todo" } }
      );

      testSuite.assert(Array.isArray(documents), "Should return documents array");
    });

    await testSuite.test(
      "Filter documents by multiple criteria via SDK",
      async () => {
        // Use getAll with filter instead of query
        const documents = await testSuite.krapi.documents.getAll(
          testSuite.testProject.id,
          testSuite.testCollection.name,
          { filter: { status: "done", is_active: true } }
        );

        testSuite.assert(Array.isArray(documents), "Should return documents array");
      }
    );

    await testSuite.test("Sort documents by priority via SDK", async () => {
      // Use getAll with orderBy instead of query
      const documents = await testSuite.krapi.documents.getAll(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        { orderBy: "priority", order: "desc" }
      );

      testSuite.assert(Array.isArray(documents), "Should return documents array");
    });

    await testSuite.test("Count documents via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.documents?.count !== "function") {
        throw new Error("krapi.documents.count method not available");
      }

      const count = await testSuite.krapi.documents.count(
        testSuite.testProject.id,
        testSuite.testCollection.name
      );

      // SDK returns { count: number }, not just a number
      testSuite.assert(
        count && typeof count.count === "number",
        `Should return count as number (got: ${typeof count}, value: ${JSON.stringify(
          count
        )})`
      );
    });

    await testSuite.test("Count documents with filter via SDK", async () => {
      // SDK count method expects filter directly, not wrapped in { filter: ... }
      const result = await testSuite.krapi.documents.count(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        { status: "todo" }
      );

      // SDK returns { count: number }, not just a number
      testSuite.assert(
        result && typeof result.count === "number",
        `Should return count as number (got: ${typeof result}, value: ${JSON.stringify(
          result
        )})`
      );
    });

    await testSuite.test("Bulk create documents via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.documents?.bulkCreate !== "function") {
        throw new Error("krapi.documents.bulkCreate method not available");
      }

      const documentsData = [
        {
          data: {
            title: "Bulk Document 1",
            status: "bulk_created",
            priority: 3,
            is_active: true,
            description: "First bulk created document",
          },
        },
        {
          data: {
            title: "Bulk Document 2",
            status: "bulk_created",
            priority: 4,
            is_active: true,
            description: "Second bulk created document",
          },
        },
      ];

      const result = await testSuite.krapi.documents.bulkCreate(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        documentsData
      );

      testSuite.assert(result, "Bulk create should succeed");
      testSuite.assert(
        Array.isArray(result.created) || Array.isArray(result),
        "Should return created documents"
      );
    });

    await testSuite.test("Bulk update documents via SDK", async () => {
      // First get some documents to update
      const documents = await testSuite.krapi.documents.getAll(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        { limit: 2 }
      );

      if (documents.length > 0) {
        // Use SDK method instead of direct axios call
        if (typeof testSuite.krapi.documents?.bulkUpdate !== "function") {
          throw new Error("krapi.documents.bulkUpdate method not available");
        }

        const updates = documents.map((doc) => ({
          id: doc.id,
          data: {
            ...doc.data,
            status: "bulk_updated",
            priority: (doc.data?.priority || 1) + 1,
          },
        }));

        const result = await testSuite.krapi.documents.bulkUpdate(
          testSuite.testProject.id,
          testSuite.testCollection.name,
          updates
        );

        testSuite.assert(result, "Bulk update should succeed");
      }
    });

    await testSuite.test("Bulk delete documents via SDK", async () => {
      // Get some documents to delete
      // Use getAll with filter instead of query
      const documents = await testSuite.krapi.documents.getAll(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        { filter: { status: "bulk_updated" }, limit: 2 }
      );

      testSuite.assert(Array.isArray(documents), "Should return documents array");

      if (documents.length > 0) {
        // Use SDK method instead of direct axios call
        if (typeof testSuite.krapi.documents?.bulkDelete !== "function") {
          throw new Error("krapi.documents.bulkDelete method not available");
        }

        const documentIds = documents.map((doc) => doc.id);
        testSuite.assert(
          documentIds.length > 0,
          "Should have document IDs to delete"
        );

        const result = await testSuite.krapi.documents.bulkDelete(
          testSuite.testProject.id,
          testSuite.testCollection.name,
          documentIds
        );

        testSuite.assert(result, "Bulk delete should succeed");
        testSuite.assert(
          typeof result.deleted_count === "number" ||
            typeof result.deleted === "number",
          "Should return deleted count"
        );
      } else {
        // If no documents found, test still passes but logs a note
        console.log(
          "   No documents with status 'bulk_updated' found to delete"
        );
      }
    });

    await testSuite.test("Search documents via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.documents?.search !== "function") {
        throw new Error("krapi.documents.search method not available");
      }

      const result = await testSuite.krapi.documents.search(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        {
          query: "test",
          limit: 10,
          offset: 0,
        }
      );

      testSuite.assert(result, "Search should return result");
      testSuite.assert(
        Array.isArray(result.documents) || Array.isArray(result),
        "Should return documents array"
      );
    });

    await testSuite.test("Aggregate documents via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.documents?.aggregate !== "function") {
        throw new Error("krapi.documents.aggregate method not available");
      }

      const result = await testSuite.krapi.documents.aggregate(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        {
          group_by: ["status"],
          aggregations: [],
        }
      );

      // SDK returns { groups: Record<string, Record<string, number>>, total_groups: number }
      // groups is an object, not an array
      testSuite.assert(result, "Aggregate should return result");
      testSuite.assert(
        result.groups &&
          typeof result.groups === "object" &&
          !Array.isArray(result.groups),
        "Should return groups object"
      );
      testSuite.assert(
        typeof result.total_groups === "number",
        "Should return total_groups as number"
      );
    });
  }
