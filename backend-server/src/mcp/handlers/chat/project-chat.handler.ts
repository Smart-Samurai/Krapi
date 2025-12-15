import { Request, Response } from "express";

import { LlmService, ChatMessage } from "../../llm.service";
import { McpToolsService, ToolContext } from "../../tools.service";
import { getLlmConfig, resolveContext } from "../../utils";

/**
 * Handler for project MCP chat
 * POST /krapi/k1/mcp/projects/:projectId/chat
 */
export class ProjectChatHandler {
  constructor(private tools: McpToolsService) {}

  async handle(req: Request, res: Response): Promise<Response> {
    try {
      const config = getLlmConfig(req);
      const messages: ChatMessage[] = req.body.messages || [];
      const { messages: updated, toolCalls } = await LlmService.chatWithTools(config, messages, this.getProjectToolSpecs());

      if (toolCalls && toolCalls.length > 0) {
        const ctx: ToolContext = resolveContext(req, 'project', req.params.projectId);
        const results = await Promise.all(toolCalls.map(async (tc) => ({
          tool_call_id: tc.id,
          output: await this.dispatchTool(ctx, tc.name, tc.arguments)
        })));
        const withTools = LlmService.appendToolResults(updated, results);
        const finalTurn = await LlmService.chatWithTools(config, withTools, this.getProjectToolSpecs());
        return res.json({ success: true, messages: finalTurn.messages });
      }

      return res.json({ success: true, messages: updated });
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      return res.status(500).json({ success: false, error: error.message || 'MCP project chat failed' });
    }
  }

