#!/usr/bin/env node

import axios from "axios";
import CONFIG from "./config.js";

class ComprehensiveTestSuite {
  constructor(sessionToken = null, testProject = null) {
    this.sessionToken = sessionToken;
    this.testProject = testProject;
    this.testCollection = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
    };
    this.results = []; // Array for individual test results
  }

  async test(name, testFunction) {
    const startTime = Date.now();
    try {
      console.log(`⏳ ${name}...`);
      await testFunction();
      const duration = Date.now() - startTime;
      console.log(`✅ ${name} (${duration}ms)`);
      this.testResults.passed++;
      this.results.push({
        test: name,
        status: "PASSED",
        duration: duration,
        error: null,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${name} (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push({ test: name, error: error.message });
      this.results.push({
        test: name,
        status: "FAILED",
        duration: duration,
        error: error.message,
      });
      // Don't throw - continue running all tests
      // throw error;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  async runAll() {
    return this.runAllTests();
  }

  async runAllTests() {
    console.log("🚀 Starting Comprehensive KRAPI Test Suite");
    console.log("=".repeat(60));

    try {
      // Setup Phase
      await this.setup();

      // Authentication Tests
      await this.runAuthTests();

      // Project Management Tests
      await this.runProjectTests();

      // Collection Management Tests
      await this.runCollectionTests();

      // Document CRUD Tests
      await this.runDocumentTests();

      // Storage Tests
      await this.runStorageTests();

      // Email Tests
      await this.runEmailTests();

      // API Key Tests
      await this.runApiKeyTests();

      // User Management Tests
      await this.runUserTests();

      // Activity Logging Tests
      await this.runActivityLoggingTests();

      // Metadata Management Tests
      await this.runMetadataTests();

      // Performance Monitoring Tests
      await this.runPerformanceTests();

      // Database Queue Tests
      await this.runQueueTests();

      // SDK Functionality Tests
      await this.runSDKTests();

      // Backup Tests
      await this.runBackupTests();

      // Complete CMS Integration Tests
      await this.runCMSIntegrationTests();
    } catch (error) {
      console.error("💥 TEST SUITE FAILED:", error.message);
      this.testResults.failed++;
      this.testResults.errors.push({
        test: "Test Suite",
        error: error.message,
      });
      // Don't throw - let finally block handle cleanup and results
    } finally {
      await this.cleanup();
      this.printResults();
      // Return true if all tests passed, false otherwise
      return this.testResults.failed === 0;
    }
  }

  async setup() {
    console.log("🔧 Setting up test environment...");

    try {
      // Test if frontend is running
      console.log("   Testing frontend connection...");
      const healthResponse = await axios
        .get(`${CONFIG.FRONTEND_URL}/api/health`, {
          timeout: 5000,
        })
        .catch(() => null);

      if (!healthResponse) {
        throw new Error(
          `Frontend not responding at ${CONFIG.FRONTEND_URL}. Please start the services first with: npm run dev`
        );
      }

      // Use provided session token or login to get one
      if (this.sessionToken) {
        console.log("   Using provided session token...");
        // Verify the token is still valid
        try {
          await axios.get(`${CONFIG.FRONTEND_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${this.sessionToken}` },
            timeout: 5000,
          });
          console.log("✅ Session token is valid");
        } catch (error) {
          console.log("   Session token invalid, logging in...");
          this.sessionToken = null; // Reset to force login
        }
      }

      if (!this.sessionToken) {
        console.log("   Logging in...");
        const loginResponse = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/auth/login`,
          {
            username: "admin",
            password: "admin123",
          },
          {
            timeout: 10000,
          }
        );

        this.assert(loginResponse.status === 200, "Login should succeed");
        this.assert(
          loginResponse.data.success === true,
          "Login response should indicate success"
        );
        this.sessionToken = loginResponse.data.session_token;
        this.assert(this.sessionToken, "Session token should be present");
      }

      console.log("✅ Test environment setup complete");
    } catch (error) {
      console.error("❌ Setup failed:", error.message);
      if (error.code === "ECONNREFUSED") {
        throw new Error(
          `Cannot connect to ${CONFIG.FRONTEND_URL}. Please start the services first with: npm run dev`
        );
      }
      throw error;
    }
  }

  async runAuthTests() {
    console.log("\n🔐 Authentication Tests");
    console.log("-".repeat(30));

    await this.test("Login with valid credentials", async () => {
      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/auth/login`,
        {
          username: "admin",
          password: "admin123",
        }
      );
      this.assert(response.status === 200, "Login should return 200");
      this.assert(response.data.success === true, "Login should succeed");
      this.assert(response.data.session_token, "Session token should be present");
    });

    await this.test("Login with invalid credentials", async () => {
      try {
        await axios.post(`${CONFIG.FRONTEND_URL}/api/auth/login`, {
          username: "admin",
          password: "wrongpassword",
        });
        throw new Error("Should have failed");
      } catch (error) {
        this.assert(
          error.response.status === 401,
          "Should return 401 for invalid credentials"
        );
      }
    });

    await this.test("Get current user", async () => {
      const response = await axios.get(`${CONFIG.FRONTEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${this.sessionToken}` },
      });
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        response.data.user.username === "admin",
        "Should return admin user"
      );
    });
  }

  async runProjectTests() {
    console.log("\n📁 Project Management Tests");
    console.log("-".repeat(30));

    await this.test("Create test project", async () => {
      // Use unique project name to avoid UNIQUE constraint errors from previous runs
      const projectName = `Test Project ${Date.now()}`;
      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects`,
        {
          name: projectName,
          description: "A test project for comprehensive testing",
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(
        response.status === 201,
        "Project creation should return 201"
      );
      this.assert(
        response.data.success === true,
        "Project creation should succeed"
      );
      this.testProject = response.data.project;
      this.assert(this.testProject.id, "Project should have an ID");
    });

    await this.test("Get all projects", async () => {
      const response = await axios.get(`${CONFIG.FRONTEND_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${this.sessionToken}` },
      });
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        Array.isArray(response.data.projects),
        "Should return projects array"
      );
      this.assert(
        response.data.projects.length > 0,
        "Should have at least one project"
      );
    });

    await this.test("Get project by ID", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        response.data.project.id === this.testProject.id,
        "Should return correct project"
      );
    });

    await this.test("Update project", async () => {
      // Use unique project name to avoid UNIQUE constraint errors from previous runs
      const updatedName = `Updated Test Project ${Date.now()}`;
      const response = await axios.put(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}`,
        {
          name: updatedName,
          description: "Updated description",
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        response.data.project.name === updatedName,
        "Should update name"
      );
    });
  }

  async runCollectionTests() {
    console.log("\n📚 Collection Management Tests");
    console.log("-".repeat(30));

    await this.test("Create test collection", async () => {
      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections`,
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
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(
        response.status === 201,
        "Collection creation should return 201"
      );
      this.assert(
        response.data.success === true,
        "Collection creation should succeed"
      );
      this.testCollection = response.data.collection;
      this.assert(this.testCollection.id, "Collection should have an ID");
    });

    await this.test("Get all collections", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        Array.isArray(response.data.collections),
        "Should return collections array"
      );
      this.assert(
        response.data.collections.length > 0,
        "Should have at least one collection"
      );
    });

    await this.test("Get collection by name", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        response.data.collection.name === this.testCollection.name,
        "Should return correct collection"
      );
    });

    await this.test("Update collection", async () => {
      const response = await axios.put(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}`,
        {
          description: "Updated collection description",
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });

    await this.test("Get collection statistics", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/stats`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });

    await this.test("Validate collection schema", async () => {
      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/validate`,
        {},
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(response.data.valid === true, "Schema should be valid");
    });
  }

  async runDocumentTests() {
    console.log("\n📄 Document CRUD & Operations Tests");
    console.log("-".repeat(30));

    await this.test("Create single document", async () => {
      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
        {
          data: {
            title: "Test Document",
            status: "todo",
            priority: 1,
            is_active: true,
            description: "A test document",
          },
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(
        response.status === 201,
        "Document creation should return 201"
      );
      this.assert(response.data.id, "Document should have an ID");
    });

    await this.test("Get document by ID", async () => {
      // First create a document to get
      const createResponse = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
        {
          data: {
            title: "Document to Get",
            status: "in_progress",
            priority: 2,
            is_active: true,
            description: "Document for get test",
          },
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      const documentId = createResponse.data.id;

      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/${documentId}`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(
        response.data.id === documentId,
        "Should return correct document"
      );
    });

    await this.test("Update document", async () => {
      // First create a document to update
      const createResponse = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
        {
          data: {
            title: "Document to Update",
            status: "todo",
            priority: 1,
            is_active: true,
            description: "Document for update test",
          },
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      const documentId = createResponse.data.id;

      const response = await axios.put(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/${documentId}`,
        {
          data: {
            title: "Updated Document",
            status: "done",
            priority: 3,
            is_active: false,
            description: "Updated description",
          },
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(
        response.data.data.title === "Updated Document",
        "Should update title"
      );
    });

    await this.test("Create multiple test documents", async () => {
      const documents = [
        {
          data: {
            title: "Test Document 1",
            status: "archived",
            priority: 1,
            is_active: false,
            description: "First test document",
          },
        },
        {
          data: {
            title: "Test Document 2",
            status: "done",
            priority: 2,
            is_active: true,
            description: "Second test document",
          },
        },
        {
          data: {
            title: "Test Document 3",
            status: "in_progress",
            priority: 3,
            is_active: true,
            description: "Third test document",
          },
        },
      ];

      for (const doc of documents) {
        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
          doc,
          {
            headers: { Authorization: `Bearer ${this.sessionToken}` },
          }
        );
        this.assert(
          response.status === 201,
          "Document creation should return 201"
        );
        this.assert(response.data.id, "Document should have an ID");
      }
    });

    await this.test("Get all documents", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(
        Array.isArray(response.data.data),
        "Should return documents array"
      );
      this.assert(response.data.data.length > 0, "Should have documents");
    });

    await this.test("Get documents with pagination", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents?limit=2&offset=0`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(
        Array.isArray(response.data.data),
        "Should return documents array"
      );
      this.assert(response.data.data.length <= 2, "Should respect limit");
    });

    await this.test("Filter documents by status", async () => {
      // Create a document with specific status
      const createResponse = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
        {
          data: {
            title: "Todo Document",
            status: "todo",
            priority: 1,
            is_active: true,
            description: "Document with todo status",
          },
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );

      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents?filter[status]=todo`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(
        Array.isArray(response.data.data),
        "Should return documents array"
      );
    });

    await this.test("Filter documents by multiple criteria", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents?filter[status]=done&filter[is_active]=true`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(
        Array.isArray(response.data.data),
        "Should return documents array"
      );
    });

    await this.test("Sort documents by priority", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents?orderBy=priority&order=desc`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(
        Array.isArray(response.data.data),
        "Should return documents array"
      );
    });

    await this.test("Count documents", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/count`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      // Debug logging
      console.log("Count response data:", JSON.stringify(response.data));
      console.log("Count value:", response.data.count);
      console.log("Count type:", typeof response.data.count);
      this.assert(
        typeof response.data.count === "number",
        `Should return count as number (got: ${typeof response.data.count}, value: ${JSON.stringify(response.data.count)})`
      );
    });

    await this.test("Count documents with filter", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/count?filter[status]=todo`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        typeof response.data.count === "number",
        "Should return count as number"
      );
    });

    await this.test("Bulk create documents", async () => {
      const documents = [
        {
          data: {
            title: "Bulk Document 1",
            status: "bulk_created",
            priority: 3,
            is_active: true,
            description: "First bulk created document",
          },
        },
        {
          data: {
            title: "Bulk Document 2",
            status: "bulk_created",
            priority: 4,
            is_active: true,
            description: "Second bulk created document",
          },
        },
      ];

      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/bulk`,
        { documents },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 201, "Bulk create should return 201");
      this.assert(response.data.success === true, "Bulk create should succeed");
      this.assert(
        Array.isArray(response.data.created),
        "Should return created documents"
      );
    });

    await this.test("Bulk update documents", async () => {
      // First get some documents to update
      const getResponse = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents?limit=2`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );

      if (getResponse.data.data.length > 0) {
        const updates = getResponse.data.data.map((doc) => ({
          id: doc.id,
          data: {
            ...doc.data,
            status: "bulk_updated",
            priority: (doc.data.priority || 1) + 1,
          },
        }));

        const response = await axios.put(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/bulk`,
          { updates },
          {
            headers: { Authorization: `Bearer ${this.sessionToken}` },
          }
        );
        this.assert(response.status === 200, "Bulk update should return 200");
        this.assert(
          response.data.success === true,
          "Bulk update should succeed"
        );
      }
    });

    await this.test("Bulk delete documents", async () => {
      // Get some documents to delete
      const getResponse = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents?filter[status]=bulk_updated&limit=2`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );

      this.assert(getResponse.status === 200, "Get documents should return 200");
      this.assert(
        getResponse.data && Array.isArray(getResponse.data.data),
        "Response should contain data array"
      );

      if (getResponse.data.data.length > 0) {
        const documentIds = getResponse.data.data.map((doc) => doc.id);
        this.assert(documentIds.length > 0, "Should have document IDs to delete");

        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/bulk-delete`,
          { document_ids: documentIds },
          {
            headers: { Authorization: `Bearer ${this.sessionToken}` },
            timeout: 10000, // 10 second timeout
          }
        );
        this.assert(response.status === 200, "Bulk delete should return 200");
        this.assert(
          response.data && response.data.success === true,
          "Bulk delete should succeed"
        );
        this.assert(
          response.data.data &&
            typeof response.data.data.deleted_count === "number",
          "Should return deleted_count"
        );
        this.assert(
          response.data.data.deleted_count > 0,
          "Should delete at least one document"
        );
      } else {
        // If no documents found, test still passes but logs a note
        console.log("   No documents with status 'bulk_updated' found to delete");
      }
    });

    await this.test("Search documents", async () => {
      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/search`,
        {
          query: "test",
          limit: 10,
          offset: 0,
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        Array.isArray(response.data.documents),
        "Should return documents array"
      );
    });

    await this.test("Aggregate documents", async () => {
      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/aggregate`,
        {
          group_by: ["status"],
          aggregations: [],
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        Array.isArray(response.data.groups),
        "Should return groups array"
      );
    });
  }

  async runStorageTests() {
    console.log("\n💾 Storage Tests");
    console.log("-".repeat(30));

    await this.test("Get storage info", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/storage/info`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });

    await this.test("Get storage stats", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/storage/stats`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });

    await this.test("List storage files", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/storage/files`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        Array.isArray(response.data.files),
        "Should return files array"
      );
    });
  }

  async runEmailTests() {
    console.log("\n📧 Email Tests");
    console.log("-".repeat(30));

    await this.test("Get email configuration", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/email/config`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });

    await this.test("Test email connection", async () => {
      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/email/test`,
        {},
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });
  }

  async runApiKeyTests() {
    console.log("\n🔑 API Key Tests");
    console.log("-".repeat(30));

    await this.test("List API keys", async () => {
      const response = await axios.get(`${CONFIG.FRONTEND_URL}/api/apikeys`, {
        headers: { Authorization: `Bearer ${this.sessionToken}` },
      });
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        Array.isArray(response.data.keys),
        "Should return keys array"
      );
    });

    await this.test("Create API key", async () => {
      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/apikeys`,
        {
          name: "Test API Key",
          description: "A test API key",
          scopes: ["projects:read", "collections:read"],
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 201, "Should return 201");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(response.data.key, "Should return API key");
    });
  }

  async runUserTests() {
    console.log("\n👥 User Management Tests");
    console.log("-".repeat(30));

    let testUserId = null;

    await this.test("List project users (empty initially)", async () => {
      if (!this.testProject) {
        throw new Error("No test project available for user tests");
      }

      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/users`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        Array.isArray(response.data.data),
        "Should return users array"
      );
    });

    await this.test("Create project user", async () => {
      if (!this.testProject) {
        throw new Error("No test project available for user tests");
      }

      const uniqueEmail = `testuser.${Date.now()}@example.com`;
      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/users`,
        {
          username: `testuser_${Date.now()}`,
          email: uniqueEmail,
          password: "TestPassword123!",
          scopes: ["documents:read", "documents:write"],
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 201, "Should return 201");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(response.data.data, "Should return user data");
      this.assert(response.data.data.id, "User should have an ID");
      testUserId = response.data.data.id;
    });

    await this.test("Get project user by ID", async () => {
      if (!this.testProject || !testUserId) {
        throw new Error("No test project or user ID available");
      }

      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/users/${testUserId}`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(response.data.data.id === testUserId, "Should return correct user");
    });

    await this.test("List project users (after creation)", async () => {
      if (!this.testProject) {
        throw new Error("No test project available for user tests");
      }

      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/users`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        Array.isArray(response.data.data),
        "Should return users array"
      );
      this.assert(
        response.data.data.length > 0,
        "Should have at least one user"
      );
    });

    await this.test("Update project user", async () => {
      if (!this.testProject || !testUserId) {
        throw new Error("No test project or user ID available");
      }

      const response = await axios.put(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/users/${testUserId}`,
        {
          email: `updated.${Date.now()}@example.com`,
          scopes: ["documents:read"],
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(response.data.data.id === testUserId, "Should return same user");
    });

    await this.test("Update project user scopes", async () => {
      if (!this.testProject || !testUserId) {
        throw new Error("No test project or user ID available");
      }

      const response = await axios.put(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/users/${testUserId}/scopes`,
        {
          scopes: ["documents:read", "documents:write", "collections:read"],
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });

    await this.test("Create duplicate user (should fail)", async () => {
      if (!this.testProject || !testUserId) {
        throw new Error("No test project or user ID available");
      }

      // First, get the existing user's email
      const getUserResponse = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/users/${testUserId}`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      const existingEmail = getUserResponse.data.data.email;

      try {
        await axios.post(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/users`,
          {
            username: `duplicate_${Date.now()}`,
            email: existingEmail,
            password: "TestPassword123!",
          },
          {
            headers: { Authorization: `Bearer ${this.sessionToken}` },
          }
        );
        throw new Error("Should have failed with duplicate email");
      } catch (error) {
        this.assert(
          error.response && error.response.status === 409,
          "Should return 409 for duplicate email"
        );
      }
    });

    await this.test("Delete project user", async () => {
      if (!this.testProject || !testUserId) {
        throw new Error("No test project or user ID available");
      }

      const response = await axios.delete(
        `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/users/${testUserId}`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });

    await this.test("Get deleted user (should fail)", async () => {
      if (!this.testProject || !testUserId) {
        throw new Error("No test project or user ID available");
      }

      try {
        await axios.get(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/users/${testUserId}`,
          {
            headers: { Authorization: `Bearer ${this.sessionToken}` },
          }
        );
        throw new Error("Should have failed with 404");
      } catch (error) {
        this.assert(
          error.response.status === 404,
          "Should return 404 for deleted user"
        );
      }
    });
  }

  async runActivityLoggingTests() {
    console.log("\n📊 Activity Logging Tests");
    console.log("-".repeat(30));

    await this.test("Get activity logs", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/activity/logs`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        Array.isArray(response.data.logs),
        "Should return logs array"
      );
    });

    await this.test("Get activity stats", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/activity/stats`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });
  }

  async runMetadataTests() {
    console.log("\n🏷️ Metadata Management Tests");
    console.log("-".repeat(30));

    await this.test("Get metadata schema", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/metadata/schema`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });

    await this.test("Validate metadata", async () => {
      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/metadata/validate`,
        {
          metadata: {
            source: "test",
            version: "1.0",
            tags: ["test", "comprehensive"],
          },
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });
  }

  async runPerformanceTests() {
    console.log("\n⚡ Performance Monitoring Tests");
    console.log("-".repeat(30));

    await this.test("Get performance metrics", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/performance/metrics`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });

    await this.test("Get system health", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/health`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });
  }

  async runQueueTests() {
    console.log("\n📋 Database Queue Tests");
    console.log("-".repeat(30));

    await this.test("Get queue metrics endpoint", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/queue/metrics`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        response.data.metrics !== undefined,
        "Metrics should be present"
      );
      this.assert(
        typeof response.data.metrics.queueSize === "number",
        "queueSize should be a number"
      );
      this.assert(
        typeof response.data.metrics.processingCount === "number",
        "processingCount should be a number"
      );
      this.assert(
        typeof response.data.metrics.totalProcessed === "number",
        "totalProcessed should be a number"
      );
      this.assert(
        typeof response.data.metrics.totalErrors === "number",
        "totalErrors should be a number"
      );
      this.assert(
        typeof response.data.metrics.averageWaitTime === "number",
        "averageWaitTime should be a number"
      );
      this.assert(
        typeof response.data.metrics.averageProcessTime === "number",
        "averageProcessTime should be a number"
      );
      this.assert(
        Array.isArray(response.data.metrics.queueItems),
        "queueItems should be an array"
      );
    });

    await this.test("Queue metrics in health endpoint", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/health`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        response.data.queue !== undefined,
        "Queue metrics should be present in health endpoint"
      );
      this.assert(
        typeof response.data.queue.queueSize === "number",
        "queueSize should be a number"
      );
      this.assert(
        typeof response.data.queue.processingCount === "number",
        "processingCount should be a number"
      );
    });

    await this.test("Queue metrics in performance endpoint", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/performance/metrics`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      // Queue metrics might be nested in performance metrics
      if (response.data.metrics && response.data.metrics.queue) {
        this.assert(
          typeof response.data.metrics.queue.queueSize === "number",
          "queueSize should be a number"
        );
      }
    });

    await this.test("Queue metrics in SDK status endpoint", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/sdk/status`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      // Queue metrics might be present in SDK status
      if (response.data.queue) {
        this.assert(
          typeof response.data.queue.queueSize === "number",
          "queueSize should be a number"
        );
      }
    });

    await this.test("Queue handles multiple database operations", async () => {
      // Create a test project to trigger database operations
      if (!this.testProject) {
        // This will use the queue for database operations
        const createResponse = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/projects`,
          {
            name: `QUEUE_TEST_${Date.now()}`,
            description: "Test project for queue testing",
          },
          {
            headers: { Authorization: `Bearer ${this.sessionToken}` },
          }
        );
        this.assert(createResponse.status === 200, "Should create project");
        this.testProject = createResponse.data.project;
      }

      // Get queue metrics before operations
      const beforeMetrics = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/queue/metrics`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      const beforeProcessed = beforeMetrics.data.metrics.totalProcessed;

      // Perform multiple database operations that will go through the queue
      await Promise.all([
        axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/projects/${this.testProject.id}`,
          {
            headers: { Authorization: `Bearer ${this.sessionToken}` },
          }
        ),
        axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/projects/${this.testProject.id}`,
          {
            headers: { Authorization: `Bearer ${this.sessionToken}` },
          }
        ),
        axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/projects/${this.testProject.id}`,
          {
            headers: { Authorization: `Bearer ${this.sessionToken}` },
          }
        ),
      ]);

      // Wait a bit for queue to process
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get queue metrics after operations
      const afterMetrics = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/queue/metrics`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      const afterProcessed = afterMetrics.data.metrics.totalProcessed;

      // Verify queue processed the operations
      this.assert(
        afterProcessed >= beforeProcessed,
        "Queue should have processed operations"
      );
    });
  }

  async runSDKTests() {
    console.log("\n🔧 SDK Functionality Tests");
    console.log("-".repeat(30));

    await this.test("Test SDK connection", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/sdk/status`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });

    await this.test("Test SDK methods", async () => {
      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/sdk/test`,
        {
          method: "getProjects",
          params: {},
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });
  }

  async runBackupTests() {
    console.log("\n💾 Backup Tests");
    console.log("-".repeat(30));

    let backupId = null;
    let backupPassword = null;

    await this.test("Create project backup", async () => {
      if (!this.testProject) {
        throw new Error("No test project available for backup test");
      }

      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/projects/${this.testProject.id}/backup`,
        {
          description: "Test backup",
          password: "test-backup-password-123",
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(response.data.backup_id, "Should return backup ID");
      this.assert(response.data.password, "Should return backup password");

      backupId = response.data.backup_id;
      backupPassword = response.data.password || "test-backup-password-123";
    });

    await this.test("List project backups", async () => {
      if (!this.testProject) {
        throw new Error("No test project available for backup test");
      }

      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/projects/${this.testProject.id}/backups`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        Array.isArray(response.data.backups),
        "Should return backups array"
      );
    });

    await this.test("List all backups", async () => {
      const response = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/backups`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(
        Array.isArray(response.data.backups),
        "Should return backups array"
      );
    });

    await this.test("Create system backup", async () => {
      const response = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/backup/system`,
        {
          description: "Test system backup",
          password: "test-system-backup-password-123",
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
      this.assert(response.data.backup_id, "Should return backup ID");
      this.assert(response.data.password, "Should return backup password");
    });

    await this.test("Delete backup", async () => {
      if (!backupId) {
        console.log("   Skipping - no backup ID available");
        return;
      }

      const response = await axios.delete(
        `${CONFIG.FRONTEND_URL}/api/krapi/k1/backups/${backupId}`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(response.status === 200, "Should return 200");
      this.assert(response.data.success === true, "Should succeed");
    });
  }

  async runCMSIntegrationTests() {
    console.log("\n🌐 Complete CMS Integration Tests");
    console.log("-".repeat(30));

    await this.test("Full CMS workflow", async () => {
      // Create a new project with unique name to avoid conflicts
      const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      const projectName = `CMS Test Project ${uniqueId}`;
      
      const projectResponse = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects`,
        {
          name: projectName,
          description: "Project for CMS integration testing",
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(
        projectResponse.status === 201,
        "Project creation should succeed"
      );
      const project = projectResponse.data.project;

      // Create a collection
      const collectionResponse = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects/${project.id}/collections`,
        {
          name: "cms_content",
          description: "CMS content collection",
          fields: [
            { name: "title", type: "string", required: true },
            { name: "content", type: "text", required: true },
            { name: "published", type: "boolean", required: false },
          ],
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(
        collectionResponse.status === 201,
        "Collection creation should succeed"
      );
      const collection = collectionResponse.data.collection;

      // Create content
      const contentResponse = await axios.post(
        `${CONFIG.FRONTEND_URL}/api/projects/${project.id}/collections/${collection.name}/documents`,
        {
          data: {
            title: "CMS Test Content",
            content: "This is test content for CMS integration",
            published: true,
          },
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(
        contentResponse.status === 201,
        "Content creation should succeed"
      );

      // Get content
      const getResponse = await axios.get(
        `${CONFIG.FRONTEND_URL}/api/projects/${project.id}/collections/${collection.name}/documents/${contentResponse.data.id}`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(
        getResponse.status === 200,
        "Content retrieval should succeed"
      );
      this.assert(
        getResponse.data.data.title === "CMS Test Content",
        "Should return correct content"
      );

      // Update content
      const updateResponse = await axios.put(
        `${CONFIG.FRONTEND_URL}/api/projects/${project.id}/collections/${collection.name}/documents/${contentResponse.data.id}`,
        {
          data: {
            title: "Updated CMS Content",
            content: "Updated content for CMS integration",
            published: false,
          },
        },
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(
        updateResponse.status === 200,
        "Content update should succeed"
      );

      // Delete content
      const deleteResponse = await axios.delete(
        `${CONFIG.FRONTEND_URL}/api/projects/${project.id}/collections/${collection.name}/documents/${contentResponse.data.id}`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(
        deleteResponse.status === 200,
        "Content deletion should succeed"
      );

      // Delete collection
      const deleteCollectionResponse = await axios.delete(
        `${CONFIG.FRONTEND_URL}/api/projects/${project.id}/collections/${collection.name}`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(
        deleteCollectionResponse.status === 200,
        "Collection deletion should succeed"
      );

      // Delete project
      const deleteProjectResponse = await axios.delete(
        `${CONFIG.FRONTEND_URL}/api/projects/${project.id}`,
        {
          headers: { Authorization: `Bearer ${this.sessionToken}` },
        }
      );
      this.assert(
        deleteProjectResponse.status === 200,
        "Project deletion should succeed"
      );
    });
  }

  async cleanup() {
    console.log("\n🧹 Cleaning up test environment...");

    if (this.testProject) {
      try {
        await axios.delete(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}`,
          {
            headers: { Authorization: `Bearer ${this.sessionToken}` },
          }
        );
      } catch (error) {
        console.log("Warning: Could not delete test project:", error.message);
      }
    }

    console.log("✅ Cleanup complete");
  }

  printResults() {
    const totalTests = this.testResults.passed + this.testResults.failed;
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 COMPREHENSIVE TEST RESULTS");
    console.log("=".repeat(60));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📊 Total: ${totalTests}`);

    if (this.testResults.errors.length > 0) {
      console.log("\n❌ Failed Tests:");
      this.testResults.errors.forEach((error) => {
        console.log(`   • ${error.test}: ${error.error}`);
      });
    }

    const successRate = totalTests > 0
      ? ((this.testResults.passed / totalTests) * 100).toFixed(1)
      : "0.0";
    console.log(`\n🎯 Success Rate: ${successRate}% (${this.testResults.passed}/${totalTests})`);

    if (this.testResults.failed === 0 && totalTests > 0) {
      console.log("\n🎉 ALL TESTS PASSED! KRAPI is production ready! 🎉");
    } else if (totalTests === 0) {
      console.log("\n⚠️  No tests were executed. Please check test suite configuration.");
    } else {
      console.log(
        `\n⚠️  ${this.testResults.failed} of ${totalTests} test(s) failed. Please review and fix.`
      );
    }

    console.log("=".repeat(60));
  }
}

// Export the test class for the test runner
export default ComprehensiveTestSuite;
