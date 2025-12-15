import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { DiagnosticsService } from "@/services/diagnostics.service";

/**
 * Handler for health diagnostics
 * POST /krapi/k1/health/diagnostics
 * 
 * Uses custom DiagnosticsService for fast, reliable diagnostics
 * that complete in < 1 second without hanging.
 */
export class HealthDiagnosticsHandler {
  private diagnosticsService: DiagnosticsService;

  constructor(backendSDK: BackendSDK) {
    this.diagnosticsService = new DiagnosticsService(backendSDK);
  }

  async handle(_req: Request, res: Response): Promise<void> {
    try {
      // Use custom diagnostics service - fast, reliable, no hanging
      // All tests have individual timeouts and complete quickly
      const diagnosticsResult = await this.diagnosticsService.runDiagnostics();

      // Transform to expected response format
      const transformedDiagnostics = {
        tests: diagnosticsResult.tests.map((test) => ({
          name: test.name,
          status: test.passed ? ("pass" as const) : ("fail" as const),
          message: test.message,
          duration: test.duration,
        })),
        summary: diagnosticsResult.summary,
      };

      res.json({
        success: true,
        data: transformedDiagnostics,
      });
    } catch (error) {
      console.error("Health diagnostics error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Health diagnostics failed";

      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

}
