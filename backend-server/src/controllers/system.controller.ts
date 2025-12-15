import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse, SystemSettings } from "@/types";

/**
 * System Controller
 * 
 * Handles system-level HTTP requests including:
 * - System settings management
 * - Health checks
 * - System information
 * 
 * Follows SDK-first architecture: all methods use BackendSDK when available.
 * 
 * @class SystemController
 * @example
 * const controller = new SystemController();
 * controller.setBackendSDK(backendSDK);
 * // Controller is ready to handle system requests
 */
export class SystemController {
  private backendSDK: BackendSDK | null = null;

  /**
   * Set BackendSDK instance for SDK-first architecture
   * 
   * @param {BackendSDK} sdk - BackendSDK instance
   * @returns {void}
   */
  setBackendSDK(sdk: BackendSDK): void {
    this.backendSDK = sdk;
  }

  /**
   * Get system settings
   * 
   * GET /krapi/k1/system/settings
   * 
   * Retrieves current system settings including debug mode, log level,
   * rate limiting, security, email, and database configuration.
   * 
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @returns {Promise<void>}
   * 
   * @throws {500} If settings retrieval fails
   * 
   * @example
   * // Request: GET /krapi/k1/system/settings
   * // Response: { success: true, data: {...} }
   */
  getSettings = async (_req: Request, res: Response): Promise<void> => {
    try {
      // SDK-FIRST ARCHITECTURE: Use ONLY SDK methods - NO database fallbacks
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      try {
        // Use SDK system.getSettings method
        // Type assertion needed as SDK types may not be fully updated
        const systemService = this.backendSDK.system as unknown as {
          getSettings: () => Promise<SystemSettings>;
        };
        const settings = await systemService.getSettings();

      res.status(200).json({
        success: true,
        data: settings,
      } as ApiResponse<SystemSettings>);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to retrieve settings",
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
   * Update system settings
   * 
   * PUT /krapi/k1/system/settings
   * 
   * Updates system settings. Only updates provided fields.
   * 
   * @param {Request} req - Express request with settings in body
   * @param {Response} res - Express response
   * @returns {Promise<void>}
   * 
   * @throws {500} If settings update fails
   * 
   * @example
   * // Request: PUT /krapi/k1/system/settings
   * // Body: { debug_mode: true, log_level: 'debug' }
   * // Response: { success: true, data: {...} }
   */
  updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const updates = req.body as Partial<SystemSettings>;

      // SDK-FIRST ARCHITECTURE: Use ONLY SDK methods - NO database fallbacks
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
        }

      try {
        // Use SDK system.updateSettings method
        // Type assertion needed as SDK types may not be fully updated
        const systemService = this.backendSDK.system as unknown as {
          updateSettings: (settings: Partial<SystemSettings>) => Promise<SystemSettings>;
        };
        const updatedSettings = await systemService.updateSettings(updates);

      res.status(200).json({
        success: true,
        data: updatedSettings,
        message: "Settings updated successfully",
      } as ApiResponse<SystemSettings>);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to update settings",
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
   * Test email configuration
   * POST /krapi/k1/system/test-email
   */
  testEmailConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const config = req.body;
      const { projectId } = req.query;

      // SDK-FIRST ARCHITECTURE: Use ONLY SDK methods - NO database fallbacks
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      try {
        // Use SDK email.testConfig method
        // Type assertion needed as SDK types may not be fully updated
        const emailService = this.backendSDK.email as unknown as {
          testConfig: (projectId?: string, config?: unknown) => Promise<{
            success: boolean;
            error?: string;
          }>;
        };
        const testResult = await emailService.testConfig(
          projectId as string | undefined,
          config
        );

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
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : "Email configuration test failed",
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
  getSystemInfo = async (_req: Request, res: Response): Promise<void> => {
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
  getDatabaseHealth = async (_req: Request, res: Response): Promise<void> => {
    try {
      // SDK-FIRST ARCHITECTURE: Use ONLY SDK methods - NO database fallbacks
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      try {
        // Use SDK performHealthCheck method
        const healthCheck = await this.backendSDK.performHealthCheck();

      const healthStatus = {
          isHealthy: healthCheck.isHealthy,
        timestamp: new Date().toISOString(),
        database: "PostgreSQL",
          connection: healthCheck.isHealthy ? "connected" : "disconnected",
          details: healthCheck,
      };

      res.status(200).json({
        success: true,
        data: healthStatus,
      } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to check database health",
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
   * Reset all database data (hard reset)
   * 
   * POST /krapi/k1/system/reset-database
   * 
   * WARNING: This is a destructive operation that will delete ALL data.
   * Requires MASTER scope or ADMIN_DELETE scope.
   * 
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @returns {Promise<void>}
   */
  resetDatabase = async (_req: Request, res: Response): Promise<void> => {
    try {
      // SDK-FIRST ARCHITECTURE: Use ONLY SDK methods - NO database fallbacks
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      try {
        // Import DatabaseService to access resetAllData
        const { DatabaseService } = await import("../services/database.service");
        const dbService = DatabaseService.getInstance();

        const result = await dbService.resetAllData();

        res.status(200).json({
          success: true,
          data: result,
          message: "Database reset successfully. All data has been deleted.",
        } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to reset database",
        } as ApiResponse);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse);
    }
  };
}

export default new SystemController();
