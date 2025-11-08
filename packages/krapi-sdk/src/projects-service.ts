/**
 * Projects Service for BackendSDK
 * 
 * Provides comprehensive project management functionality including:
 * - Project CRUD operations
 * - Project statistics and analytics
 * - API key management for projects
 * - Project settings and configuration
 * 
 * @class ProjectsService
 * @example
 * const projectsService = new ProjectsService(dbConnection, logger);
 * const projects = await projectsService.getAllProjects({ limit: 10 });
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

  /**
   * Create a new ProjectsService instance
   * 
   * @param {DatabaseConnection} databaseConnection - Database connection
   * @param {Logger} logger - Logger instance
   */
  constructor(databaseConnection: DatabaseConnection, logger: Logger) {
    this.db = databaseConnection;
    this.logger = logger;
  }

  /**
   * Get all projects
   * 
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of projects
   * @param {number} [options.offset] - Number of projects to skip
   * @param {string} [options.search] - Search term for project name/description
   * @param {boolean} [options.active] - Filter by active status
   * @param {string} [options.owner_id] - Filter by owner ID
   * @returns {Promise<Project[]>} Array of projects
   * @throws {Error} If query fails
   * 
   * @example
   * const projects = await projectsService.getAllProjects({ limit: 10, active: true });
   */
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

  /**
   * Get project by ID
   *
   * Retrieves a single project by its ID.
   *
   * @param {string} projectId - Project ID
   * @returns {Promise<Project | null>} Project or null if not found
   * @throws {Error} If query fails
   *
   * @example
   * const project = await projectsService.getProjectById('project-id');
   */
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

  /**
   * Create a new project
   *
   * Creates a new project with the specified data and owner.
   * Automatically generates an API key and applies default settings.
   *
   * @param {string} ownerId - Owner user ID
   * @param {CreateProjectRequest} projectData - Project creation data
   * @param {string} projectData.name - Project name (required)
   * @param {string} [projectData.description] - Project description
   * @param {Partial<ProjectSettings>} [projectData.settings] - Project settings
   * @param {string[]} [projectData.allowed_origins] - Allowed CORS origins
   * @returns {Promise<Project>} Created project
   * @throws {Error} If creation fails or project name already exists
   *
   * @example
   * const project = await projectsService.createProject('owner-id', {
   *   name: 'My Project',
   *   description: 'Project description',
   *   settings: { authentication_required: true }
   * });
   */
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

      // Generate project ID using UUID format (matches database service and frontend expectations)
      // Use crypto.randomUUID() if available (Node.js 14.17+), otherwise fall back to simple random ID
      let projectId: string;
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        projectId = crypto.randomUUID();
      } else {
        // Fallback: generate a UUID-like string manually
        const hex = () => Math.floor(Math.random() * 16).toString(16);
        projectId = `${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}-${hex()}${hex()}${hex()}${hex()}-4${hex()}${hex()}${hex()}-${((Math.floor(Math.random() * 4) + 8).toString(16))}${hex()}${hex()}${hex()}-${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}`;
      }

      // SQLite-compatible INSERT (no RETURNING *)
      await this.db.query(
        `INSERT INTO projects (id, name, description, project_url, owner_id, api_key, allowed_origins, settings, is_active, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          projectId,
          projectData.name,
          projectData.description || null,
          null, // project_url is optional, not in CreateProjectRequest type
          ownerId,
          apiKey,
          JSON.stringify(projectData.allowed_origins || []), // SQLite stores arrays as JSON strings
          JSON.stringify(defaultSettings),
          1, // is_active (SQLite uses INTEGER 1 for true)
          ownerId, // created_by defaults to owner_id
        ]
      );

      // Query back the inserted row (SQLite doesn't support RETURNING *)
      const result = await this.db.query(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
      );

      return result.rows[0] as Project;
    } catch (error) {
      this.logger.error("Failed to create project:", error);
      throw new Error("Failed to create project");
    }
  }

  /**
   * Update an existing project
   *
   * Updates project information with the provided data.
   *
   * @param {string} projectId - Project ID
   * @param {UpdateProjectRequest} updates - Project update data
   * @param {string} [updates.name] - New project name
   * @param {string} [updates.description] - New project description
   * @param {Partial<ProjectSettings>} [updates.settings] - Updated project settings
   * @param {string[]} [updates.allowed_origins] - Updated allowed CORS origins
   * @param {boolean} [updates.is_active] - Active status
   * @returns {Promise<Project | null>} Updated project or null if not found
   * @throws {Error} If update fails
   *
   * @example
   * const updated = await projectsService.updateProject('project-id', {
   *   name: 'Updated Name',
   *   description: 'Updated description'
   * });
   */
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
        values.push(JSON.stringify(updates.allowed_origins)); // SQLite stores arrays as JSON strings
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
        values.push(updates.is_active ? 1 : 0); // SQLite uses INTEGER 1/0 for booleans
      }

      if (fields.length === 0) {
        return this.getProjectById(projectId);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(projectId);

      // SQLite doesn't support RETURNING *, so update and query back separately
      await this.db.query(
        `UPDATE projects SET ${fields.join(
          ", "
        )} WHERE id = $${paramCount}`,
        values
      );

      // Query back the updated row
      return this.getProjectById(projectId);
    } catch (error) {
      this.logger.error("Failed to update project:", error);
      throw new Error("Failed to update project");
    }
  }

  /**
   * Soft delete a project
   *
   * Marks a project as inactive (soft delete) rather than permanently removing it.
   *
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} True if deletion successful
   * @throws {Error} If deletion fails or project not found
   *
   * @example
   * const deleted = await projectsService.deleteProject('project-id');
   */
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

  /**
   * Permanently delete a project
   *
   * Permanently removes a project and all associated data from the database.
   * This action cannot be undone.
   *
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} True if deletion successful
   * @throws {Error} If deletion fails or project not found
   *
   * @example
   * const deleted = await projectsService.hardDeleteProject('project-id');
   */
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
  /**
   * Get project statistics
   *
   * Retrieves comprehensive statistics for a project including collections,
   * documents, files, storage usage, API calls, and activity.
   *
   * @param {string} projectId - Project ID
   * @returns {Promise<ProjectStatistics>} Project statistics
   * @throws {Error} If query fails or project not found
   *
   * @example
   * const stats = await projectsService.getProjectStatistics('project-id');
   * console.log(`Total collections: ${stats.totalCollections}`);
   * console.log(`Storage used: ${stats.storageUsed} bytes`);
   */
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
          "SELECT COALESCE(SUM(size), 0) as total_storage FROM files WHERE project_id = $1",
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
  /**
   * Get all API keys for a project
   *
   * Retrieves all API keys associated with a project.
   *
   * @param {string} projectId - Project ID
   * @returns {Promise<ProjectApiKey[]>} Array of project API keys
   * @throws {Error} If query fails
   *
   * @example
   * const apiKeys = await projectsService.getProjectApiKeys('project-id');
   */
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

  /**
   * Create a new API key for a project
   *
   * Creates a new API key with specified scopes and optional expiration.
   *
   * @param {string} projectId - Project ID
   * @param {Object} apiKeyData - API key data
   * @param {string} apiKeyData.name - API key name/description
   * @param {string[]} apiKeyData.scopes - Array of permission scopes
   * @param {string} [apiKeyData.expires_at] - Optional expiration date (ISO string)
   * @returns {Promise<ProjectApiKey>} Created API key (includes the key value)
   * @throws {Error} If creation fails
   *
   * @example
   * const apiKey = await projectsService.createProjectApiKey('project-id', {
   *   name: 'My API Key',
   *   scopes: ['collections:read', 'documents:write'],
   *   expires_at: '2024-12-31T23:59:59Z'
   * });
   * console.log(`API Key: ${apiKey.key}`); // Save this securely!
   */
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

  /**
   * Regenerate a project's main API key
   *
   * Generates a new main API key for a project, invalidating the old one.
   *
   * @param {string} projectId - Project ID
   * @returns {Promise<{newApiKey: string}>} New API key value
   * @throws {Error} If regeneration fails or project not found
   *
   * @example
   * const { newApiKey } = await projectsService.regenerateProjectApiKey('project-id');
   * console.log(`New API Key: ${newApiKey}`); // Save this securely!
   */
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

  /**
   * Get project activity log
   *
   * Retrieves activity log entries for a project with optional filtering.
   *
   * @param {string} projectId - Project ID
   * @param {Object} [options={}] - Query options
   * @param {number} [options.limit=50] - Maximum number of entries
   * @param {number} [options.days] - Filter by number of days back
   * @returns {Promise<Array>} Array of activity log entries
   * @throws {Error} If query fails
   *
   * @example
   * const activity = await projectsService.getProjectActivity('project-id', {
   *   limit: 50,
   *   days: 7
   * });
   */
  async getProjectActivity(
    projectId: string,
    options: {
      limit?: number;
      days?: number;
    } = {}
  ): Promise<Array<{
    id: string;
    type: string;
    timestamp: string;
    details: Record<string, unknown>;
  }>> {
    try {
      const { limit = 50, days } = options;
      
      let query = `
        SELECT 
          c.id,
          c.action as type,
          c.created_at as timestamp,
          c.changes as details
        FROM changelog c
        WHERE c.project_id = $1
      `;
      
      const queryParams: unknown[] = [projectId];
      const paramIndex = 2;
      
      if (days) {
        query += ` AND c.created_at >= CURRENT_DATE - INTERVAL '${days} days'`;
      }
      
      query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex}`;
      queryParams.push(limit);
      
      const result = await this.db.query(query, queryParams);
      
      return result.rows.map((row) => {
        const typedRow = row as {
          id: string;
          type: string;
          timestamp: string;
          details: Record<string, unknown>;
        };
        return {
          id: typedRow.id,
          type: typedRow.type,
          timestamp: typedRow.timestamp,
          details: typedRow.details || {},
        };
      });
    } catch (error) {
      this.logger.error("Failed to get project activity:", error);
      throw new Error("Failed to get project activity");
    }
  }

  /**
   * Delete a project API key
   *
   * Permanently deletes an API key, revoking all access.
   *
   * @param {string} keyId - API key ID
   * @returns {Promise<boolean>} True if deletion successful
   * @throws {Error} If deletion fails or key not found
   *
   * @example
   * const deleted = await projectsService.deleteProjectApiKey('key-id');
   */
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
  /**
   * Update project settings
   *
   * Updates project configuration settings, merging with existing settings.
   *
   * @param {string} projectId - Project ID
   * @param {Partial<ProjectSettings>} settings - Settings to update
   * @returns {Promise<Project | null>} Updated project with new settings or null if not found
   * @throws {Error} If update fails
   *
   * @example
   * const updated = await projectsService.updateProjectSettings('project-id', {
   *   authentication_required: true,
   *   rate_limiting_enabled: true,
   *   max_file_size: 10485760 // 10MB
   * });
   */
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

      // SQLite doesn't support RETURNING *, so update and query back separately
      await this.db.query(
        "UPDATE projects SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [JSON.stringify(mergedSettings), projectId]
      );

      // Query back the updated row
      return this.getProjectById(projectId);
    } catch (error) {
      this.logger.error("Failed to update project settings:", error);
      throw new Error("Failed to update project settings");
    }
  }

  // Project Activity Tracking
  /**
   * Record an API call for a project
   *
   * Records that an API call was made for analytics and rate limiting.
   *
   * @param {string} projectId - Project ID
   * @returns {Promise<void>}
   * @throws {Error} If recording fails
   *
   * @example
   * await projectsService.recordApiCall('project-id');
   */
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

  /**
   * Get project by API key
   *
   * Retrieves the project associated with a given API key.
   *
   * @param {string} apiKey - API key value
   * @returns {Promise<Project | null>} Project or null if key not found/invalid
   * @throws {Error} If query fails
   *
   * @example
   * const project = await projectsService.getProjectByApiKey('pk_...');
   */
  async getProjectByApiKey(apiKey: string): Promise<Project | null> {
    try {
      const result = await this.db.query(
        "SELECT * FROM projects WHERE api_key = $1 AND is_active = 1",
        [apiKey]
      );
      return result.rows.length > 0 ? (result.rows[0] as Project) : null;
    } catch (error) {
      this.logger.error("Failed to get project by API key:", error);
      throw new Error("Failed to get project by API key");
    }
  }
}
