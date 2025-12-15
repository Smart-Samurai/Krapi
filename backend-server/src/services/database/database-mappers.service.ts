import {
  AdminUser,
  AdminRole,
  AccessLevel,
  BackendProject,
  BackendProjectSettings,
  BackendProjectUser,
  Collection,
  CollectionField,
  CollectionIndex,
  Document,
  FileRecord,
  BackendSession,
  SessionType,
  BackendChangelogEntry,
  BackendApiKey,
  Scope,
  ApiKeyScope,
} from "@/types";

/**
 * Database Mappers Service
 *
 * Handles all data mapping functions that convert database rows to TypeScript types.
 * All map* functions are centralized here for consistency.
 */
export class DatabaseMappersService {
  /**
   * Map database row to AdminUser
   */
  mapAdminUser(row: Record<string, unknown>): AdminUser {
    // Parse permissions from JSON string (SQLite stores arrays as JSON strings)
    let permissions: string[] = [];
    if (row.permissions) {
      if (typeof row.permissions === "string") {
        try {
          permissions = JSON.parse(row.permissions) as string[];
        } catch {
          permissions = [];
        }
      } else if (Array.isArray(row.permissions)) {
        permissions = row.permissions as string[];
      }
    }

    const user: AdminUser = {
      id: row.id as string,
      username: row.username as string,
      email: row.email as string,
      password_hash: row.password_hash as string,
      role: row.role as AdminRole,
      access_level: row.access_level as AccessLevel,
      permissions,
      active: row.is_active as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      login_count: (row.login_count as number) || 0,
    };
    const lastLogin = row.last_login as string | null | undefined;
    if (lastLogin !== undefined && lastLogin !== null) {
      user.last_login = lastLogin;
    }
    const apiKey = row.api_key as string | null | undefined;
    if (apiKey !== undefined && apiKey !== null) {
      user.api_key = apiKey;
    }
    return user;
  }

  /**
   * Map database row to BackendProject
   */
  mapProject(row: Record<string, unknown>): BackendProject {
    const project: BackendProject = {
      id: row.id as string,
      name: row.name as string,
      api_key: row.api_key as string,
      settings: row.settings as BackendProjectSettings,
      created_by: row.created_by as string,
      owner_id: row.owner_id as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      active: (row.is_active as number) === 1,
      storage_used: (row.storage_used as number) || 0,
      allowed_origins: (row.allowed_origins as string[]) || [],
      total_api_calls: (row.total_api_calls as number) || 0,
      is_active: row.is_active as boolean,
    };
    const description = row.description as string | null | undefined;
    if (description !== undefined && description !== null) {
      project.description = description;
    }
    const projectUrl = row.project_url as string | null | undefined;
    if (projectUrl !== undefined && projectUrl !== null) {
      project.project_url = projectUrl;
    }
    const lastApiCall = row.last_api_call as string | null | undefined;
    if (lastApiCall !== undefined && lastApiCall !== null) {
      project.last_api_call = lastApiCall;
    }
    const rateLimit = row.rate_limit as number | null | undefined;
    if (rateLimit !== undefined && rateLimit !== null) {
      project.rate_limit = rateLimit;
    }
    const rateLimitWindow = row.rate_limit_window as number | null | undefined;
    if (rateLimitWindow !== undefined && rateLimitWindow !== null) {
      project.rate_limit_window = rateLimitWindow;
    }
    return project;
  }

