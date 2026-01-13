/**
 * Frontend UI Test Data Setup
 *
 * Provides functions to reset the database and create test data
 * for frontend UI tests. Uses SDK to create data (SDK-first architecture).
 */

import { CONFIG } from "../../config.js";
import {
  loginAsAdmin as sdkLogin,
  getSDK,
  initializeSDK,
} from "../../lib/sdk-client.js";

/**
 * Setup test data with database reset
 * This resets test data (deletes all projects) before setting up test data.
 * Use this for a fresh database state for tests.
 */
export async function setupTestDataWithReset() {
  // Reset test data (deletes all projects)
  await resetTestData();

  // Then set up test data
  return await setupTestData();
}

/**
 * Test data that will be created
 */
export const TEST_DATA = {
  projects: [],
  collections: [],
  documents: [],
  users: [],
  apiKeys: [],
};

/**
 * Login and get session token for admin operations
 * Uses SDK auth.login() method
 */
async function loginAsAdmin() {
  try {
    await initializeSDK();
    const token = await sdkLogin();
    return token;
  } catch (error) {
    throw new Error(`Failed to login as admin: ${error.message}`);
  }
}

/**
 * Reset database by deleting all test data
 * Deletes all projects for a fresh start
 */
export async function resetTestData() {
  console.log("🧹 Resetting test data...");

  try {
    // Add retry logic for rate limiting
    let sessionToken;
    let retries = 3;
    while (retries > 0) {
      try {
        sessionToken = await loginAsAdmin();
        break;
      } catch (error) {
        if (error.message.includes("Too many login attempts") && retries > 1) {
          console.log(
            `   ⏳ Rate limited, waiting 5 seconds before retry (${
              retries - 1
            } retries left)...`
          );
          await new Promise((resolve) => setTimeout(resolve, 5000));
          retries--;
        } else {
          throw error;
        }
      }
    }

    // Get all projects using SDK
    const krapi = getSDK();
    const projects = await krapi.projects.getAll();
    console.log(`   Found ${projects.length} project(s) to delete...`);

    // Delete ALL projects for a fresh database
    for (const project of projects) {
      try {
        await krapi.projects.delete(project.id);
        console.log(`   ✅ Deleted project: ${project.name}`);
      } catch (error) {
        console.log(
          `   ⚠️  Could not delete project ${project.name}: ${error.message}`
        );
      }
    }

    // Clear test data arrays
    TEST_DATA.projects = [];
    TEST_DATA.collections = [];
    TEST_DATA.documents = [];
    TEST_DATA.users = [];
    TEST_DATA.apiKeys = [];

    console.log("✅ Test data reset complete - database is now fresh");
  } catch (error) {
    console.error(`❌ Failed to reset test data: ${error.message}`);
    throw error;
  }
}

/**
 * Create test project
 */
export async function createTestProject(name = null) {
  const projectName = name || CONFIG.TEST_PROJECT_NAME;

  try {
    await loginAsAdmin(); // Initialize SDK and login
    const krapi = getSDK();

    // Check if project with same name already exists and delete it
    try {
      const projects = await krapi.projects.getAll();
      const existingProject = projects.find((p) => p.name === projectName);
      if (existingProject) {
        console.log(
          `   ⚠️  Project "${projectName}" already exists, deleting it first...`
        );
        try {
          await krapi.projects.delete(existingProject.id);
          console.log(`   ✅ Deleted existing project: ${projectName}`);
        } catch (deleteError) {
          console.log(
            `   ⚠️  Could not delete existing project: ${deleteError.message}`
          );
        }
      }
    } catch (checkError) {
      // Ignore errors when checking for existing projects
      console.log(
        `   ⚠️  Could not check for existing projects: ${checkError.message}`
      );
    }

    const project = await krapi.projects.create({
      name: projectName,
      description: `Test project for UI testing - ${new Date().toISOString()}`,
    });

    TEST_DATA.projects.push(project);
    console.log(`   ✅ Created test project: ${project.name} (${project.id})`);

    return project;
  } catch (error) {
    throw new Error(`Failed to create test project: ${error.message}`);
  }
}

/**
 * Create test collection in a project
 */
export async function createTestCollection(projectId, name = null) {
  const requestedName = name || CONFIG.TEST_COLLECTION_NAME;

  try {
    await loginAsAdmin(); // Initialize SDK and login
    const krapi = getSDK();

    const collection = await krapi.collections.create(projectId, {
      name: requestedName,
      fields: [
        { name: "name", type: "string", required: true },
        { name: "age", type: "number", required: false },
        { name: "email", type: "string", required: true },
        { name: "active", type: "boolean", required: false },
      ],
    });

    TEST_DATA.collections.push({ projectId, collection });
    const actualCollectionName = collection?.name || requestedName || "unknown";
    console.log(
      `   ✅ Created test collection: ${actualCollectionName} in project ${projectId}`
    );

    return collection;
  } catch (error) {
    throw new Error(`Failed to create test collection: ${error.message}`);
  }
}

/**
 * Create test documents in a collection
 */
export async function createTestDocuments(
  projectId,
  collectionName,
  count = 5
) {
  const documents = [];

  try {
    await loginAsAdmin(); // Initialize SDK and login
    const krapi = getSDK();

    for (let i = 0; i < count; i++) {
      const document = await krapi.documents.create(projectId, collectionName, {
        data: {
          name: `Test User ${i + 1}`,
          age: 20 + i,
          email: `testuser${i + 1}@example.com`,
          active: i % 2 === 0,
        },
      });

      documents.push(document);
      TEST_DATA.documents.push({ projectId, collectionName, document });
    }

    console.log(
      `   ✅ Created ${documents.length} test documents in ${collectionName}`
    );
    return documents;
  } catch (error) {
    throw new Error(`Failed to create test documents: ${error.message}`);
  }
}

