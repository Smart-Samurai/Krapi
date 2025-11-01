const axios = require("axios");

async function testBulkCreate() {
  try {
    // First, let's login to get a session token
    const loginResponse = await axios.post(
      "http://localhost:3498/api/auth/login",
      {
        username: "admin",
        password: "admin123",
      }
    );

    const sessionToken = loginResponse.data.session_token;
    console.log("✅ Login successful, session token:", sessionToken);

    // Create a test project
    const projectResponse = await axios.post(
      "http://localhost:3498/api/projects",
      {
        name: "Debug Test Project",
        description: "Project for debugging bulk create",
      },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );

    const projectId = projectResponse.data.data.id;
    console.log("✅ Project created, ID:", projectId);

    // Create a test collection
    const collectionResponse = await axios.post(
      `http://localhost:3498/api/projects/${projectId}/collections`,
      {
        name: "debug_collection",
        description: "Collection for debugging bulk create",
        fields: [
          { name: "title", type: "string", required: true },
          { name: "status", type: "string", default: "active" },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );

    const collectionName = collectionResponse.data.data.name;
    console.log("✅ Collection created, name:", collectionName);

    // Test bulk create
    const bulkDocuments = [
      {
        data: {
          title: "Bulk Document 1",
          status: "bulk_created",
        },
      },
      {
        data: {
          title: "Bulk Document 2",
          status: "bulk_created",
        },
      },
    ];

    console.log("🧪 Testing bulk create...");
    const bulkResponse = await axios.post(
      `http://localhost:3498/api/projects/${projectId}/collections/${collectionName}/documents/bulk`,
      { documents: bulkDocuments },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );

    console.log("📊 Bulk create response status:", bulkResponse.status);
    console.log(
      "📊 Bulk create response data:",
      JSON.stringify(bulkResponse.data, null, 2)
    );

    if (bulkResponse.data.created && Array.isArray(bulkResponse.data.created)) {
      console.log(
        "✅ Response has created array with",
        bulkResponse.data.created.length,
        "documents"
      );
    } else if (
      bulkResponse.data.data &&
      Array.isArray(bulkResponse.data.data)
    ) {
      console.log(
        "✅ Response has data array with",
        bulkResponse.data.data.length,
        "documents"
      );
    } else {
      console.log("❌ Unexpected response format");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("❌ Response status:", error.response.status);
      console.error(
        "❌ Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}

testBulkCreate();
