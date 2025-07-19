"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../controllers/auth");
const users_1 = require("../controllers/users");
const schemas_1 = require("../controllers/schemas");
const content_1 = require("../controllers/content");
const routes_1 = require("../controllers/routes");
const email_1 = require("../controllers/email");
const files_1 = require("../controllers/files");
const notifications_1 = require("../controllers/notifications");
const search_1 = require("../controllers/search");
const api_management_1 = require("../controllers/api-management");
const database_1 = require("../controllers/database");
const mcp_1 = require("../controllers/mcp");
const auth_2 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes
router.post("/auth/login", auth_1.AuthController.login);
// Health check
router.get("/health", (req, res) => {
    const uptime = process.uptime();
    res.json({
        success: true,
        status: "OK",
        message: "API Server is healthy",
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        version: "1.0.0",
    });
});
// Protected routes
router.use(auth_2.authenticateToken);
// Auth
router.get("/auth/verify", auth_1.AuthController.verify);
router.get("/auth/profile", auth_1.AuthController.getProfile);
router.put("/auth/profile", auth_1.AuthController.updateProfile);
router.post("/auth/change-password", auth_1.AuthController.changePassword);
// MCP Routes (Ollama + AI Integration)
router.get("/mcp/info", mcp_1.McpController.getServerInfo);
router.get("/mcp/health", mcp_1.McpController.healthCheck);
router.get("/mcp/tools", mcp_1.McpController.listTools);
router.post("/mcp/tools/call", mcp_1.McpController.callTool);
router.get("/mcp/app-state", mcp_1.McpController.getAppState);
// Ollama Integration
router.get("/ollama/models", mcp_1.McpController.listModels);
router.post("/ollama/models/pull", mcp_1.McpController.pullModel);
router.post("/ollama/chat", mcp_1.McpController.ollamaChat);
router.post("/ollama/generate", mcp_1.McpController.generate);
// API Management routes
router.get("/admin/api/stats", api_management_1.ApiManagementController.getApiStats);
router.get("/admin/api/keys", api_management_1.ApiManagementController.getApiKeys);
router.post("/admin/api/keys", api_management_1.ApiManagementController.createApiKey);
router.put("/admin/api/keys/:id", api_management_1.ApiManagementController.updateApiKey);
router.patch("/admin/api/keys/:id/toggle", api_management_1.ApiManagementController.toggleApiKey);
router.delete("/admin/api/keys/:id", api_management_1.ApiManagementController.deleteApiKey);
router.get("/admin/api/endpoints", api_management_1.ApiManagementController.getApiEndpoints);
router.put("/admin/api/endpoints/:endpoint", api_management_1.ApiManagementController.updateEndpoint);
router.get("/admin/api/rate-limits", api_management_1.ApiManagementController.getRateLimits);
router.put("/admin/api/rate-limits/:id", api_management_1.ApiManagementController.updateRateLimit);
// Search
router.get("/search", search_1.SearchController.searchAll);
// Users
router.get("/admin/users", users_1.UserController.getAllUsers);
router.post("/admin/users", users_1.UserController.createUser);
router.get("/admin/users/:id", users_1.UserController.getUserById);
router.put("/admin/users/:id", users_1.UserController.updateUser);
router.delete("/admin/users/:id", users_1.UserController.deleteUser);
router.patch("/admin/users/:id/toggle-status", users_1.UserController.toggleUserStatus);
router.get("/admin/users/stats", users_1.UserController.getUserStats);
// Auth Management
router.get("/admin/auth/security-settings", auth_1.AuthController.getSecuritySettings);
router.put("/admin/auth/security-settings", auth_1.AuthController.updateSecuritySettings);
router.get("/admin/auth/login-logs", auth_1.AuthController.getLoginLogs);
router.get("/admin/auth/sessions", auth_1.AuthController.getActiveSessions);
router.delete("/admin/auth/sessions/:sessionId", auth_1.AuthController.terminateSession);
// Schemas
router.get("/admin/schemas", schemas_1.SchemasController.getAllSchemas);
router.post("/admin/schemas", schemas_1.SchemasController.createSchema);
router.get("/admin/schemas/:id", schemas_1.SchemasController.getSchemaById);
router.put("/admin/schemas/:id", schemas_1.SchemasController.updateSchema);
router.delete("/admin/schemas/:id", schemas_1.SchemasController.deleteSchema);
router.get("/schema/:name", schemas_1.SchemasController.getSchemaByName);
// Content - Support both key-based and ID-based operations
router.get("/admin/content", content_1.ContentController.getAllContent);
router.get("/admin/content/get", content_1.ContentController.getAllContent); // Alias for frontend compatibility
router.post("/admin/content", content_1.ContentController.createContent);
router.post("/admin/content/create", content_1.ContentController.createContent); // Alias for frontend compatibility
router.get("/admin/content/:key", content_1.ContentController.getContentByKey);
router.get("/admin/content/get/:id", content_1.ContentController.getContentById); // ID-based get
router.put("/admin/content/:key", content_1.ContentController.updateContent);
router.put("/admin/content/modify/id/:id", content_1.ContentController.updateContentById); // ID-based update
router.delete("/admin/content/:key", content_1.ContentController.deleteContent);
router.delete("/admin/content/delete/id/:id", content_1.ContentController.deleteContentById); // ID-based delete
// Public content routes
router.get("/content/:routePath", content_1.ContentController.getPublicContentByRoute);
router.get("/content/:routePath/:key", content_1.ContentController.getPublicContent);
// Database
router.get("/admin/content/tables", database_1.DatabaseController.getTables);
router.post("/admin/content/tables", database_1.DatabaseController.createTable);
router.get("/admin/database/stats", database_1.DatabaseController.getStats);
router.get("/admin/database/info", database_1.DatabaseController.getDatabaseInfo);
router.get("/admin/database/table/:tableName", database_1.DatabaseController.getTableData);
router.post("/admin/database/query", database_1.DatabaseController.executeQuery);
router.get("/admin/database/export", database_1.DatabaseController.exportDatabase);
router.post("/admin/database/reset", database_1.DatabaseController.resetDatabase);
// Routes
router.get("/admin/routes", routes_1.RoutesController.getAllRoutes);
router.post("/admin/routes", routes_1.RoutesController.createRoute);
router.get("/admin/routes/:id", routes_1.RoutesController.getRouteById);
router.put("/admin/routes/:id", routes_1.RoutesController.updateRoute);
router.delete("/admin/routes/:id", routes_1.RoutesController.deleteRoute);
router.get("/admin/routes/tree", routes_1.RoutesController.getRouteTree);
// Email
router.get("/admin/email/config", email_1.EmailController.getEmailConfiguration);
router.put("/admin/email/config", email_1.EmailController.updateEmailConfiguration);
router.post("/admin/email/test", email_1.EmailController.testEmailConnection);
router.post("/admin/email/send", email_1.EmailController.sendEmail);
router.get("/admin/email/templates", email_1.EmailController.getAllTemplates);
router.post("/admin/email/templates", email_1.EmailController.createTemplate);
router.get("/admin/email/templates/:id", email_1.EmailController.getTemplateById);
router.put("/admin/email/templates/:id", email_1.EmailController.updateTemplate);
router.delete("/admin/email/templates/:id", email_1.EmailController.deleteTemplate);
router.get("/admin/email/logs", email_1.EmailController.getEmailLogs);
router.get("/admin/email/stats", email_1.EmailController.getEmailStats);
router.get("/admin/email/preferences", email_1.EmailController.getNotificationPreferences);
router.put("/admin/email/preferences", email_1.EmailController.updateNotificationPreferences);
// Files
router.post("/admin/files/upload", files_1.upload.single("file"), files_1.FilesController.uploadFile);
router.get("/admin/files", files_1.FilesController.getAllFiles);
router.get("/admin/files/:id", files_1.FilesController.getFileById);
router.put("/admin/files/:id", files_1.FilesController.updateFile);
router.delete("/admin/files/:id", files_1.FilesController.deleteFile);
router.get("/admin/files/:id/download", files_1.FilesController.downloadFile);
router.get("/files/:filename", files_1.FilesController.getPublicFile);
// Notifications
router.get("/notifications", notifications_1.NotificationsController.getUserNotifications);
router.patch("/notifications/:id/read", notifications_1.NotificationsController.markAsRead);
router.patch("/notifications/mark-all-read", notifications_1.NotificationsController.markAllAsRead);
router.delete("/notifications/:id", notifications_1.NotificationsController.deleteNotification);
router.get("/notifications/preferences", notifications_1.NotificationsController.getNotificationPreferences);
router.put("/notifications/preferences", notifications_1.NotificationsController.updateNotificationPreferences);
router.get("/notifications/unread-count", notifications_1.NotificationsController.getUnreadCount);
exports.default = router;
//# sourceMappingURL=api.js.map