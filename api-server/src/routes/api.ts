import express from "express";
import { AuthController } from "../controllers/auth";
import { UserController } from "../controllers/users";
import { SchemasController } from "../controllers/schemas";
import { ContentController } from "../controllers/content";
import { RoutesController } from "../controllers/routes";
import { EmailController } from "../controllers/email";
import { FilesController } from "../controllers/files";
import { NotificationsController } from "../controllers/notifications";
import { SearchController } from "../controllers/search";
import { ApiManagementController } from "../controllers/api-management";
import { DatabaseController } from "../controllers/database";
import { McpController } from "../controllers/mcp";
import { authenticateToken } from "../middleware/auth";

const router: express.Router = express.Router();

// Public routes
router.post("/auth/login", AuthController.login);

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
router.use(authenticateToken);

// Auth
router.get("/auth/verify", AuthController.verify);
router.get("/auth/profile", AuthController.getProfile);
router.put("/auth/profile", AuthController.updateProfile);
router.post("/auth/change-password", AuthController.changePassword);

// MCP Routes (Ollama + AI Integration)
router.get("/mcp/info", McpController.getServerInfo);
router.get("/mcp/health", McpController.healthCheck);
router.get("/mcp/tools", McpController.listTools);
router.post("/mcp/tools/call", McpController.callTool);
router.get("/mcp/app-state", McpController.getAppState);

// Ollama Integration
router.get("/ollama/models", McpController.listModels);
router.post("/ollama/models/pull", McpController.pullModel);
router.post("/ollama/chat", McpController.ollamaChat);
router.post("/ollama/generate", McpController.generate);

// API Management routes
router.get("/admin/api/stats", ApiManagementController.getApiStats);
router.get("/admin/api/keys", ApiManagementController.getApiKeys);
router.post("/admin/api/keys", ApiManagementController.createApiKey);
router.put("/admin/api/keys/:id", ApiManagementController.updateApiKey);
router.patch(
  "/admin/api/keys/:id/toggle",
  ApiManagementController.toggleApiKey
);
router.delete("/admin/api/keys/:id", ApiManagementController.deleteApiKey);
router.get("/admin/api/endpoints", ApiManagementController.getApiEndpoints);
router.put(
  "/admin/api/endpoints/:endpoint",
  ApiManagementController.updateEndpoint
);
router.get("/admin/api/rate-limits", ApiManagementController.getRateLimits);
router.put(
  "/admin/api/rate-limits/:id",
  ApiManagementController.updateRateLimit
);

// Search
router.get("/search", SearchController.searchAll);

// Users
router.get("/admin/users", UserController.getAllUsers);
router.post("/admin/users", UserController.createUser);
router.get("/admin/users/:id", UserController.getUserById);
router.put("/admin/users/:id", UserController.updateUser);
router.delete("/admin/users/:id", UserController.deleteUser);
router.patch("/admin/users/:id/toggle-status", UserController.toggleUserStatus);
router.get("/admin/users/stats", UserController.getUserStats);

// Auth Management
router.get("/admin/auth/security-settings", AuthController.getSecuritySettings);
router.put(
  "/admin/auth/security-settings",
  AuthController.updateSecuritySettings
);
router.get("/admin/auth/login-logs", AuthController.getLoginLogs);
router.get("/admin/auth/sessions", AuthController.getActiveSessions);
router.delete(
  "/admin/auth/sessions/:sessionId",
  AuthController.terminateSession
);

// Schemas
router.get("/admin/schemas", SchemasController.getAllSchemas);
router.post("/admin/schemas", SchemasController.createSchema);
router.get("/admin/schemas/:id", SchemasController.getSchemaById);
router.put("/admin/schemas/:id", SchemasController.updateSchema);
router.delete("/admin/schemas/:id", SchemasController.deleteSchema);
router.get("/schema/:name", SchemasController.getSchemaByName);

