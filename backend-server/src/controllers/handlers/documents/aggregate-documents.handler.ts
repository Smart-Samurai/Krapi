import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Response as ExpressResponse } from "express";

import { sanitizeProjectId } from "../collections/collection-utils";

import { ExtendedRequest } from "@/types";

type Response = ExpressResponse<unknown, Record<string, unknown>>;

/**
 * Handler for aggregating documents
 * POST /krapi/k1/projects/:projectId/collections/:collectionName/documents/aggregate
 */
export class AggregateDocumentsHandler {
  constructor(private backendSDK: BackendSDK) {}

  async handle(req: ExtendedRequest, res: Response): Promise<void> {
    try {
      const { projectId, collectionName } = req.params;
      if (!projectId || !collectionName) {
        res.status(400).json({
          success: false,
          error: "Project ID and collection name are required",
        });
        return;
      }
      const sanitizedId = sanitizeProjectId(projectId);
      const aggregation = req.body;

      // Convert aggregation format to pipeline format (same as SDK adapter does)
      const pipeline: Array<Record<string, unknown>> = [];
      
      // Add match stage for filters
      if (aggregation.filters) {
        pipeline.push({ $match: aggregation.filters });
      }
      
      // Add group stage
      const groupStage: Record<string, unknown> = {
        _id: aggregation.group_by && aggregation.group_by.length > 0
          ? aggregation.group_by.reduce(
              (acc: Record<string, unknown>, field: string) => ({
                ...acc,
                [field]: `$${field}`,
              }),
              {}
            )
          : null,
      };
      
      // Add aggregations
      if (aggregation.aggregations) {
        for (const [name, agg] of Object.entries(aggregation.aggregations)) {
          const aggConfig = agg as { type: string; field?: string };
          switch (aggConfig.type) {
            case "count":
              groupStage[name] = { $sum: 1 };
              break;
            case "sum":
              groupStage[name] = { $sum: `$${aggConfig.field}` };
              break;
            case "avg":
              groupStage[name] = { $avg: `$${aggConfig.field}` };
              break;
            case "min":
              groupStage[name] = { $min: `$${aggConfig.field}` };
              break;
            case "max":
              groupStage[name] = { $max: `$${aggConfig.field}` };
              break;
          }
        }
      } else {
        // Default: count
        groupStage.count = { $sum: 1 };
      }
      
      pipeline.push({ $group: groupStage });
      
      // Use collectionsService.aggregateDocuments with pipeline
      const aggregationResults = await this.backendSDK.aggregateDocuments(
        sanitizedId,
        collectionName,
        pipeline
      );
      
      // Transform result to expected format (same as SDK adapter does)
      const groups: Record<string, Record<string, number>> = {};
      let totalGroups = 0;
      
      if (Array.isArray(aggregationResults)) {
        for (const row of aggregationResults) {
          const groupKey = row._id ? JSON.stringify(row._id) : "all";
          groups[groupKey] = {};
          for (const [key, value] of Object.entries(row)) {
            if (key !== "_id" && typeof value === "number") {
              groups[groupKey][key] = value;
            }
          }
          totalGroups++;
        }
      }
      
      // SDK adapter expects response.data to be { groups: Record<string, Record<string, number>>, total_groups: number }
      res.status(200).json({
        success: true,
        data: { groups, total_groups: totalGroups },
      });
    } catch (error) {
      console.error("Error aggregating documents:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        success: false,
        error: "Failed to aggregate documents",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}

