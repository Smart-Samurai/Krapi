/**
 * Test Utilities
 * 
 * Created: 2025-12-06
 * Last Updated: 2025-12-06
 * 
 * Utility functions for test suite to improve code reuse and consistency.
 */

/**
 * Generate unique identifier for test data
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique identifier
 */
export function generateUniqueId(prefix = "test") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate unique username for test users
 * @returns {string} Unique username
 */
export function generateUniqueUsername() {
  return generateUniqueId("user");
}

/**
 * Generate unique email for test users
 * @param {string} username - Optional username to use in email
 * @returns {string} Unique email address
 */
export function generateUniqueEmail(username = null) {
  const user = username || generateUniqueId("user");
  return `${user}@test.com`;
}

/**
 * Generate unique collection name
 * @returns {string} Unique collection name
 */
export function generateUniqueCollectionName() {
  return generateUniqueId("collection");
}

/**
 * Wait for database writes to sync (for SQLite WAL mode)
 * @param {number} ms - Milliseconds to wait (default: 100)
 * @returns {Promise<void>}
 */
export function waitForDatabaseSync(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create test user with proper cleanup
 * @param {Object} testSuite - Test suite instance
 * @param {string} projectId - Project ID
 * @param {Object} userData - User data (username, email, password, etc.)
 * @returns {Promise<Object>} Created user and cleanup function
 */
export async function createTestUser(testSuite, projectId, userData = {}) {
  if (typeof testSuite.krapi.users?.create !== "function") {
    throw new Error("krapi.users.create method not available");
  }

  const username = userData.username || generateUniqueUsername();
  const email = userData.email || generateUniqueEmail(username);
  const password = userData.password || "TestUser123!";

  const user = await testSuite.krapi.users.create(projectId, {
    username,
    email,
    password,
    role: userData.role || "user",
    permissions: userData.permissions || ["documents:read"],
    ...userData,
  });

  // Return user and cleanup function
  return {
    user,
    cleanup: async () => {
      if (user && user.id && typeof testSuite.krapi.users?.delete === "function") {
        try {
          await testSuite.krapi.users.delete(projectId, user.id);
        } catch (error) {
          console.log(`   Note: Failed to cleanup test user ${user.id}: ${error.message}`);
        }
      }
    },
  };
}

/**
 * Create test project with proper cleanup
 * @param {Object} testSuite - Test suite instance
 * @param {Object} projectData - Project data (name, description, etc.)
 * @returns {Promise<Object>} Created project and cleanup function
 */
export async function createTestProject(testSuite, projectData = {}) {
  if (typeof testSuite.krapi.projects?.create !== "function") {
    throw new Error("krapi.projects.create method not available");
  }

  const name = projectData.name || generateUniqueId("project");
  const description = projectData.description || "Test project";

  const project = await testSuite.krapi.projects.create({
    name,
    description,
    ...projectData,
  });

  // Return project and cleanup function
  return {
    project,
    cleanup: async () => {
      if (project && project.id && typeof testSuite.krapi.projects?.delete === "function") {
        try {
          await testSuite.krapi.projects.delete(project.id);
        } catch (error) {
          console.log(`   Note: Failed to cleanup test project ${project.id}: ${error.message}`);
        }
      }
    },
  };
}

/**
 * Create test collection with proper cleanup
 * @param {Object} testSuite - Test suite instance
 * @param {string} projectId - Project ID
 * @param {Object} collectionData - Collection data (name, description, etc.)
 * @returns {Promise<Object>} Created collection and cleanup function
 */
export async function createTestCollection(testSuite, projectId, collectionData = {}) {
  if (typeof testSuite.krapi.collections?.create !== "function") {
    throw new Error("krapi.collections.create method not available");
  }

  const name = collectionData.name || generateUniqueCollectionName();
  const description = collectionData.description || "Test collection";

  const collection = await testSuite.krapi.collections.create(projectId, {
    name,
    description,
    ...collectionData,
  });

  // Return collection and cleanup function
  return {
    collection,
    cleanup: async () => {
      if (collection && (collection.id || collection.name) && typeof testSuite.krapi.collections?.delete === "function") {
        try {
          await testSuite.krapi.collections.delete(projectId, collection.name || collection.id);
        } catch (error) {
          console.log(`   Note: Failed to cleanup test collection ${collection.name || collection.id}: ${error.message}`);
        }
      }
    },
  };
}

/**
 * Create test admin user with proper cleanup
 * @param {Object} testSuite - Test suite instance
 * @param {Object} adminData - Admin user data (username, email, password, etc.)
 * @returns {Promise<Object>} Created admin user and cleanup function
 */
export async function createTestAdminUser(testSuite, adminData = {}) {
  if (typeof testSuite.krapi.admin?.createUser !== "function") {
    throw new Error("krapi.admin.createUser method not available");
  }

  const username = adminData.username || generateUniqueUsername();
  const email = adminData.email || generateUniqueEmail(username);
  const password = adminData.password || "TestAdmin123!";

  const admin = await testSuite.krapi.admin.createUser({
    username,
    email,
    password,
    role: adminData.role || "admin",
    access_level: adminData.access_level || "full",
    permissions: adminData.permissions || ["admin:read", "admin:write"],
    active: adminData.active !== undefined ? adminData.active : true,
    ...adminData,
  });

  // Return admin and cleanup function
  return {
    admin,
    cleanup: async () => {
      if (admin && admin.id && typeof testSuite.krapi.admin?.deleteUser === "function") {
        try {
          await testSuite.krapi.admin.deleteUser(admin.id);
        } catch (error) {
          console.log(`   Note: Failed to cleanup test admin user ${admin.id}: ${error.message}`);
        }
      }
    },
  };
}

/**
 * Cleanup test data (users, projects, collections, etc.)
 * @param {Array} cleanupFunctions - Array of cleanup functions to execute
 * @returns {Promise<void>}
 */
export async function cleanupTestData(cleanupFunctions) {
  if (!Array.isArray(cleanupFunctions)) {
    return;
  }

  for (const cleanup of cleanupFunctions) {
    if (typeof cleanup === "function") {
      try {
        await cleanup();
      } catch (error) {
        console.log(`   Note: Cleanup function failed: ${error.message}`);
      }
    }
  }
}

/**
 * Retry operation with exponential backoff
 * @param {Function} operation - Operation to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} initialDelay - Initial delay in ms (default: 100)
 * @returns {Promise<any>} Operation result
 */
export async function retryOperation(operation, maxRetries = 3, initialDelay = 100) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await waitForDatabaseSync(delay);
      }
    }
  }
  
  throw lastError;
}

