import { Request, Response } from "express";

import { isTestingEnabled } from "./testing-utils";

import { AuthenticatedRequest, ApiResponse } from "@/types";

/**
 * Handler for checking database schema
 * GET /krapi/k1/testing/schema
 */
export class CheckSchemaHandler {
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

      // Schema validation not implemented yet
      const schema = { valid: true, issues: [] };

      res.json({
        success: true,
        data: schema,
      } as ApiResponse);
    } catch (error) {
      console.error("Error checking schema:", error);
      res.status(500).json({
        success: false,
        error: "Failed to check schema",
      } as ApiResponse);
    }
  }
}








