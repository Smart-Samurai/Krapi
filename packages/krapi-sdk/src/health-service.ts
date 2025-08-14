/**
 * Health Service for BackendSDK
 *
 * Provides comprehensive health diagnostics and system health monitoring.
 */

import { DatabaseConnection, Logger } from "./core";

export interface HealthDiagnostics {
  success: boolean;
  message: string;
  details: {
    database: DatabaseHealthStatus;
    system: SystemHealthStatus;
    services: ServiceHealthStatus[];
  };
  recommendations: string[];
  timestamp: string;
}

export interface DatabaseHealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  connection: boolean;
  tables: TableHealthStatus[];
  performance: PerformanceMetrics;
  message: string;
}

export interface TableHealthStatus {
  name: string;
  exists: boolean;
  rowCount: number;
  size: string;
  lastUpdated?: string;
}

export interface PerformanceMetrics {
  queryTime: number;
  connectionPool: {
    total: number;
    idle: number;
    active: number;
  };
  slowQueries: number;
}

export interface SystemHealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    load: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
}

export interface ServiceHealthStatus {
  name: string;
  status: "healthy" | "unhealthy" | "degraded";
  message: string;
  lastCheck: string;
  responseTime?: number;
}

export class HealthService {
  private db: DatabaseConnection;
  private logger: Logger;

  constructor(databaseConnection: DatabaseConnection, logger: Logger) {
    this.db = databaseConnection;
    this.logger = logger;
  }

  async runDiagnostics(): Promise<HealthDiagnostics> {
    try {
      this.logger.info("Starting comprehensive health diagnostics...");

      const [databaseHealth, systemHealth, serviceHealth] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkSystemHealth(),
        this.checkServiceHealth(),
      ]);

      const recommendations = this.generateRecommendations(
        databaseHealth,
        systemHealth,
        serviceHealth
      );
      const overallSuccess = this.determineOverallHealth(
        databaseHealth,
        systemHealth,
        serviceHealth
      );

