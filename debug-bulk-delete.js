#!/usr/bin/env node

/**
 * Debug script for bulk delete timeout issue
 */

import axios from "axios";

const FRONTEND_URL = "http://localhost:3498";
const BACKEND_URL = "http://localhost:3470";

async function debugBulkDelete() {
  try {
    console.log("🔍 Starting bulk delete debug...");

    // Step 1: Login to get session token
    console.log("🔍 Step 1: Login...");
    const loginResponse = await axios.post(`${FRONTEND_URL}/api/auth/login`, {
      username: "admin",
      password: "admin123",
    });

    if (!loginResponse.data.session_token) {
      throw new Error("No session token received");
    }

    const sessionToken = loginResponse.data.session_token;
    console.log("✅ Login successful");

    // Step 2: Create a test project
    console.log("🔍 Step 2: Create test project...");
    const projectResponse = await axios.post(
      `${FRONTEND_URL}/api/projects`,
      {
        name: "DEBUG_BULK_DELETE_PROJECT",
        description: "Test project for debugging bulk delete",
      },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );

    const projectId = projectResponse.data.data.id;
    console.log(`✅ Project created: ${projectId}`);

    // Step 3: Create a test collection
    console.log("🔍 Step 3: Create test collection...");
    const collectionResponse = await axios.post(
      `${FRONTEND_URL}/api/projects/${projectId}/collections`,
      {
        name: "debug_collection",
        description: "Test collection for debugging",
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
    console.log(`✅ Collection created: ${collectionName}`);

    // Step 4: Create test documents
    console.log("🔍 Step 4: Create test documents...");
    const documents = [
      { data: { title: "Test Doc 1", status: "bulk_created" } },
      { data: { title: "Test Doc 2", status: "bulk_created" } },
    ];

    const createResponse = await axios.post(
      `${FRONTEND_URL}/api/projects/${projectId}/collections/${collectionName}/documents/bulk`,
      { documents },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );

    const documentIds = createResponse.data.data.created.map((doc) => doc.id);
    console.log(`✅ Documents created: ${documentIds.length}`);

    // Step 5: Test bulk delete
    console.log("🔍 Step 5: Test bulk delete...");
    console.log(`🔍 Deleting documents: ${documentIds.join(", ")}`);

    const deleteResponse = await axios.post(
      `${FRONTEND_URL}/api/projects/${projectId}/collections/${collectionName}/documents/bulk-delete`,
      { document_ids: documentIds },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        timeout: 15000, // 15 second timeout
      }
    );

    console.log("✅ Bulk delete successful!");
    console.log("Response:", JSON.stringify(deleteResponse.data, null, 2));
  } catch (error) {
    console.error("❌ Debug failed:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    if (error.code === "ECONNABORTED") {
      console.error("❌ Request timed out!");
    }
  }
}

debugBulkDelete();
