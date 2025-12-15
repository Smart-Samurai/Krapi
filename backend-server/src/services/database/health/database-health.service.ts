import { MultiDatabaseManager } from "../../multi-database-manager.service";

/**
 * Database Health Service
 * 
 * Handles database health checks and status monitoring.
 */
export class DatabaseHealthService {
  constructor(private dbManager: MultiDatabaseManager) {}

  /**
   * Check database health
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    message: string;
    details?: {
      missingTables?: string[];
      lastCheck?: Date;
      connectionPool?: Record<string, unknown>;
      error?: string;
    };
  }> {
    try {
      // Test connection
      await this.dbManager.queryMain("SELECT 1");

      // Check critical tables
      const criticalTables = [
        "admin_users",
        "projects",
        "sessions",
        "api_keys",
      ];

      const missingTables: string[] = [];
      for (const table of criticalTables) {
        const result = await this.dbManager.queryMain(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          [table]
        );
        if (result.rows.length === 0) {
          missingTables.push(table);
        }
      }

      if (missingTables.length > 0) {
        return {
          healthy: false,
          message: `Missing critical tables: ${missingTables.join(", ")}`,
          details: {
            missingTables,
            lastCheck: new Date(),
          },
        };
      }

      return {
        healthy: true,
        message: "Database is healthy",
        details: {
          lastCheck: new Date(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        healthy: false,
        message: `Database health check failed: ${errorMessage}`,
        details: {
          error: errorMessage,
          lastCheck: new Date(),
        },
      };
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<{
    status: "healthy" | "unhealthy" | "degraded";
    checks: {
      database: { status: boolean; message: string };
      tables: { status: boolean; message: string; missing?: string[] };
      defaultAdmin: { status: boolean; message: string };
      initialization: {
        status: boolean;
        message: string;
        details?: Record<string, unknown>;
      };
    };
    timestamp: string;
  }> {
    const checks = {
      database: { status: false, message: "Not checked" },
      tables: {
        status: false,
        message: "Not checked",
        missing: [] as string[],
      },
      defaultAdmin: { status: false, message: "Not checked" },
      initialization: { status: false, message: "Not checked", details: {} },
    };

    try {
      // Check database connection (main DB)
      try {
        await this.dbManager.queryMain("SELECT 1");
        checks.database = { status: true, message: "Connected" };
      } catch (error) {
        checks.database = {
          status: false,
          message: `Connection failed: ${error}`,
        };
      }

      // Check required tables exist
      const requiredTables = [
        "admin_users",
        "projects",
        "project_admins",
        "project_users",
        "collections",
        "documents",
        "files",
        "sessions",
        "changelog",
        "system_checks",
        "api_keys",
      ];

      try {
        // SQLite uses sqlite_master instead of information_schema
        // Check each table individually (main DB tables)
        const foundTables: string[] = [];
        for (const table of requiredTables) {
          const result = await this.dbManager.queryMain(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
            [table]
          );
          if (result.rows.length > 0) {
            foundTables.push(table);
          }
        }
        const tableCheckResult = {
          rows: foundTables.map((t) => ({ table_name: t })),
        };

        const existingTables = tableCheckResult.rows.map(
          (row) => row.table_name
        );
        const missingTables = requiredTables.filter(
          (table) => !existingTables.includes(table)
        );

        if (missingTables.length === 0) {
          checks.tables = {
            status: true,
            message: "All required tables exist",
            missing: [],
          };
        } else {
          checks.tables = {
            status: false,
            message: `Missing tables: ${missingTables.join(", ")}`,
            missing: missingTables,
          };
        }
      } catch (error) {
        checks.tables = {
          status: false,
          message: `Table check failed: ${error}`,
          missing: [],
        };
      }

      // Check default admin exists and is active (main DB)
      try {
        const adminResult = await this.dbManager.queryMain(
          "SELECT id, is_active FROM admin_users WHERE username = $1",
          ["admin"]
        );

        if (
          adminResult.rows.length > 0 &&
          (adminResult.rows[0] as { is_active: unknown })?.is_active
        ) {
          checks.defaultAdmin = {
            status: true,
            message: "Default admin exists and is active",
          };
        } else if (adminResult.rows.length > 0) {
          checks.defaultAdmin = {
            status: false,
            message: "Default admin exists but is inactive",
          };
        } else {
          checks.defaultAdmin = {
            status: false,
            message: "Default admin does not exist",
          };
        }
      } catch (error) {
        checks.defaultAdmin = {
          status: false,
          message: `Admin check failed: ${error}`,
        };
      }

      // Check initialization status (main DB)
      try {
        const initResult = await this.dbManager.queryMain(
          `SELECT status, details, last_checked 
           FROM system_checks 
           WHERE check_type = 'database_initialization'`
        );

        if (
          initResult.rows.length > 0 &&
          (initResult.rows[0] as { status: string })?.status === "success"
        ) {
          const initRow = initResult.rows[0] as {
            status: string;
            details: unknown;
          };
          checks.initialization = {
            status: true,
            message: "Database properly initialized",
            details: initRow.details as Record<string, unknown>,
          };
        } else {
          checks.initialization = {
            status: false,
            message: "Database not properly initialized",
            details: {},
          };
        }
      } catch {
        // Table might not exist yet
        checks.initialization = {
          status: false,
          message: "Initialization check not available",
          details: {},
        };
      }

      // Determine overall status
      const allHealthy = Object.values(checks).every((check) => check.status);
      const hasUnhealthy = Object.values(checks).some((check) => !check.status);

      return {
        status: allHealthy
          ? "healthy"
          : hasUnhealthy
          ? "unhealthy"
          : "degraded",
        checks,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: "unhealthy",
        checks,
        timestamp: new Date().toISOString(),
      };
    }
  }
}








