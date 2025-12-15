import { FieldType, krapi } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";

import { isTestingEnabled, getApiKey, initializeSDK, getFrontendUrl } from "./testing-utils";

import { AuthenticatedRequest, ApiResponse } from "@/types";


/**
 * Handler for creating a test project
 * POST /krapi/k1/testing/projects
 */
export class CreateTestProjectHandler {
  async handle(req: Request, res: Response): Promise<void> {
    console.log("🔍 [TESTING DEBUG] createTestProject called");
    try {
      if (!isTestingEnabled()) {
        console.log("❌ [TESTING DEBUG] Production mode - rejecting");
        res.status(403).json({
          success: false,
          error: "Testing endpoints are not available in production",
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      
      console.log("🔍 [TESTING DEBUG] Current user:", currentUser ? currentUser.id : "null");

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      const {
        name = `Test Project ${Date.now()}`,
        withCollections = false,
        withDocuments = false,
        documentCount = 10,
      } = req.body;

      // SDK-FIRST ARCHITECTURE: Use REGULAR SDK (client mode) - simulates third-party apps
      const apiKey = await getApiKey(authReq);
      const frontendUrl = getFrontendUrl();
      await initializeSDK(apiKey, frontendUrl);
      
      console.log("🔍 [TESTING DEBUG] About to create project with name:", name);
      console.log(`🔍 [TESTING DEBUG] Using SDK in CLIENT MODE (HTTP) connecting to: ${frontendUrl}`);
      
      // Use regular SDK (client mode) - makes HTTP requests through frontend proxy
      const project = await krapi.projects.create({
        name,
        description: "Created by testing utilities",
        settings: {
          isTestProject: true,
          public: false,
          allow_registration: false,
          require_email_verification: false,
          max_file_size: 10485760, // 10MB
          allowed_file_types: [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "pdf",
            "txt",
            "doc",
            "docx",
          ],
          authentication_required: true,
          cors_enabled: false,
          rate_limiting_enabled: false,
          logging_enabled: true,
          encryption_enabled: false,
          backup_enabled: false,
          custom_headers: {},
          environment: "development" as const,
        } as unknown as Record<string, unknown>,
      });

      console.log("✅ [TESTING DEBUG] Project created successfully:", project.id);

      // Log the action using SDK activity logging (client mode)
      try {
        if (krapi.activity && typeof krapi.activity.log === "function") {
          await krapi.activity.log({
            action: "created",
            resource_type: "project",
            resource_id: project.id,
            project_id: project.id,
          } as unknown as Parameters<typeof krapi.activity.log>[0]);
        }
      } catch (error) {
        console.warn("Failed to log activity (may not be available in SDK):", error);
      }

      // Create sample collections if requested
      if (withCollections) {
        const collections = [
          {
            name: "users",
            fields: [
              {
                name: "name",
                type: FieldType.string,
                required: true,
                unique: false,
              },
              {
                name: "email",
                type: FieldType.string,
                required: true,
                unique: true,
              },
              {
                name: "age",
                type: FieldType.number,
                required: false,
                unique: false,
              },
            ],
          },
          {
            name: "products",
            fields: [
              {
                name: "title",
                type: FieldType.string,
                required: true,
                unique: false,
              },
              {
                name: "price",
                type: FieldType.number,
                required: true,
                unique: false,
              },
              {
                name: "description",
                type: FieldType.string,
                required: false,
                unique: false,
              },
            ],
          },
        ];

        for (const collData of collections) {
          // Create collection using SDK (client mode - HTTP)
          const collection = await krapi.collections.create(project.id, {
            name: collData.name,
            description: `Test collection: ${collData.name}`,
            fields: collData.fields,
            indexes: [],
          });

          // Create sample documents if requested
          if (withDocuments) {
            for (let i = 0; i < documentCount; i++) {
              if (collData.name === "users") {
                await krapi.documents.create(project.id, collection.name || collection.id, {
                  data: {
                    name: `Test User ${i + 1}`,
                    email: `user${i + 1}@test.com`,
                    age: 20 + Math.floor(Math.random() * 50),
                  },
                });
              } else if (collData.name === "products") {
                await krapi.documents.create(project.id, collection.name || collection.id, {
                  data: {
                    title: `Product ${i + 1}`,
                    price: Math.floor(Math.random() * 1000) + 10,
                    description: `Description for product ${i + 1}`,
                  },
                });
              }
            }
          }
        }
      }

      console.log("✅ [TESTING DEBUG] Sending success response");
      res.status(201).json({
        success: true,
        data: project,
        message: "Test project created successfully",
      } as unknown as ApiResponse);
    } catch (error) {
      console.error("❌ [TESTING DEBUG] Create test project error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create test project",
      } as ApiResponse);
    }
  }
}


