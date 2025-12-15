import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { DatabaseService } from "@/services/database.service";

/**
 * Handler for queue metrics
 * GET /krapi/k1/queue/metrics
 * 
 * Note: SDK's database.getQueueMetrics() throws error in server mode.
 * Using DatabaseService directly is acceptable for backend-only operations.
 * Frontend route uses SDK method (client mode) which works correctly.
 */
export class QueueMetricsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(_req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        });
        return;
      }

      // Note: SDK's database.getQueueMetrics() throws error in server mode
      // Using DatabaseService directly is acceptable for backend-only operations
      // Frontend route uses SDK method (client mode) which works correctly
      const dbService = DatabaseService.getInstance();
      const metrics = dbService.getQueueMetrics();

      res.json({
        success: true,
        metrics: {
          queueSize: metrics.queueSize,
          processingCount: metrics.processingCount,
          totalProcessed: metrics.totalProcessed,
          totalErrors: metrics.totalErrors,
          averageWaitTime: metrics.averageWaitTime,
          averageProcessTime: metrics.averageProcessTime,
          queueItems: metrics.queueItems,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Queue metrics error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get queue metrics",
      });
    }
  }
}