  private getProjectToolSpecs() {
    return [
      {
        name: 'create_collection',
        description: 'Create a collection in this project',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            fields: { type: 'array', items: { type: 'object' } },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_collection',
        description: 'Get collection details by name',
        parameters: {
          type: 'object',
          properties: {
            collection_name: { type: 'string' },
          },
          required: ['collection_name'],
        },
      },
      {
        name: 'list_collections',
        description: 'List collections (schemas) in this project',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'update_collection',
        description: 'Update a collection',
        parameters: {
          type: 'object',
          properties: {
            collection_name: { type: 'string' },
            description: { type: 'string' },
            fields: { type: 'array', items: { type: 'object' } },
          },
          required: ['collection_name'],
        },
      },
      {
        name: 'delete_collection',
        description: 'Delete a collection',
        parameters: {
          type: 'object',
          properties: {
            collection_name: { type: 'string' },
          },
          required: ['collection_name'],
        },
      },
      {
        name: 'create_document',
        description: 'Create a document in a collection',
        parameters: {
          type: 'object',
          properties: {
            collection_name: { type: 'string' },
            data: { type: 'object' },
          },
          required: ['collection_name', 'data'],
        },
      },
      {
        name: 'get_document',
        description: 'Get a document by ID',
        parameters: {
          type: 'object',
          properties: {
            collection_name: { type: 'string' },
            document_id: { type: 'string' },
          },
          required: ['collection_name', 'document_id'],
        },
      },
      {
        name: 'list_documents',
        description: 'List documents in a collection with filtering and pagination',
        parameters: {
          type: 'object',
          properties: {
            collection_name: { type: 'string' },
            limit: { type: 'number' },
            offset: { type: 'number' },
            page: { type: 'number' },
            order_by: { type: 'string' },
            order: { type: 'string', enum: ['asc', 'desc'] },
            where: { type: 'object' },
          },
          required: ['collection_name'],
        },
      },
      {
        name: 'search_documents',
        description: 'Search documents in a collection by text',
        parameters: {
          type: 'object',
          properties: {
            collection_name: { type: 'string' },
            search_term: { type: 'string' },
            search_fields: { type: 'array', items: { type: 'string' } },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
          required: ['collection_name', 'search_term'],
        },
      },
      {
        name: 'count_documents',
        description: 'Count documents in a collection with optional filtering',
        parameters: {
          type: 'object',
          properties: {
            collection_name: { type: 'string' },
            where: { type: 'object' },
          },
          required: ['collection_name'],
        },
      },
      {
        name: 'update_document',
        description: 'Update a document by id',
        parameters: {
          type: 'object',
          properties: {
            collection_name: { type: 'string' },
            document_id: { type: 'string' },
            data: { type: 'object' },
          },
          required: ['collection_name', 'document_id', 'data'],
        },
      },
      {
        name: 'delete_document',
        description: 'Delete a document by id',
        parameters: {
          type: 'object',
          properties: {
            collection_name: { type: 'string' },
            document_id: { type: 'string' },
          },
          required: ['collection_name', 'document_id'],
        },
      },
      {
        name: 'bulk_create_documents',
        description: 'Create multiple documents in a collection',
        parameters: {
          type: 'object',
          properties: {
            collection_name: { type: 'string' },
            documents: { type: 'array', items: { type: 'object' } },
          },
          required: ['collection_name', 'documents'],
        },
      },
      {
        name: 'bulk_update_documents',
        description: 'Update multiple documents in a collection',
        parameters: {
          type: 'object',
          properties: {
            collection_name: { type: 'string' },
            updates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  document_id: { type: 'string' },
                  data: { type: 'object' },
                },
                required: ['document_id', 'data'],
              },
            },
          },
          required: ['collection_name', 'updates'],
        },
      },
      {
        name: 'bulk_delete_documents',
        description: 'Delete multiple documents in a collection',
        parameters: {
          type: 'object',
          properties: {
            collection_name: { type: 'string' },
            document_ids: { type: 'array', items: { type: 'string' } },
          },
          required: ['collection_name', 'document_ids'],
        },
      },
      {
        name: 'create_project_user',
        description: 'Create a user in this project with all available fields. All fields except password are optional, but you should fill as many as possible with sample data when creating test users.',
        parameters: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username for the user (optional if email provided)' },
            email: { type: 'string', description: 'Email address for the user (optional if username provided)' },
            password: { type: 'string', description: 'Password for the user (required)' },
            phone: { type: 'string', description: 'Phone number for the user' },
            name: { type: 'string', description: 'First name of the user' },
            last_name: { type: 'string', description: 'Last name of the user' },
            address: { type: 'string', description: 'Address of the user' },
            role: { type: 'string', description: 'Role of the user (default: "user")' },
            is_verified: { type: 'boolean', description: 'Whether the user email is verified (default: false)' },
            metadata: { type: 'object', description: 'Additional metadata for the user' },
          },
          required: ['password'],
        },
      },
      {
        name: 'get_project_user',
        description: 'Get a project user by ID',
        parameters: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List/search users in this project',
        parameters: {
          type: 'object',
          properties: {
            search: { type: 'string' },
          },
        },
      },
      {
        name: 'update_project_user',
        description: 'Update a project user',
        parameters: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            metadata: { type: 'object' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_project_user',
        description: 'Delete a project user',
        parameters: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
          },
          required: ['user_id'],
        },
      },
    ];
  }

  private async dispatchTool(ctx: ToolContext, name: string, args: Record<string, unknown>): Promise<string> {
    switch (name) {
      case 'create_collection':
        return JSON.stringify(await this.tools.createCollection(ctx, args as { name: string; description?: string; fields: unknown[] }));
      case 'get_collection':
        return JSON.stringify(await this.tools.getCollection(ctx, args as { collection_name: string }));
      case 'list_collections':
        return JSON.stringify(await this.tools.listCollections(ctx));
      case 'update_collection':
        return JSON.stringify(await this.tools.updateCollection(ctx, args as { collection_name: string; description?: string; fields?: unknown[] }));
      case 'delete_collection':
        return JSON.stringify(await this.tools.deleteCollection(ctx, args as { collection_name: string }));
      case 'create_document':
        return JSON.stringify(await this.tools.createDocument(ctx, args as { collection_name: string; data: Record<string, unknown> }));
      case 'get_document':
        return JSON.stringify(await this.tools.getDocument(ctx, args as { collection_name: string; document_id: string }));
      case 'list_documents':
        return JSON.stringify(await this.tools.listDocuments(ctx, args as { collection_name: string; limit?: number; offset?: number; page?: number; order_by?: string; order?: "asc" | "desc"; where?: Record<string, unknown> }));
      case 'search_documents':
        return JSON.stringify(await this.tools.searchDocuments(ctx, args as { collection_name: string; search_term: string; search_fields?: string[]; limit?: number; offset?: number }));
      case 'count_documents':
        return JSON.stringify(await this.tools.countDocuments(ctx, args as { collection_name: string; where?: Record<string, unknown> }));
      case 'update_document':
        return JSON.stringify(await this.tools.updateDocument(ctx, args as { collection_name: string; document_id: string; data: Record<string, unknown> }));
      case 'delete_document':
        return JSON.stringify(await this.tools.deleteDocument(ctx, args as { collection_name: string; document_id: string }));
      case 'bulk_create_documents':
        return JSON.stringify(await this.tools.bulkCreateDocuments(ctx, args as { collection_name: string; documents: Record<string, unknown>[] }));
      case 'bulk_update_documents':
        return JSON.stringify(await this.tools.bulkUpdateDocuments(ctx, args as { collection_name: string; filter: Record<string, unknown>; data: Record<string, unknown> }));
      case 'bulk_delete_documents':
        return JSON.stringify(await this.tools.bulkDeleteDocuments(ctx, args as { collection_name: string; filter: Record<string, unknown> }));
      case 'create_project_user':
        return JSON.stringify(await this.tools.createProjectUser(ctx, args as { username?: string; email?: string; password: string; metadata?: Record<string, unknown> }));
      case 'get_project_user':
        return JSON.stringify(await this.tools.getProjectUser(ctx, args as { user_id: string }));
      case 'list_users':
        return JSON.stringify(await this.tools.listUsers(ctx, args as { search?: string }));
      case 'update_project_user':
        return JSON.stringify(await this.tools.updateProjectUser(ctx, args as { user_id: string; username?: string; email?: string; metadata?: Record<string, unknown> }));
      case 'delete_project_user':
        return JSON.stringify(await this.tools.deleteProjectUser(ctx, args as { user_id: string }));
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}