// Content - Support both key-based and ID-based operations
router.get("/admin/content", ContentController.getAllContent);
router.get("/admin/content/get", ContentController.getAllContent); // Alias for frontend compatibility
router.post("/admin/content", ContentController.createContent);
router.post("/admin/content/create", ContentController.createContent); // Alias for frontend compatibility
router.get("/admin/content/:key", ContentController.getContentByKey);
router.get("/admin/content/get/:id", ContentController.getContentById); // ID-based get
router.put("/admin/content/:key", ContentController.updateContent);
router.put("/admin/content/modify/id/:id", ContentController.updateContentById); // ID-based update
router.delete("/admin/content/:key", ContentController.deleteContent);
router.delete(
  "/admin/content/delete/id/:id",
  ContentController.deleteContentById
); // ID-based delete

// Public content routes
router.get("/content/:routePath", ContentController.getPublicContentByRoute);
router.get("/content/:routePath/:key", ContentController.getPublicContent);

// Database
router.get("/admin/content/tables", DatabaseController.getTables);
router.post("/admin/content/tables", DatabaseController.createTable);
router.get("/admin/database/stats", DatabaseController.getStats);
router.get("/admin/database/info", DatabaseController.getDatabaseInfo);
router.get("/admin/database/table/:tableName", DatabaseController.getTableData);
router.post("/admin/database/query", DatabaseController.executeQuery);
router.get("/admin/database/export", DatabaseController.exportDatabase);
router.post("/admin/database/reset", DatabaseController.resetDatabase);

// Routes
router.get("/admin/routes", RoutesController.getAllRoutes);
router.post("/admin/routes", RoutesController.createRoute);
router.get("/admin/routes/:id", RoutesController.getRouteById);
router.put("/admin/routes/:id", RoutesController.updateRoute);
router.delete("/admin/routes/:id", RoutesController.deleteRoute);
router.get("/admin/routes/tree", RoutesController.getRouteTree);

// Email
router.get("/admin/email/config", EmailController.getEmailConfiguration);
router.put("/admin/email/config", EmailController.updateEmailConfiguration);
router.post("/admin/email/test", EmailController.testEmailConnection);
router.post("/admin/email/send", EmailController.sendEmail);
router.get("/admin/email/templates", EmailController.getAllTemplates);
router.post("/admin/email/templates", EmailController.createTemplate);
router.get("/admin/email/templates/:id", EmailController.getTemplateById);
router.put("/admin/email/templates/:id", EmailController.updateTemplate);
router.delete("/admin/email/templates/:id", EmailController.deleteTemplate);
router.get("/admin/email/logs", EmailController.getEmailLogs);
router.get("/admin/email/stats", EmailController.getEmailStats);
router.get(
  "/admin/email/preferences",
  EmailController.getNotificationPreferences
);
router.put(
  "/admin/email/preferences",
  EmailController.updateNotificationPreferences
);

// Files
router.post("/admin/files/upload", FilesController.uploadFile);
router.get("/admin/files", FilesController.getAllFiles);
router.get("/admin/files/:id", FilesController.getFileById);
router.put("/admin/files/:id", FilesController.updateFile);
router.delete("/admin/files/:id", FilesController.deleteFile);
router.get("/admin/files/:id/download", FilesController.downloadFile);
router.get("/files/:filename", FilesController.getPublicFile);

// Notifications
router.get("/notifications", NotificationsController.getUserNotifications);
router.patch("/notifications/:id/read", NotificationsController.markAsRead);
router.patch(
  "/notifications/mark-all-read",
  NotificationsController.markAllAsRead
);
router.delete("/notifications/:id", NotificationsController.deleteNotification);
router.get(
  "/notifications/preferences",
  NotificationsController.getNotificationPreferences
);
router.put(
  "/notifications/preferences",
  NotificationsController.updateNotificationPreferences
);
router.get(
  "/notifications/unread-count",
  NotificationsController.getUnreadCount
);

export default router;