  /**
   * Map database row to BackendProjectUser
   * Note: This method is kept for backward compatibility but is no longer used
   * since project users are now stored as documents in the "users" collection
   */
  mapProjectUser(_row: Record<string, unknown>): BackendProjectUser {
    const user: BackendProjectUser = {
      id: _row.id as string,
      project_id: _row.project_id as string,
      username: _row.username as string,
      email: _row.email as string,
      is_verified: _row.is_verified as boolean,
      scopes: (_row.scopes as string[]) || [],
      permissions: (_row.permissions as string[]) || [],
      created_at: _row.created_at as string,
      updated_at: _row.updated_at as string,
      status: (_row.status as "active" | "inactive" | "suspended") || "active",
      is_active: _row.is_active as boolean,
      metadata: (_row.metadata as Record<string, unknown>) || {},
    };
    const phone = _row.phone as string | null | undefined;
    if (phone !== undefined && phone !== null) {
      user.phone = phone;
    }
    const password = _row.password as string | null | undefined;
    if (password !== undefined && password !== null) {
      user.password = password;
    }
    const lastLogin = _row.last_login as string | null | undefined;
    if (lastLogin !== undefined && lastLogin !== null) {
      user.last_login = lastLogin;
    }
    const role = _row.role as string | null | undefined;
    if (role !== undefined && role !== null) {
      user.role = role as "admin" | "superadmin" | "viewer";
    }
    const loginCount = _row.login_count as number | null | undefined;
    if (loginCount !== undefined && loginCount !== null) {
      user.login_count = loginCount;
    }
    return user;
  }

  /**
   * Map database row to Collection
   */
  mapCollection(row: Record<string, unknown>): Collection {
    const collection: Collection = {
      id: row.id as string,
      project_id: row.project_id as string,
      name: row.name as string,
      fields: (row.fields as CollectionField[]) || [],
      indexes: (row.indexes as CollectionIndex[]) || [],
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      schema: {
        fields: (row.fields as CollectionField[]) || [],
        indexes: (row.indexes as CollectionIndex[]) || [],
      },
      settings: {
        read_permissions: [],
        write_permissions: [],
        delete_permissions: [],
        enable_audit_log: false,
        enable_versioning: false,
        enable_soft_delete: false,
      },
    };
    const description = row.description as string | null | undefined;
    if (description !== undefined && description !== null) {
      collection.description = description;
    }
    return collection;
  }

  /**
   * Map database row to Document
   */
  mapDocument(row: Record<string, unknown>): Document {
    // Parse data from JSON string (SQLite stores JSON as TEXT)
    let parsedData: Record<string, unknown> = {};
    if (typeof row.data === "string") {
      try {
        parsedData = JSON.parse(row.data);
      } catch (error) {
        console.error("Error parsing document data JSON:", error);
        parsedData = {};
      }
    } else if (typeof row.data === "object" && row.data !== null) {
      parsedData = row.data as Record<string, unknown>;
    }

    const createdBy = row.created_by as string | null | undefined;
    const updatedBy = row.updated_by as string | null | undefined;
    const document: Document = {
      id: row.id as string,
      project_id: row.project_id as string,
      collection_id: row.collection_id as string,
      data: parsedData,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      created_by: createdBy || "system",
      updated_by: updatedBy || "system",
      version: (row.version as number) || 1,
      is_deleted: (row.is_deleted as boolean) || false,
    };
    return document;
  }

