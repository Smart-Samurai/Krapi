/**
 * Frontend UI Test Data Setup
 *
 * Provides functions to reset the database and create test data
 * for frontend UI tests. Uses SDK to create data (SDK-first architecture).
 */

import { CONFIG } from "../../config.js";

/**
 * Setup test data with full database reset
 * This performs a complete database reset (deletes ALL data) before setting up test data.
 * Use this for a completely fresh database state.
 */
export async function setupTestDataWithReset() {
  // First, do a full database reset (deletes ALL data)
  try {
    await resetDatabase();
  } catch (error) {
    console.log(
      `⚠️  Full database reset failed: ${error.message}. Falling back to test data reset...`
    );
    // Fallback to lighter reset if full reset fails
    await resetTestData();
  }

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
 * Uses direct HTTP call to frontend API
 */
async function loginAsAdmin() {
  try {
    const response = await fetch(
      `${CONFIG.FRONTEND_URL}/api/krapi/k1/auth/admin/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: CONFIG.ADMIN_CREDENTIALS.username,
          password: CONFIG.ADMIN_CREDENTIALS.password,
        }),
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Login failed" }));
      throw new Error(error.error || `Login failed: ${response.status}`);
    }

    const result = await response.json();
    // Response format: { success: true, data: { session_token, user, expires_at, scopes } }
    if (result.success && result.data && result.data.session_token) {
      return result.data.session_token;
    } else if (result.success && result.session_token) {
      // Fallback for flat response format
      return result.session_token;
    } else {
      throw new Error(result.error || "No session token in response");
    }
  } catch (error) {
    throw new Error(`Failed to login as admin: ${error.message}`);
  }
}

/**
 * Make authenticated API call
 */
async function apiCall(endpoint, method = "GET", body = null, sessionToken) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (sessionToken) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${CONFIG.FRONTEND_URL}${endpoint}`, options);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(error.error || `API call failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Reset entire database (hard reset)
 * Deletes ALL data including projects, admin users, sessions, API keys, etc.
 * This ensures a completely fresh database state for tests.
 */
export async function resetDatabase() {
  console.log("🗑️  Performing full database reset...");

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

    // Call the database reset endpoint
    const response = await apiCall(
      "/api/krapi/k1/system/reset-database",
      "POST",
      null,
      sessionToken
    );

    if (response.success && response.data) {
      console.log("✅ Full database reset complete");
      console.log(
        `   - Deleted Projects: ${response.data.deletedProjects || 0}`
      );
      console.log(
        `   - Deleted Admin Users: ${response.data.deletedAdminUsers || 0}`
      );
      console.log(
        `   - Deleted Sessions: ${response.data.deletedSessions || 0}`
      );
      console.log("   - Default admin reset to: admin / admin123");

      // Clear test data arrays
      TEST_DATA.projects = [];
      TEST_DATA.collections = [];
      TEST_DATA.documents = [];
      TEST_DATA.users = [];
      TEST_DATA.apiKeys = [];

      return response.data;
    } else {
      throw new Error(response.error || "Database reset failed");
    }
  } catch (error) {
    console.error(`❌ Failed to reset database: ${error.message}`);
    throw error;
  }
}

/**
 * Reset database by deleting all test data
 * Also attempts to delete all projects for a truly fresh start
 * NOTE: This is a lighter reset - use resetDatabase() for full reset
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

    // Get all projects
    const projectsResponse = await apiCall(
      "/api/krapi/k1/projects",
      "GET",
      null,
      sessionToken
    );
    const projects =
      projectsResponse.success && projectsResponse.data
        ? projectsResponse.data
        : [];
    console.log(`   Found ${projects.length} project(s) to delete...`);

    // Delete ALL projects for a fresh database
    for (const project of projects) {
      try {
        await apiCall(
          `/api/krapi/k1/projects/${project.id}`,
          "DELETE",
          null,
          sessionToken
        );
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
    const sessionToken = await loginAsAdmin();

    // Check if project with same name already exists and delete it
    try {
      const projectsResponse = await apiCall(
        "/api/krapi/k1/projects",
        "GET",
        null,
        sessionToken
      );
      const projects =
        projectsResponse.success && projectsResponse.data
          ? projectsResponse.data
          : [];

      const existingProject = projects.find((p) => p.name === projectName);
      if (existingProject) {
        console.log(
          `   ⚠️  Project "${projectName}" already exists, deleting it first...`
        );
        try {
          await apiCall(
            `/api/krapi/k1/projects/${existingProject.id}`,
            "DELETE",
            null,
            sessionToken
          );
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

    const response = await apiCall(
      "/api/krapi/k1/projects",
      "POST",
      {
        name: projectName,
        description: `Test project for UI testing - ${new Date().toISOString()}`,
      },
      sessionToken
    );

    const project =
      response.success && response.data ? response.data : response;
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
    const sessionToken = await loginAsAdmin();

    const response = await apiCall(
      `/api/krapi/k1/projects/${projectId}/collections`,
      "POST",
      {
        name: requestedName,
        fields: [
          { name: "name", type: "string", required: true },
          { name: "age", type: "number", required: false },
          { name: "email", type: "string", required: true },
          { name: "active", type: "boolean", required: false },
        ],
      },
      sessionToken
    );

    const collection =
      response.success && response.data ? response.data : response;
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
    const sessionToken = await loginAsAdmin();

    for (let i = 0; i < count; i++) {
      const response = await apiCall(
        `/api/krapi/k1/projects/${projectId}/collections/${collectionName}/documents`,
        "POST",
        {
          data: {
            name: `Test User ${i + 1}`,
            age: 20 + i,
            email: `testuser${i + 1}@example.com`,
            active: i % 2 === 0,
          },
        },
        sessionToken
      );

      const document =
        response.success && response.data ? response.data : response;
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
    const sessionToken = await loginAsAdmin();

    // Extract username from email (before @)
    const username = userEmail.split("@")[0];
    
    const response = await apiCall(
      `/api/krapi/k1/projects/${projectId}/users`,
      "POST",
      {
        username: username,
        email: userEmail,
        name: "Test User",
        scopes: ["read", "write"],
      },
      sessionToken
    );

    const user = response.success && response.data ? response.data : response;
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
    const sessionToken = await loginAsAdmin();

    const response = await apiCall(
      `/api/krapi/k1/projects/${projectId}/api-keys`,
      "POST",
      {
        name: name,
        scopes: ["read", "write"],
      },
      sessionToken
    );

    const apiKey = response.success && response.data ? response.data : response;
    TEST_DATA.apiKeys.push({ projectId, apiKey });
    console.log(
      `   ✅ Created test API key: ${apiKey.name} in project ${projectId}`
    );

    return apiKey;
  } catch (error) {
    throw new Error(`Failed to create test API key: ${error.message}`);
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

    // Create API keys (optional - skip if it fails)
    try {
      await createTestApiKey(project1.id, "Test Read Key");
    } catch (error) {
      console.log(`   ⚠️  Skipping API key creation: ${error.message}`);
    }
    try {
      await createTestApiKey(project1.id, "Test Write Key");
    } catch (error) {
      console.log(`   ⚠️  Skipping API key creation: ${error.message}`);
    }

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
