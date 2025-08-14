/**
 * Projects Service for BackendSDK
 *
 * Provides comprehensive project management functionality including:
 * - Project CRUD operations
 * - Project statistics and analytics
 * - API key management for projects
 * - Project settings and configuration
 */

import { DatabaseConnection, Logger } from "./core";
import { CountRow } from "./database-types";

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  api_key: string;
  allowed_origins: string[];
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  storage_used: number;
  last_api_call?: string;
  total_api_calls: number;
  rate_limit: number;
  rate_limit_window: string;
}

export interface ProjectSettings {
  authentication_required: boolean;
  cors_enabled: boolean;
  rate_limiting_enabled: boolean;
  logging_enabled: boolean;
  encryption_enabled: boolean;
  backup_enabled: boolean;
  max_file_size: number;
  allowed_file_types: string[];
  webhook_url?: string;
  custom_headers: Record<string, string>;
  environment: "development" | "staging" | "production";
}

export interface ProjectStatistics {
  totalCollections: number;
  totalDocuments: number;
  totalFiles: number;
  storageUsed: number;
  apiCallsToday: number;
  apiCallsThisMonth: number;
  lastActivity?: string;
  topCollections: Array<{
    name: string;
    documentCount: number;
    lastModified: string;
  }>;
  recentActivity: Array<{
    action: string;
    entity: string;
    timestamp: string;
    user: string;
  }>;
}

export interface ProjectApiKey {
  id: string;
  key: string;
  name: string;
  project_id: string;
  scopes: string[];
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
  is_active: boolean;
  usage_count: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  settings?: Partial<ProjectSettings>;
  allowed_origins?: string[];
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  settings?: Partial<ProjectSettings>;
  allowed_origins?: string[];
  is_active?: boolean;
}

export class ProjectsService {
  private db: DatabaseConnection;
  private logger: Logger;

  constructor(databaseConnection: DatabaseConnection, logger: Logger) {
    this.db = databaseConnection;
    this.logger = logger;
  }

