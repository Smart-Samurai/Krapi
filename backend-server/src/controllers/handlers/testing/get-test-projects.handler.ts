import { krapi } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { isTestingEnabled, getApiKey, initializeSDK, getFrontendUrl } from "./testing-utils";

import { AuthenticatedRequest, ApiResponse, BackendProjectSettings } from "@/types";


/**
 * Handler for getting all test projects
 * GET /krapi/k1/testing/projects
 */
export class GetTestProjectsHandler {
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

      // SDK-FIRST ARCHITECTURE: Use REGULAR SDK (client mode - HTTP)
      const apiKey = await getApiKey(authReq);
      const frontendUrl = getFrontendUrl();
      await initializeSDK(apiKey, frontendUrl);
      
      const projects = await krapi.projects.getAll();

      // Filter test projects using type-safe approach
      const testProjects = projects.filter((p) => {
        const settings = p.settings as BackendProjectSettings | undefined;
        return settings?.isTestProject || p.name.toLowerCase().includes("test");
      });

      res.json({
        success: true,
        data: testProjects,
      } as ApiResponse);
    } catch (error) {
      console.error("Error getting test projects:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get test projects",
      } as ApiResponse);
    }
  }
}


