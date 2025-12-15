import { Request, Response } from "express";

import { isTestingEnabled } from "./testing-utils";

import { AuthenticatedRequest, ApiResponse } from "@/types";

/**
 * Handler for resetting test data
 * POST /krapi/k1/testing/reset
 */
export class ResetTestDataHandler {
  async handle(req: Request, res: Response): Promise<void> {
    try {
      if (!isTestingEnabled()) {
        res.status(403).json({
          success: false,
          error: "Testing endpoints are not available in production",
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      // Reset test data not fully implemented yet
      const result = { success: true, message: "Test data reset functionality not fully implemented" };

      res.json({
        success: true,
        data: result,
      } as ApiResponse);
    } catch (error) {
      console.error("Error resetting test data:", error);
      res.status(500).json({
        success: false,
        error: "Failed to reset test data",
      } as ApiResponse);
    }
  }
}








