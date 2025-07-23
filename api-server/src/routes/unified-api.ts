import express from "express";
import ProjectApiController from "../controllers/project-api";
import { DatabaseController } from "../controllers/database";
import { EmailController } from "../controllers/email";
import { FilesController } from "../controllers/files";
import { McpController } from "../controllers/mcp";
import { AuthController } from "../controllers/auth";
import { authenticateToken } from "../middleware/auth";

const router: express.Router = express.Router();

// Middleware to parse unified API requests
interface UnifiedOperation {
  operation: string;
  resource: string;
  action: string;
  params: Record<string, unknown>;
}

const parseUnifiedRequest = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // Extract operation from request body or query
  const operation = req.body.operation || req.query.operation;
  const resource = req.body.resource || req.query.resource;
  const action = req.body.action || req.query.action;

  // Add to request for controllers to use
  (req as any).unifiedOperation = {
    operation,
    resource,
    action,
    params: req.body.params || req.query.params || {},
  } as UnifiedOperation;

  next();
};

// Health check
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Krapi Unified API is healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    endpoint: "/krapi/v1",
  });
});

// Public authentication
router.post("/auth", (req, res) => {
  console.log("🔐 Unified API Auth: Received request:", {
    method: req.body.method,
    username: req.body.username ? "present" : "missing",
    password: req.body.password ? "present" : "missing",
  });

  const { method } = req.body;

  switch (method) {
    case "login":
      console.log("🔐 Unified API Auth: Calling AuthController.login");
      AuthController.login(req, res);
      break;
    case "verify":
      console.log(
        "🔐 Unified API Auth: Calling ProjectApiController.authenticateApiKey"
      );
      ProjectApiController.authenticateApiKey(req, res);
      break;
    default:
      console.log("🔐 Unified API Auth: Invalid method:", method);
      res.status(400).json({
        success: false,
        error: "Invalid authentication method",
      });
  }
});

// Unified API endpoint - ALL operations go through this
router.all("/api", authenticateToken, parseUnifiedRequest, async (req, res) => {
  const { operation, resource, action, params } = (req as any)
    .unifiedOperation as UnifiedOperation;

  try {
    // Route to appropriate controller based on operation and resource
    switch (operation) {
      case "database":
        await handleDatabaseOperation(resource, action, params, req, res);
        break;
      case "auth":
        await handleAuthOperation(resource, action, params, req, res);
        break;
      case "storage":
        await handleStorageOperation(resource, action, params, req, res);
        break;
      case "users":
        await handleUsersOperation(resource, action, params, req, res);
        break;
      case "teams":
        await handleTeamsOperation(resource, action, params, req, res);
        break;
      case "functions":
        await handleFunctionsOperation(resource, action, params, req, res);
        break;
      case "messaging":
        await handleMessagingOperation(resource, action, params, req, res);
        break;
      case "ai":
        await handleAIOperation(resource, action, params, req, res);
        break;
      case "admin":
        await handleAdminOperation(resource, action, params, req, res);
        break;
      default:
        res.status(400).json({
          success: false,
          error: `Unknown operation: ${operation}`,
        });
    }
  } catch (error) {
    console.error("Unified API error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Database operations (collections, documents, indexes)
async function handleDatabaseOperation(
  resource: string,
  action: string,
  params: Record<string, unknown>,
  req: express.Request,
  res: express.Response
): Promise<void> {
  switch (resource) {
    case "collections":
      switch (action) {
        case "list":
          ProjectApiController.getCollections(req, res);
          break;
        case "create":
          ProjectApiController.createCollection(req, res);
          break;
        case "get":
          ProjectApiController.getCollection(req, res);
          break;
        case "update":
          ProjectApiController.updateCollection(req, res);
          break;
        case "delete":
          ProjectApiController.deleteCollection(req, res);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown action: ${action}` });
      }
      break;
    case "documents":
      switch (action) {
        case "list":
          ProjectApiController.getDocuments(req, res);
          break;
        case "create":
          ProjectApiController.createDocument(req, res);
          break;
        case "get":
          ProjectApiController.getDocument(req, res);
          break;
        case "update":
          ProjectApiController.updateDocument(req, res);
          break;
        case "delete":
          ProjectApiController.deleteDocument(req, res);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown action: ${action}` });
      }
      break;
    case "indexes":
      // TODO: Implement indexes
      res
        .status(501)
        .json({ success: false, error: "Indexes not implemented yet" });
      break;
    default:
      res
        .status(400)
        .json({ success: false, error: `Unknown resource: ${resource}` });
  }
}

// Authentication operations
async function handleAuthOperation(
  resource: string,
  action: string,
  params: Record<string, unknown>,
  req: express.Request,
  res: express.Response
): Promise<void> {
  switch (resource) {
    case "users":
      switch (action) {
        case "list":
          ProjectApiController.getUsers(req, res);
          break;
        case "create":
          ProjectApiController.createUser(req, res);
          break;
        case "get":
          ProjectApiController.getUser(req, res);
          break;
        case "update":
          ProjectApiController.updateUser(req, res);
          break;
        case "delete":
          ProjectApiController.deleteUser(req, res);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown action: ${action}` });
      }
      break;
    case "sessions":
      // TODO: Implement sessions
      res
        .status(501)
        .json({ success: false, error: "Sessions not implemented yet" });
      break;
    default:
      res
        .status(400)
        .json({ success: false, error: `Unknown resource: ${resource}` });
  }
}

// Storage operations (files)
async function handleStorageOperation(
  resource: string,
  action: string,
  params: Record<string, unknown>,
  req: express.Request,
  res: express.Response
): Promise<void> {
  switch (resource) {
    case "files":
      switch (action) {
        case "list":
          FilesController.getAllFiles(req, res);
          break;
        case "create":
          FilesController.uploadFile(req, res);
          break;
        case "get":
          FilesController.getFileById(req, res);
          break;
        case "update":
          FilesController.updateFile(req, res);
          break;
        case "delete":
          FilesController.deleteFile(req, res);
          break;
        case "download":
          FilesController.downloadFile(req, res);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown action: ${action}` });
      }
      break;
    default:
      res
        .status(400)
        .json({ success: false, error: `Unknown resource: ${resource}` });
  }
}