  /**
   * Map database row to FileRecord
   */
  mapFile(row: Record<string, unknown>): FileRecord {
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      filename: row.filename as string,
      original_name: row.original_name as string,
      mime_type: row.mime_type as string,
      size: parseInt(row.size as string),
      path: row.path as string,
      uploaded_by: row.created_by as string,
      created_at: row.created_at as string,
      url: (row.url as string) || "",
      updated_at: (row.updated_at as string) || (row.created_at as string),
    };
  }

  /**
   * Map database row to BackendSession
   */
  mapSession(row: Record<string, unknown>): BackendSession {
    // Parse scopes from JSON string (SQLite stores arrays as JSON strings)
    let scopes: Scope[] = [];
    if (row.scopes) {
      if (typeof row.scopes === "string") {
        try {
          scopes = JSON.parse(row.scopes) as Scope[];
        } catch {
          scopes = [];
        }
      } else if (Array.isArray(row.scopes)) {
        scopes = row.scopes as Scope[];
      }
    }

    // Parse metadata from JSON string (SQLite stores objects as JSON strings)
    let metadata: Record<string, unknown> = {};
    if (row.metadata) {
      if (typeof row.metadata === "string") {
        try {
          metadata = JSON.parse(row.metadata) as Record<string, unknown>;
        } catch {
          metadata = {};
        }
      } else if (typeof row.metadata === "object") {
        metadata = row.metadata as Record<string, unknown>;
      }
    }

    // Parse consumed flag - SQLite stores as INTEGER 1/0
    const consumedValue = row.consumed;
    const consumed =
      consumedValue === 1 || consumedValue === "1" || consumedValue === true;

    // Parse is_active flag - SQLite stores as INTEGER 1/0
    const isActiveValue = row.is_active;
    const isActive =
      isActiveValue === 1 || isActiveValue === "1" || isActiveValue === true;

    const session: BackendSession = {
      id: row.id as string,
      token: row.token as string,
      type: row.type as SessionType,
      user_id: row.user_id as string,
      scopes,
      metadata,
      expires_at: row.expires_at as string,
      created_at: row.created_at as string,
      is_active: isActive,
      consumed,
    };
    const projectId = row.project_id as string | null | undefined;
    if (projectId !== undefined && projectId !== null) {
      session.project_id = projectId;
    }
    const lastUsedAt = row.last_used_at as string | null | undefined;
    if (lastUsedAt !== undefined && lastUsedAt !== null) {
      session.last_used_at = lastUsedAt;
    }
    const ipAddress = row.ip_address as string | null | undefined;
    if (ipAddress !== undefined && ipAddress !== null) {
      session.ip_address = ipAddress;
    }
    const userAgent = row.user_agent as string | null | undefined;
    if (userAgent !== undefined && userAgent !== null) {
      session.user_agent = userAgent;
    }
    return session;
  }

  /**
   * Map database row to BackendChangelogEntry
   */
  mapChangelogEntry(row: Record<string, unknown>): BackendChangelogEntry {
    const entityType = row.entity_type as string | null | undefined;
    const entityId = row.entity_id as string | null | undefined;
    const performedBy = row.performed_by as string | null | undefined;
    const entry: BackendChangelogEntry = {
      id: row.id as string,
      action: row.action as string,
      changes: (row.changes as Record<string, unknown>) || {},
      created_at: row.created_at as string,
      user_id: performedBy || "",
      resource_type: entityType || "",
      resource_id: entityId || "",
    };
    const projectId = row.project_id as string | null | undefined;
    if (projectId !== undefined && projectId !== null) {
      entry.project_id = projectId;
    }
    if (entityType !== undefined && entityType !== null) {
      entry.entity_type = entityType;
    }
    if (entityId !== undefined && entityId !== null) {
      entry.entity_id = entityId;
    }
    if (performedBy !== undefined && performedBy !== null) {
      entry.performed_by = performedBy;
    }
    const sessionId = row.session_id as string | null | undefined;
    if (sessionId !== undefined && sessionId !== null) {
      entry.session_id = sessionId;
    }
    return entry;
  }

  /**
   * Map database row to BackendApiKey
   */
  mapApiKey(row: Record<string, unknown>): BackendApiKey {
    const apiKey: BackendApiKey = {
      id: row.id as string,
      key: row.key as string,
      name: row.name as string,
      scopes: (row.scopes as ApiKeyScope[]) || [],
      user_id: row.user_id as string,
      status: row.is_active ? "active" : "inactive", // Map from is_active boolean
      created_at: row.created_at as string,
      usage_count: (row.usage_count as number) || 0,
      metadata: (row.metadata as Record<string, unknown>) || {},
    };
    const projectId = row.project_id as string | null | undefined;
    if (projectId !== undefined && projectId !== null) {
      apiKey.project_id = projectId;
    }
    const expiresAt = row.expires_at as string | null | undefined;
    if (expiresAt !== undefined && expiresAt !== null) {
      apiKey.expires_at = expiresAt;
    }
    const lastUsedAt = row.last_used_at as string | null | undefined;
    if (lastUsedAt !== undefined && lastUsedAt !== null) {
      apiKey.last_used_at = lastUsedAt;
    }
    const rateLimit = row.rate_limit as number | null | undefined;
    if (rateLimit !== undefined && rateLimit !== null) {
      apiKey.rate_limit = rateLimit;
    }
    return apiKey;
  }
}
