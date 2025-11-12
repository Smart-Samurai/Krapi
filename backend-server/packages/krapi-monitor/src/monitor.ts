import { EventEmitter } from "events";
import KrapiLogger from "@krapi/logger";
import KrapiErrorHandler from "@krapi/error-handler";

export interface HealthCheck {
  name: string;
  status: "healthy" | "warning" | "critical";
  message: string;
  timestamp: string;
  duration?: number;
  details?: any;
}

export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  database: {
    connected: boolean;
    responseTime?: number;
    activeConnections?: number;
  };
  services: {
    backend: boolean;
    frontend: boolean;
    database: boolean;
  };
  errors: {
    total: number;
    last24h: number;
    critical: number;
  };
  performance: {
    avgResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
  };
}

export interface MonitorConfig {
  healthCheckInterval: number;
  metricsInterval: number;
  enableAutoRecovery: boolean;
  alertThresholds: {
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
    responseTime: number;
  };
  enableNotifications: boolean;
  notificationEndpoint?: string;
}

export class KrapiMonitor extends EventEmitter {
  private static instance: KrapiMonitor;
  private config: MonitorConfig;
  private logger: KrapiLogger;
  private errorHandler: KrapiErrorHandler;
  private healthChecks: Map<string, HealthCheck> = new Map();
  private metrics: SystemMetrics[] = [];
  private isRunning = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private startTime = Date.now();
  private lastRecoveryAttempt: Map<string, number> = new Map();
  private recoveryCooldown = 5 * 60 * 1000; // 5 minutes cooldown between recovery attempts

  private constructor(config: Partial<MonitorConfig> = {}) {
    super();
    this.config = {
      healthCheckInterval:
        config.healthCheckInterval ||
        parseInt(process.env.HEALTH_CHECK_INTERVAL || "30000"),
      metricsInterval: config.metricsInterval || 10000,
      enableAutoRecovery: config.enableAutoRecovery ?? true,
      alertThresholds: {
        memoryUsage: config.alertThresholds?.memoryUsage || 80,
        cpuUsage: config.alertThresholds?.cpuUsage || 80,
        errorRate: config.alertThresholds?.errorRate || 5,
        responseTime: config.alertThresholds?.responseTime || 1000,
      },
      enableNotifications: config.enableNotifications ?? false,
      notificationEndpoint: config.notificationEndpoint,
    };

    this.logger = KrapiLogger.getInstance();
    this.errorHandler = new KrapiErrorHandler();
  }

  public static getInstance(config?: Partial<MonitorConfig>): KrapiMonitor {
    if (!KrapiMonitor.instance) {
      KrapiMonitor.instance = new KrapiMonitor(config);
    }
    return KrapiMonitor.instance;
  }

  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.logger.info("monitor", "Starting KRAPI system monitor");

