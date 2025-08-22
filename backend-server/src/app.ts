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

import { BackendSDK } from "@krapi/sdk";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";

import routes, { initializeBackendSDK } from "./routes";
import { AuthService } from "./services/auth.service";
import { SDKServiceManager } from "./services/sdk-service-manager";

// Types imported but used in route files

// Load environment variables
dotenv.config();

// Create Express app
const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((origin) =>
  origin.trim()
) || ["http://localhost:3469"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    exposedHeaders: ["X-Auth-Token"],
  })
);

// Compression
app.use(compression());

// Request logging
app.use(morgan(process.env.LOG_FORMAT || "combined"));

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

// Initialize SDK service manager with database connection
const sdkServiceManager = new SDKServiceManager(
  {
    query: async (_sql: string, _params?: unknown[]) => {
      // For now, we'll use a simple database connection
      // This will be replaced with the actual SDK database connection
      return {
        rows: [],
        rowCount: 0,
      };
    },
    connect: async () => {
      // Connection logic will be handled by SDK
    },
    end: async () => {
      // Disconnection logic will be handled by SDK
    },
  },
  console
);

// Initialize BackendSDK with the service manager
const backendSDK = new BackendSDK({
  databaseConnection: {
    query: async (_sql: string, _params?: unknown[]) => {
      // For now, we'll use a simple database connection
      // This will be replaced with the actual SDK database connection
      return {
        rows: [],
        rowCount: 0,
      };
    },
    connect: async () => {
      // Connection logic will be handled by SDK
    },
    end: async () => {
      // Disconnection logic will be handled by SDK
    },
  },
  logger: console,
  enableAutoFix: true,
  enableHealthChecks: true,
});

// Initialize the router with the BackendSDK
initializeBackendSDK(backendSDK);

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
    console.error("Global error handler:", err);

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
const PORT = parseInt(process.env.PORT || "3470");
const HOST = process.env.HOST || "localhost";

// Async startup function
async function startServer() {
  try {
    // Wait for SDK services to be ready
    console.log("⏳ Initializing SDK services...");

    // Perform SDK health check
    console.log("🔍 Performing SDK health check...");
    const sdkHealth = await backendSDK.performHealthCheck();

    if (!sdkHealth.isHealthy) {
      console.log("⚠️  SDK health issues detected:");
      console.log(`   ❌ Database: ${sdkHealth.connected ? "OK" : "FAILED"}`);
      if (sdkHealth.issues && sdkHealth.issues.length > 0) {
        console.log(`   ❌ Issues: ${sdkHealth.issues.length} found`);
      }
    } else {
      console.log("✅ SDK services are healthy");
      console.log(`   ✓ Database: ${sdkHealth.connected ? "OK" : "FAILED"}`);
      if (sdkHealth.total_tables) {
        console.log(`   ✓ Tables: ${sdkHealth.total_tables}`);
      }
    }

    // Initialize database with default admin user
    console.log("🔧 Initializing database...");
    const dbInit = await sdkServiceManager.initializeDatabase();

    if (dbInit.success) {
      console.log("✅ Database initialization completed");
    } else {
      console.log("⚠️  Database initialization had issues:", dbInit.message);
    }

    const server = app.listen(PORT, () => {
      console.log(`🚀 KRAPI Backend v2.0.0 running on http://${HOST}:${PORT}`);
      console.log(`📚 API Base URL: http://${HOST}:${PORT}/krapi/k1`);
      console.log(
        `🔐 Default admin credentials available in environment or database`
      );

      // Schedule session cleanup
      setInterval(async () => {
        try {
          // Use the auth service singleton instance
          const authService = AuthService.getInstance();
          const cleaned = await authService.cleanupSessions();
          if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
          }
        } catch (error) {
          console.error("Session cleanup error:", error);
        }
      }, 60 * 60 * 1000); // Every hour
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully...");
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received, shutting down gracefully...");
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
