#!/usr/bin/env node

import axios from "axios";

const FRONTEND_URL = "http://localhost:3498";
const BACKEND_URL = "http://localhost:3470";

async function debugBulkCreateDetailed() {
  try {
    console.log("🔍 Detailed debugging of bulk create documents...");

    // First, login to get session token
    console.log("1. Logging in...");
    const loginResponse = await axios.post(`${FRONTEND_URL}/api/auth/login`, {
      username: "admin",
      password: "admin123",
    });

    if (!loginResponse.data.session_token) {
      throw new Error("No session token received from login");
    }

    const sessionToken = loginResponse.data.session_token;
    console.log("✅ Authentication successful");

    // Create a test project
    console.log("2. Creating test project...");
    const projectResponse = await axios.post(
      `${FRONTEND_URL}/api/projects`,
      {
        name: "debug-project-2",
        description: "Debug project for testing bulk create",
      },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );

    const project = projectResponse.data.data;
    console.log(`✅ Project created: ${project.id}`);

    // Create a test collection
    console.log("3. Creating test collection...");
    const collectionResponse = await axios.post(
      `${FRONTEND_URL}/api/projects/${project.id}/collections`,
      {
        name: "debug_collection_2",
        description: "Debug collection for testing bulk create",
        fields: [
          { name: "title", type: "string", required: true },
          { name: "description", type: "string" },
          { name: "status", type: "string", default: "active" },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );

    const collection = collectionResponse.data.data;
    console.log(`✅ Collection created: ${collection.name}`);

    // Verify collection exists by getting it
    console.log("4. Verifying collection exists...");
    const getCollectionResponse = await axios.get(
      `${FRONTEND_URL}/api/projects/${project.id}/collections/${collection.name}`,
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
    console.log(
      `✅ Collection verified: ${getCollectionResponse.data.data.name}`
    );

    // Test single document create first
    console.log("5. Testing single document create...");
    const singleDocResponse = await axios.post(
      `${FRONTEND_URL}/api/projects/${project.id}/collections/${collection.name}/documents`,
      {
        data: {
          title: "Single Test Document",
          description: "Testing single document creation",
          status: "test",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
    console.log(
      `✅ Single document created: ${singleDocResponse.data.data.id}`
    );

    // Test bulk create
    console.log("6. Testing bulk create...");
    const bulkDocuments = [
      {
        data: {
          title: "Bulk Document 1",
          description: "First bulk created document",
          status: "bulk_created",
        },
      },
      {
        data: {
          title: "Bulk Document 2",
          description: "Second bulk created document",
          status: "bulk_created",
        },
      },
    ];

    try {
      const bulkResponse = await axios.post(
        `${FRONTEND_URL}/api/projects/${project.id}/collections/${collection.name}/documents/bulk`,
        { documents: bulkDocuments },
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );

      console.log("✅ Bulk create successful!");
      console.log("Response:", JSON.stringify(bulkResponse.data, null, 2));
    } catch (bulkError) {
      console.log("❌ Bulk create failed!");
      console.log("Error status:", bulkError.response?.status);
      console.log(
        "Error data:",
        JSON.stringify(bulkError.response?.data, null, 2)
      );
      console.log("Error message:", bulkError.message);

      // Try to get more details from backend logs
      console.log("7. Checking backend health...");
      try {
        const healthResponse = await axios.get(`${BACKEND_URL}/health`);
        console.log(
          "Backend health:",
          JSON.stringify(healthResponse.data, null, 2)
        );
      } catch (healthError) {
        console.log("Backend health check failed:", healthError.message);
      }
    }
  } catch (error) {
    console.error("💥 Debug failed:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}

debugBulkCreateDetailed();
