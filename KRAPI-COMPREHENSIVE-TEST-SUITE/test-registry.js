/**
 * Test Registry
 * 
 * Maps test chunk names to their functions and dependencies.
 * Used for selective test execution and conditional initialization.
 */

// Import all test functions
import { runAuthTests } from "./tests/auth.tests.js";
import { runSDKClientTests } from "./tests/sdk-client.tests.js";
import { runSDKIntegrationTests } from "./tests/sdk-integration.tests.js";
import { runProjectTests } from "./tests/projects.tests.js";
import { runCollectionTests } from "./tests/collections.tests.js";
import { runDocumentTests } from "./tests/documents.tests.js";
import { runStorageTests } from "./tests/storage.tests.js";
import { runEmailTests } from "./tests/email.tests.js";
import { runApiKeyTests } from "./tests/api-keys.tests.js";
import { runUserTests } from "./tests/users.tests.js";
import { runActivityLoggingTests } from "./tests/activity.tests.js";
import { runMetadataTests } from "./tests/metadata.tests.js";
import { runPerformanceTests } from "./tests/performance.tests.js";
import { runQueueTests } from "./tests/queue.tests.js";
import { runSDKApiTests } from "./tests/sdk-api.tests.js";
import { runHealthManagementTests } from "./tests/health.tests.js";
import { runMCPServerTests } from "./tests/mcp.tests.js";
import { runAdminTests } from "./tests/admin.tests.js";
import { runChangelogTests } from "./tests/changelog.tests.js";
import { runBackupTests } from "./tests/backup.tests.js";
import { runCMSIntegrationTests } from "./tests/cms-integration.tests.js";
import { runCorsTests } from "./tests/cors.tests.js";

/**
 * Test Registry
 * 
 * Each entry contains:
 * - name: Test chunk identifier (used in --only and --skip)
 * - displayName: Human-readable name
 * - function: The test function to run
 * - dependencies: Other test chunks that must run first (e.g., 'auth' needs to run before most tests)
 * - requiresProject: Whether this test needs a test project to be created
 * - requiresCollection: Whether this test needs a test collection to be created
 */
export const TEST_REGISTRY = {
  auth: {
    name: "auth",
    displayName: "Authentication Tests",
    function: runAuthTests,
    dependencies: [], // No dependencies - runs first
    requiresProject: false,
    requiresCollection: false,
  },
  projects: {
    name: "projects",
    displayName: "Project Management Tests",
    function: runProjectTests,
    dependencies: ["auth"], // Needs auth to create projects
    requiresProject: false, // Creates its own test project
    requiresCollection: false,
  },
  "sdk-client": {
    name: "sdk-client",
    displayName: "SDK Client Tests",
    function: runSDKClientTests,
    dependencies: ["auth", "projects"], // Needs auth and project
    requiresProject: true,
    requiresCollection: false,
  },
  "sdk-integration": {
    name: "sdk-integration",
    displayName: "SDK Integration Tests",
    function: runSDKIntegrationTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  collections: {
    name: "collections",
    displayName: "Collection Management Tests",
    function: runCollectionTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false, // Creates its own collection
  },
  documents: {
    name: "documents",
    displayName: "Document CRUD Tests",
    function: runDocumentTests,
    dependencies: ["auth", "projects", "collections"],
    requiresProject: true,
    requiresCollection: true,
  },
  storage: {
    name: "storage",
    displayName: "Storage Tests",
    function: runStorageTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  email: {
    name: "email",
    displayName: "Email Tests",
    function: runEmailTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  "api-keys": {
    name: "api-keys",
    displayName: "API Key Tests",
    function: runApiKeyTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  users: {
    name: "users",
    displayName: "User Management Tests",
    function: runUserTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  activity: {
    name: "activity",
    displayName: "Activity Logging Tests",
    function: runActivityLoggingTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  metadata: {
    name: "metadata",
    displayName: "Metadata Management Tests",
    function: runMetadataTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  performance: {
    name: "performance",
    displayName: "Performance Monitoring Tests",
    function: runPerformanceTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  queue: {
    name: "queue",
    displayName: "Database Queue Tests",
    function: runQueueTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  "sdk-api": {
    name: "sdk-api",
    displayName: "SDK API Endpoint Tests",
    function: runSDKApiTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  health: {
    name: "health",
    displayName: "Health Management Tests",
    function: runHealthManagementTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  mcp: {
    name: "mcp",
    displayName: "MCP Server Tests",
    function: runMCPServerTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  admin: {
    name: "admin",
    displayName: "Admin Tests",
    function: runAdminTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  changelog: {
    name: "changelog",
    displayName: "Changelog Tests",
    function: runChangelogTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  backup: {
    name: "backup",
    displayName: "Backup Tests",
    function: runBackupTests,
    dependencies: ["auth", "projects"],
    requiresProject: true,
    requiresCollection: false,
  },
  "cms-integration": {
    name: "cms-integration",
    displayName: "CMS Integration Tests",
    function: runCMSIntegrationTests,
    dependencies: ["auth", "projects", "collections", "documents"],
    requiresProject: true,
    requiresCollection: true,
  },
  cors: {
    name: "cors",
    displayName: "CORS Security Tests",
    function: runCorsTests,
    dependencies: ["auth"], // Needs auth to test authenticated endpoints
    requiresProject: false,
    requiresCollection: false,
  },
};

/**
 * Get all test names
 */
export function getAllTestNames() {
  return Object.keys(TEST_REGISTRY);
}

/**
 * Get test by name
 */
export function getTest(name) {
  return TEST_REGISTRY[name];
}

/**
 * Resolve test dependencies
 * Returns an array of test names in execution order (dependencies first)
 */
export function resolveTestDependencies(testNames) {
  const resolved = [];
  const visited = new Set();
  
  function visit(testName) {
    if (visited.has(testName)) {
      return;
    }
    
    const test = TEST_REGISTRY[testName];
    if (!test) {
      throw new Error(`Unknown test: ${testName}`);
    }
    
    // Visit dependencies first
    for (const dep of test.dependencies) {
      if (testNames.includes(dep) || resolved.includes(dep)) {
        visit(dep);
      }
    }
    
    visited.add(testName);
    resolved.push(testName);
  }
  
  // Visit all requested tests
  for (const testName of testNames) {
    visit(testName);
  }
  
  return resolved;
}

/**
 * Get initialization requirements for a set of tests
 */
export function getInitializationRequirements(testNames) {
  const requirements = {
    requiresAuth: false,
    requiresProject: false,
    requiresCollection: false,
  };
  
  for (const testName of testNames) {
    const test = TEST_REGISTRY[testName];
    if (!test) continue;
    
    if (test.requiresProject) {
      requirements.requiresProject = true;
    }
    if (test.requiresCollection) {
      requirements.requiresCollection = true;
    }
    // Auth is always required if any test needs it
    if (test.dependencies.includes("auth") || testName === "auth") {
      requirements.requiresAuth = true;
    }
  }
  
  return requirements;
}


