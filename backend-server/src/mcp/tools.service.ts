import { DatabaseService } from "@/services/database.service";
import { CollectionField } from "@/types";

/**
 * Context information for MCP tool execution
 * 
 * @typedef {Object} ToolContext
 * @property {"admin" | "project"} scope - The scope of the operation (admin or project-level)
 * @property {string} [projectId] - The project ID (required for project-scoped operations)
 * @property {string} [userId] - The user ID executing the operation
 */
export type ToolContext = {
  scope: "admin" | "project";
  projectId?: string;
  userId?: string;
};

/**
 * MCP Tools Service
 * 
 * Provides database operations for the Model Context Protocol (MCP).
 * All operations are scoped to either admin or project level, with proper
 * authentication and authorization checks.
 * 
 * @class McpToolsService
 * @example
 * const tools = new McpToolsService();
 * const ctx = { scope: "admin", userId: "user-123" };
 * const project = await tools.createProject(ctx, { name: "My Project" });
 */
export class McpToolsService {
  private db = DatabaseService.getInstance();

  /**
   * Create a new project
   * 
   * @param {ToolContext} ctx - Tool execution context (must have admin scope)
   * @param {Object} args - Project creation arguments
   * @param {string} args.name - Project name (required)
   * @param {string} [args.description] - Project description
   * @param {string} [args.project_url] - Project URL (defaults to "localhost")
   * @returns {Promise<BackendProject>} The created project
   * @throws {Error} If scope is not "admin"
   * 
   * @example
   * const project = await tools.createProject(
   *   { scope: "admin", userId: "user-123" },
   *   { name: "My Project", description: "A new project" }
   * );
   */
  async createProject(
    ctx: ToolContext,
    args: { name: string; description?: string; project_url?: string }
  ) {
    if (ctx.scope !== "admin") throw new Error("Admin scope required");
    const project = await this.db.createProject({
      name: args.name,
      description: args.description || null,
      allowed_origins: [args.project_url || "localhost"],
      active: true,
      created_by: ctx.userId || "system",
      settings: {
        public: false,
        allow_registration: false,
        require_email_verification: false,
        max_file_size: 10485760,
        allowed_file_types: ["*"],
        authentication_required: true,
        cors_enabled: true,
        rate_limiting_enabled: false,
        logging_enabled: true,
        encryption_enabled: false,
        backup_enabled: false,
        custom_headers: {},
        environment: "development" as const,
      },
      api_key: `pk_${Math.random().toString(36).substr(2, 9)}`,
    });
    return project;
  }

  /**
   * Get project details by ID
   * 
   * @param {ToolContext} ctx - Tool execution context (must have admin scope)
   * @param {Object} args - Project lookup arguments
   * @param {string} args.project_id - Project ID to retrieve
   * @returns {Promise<BackendProject | null>} The project or null if not found
   * @throws {Error} If scope is not "admin"
   * 
   * @example
   * const project = await tools.getProject(
   *   { scope: "admin" },
   *   { project_id: "project-uuid" }
   * );
   */
  async getProject(
    ctx: ToolContext,
    args: { project_id: string }
  ) {
    if (ctx.scope !== "admin") throw new Error("Admin scope required");
    return this.db.getProjectById(args.project_id);
  }

  /**
   * Update project details
   * 
   * @param {ToolContext} ctx - Tool execution context (must have admin scope)
   * @param {Object} args - Project update arguments
   * @param {string} args.project_id - Project ID to update (required)
   * @param {string} [args.name] - New project name
   * @param {string} [args.description] - New project description
   * @param {string} [args.project_url] - New project URL
   * @param {boolean} [args.active] - Whether the project is active
   * @returns {Promise<BackendProject>} The updated project
   * @throws {Error} If scope is not "admin"
   * 
   * @example
   * const updated = await tools.updateProject(
   *   { scope: "admin" },
   *   { project_id: "project-uuid", name: "Updated Name" }
   * );
   */
  async updateProject(
    ctx: ToolContext,
    args: {
      project_id: string;
      name?: string;
      description?: string;
      project_url?: string;
      active?: boolean;
    }
  ) {
    if (ctx.scope !== "admin") throw new Error("Admin scope required");
    const updated = await this.db.updateProject(args.project_id, {
      name: args.name,
      description: args.description,
      is_active: args.active,
    });
    return updated;
  }

