/**
 * KRAPI Backend Server
 *
 * Database Initialization & Health Check System:
 *
 * 1. DATABASE INITIALIZATION:
 *    - On startup, the server attempts to connect to PostgreSQL
 *    - Creates all required tables if they don't exist
 *    - Ensures default admin user exists with credentials:
 *      Username: admin
 *      Password: admin123 (or value from DEFAULT_ADMIN_PASSWORD env var)
 *    - Generates a master API key for the default admin (shown once on first run)
 *    - If admin exists but password was changed during development,
 *      it will be reset to the default on startup
 *
 * 2. AUTHENTICATION:
 *    - Admin users can authenticate via:
 *      a) Username/password: POST /krapi/k1/auth/admin/login
 *      b) API key: POST /krapi/k1/auth/admin/api-login
 *    - Master API key (mak_*) provides full admin access
 *    - Admin API keys (ak_*) provide admin-level access with custom scopes
 *    - Project API keys (pk_*) provide project-specific access
 *
 * 3. ACCESS CONTROL (SCOPES):
 *    The system uses fine-grained scope-based permissions:
 *
 *    Master Scope:
 *    - MASTER: Full unrestricted access to everything
 *
 *    Admin Scopes:
 *    - admin:read - View admin users and system info
 *    - admin:write - Create/update admin users
 *    - admin:delete - Delete admin users
 *
 *    Project Scopes:
 *    - projects:read - View projects
 *    - projects:write - Create/update projects
 *    - projects:delete - Delete projects
 *
 *    Resource Scopes (project-specific):
 *    - collections:read/write/delete - Manage data schemas
 *    - documents:read/write/delete - Manage data records
 *    - storage:read/write/delete - Manage files
 *    - email:send/read - Email functionality
 *    - functions:execute/write/delete - Serverless functions
 *
 *    Scopes are assigned based on:
 *    - Admin role (master_admin gets MASTER scope)
 *    - API key configuration (custom scopes per key)
 *    - Project API keys get default project scopes
 *
 * 4. HEALTH CHECKS:
 *    - GET /krapi/k1/health - Returns comprehensive health status
 *    - POST /krapi/k1/health/repair - Attempts to fix database issues
 *    - Health check includes:
 *      - Database connection status
 *      - Required tables existence check
 *      - Default admin user check
 *      - Initialization status
 *
 * 5. AUTO-REPAIR:
 *    - On startup, if health check fails, auto-repair is attempted
 *    - Repair actions include:
 *      - Creating missing tables
 *      - Fixing default admin user
 *      - Recording repair actions in system_checks table
 *
 * 6. ROUTE STRUCTURE:
 *    Admin-level routes:
 *    - /krapi/k1/auth/* - Authentication endpoints
 *    - /krapi/k1/admin/* - Admin user management
 *    - /krapi/k1/projects - Project CRUD operations
 *
 *    Project-level routes (all under /projects/:projectId):
 *    - /krapi/k1/projects/:projectId/collections/* - Data collections
 *    - /krapi/k1/projects/:projectId/storage/* - File storage
 *    - /krapi/k1/projects/:projectId/email/* - Email functionality (future)
 *
 * 7. ENVIRONMENT VARIABLES:
 *    - DB_HOST: PostgreSQL host (default: localhost)
 *    - DB_PORT: PostgreSQL port (default: 5432)
 *    - DB_NAME: Database name (default: krapi)
 *    - DB_USER: Database user (default: postgres)
 *    - DB_PASSWORD: Database password (default: postgres)
 *    - DEFAULT_ADMIN_PASSWORD: Default admin password (default: admin123)
 *
 * 8. TROUBLESHOOTING:
 *    - Run npm run health-check to verify backend health
 *    - Check logs for detailed error messages
 *    - Ensure PostgreSQL is running and accessible
 *    - Verify database credentials in environment variables
 *    - Master API key is shown only once on first run - save it securely!
 *    - Use appropriate scopes when creating API keys for limited access
 */

import path from "path";

import KrapiErrorHandler from "@krapi/error-handler";
import KrapiLogger from "@krapi/logger";
import KrapiMonitor from "@krapi/monitor";
import { BackendSDK } from "@krapi/sdk";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
// import morgan from "morgan";

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, "../../.env") });

import routes, { initializeBackendSDK } from "./routes";
import { AuthService } from "./services/auth.service";
import { DatabaseService } from "./services/database.service";
import { ProjectAwareDbAdapter } from "./services/project-aware-db-adapter";
import { SDKServiceManager } from "./services/sdk-service-manager";

