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

import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import routes from "./routes";
import { DatabaseService } from "./services/database.service";
import { AuthService } from "./services/auth.service";
import { AdminRole, AuthenticatedRequest } from "./types";

// Load environment variables
dotenv.config();

// Initialize services
const db = DatabaseService.getInstance();
const authService = AuthService.getInstance();

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
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: "Too many requests from this IP, please try again later.",
});
app.use("/krapi/k1", limiter);

// Mount routes
app.use("/krapi/k1", routes);

// Health check endpoint (no auth required)
app.get("/health", async (req: Request, res: Response) => {
  try {
    const db = DatabaseService.getInstance();
    const dbHealth = await db.checkHealth();

    const health = {
      status: dbHealth.healthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
      version: process.env.npm_package_version || "1.0.0",
    };

    res.status(dbHealth.healthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Mount routes
app.use("/krapi/k1", routes);

// Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    console.error("Global error handler:", err);

    if (err.name === "ValidationError") {
      res.status(400).json({
        success: false,
        error: "Validation error",
        details: err.details,
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
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
const PORT = parseInt(process.env.PORT || "3470");
const HOST = process.env.HOST || "localhost";

// Async startup function
async function startServer() {
  try {
    // Wait for database to be ready
    console.log("⏳ Waiting for database connection...");
    await db.waitForReady();
    console.log("✅ Database connected successfully");

    // Perform health check and auto-repair if needed
    console.log("🔍 Performing database health check...");
    const healthCheck = await db.performHealthCheck();

    if (healthCheck.status !== "healthy") {
      console.log("⚠️  Database health issues detected:");
      Object.entries(healthCheck.checks).forEach(([check, result]) => {
        if (!result.status) {
          console.log(`   ❌ ${check}: ${result.message}`);
        }
      });

      console.log("🔧 Attempting automatic repair...");
      const repairResult = await db.repairDatabase();

      if (repairResult.success) {
        console.log("✅ Database repair successful:");
        repairResult.actions.forEach((action) => {
          console.log(`   ✓ ${action}`);
        });

        // Verify health after repair
        const postRepairHealth = await db.performHealthCheck();
        if (postRepairHealth.status === "healthy") {
          console.log("✅ Database is now healthy");
        } else {
          console.log(
            "⚠️  Some issues remain after repair. Manual intervention may be required."
          );
        }
      } else {
        console.error(
          "❌ Database repair failed. Manual intervention required."
        );
        // Don't exit - let the app run with degraded functionality
      }
    } else {
      console.log("✅ Database health check passed");
    }

    const server = app.listen(PORT, () => {
      console.log(`🚀 KRAPI Backend v2.0.0 running on http://${HOST}:${PORT}`);
      console.log(`📚 API Base URL: http://${HOST}:${PORT}/krapi/k1`);
      console.log(`🔐 Default admin: admin@krapi.com / admin123`);

      // Schedule session cleanup
      setInterval(async () => {
        try {
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
        db.close();
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received, shutting down gracefully...");
      server.close(() => {
        console.log("Server closed");
        db.close();
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