  /**
   * Delete a project
   * 
   * @param {ToolContext} ctx - Tool execution context (must have admin scope)
   * @param {Object} args - Project deletion arguments
   * @param {string} args.project_id - Project ID to delete
   * @returns {Promise<{success: boolean}>} Success indicator
   * @throws {Error} If scope is not "admin"
   * 
   * @example
   * await tools.deleteProject(
   *   { scope: "admin" },
   *   { project_id: "project-uuid" }
   * );
   */
  async deleteProject(
    ctx: ToolContext,
    args: { project_id: string }
  ) {
    if (ctx.scope !== "admin") throw new Error("Admin scope required");
    await this.db.deleteProject(args.project_id);
    return { success: true };
  }

  /**
   * List all projects with optional search filter
   * 
   * @param {ToolContext} ctx - Tool execution context (must have admin scope)
   * @param {Object} args - List arguments
   * @param {string} [args.search] - Optional search term to filter projects by name
   * @returns {Promise<BackendProject[]>} Array of projects
   * @throws {Error} If scope is not "admin"
   * 
   * @example
   * const projects = await tools.listProjects(
   *   { scope: "admin" },
   *   { search: "my project" }
   * );
   */
  async listProjects(ctx: ToolContext, args: { search?: string }) {
    if (ctx.scope !== "admin") throw new Error("Admin scope required");
    const projects = await this.db.getAllProjects();
    return args.search
      ? projects.filter((p) =>
          p.name.toLowerCase().includes(args.search!.toLowerCase())
        )
      : projects;
  }

  /**
   * Get project settings
   * 
   * @param {ToolContext} ctx - Tool execution context (must have admin scope)
   * @param {Object} args - Settings lookup arguments
   * @param {string} args.project_id - Project ID
   * @returns {Promise<BackendProjectSettings>} Project settings
   * @throws {Error} If scope is not "admin"
   * 
   * @example
   * const settings = await tools.getProjectSettings(
   *   { scope: "admin" },
   *   { project_id: "project-uuid" }
   * );
   */
  async getProjectSettings(
    ctx: ToolContext,
    args: { project_id: string }
  ) {
    if (ctx.scope !== "admin") throw new Error("Admin scope required");
    return this.db.getProjectSettings(args.project_id);
  }

  /**
   * Get project statistics
   * 
   * @param {ToolContext} ctx - Tool execution context (must have admin scope)
   * @param {Object} args - Statistics lookup arguments
   * @param {string} args.project_id - Project ID
   * @returns {Promise<BackendProjectStats>} Project statistics
   * @throws {Error} If scope is not "admin"
   * 
   * @example
   * const stats = await tools.getProjectStats(
   *   { scope: "admin" },
   *   { project_id: "project-uuid" }
   * );
   */
  async getProjectStats(
    ctx: ToolContext,
    args: { project_id: string }
  ) {
    if (ctx.scope !== "admin") throw new Error("Admin scope required");
    return this.db.getProjectStats(args.project_id);
  }

  /**
   * Create a new collection in a project
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - Collection creation arguments
   * @param {string} args.name - Collection name (required)
   * @param {string} [args.description] - Collection description
   * @param {CollectionField[]} args.fields - Array of field definitions
   * @returns {Promise<Collection>} The created collection
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const collection = await tools.createCollection(
   *   { scope: "project", projectId: "project-uuid", userId: "user-123" },
   *   { name: "users", fields: [{ name: "email", type: "string" }] }
   * );
   */
  async createCollection(
    ctx: ToolContext,
    args: { name: string; description?: string; fields: CollectionField[] }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    return this.db.createCollection(
      ctx.projectId,
      args.name,
      {
        description: args.description || "",
        fields: args.fields,
        indexes: [],
      },
      ctx.userId || "system"
    );
  }

  /**
   * Get collection details by name
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - Collection lookup arguments
   * @param {string} args.collection_name - Collection name to retrieve
   * @returns {Promise<Collection | null>} The collection or null if not found
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const collection = await tools.getCollection(
   *   { scope: "project", projectId: "project-uuid" },
   *   { collection_name: "users" }
   * );
   */
  async getCollection(
    ctx: ToolContext,
    args: { collection_name: string }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    return this.db.getCollection(ctx.projectId, args.collection_name);
  }