      const diagnostics: HealthDiagnostics = {
        success: overallSuccess,
        message: overallSuccess
          ? "System is healthy"
          : "System has health issues",
        details: {
          database: databaseHealth,
          system: systemHealth,
          services: serviceHealth,
        },
        recommendations,
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Health diagnostics completed", {
        success: overallSuccess,
      });
      return diagnostics;
    } catch (error) {
      this.logger.error("Health diagnostics failed:", error);
      return {
        success: false,
        message: "Health diagnostics failed",
        details: {
          database: {
            status: "unhealthy",
            connection: false,
            tables: [],
            performance: {
              queryTime: 0,
              connectionPool: { total: 0, idle: 0, active: 0 },
              slowQueries: 0,
            },
            message: "Unable to check database health",
          },
          system: {
            status: "unhealthy",
            memory: { used: 0, total: 0, percentage: 0 },
            cpu: { usage: 0, load: 0 },
            disk: { used: 0, total: 0, percentage: 0 },
            uptime: 0,
          },
          services: [],
        },
        recommendations: [
          "Check system resources",
          "Verify database connection",
        ],
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
    try {
      const startTime = Date.now();

      // Test connection
      await this.db.query("SELECT 1");
      const queryTime = Date.now() - startTime;

      // Check critical tables
      const criticalTables = [
        "admin_users",
        "projects",
        "collections",
        "documents",
        "sessions",
        "api_keys",
        "changelog",
        "email_templates",
        "files",
      ];

      const tableHealth: TableHealthStatus[] = [];
      for (const table of criticalTables) {
        try {
          const existsResult = await this.db.query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
            [table]
          );

          const exists = (existsResult.rows[0] as { exists: boolean }).exists;
          let rowCount = 0;
          let size = "0 KB";

          if (exists) {
            try {
              const countResult = await this.db.query(
                `SELECT COUNT(*) FROM ${table}`
              );
              rowCount = parseInt(
                (countResult.rows[0] as { count: string }).count
              );

              // Get table size (PostgreSQL specific)
              const sizeResult = await this.db.query(
                `SELECT pg_size_pretty(pg_total_relation_size($1)) as size`,
                [table]
              );
              size = (sizeResult.rows[0] as { size: string }).size;
            } catch (error) {
              this.logger.warn(
                `Could not get stats for table ${table}:`,
                error
              );
            }
          }

          tableHealth.push({
            name: table,
            exists,
            rowCount,
            size,
          });
        } catch {
          tableHealth.push({
            name: table,
            exists: false,
            rowCount: 0,
            size: "0 KB",
          });
        }
      }

      // Check connection pool (if available)
      const connectionPool = {
        total: 0,
        idle: 0,
        active: 0,
      };

      // Performance metrics
      const performance: PerformanceMetrics = {
        queryTime,
        connectionPool,
        slowQueries: 0, // Would need to track this over time
      };

      const missingTables = tableHealth.filter((t) => !t.exists);
      const status = missingTables.length === 0 ? "healthy" : "degraded";

      return {
        status,
        connection: true,
        tables: tableHealth,
        performance,
        message:
          missingTables.length === 0
            ? "Database is healthy"
            : `Missing tables: ${missingTables.map((t) => t.name).join(", ")}`,
      };
    } catch (error) {
      this.logger.error("Database health check failed:", error);
      return {
        status: "unhealthy",
        connection: false,
        tables: [],
        performance: {
          queryTime: 0,
          connectionPool: { total: 0, idle: 0, active: 0 },
          slowQueries: 0,
        },
        message: `Connection failed: ${error}`,
      };
    }
  }

  private async checkSystemHealth(): Promise<SystemHealthStatus> {
    try {
      // Get system information
      const memory = await this.getMemoryInfo();
      const cpu = await this.getCpuInfo();
      const disk = await this.getDiskInfo();
      const uptime = process.uptime();

      // Determine overall system status
      const memoryHealthy = memory.percentage < 90;
      const cpuHealthy = cpu.usage < 90;
      const diskHealthy = disk.percentage < 90;

      const status =
        memoryHealthy && cpuHealthy && diskHealthy ? "healthy" : "degraded";

      return {
        status,
        memory,
        cpu,
        disk,
        uptime,
      };
    } catch (error) {
      this.logger.error("System health check failed:", error);
      return {
        status: "unhealthy",
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { usage: 0, load: 0 },
        disk: { used: 0, total: 0, percentage: 0 },
        uptime: process.uptime(),
      };
    }
  }

  private async checkServiceHealth(): Promise<ServiceHealthStatus[]> {
    const services: ServiceHealthStatus[] = [];
    const now = new Date().toISOString();

    // Check database service
    try {
      const startTime = Date.now();
      await this.db.query("SELECT 1");
      const responseTime = Date.now() - startTime;

      services.push({
        name: "Database",
        status: "healthy",
        message: "Database is responding",
        lastCheck: now,
        responseTime,
      });
    } catch {
      services.push({
        name: "Database",
        status: "unhealthy",
        message: "Database is not responding",
        lastCheck: now,
      });
    }

    // Check file system access
    try {
      const fs = await import("fs");
      const path = await import("path");
      const tempDir = path.join(process.cwd(), "temp");

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const testFile = path.join(tempDir, "health-test.txt");
      fs.writeFileSync(testFile, "health test");
      fs.unlinkSync(testFile);
      fs.rmdirSync(tempDir);

      services.push({
        name: "File System",
        status: "healthy",
        message: "File system is accessible",
        lastCheck: now,
      });
    } catch {
      services.push({
        name: "File System",
        status: "unhealthy",
        message: "File system access failed",
        lastCheck: now,
      });
    }

    // Check environment variables
    const requiredEnvVars = ["DB_HOST", "DB_NAME", "DB_USER"];
    const missingEnvVars = requiredEnvVars.filter((env) => !process.env[env]);

    services.push({
      name: "Environment",
      status: missingEnvVars.length === 0 ? "healthy" : "degraded",
      message:
        missingEnvVars.length === 0
          ? "All required environment variables are set"
          : `Missing environment variables: ${missingEnvVars.join(", ")}`,
      lastCheck: now,
    });

    return services;
  }

  private async getMemoryInfo(): Promise<{
    used: number;
    total: number;
    percentage: number;
  }> {
    try {
      const os = await import("os");
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;
      const percentage = (used / total) * 100;

      return {
        used: Math.round(used / 1024 / 1024), // MB
        total: Math.round(total / 1024 / 1024), // MB
        percentage: Math.round(percentage),
      };
    } catch {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  private async getCpuInfo(): Promise<{ usage: number; load: number }> {
    try {
      const os = await import("os");
      const loadAvg = os.loadavg();
      const load = loadAvg[0] || 0; // 1 minute average

      // Simple CPU usage estimation based on load average
      const cpuCount = os.cpus().length;
      const usage = Math.min((load / cpuCount) * 100, 100);

      return {
        usage: Math.round(usage),
        load: Math.round(load * 100) / 100,
      };
    } catch {
      return { usage: 0, load: 0 };
    }
  }

  private async getDiskInfo(): Promise<{
    used: number;
    total: number;
    percentage: number;
  }> {
    // This is a simplified approach - in production you'd want to use a proper disk usage library
    return {
      used: 0, // Would need proper disk usage library
      total: 0, // Would need proper disk usage library
      percentage: 0, // Would need proper disk usage library
    };
  }

  private generateRecommendations(
    databaseHealth: DatabaseHealthStatus,
    systemHealth: SystemHealthStatus,
    serviceHealth: ServiceHealthStatus[]
  ): string[] {
    const recommendations: string[] = [];

    // Database recommendations
    if (databaseHealth.status !== "healthy") {
      if (!databaseHealth.connection) {
        recommendations.push("Check database connection and credentials");
      }
      if (databaseHealth.tables.some((t) => !t.exists)) {
        recommendations.push(
          "Run database initialization to create missing tables"
        );
      }
    }

    // System recommendations
    if (systemHealth.status !== "healthy") {
      if (systemHealth.memory.percentage > 90) {
        recommendations.push(
          "High memory usage detected - consider increasing memory or optimizing"
        );
      }
      if (systemHealth.cpu.usage > 90) {
        recommendations.push(
          "High CPU usage detected - check for resource-intensive processes"
        );
      }
      if (systemHealth.disk.percentage > 90) {
        recommendations.push(
          "High disk usage detected - clean up unnecessary files"
        );
      }
    }

    // Service recommendations
    const unhealthyServices = serviceHealth.filter(
      (s) => s.status !== "healthy"
    );
    if (unhealthyServices.length > 0) {
      recommendations.push(
        `Check the following services: ${unhealthyServices
          .map((s) => s.name)
          .join(", ")}`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("System is healthy - no immediate action required");
    }

    return recommendations;
  }

  private determineOverallHealth(
    databaseHealth: DatabaseHealthStatus,
    systemHealth: SystemHealthStatus,
    serviceHealth: ServiceHealthStatus[]
  ): boolean {
    const databaseHealthy = databaseHealth.status === "healthy";
    const systemHealthy = systemHealth.status === "healthy";
    const servicesHealthy = serviceHealth.every((s) => s.status === "healthy");

    return databaseHealthy && systemHealthy && servicesHealthy;
  }
}
