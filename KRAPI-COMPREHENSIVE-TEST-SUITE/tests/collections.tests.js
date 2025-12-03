/**
 * Collection Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runCollectionTests(testSuite) {
    testSuite.logger.suiteStart("Collection Management Tests");

    await testSuite.test("Create test collection via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.collections?.create !== "function") {
        throw new Error("krapi.collections.create method not available");
      }

      const collection = await testSuite.krapi.collections.create(
        testSuite.testProject.id,
        {
          name: "test_collection",
          description: "A test collection for comprehensive testing",
          fields: [
            { name: "title", type: "string", required: true },
            { name: "status", type: "string", required: true },
            { name: "priority", type: "number", required: false },
            { name: "is_active", type: "boolean", required: false },
            { name: "description", type: "text", required: false },
          ],
        }
      );

      // SDK returns Collection directly
      testSuite.assert(collection, "Collection creation should succeed");
      testSuite.assert(collection.id, "Collection should have an ID");

      testSuite.testCollection = collection;
      testSuite.logger.setTestCollection(collection);
      console.log(
        `   ✅ Test collection set: ${testSuite.testCollection.id} (${testSuite.testCollection.name})`
      );
    });

    await testSuite.test("Get all collections via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.collections?.getAll !== "function") {
        throw new Error("krapi.collections.getAll method not available");
      }

      const collections = await testSuite.krapi.collections.getAll(
        testSuite.testProject.id
      );

      // SDK returns Collection[] directly
      testSuite.assert(
        Array.isArray(collections),
        "Should return collections array"
      );
      testSuite.assert(
        collections.length > 0,
        "Should have at least one collection"
      );
    });

    await testSuite.test("Get collection by name via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.collections?.get !== "function") {
        throw new Error("krapi.collections.get method not available");
      }

      const collection = await testSuite.krapi.collections.get(
        testSuite.testProject.id,
        testSuite.testCollection.name
      );

      // SDK returns Collection directly
      testSuite.assert(collection, "Should return collection");
      testSuite.assert(
        collection.name === testSuite.testCollection.name,
        "Should return correct collection"
      );
    });

    await testSuite.test("Update collection via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.collections?.update !== "function") {
        throw new Error("krapi.collections.update method not available");
      }

      const collection = await testSuite.krapi.collections.update(
        testSuite.testProject.id,
        testSuite.testCollection.name,
        {
          description: "Updated collection description",
        }
      );

      // SDK returns updated Collection directly
      testSuite.assert(collection, "Should return updated collection");
    });

    await testSuite.test("Get collection statistics via SDK", async () => {
      // Use SDK method instead of direct axios call
      // SDK uses getStatistics, not getStats
      if (typeof testSuite.krapi.collections?.getStatistics !== "function") {
        throw new Error("krapi.collections.getStatistics method not available");
      }

      const stats = await testSuite.krapi.collections.getStatistics(
        testSuite.testProject.id,
        testSuite.testCollection.name
      );

      // SDK returns stats object directly
      testSuite.assert(stats, "Should return collection statistics");
    });

    await testSuite.test("Validate collection schema via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.collections?.validateSchema !== "function") {
        throw new Error(
          "krapi.collections.validateSchema method not available"
        );
      }

      const result = await testSuite.krapi.collections.validateSchema(
        testSuite.testProject.id,
        testSuite.testCollection.name
      );

      // SDK returns validation result
      testSuite.assert(result, "Should return validation result");
      testSuite.assert(result.valid === true, "Schema should be valid");
    });
  }
