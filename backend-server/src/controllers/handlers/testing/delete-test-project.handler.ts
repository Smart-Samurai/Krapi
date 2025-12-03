import { krapi } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { isTestingEnabled, getApiKey, initializeSDK, getFrontendUrl } from "./testing-utils";

import { AuthenticatedRequest, ApiResponse, BackendProjectSettings } from "@/types";


/**
 * Handler for deleting a specific test project
 * DELETE /krapi/k1/testing/projects/:projectId
 */
export class DeleteTestProjectHandler {
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

      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        } as ApiResponse);
        return;
      }

      // SDK-FIRST ARCHITECTURE: Use REGULAR SDK (client mode - HTTP)
      const apiKey = await getApiKey(authReq);
      const frontendUrl = getFrontendUrl();
      await initializeSDK(apiKey, frontendUrl);
      
      const project = await krapi.projects.get(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Only allow deletion of test projects
      if (
        !(project.settings as BackendProjectSettings)?.isTestProject &&
        !project.name.toLowerCase().includes("test")
      ) {
        res.status(403).json({
          success: false,
          error: "Only test projects can be deleted via this endpoint",
        } as ApiResponse);
        return;
      }

      await krapi.projects.delete(projectId);

      res.json({
        success: true,
        message: "Test project deleted successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error deleting test project:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete test project",
      } as ApiResponse);
    }
  }
}








