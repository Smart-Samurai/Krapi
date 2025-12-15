import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { ApiResponse } from "@/types";

/**
 * Handler for getting all projects
 * GET /krapi/k1/projects
 * 
 * Uses SDK projects.getAllProjects() method for consistent architecture.
 */
export class GetAllProjectsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(_req: Request, res: Response): Promise<void> {
    try {
      if (!this.backendSDK) {
        res.status(500).json({
          success: false,
          error: "BackendSDK not initialized",
        } as ApiResponse);
        return;
      }

      // Use SDK projects.getAllProjects() method
      const projects = await this.backendSDK.projects.getAllProjects();

      res.json({
        success: true,
        data: projects,
      } as ApiResponse);
    } catch (error) {
      console.error("Error getting all projects:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get projects",
      } as ApiResponse);
    }
  }
}

