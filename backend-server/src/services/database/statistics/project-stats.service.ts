import { MultiDatabaseManager } from "../../multi-database-manager.service";
import { DatabaseCoreService } from "../core/database-core.service";

import { BackendChangelogEntry } from "@/types";

/**
 * Project Statistics Service
 *
 * Handles project statistics, activity, and storage stats.
 */
export class ProjectStatsService {
  constructor(
    private dbManager: MultiDatabaseManager,
    private core: DatabaseCoreService
  ) {}

  /**
   * Get project statistics
   */
  async getProjectStats(projectId: string): Promise<{
    totalDocuments: number;
    totalCollections: number;
    totalFiles: number;
    totalUsers: number;
    storageUsed: number;
    apiCallsCount: number;
    lastApiCall: Date | null;
  }> {
    await this.core.ensureReady();

    // Get document count (from project DB)
    const docResult = await this.dbManager.queryProject(
      projectId,
      "SELECT COUNT(*) as count FROM documents",
      []
    );
    const totalDocuments = parseInt(String(docResult.rows[0]?.count || 0));

    // Get collection count (from project DB)
    const colResult = await this.dbManager.queryProject(
      projectId,
      "SELECT COUNT(*) as count FROM collections",
      []
    );
    const totalCollections = parseInt(String(colResult.rows[0]?.count || 0));

    // Get file count (from project DB)
    const fileResult = await this.dbManager.queryProject(
      projectId,
      "SELECT COUNT(*) as count FROM files",
      []
    );
    const totalFiles = parseInt(String(fileResult.rows[0]?.count || 0));

    // Get user count (from project DB) - users are stored in collections
    // For now, count documents in "users" collection
    try {
      const userResult = await this.dbManager.queryProject(
        projectId,
        "SELECT COUNT(*) as count FROM documents WHERE collection_id IN (SELECT id FROM collections WHERE name = 'users')",
        []
      );
      void parseInt(String(userResult.rows[0]?.count || 0));
    } catch {
      // Users collection might not exist
    }
    const _totalUsers = 0; // Default if users collection doesn't exist (reserved for future use)

    // Get project info (from main DB)
    const projectResult = await this.dbManager.queryMain(
      "SELECT storage_used, api_calls_count, last_api_call FROM projects WHERE id = $1",
      [projectId]
    );
    const project = projectResult.rows[0] as
      | {
          storage_used?: number;
          api_calls_count?: number;
          last_api_call?: string;
        }
      | undefined;

    return {
      totalDocuments,
      totalCollections,
      totalFiles,
      totalUsers: _totalUsers,
      storageUsed: project?.storage_used || 0,
      apiCallsCount: project?.api_calls_count || 0,
      lastApiCall: project?.last_api_call
        ? new Date(project.last_api_call)
        : null,
    };
  }

  /**
   * Get project activity
   */
  async getProjectActivity(
    projectId: string,
    options: {
      limit?: number;
      offset?: number;
      entityType?: string;
      action?: string;
    } = {}
  ): Promise<{ activities: BackendChangelogEntry[]; total: number }> {
    await this.core.ensureReady();

    const { limit = 50, offset = 0, entityType, action } = options;

    let whereClause = "WHERE project_id = $1";
    const params: unknown[] = [projectId];
    let paramCount = 1;

    if (entityType) {
      whereClause += ` AND entity_type = $${++paramCount}`;
      params.push(entityType);
    }

    if (action) {
      whereClause += ` AND action = $${++paramCount}`;
      params.push(action);
    }

    // Get total count (from project DB)
    const countResult = await this.dbManager.queryProject(
      projectId,
      `SELECT COUNT(*) as count FROM changelog ${whereClause}`,
      params
    );
    const total = parseInt(String(countResult.rows[0]?.count || 0));

    // Get activities (from project DB)
    const activitiesResult = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM changelog ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    // Note: We can't use mappers here since we don't have access to it
    // The facade will handle mapping
    const activities =
      activitiesResult.rows as unknown as BackendChangelogEntry[];

    return { activities, total };
  }