  /**
   * List all collections in a project
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @returns {Promise<Collection[]>} Array of all collections in the project
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const collections = await tools.listCollections(
   *   { scope: "project", projectId: "project-uuid" }
   * );
   */
  async listCollections(ctx: ToolContext) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    return this.db.getProjectTableSchemas(ctx.projectId);
  }

  /**
   * Update a collection's schema or description
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - Collection update arguments
   * @param {string} args.collection_name - Collection name to update (required)
   * @param {string} [args.description] - New collection description
   * @param {CollectionField[]} [args.fields] - Updated field definitions
   * @returns {Promise<Collection>} The updated collection
   * @throws {Error} If scope is not "project", projectId is missing, or collection not found
   * 
   * @example
   * const updated = await tools.updateCollection(
   *   { scope: "project", projectId: "project-uuid" },
   *   { collection_name: "users", description: "Updated description" }
   * );
   */
  async updateCollection(
    ctx: ToolContext,
    args: {
      collection_name: string;
      description?: string;
      fields?: CollectionField[];
    }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    const collection = await this.db.getCollection(
      ctx.projectId,
      args.collection_name
    );
    if (!collection) {
      throw new Error(`Collection '${args.collection_name}' not found`);
    }
    return this.db.updateCollection(ctx.projectId, args.collection_name, {
      description: args.description,
      fields: args.fields,
    });
  }

  /**
   * Delete a collection from a project
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - Collection deletion arguments
   * @param {string} args.collection_name - Collection name to delete
   * @returns {Promise<{success: boolean}>} Success indicator
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * await tools.deleteCollection(
   *   { scope: "project", projectId: "project-uuid" },
   *   { collection_name: "users" }
   * );
   */
  async deleteCollection(
    ctx: ToolContext,
    args: { collection_name: string }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    await this.db.deleteCollection(ctx.projectId, args.collection_name);
    return { success: true };
  }

  /**
   * Create a new document in a collection
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - Document creation arguments
   * @param {string} args.collection_name - Collection name to create document in
   * @param {Record<string, unknown>} args.data - Document data (must match collection schema)
   * @returns {Promise<Document>} The created document
   * @throws {Error} If scope is not "project", projectId is missing, or collection not found
   * 
   * @example
   * const document = await tools.createDocument(
   *   { scope: "project", projectId: "project-uuid", userId: "user-123" },
   *   { collection_name: "users", data: { email: "user@example.com", name: "John" } }
   * );
   */
  async createDocument(
    ctx: ToolContext,
    args: { collection_name: string; data: Record<string, unknown> }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    return this.db.createDocument(
      ctx.projectId,
      args.collection_name,
      args.data,
      ctx.userId || "system"
    );
  }

  /**
   * Get a document by ID from a collection
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - Document lookup arguments
   * @param {string} args.collection_name - Collection name
   * @param {string} args.document_id - Document ID to retrieve
   * @returns {Promise<Document | null>} The document or null if not found
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const document = await tools.getDocument(
   *   { scope: "project", projectId: "project-uuid" },
   *   { collection_name: "users", document_id: "doc-uuid" }
   * );
   */
  async getDocument(
    ctx: ToolContext,
    args: { collection_name: string; document_id: string }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    return this.db.getDocument(
      ctx.projectId,
      args.collection_name,
      args.document_id
    );
  }

  /**
   * List documents in a collection with filtering, pagination, and sorting
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - List arguments
   * @param {string} args.collection_name - Collection name (required)
   * @param {number} [args.limit] - Maximum number of documents to return (default: 50)
   * @param {number} [args.offset] - Number of documents to skip
   * @param {number} [args.page] - Page number (alternative to offset, calculates offset automatically)
   * @param {string} [args.order_by] - Field name to sort by (default: "created_at")
   * @param {"asc" | "desc"} [args.order] - Sort order (default: "desc")
   * @param {Record<string, unknown>} [args.where] - Filter conditions (field: value pairs)
   * @returns {Promise<{documents: Document[], total: number}>} Documents and total count
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const result = await tools.listDocuments(
   *   { scope: "project", projectId: "project-uuid" },
   *   { collection_name: "users", limit: 10, page: 1, order_by: "created_at", order: "desc" }
   * );
   */
  async listDocuments(
    ctx: ToolContext,
    args: {
      collection_name: string;
      limit?: number;
      offset?: number;
      page?: number;
      order_by?: string;
      order?: "asc" | "desc";
      where?: Record<string, unknown>;
    }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    const offset = args.offset ?? ((args.page || 1) - 1) * (args.limit || 50);
    return this.db.getDocuments(ctx.projectId, args.collection_name, {
      limit: args.limit || 50,
      offset,
      orderBy: args.order_by,
      order: args.order,
      where: args.where,
    });
  }

  /**
   * Search documents in a collection by text
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - Search arguments
   * @param {string} args.collection_name - Collection name to search in
   * @param {string} args.search_term - Text to search for
   * @param {string[]} [args.search_fields] - Specific fields to search (searches all fields if not provided)
   * @param {number} [args.limit] - Maximum number of results (default: 50)
   * @param {number} [args.offset] - Number of results to skip (default: 0)
   * @returns {Promise<Document[]>} Array of matching documents
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const results = await tools.searchDocuments(
   *   { scope: "project", projectId: "project-uuid" },
   *   { collection_name: "users", search_term: "john", search_fields: ["name", "email"] }
   * );
   */
  async searchDocuments(
    ctx: ToolContext,
    args: {
      collection_name: string;
      search_term: string;
      search_fields?: string[];
      limit?: number;
      offset?: number;
    }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    return this.db.searchDocuments(
      ctx.projectId,
      args.collection_name,
      args.search_term,
      args.search_fields,
      {
        limit: args.limit || 50,
        offset: args.offset || 0,
      }
    );
  }

  /**
   * Count documents in a collection with optional filtering
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - Count arguments
   * @param {string} args.collection_name - Collection name
   * @param {Record<string, unknown>} [args.where] - Filter conditions (field: value pairs)
   * @returns {Promise<{count: number}>} Total count of documents matching the filter
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const result = await tools.countDocuments(
   *   { scope: "project", projectId: "project-uuid" },
   *   { collection_name: "users", where: { active: true } }
   * );
   */
  async countDocuments(
    ctx: ToolContext,
    args: {
      collection_name: string;
      where?: Record<string, unknown>;
    }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    const result = await this.db.getDocuments(ctx.projectId, args.collection_name, {
      limit: 1,
      offset: 0,
      where: args.where,
    });
    return { count: result.total };
  }

  /**
   * Update a document in a collection
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - Document update arguments
   * @param {string} args.collection_name - Collection name
   * @param {string} args.document_id - Document ID to update
   * @param {Record<string, unknown>} args.data - Updated document data (replaces existing data)
   * @returns {Promise<Document | null>} The updated document or null if not found
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const updated = await tools.updateDocument(
   *   { scope: "project", projectId: "project-uuid", userId: "user-123" },
   *   { collection_name: "users", document_id: "doc-uuid", data: { name: "Updated Name" } }
   * );
   */
  async updateDocument(
    ctx: ToolContext,
    args: {
      collection_name: string;
      document_id: string;
      data: Record<string, unknown>;
    }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    return this.db.updateDocument(
      ctx.projectId,
      args.collection_name,
      args.document_id,
      args.data,
      ctx.userId || "system"
    );
  }

  /**
   * Delete a document from a collection
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - Document deletion arguments
   * @param {string} args.collection_name - Collection name
   * @param {string} args.document_id - Document ID to delete
   * @returns {Promise<{success: boolean}>} Success indicator
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * await tools.deleteDocument(
   *   { scope: "project", projectId: "project-uuid" },
   *   { collection_name: "users", document_id: "doc-uuid" }
   * );
   */
  async deleteDocument(
    ctx: ToolContext,
    args: { collection_name: string; document_id: string }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    await this.db.deleteDocument(
      ctx.projectId,
      args.collection_name,
      args.document_id
    );
    return { success: true };
  }

  /**
   * Create multiple documents in a collection (bulk operation)
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - Bulk creation arguments
   * @param {string} args.collection_name - Collection name
   * @param {Record<string, unknown>[]} args.documents - Array of document data objects
   * @returns {Promise<{created: number, documents: Document[]}>} Number created and created documents
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const result = await tools.bulkCreateDocuments(
   *   { scope: "project", projectId: "project-uuid", userId: "user-123" },
   *   { collection_name: "users", documents: [{ name: "User 1" }, { name: "User 2" }] }
   * );
   */
  async bulkCreateDocuments(
    ctx: ToolContext,
    args: {
      collection_name: string;
      documents: Record<string, unknown>[];
    }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    const results = await Promise.all(
      args.documents.map((doc) =>
        this.db.createDocument(
          ctx.projectId,
          args.collection_name,
          doc,
          ctx.userId || "system"
        )
      )
    );
    return { created: results.length, documents: results };
  }

  /**
   * Update multiple documents in a collection (bulk operation)
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - Bulk update arguments
   * @param {string} args.collection_name - Collection name
   * @param {Array<{document_id: string, data: Record<string, unknown>}>} args.updates - Array of update objects
   * @returns {Promise<{updated: number, documents: Document[]}>} Number updated and updated documents
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const result = await tools.bulkUpdateDocuments(
   *   { scope: "project", projectId: "project-uuid", userId: "user-123" },
   *   { collection_name: "users", updates: [{ document_id: "doc1", data: { active: true } }] }
   * );
   */
  async bulkUpdateDocuments(
    ctx: ToolContext,
    args: {
      collection_name: string;
      updates: Array<{ document_id: string; data: Record<string, unknown> }>;
    }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    const results = await Promise.all(
      args.updates.map((update) =>
        this.db.updateDocument(
          ctx.projectId,
          args.collection_name,
          update.document_id,
          update.data,
          ctx.userId || "system"
        )
      )
    );
    return { updated: results.length, documents: results };
  }

  /**
   * Delete multiple documents from a collection (bulk operation)
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - Bulk deletion arguments
   * @param {string} args.collection_name - Collection name
   * @param {string[]} args.document_ids - Array of document IDs to delete
   * @returns {Promise<{deleted: number, total: number}>} Number successfully deleted and total attempted
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const result = await tools.bulkDeleteDocuments(
   *   { scope: "project", projectId: "project-uuid" },
   *   { collection_name: "users", document_ids: ["doc1", "doc2", "doc3"] }
   * );
   */
  async bulkDeleteDocuments(
    ctx: ToolContext,
    args: {
      collection_name: string;
      document_ids: string[];
    }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    const results = await Promise.all(
      args.document_ids.map((id) =>
        this.db.deleteDocument(ctx.projectId, args.collection_name, id)
      )
    );
    return {
      deleted: results.filter((r) => r).length,
      total: args.document_ids.length,
    };
  }

  /**
   * Create a new user in a project
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - User creation arguments
   * @param {string} [args.username] - Username (optional if email provided)
   * @param {string} [args.email] - Email address (optional if username provided)
   * @param {string} args.password - User password (required)
   * @param {Record<string, unknown>} [args.metadata] - Additional user metadata
   * @returns {Promise<BackendProjectUser>} The created user
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const user = await tools.createProjectUser(
   *   { scope: "project", projectId: "project-uuid" },
   *   { email: "user@example.com", password: "secure123", metadata: { role: "member" } }
   * );
   */
  async createProjectUser(
    ctx: ToolContext,
    args: {
      username?: string;
      email?: string;
      password: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    return this.db.createProjectUser({
      project_id: ctx.projectId,
      username: args.username,
      email: args.email,
      password: args.password,
      metadata: args.metadata || {},
    });
  }

  /**
   * Get a project user by ID
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - User lookup arguments
   * @param {string} args.user_id - User ID to retrieve
   * @returns {Promise<BackendProjectUser | null>} The user or null if not found
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const user = await tools.getProjectUser(
   *   { scope: "project", projectId: "project-uuid" },
   *   { user_id: "user-uuid" }
   * );
   */
  async getProjectUser(
    ctx: ToolContext,
    args: { user_id: string }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    return this.db.getProjectUser(ctx.projectId, args.user_id);
  }

  /**
   * List all users in a project with optional search filter
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - List arguments
   * @param {string} [args.search] - Optional search term to filter users by username or email
   * @returns {Promise<BackendProjectUser[]>} Array of users
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const users = await tools.listUsers(
   *   { scope: "project", projectId: "project-uuid" },
   *   { search: "john" }
   * );
   */
  async listUsers(ctx: ToolContext, args: { search?: string }) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    const result = await this.db.getProjectUsers(ctx.projectId, {
      search: args.search,
    });
    return result;
  }

  /**
   * Update a project user
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - User update arguments
   * @param {string} args.user_id - User ID to update (required)
   * @param {string} [args.username] - New username
   * @param {string} [args.email] - New email address
   * @param {Record<string, unknown>} [args.metadata] - Updated metadata
   * @returns {Promise<BackendProjectUser>} The updated user
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * const updated = await tools.updateProjectUser(
   *   { scope: "project", projectId: "project-uuid" },
   *   { user_id: "user-uuid", email: "newemail@example.com" }
   * );
   */
  async updateProjectUser(
    ctx: ToolContext,
    args: {
      user_id: string;
      username?: string;
      email?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    return this.db.updateProjectUser(ctx.projectId, args.user_id, {
      username: args.username,
      email: args.email,
      metadata: args.metadata,
    });
  }

  /**
   * Delete a project user
   * 
   * @param {ToolContext} ctx - Tool execution context (must have project scope)
   * @param {Object} args - User deletion arguments
   * @param {string} args.user_id - User ID to delete
   * @returns {Promise<{success: boolean}>} Success indicator
   * @throws {Error} If scope is not "project" or projectId is missing
   * 
   * @example
   * await tools.deleteProjectUser(
   *   { scope: "project", projectId: "project-uuid" },
   *   { user_id: "user-uuid" }
   * );
   */
  async deleteProjectUser(
    ctx: ToolContext,
    args: { user_id: string }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    await this.db.deleteProjectUser(ctx.projectId, args.user_id);
    return { success: true };
  }
}
