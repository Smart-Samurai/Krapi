import { DatabaseService } from '@/services/database.service';
import { CollectionField } from '@/types';

export type ToolContext = {
  scope: 'admin' | 'project';
  projectId?: string;
  userId?: string;
};

export class McpToolsService {
  private db = DatabaseService.getInstance();

  // Projects
  async createProject(ctx: ToolContext, args: { name: string; description?: string; project_url?: string }) {
    if (ctx.scope !== 'admin') throw new Error('Admin scope required');
    const project = await this.db.createProject({
      name: args.name,
      description: args.description || null,
      project_url: args.project_url || null,
      active: true,
      created_by: ctx.userId || 'system',
      settings: {},
      api_key: `pk_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return project;
  }

  async updateProject(ctx: ToolContext, args: { project_id: string; name?: string; description?: string; project_url?: string; active?: boolean }) {
    if (ctx.scope !== 'admin') throw new Error('Admin scope required');
    const updated = await this.db.updateProject(args.project_id, {
      name: args.name,
      description: args.description,
      project_url: args.project_url,
      active: args.active,
    });
    return updated;
  }

  async listProjects(ctx: ToolContext, args: { search?: string }) {
    if (ctx.scope !== 'admin') throw new Error('Admin scope required');
    const projects = await this.db.getAllProjects();
    return args.search ? projects.filter(p => p.name.toLowerCase().includes(args.search!.toLowerCase())) : projects;
  }

  // Collections
  async createCollection(ctx: ToolContext, args: { name: string; description?: string; fields: CollectionField[] }) {
    if (ctx.scope !== 'project' || !ctx.projectId) throw new Error('Project scope required');
    return this.db.createCollection(ctx.projectId, args.name, {
      description: args.description || '',
      fields: args.fields,
      indexes: [],
    }, ctx.userId || 'system');
  }

  async listCollections(ctx: ToolContext) {
    if (ctx.scope !== 'project' || !ctx.projectId) throw new Error('Project scope required');
    return this.db.getProjectTableSchemas(ctx.projectId);
  }

  // Documents
  async createDocument(ctx: ToolContext, args: { collection_id: string; data: Record<string, unknown> }) {
    if (ctx.scope !== 'project' || !ctx.projectId) throw new Error('Project scope required');
    return this.db.createDocument(ctx.projectId, args.collection_id, args.data);
  }

  async listDocuments(ctx: ToolContext, args: { collection_id: string; search?: string; limit?: number; page?: number }) {
    if (ctx.scope !== 'project' || !ctx.projectId) throw new Error('Project scope required');
    const offset = ((args.page || 1) - 1) * (args.limit || 50);
    return this.db.getDocuments(ctx.projectId, args.collection_id, { 
      limit: args.limit || 50, 
      offset 
    });
  }

  async updateDocument(ctx: ToolContext, args: { collection_id: string; document_id: string; data: Record<string, unknown> }) {
    if (ctx.scope !== 'project' || !ctx.projectId) throw new Error('Project scope required');
    return this.db.updateDocument(ctx.projectId, args.collection_id, args.document_id, args.data);
  }

  async deleteDocument(ctx: ToolContext, args: { collection_id: string; document_id: string }) {
    if (ctx.scope !== 'project' || !ctx.projectId) throw new Error('Project scope required');
    await this.db.deleteDocument(ctx.projectId, args.collection_id, args.document_id);
    return { success: true };
  }

  // Users
  async listUsers(ctx: ToolContext, args: { search?: string }) {
    if (ctx.scope !== 'project' || !ctx.projectId) throw new Error('Project scope required');
    const result = await this.db.getProjectUsers(ctx.projectId, { search: args.search });
    return result;
  }
}