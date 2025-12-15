import { krapi } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { isTestingEnabled, getApiKey, initializeSDK, getFrontendUrl } from "./testing-utils";

import { AuthenticatedRequest, ApiResponse, BackendProjectSettings } from "@/types";


/**
 * Handler for cleaning up test data
 * POST /krapi/k1/testing/cleanup
 */
export class CleanupTestDataHandler {
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

      const { projectId } = req.body;
      let deletedProjects = 0;
      let deletedCollections = 0;
      let deletedDocuments = 0;

      // SDK-FIRST ARCHITECTURE: Use REGULAR SDK (client mode - HTTP)
      const apiKey = await getApiKey(authReq);
      const frontendUrl = getFrontendUrl();
      await initializeSDK(apiKey, frontendUrl);

      if (projectId) {
        // Delete specific project using SDK (client mode)
        const project = await krapi.projects.get(projectId);
        if (
          project &&
          (project.settings as BackendProjectSettings)?.isTestProject
        ) {
          // Get collections for counting using SDK
          const collections = await krapi.collections.getAll(projectId);
          if (collections) {
            for (const collection of collections) {
              // Get documents for counting using SDK
              const docs = await krapi.documents.getAll(
                projectId,
                collection.name || collection.id,
                {}
              );
              if (docs) {
                deletedDocuments += docs.length;
              }
            }
            deletedCollections = collections.length;
          }

          await krapi.projects.delete(projectId);
          deletedProjects = 1;
        }
      } else {
        // Delete all test projects using SDK (client mode)
        const projects = await krapi.projects.getAll();
        if (projects) {
          for (const project of projects) {
            if ((project.settings as BackendProjectSettings)?.isTestProject) {
              // Get collections for counting using SDK
              const collections = await krapi.collections.getAll(project.id);
              if (collections) {
                for (const collection of collections) {
                  // Get documents for counting using SDK
                  const docs = await krapi.documents.getAll(
                    project.id,
                    collection.name || collection.id,
                    {}
                  );
                  if (docs) {
                    deletedDocuments += docs.length;
                  }
                }
                deletedCollections += collections.length;
              }

              await krapi.projects.delete(project.id);
              deletedProjects++;
            }
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          deleted: {
            projects: deletedProjects,
            collections: deletedCollections,
            documents: deletedDocuments,
          },
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to clean up test data",
      } as ApiResponse);
    }
  }
}








