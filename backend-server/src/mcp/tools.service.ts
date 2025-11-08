import { DatabaseService } from "@/services/database.service";
import { CollectionField } from "@/types";

export type ToolContext = {
  scope: "admin" | "project";
  projectId?: string;
  userId?: string;
};

export class McpToolsService {
  private db = DatabaseService.getInstance();

  // Projects
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

  async getProject(
    ctx: ToolContext,
    args: { project_id: string }
  ) {
    if (ctx.scope !== "admin") throw new Error("Admin scope required");
    return this.db.getProjectById(args.project_id);
  }

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

  async deleteProject(
    ctx: ToolContext,
    args: { project_id: string }
  ) {
    if (ctx.scope !== "admin") throw new Error("Admin scope required");
    await this.db.deleteProject(args.project_id);
    return { success: true };
  }

  async listProjects(ctx: ToolContext, args: { search?: string }) {
    if (ctx.scope !== "admin") throw new Error("Admin scope required");
    const projects = await this.db.getAllProjects();
    return args.search
      ? projects.filter((p) =>
          p.name.toLowerCase().includes(args.search!.toLowerCase())
        )
      : projects;
  }

  async getProjectSettings(
    ctx: ToolContext,
    args: { project_id: string }
  ) {
    if (ctx.scope !== "admin") throw new Error("Admin scope required");
    return this.db.getProjectSettings(args.project_id);
  }

  async getProjectStats(
    ctx: ToolContext,
    args: { project_id: string }
  ) {
    if (ctx.scope !== "admin") throw new Error("Admin scope required");
    return this.db.getProjectStats(args.project_id);
  }

  // Collections
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

  async getCollection(
    ctx: ToolContext,
    args: { collection_name: string }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    return this.db.getCollection(ctx.projectId, args.collection_name);
  }

  async listCollections(ctx: ToolContext) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    return this.db.getProjectTableSchemas(ctx.projectId);
  }

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

  async deleteCollection(
    ctx: ToolContext,
    args: { collection_name: string }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    await this.db.deleteCollection(ctx.projectId, args.collection_name);
    return { success: true };
  }

  // Documents
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

  // Project Users
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

  async getProjectUser(
    ctx: ToolContext,
    args: { user_id: string }
  ) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    return this.db.getProjectUser(ctx.projectId, args.user_id);
  }

  async listUsers(ctx: ToolContext, args: { search?: string }) {
    if (ctx.scope !== "project" || !ctx.projectId)
      throw new Error("Project scope required");
    const result = await this.db.getProjectUsers(ctx.projectId, {
      search: args.search,
    });
    return result;
  }

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
