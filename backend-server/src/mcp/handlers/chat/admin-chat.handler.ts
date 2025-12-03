import { Request, Response } from "express";

import { LlmService, ChatMessage } from "../../llm.service";
import { McpToolsService, ToolContext } from "../../tools.service";
import { getLlmConfig, resolveContext } from "../../utils";

/**
 * Handler for admin MCP chat
 * POST /krapi/k1/mcp/admin/chat
 */
export class AdminChatHandler {
  constructor(private tools: McpToolsService) {}

  async handle(req: Request, res: Response): Promise<Response> {
    try {
      const config = getLlmConfig(req);
      const messages: ChatMessage[] = req.body.messages || [];
      const { messages: updated, toolCalls } = await LlmService.chatWithTools(config, messages, this.getAdminToolSpecs());

      if (toolCalls && toolCalls.length > 0) {
        const ctx: ToolContext = resolveContext(req, 'admin');
        const results = await Promise.all(toolCalls.map(async (tc) => ({
          tool_call_id: tc.id,
          output: await this.dispatchTool(ctx, tc.name, tc.arguments)
        })));
        const withTools = LlmService.appendToolResults(updated, results);
        const finalTurn = await LlmService.chatWithTools(config, withTools, this.getAdminToolSpecs());
        return res.json({ success: true, messages: finalTurn.messages });
      }

      return res.json({ success: true, messages: updated });
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      return res.status(500).json({ success: false, error: error.message || 'MCP admin chat failed' });
    }
  }

  private getAdminToolSpecs() {
    return [
      {
        name: 'create_project',
        description: 'Create a new project',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            project_url: { type: 'string' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_project',
        description: 'Get project details by ID',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'update_project',
        description: 'Update project details',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            project_url: { type: 'string' },
            active: { type: 'boolean' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'delete_project',
        description: 'Delete a project',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_projects',
        description: 'List projects optionally filtered by name',
        parameters: {
          type: 'object',
          properties: {
            search: { type: 'string' },
          },
        },
      },
      {
        name: 'get_project_settings',
        description: 'Get project settings',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_project_stats',
        description: 'Get project statistics',
        parameters: {
          type: 'object',
          properties: {
            project_id: { type: 'string' },
          },
          required: ['project_id'],
        },
      },
    ];
  }

  private async dispatchTool(ctx: ToolContext, name: string, args: Record<string, unknown>): Promise<string> {
    switch (name) {
      case 'create_project':
        return JSON.stringify(await this.tools.createProject(ctx, args as { name: string; description?: string; project_url?: string }));
      case 'get_project':
        return JSON.stringify(await this.tools.getProject(ctx, args as { project_id: string }));
      case 'update_project':
        return JSON.stringify(await this.tools.updateProject(ctx, args as { project_id: string; name?: string; description?: string; project_url?: string; active?: boolean }));
      case 'delete_project':
        return JSON.stringify(await this.tools.deleteProject(ctx, args as { project_id: string }));
      case 'list_projects':
        return JSON.stringify(await this.tools.listProjects(ctx, args as { search?: string }));
      case 'get_project_settings':
        return JSON.stringify(await this.tools.getProjectSettings(ctx, args as { project_id: string }));
      case 'get_project_stats':
        return JSON.stringify(await this.tools.getProjectStats(ctx, args as { project_id: string }));
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}