  // Project CRUD Operations
  async getAllProjects(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    active?: boolean;
    owner_id?: string;
  }): Promise<Project[]> {
    try {
      let query = "SELECT * FROM projects WHERE 1=1";
      const params: unknown[] = [];
      let paramCount = 0;

      if (options?.active !== undefined) {
        paramCount++;
        query += ` AND is_active = $${paramCount}`;
        params.push(options.active);
      }

      if (options?.owner_id) {
        paramCount++;
        query += ` AND owner_id = $${paramCount}`;
        params.push(options.owner_id);
      }

      if (options?.search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        params.push(`%${options.search}%`);
      }

      query += " ORDER BY created_at DESC";

      if (options?.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(options.limit);
      }

      if (options?.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(options.offset);
      }

      const result = await this.db.query(query, params);
      return result.rows as Project[];
    } catch (error) {
      this.logger.error("Failed to get projects:", error);
      throw new Error("Failed to get projects");
    }
  }

  async getProjectById(projectId: string): Promise<Project | null> {
    try {
      const result = await this.db.query(
        "SELECT * FROM projects WHERE id = $1",
        [projectId]
      );
      return result.rows.length > 0 ? (result.rows[0] as Project) : null;
    } catch (error) {
      this.logger.error("Failed to get project by ID:", error);
      throw new Error("Failed to get project by ID");
    }
  }

  async createProject(
    ownerId: string,
    projectData: CreateProjectRequest
  ): Promise<Project> {
    try {
      // Generate API key for the project
      const apiKey = `pk_${Math.random()
        .toString(36)
        .substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

      // Default settings
      const defaultSettings: ProjectSettings = {
        authentication_required: true,
        cors_enabled: true,
        rate_limiting_enabled: true,
        logging_enabled: true,
        encryption_enabled: false,
        backup_enabled: false,
        max_file_size: 10485760, // 10MB
        allowed_file_types: ["jpg", "jpeg", "png", "pdf", "txt", "csv"],
        custom_headers: {},
        environment: "development",
        ...projectData.settings,
      };

      const result = await this.db.query(
        `INSERT INTO projects (name, description, owner_id, api_key, allowed_origins, settings) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          projectData.name,
          projectData.description || "",
          ownerId,
          apiKey,
          projectData.allowed_origins || [],
          JSON.stringify(defaultSettings),
        ]
      );

      return result.rows[0] as Project;
    } catch (error) {
      this.logger.error("Failed to create project:", error);
      throw new Error("Failed to create project");
    }
  }

  async updateProject(
    projectId: string,
    updates: UpdateProjectRequest
  ): Promise<Project | null> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }
      if (updates.allowed_origins !== undefined) {
        fields.push(`allowed_origins = $${paramCount++}`);
        values.push(updates.allowed_origins);
      }
      if (updates.settings !== undefined) {
        // Get current settings and merge
        const currentProject = await this.getProjectById(projectId);
        if (currentProject) {
          const mergedSettings = {
            ...currentProject.settings,
            ...updates.settings,
          };
          fields.push(`settings = $${paramCount++}`);
          values.push(JSON.stringify(mergedSettings));
        }
      }
      if (updates.is_active !== undefined) {
        fields.push(`is_active = $${paramCount++}`);
        values.push(updates.is_active);
      }

      if (fields.length === 0) {
        return this.getProjectById(projectId);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(projectId);

      const result = await this.db.query(
        `UPDATE projects SET ${fields.join(
          ", "
        )} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      return result.rows.length > 0 ? (result.rows[0] as Project) : null;
    } catch (error) {
      this.logger.error("Failed to update project:", error);
      throw new Error("Failed to update project");
    }
  }

  async deleteProject(projectId: string): Promise<boolean> {
    try {
      // Soft delete by setting is_active to false
      const result = await this.db.query(
        "UPDATE projects SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [projectId]
      );
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to delete project:", error);
      throw new Error("Failed to delete project");
    }
  }

  async hardDeleteProject(projectId: string): Promise<boolean> {
    try {
      // Hard delete - removes all data
      await this.db.query(
        "DELETE FROM documents WHERE collection_id IN (SELECT id FROM collections WHERE project_id = $1)",
        [projectId]
      );
      await this.db.query("DELETE FROM collections WHERE project_id = $1", [
        projectId,
      ]);
      await this.db.query("DELETE FROM files WHERE project_id = $1", [
        projectId,
      ]);
      await this.db.query("DELETE FROM api_keys WHERE project_id = $1", [
        projectId,
      ]);

      const result = await this.db.query("DELETE FROM projects WHERE id = $1", [
        projectId,
      ]);
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to hard delete project:", error);
      throw new Error("Failed to hard delete project");
    }
  }

  // Project Statistics
  async getProjectStatistics(projectId: string): Promise<ProjectStatistics> {
    try {
      const [
        collectionsResult,
        documentsResult,
        filesResult,
        storageResult,
        todayCallsResult,
        monthCallsResult,
        lastActivityResult,
        topCollectionsResult,
        recentActivityResult,
      ] = await Promise.all([
        this.db.query(
          "SELECT COUNT(*) FROM collections WHERE project_id = $1",
          [projectId]
        ),
        this.db.query(
          "SELECT COUNT(*) FROM documents WHERE collection_id IN (SELECT id FROM collections WHERE project_id = $1)",
          [projectId]
        ),
        this.db.query("SELECT COUNT(*) FROM files WHERE project_id = $1", [
          projectId,
        ]),
        this.db.query(
          "SELECT COALESCE(SUM(file_size), 0) as total_storage FROM files WHERE project_id = $1",
          [projectId]
        ),
        this.db.query(
          "SELECT COUNT(*) FROM changelog WHERE project_id = $1 AND created_at >= CURRENT_DATE",
          [projectId]
        ),
        this.db.query(
          "SELECT COUNT(*) FROM changelog WHERE project_id = $1 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)",
          [projectId]
        ),
        this.db.query(
          "SELECT MAX(created_at) FROM changelog WHERE project_id = $1",
          [projectId]
        ),
        this.db.query(
          `
          SELECT c.name, COUNT(d.id) as document_count, MAX(d.updated_at) as last_modified
          FROM collections c
          LEFT JOIN documents d ON c.id = d.collection_id
          WHERE c.project_id = $1
          GROUP BY c.id, c.name
          ORDER BY document_count DESC
          LIMIT 10
        `,
          [projectId]
        ),
        this.db.query(
          `
          SELECT action, entity_type as entity, created_at as timestamp, performed_by as user
          FROM changelog
          WHERE project_id = $1
          ORDER BY created_at DESC
          LIMIT 20
        `,
          [projectId]
        ),
      ]);

      const lastActivity = lastActivityResult.rows[0]
        ? (lastActivityResult.rows[0] as { max: string | null }).max
        : null;

      const baseResult = {
        totalCollections: parseInt(
          (collectionsResult.rows[0] as CountRow).count
        ),
        totalDocuments: parseInt((documentsResult.rows[0] as CountRow).count),
        totalFiles: parseInt((filesResult.rows[0] as CountRow).count),
        storageUsed: parseInt(
          (storageResult.rows[0] as { total_storage?: string }).total_storage ||
            "0"
        ),
        apiCallsToday: parseInt((todayCallsResult.rows[0] as CountRow).count),
        apiCallsThisMonth: parseInt(
          (monthCallsResult.rows[0] as CountRow).count
        ),
        topCollections: topCollectionsResult.rows.map((row) => {
          const typedRow = row as {
            name: string;
            document_count: string;
            last_modified: string;
          };
          return {
            name: typedRow.name,
            documentCount: parseInt(typedRow.document_count),
            lastModified: typedRow.last_modified,
          };
        }),
        recentActivity: recentActivityResult.rows.map((row) => {
          const typedRow = row as {
            action: string;
            entity: string;
            timestamp: string;
            user: string;
          };
          return {
            action: typedRow.action,
            entity: typedRow.entity,
            timestamp: typedRow.timestamp,
            user: typedRow.user,
          };
        }),
      };

      return lastActivity ? { ...baseResult, lastActivity } : baseResult;
    } catch (error) {
      this.logger.error("Failed to get project statistics:", error);
      throw new Error("Failed to get project statistics");
    }
  }

  // API Key Management
  async getProjectApiKeys(projectId: string): Promise<ProjectApiKey[]> {
    try {
      const result = await this.db.query(
        "SELECT * FROM api_keys WHERE project_id = $1 AND type = 'project' ORDER BY created_at DESC",
        [projectId]
      );
      return result.rows as ProjectApiKey[];
    } catch (error) {
      this.logger.error("Failed to get project API keys:", error);
      throw new Error("Failed to get project API keys");
    }
  }

  async createProjectApiKey(
    projectId: string,
    apiKeyData: {
      name: string;
      scopes: string[];
      expires_at?: string;
    }
  ): Promise<ProjectApiKey> {
    try {
      const apiKey = `pk_${Math.random()
        .toString(36)
        .substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

      const result = await this.db.query(
        `INSERT INTO api_keys (key, name, type, project_id, scopes, expires_at) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          apiKey,
          apiKeyData.name,
          "project",
          projectId,
          apiKeyData.scopes,
          apiKeyData.expires_at,
        ]
      );
      return result.rows[0] as ProjectApiKey;
    } catch (error) {
      this.logger.error("Failed to create project API key:", error);
      throw new Error("Failed to create project API key");
    }
  }

  async regenerateProjectApiKey(
    projectId: string
  ): Promise<{ newApiKey: string }> {
    try {
      const newApiKey = `pk_${Math.random()
        .toString(36)
        .substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

      await this.db.query(
        "UPDATE projects SET api_key = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [newApiKey, projectId]
      );

      return { newApiKey };
    } catch (error) {
      this.logger.error("Failed to regenerate project API key:", error);
      throw new Error("Failed to regenerate project API key");
    }
  }

  async deleteProjectApiKey(keyId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        "UPDATE api_keys SET is_active = false WHERE id = $1",
        [keyId]
      );
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to delete project API key:", error);
      throw new Error("Failed to delete project API key");
    }
  }

  // Project Settings
  async updateProjectSettings(
    projectId: string,
    settings: Partial<ProjectSettings>
  ): Promise<Project | null> {
    try {
      const currentProject = await this.getProjectById(projectId);
      if (!currentProject) {
        return null;
      }

      const mergedSettings = { ...currentProject.settings, ...settings };

      const result = await this.db.query(
        "UPDATE projects SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
        [JSON.stringify(mergedSettings), projectId]
      );

      return result.rows.length > 0 ? (result.rows[0] as Project) : null;
    } catch (error) {
      this.logger.error("Failed to update project settings:", error);
      throw new Error("Failed to update project settings");
    }
  }

  // Project Activity Tracking
  async recordApiCall(projectId: string): Promise<void> {
    try {
      await this.db.query(
        "UPDATE projects SET total_api_calls = total_api_calls + 1, last_api_call = CURRENT_TIMESTAMP WHERE id = $1",
        [projectId]
      );
    } catch (error) {
      this.logger.error("Failed to record API call:", error);
      // Don't throw here as this shouldn't break the main operation
    }
  }

  async getProjectByApiKey(apiKey: string): Promise<Project | null> {
    try {
      const result = await this.db.query(
        "SELECT * FROM projects WHERE api_key = $1 AND is_active = true",
        [apiKey]
      );
      return result.rows.length > 0 ? (result.rows[0] as Project) : null;
    } catch (error) {
      this.logger.error("Failed to get project by API key:", error);
      throw new Error("Failed to get project by API key");
    }
  }
}
