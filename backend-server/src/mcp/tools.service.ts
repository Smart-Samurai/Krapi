import { CollectionTools } from "./tools/collection-tools";
import { DocumentTools } from "./tools/document-tools";
import { ProjectTools } from "./tools/project-tools";
import { UserTools } from "./tools/user-tools";

import { DatabaseService } from "@/services/database.service";

export interface ToolContext {
  scope: "admin" | "project";
  projectId?: string;
  userId?: string;
}

// Database interface for MCP tools
interface ToolDatabaseInterface {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  execute: (sql: string, params?: unknown[]) => Promise<{ changes: number }>;
}

/**
 * MCP Tools Service
 *
 * Provides MCP (Model Context Protocol) tools for AI assistants to interact with the KRAPI system.
 * Tools are organized by functionality and delegate to specialized tool classes.
 */
export class McpToolsService {
  private db: DatabaseService;
  private projectTools: ProjectTools;
  private collectionTools: CollectionTools;
  private documentTools: DocumentTools;
  private userTools: UserTools;

  constructor() {
    this.db = DatabaseService.getInstance();

    // Create a compatible database interface for tools
    const dbInterface: ToolDatabaseInterface = {
      query: async (sql: string, params?: unknown[]) => {
        const result = await this.db.query(sql, params);
        return { rows: result.rows };
      },
      execute: async (sql: string, params?: unknown[]) => {
        const result = await this.db.query(sql, params);
        return { changes: result.rowCount };
      },
    };

    this.projectTools = new ProjectTools(dbInterface);
    this.collectionTools = new CollectionTools(dbInterface);
    this.documentTools = new DocumentTools(dbInterface);
    this.userTools = new UserTools(dbInterface);
  }

  // Project tools - delegate to ProjectTools
  async createProject(
    ctx: ToolContext,
    args: { name: string; description?: string; project_url?: string }
  ): Promise<unknown> {
    return this.projectTools.createProject(ctx, args);
  }

  async getProject(
    ctx: ToolContext,
    args: { project_id: string }
  ): Promise<unknown> {
    return this.projectTools.getProject(ctx, args);
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
  ): Promise<unknown> {
    return this.projectTools.updateProject(ctx, args);
  }

  async deleteProject(
    ctx: ToolContext,
    args: { project_id: string }
  ): Promise<unknown> {
    return this.projectTools.deleteProject(ctx, args);
  }

  async listProjects(
    ctx: ToolContext,
    args: { search?: string }
  ): Promise<unknown[]> {
    return this.projectTools.listProjects(ctx, args);
  }

  async getProjectSettings(
    ctx: ToolContext,
    args: { project_id: string }
  ): Promise<unknown> {
    return this.projectTools.getProjectSettings(ctx, args);
  }

  async getProjectStats(
    ctx: ToolContext,
    args: { project_id: string }
  ): Promise<unknown> {
    return this.projectTools.getProjectStats(ctx, args);
  }

  // Collection tools - delegate to CollectionTools
  async createCollection(
    ctx: ToolContext,
    args: { name: string; description?: string; fields: unknown[] }
  ): Promise<unknown> {
    return this.collectionTools.createCollection(ctx, args);
  }

  async getCollection(
    ctx: ToolContext,
    args: { collection_name: string }
  ): Promise<unknown> {
    return this.collectionTools.getCollection(ctx, args);
  }

  async listCollections(ctx: ToolContext): Promise<unknown[]> {
    return this.collectionTools.listCollections(ctx);
  }

  async updateCollection(
    ctx: ToolContext,
    args: { collection_name: string; description?: string; fields?: unknown[] }
  ): Promise<unknown> {
    return this.collectionTools.updateCollection(ctx, args);
  }

  async deleteCollection(
    ctx: ToolContext,
    args: { collection_name: string }
  ): Promise<unknown> {
    return this.collectionTools.deleteCollection(ctx, args);
  }

  // Document tools - delegate to DocumentTools
  async createDocument(
    ctx: ToolContext,
    args: { collection_name: string; data: Record<string, unknown> }
  ): Promise<unknown> {
    return this.documentTools.createDocument(ctx, args);
  }

  async getDocument(
    ctx: ToolContext,
    args: { collection_name: string; document_id: string }
  ): Promise<unknown> {
    return this.documentTools.getDocument(ctx, args);
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
  ): Promise<{ documents: unknown[]; total: number }> {
    return this.documentTools.listDocuments(ctx, args);
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
  ): Promise<{ documents: unknown[]; total: number }> {
    return this.documentTools.searchDocuments(ctx, args);
  }

  async countDocuments(
    ctx: ToolContext,
    args: { collection_name: string; where?: Record<string, unknown> }
  ): Promise<{ count: number }> {
    return this.documentTools.countDocuments(ctx, args);
  }

  async updateDocument(
    ctx: ToolContext,
    args: {
      collection_name: string;
      document_id: string;
      data: Record<string, unknown>;
    }
  ): Promise<unknown> {
    return this.documentTools.updateDocument(ctx, args);
  }

  async deleteDocument(
    ctx: ToolContext,
    args: { collection_name: string; document_id: string }
  ): Promise<unknown> {
    return this.documentTools.deleteDocument(ctx, args);
  }

  async bulkCreateDocuments(
    ctx: ToolContext,
    args: { collection_name: string; documents: Record<string, unknown>[] }
  ): Promise<{ created: number }> {
    return this.documentTools.bulkCreateDocuments(ctx, args);
  }

  async bulkUpdateDocuments(
    ctx: ToolContext,
    args: {
      collection_name: string;
      filter: Record<string, unknown>;
      data: Record<string, unknown>;
    }
  ): Promise<{ updated: number }> {
    return this.documentTools.bulkUpdateDocuments(ctx, args);
  }

  async bulkDeleteDocuments(
    ctx: ToolContext,
    args: { collection_name: string; filter: Record<string, unknown> }
  ): Promise<{ deleted: number }> {
    return this.documentTools.bulkDeleteDocuments(ctx, args);
  }

  // User tools - delegate to UserTools
  async createProjectUser(
    ctx: ToolContext,
    args: {
      username?: string;
      email?: string;
      password: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<unknown> {
    return this.userTools.createProjectUser(ctx, args);
  }

  async getProjectUser(
    ctx: ToolContext,
    args: { user_id: string }
  ): Promise<unknown> {
    return this.userTools.getProjectUser(ctx, args);
  }

  async listUsers(ctx: ToolContext, args: { search?: string }): Promise<unknown[]> {
    return this.userTools.listUsers(ctx, args);
  }

  async updateProjectUser(
    ctx: ToolContext,
    args: {
      user_id: string;
      username?: string;
      email?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<unknown> {
    return this.userTools.updateProjectUser(ctx, args);
  }

  async deleteProjectUser(
    ctx: ToolContext,
    args: { user_id: string }
  ): Promise<unknown> {
    return this.userTools.deleteProjectUser(ctx, args);
  }
}