// Users operations
async function handleUsersOperation(
  resource: string,
  action: string,
  params: Record<string, unknown>,
  req: express.Request,
  res: express.Response
): Promise<void> {
  switch (resource) {
    case "prefs":
      // TODO: Implement user preferences
      res.status(501).json({
        success: false,
        error: "User preferences not implemented yet",
      });
      break;
    case "sessions":
      // TODO: Implement user sessions
      res
        .status(501)
        .json({ success: false, error: "User sessions not implemented yet" });
      break;
    default:
      res
        .status(400)
        .json({ success: false, error: `Unknown resource: ${resource}` });
  }
}

// Teams operations
async function handleTeamsOperation(
  resource: string,
  action: string,
  params: Record<string, unknown>,
  req: express.Request,
  res: express.Response
): Promise<void> {
  // TODO: Implement teams
  res.status(501).json({ success: false, error: "Teams not implemented yet" });
}

// Functions operations
async function handleFunctionsOperation(
  resource: string,
  action: string,
  params: Record<string, unknown>,
  req: express.Request,
  res: express.Response
): Promise<void> {
  // TODO: Implement serverless functions
  res
    .status(501)
    .json({ success: false, error: "Functions not implemented yet" });
}

// Messaging operations
async function handleMessagingOperation(
  resource: string,
  action: string,
  params: Record<string, unknown>,
  req: express.Request,
  res: express.Response
): Promise<void> {
  switch (resource) {
    case "messages":
      // TODO: Implement messaging
      res
        .status(501)
        .json({ success: false, error: "Messaging not implemented yet" });
      break;
    case "topics":
      // TODO: Implement topics
      res
        .status(501)
        .json({ success: false, error: "Topics not implemented yet" });
      break;
    default:
      res
        .status(400)
        .json({ success: false, error: `Unknown resource: ${resource}` });
  }
}

// AI operations
async function handleAIOperation(
  resource: string,
  action: string,
  params: Record<string, unknown>,
  req: express.Request,
  res: express.Response
): Promise<void> {
  switch (resource) {
    case "chat":
      switch (action) {
        case "create":
          McpController.ollamaChat(req, res);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown action: ${action}` });
      }
      break;
    case "models":
      switch (action) {
        case "list":
          McpController.listModels(req, res);
          break;
        case "create":
          McpController.pullModel(req, res);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown action: ${action}` });
      }
      break;
    case "generate":
      switch (action) {
        case "create":
          McpController.generate(req, res);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown action: ${action}` });
      }
      break;
    default:
      res
        .status(400)
        .json({ success: false, error: `Unknown resource: ${resource}` });
  }
}

// Admin operations (require admin authentication)
async function handleAdminOperation(
  resource: string,
  action: string,
  params: Record<string, unknown>,
  req: express.Request,
  res: express.Response
): Promise<void> {
  // Check admin authentication
  if (
    !(req as any).user ||
    ((req as any).user as { role: string }).role !== "admin"
  ) {
    res.status(403).json({ success: false, error: "Admin access required" });
    return;
  }

  switch (resource) {
    case "projects":
      switch (action) {
        case "list":
          ProjectApiController.getProjects(req, res);
          break;
        case "create":
          ProjectApiController.createProject(req, res);
          break;
        case "get":
          ProjectApiController.getProject(req, res);
          break;
        case "update":
          ProjectApiController.updateProject(req, res);
          break;
        case "delete":
          ProjectApiController.deleteProject(req, res);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown action: ${action}` });
      }
      break;
    case "keys":
      switch (action) {
        case "list":
          ProjectApiController.getApiKeys(req, res);
          break;
        case "create":
          ProjectApiController.createApiKey(req, res);
          break;
        case "delete":
          ProjectApiController.deleteApiKey(req, res);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown action: ${action}` });
      }
      break;
    case "database":
      switch (action) {
        case "stats":
          DatabaseController.getStats(req, res);
          break;
        case "info":
          DatabaseController.getDatabaseInfo(req, res);
          break;
        case "reset":
          DatabaseController.resetDatabase(req, res);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown action: ${action}` });
      }
      break;
    case "email":
      switch (action) {
        case "config":
          EmailController.getEmailConfiguration(req, res);
          break;
        case "send":
          EmailController.sendEmail(req, res);
          break;
        default:
          res
            .status(400)
            .json({ success: false, error: `Unknown action: ${action}` });
      }
      break;
    default:
      res
        .status(400)
        .json({ success: false, error: `Unknown resource: ${resource}` });
  }
}

export default router;
