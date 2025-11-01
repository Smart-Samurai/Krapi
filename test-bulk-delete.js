#!/usr/bin/env node

import axios from "axios";

const FRONTEND_URL = "http://localhost:3498";
const BACKEND_URL = "http://localhost:3470";

async function testBulkDelete() {
  console.log("🧪 Testing Bulk Delete Functionality");
  console.log("=".repeat(50));

  try {
    // Step 1: Login
    console.log("1. Logging in...");
    const loginResponse = await axios.post(`${FRONTEND_URL}/api/auth/login`, {
      username: "admin",
      password: "admin123",
    });

    if (loginResponse.status !== 200 || !loginResponse.data.success) {
      throw new Error("Login failed");
    }

    const sessionToken = loginResponse.data.token;
    console.log("✅ Login successful");

    // Step 2: Create a test project
    console.log("2. Creating test project...");
    const projectResponse = await axios.post(
      `${FRONTEND_URL}/api/projects`,
      {
        name: "Bulk Delete Test Project",
        description: "Project for testing bulk delete functionality",
      },
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }
    );

    if (projectResponse.status !== 201 || !projectResponse.data.success) {
      throw new Error("Project creation failed");
    }

    const project = projectResponse.data.project;
    console.log("✅ Project created:", project.id);

    // Step 3: Create a test collection
    console.log("3. Creating test collection...");
    const collectionResponse = await axios.post(
      `${FRONTEND_URL}/api/projects/${project.id}/collections`,
      {
        name: "test_documents",
        description: "Collection for testing bulk delete",
        fields: [
          { name: "title", type: "string", required: true },
          { name: "status", type: "string", required: true },
        ],
      },
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }
    );

    if (collectionResponse.status !== 201 || !collectionResponse.data.success) {
      throw new Error("Collection creation failed");
    }

    const collection = collectionResponse.data.collection;
    console.log("✅ Collection created:", collection.name);

    // Step 4: Create test documents
    console.log("4. Creating test documents...");
    const documents = [];
    for (let i = 1; i <= 3; i++) {
      const docResponse = await axios.post(
        `${FRONTEND_URL}/api/projects/${project.id}/collections/${collection.name}/documents`,
        {
          data: {
            title: `Test Document ${i}`,
            status: "bulk_delete_test",
          },
        },
        {
          headers: { Authorization: `Bearer ${sessionToken}` },
        }
      );

      if (docResponse.status !== 201) {
        throw new Error(`Document ${i} creation failed`);
      }

      documents.push(docResponse.data);
    }
    console.log("✅ Created", documents.length, "documents");

    // Step 5: Test bulk delete
    console.log("5. Testing bulk delete...");
    const documentIds = documents.map((doc) => doc.id);

    const startTime = Date.now();
    const deleteResponse = await axios.post(
      `${FRONTEND_URL}/api/projects/${project.id}/collections/${collection.name}/documents/bulk-delete`,
      { document_ids: documentIds },
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
        timeout: 15000, // 15 second timeout
      }
    );
    const endTime = Date.now();

    if (deleteResponse.status !== 200 || !deleteResponse.data.success) {
      throw new Error("Bulk delete failed");
    }

    console.log("✅ Bulk delete successful!");
    console.log(
      `   Deleted: ${deleteResponse.data.data.deleted_count} documents`
    );
    console.log(`   Duration: ${endTime - startTime}ms`);

    // Step 6: Verify documents are deleted
    console.log("6. Verifying documents are deleted...");
    const verifyResponse = await axios.get(
      `${FRONTEND_URL}/api/projects/${project.id}/collections/${collection.name}/documents`,
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }
    );

    const remainingDocs = verifyResponse.data.data.filter((doc) =>
      documentIds.includes(doc.id)
    );

    if (remainingDocs.length > 0) {
      throw new Error(`${remainingDocs.length} documents were not deleted`);
    }

    console.log("✅ All documents successfully deleted");

    // Step 7: Cleanup
    console.log("7. Cleaning up...");
    await axios.delete(`${FRONTEND_URL}/api/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    console.log("✅ Cleanup complete");

    console.log("\n🎉 BULK DELETE TEST PASSED! 🎉");
    console.log("The bulk delete functionality is working correctly.");
  } catch (error) {
    console.error("\n❌ BULK DELETE TEST FAILED!");
    console.error("Error:", error.message);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }

    process.exit(1);
  }
}

// Run the test
testBulkDelete();
