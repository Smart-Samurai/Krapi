/**
 * API Keys Management Tests
 */

import TestFramework from "../utils/test-framework.js";
import CONFIG from "../config.js";
import axios from "axios";

class ApiKeysTests extends TestFramework {
  constructor(sessionToken, testProject) {
    super();
    this.sessionToken = sessionToken;
    this.testProject = testProject;
    this.createdApiKeys = [];
  }

  async runAll() {
    return this.describe("🔑 API Keys Management", async () => {
      // Test 1: Create API Key
      await this.test("Create API Key", async () => {
        const apiKeyData = {
          name: "Test API Key",
          description: "API key for testing purposes",
          permissions: ["projects:read", "collections:read"],
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          project_id: this.testProject.id,
        };

        const response = await axios.post(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/apikeys`,
          apiKeyData,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        this.assertHttpSuccess(response, "API key creation should succeed");
        this.assertExists(
          response.data,
          "key_id",
          "Response should contain key ID"
        );
        this.assertExists(
          response.data,
          "key",
          "Response should contain the actual key"
        );

        this.createdApiKeys.push({
          id: response.data.key_id,
          key: response.data.key,
        });
      });

      // Test 2: List API Keys
      await this.test("List API Keys", async () => {
        const response = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/apikeys`,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
            },
            params: { project_id: this.testProject.id },
          }
        );

        this.assertHttpSuccess(response, "API keys listing should succeed");
        this.assertExists(
          response.data,
          "keys",
          "Response should contain keys array"
        );
      });

      // Test 3: Get API Key Details
      await this.test("Get API Key Details", async () => {
        if (this.createdApiKeys.length === 0) {
          throw new Error("No API keys available for details test");
        }

        const apiKey = this.createdApiKeys[0];
        const response = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/apikeys/${apiKey.id}`,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
            },
          }
        );

        this.assertHttpSuccess(
          response,
          "API key details retrieval should succeed"
        );
        this.assertExists(
          response.data,
          "key_id",
          "Response should contain key ID"
        );
      });

      // Test 4: Test API Key Authentication
      await this.test("Test API Key Authentication", async () => {
        if (this.createdApiKeys.length === 0) {
          throw new Error("No API keys available for authentication test");
        }

        const apiKey = this.createdApiKeys[0];

        const response = await axios.get(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/projects/${this.testProject.id}`,
          {
            headers: {
              "X-API-Key": apiKey.key,
            },
          }
        );

        this.assertHttpSuccess(
          response,
          "API key authentication should succeed"
        );
      });

      // Test 5: Delete API Key
      await this.test("Delete API Key", async () => {
        if (this.createdApiKeys.length === 0) {
          throw new Error("No API keys available for deletion test");
        }

        const apiKey = this.createdApiKeys.pop();
        const response = await axios.delete(
          `${CONFIG.FRONTEND_URL}/api/krapi/k1/apikeys/${apiKey.id}`,
          {
            headers: {
              Authorization: `Bearer ${this.sessionToken}`,
            },
          }
        );

        this.assertHttpSuccess(response, "API key deletion should succeed");
      });
    });
  }

  getCreatedApiKeys() {
    return this.createdApiKeys;
  }
}

export default ApiKeysTests;
