import { Request, Response } from "express";

import { ProjectOperationsService } from "@/services/project-operations.service";
import { ApiResponse } from "@/types";
import { sendErrorResponse } from "@/utils/error-handlers";

/**
 * Project List Handler
 * 
 * Handles GET /krapi/k1/projects - Get all projects with pagination
 * 
 * Separated from controller for better organization and debugging.
 */
export class ProjectListHandler {
  constructor(private projectOps: ProjectOperationsService) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      console.log("🔍 [PROJECT LIST HANDLER] Request received", {
        method: req.method,
        url: req.url,
        path: req.path,
        headers: {
          "x-project-id": req.headers["x-project-id"],
          authorization: req.headers.authorization ? "present" : "missing",
        },
        query: req.query,
      });

      const { page = 1, limit = 50 } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      if (isNaN(pageNum) || pageNum < 1) {
        res.status(400).json({
          success: false,
          error: "Invalid page number",
          code: "INVALID_PAGE",
        } as ApiResponse);
        return;
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          success: false,
          error: "Invalid limit (must be between 1 and 100)",
          code: "INVALID_LIMIT",
        } as ApiResponse);
        return;
      }

      const result = await this.projectOps.getAllProjects({
        page: pageNum,
        limit: limitNum,
      });

      res.status(200).json({
        success: true,
        data: result.projects,
        pagination: result.pagination,
      } as ApiResponse);
    } catch (error) {
      sendErrorResponse(res, error, "Failed to fetch projects");
    }
  }
}

