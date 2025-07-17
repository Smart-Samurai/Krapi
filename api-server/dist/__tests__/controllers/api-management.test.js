"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const api_management_1 = require("../../controllers/api-management");
const database_1 = __importDefault(require("../../services/database"));
const auth_1 = require("../../middleware/auth");
// Mock the database service
jest.mock("../../services/database");
const mockDatabase = database_1.default;
// Mock the auth middleware
jest.mock("../../middleware/auth");
const mockAuthMiddleware = auth_1.authMiddleware;
// Create test Express app
const createTestApp = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Mock auth middleware to always authenticate as admin
    app.use((req, res, next) => {
        req.user = {
            userId: 1,
            username: "testadmin",
            role: "admin",
            permissions: ["read", "write", "admin"],
        };
        next();
    });
    // API Management routes
    app.get("/api/stats", api_management_1.ApiManagementController.getApiStats);
    app.get("/api/keys", api_management_1.ApiManagementController.getApiKeys);
    app.post("/api/keys", api_management_1.ApiManagementController.createApiKey);
    app.put("/api/keys/:id", api_management_1.ApiManagementController.updateApiKey);
    app.patch("/api/keys/:id/toggle", api_management_1.ApiManagementController.toggleApiKey);
    app.delete("/api/keys/:id", api_management_1.ApiManagementController.deleteApiKey);
    app.get("/api/endpoints", api_management_1.ApiManagementController.getApiEndpoints);
    app.get("/api/rate-limits", api_management_1.ApiManagementController.getRateLimits);
    return app;
};
describe("ApiManagementController", () => {
    let app;
    beforeEach(() => {
        app = createTestApp();
        jest.clearAllMocks();
    });
    describe("GET /api/stats", () => {
        it("should return API statistics successfully", async () => {
            const mockStats = {
                total_requests: 12543,
                requests_today: 234,
                avg_response_time: 145,
                error_rate: 2.3,
                active_keys: 5,
                blocked_requests: 12,
                bandwidth_used: "45.2MB",
                top_endpoints: [
                    { path: "/api/auth/login", method: "POST", requests: 1234 },
                    { path: "/api/content", method: "GET", requests: 891 },
                ],
            };
            mockDatabase.getApiKeys.mockReturnValue([
                { id: "1", active: true },
                { id: "2", active: true },
                { id: "3", active: false },
            ]);
            const response = await (0, supertest_1.default)(app).get("/api/stats").expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                active_keys: 2, // 2 active keys from mock data
                total_requests: expect.any(Number),
                requests_today: expect.any(Number),
            });
        });
        it("should handle database errors gracefully", async () => {
            mockDatabase.getApiKeys.mockImplementation(() => {
                throw new Error("Database connection failed");
            });
            const response = await (0, supertest_1.default)(app).get("/api/stats").expect(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Failed to fetch API statistics");
        });
    });
    describe("GET /api/keys", () => {
        it("should return all API keys successfully", async () => {
            const mockApiKeys = [
                {
                    id: "1",
                    name: "Production API Key",
                    key: "ak_123456789_abcdef",
                    permissions: ["read", "write"],
                    rate_limit: 1000,
                    active: true,
                    created_at: "2024-01-01T00:00:00Z",
                    usage_count: 150,
                },
                {
                    id: "2",
                    name: "Development API Key",
                    key: "ak_987654321_fedcba",
                    permissions: ["read"],
                    rate_limit: 500,
                    active: false,
                    created_at: "2024-01-02T00:00:00Z",
                    usage_count: 25,
                },
            ];
            mockDatabase.getApiKeys.mockReturnValue(mockApiKeys);
            const response = await (0, supertest_1.default)(app).get("/api/keys").expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockApiKeys);
            expect(mockDatabase.getApiKeys).toHaveBeenCalledTimes(1);
        });
        it("should handle empty API keys list", async () => {
            mockDatabase.getApiKeys.mockReturnValue([]);
            const response = await (0, supertest_1.default)(app).get("/api/keys").expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });
        it("should handle database errors", async () => {
            mockDatabase.getApiKeys.mockImplementation(() => {
                throw new Error("Database error");
            });
            const response = await (0, supertest_1.default)(app).get("/api/keys").expect(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Failed to fetch API keys");
        });
    });
    describe("POST /api/keys", () => {
        it("should create a new API key successfully", async () => {
            const newKeyData = {
                name: "Test API Key",
                permissions: ["read", "write"],
                rate_limit: 1000,
                expires_at: "2025-01-01T00:00:00Z",
            };
            const mockCreatedKey = {
                id: "new-key-id",
                name: "Test API Key",
                key: "ak_newkey123_timestamp",
                permissions: ["read", "write"],
                rate_limit: 1000,
                active: true,
                created_at: "2024-01-01T00:00:00Z",
                usage_count: 0,
                expires_at: "2025-01-01T00:00:00Z",
            };
            mockDatabase.createApiKey.mockReturnValue(mockCreatedKey);
            const response = await (0, supertest_1.default)(app)
                .post("/api/keys")
                .send(newKeyData)
                .expect(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockCreatedKey);
            expect(response.body.message).toBe("API key created successfully");
            expect(mockDatabase.createApiKey).toHaveBeenCalledWith({
                name: "Test API Key",
                permissions: ["read", "write"],
                rate_limit: 1000,
                expires_at: "2025-01-01T00:00:00Z",
                active: true,
            });
        });
        it("should validate required fields", async () => {
            const invalidData = {
                name: "Test Key",
                // Missing permissions and rate_limit
            };
            const response = await (0, supertest_1.default)(app)
                .post("/api/keys")
                .send(invalidData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Name, permissions, and rate_limit are required");
        });
        it("should handle single permission as string", async () => {
            const keyData = {
                name: "Test Key",
                permissions: "read", // Single string instead of array
                rate_limit: 500,
            };
            const mockCreatedKey = {
                id: "key-id",
                permissions: ["read"],
            };
            mockDatabase.createApiKey.mockReturnValue(mockCreatedKey);
            const response = await (0, supertest_1.default)(app)
                .post("/api/keys")
                .send(keyData)
                .expect(201);
            expect(mockDatabase.createApiKey).toHaveBeenCalledWith({
                name: "Test Key",
                permissions: ["read"], // Should be converted to array
                rate_limit: 500,
                expires_at: undefined,
                active: true,
            });
        });
        it("should handle database creation errors", async () => {
            const keyData = {
                name: "Test Key",
                permissions: ["read"],
                rate_limit: 1000,
            };
            mockDatabase.createApiKey.mockImplementation(() => {
                throw new Error("Database constraint violation");
            });
            const response = await (0, supertest_1.default)(app)
                .post("/api/keys")
                .send(keyData)
                .expect(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Failed to create API key");
        });
    });
    describe("PUT /api/keys/:id", () => {
        it("should update an existing API key successfully", async () => {
            const updateData = {
                name: "Updated API Key",
                permissions: ["read", "write", "admin"],
                rate_limit: 2000,
            };
            const existingKey = {
                id: "key-1",
                name: "Original Name",
                permissions: ["read"],
                rate_limit: 1000,
            };
            const updatedKey = {
                ...existingKey,
                ...updateData,
            };
            mockDatabase.getApiKeyById.mockReturnValue(existingKey);
            mockDatabase.updateApiKey.mockReturnValue(updatedKey);
            const response = await (0, supertest_1.default)(app)
                .put("/api/keys/key-1")
                .send(updateData)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(updatedKey);
            expect(response.body.message).toBe("API key updated successfully");
            expect(mockDatabase.getApiKeyById).toHaveBeenCalledWith("key-1");
            expect(mockDatabase.updateApiKey).toHaveBeenCalledWith("key-1", updateData);
        });
        it("should return 404 for non-existent API key", async () => {
            mockDatabase.getApiKeyById.mockReturnValue(null);
            const response = await (0, supertest_1.default)(app)
                .put("/api/keys/non-existent")
                .send({ name: "Updated Name" })
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("API key not found");
        });
        it("should handle update failures", async () => {
            const existingKey = { id: "key-1", name: "Test" };
            mockDatabase.getApiKeyById.mockReturnValue(existingKey);
            mockDatabase.updateApiKey.mockReturnValue(null);
            const response = await (0, supertest_1.default)(app)
                .put("/api/keys/key-1")
                .send({ name: "Updated" })
                .expect(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Failed to update API key");
        });
    });
    describe("PATCH /api/keys/:id/toggle", () => {
        it("should toggle API key status successfully", async () => {
            const existingKey = {
                id: "key-1",
                name: "Test Key",
                active: false,
            };
            const toggledKey = {
                ...existingKey,
                active: true,
            };
            mockDatabase.getApiKeyById.mockReturnValue(existingKey);
            mockDatabase.updateApiKey.mockReturnValue(toggledKey);
            const response = await (0, supertest_1.default)(app)
                .patch("/api/keys/key-1/toggle")
                .send({ active: true })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(toggledKey);
            expect(response.body.message).toBe("API key activated successfully");
            expect(mockDatabase.updateApiKey).toHaveBeenCalledWith("key-1", {
                active: true,
            });
        });
        it("should toggle without explicit active value", async () => {
            const existingKey = {
                id: "key-1",
                active: true,
            };
            const toggledKey = {
                ...existingKey,
                active: false,
            };
            mockDatabase.getApiKeyById.mockReturnValue(existingKey);
            mockDatabase.updateApiKey.mockReturnValue(toggledKey);
            const response = await (0, supertest_1.default)(app)
                .patch("/api/keys/key-1/toggle")
                .send({}) // No active value, should toggle current state
                .expect(200);
            expect(response.body.message).toBe("API key deactivated successfully");
            expect(mockDatabase.updateApiKey).toHaveBeenCalledWith("key-1", {
                active: false,
            });
        });
        it("should return 404 for non-existent key", async () => {
            mockDatabase.getApiKeyById.mockReturnValue(null);
            const response = await (0, supertest_1.default)(app)
                .patch("/api/keys/non-existent/toggle")
                .send({ active: true })
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("API key not found");
        });
    });
    describe("DELETE /api/keys/:id", () => {
        it("should delete API key successfully", async () => {
            const existingKey = {
                id: "key-1",
                name: "Test Key",
            };
            mockDatabase.getApiKeyById.mockReturnValue(existingKey);
            mockDatabase.deleteApiKey.mockReturnValue(true);
            const response = await (0, supertest_1.default)(app).delete("/api/keys/key-1").expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("API key deleted successfully");
            expect(mockDatabase.getApiKeyById).toHaveBeenCalledWith("key-1");
            expect(mockDatabase.deleteApiKey).toHaveBeenCalledWith("key-1");
        });
        it("should return 404 for non-existent key", async () => {
            mockDatabase.getApiKeyById.mockReturnValue(null);
            const response = await (0, supertest_1.default)(app)
                .delete("/api/keys/non-existent")
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("API key not found");
        });
        it("should handle deletion failures", async () => {
            const existingKey = { id: "key-1" };
            mockDatabase.getApiKeyById.mockReturnValue(existingKey);
            mockDatabase.deleteApiKey.mockReturnValue(false);
            const response = await (0, supertest_1.default)(app).delete("/api/keys/key-1").expect(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Failed to delete API key");
        });
    });
    describe("GET /api/endpoints", () => {
        it("should return API endpoints successfully", async () => {
            const mockEndpoints = [
                {
                    id: "1",
                    method: "GET",
                    path: "/api/auth/profile",
                    handler: "AuthController.getProfile",
                    description: "Get user profile",
                    auth_required: true,
                    permissions: ["read"],
                    rate_limit: 100,
                    active: true,
                    created_at: "2024-01-01T00:00:00Z",
                    request_count: 1500,
                    avg_response_time: 45,
                },
                {
                    id: "2",
                    method: "POST",
                    path: "/api/auth/login",
                    handler: "AuthController.login",
                    description: "User login",
                    auth_required: false,
                    permissions: [],
                    rate_limit: 10,
                    active: true,
                    created_at: "2024-01-01T00:00:00Z",
                    request_count: 2300,
                    avg_response_time: 120,
                },
            ];
            mockDatabase.getApiEndpoints.mockReturnValue(mockEndpoints);
            const response = await (0, supertest_1.default)(app).get("/api/endpoints").expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockEndpoints);
            expect(mockDatabase.getApiEndpoints).toHaveBeenCalledTimes(1);
        });
        it("should handle database errors", async () => {
            mockDatabase.getApiEndpoints.mockImplementation(() => {
                throw new Error("Database error");
            });
            const response = await (0, supertest_1.default)(app).get("/api/endpoints").expect(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Failed to fetch API endpoints");
        });
    });
    describe("GET /api/rate-limits", () => {
        it("should return rate limits successfully", async () => {
            const mockRateLimits = [
                {
                    id: "1",
                    name: "Standard Rate Limit",
                    requests_per_minute: 60,
                    requests_per_hour: 1000,
                    requests_per_day: 10000,
                    applies_to: "global",
                    active: true,
                },
                {
                    id: "2",
                    name: "Premium Rate Limit",
                    requests_per_minute: 120,
                    requests_per_hour: 5000,
                    requests_per_day: 50000,
                    applies_to: "key",
                    active: true,
                },
            ];
            mockDatabase.getRateLimits.mockReturnValue(mockRateLimits);
            const response = await (0, supertest_1.default)(app).get("/api/rate-limits").expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockRateLimits);
        });
        it("should return empty array when no rate limits exist", async () => {
            mockDatabase.getRateLimits.mockReturnValue([]);
            const response = await (0, supertest_1.default)(app).get("/api/rate-limits").expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });
        it("should handle database errors", async () => {
            mockDatabase.getRateLimits.mockImplementation(() => {
                throw new Error("Database error");
            });
            const response = await (0, supertest_1.default)(app).get("/api/rate-limits").expect(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Failed to fetch rate limits");
        });
    });
    describe("Error Handling", () => {
        it("should handle malformed JSON requests", async () => {
            const response = await (0, supertest_1.default)(app)
                .post("/api/keys")
                .send("invalid json")
                .set("Content-Type", "application/json")
                .expect(400);
            // Express should handle malformed JSON and return 400
        });
        it("should handle very large request bodies", async () => {
            const largeData = {
                name: "Test",
                permissions: ["read"],
                rate_limit: 1000,
                large_field: "x".repeat(100000), // Very large string
            };
            // Depending on Express configuration, this might be rejected
            const response = await (0, supertest_1.default)(app).post("/api/keys").send(largeData);
            // Should either succeed (if no limits) or fail gracefully
            expect([200, 201, 413, 400]).toContain(response.status);
        });
    });
    describe("Input Validation", () => {
        it("should handle special characters in API key names", async () => {
            const keyData = {
                name: 'Test Key with "quotes" & <symbols>',
                permissions: ["read"],
                rate_limit: 1000,
            };
            mockDatabase.createApiKey.mockReturnValue({ id: "test" });
            const response = await (0, supertest_1.default)(app)
                .post("/api/keys")
                .send(keyData)
                .expect(201);
            expect(mockDatabase.createApiKey).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Test Key with "quotes" & <symbols>',
            }));
        });
        it("should handle empty permission arrays", async () => {
            const keyData = {
                name: "Test Key",
                permissions: [],
                rate_limit: 1000,
            };
            mockDatabase.createApiKey.mockReturnValue({ id: "test" });
            const response = await (0, supertest_1.default)(app)
                .post("/api/keys")
                .send(keyData)
                .expect(201);
            expect(mockDatabase.createApiKey).toHaveBeenCalledWith(expect.objectContaining({
                permissions: [],
            }));
        });
        it("should handle extreme rate limit values", async () => {
            const keyData = {
                name: "Test Key",
                permissions: ["read"],
                rate_limit: 999999999,
            };
            mockDatabase.createApiKey.mockReturnValue({ id: "test" });
            const response = await (0, supertest_1.default)(app)
                .post("/api/keys")
                .send(keyData)
                .expect(201);
            expect(mockDatabase.createApiKey).toHaveBeenCalledWith(expect.objectContaining({
                rate_limit: 999999999,
            }));
        });
    });
});
//# sourceMappingURL=api-management.test.js.map