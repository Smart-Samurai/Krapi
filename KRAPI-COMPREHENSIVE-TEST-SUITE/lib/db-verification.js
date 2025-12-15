/**
 * Database Verification Utility
 * Verifies data exists in the database before testing frontend access
 * Uses SDK for all operations
 */

import { loginAsAdmin as sdkLogin, getSDK, initializeSDK } from "./sdk-client.js";

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
 * Verify projects exist in database
 * @param {number} minCount - Minimum number of projects expected
 * @returns {Promise<{exists: boolean, count: number, projects: Array}>}
 */
export async function verifyProjectsExist(minCount = 1) {
  try {
    await loginAsAdmin(); // Initialize SDK and login
    const krapi = getSDK();
    
    const projects = await krapi.projects.getAll();
    const count = Array.isArray(projects) ? projects.length : 0;
    
    return {
      exists: count >= minCount,
      count,
      projects: projects,
    };
  } catch (error) {
    return {
      exists: false,
      count: 0,
      projects: [],
      error: error.message,
    };
  }
}

/**
 * Verify collections exist for a project
 * @param {string} projectId - Project ID
 * @param {number} minCount - Minimum number of collections expected
 * @returns {Promise<{exists: boolean, count: number, collections: Array}>}
 */
export async function verifyCollectionsExist(projectId, minCount = 1) {
  try {
    await loginAsAdmin(); // Initialize SDK and login
    const krapi = getSDK();
    
    const collections = await krapi.collections.getAll(projectId);
    const count = Array.isArray(collections) ? collections.length : 0;
    
    return {
      exists: count >= minCount,
      count,
      collections: collections,
    };
  } catch (error) {
    return {
      exists: false,
      count: 0,
      collections: [],
      error: error.message,
    };
  }
}

/**
 * Verify documents exist for a collection
 * @param {string} projectId - Project ID
 * @param {string} collectionName - Collection name
 * @param {number} minCount - Minimum number of documents expected
 * @returns {Promise<{exists: boolean, count: number, documents: Array}>}
 */
export async function verifyDocumentsExist(projectId, collectionName, minCount = 1) {
  try {
    await loginAsAdmin(); // Initialize SDK and login
    const krapi = getSDK();
    
    const documents = await krapi.documents.getAll(projectId, collectionName);
    const count = Array.isArray(documents) ? documents.length : 0;
    
    return {
      exists: count >= minCount,
      count,
      documents: documents,
    };
  } catch (error) {
    return {
      exists: false,
      count: 0,
      documents: [],
      error: error.message,
    };
  }
}

/**
 * Get first available project from database
 * @returns {Promise<{project: Object|null, error: string|null}>}
 */
export async function getFirstProject() {
  try {
    const verification = await verifyProjectsExist(1);
    if (verification.exists && verification.projects.length > 0) {
      return {
        project: verification.projects[0],
        error: null,
      };
    }
    return {
      project: null,
      error: `No projects found. Expected at least 1, found ${verification.count}`,
    };
  } catch (error) {
    return {
      project: null,
      error: error.message,
    };
  }
}

/**
 * Get first available collection for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<{collection: Object|null, error: string|null}>}
 */
export async function getFirstCollection(projectId) {
  try {
    const verification = await verifyCollectionsExist(projectId, 1);
    if (verification.exists && verification.collections.length > 0) {
      return {
        collection: verification.collections[0],
        error: null,
      };
    }
    return {
      collection: null,
      error: `No collections found for project ${projectId}. Expected at least 1, found ${verification.count}`,
    };
  } catch (error) {
    return {
      collection: null,
      error: error.message,
    };
  }
}


