import { ApiKeyScope, Scope } from "@smartsamurai/krapi-sdk";
import { v4 as uuidv4 } from "uuid";

import { MultiDatabaseManager } from "../../multi-database-manager.service";
import { DatabaseCoreService } from "../core/database-core.service";
import { DatabaseMappersService } from "../database-mappers.service";

import { BackendApiKey } from "@/types";

/**
 * API Key Service
 * 
 * Handles all API key CRUD operations.
 * API keys can be stored in:
 * - Main database: Admin/system API keys
 * - Project databases: Project-specific API keys
 */
export class ApiKeyService {
  constructor(
    private dbManager: MultiDatabaseManager,
    private core: DatabaseCoreService,
    private mappers: DatabaseMappersService
  ) {}

  /**
   * Create API key (admin/system keys go to main DB)
   */
  async createApiKey(data: {
    name: string;
    scopes: ApiKeyScope[];
    project_id?: string;
    user_id: string;
    expires_at?: string;
    rate_limit?: number;
    metadata?: Record<string, unknown>;
  }): Promise<BackendApiKey> {
    await this.core.ensureReady();
    
    const key = `krapi_${uuidv4().replace(/-/g, "")}`;
    const apiKeyId = uuidv4();

    // Admin/system API keys go to main DB
    await this.dbManager.queryMain(
      `INSERT INTO api_keys (id, key, name, type, owner_id, scopes, project_ids, expires_at, rate_limit, metadata, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        apiKeyId,
        key,
        data.name,
        data.project_id ? "project" : "admin",
        data.user_id,
        JSON.stringify(data.scopes),
        data.project_id
          ? JSON.stringify([data.project_id])
          : JSON.stringify([]),
        data.expires_at || null,
        data.rate_limit || null,
        JSON.stringify(data.metadata || {}),
        1,
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryMain(
      "SELECT * FROM api_keys WHERE id = $1",
      [apiKeyId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Failed to create API key");
    }
    return this.mappers.mapApiKey(row as Record<string, unknown>);
  }

  /**
   * Get API key by key string
   */
  async getApiKey(key: string): Promise<BackendApiKey | null> {
    await this.core.ensureReady();

    // Try main DB first (admin/system keys)
    let result = await this.dbManager.queryMain(
      "SELECT * FROM api_keys WHERE key = $1 AND is_active = 1",
      [key]
    );

    // If not found in main DB, search project DBs
    if (result.rows.length === 0) {
      const projectDbs = this.dbManager.listProjectDbs();
      if (projectDbs) {
        for (const projectId of projectDbs) {
          result = await this.dbManager.queryProject(
            projectId,
            "SELECT * FROM api_keys WHERE key = $1 AND is_active = 1",
            [key]
          );
          if (result.rows.length > 0) break;
        }
      }
    }

    if (result.rows.length === 0) return null;

    // Update last_used_at (determine which DB based on where we found it)
    const apiKeyRow = result.rows[0];
    if (!apiKeyRow) {
      return null;
    }
    const projectId = apiKeyRow.project_ids
      ? JSON.parse(apiKeyRow.project_ids as string)[0]
      : null;

    if (projectId) {
      await this.dbManager.queryProject(
        projectId,
        "UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key = $1",
        [key]
      );
    } else {
      await this.dbManager.queryMain(
        "UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key = $1",
        [key]
      );
    }

    const row = result.rows[0];
    if (!row) {
      throw new Error("API key not found");
    }
    return this.mappers.mapApiKey(row as Record<string, unknown>);
  }

  /**
   * Get API keys by owner
   */
  async getApiKeysByOwner(ownerId: string): Promise<BackendApiKey[]> {
    await this.core.ensureReady();
    
    // Admin/system API keys are in main DB
    const result = await this.dbManager.queryMain(
      "SELECT * FROM api_keys WHERE owner_id = $1 ORDER BY created_at DESC",
      [ownerId]
    );

    return result.rows.map((row) => this.mappers.mapApiKey(row));
  }

  /**
   * Update API key
   */
  async updateApiKey(
    id: string,
    data: Partial<BackendApiKey>
  ): Promise<BackendApiKey | null> {
    await this.core.ensureReady();

    // First find which DB has this API key
    const apiKey = await this.getApiKeyById(id);
    if (!apiKey) return null;

    const projectId = (apiKey as { project_ids?: string[] | string })
      .project_ids
      ? Array.isArray(
          (apiKey as { project_ids?: string[] | string }).project_ids
        )
        ? (
            (apiKey as { project_ids?: string[] | string })
              .project_ids as string[]
          )[0]
        : JSON.parse(
            (apiKey as { project_ids?: string[] | string })
              .project_ids as string
          )[0]
      : apiKey.project_id || null;

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.scopes !== undefined) {
      fields.push(`scopes = $${paramCount++}`);
      values.push(JSON.stringify(data.scopes));
    }
    if (data.expires_at !== undefined) {
      fields.push(`expires_at = $${paramCount++}`);
      values.push(data.expires_at);
    }
    if (data.status !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.status === "active" ? 1 : 0);
    }

    if (fields.length === 0) return apiKey;

    values.push(id);

    // Update in appropriate DB
    if (projectId) {
      await this.dbManager.queryProject(
        projectId,
        `UPDATE api_keys SET ${fields.join(", ")} WHERE id = $${paramCount}`,
        values
      );

      // Query back from project DB
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM api_keys WHERE id = $1",
        [id]
      );
      const row = result.rows[0];
      return row ? this.mappers.mapApiKey(row as Record<string, unknown>) : null;
    } else {
      await this.dbManager.queryMain(
        `UPDATE api_keys SET ${fields.join(", ")} WHERE id = $${paramCount}`,
        values
      );

      // Query back from main DB
      const result = await this.dbManager.queryMain(
        "SELECT * FROM api_keys WHERE id = $1",
        [id]
      );
      const row = result.rows[0];
      return row ? this.mappers.mapApiKey(row as Record<string, unknown>) : null;
    }
  }

  /**
   * Delete API key (soft delete - set is_active = 0)
   */
  async deleteApiKey(id: string): Promise<boolean> {
    await this.core.ensureReady();

    // First find which DB has this API key
    const apiKey = await this.getApiKeyById(id);
    if (!apiKey) return false;

    const projectId = (apiKey as { project_ids?: string[] | string })
      .project_ids
      ? Array.isArray(
          (apiKey as { project_ids?: string[] | string }).project_ids
        )
        ? (
            (apiKey as { project_ids?: string[] | string })
              .project_ids as string[]
          )[0]
        : JSON.parse(
            (apiKey as { project_ids?: string[] | string })
              .project_ids as string
          )[0]
      : apiKey.project_id || null;

    if (projectId) {
      const result = await this.dbManager.queryProject(
        projectId,
        "UPDATE api_keys SET is_active = 0 WHERE id = $1",
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    } else {
      const result = await this.dbManager.queryMain(
        "UPDATE api_keys SET is_active = 0 WHERE id = $1",
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    }
  }

  /**
   * Get API key by ID
   */
  async getApiKeyById(id: string): Promise<BackendApiKey | null> {
    await this.core.ensureReady();

    // Try main DB first
    let result = await this.dbManager.queryMain(
      "SELECT * FROM api_keys WHERE id = $1",
      [id]
    );

    // If not found, search project DBs
    if (result.rows.length === 0) {
      const projectDbs = this.dbManager.listProjectDbs();
      for (const projectId of projectDbs) {
        result = await this.dbManager.queryProject(
          projectId,
          "SELECT * FROM api_keys WHERE id = $1",
          [id]
        );
        if (result.rows.length > 0) break;
      }
    }

    const row = result.rows[0];
    return row ? this.mappers.mapApiKey(row as Record<string, unknown>) : null;
  }

  /**
   * Create project API key (project-specific keys go to project DB)
   */
  async createProjectApiKey(apiKey: {
    project_id: string;
    name: string;
    scopes: ApiKeyScope[];
    user_id: string;
    expires_at?: string;
    rate_limit?: number;
    metadata?: Record<string, unknown>;
  }): Promise<BackendApiKey> {
    await this.core.ensureReady();

    const key = `krapi_${uuidv4().replace(/-/g, "")}`;
    const apiKeyId = uuidv4();

    // Project API keys go to project-specific database
    await this.dbManager.queryProject(
      apiKey.project_id,
      `INSERT INTO api_keys (id, key, name, type, project_id, owner_id, scopes, expires_at, metadata, is_active, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        apiKeyId,
        key,
        apiKey.name,
        "project",
        apiKey.project_id,
        apiKey.user_id,
        JSON.stringify(apiKey.scopes),
        apiKey.expires_at || null,
        JSON.stringify(apiKey.metadata || {}),
        1,
        new Date().toISOString(),
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryProject(
      apiKey.project_id,
      "SELECT * FROM api_keys WHERE id = $1",
      [apiKeyId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("API key not found");
    }
    return this.mappers.mapApiKey(row as Record<string, unknown>);
  }

  /**
   * Get project API keys (from project DB)
   */
  async getProjectApiKeys(projectId: string): Promise<BackendApiKey[]> {
    await this.core.ensureReady();

    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM api_keys 
       WHERE type = 'project' AND is_active = 1
       ORDER BY created_at DESC`
    );

    return result.rows.map((row) => this.mappers.mapApiKey(row));
  }

  /**
   * Get project API key by ID (search project DB)
   */
  async getProjectApiKeyById(keyId: string): Promise<BackendApiKey | null> {
    await this.core.ensureReady();

    // Search all project databases for this key
    const projectDbs = this.dbManager.listProjectDbs();
    for (const projectId of projectDbs) {
      const result = await this.dbManager.queryProject(
        projectId,
        "SELECT * FROM api_keys WHERE id = $1 AND type = 'project'",
        [keyId]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        if (!row) {
          throw new Error("API key not found");
        }
        return this.mappers.mapApiKey(row as Record<string, unknown>);
      }
    }

    return null;
  }

  /**
   * Delete project API key
   */
  async deleteProjectApiKey(keyId: string): Promise<boolean> {
    await this.core.ensureReady();

    // Find which project DB has this key
    const apiKey = await this.getProjectApiKeyById(keyId);
    if (!apiKey) return false;

    // Find project_id from api_key (might need to search all projects)
    const projectDbs = this.dbManager.listProjectDbs();
    for (const projectId of projectDbs) {
      const result = await this.dbManager.queryProject(
        projectId,
        "UPDATE api_keys SET is_active = 0 WHERE id = $1 AND type = 'project'",
        [keyId]
      );
      if (result.rowCount > 0) return true;
    }

    return false;
  }

  /**
   * Get user API keys (admin/system keys from main DB)
   */
  async getUserApiKeys(userId: string): Promise<BackendApiKey[]> {
    await this.core.ensureReady();

    const result = await this.dbManager.queryMain(
      `SELECT * FROM api_keys 
       WHERE owner_id = $1 AND type = 'admin' AND is_active = 1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map((row) => this.mappers.mapApiKey(row));
  }

  /**
   * Create user API key (admin/system keys go to main DB)
   */
  async createUserApiKey(apiKey: {
    user_id: string;
    name: string;
    key: string;
    type: string;
    scopes: Scope[];
    project_ids: string[] | null;
    created_by: string;
    created_at: string;
    last_used_at: string | null;
    active: boolean;
  }): Promise<BackendApiKey> {
    await this.core.ensureReady();

    const apiKeyId = uuidv4();

    // Admin/system API keys go to main DB
    await this.dbManager.queryMain(
      `INSERT INTO api_keys (id, key, name, type, owner_id, scopes, project_ids, created_at, last_used_at, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        apiKeyId,
        apiKey.key,
        apiKey.name,
        apiKey.type,
        apiKey.user_id,
        JSON.stringify(apiKey.scopes),
        apiKey.project_ids
          ? JSON.stringify(apiKey.project_ids)
          : JSON.stringify([]),
        apiKey.created_at,
        apiKey.last_used_at || null,
        apiKey.active ? 1 : 0,
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryMain(
      "SELECT * FROM api_keys WHERE id = $1",
      [apiKeyId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("API key not found");
    }
    return this.mappers.mapApiKey(row as Record<string, unknown>);
  }

  /**
   * Get project API key (from project DB)
   */
  async getProjectApiKey(
    projectId: string,
    keyId: string
  ): Promise<BackendApiKey | null> {
    await this.core.ensureReady();
    
    // Project API keys are in project DBs
    const result = await this.dbManager.queryProject(
      projectId,
      `SELECT * FROM api_keys 
       WHERE id = $1`,
      [keyId]
    );
    const row = result.rows[0];
    return row ? this.mappers.mapApiKey(row as Record<string, unknown>) : null;
  }

  /**
   * Update project API key
   */
  async updateProjectApiKey(
    projectId: string,
    keyId: string,
    updates: Partial<BackendApiKey>
  ): Promise<BackendApiKey | null> {
    await this.core.ensureReady();
    
    const { name, scopes, expires_at, status } = updates;

    // Project API keys are in project DBs
    await this.dbManager.queryProject(
      projectId,
      `UPDATE api_keys 
       SET name = $1, scopes = $2, expires_at = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        name || undefined,
        scopes ? JSON.stringify(scopes) : undefined,
        expires_at || null,
        status === "active" ? 1 : 0,
        keyId,
      ].filter((v) => v !== undefined)
    );

    // Query back the updated row
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM api_keys WHERE id = $1",
      [keyId]
    );
    const row = result.rows[0];
    return row ? this.mappers.mapApiKey(row as Record<string, unknown>) : null;
  }

  /**
   * Regenerate API key
   */
  async regenerateApiKey(
    projectId: string,
    keyId: string
  ): Promise<BackendApiKey | null> {
    await this.core.ensureReady();
    
    const newKey = `krapi_${uuidv4().replace(/-/g, "")}`;

    // Project API keys are in project DBs
    await this.dbManager.queryProject(
      projectId,
      `UPDATE api_keys 
       SET key = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newKey, keyId]
    );

    // Query back the updated row
    const result = await this.dbManager.queryProject(
      projectId,
      "SELECT * FROM api_keys WHERE id = $1",
      [keyId]
    );
    const row = result.rows[0];
    return row ? this.mappers.mapApiKey(row as Record<string, unknown>) : null;
  }

  /**
   * Create admin API key
   */
  async createAdminApiKey(apiKey: {
    name: string;
    user_id: string;
    key: string;
    type: string;
    scopes: Scope[];
    project_ids: string[] | null;
    created_by: string;
    created_at: string;
    last_used_at: string | null;
    active: boolean;
    expires_at?: string;
    rate_limit?: number;
    metadata?: Record<string, unknown>;
  }): Promise<BackendApiKey> {
    await this.core.ensureReady();
    
    const apiKeyId = uuidv4();
    const key = apiKey.key || `krapi_${uuidv4().replace(/-/g, "")}`;

    // Admin/system API keys go to main DB
    await this.dbManager.queryMain(
      `INSERT INTO api_keys (id, key, name, type, owner_id, scopes, project_ids, expires_at, rate_limit, metadata, is_active, created_at, last_used_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        apiKeyId,
        key,
        apiKey.name,
        apiKey.type || "admin",
        apiKey.user_id,
        JSON.stringify(apiKey.scopes),
        apiKey.project_ids
          ? JSON.stringify(apiKey.project_ids)
          : JSON.stringify([]),
        apiKey.expires_at || null,
        apiKey.rate_limit || null,
        JSON.stringify(apiKey.metadata || {}),
        apiKey.active ? 1 : 0,
        apiKey.created_at,
        apiKey.last_used_at || null,
      ]
    );

    // Query back the inserted row
    const result = await this.dbManager.queryMain(
      "SELECT * FROM api_keys WHERE id = $1",
      [apiKeyId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("API key not found");
    }
    return this.mappers.mapApiKey(row as Record<string, unknown>);
  }
}








