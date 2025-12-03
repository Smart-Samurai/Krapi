import { v4 as uuidv4 } from "uuid";

import { MultiDatabaseManager } from "../../multi-database-manager.service";
import { DatabaseCoreService } from "../core/database-core.service";
import { DatabaseMappersService } from "../database-mappers.service";
import { DatabaseRepairService } from "../health/database-repair.service";

import { BackendProject } from "@/types";
import { getDefaultCollections } from "@/utils/default-collections";
import { isValidProjectId, sanitizeProjectId } from "@/utils/validation";

/**
 * Project Service
 *
 * Handles all project CRUD operations.
 * Projects are stored in the main database (metadata) with separate project databases.
 */
export class ProjectService {
  constructor(
    private dbManager: MultiDatabaseManager,
    private core: DatabaseCoreService,
    private mappers: DatabaseMappersService,
    private repairService: DatabaseRepairService
  ) {}

  /**
   * Create a new project
   */
  async createProject(
    data: Omit<
      BackendProject,
      | "id"
      | "created_at"
      | "updated_at"
      | "storage_used"
      | "total_api_calls"
      | "last_api_call"
    >
  ): Promise<BackendProject> {
    try {
      await this.core.ensureReady();

      // Validate required fields
      if (!data.created_by) {
        throw new Error("created_by is required to create a project");
      }

      const apiKey = data.api_key || `pk_${uuidv4().replace(/-/g, "")}`;

      // Generate project ID (SQLite doesn't support RETURNING *)
      const projectId = uuidv4();

      // Insert into main database (project metadata)
      await this.dbManager.queryMain(
        `INSERT INTO projects (id, name, description, project_url, api_key, is_active, created_by, settings, owner_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          projectId,
          data.name,
          data.description || null,
          data.project_url || null,
          apiKey,
          data.active ? 1 : 0, // SQLite uses INTEGER 1/0 for booleans
          data.created_by, // Required - should be provided by controller
          JSON.stringify(data.settings || {}),
          data.created_by, // owner_id defaults to created_by
        ]
      );

      // Initialize project database (will be created on first access)
      // Just ensure it exists for future queries
      await this.dbManager.getProjectDb(projectId);

      // Create default collections for the new project
      await this.createDefaultCollections(projectId, data.created_by);

      // Query back the inserted row (SQLite doesn't support RETURNING *)
      const rows = await this.dbManager.queryMain(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
      );

      return this.mappers.mapProject(
        rows.rows[0] as unknown as Record<string, unknown>
      );
    } catch (error) {
      console.error("Failed to create project:", error);
      // Check if it's a schema issue (missing column)
      if (error instanceof Error && error.message.includes("column")) {
        // Fix missing columns directly (more targeted than full autoRepair)
        await this.repairService.fixMissingColumns();
        // Retry after repair
        return this.createProject(data);
      }
      throw error;
    }
  }

  /**
   * Get project by ID
   */
  async getProjectById(id: string): Promise<BackendProject | null> {
    try {
      await this.core.ensureReady();

      // Use validation utilities
      const sanitizedId = sanitizeProjectId(id);
      if (!sanitizedId) {
        console.warn(`Invalid project ID: ${id} - ID is empty or invalid`);
        return null;
      }

      if (!isValidProjectId(sanitizedId)) {
        console.warn(`Invalid project ID format: ${sanitizedId}`);
        return null;
      }

      const rows = await this.dbManager.queryMain(
        `SELECT * FROM projects WHERE id = $1`,
        [sanitizedId]
      );

      return rows.rows.length > 0
        ? this.mappers.mapProject(
            rows.rows[0] as unknown as Record<string, unknown>
          )
        : null;
    } catch (error) {
      console.error("Failed to get project by ID:", error);
      throw error;
    }
  }

  /**
   * Get project by API key
   */
  async getProjectByApiKey(apiKey: string): Promise<BackendProject | null> {
    await this.core.ensureReady();
    const result = await this.dbManager.queryMain(
      "SELECT * FROM projects WHERE api_key = $1 AND is_active = true",
      [apiKey]
    );

    const row = result.rows[0];
    return row ? this.mappers.mapProject(row as Record<string, unknown>) : null;
  }

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<BackendProject[]> {
    try {
      await this.core.ensureReady();

      const result = await this.dbManager.queryMain(
        `SELECT * FROM projects ORDER BY created_at DESC`
      );
      return result.rows.map((row) =>
        this.mappers.mapProject(row as unknown as Record<string, unknown>)
      );
    } catch (error) {
      console.error("Failed to get all projects:", error);
      // Attempt to fix the issue
      await this.repairService.autoRepair();
      // Retry once after repair
      const result = await this.dbManager.queryMain(
        `SELECT * FROM projects ORDER BY created_at DESC`
      );
      return result.rows.map((row) =>
        this.mappers.mapProject(row as unknown as Record<string, unknown>)
      );
    }
  }

  /**
   * Update project
   */
  async updateProject(
    id: string,
    data: Partial<BackendProject>
  ): Promise<BackendProject | null> {
    try {
      await this.core.ensureReady();

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(data.name);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(data.description);
      }
      if (data.project_url !== undefined) {
        updates.push(`project_url = $${paramCount++}`);
        values.push(data.project_url);
      }
      // Handle both 'active' and 'is_active' fields (normalize to is_active)
      // Priority: is_active > active (is_active is the canonical field name)
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(data.is_active ? 1 : 0); // SQLite uses INTEGER 1/0 for booleans
      } else if (data.active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(data.active ? 1 : 0); // SQLite uses INTEGER 1/0 for booleans
      }
      if (data.settings !== undefined) {
        updates.push(`settings = $${paramCount++}`);
        values.push(JSON.stringify(data.settings));
      }

      if (updates.length === 0) {
        return this.getProjectById(id);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      // SQLite doesn't support RETURNING *, so update and query back separately
      await this.dbManager.queryMain(
        `UPDATE projects SET ${updates.join(", ")} WHERE id = $${paramCount}`,
        values
      );

      // Query back the updated row
      return this.getProjectById(id);
    } catch (error) {
      console.error("Failed to update project:", error);
      throw error;
    }
  }

  /**
   * Delete project
   */
  async deleteProject(id: string): Promise<boolean> {
    try {
      await this.core.ensureReady();

      if (this.dbManager.projectDbExists(id)) {
        // Delete all project-specific data from project DB
        await this.dbManager.queryProject(id, "DELETE FROM documents", []);
        await this.dbManager.queryProject(id, "DELETE FROM collections", []);
        await this.dbManager.queryProject(id, "DELETE FROM project_users", []);
        await this.dbManager.queryProject(id, "DELETE FROM files", []);
        await this.dbManager.queryProject(id, "DELETE FROM changelog", []);
        await this.dbManager.queryProject(id, "DELETE FROM api_keys", []);

        // Close project database connection
        await this.dbManager.closeProjectDb(id);

        // Delete entire project folder (database.db + files/)
        const projectFolderPath = this.dbManager.getProjectFolderPath(id);
        const fs = await import("fs/promises");
        try {
          // Delete entire project folder recursively
          await fs.rm(projectFolderPath, { recursive: true, force: true });
          console.log(`✅ Deleted project folder: ${projectFolderPath}`);
        } catch (error) {
          console.error(
            `⚠️ Error deleting project folder ${projectFolderPath}:`,
            error
          );
          // Try to delete just the database file as fallback
          try {
            const projectDbPath = this.dbManager.getProjectDbPath(id);
            await fs.unlink(projectDbPath);
          } catch {
            // Ignore if file doesn't exist
          }
        }
      }

      // Delete project metadata from main DB
      const result = await this.dbManager.queryMain(
        "DELETE FROM projects WHERE id = $1",
        [id]
      );

      // SQLite auto-commits
      return result.rowCount > 0;
    } catch (error) {
      // SQLite handles rollback automatically
      console.error("Failed to delete project:", error);
      throw error;
    }
  }

  /**
   * Regenerate project API key
   */
  async regenerateProjectApiKey(id: string): Promise<string | null> {
    await this.core.ensureReady();

    const apiKey = `pk_${uuidv4().replace(/-/g, "")}`;

    // Project metadata is in main DB
    await this.dbManager.queryMain(
      "UPDATE projects SET api_key = $1 WHERE id = $2",
      [apiKey, id]
    );

    // Query back the updated row
    const result = await this.dbManager.queryMain(
      "SELECT api_key FROM projects WHERE id = $1",
      [id]
    );

    return (result.rows[0]?.api_key as string) || null;
  }

  /**
   * Update project stats
   */
  async updateProjectStats(
    projectId: string,
    storageChange = 0,
    apiCall = false
  ): Promise<void> {
    await this.core.ensureReady();

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (storageChange !== 0) {
      updates.push(`storage_used = storage_used + $${paramCount++}`);
      values.push(storageChange);
    }

    if (apiCall) {
      updates.push(`api_calls_count = api_calls_count + 1`);
      updates.push(`last_api_call = CURRENT_TIMESTAMP`);
    }

    if (updates.length > 0) {
      values.push(projectId);
      await this.dbManager.queryMain(
        `UPDATE projects SET ${updates.join(", ")} WHERE id = $${paramCount}`,
        values
      );
    }
  }

  /**
   * Get user projects (projects owned by an admin user)
   */
  async getUserProjects(adminUserId: string): Promise<BackendProject[]> {
    await this.core.ensureReady();

    const result = await this.dbManager.queryMain(
      "SELECT * FROM projects WHERE owner_id = $1 OR created_by = $1 ORDER BY created_at DESC",
      [adminUserId]
    );

    return result.rows.map((row) =>
      this.mappers.mapProject(row as unknown as Record<string, unknown>)
    );
  }

  /**
   * Create default collections for a project
   */
  private async createDefaultCollections(
    projectId: string,
    _createdBy: string // Reserved for future audit logging
  ): Promise<void> {
    const defaultCollections = getDefaultCollections();

    for (const collectionSchema of defaultCollections) {
      try {
        try {
          await this.dbManager.queryProject(
            projectId,
            "SELECT id FROM collections WHERE name = $1",
            [collectionSchema.name]
          );
          console.log(
            `Default collection "${collectionSchema.name}" already exists in project ${projectId}, skipping`
          );
          continue;
        } catch {
          // Collection doesn't exist, proceed with creation
        }

        // Note: This would need to call the collection service
        // For now, we'll skip the actual creation and let it be handled by the collection service
        console.log(
          `Would create default collection "${collectionSchema.name}" for project ${projectId}`
        );
      } catch (error) {
        console.error(
          `⚠️ Failed to create default collection "${collectionSchema.name}" for project ${projectId}:`,
          error
        );
      }
    }
  }
}
