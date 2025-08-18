/**
 * Complete CMS Functionality Test Suite
 *
 * Tests EVERY aspect of KRAPI as a complete CMS solution
 */

import TestFramework from "../utils/test-framework.js";
import DatabaseHelper from "../utils/database-helper.js";
import CONFIG from "../config.js";
import axios from "axios";

class CompleteCMSTests extends TestFramework {
  constructor() {
    super();
    this.adminToken = null;
    this.projectUserToken = null;
    this.testProject = null;
    this.testUser = null;
    this.testCollection = null;
    this.testDocuments = [];
    this.testFiles = [];
    this.testApiKey = null;
  }

  async runAll() {
    return this.describe("🏢 Complete CMS Functionality Suite", async () => {
      // Phase 0: Database Reset & Setup
      await this.test("🔄 Database Reset & Seeding", async () => {
        const resetResult = await DatabaseHelper.fullReset();

        this.assertTrue(resetResult.success, "Database reset should succeed");
        this.assertExists(resetResult.adminToken, "Should return admin token");

        // Store the admin token for subsequent tests
        this.adminToken = resetResult.adminToken;
      });

      // Phase 1: Verify Authentication Setup
      await this.test("🔐 Verify Admin Authentication", async () => {
        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/auth/login`,
          {
            username: CONFIG.ADMIN_CREDENTIALS.username,
            password: CONFIG.ADMIN_CREDENTIALS.password,
          }
        );

        this.assertHttpSuccess(response, "Admin login should succeed");
        this.assertExists(
          response.data,
          "session_token",
          "Should return session token"
        );

        // Update the admin token from login if reset didn't provide one
        if (!this.adminToken && response.data.session_token) {
          this.adminToken = response.data.session_token;
        }

        // Verify we have a valid token
        this.assertExists(
          this.adminToken,
          "Should have admin token from reset or login"
        );
      });

      // Phase 2: Project Management
      await this.test("🏗️ Create Test Project", async () => {
        const projectData = {
          name: `Test CMS Project ${Date.now()}`,
          description: "Comprehensive test project for all CMS functionality",
          settings: {
            enable_api: true,
            enable_email: true,
            enable_storage: true,
            max_file_size: 10485760, // 10MB
            allowed_file_types: [
              "image/jpeg",
              "image/png",
              "application/pdf",
              "text/plain",
            ],
          },
        };

        // Ensure we have an admin token
        if (!this.adminToken) {
          throw new Error("No admin token available for authenticated request");
        }

        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/projects`,
          projectData,
          {
            headers: {
              Authorization: `Bearer ${this.adminToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        this.assertHttpSuccess(response, "Project creation should succeed");
        this.assertExists(response.data, "id", "Project should have ID");
        this.assertExists(
          response.data,
          "api_key",
          "Project should have API key"
        );
        this.testProject = response.data;
      });

      // Phase 3: Collections Schema Design
      await this.test("📊 Create Complex Collection Schema", async () => {
        const collectionData = {
          name: "products",
          description: "E-commerce product catalog with complex relationships",
          fields: [
            {
              name: "name",
              type: "text",
              required: true,
              unique: false,
              indexed: true,
              validation: { min_length: 3, max_length: 100 },
            },
            {
              name: "slug",
              type: "text",
              required: true,
              unique: true,
              indexed: true,
              validation: { pattern: "^[a-z0-9-]+$" },
            },
            {
              name: "description",
              type: "text",
              required: false,
              validation: { max_length: 1000 },
            },
            {
              name: "price",
              type: "number",
              required: true,
              validation: { min: 0, max: 999999.99 },
            },
            {
              name: "category_id",
              type: "text",
              required: true,
              indexed: true,
            },
            {
              name: "tags",
              type: "array",
              required: false,
              default: [],
            },
            {
              name: "images",
              type: "array",
              required: false,
              default: [],
            },
            {
              name: "stock_quantity",
              type: "integer",
              required: true,
              default: 0,
            },
            {
              name: "is_active",
              type: "boolean",
              required: true,
              default: true,
              indexed: true,
            },
            {
              name: "metadata",
              type: "object",
              required: false,
              default: {},
            },
            {
              name: "created_at",
              type: "timestamp",
              required: true,
              default: "now()",
            },
            {
              name: "updated_at",
              type: "timestamp",
              required: true,
              default: "now()",
            },
          ],
          indexes: [
            {
              name: "idx_products_active_price",
              fields: ["is_active", "price"],
              unique: false,
            },
            {
              name: "idx_products_category_active",
              fields: ["category_id", "is_active"],
              unique: false,
            },
          ],
        };

        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections`,
          collectionData,
          {
            headers: {
              Authorization: `Bearer ${this.adminToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        this.assertHttpSuccess(response, "Collection creation should succeed");
        this.assertExists(response.data, "name", "Collection should have name");
        this.assertExists(
          response.data,
          "fields",
          "Collection should have fields"
        );
        this.testCollection = response.data;
      });

      // Phase 4: Project User Management
      await this.test("👤 Create Project User with Permissions", async () => {
        const userData = {
          username: `testuser_${Date.now()}`,
          email: `test_${Date.now()}@example.com`,
          password: "TestPassword123!",
          first_name: "Test",
          last_name: "User",
          role: "editor",
          permissions: [
            "collections:read",
            "collections:write",
            "documents:read",
            "documents:write",
            "files:read",
            "files:write",
          ],
          metadata: {
            department: "Testing",
            access_level: "standard",
          },
        };

        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/users`,
          userData,
          {
            headers: { Authorization: `Bearer ${this.adminToken}` },
          }
        );

        this.assertHttpSuccess(response, "User creation should succeed");
        this.assertExists(response.data, "id", "User should have ID");
        this.assertEqual(
          response.data.role,
          "editor",
          "User should have correct role"
        );
        this.testUser = response.data;
      });

      // Phase 5: Project User Authentication
      await this.test("🔑 Project User Authentication", async () => {
        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/auth/project-login`,
          {
            project_id: this.testProject.id,
            username: this.testUser.username,
            password: "TestPassword123!",
          }
        );

        this.assertHttpSuccess(response, "Project user login should succeed");
        this.assertExists(
          response.data,
          "session_token",
          "Should return session token"
        );
        this.projectUserToken = response.data.session_token;
      });

      // Phase 6: Document CRUD Operations
      await this.test("📄 Create Complex Documents", async () => {
        const products = [
          {
            data: {
              name: "Premium Laptop",
              slug: "premium-laptop-001",
              description: "High-performance laptop for professionals",
              price: 1299.99,
              category_id: "electronics",
              tags: ["laptop", "premium", "business"],
              stock_quantity: 50,
              is_active: true,
              metadata: {
                brand: "TechCorp",
                model: "Pro-X1",
                warranty: "2 years",
              },
            },
            created_by: this.testUser.id,
          },
          {
            data: {
              name: "Wireless Mouse",
              slug: "wireless-mouse-002",
              description: "Ergonomic wireless mouse with precision tracking",
              price: 49.99,
              category_id: "accessories",
              tags: ["mouse", "wireless", "ergonomic"],
              stock_quantity: 200,
              is_active: true,
              metadata: {
                brand: "TechCorp",
                model: "Ergo-M2",
                warranty: "1 year",
              },
            },
            created_by: this.testUser.id,
          },
        ];

        for (const product of products) {
          const response = await axios.post(
            `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
            product,
            {
              headers: { Authorization: `Bearer ${this.projectUserToken}` },
            }
          );

          this.assertHttpSuccess(response, "Document creation should succeed");
          this.assertExists(response.data, "id", "Document should have ID");
          this.assertExists(response.data, "data", "Document should have data");
          this.testDocuments.push(response.data);
        }

        this.assertEqual(
          this.testDocuments.length,
          2,
          "Should create 2 documents"
        );
      });

      // Phase 7: Advanced Document Queries
      await this.test("🔍 Advanced Document Querying", async () => {
        // Test filtering
        const filterResponse = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
          {
            params: {
              filter: JSON.stringify({ "data.category_id": "electronics" }),
              limit: 10,
            },
            headers: { Authorization: `Bearer ${this.projectUserToken}` },
          }
        );

        this.assertHttpSuccess(filterResponse, "Filtered query should succeed");
        this.assertTrue(
          filterResponse.data.length >= 1,
          "Should find electronics products"
        );

        // Test search
        const searchResponse = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/search`,
          {
            text: "laptop",
            fields: ["data.name", "data.description"],
            limit: 10,
          },
          {
            headers: { Authorization: `Bearer ${this.projectUserToken}` },
          }
        );

        this.assertHttpSuccess(searchResponse, "Search query should succeed");
        this.assertTrue(
          searchResponse.data.length >= 1,
          "Should find laptop products"
        );
      });

      // Phase 8: File Storage Operations
      await this.test("📁 File Upload & Management", async () => {
        // Create test file data (simulating a small image)
        const fileContent =
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

        const formData = new FormData();
        const blob = new Blob([atob(fileContent.split(",")[1])], {
          type: "image/png",
        });
        formData.append("file", blob, "test-image.png");
        formData.append("folder", "products");
        formData.append(
          "metadata",
          JSON.stringify({
            purpose: "product_image",
            alt_text: "Test product image",
          })
        );

        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/storage/upload`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${this.projectUserToken}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );

        this.assertHttpSuccess(response, "File upload should succeed");
        this.assertExists(response.data, "id", "File should have ID");
        this.assertExists(response.data, "url", "File should have URL");
        this.testFiles.push(response.data);
      });

      // Phase 9: Document-File Relationships
      await this.test("🔗 Link Files to Documents", async () => {
        if (this.testFiles.length > 0 && this.testDocuments.length > 0) {
          const documentUpdate = {
            data: {
              ...this.testDocuments[0].data,
              images: [this.testFiles[0].id],
            },
            updated_by: this.testUser.id,
          };

          const response = await axios.put(
            `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/${this.testDocuments[0].id}`,
            documentUpdate,
            {
              headers: { Authorization: `Bearer ${this.projectUserToken}` },
            }
          );

          this.assertHttpSuccess(
            response,
            "Document update with file should succeed"
          );
          this.assertTrue(
            response.data.data.images.includes(this.testFiles[0].id),
            "Document should include file ID"
          );
        }
      });

      // Phase 10: API Key Management & Testing
      await this.test("🔑 API Key Creation & Usage", async () => {
        // Create API key
        const keyData = {
          name: "Test API Key",
          scopes: ["documents:read", "documents:write", "files:read"],
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        };

        const keyResponse = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/api-keys`,
          keyData,
          {
            headers: { Authorization: `Bearer ${this.adminToken}` },
          }
        );

        this.assertHttpSuccess(keyResponse, "API key creation should succeed");
        this.assertExists(keyResponse.data, "key", "Should return API key");
        this.testApiKey = keyResponse.data.key;

        // Test API key usage
        const apiResponse = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
          {
            headers: {
              "X-API-Key": this.testApiKey,
            },
          }
        );

        this.assertHttpSuccess(apiResponse, "API key request should succeed");
        this.assertTrue(
          apiResponse.data.length >= 0,
          "Should return documents"
        );
      });

      // Phase 11: Email System Testing
      await this.test("📧 Email Template & Sending", async () => {
        // Create email template
        const templateData = {
          name: "Welcome Email",
          subject: "Welcome to {{project_name}}!",
          body: `
            <h1>Welcome {{user_name}}!</h1>
            <p>You've been added to the project: {{project_name}}</p>
            <p>Your role: {{user_role}}</p>
            <p>Get started by exploring your dashboard.</p>
          `,
          variables: ["project_name", "user_name", "user_role"],
          type: "welcome",
        };

        const templateResponse = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/email/templates`,
          templateData,
          {
            headers: { Authorization: `Bearer ${this.adminToken}` },
          }
        );

        this.assertHttpSuccess(
          templateResponse,
          "Email template creation should succeed"
        );
        this.assertExists(
          templateResponse.data,
          "id",
          "Template should have ID"
        );

        // Test email sending (mock/test mode)
        const emailData = {
          to: this.testUser.email,
          template_id: templateResponse.data.id,
          template_variables: {
            project_name: this.testProject.name,
            user_name: `${this.testUser.first_name} ${this.testUser.last_name}`,
            user_role: this.testUser.role,
          },
        };

        const sendResponse = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/email/send`,
          emailData,
          {
            headers: { Authorization: `Bearer ${this.adminToken}` },
          }
        );

        this.assertHttpSuccess(sendResponse, "Email sending should succeed");
        this.assertExists(
          sendResponse.data,
          "message_id",
          "Should return message ID"
        );
      });

      // Phase 12: Permission & Security Testing
      await this.test("🛡️ Security & Permission Validation", async () => {
        // Test: Project user tries to access admin functions (should fail)
        try {
          await axios.get(`${CONFIG.FRONTEND_URL}/api/admin/users`, {
            headers: { Authorization: `Bearer ${this.projectUserToken}` },
          });
          throw new Error("Should have been denied admin access");
        } catch (error) {
          this.assertEqual(
            error.response?.status,
            403,
            "Should deny admin access to project user"
          );
        }

        // Test: Project user can access allowed resources
        const response = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections`,
          {
            headers: { Authorization: `Bearer ${this.projectUserToken}` },
          }
        );

        this.assertHttpSuccess(
          response,
          "Project user should access collections"
        );
      });

