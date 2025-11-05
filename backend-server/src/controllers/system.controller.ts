import { Request, Response } from "express";

import { DatabaseService } from "../services/database.service";
import { EmailService } from "../services/email.service";

import { ApiResponse, SystemSettings } from "@/types";

export class SystemController {
  private db: DatabaseService;
  private emailService: EmailService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.emailService = EmailService.getInstance();
  }

  /**
   * Get system settings
   * GET /krapi/k1/system/settings
   */
  getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get system settings from database or return defaults
      const settings: SystemSettings = {
        debug_mode: process.env.DEBUG_MODE === "true",
        log_level:
          (process.env.LOG_LEVEL as "error" | "warn" | "info" | "debug") ||
          "info",
        rate_limiting: {
          enabled: process.env.RATE_LIMITING_ENABLED === "true",
          requests_per_minute: parseInt(
            process.env.RATE_LIMIT_PER_MINUTE || "100"
          ),
          requests_per_hour: parseInt(
            process.env.RATE_LIMIT_PER_HOUR || "1000"
          ),
        },
        general: {
          siteName: "KRAPI Manager",
          siteUrl: process.env.SITE_URL || "http://localhost:3469",
          adminEmail: process.env.ADMIN_EMAIL || "admin@krapi.com",
          timezone: process.env.TIMEZONE || "UTC",
          defaultLanguage: process.env.DEFAULT_LANGUAGE || "en",
        },
        security: {
          jwt_secret: process.env.JWT_SECRET || "default-jwt-secret",
          requireTwoFactor: process.env.REQUIRE_2FA === "true",
          session_timeout: parseInt(process.env.SESSION_TIMEOUT || "60"),
          passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "8"),
          passwordRequireUppercase:
            process.env.PASSWORD_REQUIRE_UPPERCASE !== "false",
          passwordRequireNumbers:
            process.env.PASSWORD_REQUIRE_NUMBERS !== "false",
          passwordRequireSymbols:
            process.env.PASSWORD_REQUIRE_SYMBOLS === "true",
          max_login_attempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5"),
        },
        email: {
          smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
          smtpPort: parseInt(process.env.SMTP_PORT || "587"),
          smtpUsername: process.env.SMTP_USERNAME || "",
          smtpPassword: process.env.SMTP_PASSWORD || "",
          smtpSecure: process.env.SMTP_SECURE === "true",
          fromEmail: process.env.FROM_EMAIL || "noreply@krapi.com",
          fromName: process.env.FROM_NAME || "KRAPI",
        },
        database: {
          connection_string:
            process.env.DATABASE_URL || "postgresql://localhost:5432/krapi",
          max_connections: parseInt(process.env.DB_MAX_CONNECTIONS || "100"),
          connectionPoolSize: parseInt(process.env.DB_POOL_SIZE || "20"),
          queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || "30000"),
          enableQueryLogging: process.env.DB_ENABLE_LOGGING === "true",
          backupSchedule:
            (process.env.DB_BACKUP_SCHEDULE as
              | "daily"
              | "weekly"
              | "monthly") || "daily",
          backupRetentionDays: parseInt(
            process.env.DB_BACKUP_RETENTION || "30"
          ),
        },
      };

      res.status(200).json({
        success: true,
        data: settings,
      } as ApiResponse<SystemSettings>);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  /**
   * Update system settings
   * PUT /krapi/k1/system/settings
   */
  updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const updates = req.body as Partial<SystemSettings>;

      // Validate and update environment variables or database
      if (updates.general) {
        if (updates.general.siteName) {
          process.env.SITE_NAME = updates.general.siteName;
        }
        if (updates.general.siteUrl) {
          process.env.SITE_URL = updates.general.siteUrl;
        }
        if (updates.general.adminEmail) {
          process.env.ADMIN_EMAIL = updates.general.adminEmail;
        }
        if (updates.general.timezone) {
          process.env.TIMEZONE = updates.general.timezone;
        }
        if (updates.general.defaultLanguage) {
          process.env.DEFAULT_LANGUAGE = updates.general.defaultLanguage;
        }
      }

      if (updates.security) {
        if (updates.security.session_timeout !== undefined) {
          const timeout = typeof updates.security.session_timeout === 'string'
            ? parseInt(updates.security.session_timeout, 10)
            : updates.security.session_timeout;
          if (!isNaN(timeout)) {
            process.env.SESSION_TIMEOUT = timeout.toString();
          }
        }
        if (updates.security.passwordMinLength !== undefined) {
          const minLength = typeof updates.security.passwordMinLength === 'string'
            ? parseInt(updates.security.passwordMinLength, 10)
            : updates.security.passwordMinLength;
          if (!isNaN(minLength)) {
            process.env.PASSWORD_MIN_LENGTH = minLength.toString();
          }
        }
        if (updates.security.max_login_attempts !== undefined) {
          const maxAttempts = typeof updates.security.max_login_attempts === 'string'
            ? parseInt(updates.security.max_login_attempts, 10)
            : updates.security.max_login_attempts;
          if (!isNaN(maxAttempts)) {
            process.env.MAX_LOGIN_ATTEMPTS = maxAttempts.toString();
          }
        }
      }

      if (updates.rate_limiting) {
        if (updates.rate_limiting.requests_per_minute !== undefined) {
          const rpm = typeof updates.rate_limiting.requests_per_minute === 'string'
            ? parseInt(updates.rate_limiting.requests_per_minute, 10)
            : updates.rate_limiting.requests_per_minute;
          if (!isNaN(rpm)) {
            process.env.RATE_LIMIT_PER_MINUTE = rpm.toString();
          }
        }
        if (updates.rate_limiting.requests_per_hour !== undefined) {
          const rph = typeof updates.rate_limiting.requests_per_hour === 'string'
            ? parseInt(updates.rate_limiting.requests_per_hour, 10)
            : updates.rate_limiting.requests_per_hour;
          if (!isNaN(rph)) {
            process.env.RATE_LIMIT_PER_HOUR = rph.toString();
          }
        }
      }

      if (updates.email) {
        if (updates.email.smtpHost) {
          process.env.SMTP_HOST = updates.email.smtpHost;
        }
        if (updates.email.smtpPort !== undefined) {
          const port = typeof updates.email.smtpPort === 'string'
            ? parseInt(updates.email.smtpPort, 10)
            : updates.email.smtpPort;
          if (!isNaN(port)) {
            process.env.SMTP_PORT = port.toString();
          }
        }
        if (updates.email.smtpUsername) {
          process.env.SMTP_USERNAME = updates.email.smtpUsername;
        }
        if (updates.email.smtpPassword) {
          process.env.SMTP_PASSWORD = updates.email.smtpPassword;
        }
        if (updates.email.fromEmail) {
          process.env.FROM_EMAIL = updates.email.fromEmail;
        }
        if (updates.email.fromName) {
          process.env.FROM_NAME = updates.email.fromName;
        }
      }

      if (updates.database) {
        if (updates.database.connectionPoolSize !== undefined) {
          // Coerce to number if it's a string
          const poolSize = typeof updates.database.connectionPoolSize === 'string' 
            ? parseInt(updates.database.connectionPoolSize, 10)
            : updates.database.connectionPoolSize;
          if (!isNaN(poolSize)) {
            process.env.DB_POOL_SIZE = poolSize.toString();
          }
        }
        if (updates.database.queryTimeout !== undefined) {
          // Coerce to number if it's a string
          const timeout = typeof updates.database.queryTimeout === 'string'
            ? parseInt(updates.database.queryTimeout, 10)
            : updates.database.queryTimeout;
          if (!isNaN(timeout)) {
            process.env.DB_QUERY_TIMEOUT = timeout.toString();
          }
        }
        if (updates.database.max_connections !== undefined) {
          // Coerce to number if it's a string
          const maxConn = typeof updates.database.max_connections === 'string'
            ? parseInt(updates.database.max_connections, 10)
            : updates.database.max_connections;
          if (!isNaN(maxConn)) {
            process.env.DB_MAX_CONNECTIONS = maxConn.toString();
          }
        }
        if (updates.database.backupRetentionDays !== undefined) {
          // Coerce to number if it's a string
          const retention = typeof updates.database.backupRetentionDays === 'string'
            ? parseInt(updates.database.backupRetentionDays, 10)
            : updates.database.backupRetentionDays;
          if (!isNaN(retention)) {
            process.env.DB_BACKUP_RETENTION = retention.toString();
          }
        }
      }

      // Return updated settings
      const updatedSettings: SystemSettings = {
        debug_mode: process.env.DEBUG_MODE === "true",
        log_level:
          (process.env.LOG_LEVEL as "error" | "warn" | "info" | "debug") ||
          "info",
        rate_limiting: {
          enabled: process.env.RATE_LIMITING_ENABLED === "true",
          requests_per_minute: parseInt(
            process.env.RATE_LIMIT_PER_MINUTE || "100"
          ),
          requests_per_hour: parseInt(
            process.env.RATE_LIMIT_PER_HOUR || "1000"
          ),
        },
        general: {
          siteName: process.env.SITE_NAME || "KRAPI Manager",
          siteUrl: process.env.SITE_URL || "http://localhost:3469",
          adminEmail: process.env.ADMIN_EMAIL || "admin@krapi.com",
          timezone: process.env.TIMEZONE || "UTC",
          defaultLanguage: process.env.DEFAULT_LANGUAGE || "en",
        },
        security: {
          jwt_secret: process.env.JWT_SECRET || "default-jwt-secret",
          requireTwoFactor: process.env.REQUIRE_2FA === "true",
          session_timeout: parseInt(process.env.SESSION_TIMEOUT || "60"),
          passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "8"),
          passwordRequireUppercase:
            process.env.PASSWORD_REQUIRE_UPPERCASE !== "false",
          passwordRequireNumbers:
            process.env.PASSWORD_REQUIRE_NUMBERS !== "false",
          passwordRequireSymbols:
            process.env.PASSWORD_REQUIRE_SYMBOLS === "true",
          max_login_attempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5"),
        },
        email: {
          smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
          smtpPort: parseInt(process.env.SMTP_PORT || "587"),
          smtpUsername: process.env.SMTP_USERNAME || "",
          smtpPassword: process.env.SMTP_PASSWORD || "",
          smtpSecure: process.env.SMTP_SECURE === "true",
          fromEmail: process.env.FROM_EMAIL || "noreply@krapi.com",
          fromName: process.env.FROM_NAME || "KRAPI",
        },
        database: {
          connection_string:
            process.env.DATABASE_URL || "postgresql://localhost:5432/krapi",
          max_connections: parseInt(process.env.DB_MAX_CONNECTIONS || "100"),
          connectionPoolSize: parseInt(process.env.DB_POOL_SIZE || "20"),
          queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || "30000"),
          enableQueryLogging: process.env.DB_ENABLE_LOGGING === "true",
          backupSchedule:
            (process.env.DB_BACKUP_SCHEDULE as
              | "daily"
              | "weekly"
              | "monthly") || "daily",
          backupRetentionDays: parseInt(
            process.env.DB_BACKUP_RETENTION || "30"
          ),
        },
      };

      res.status(200).json({
        success: true,
        data: updatedSettings,
        message: "Settings updated successfully",
      } as ApiResponse<SystemSettings>);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  /**
   * Test email configuration
   * POST /krapi/k1/system/test-email
   */
  testEmailConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const config = req.body;

      // Test the email configuration
      const testResult = await this.emailService.testEmailConfig(config);

      if (testResult.success) {
        res.status(200).json({
          success: true,
          data: { success: true },
          message: "Email configuration test successful",
        } as ApiResponse<{ success: boolean }>);
      } else {
        res.status(400).json({
          success: false,
          error: testResult.error || "Email configuration test failed",
        } as ApiResponse);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  /**
   * Get system information
   * GET /krapi/k1/system/info
   */
  getSystemInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const systemInfo = {
        version: "2.0.0",
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
      };

      res.status(200).json({
        success: true,
        data: systemInfo,
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };

  /**
   * Get database health status
   * GET /krapi/k1/system/database-health
   */
  getDatabaseHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check database connection
      const health = await this.db.checkHealth();
      const isHealthy = health.healthy;

      const healthStatus = {
        isHealthy,
        timestamp: new Date().toISOString(),
        database: "PostgreSQL",
        connection: isHealthy ? "connected" : "disconnected",
      };

      res.status(200).json({
        success: true,
        data: healthStatus,
      } as ApiResponse);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };
}

export default new SystemController();