  /**
   * Get project settings
   */
  async getProjectSettings(_projectId: string): Promise<{
    emailConfig: Record<string, unknown>;
    storageConfig: Record<string, unknown>;
    apiConfig: Record<string, unknown>;
    generalConfig: Record<string, unknown>;
  }> {
    await this.core.ensureReady();

    // Get project - this will be handled by project service
    // Return default settings for now
    // Future enhancement: Implement persistent settings storage in database
    return {
      emailConfig: {
        enabled: false,
        provider: "smtp",
        settings: {},
      },
      storageConfig: {
        maxStorage: 1073741824, // 1GB default
        allowedFileTypes: ["*"],
        compression: true,
      },
      apiConfig: {
        rateLimit: 1000,
        maxRequestSize: 10485760, // 10MB
        cors: {
          enabled: true,
          origins: ["*"],
        },
      },
      generalConfig: {
        maintenanceMode: false,
        debugMode: false,
        logLevel: "info",
      },
    };
  }

  /**
   * Get project storage statistics
   */
  async getProjectStorageStats(projectId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
    lastUpload: Date | null;
  }> {
    await this.core.ensureReady();

    // Get total files and size (from project DB)
    const filesResult = await this.dbManager.queryProject(
      projectId,
      "SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM files",
      []
    );

    const fileRow = filesResult.rows[0] as
      | { count: unknown; total_size: unknown }
      | undefined;
    const totalFiles = parseInt(String(fileRow?.count || 0));
    const totalSize = parseInt(String(fileRow?.total_size || 0));

    // Get file type distribution (from project DB)
    const typesResult = await this.dbManager.queryProject(
      projectId,
      "SELECT mime_type, COUNT(*) as count FROM files GROUP BY mime_type",
      []
    );

    const fileTypes: Record<string, number> = {};
    typesResult.rows.forEach((row) => {
      const typedRow = row as { mime_type: string; count: unknown };
      fileTypes[typedRow.mime_type] = parseInt(String(typedRow.count || 0));
    });

    // Get last upload (from project DB)
    const lastUploadResult = await this.dbManager.queryProject(
      projectId,
      "SELECT created_at FROM files ORDER BY created_at DESC LIMIT 1",
      []
    );

    const lastUpload =
      lastUploadResult.rows.length > 0
        ? new Date(lastUploadResult.rows[0]?.created_at as string)
        : null;

    return {
      totalFiles,
      totalSize,
      fileTypes,
      lastUpload,
    };
  }

  /**
   * Get storage statistics for a project
   */
  async getStorageStatistics(projectId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
    lastUpload: Date | null;
    storageUsed: number;
    storageLimit: number;
  }> {
    await this.core.ensureReady();

    try {
      // Get total files and size (from project DB)
      const filesResult = await this.dbManager.queryProject(
        projectId,
        "SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM files",
        []
      );

      const fileRow = filesResult.rows[0] as
        | { count: unknown; total_size: unknown }
        | undefined;
      const totalFiles = parseInt(String(fileRow?.count || 0));
      const totalSize = parseInt(String(fileRow?.total_size || 0));

      // Get file type distribution (from project DB)
      const fileTypesResult = await this.dbManager.queryProject(
        projectId,
        "SELECT mime_type, COUNT(*) as count FROM files GROUP BY mime_type",
        []
      );

      const fileTypes: Record<string, number> = {};
      fileTypesResult.rows.forEach((row) => {
        const typedRow = row as { mime_type: string; count: unknown };
        fileTypes[typedRow.mime_type] = parseInt(String(typedRow.count || 0));
      });

      // Get last upload time (from project DB)
      const lastUploadResult = await this.dbManager.queryProject(
        projectId,
        "SELECT created_at FROM files ORDER BY created_at DESC LIMIT 1",
        []
      );

      const lastUpload =
        lastUploadResult.rows.length > 0
          ? new Date(lastUploadResult.rows[0]?.created_at as string)
          : null;

      // Get project storage info (from main DB)
      const projectResult = await this.dbManager.queryMain(
        "SELECT storage_used FROM projects WHERE id = $1",
        [projectId]
      );

      const project = projectResult.rows[0] as
        | { storage_used?: number }
        | undefined;
      const storageUsed = project?.storage_used || 0;
      // storage_limit doesn't exist in projects table - use default from settings
      const storageLimit = 1073741824; // 1GB default

      return {
        totalFiles,
        totalSize,
        fileTypes,
        lastUpload,
        storageUsed,
        storageLimit,
      };
    } catch (error) {
      console.error("Error getting storage statistics:", error);
      throw error;
    }
  }
}