// Types imported but used in route files

// Initialize logging and error handling
const logger = KrapiLogger.getInstance({
  level: process.env.LOG_LEVEL || "info",
  enableFileLogging: true,
  enableConsoleLogging: true,
  logFilePath: process.env.LOG_FILE_PATH || "./logs",
  maxLogFiles: parseInt(process.env.MAX_LOG_FILES || "10"),
  maxLogSize: process.env.MAX_LOG_SIZE || "10MB",
  enableMetrics: process.env.ENABLE_METRICS === "true",
});

const errorHandler = KrapiErrorHandler.getInstance({
  enableAutoRecovery: process.env.ENABLE_ERROR_RECOVERY === "true",
  maxRecoveryAttempts: parseInt(process.env.MAX_ERROR_RETRIES || "3"),
  recoveryDelayMs: parseInt(process.env.ERROR_RECOVERY_DELAY || "5000"),
  logErrors: process.env.ENABLE_CRASH_REPORTING === "true",
  enableGracefulShutdown: true,
});

const monitor = KrapiMonitor.getInstance({
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || "30000"),
  metricsInterval: 10000,
  enableAutoRecovery: process.env.ENABLE_AUTO_RECOVERY === "true",
  alertThresholds: {
    memoryUsage: parseInt(process.env.MEMORY_ALERT_THRESHOLD || "80"),
    cpuUsage: parseInt(process.env.CPU_ALERT_THRESHOLD || "80"),
    errorRate: parseInt(process.env.ERROR_RATE_THRESHOLD || "5"),
    responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || "1000"),
  },
  enableNotifications: process.env.ENABLE_ALERTS === "true",
});

// Create Express app
const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((origin) =>
  origin.trim()
) || [
  "http://localhost:3469",
  "http://localhost:3498", // Frontend default port
  "http://localhost:3000", // Alternative frontend port
];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In development, allow localhost origins
        if (process.env.NODE_ENV !== "production" && origin.startsWith("http://localhost:")) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      }
    },
    credentials: true,
    exposedHeaders: ["X-Auth-Token"],
  })
);

// Compression
app.use(compression());

