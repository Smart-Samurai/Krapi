import { Request, Response } from "express";

/**
 * Handler for basic health check
 * GET /krapi/k1/health
 */
export class HealthCheckHandler {
  async handle(_req: Request, res: Response): Promise<void> {
    try {
      // Basic health check - return SDK-compatible format
      // SDK expects: { healthy: boolean, message: string, version: string, details?: Record<string, unknown> }
      const health = {
        healthy: true,
        message: "Server is healthy",
        version: process.env.npm_package_version || "1.0.0",
        details: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
          nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
        },
      };

      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({
        success: false,
        error: "Health check failed",
      });
    }
  }
}