/**
 * Create test user in a project
 */
export async function createTestUser(projectId, email = null) {
  const userEmail = email || CONFIG.TEST_USER_EMAIL;

  try {
    await loginAsAdmin(); // Initialize SDK and login
    const krapi = getSDK();

    // Extract username from email (before @)
    const username = userEmail.split("@")[0];

    const user = await krapi.users.create(projectId, {
      username: username,
      email: userEmail,
      name: "Test User",
      scopes: ["read", "write"],
    });

    TEST_DATA.users.push({ projectId, user });
    console.log(
      `   ✅ Created test user: ${user.email} in project ${projectId}`
    );

    return user;
  } catch (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }
}

/**
 * Create test API key for a project
 */
export async function createTestApiKey(projectId, name = "Test API Key") {
  try {
    const token = await loginAsAdmin(); // Initialize SDK and login
    
    // Use frontend API route which uses backend SDK internally
    // This route should work because it uses createAuthenticatedBackendSdk
    const response = await fetch(
      `${CONFIG.FRONTEND_URL}/api/krapi/k1/projects/${projectId}/api-keys`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name,
          scopes: ["projects:read", "collections:read", "documents:read"],
        }),
      }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        const errorMessage = errorData.error || errorData.message || response.statusText;
        
        // If it's a 500 error, it might be a real issue - log it
        if (response.status === 500) {
          console.error(`   ❌ API key creation failed with 500: ${errorMessage}`);
        }
        
        throw new Error(errorMessage);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
        throw new Error("Failed to create API Key: Invalid response format");
    }

    const apiKey = result.data;
    // Normalized format if needed
    TEST_DATA.apiKeys.push({ projectId, apiKey });
    console.log(
      `   ✅ Created test API key: ${apiKey.name || name} in project ${projectId}`
    );

    return apiKey;
  } catch (error) {
    // Re-throw with more context
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create test API key: ${errorMessage}`);
  }
}

/**
 * Setup complete test data suite
 * Creates: projects, collections, documents, users, API keys
 */
export async function setupTestData() {
  console.log("📦 Setting up test data...");

  try {
    // Reset first (with retry logic)
    let retries = 3;
    while (retries > 0) {
      try {
        await resetTestData();
        break;
      } catch (error) {
        if (error.message.includes("Too many login attempts") && retries > 1) {
          console.log(
            `   ⏳ Rate limited during reset, waiting 5 seconds before retry (${
              retries - 1
            } retries left)...`
          );
          await new Promise((resolve) => setTimeout(resolve, 5000));
          retries--;
        } else {
          throw error;
        }
      }
    }

    // Create test projects
    const project1 = await createTestProject("TEST_PROJECT_1");
    const project2 = await createTestProject("TEST_PROJECT_2");
    const project3 = await createTestProject("TEST_PROJECT_3");

    // Create collections in project 1
    const collection1 = await createTestCollection(
      project1.id,
      "test_collection_1"
    );
    const collection2 = await createTestCollection(
      project1.id,
      "test_collection_2"
    );

    // Create documents in collections
    // Use collection name from response or fallback to requested name
    const collection1Name = collection1?.name || "test_collection_1";
    const collection2Name = collection2?.name || "test_collection_2";
    await createTestDocuments(project1.id, collection1Name, 10);
    await createTestDocuments(project1.id, collection2Name, 5);

    // Create users
    await createTestUser(project1.id, "testuser1@example.com");
    await createTestUser(project1.id, "testuser2@example.com");

    // API keys are not required for UI tests - they are tested separately in api-keys-ui.tests.js
    // API key creation via the frontend API route should work (it uses backend SDK),
    // but if it fails, it's not critical for other UI tests
    // Skip API key creation in test data setup to avoid unnecessary warnings
    // UI tests that need API keys will create them as needed during the test

    console.log("✅ Test data setup complete");
    console.log(`   Projects: ${TEST_DATA.projects.length}`);
    console.log(`   Collections: ${TEST_DATA.collections.length}`);
    console.log(`   Documents: ${TEST_DATA.documents.length}`);
    console.log(`   Users: ${TEST_DATA.users.length}`);
    console.log(`   API Keys: ${TEST_DATA.apiKeys.length}`);

    return {
      projects: TEST_DATA.projects,
      collections: TEST_DATA.collections,
      documents: TEST_DATA.documents,
      users: TEST_DATA.users,
      apiKeys: TEST_DATA.apiKeys,
    };
  } catch (error) {
    console.error(`❌ Failed to setup test data: ${error.message}`);
    throw error;
  }
}

/**
 * Get test data (for use in tests)
 */
export function getTestData() {
  return {
    projects: TEST_DATA.projects,
    collections: TEST_DATA.collections,
    documents: TEST_DATA.documents,
    users: TEST_DATA.users,
    apiKeys: TEST_DATA.apiKeys,
  };
}

/**
 * Get first test project
 */
export function getFirstTestProject() {
  return TEST_DATA.projects[0] || null;
}

/**
 * Get first test collection for a project
 */
export function getFirstTestCollection(projectId) {
  const collection = TEST_DATA.collections.find(
    (c) => c.projectId === projectId
  );
  return collection ? collection.collection : null;
}