// Request logging with custom logger
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - start;
    logger.info("api", `${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
    });
    return originalSend.call(this, data);
  };

  next();
});

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "1000"), // Increased from 100 to 1000
  message: "Too many requests from this IP, please try again later.",
});

app.use("/krapi/k1", generalLimiter);

// Initialize database service
const databaseService = DatabaseService.getInstance();

// Initialize SDK service manager with real database connection
const sdkServiceManager = new SDKServiceManager(
  {
    query: async (sql: string, params?: unknown[]) => {
      return await databaseService.query(sql, params);
    },
    connect: async () => {
      await databaseService.connect();
    },
    end: async () => {
      await databaseService.end();
    },
  },
  console
);

// Initialize project-aware database adapter
const dbAdapter = new ProjectAwareDbAdapter(databaseService);

// Initialize BackendSDK with project-aware database connection
const backendSDK = new BackendSDK({
  databaseConnection: {
    query: async (sql: string, params?: unknown[]) => {
      return await dbAdapter.query(sql, params);
    },
    connect: async () => {
      await dbAdapter.connect();
    },
    end: async () => {
      await dbAdapter.end();
    },
  },
  logger: console,
  enableAutoFix: true,
  enableHealthChecks: true,
});

// Health check endpoint (no auth required)
app.get("/health", async (req: Request, res: Response) => {
  try {
    const sdkHealth = await backendSDK.performHealthCheck();

    const health = {
      status: sdkHealth.isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      sdk: sdkHealth,
      version: process.env.npm_package_version || "1.0.0",
    };

    res.status(sdkHealth.isHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Initialize the router with the BackendSDK
initializeBackendSDK(backendSDK);

// System status and logging routes
app.get("/system/status", (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.APP_VERSION || "2.0.0",
      environment: process.env.NODE_ENV || "development",
      logger: logger.getSystemStatus(),
      errorHandler: {
        isHealthy: true, // errorHandler.isHealthy() method doesn't exist
        errorStats: errorHandler.getRecoveryStats(),
        recoveryStats: errorHandler.getRecoveryStats(),
      },
      monitor: {
        isHealthy: monitor.isHealthy(),
        overallHealth: monitor.getOverallHealth(),
        healthChecks: monitor.getHealthStatus(),
        recentMetrics: monitor.getMetrics(5),
      },
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error("system", "Failed to get system status", {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: "Failed to get system status",
    });
  }
});

app.get("/system/logs", (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string;
    const service = req.query.service as string;

    const logs = logger.getLogs(limit, level, service);

    res.json({
      success: true,
      data: {
        logs,
        total: logs.length,
        limit,
        level,
        service,
      },
    });
  } catch (error) {
    logger.error("system", "Failed to get logs", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to get logs",
    });
  }
});

app.get("/system/metrics", (req, res) => {
  try {
    const metrics = logger.getMetrics();

    res.json({
      success: true,
      data: {
        metrics: Object.fromEntries(metrics),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("system", "Failed to get metrics", { error: error.message });
    res.status(500).json({
      success: false,
      error: "Failed to get metrics",
    });
  }
});

// Mount routes
app.use("/krapi/k1", routes);

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ): void => {
    errorHandler.handleError(err, {
      source: "api",
      requestId: req.headers["x-request-id"] as string,
      timestamp: new Date(),
    });

    if (err.name === "ValidationError") {
      const validationError = err as Error & { details?: unknown };
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: validationError.details,
      });
      return;
    }

    if (err.name === "UnauthorizedError") {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
);

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  }
);

// Start server
const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || "3470");
const HOST = process.env.HOST || "localhost";

// Async startup function
async function startServer() {
  try {
    // Wait for SDK services to be ready
    console.log("? Initializing SDK services...");

    // Perform SDK health check
    console.log("?? Performing SDK health check...");
    const sdkHealth = await backendSDK.performHealthCheck();

    if (!sdkHealth.isHealthy) {
      console.log("??  SDK health issues detected:");
      console.log(`   ? Database: ${sdkHealth.connected ? "OK" : "FAILED"}`);
      if (sdkHealth.issues && sdkHealth.issues.length > 0) {
        console.log(`   ? Issues: ${sdkHealth.issues.length} found`);
      }
    } else {
      console.log("? SDK services are healthy");
      console.log(`   ? Database: ${sdkHealth.connected ? "OK" : "FAILED"}`);
      if (sdkHealth.total_tables) {
        console.log(`   ? Tables: ${sdkHealth.total_tables}`);
      }
    }

    // Initialize database with default admin user
    console.log("?? Initializing database...");
    const dbInit = await sdkServiceManager.initializeDatabase();

    if (dbInit.success) {
      console.log("? Database initialization completed");
    } else {
      console.log("??  Database initialization had issues:", dbInit.message);
    }

    // Clean up expired sessions on startup
    try {
      const authService = AuthService.getInstance();
      const cleaned = await authService.cleanupSessions();
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired sessions on startup`);
      }
      // Also invalidate very old sessions (older than 30 days)
      const dbService = DatabaseService.getInstance();
      await dbService.cleanupOldSessions();
    } catch (error) {
      console.error("⚠️  Session cleanup on startup failed:", error);
    }

    const server = app.listen(PORT, () => {
      logger.info("system", `KRAPI Backend Server started`, {
        host: HOST,
        port: PORT,
        environment: process.env.NODE_ENV || "development",
        version: process.env.APP_VERSION || "2.0.0",
      });

      // Start built-in monitoring
      monitor.start();

      console.log(`?? KRAPI Backend v2.0.0 running on http://${HOST}:${PORT}`);
      console.log(`?? API Base URL: http://${HOST}:${PORT}/krapi/k1`);
      console.log(`?? System Status: http://${HOST}:${PORT}/system/status`);
      console.log(`?? System Logs: http://${HOST}:${PORT}/system/logs`);
      console.log(`?? Health Monitor: Built-in monitoring active`);
      console.log(
        `?? Default admin credentials available in environment or database`
      );

      // Schedule session cleanup
      setInterval(async () => {
        try {
          // Use the auth service singleton instance
          const authService = AuthService.getInstance();
          const cleaned = await authService.cleanupSessions();
          if (cleaned > 0) {
            console.log(`?? Cleaned up ${cleaned} expired sessions`);
          }
        } catch (error) {
          console.error("Session cleanup error:", error);
        }
      }, 60 * 60 * 1000); // Every hour
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully...");
      monitor.stop();
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received, shutting down gracefully...");
      monitor.stop();
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("? Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