      // Phase 13: Performance & Data Integrity
      await this.test("⚡ Bulk Operations & Performance", async () => {
        // Create multiple documents in bulk
        const bulkDocuments = Array.from({ length: 10 }, (_, i) => ({
          data: {
            name: `Bulk Product ${i + 1}`,
            slug: `bulk-product-${i + 1}`,
            description: `Bulk created product number ${i + 1}`,
            price: Math.round((Math.random() * 100 + 10) * 100) / 100,
            category_id: "bulk",
            stock_quantity: Math.floor(Math.random() * 100),
            is_active: true,
          },
          created_by: this.testUser.id,
        }));

        const bulkResponse = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/bulk`,
          { documents: bulkDocuments },
          {
            headers: { Authorization: `Bearer ${this.projectUserToken}` },
          }
        );

        this.assertHttpSuccess(bulkResponse, "Bulk creation should succeed");
        this.assertExists(
          bulkResponse.data,
          "created",
          "Should return created documents"
        );
        this.assertTrue(
          bulkResponse.data.created.length === 10,
          "Should create all 10 documents"
        );

        // Verify no duplicate IDs
        const allIds = bulkResponse.data.created.map((doc) => doc.id);
        const uniqueIds = [...new Set(allIds)];
        this.assertEqual(
          allIds.length,
          uniqueIds.length,
          "All document IDs should be unique"
        );
      });

      // Phase 14: Advanced Analytics & Aggregations
      await this.test("📊 Document Aggregations & Analytics", async () => {
        const aggregationQuery = {
          group_by: ["data.category_id"],
          aggregations: {
            count: { type: "count" },
            avg_price: { type: "avg", field: "data.price" },
            total_stock: { type: "sum", field: "data.stock_quantity" },
            min_price: { type: "min", field: "data.price" },
            max_price: { type: "max", field: "data.price" },
          },
          filters: { "data.is_active": true },
        };

        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/aggregate`,
          aggregationQuery,
          {
            headers: { Authorization: `Bearer ${this.projectUserToken}` },
          }
        );

        this.assertHttpSuccess(response, "Aggregation query should succeed");
        this.assertExists(
          response.data,
          "groups",
          "Should return grouped results"
        );
        this.assertExists(
          response.data,
          "total_groups",
          "Should return total groups count"
        );
      });

      // Phase 15: Health & System Diagnostics
      await this.test("🏥 System Health & Auto-Repair", async () => {
        // Check system health
        const healthResponse = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/health`,
          {
            headers: { Authorization: `Bearer ${this.adminToken}` },
          }
        );

        this.assertHttpSuccess(healthResponse, "Health check should succeed");
        this.assertExists(
          healthResponse.data,
          "healthy",
          "Should return health status"
        );

        // Run diagnostics
        const diagnosticsResponse = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/health/diagnostics`,
          {},
          {
            headers: { Authorization: `Bearer ${this.adminToken}` },
          }
        );

        this.assertHttpSuccess(
          diagnosticsResponse,
          "Diagnostics should succeed"
        );
        this.assertExists(
          diagnosticsResponse.data,
          "tests",
          "Should return test results"
        );
      });

      // Phase 16: Cleanup & Resource Management
      await this.test("🧹 Cleanup & Resource Management", async () => {
        // Delete test documents
        for (const doc of this.testDocuments) {
          const response = await axios.delete(
            `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/${doc.id}`,
            {
              headers: { Authorization: `Bearer ${this.projectUserToken}` },
            }
          );
          this.assertHttpSuccess(response, "Document deletion should succeed");
        }

        // Delete test files
        for (const file of this.testFiles) {
          const response = await axios.delete(
            `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/storage/files/${file.id}`,
            {
              headers: { Authorization: `Bearer ${this.projectUserToken}` },
            }
          );
          this.assertHttpSuccess(response, "File deletion should succeed");
        }

        // Verify cleanup
        const documentsResponse = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
          {
            headers: { Authorization: `Bearer ${this.projectUserToken}` },
          }
        );

        this.assertHttpSuccess(
          documentsResponse,
          "Should retrieve remaining documents"
        );
        // Note: Some documents might remain from bulk creation, which is expected
      });
    });
  }
}

export default CompleteCMSTests;