    // Start health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);

    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);

    // Perform initial health check
    this.performHealthChecks();
    this.collectMetrics();

    this.logger.info("monitor", "System monitor started successfully");
  }

  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.logger.info("monitor", "System monitor stopped");
  }

  private async performHealthChecks(): Promise<void> {
    const checks = [
      this.checkSystemHealth,
      this.checkDatabaseHealth,
      this.checkMemoryHealth,
      this.checkErrorRateHealth,
      this.checkServiceHealth,
    ];

    for (const check of checks) {
      try {
        await check.call(this);
      } catch (error) {
        this.logger.error(
          "monitor",
          `Health check failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { error }
        );
      }
    }

    // Check for critical issues and trigger alerts
    this.checkForAlerts();
  }

  private async checkSystemHealth(): Promise<void> {
    const start = Date.now();
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;

    const health: HealthCheck = {
      name: "system",
      status:
        memoryUsagePercent > this.config.alertThresholds.memoryUsage
          ? "warning"
          : "healthy",
      message: `System running for ${Math.floor(
        uptime / 60
      )} minutes, memory usage: ${memoryUsagePercent.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      details: {
        uptime,
        memoryUsage: memoryUsagePercent,
        memory,
      },
    };

    this.healthChecks.set("system", health);
    this.emit("healthCheck", health);
  }

  private async checkDatabaseHealth(): Promise<void> {
    const start = Date.now();

    try {
      // This would be implemented based on your database service
      // For now, we'll simulate a database check
      const responseTime = Date.now() - start;

      const health: HealthCheck = {
        name: "database",
        status: responseTime > 1000 ? "warning" : "healthy",
        message: `Database responding in ${responseTime}ms`,
        timestamp: new Date().toISOString(),
        duration: responseTime,
        details: {
          responseTime,
          connected: true,
        },
      };

      this.healthChecks.set("database", health);
      this.emit("healthCheck", health);
    } catch (error) {
      const health: HealthCheck = {
        name: "database",
        status: "critical",
        message: `Database connection failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        timestamp: new Date().toISOString(),
        duration: Date.now() - start,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };

      this.healthChecks.set("database", health);
      this.emit("healthCheck", health);
    }
  }

  private async checkMemoryHealth(): Promise<void> {
    const memory = process.memoryUsage();
    // Calculate RSS (Resident Set Size) usage as a percentage of total system memory
    // This is more accurate than heap usage for overall memory pressure
    // For now, use a simple check: if RSS is growing, it's a warning, not critical
    const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
    
    // Only mark as critical if memory usage is very high (>90%) and RSS is also high
    // This prevents false positives from normal heap usage
    const isCritical = memoryUsagePercent > 90 && memory.rss > 500 * 1024 * 1024; // >500MB RSS
    const isWarning = memoryUsagePercent > this.config.alertThresholds.memoryUsage;

    const health: HealthCheck = {
      name: "memory",
      status: isCritical ? "critical" : isWarning ? "warning" : "healthy",
      message: `Memory usage: ${memoryUsagePercent.toFixed(1)}% (RSS: ${(memory.rss / 1024 / 1024).toFixed(1)}MB)`,
      timestamp: new Date().toISOString(),
      details: {
        usage: memoryUsagePercent,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        rss: memory.rss,
      },
    };

    this.healthChecks.set("memory", health);
    this.emit("healthCheck", health);
  }

  private async checkErrorRateHealth(): Promise<void> {
    const errorStats = this.errorHandler.getRecoveryStats();
    const totalErrors = Object.values(errorStats).reduce(
      (sum: number, count: any) =>
        sum + (typeof count === "number" ? count : 0),
      0
    );
    const errorRate =
      totalErrors > 0
        ? (totalErrors / (Date.now() - this.startTime)) * 1000 * 60
        : 0; // errors per minute

    const health: HealthCheck = {
      name: "errors",
      status:
        errorRate > this.config.alertThresholds.errorRate
          ? "warning"
          : "healthy",
      message: `Error rate: ${errorRate.toFixed(2)} errors/minute`,
      timestamp: new Date().toISOString(),
      details: {
        errorRate,
        totalErrors,
        errorStats,
      },
    };

    this.healthChecks.set("errors", health);
    this.emit("healthCheck", health);
  }

  private async checkServiceHealth(): Promise<void> {
    // Check if services are running
    const services = {
      backend: true, // This would be checked against actual service status
      frontend: true,
      database: true,
    };

    const allHealthy = Object.values(services).every((status) => status);
    const health: HealthCheck = {
      name: "services",
      status: allHealthy ? "healthy" : "critical",
      message: `Services status: ${Object.entries(services)
        .map(([name, status]) => `${name}: ${status ? "up" : "down"}`)
        .join(", ")}`,
      timestamp: new Date().toISOString(),
      details: services,
    };

    this.healthChecks.set("services", health);
    this.emit("healthCheck", health);
  }

  private checkForAlerts(): void {
    const criticalChecks = Array.from(this.healthChecks.values()).filter(
      (check) => check.status === "critical"
    );
    const warningChecks = Array.from(this.healthChecks.values()).filter(
      (check) => check.status === "warning"
    );

    if (criticalChecks.length > 0) {
      this.emit("alert", {
        level: "critical",
        message: `${criticalChecks.length} critical health check(s) failed`,
        checks: criticalChecks,
      });

      if (this.config.enableAutoRecovery) {
        this.attemptAutoRecovery(criticalChecks);
      }
    }

    if (warningChecks.length > 0) {
      this.emit("alert", {
        level: "warning",
        message: `${warningChecks.length} warning health check(s)`,
        checks: warningChecks,
      });
    }
  }

  private async attemptAutoRecovery(
    criticalChecks: HealthCheck[]
  ): Promise<void> {
    const now = Date.now();
    const checksToRecover: HealthCheck[] = [];

    // Filter out checks that are in cooldown period
    for (const check of criticalChecks) {
      const lastAttempt = this.lastRecoveryAttempt.get(check.name) || 0;
      const timeSinceLastAttempt = now - lastAttempt;

      if (timeSinceLastAttempt >= this.recoveryCooldown) {
        checksToRecover.push(check);
      } else {
        const remainingCooldown = Math.ceil((this.recoveryCooldown - timeSinceLastAttempt) / 1000);
        this.logger.debug(
          "monitor",
          `Skipping auto-recovery for ${check.name} (cooldown: ${remainingCooldown}s remaining)`
        );
      }
    }

    if (checksToRecover.length === 0) {
      return; // All checks are in cooldown, skip recovery attempt
    }

    this.logger.warn(
      "monitor",
      "Attempting auto-recovery for critical issues",
      { checks: checksToRecover.map(c => c.name) }
    );

    for (const check of checksToRecover) {
      try {
        // Record recovery attempt time
        this.lastRecoveryAttempt.set(check.name, now);

        switch (check.name) {
          case "database":
            // Attempt database recovery
            await this.recoverDatabase();
            break;
          case "memory":
            // Attempt memory cleanup
            await this.cleanupMemory();
            break;
          case "services":
            // Attempt service recovery
            await this.recoverServices();
            break;
        }
      } catch (error) {
        this.logger.error("monitor", `Auto-recovery failed for ${check.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async recoverDatabase(): Promise<void> {
    this.logger.info("monitor", "Attempting database recovery");
    // Implementation would depend on your database service
  }

  private async cleanupMemory(): Promise<void> {
    this.logger.info("monitor", "Attempting memory cleanup");
    
    // Only run GC if it's explicitly enabled (Node.js --expose-gc flag)
    if (global.gc) {
      try {
        global.gc();
        this.logger.info("monitor", "Memory cleanup completed (GC triggered)");
      } catch (error) {
        this.logger.warn("monitor", "GC failed", { error });
      }
    } else {
      // If GC isn't available, log that memory cleanup isn't possible
      // Don't spam the logs - only log once per recovery attempt
      this.logger.debug(
        "monitor",
        "Memory cleanup skipped - GC not available (run Node with --expose-gc for automatic cleanup)"
      );
    }
  }

  private async recoverServices(): Promise<void> {
    this.logger.info("monitor", "Attempting service recovery");
    // Implementation would depend on your service management
  }

  private collectMetrics(): void {
    const memory = process.memoryUsage();
    const uptime = process.uptime();

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      uptime,
      memory,
      cpu: {
        usage: 0, // This would be calculated using a CPU monitoring library
        loadAverage: [0, 0, 0], // This would be actual load average
      },
      database: {
        connected: true,
        responseTime: 50, // This would be actual response time
        activeConnections: 1,
      },
      services: {
        backend: true,
        frontend: true,
        database: true,
      },
      errors: {
        total: Object.values(this.errorHandler.getRecoveryStats()).reduce(
          (sum: number, count: any) =>
            sum + (typeof count === "number" ? count : 0),
          0
        ),
        last24h: 0, // This would be calculated from error history
        critical: 0,
      },
      performance: {
        avgResponseTime: 100, // This would be calculated from request logs
        requestsPerMinute: 10, // This would be calculated from request logs
        errorRate: 0.1, // This would be calculated from error logs
      },
    };

    this.metrics.push(metrics);

    // Keep only last 100 metrics entries
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    this.emit("metrics", metrics);
  }

  public getHealthStatus(): { [key: string]: HealthCheck } {
    return Object.fromEntries(this.healthChecks);
  }

  public getMetrics(limit = 10): SystemMetrics[] {
    return this.metrics.slice(-limit);
  }

  public getOverallHealth(): "healthy" | "warning" | "critical" {
    const checks = Array.from(this.healthChecks.values());
    if (checks.some((check) => check.status === "critical")) return "critical";
    if (checks.some((check) => check.status === "warning")) return "warning";
    return "healthy";
  }

  public isHealthy(): boolean {
    return this.getOverallHealth() === "healthy";
  }
}

export default KrapiMonitor;
