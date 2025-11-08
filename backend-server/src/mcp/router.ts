import axios from 'axios';
import { Router, Request, Response, NextFunction } from 'express';

import { LlmService, LlmConfig, ChatMessage } from './llm.service';
import { McpToolsService, ToolContext } from './tools.service';

import { authenticate, requireScopes } from '@/middleware/auth.middleware';
import { Scope, CollectionField } from '@/types';
import { DatabaseService } from '@/services/database.service';

const router: ReturnType<typeof Router> = Router();
const tools = new McpToolsService();
const db = DatabaseService.getInstance();

function resolveContext(req: Request & { user?: { id: string } }, scope: 'admin' | 'project', projectId?: string): ToolContext {
  return {
    scope,
    projectId,
    userId: req.user?.id,
  };
}

function getLlmConfig(req: Request): LlmConfig {
  const { provider, endpoint, apiKey, model } = req.body as {
    provider: string;
    endpoint: string;
    apiKey?: string;
    model: string;
  };
  if (!provider || !endpoint || !model) {
    throw new Error('provider, endpoint and model are required');
  }
  return { 
    provider: provider as 'openai' | 'lmstudio' | 'ollama', 
    endpoint, 
    apiKey, 
    model 
  };
}

const adminToolSpecs = [
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
    name: 'list_projects',
    description: 'List projects optionally filtered by name',
    parameters: { search: { type: 'string' } },
  },
];

const projectToolSpecs = [
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
    name: 'list_collections',
    description: 'List collections (schemas) in this project',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'create_document',
    description: 'Create a document in a collection',
    parameters: {
      type: 'object',
      properties: {
        collection_id: { type: 'string' },
        data: { type: 'object' },
      },
      required: ['collection_id', 'data'],
    },
  },
  {
    name: 'list_documents',
    description: 'List/search documents in a collection',
    parameters: {
      type: 'object',
      properties: {
        collection_id: { type: 'string' },
        search: { type: 'string' },
        limit: { type: 'number' },
        page: { type: 'number' },
      },
      required: ['collection_id'],
    },
  },
  {
    name: 'update_document',
    description: 'Update a document by id',
    parameters: {
      type: 'object',
      properties: {
        collection_id: { type: 'string' },
        document_id: { type: 'string' },
        data: { type: 'object' },
      },
      required: ['collection_id', 'document_id', 'data'],
    },
  },
  {
    name: 'delete_document',
    description: 'Delete a document by id',
    parameters: {
      type: 'object',
      properties: {
        collection_id: { type: 'string' },
        document_id: { type: 'string' },
      },
      required: ['collection_id', 'document_id'],
    },
  },
  {
    name: 'list_users',
    description: 'List/search users in this project',
    parameters: { search: { type: 'string' } },
  },
];

// Tool argument interfaces
interface CreateProjectArgs {
  name: string;
  description?: string;
  project_url?: string;
}

interface UpdateProjectArgs {
  project_id: string;
  name?: string;
  description?: string;
  project_url?: string;
  active?: boolean;
}

interface CreateCollectionArgs {
  name: string;
  description?: string;
  fields: CollectionField[];
}

interface CreateDocumentArgs {
  collection_id: string;
  data: Record<string, unknown>;
}

interface ListDocumentsArgs {
  collection_id: string;
  search?: string;
  limit?: number;
  page?: number;
}

interface UpdateDocumentArgs {
  collection_id: string;
  document_id: string;
  data: Record<string, unknown>;
}

interface DeleteDocumentArgs {
  collection_id: string;
  document_id: string;
}

interface SearchArgs {
  search?: string;
}

async function dispatchTool(ctx: ToolContext, name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'create_project': 
      return JSON.stringify(await tools.createProject(ctx, args as unknown as CreateProjectArgs));
    case 'update_project': 
      return JSON.stringify(await tools.updateProject(ctx, args as unknown as UpdateProjectArgs));
    case 'list_projects': 
      return JSON.stringify(await tools.listProjects(ctx, args as unknown as SearchArgs));
    case 'create_collection': 
      return JSON.stringify(await tools.createCollection(ctx, args as unknown as CreateCollectionArgs));
    case 'list_collections': 
      return JSON.stringify(await tools.listCollections(ctx));
    case 'create_document': 
      return JSON.stringify(await tools.createDocument(ctx, args as unknown as CreateDocumentArgs));
    case 'list_documents': 
      return JSON.stringify(await tools.listDocuments(ctx, args as unknown as ListDocumentsArgs));
    case 'update_document': 
      return JSON.stringify(await tools.updateDocument(ctx, args as unknown as UpdateDocumentArgs));
    case 'delete_document': 
      return JSON.stringify(await tools.deleteDocument(ctx, args as unknown as DeleteDocumentArgs));
    case 'list_users': 
      return JSON.stringify(await tools.listUsers(ctx, args as unknown as SearchArgs));
    default: 
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Conditional authentication middleware for MCP routes
 * Checks project settings for authentication_required flag
 * If false, allows requests without authentication
 */
async function conditionalAuthenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  // For admin routes, always require authentication
  if (req.path.startsWith('/admin/')) {
    return authenticate(req, res, next);
  }

  // For project routes, check project settings
  if (req.path.startsWith('/projects/')) {
    const projectId = req.params.projectId;
    if (projectId) {
      try {
        const project = await db.getProjectById(projectId);
        if (project && project.settings && project.settings.authentication_required === false) {
          // Auth not required, allow request to proceed
          return next();
        }
      } catch (error) {
        // If we can't check project settings, require auth for safety
        console.error('Error checking project settings for MCP auth:', error);
      }
    }
  }

  // For other routes (like /models, /model-capabilities), check if they're project-specific
  // If there's a projectId in body or params, check project settings
  const projectId = req.params.projectId || req.body?.projectId;
  if (projectId) {
    try {
      const project = await db.getProjectById(projectId);
      if (project && project.settings && project.settings.authentication_required === false) {
        // Auth not required, allow request to proceed
        return next();
      }
    } catch (error) {
      // If we can't check project settings, require auth for safety
      console.error('Error checking project settings for MCP auth:', error);
    }
  }

  // Default: require authentication
  return authenticate(req, res, next);
}

// Apply conditional authentication to all routes
router.use(conditionalAuthenticate);

/**
 * List available models from LLM server
 * POST /krapi/k1/mcp/models
 * Body: { provider, endpoint, apiKey? }
 */
router.post('/models', async (req: Request, res: Response) => {
  try {
    const { provider, endpoint, apiKey } = req.body as {
      provider: string;
      endpoint: string;
      apiKey?: string;
    };

    if (!provider || !endpoint) {
      return res.status(400).json({
        success: false,
        error: 'provider and endpoint are required',
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if ((provider === 'openai' || provider === 'lmstudio') && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    let models: Array<{ id: string; name?: string; [key: string]: unknown }> = [];

    // OpenAI-compatible (OpenAI, LM Studio)
    if (provider === 'openai' || provider === 'lmstudio') {
      try {
        const response = await axios.get(`${endpoint}/models`, {
          headers,
          timeout: 10000,
        });
        models = (response.data.data || []).map((m: { id: string; [key: string]: unknown }) => ({
          id: m.id,
          name: m.id,
          ...m,
        }));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({
          success: false,
          error: `Failed to fetch models: ${errorMessage}`,
        });
      }
    }
    // Ollama
    else if (provider === 'ollama') {
      try {
        // Try OpenAI-compatible endpoint first
        try {
          const response = await axios.get(`${endpoint}/v1/models`, {
            headers,
            timeout: 10000,
          });
          models = (response.data.data || []).map((m: { id: string; [key: string]: unknown }) => ({
            id: m.id,
            name: m.id,
            ...m,
          }));
        } catch {
          // Fall back to Ollama native API
          const response = await axios.get(`${endpoint}/api/tags`, {
            timeout: 10000,
          });
          models = (response.data.models || []).map((m: { name: string; [key: string]: unknown }) => ({
            id: m.name,
            name: m.name,
            ...m,
          }));
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({
          success: false,
          error: `Failed to fetch models: ${errorMessage}`,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported provider: ${provider}`,
      });
    }

    return res.json({
      success: true,
      models,
    });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error('Unknown error');
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list models',
    });
  }
});

/**
 * Check model capabilities (tool calling support)
 * POST /krapi/k1/mcp/model-capabilities
 * Body: { provider, endpoint, apiKey?, model }
 */
router.post('/model-capabilities', async (req: Request, res: Response) => {
  try {
    const { provider, endpoint, apiKey, model } = req.body as {
      provider: string;
      endpoint: string;
      apiKey?: string;
      model: string;
    };

    if (!provider || !endpoint || !model) {
      return res.status(400).json({
        success: false,
        error: 'provider, endpoint, and model are required',
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if ((provider === 'openai' || provider === 'lmstudio') && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    let supportsToolCalling = false;
    let supportsFunctionCalling = false;
    let details: Record<string, unknown> = {};

    // OpenAI-compatible (OpenAI, LM Studio)
    if (provider === 'openai' || provider === 'lmstudio') {
      try {
        // Test with a simple chat completion request with tools
        const testResponse = await axios.post(
          `${endpoint}/chat/completions`,
          {
            model,
            messages: [{ role: 'user', content: 'test' }],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'test_tool',
                  description: 'Test tool',
                  parameters: {
                    type: 'object',
                    properties: {},
                  },
                },
              },
            ],
            max_tokens: 10,
          },
          {
            headers,
            timeout: 10000,
            validateStatus: (status: number) => status < 500, // Don't throw on 4xx
          }
        );

        // If we get a 200 response, the model supports tool calling
        if (testResponse.status === 200) {
          supportsToolCalling = true;
          supportsFunctionCalling = true;
        }

        // Try to get model details from models endpoint
        try {
          const modelsResponse = await axios.get(`${endpoint}/models`, {
            headers,
            timeout: 10000,
          });
          const modelInfo = (modelsResponse.data.data || []).find(
            (m: { id: string }) => m.id === model
          );
          if (modelInfo) {
            details = modelInfo;
          }
        } catch {
          // Ignore errors fetching model details
        }
      } catch (error: unknown) {
        // If the error is not about tool calling, we can still check model info
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (!errorMessage.includes('tool') && !errorMessage.includes('function')) {
          // Try to get model info anyway
          try {
            const modelsResponse = await axios.get(`${endpoint}/models`, {
              headers,
              timeout: 10000,
            });
            const modelInfo = (modelsResponse.data.data || []).find(
              (m: { id: string }) => m.id === model
            );
            if (modelInfo) {
              details = modelInfo;
            }
          } catch {
            // Ignore
          }
        }
      }
    }
    // Ollama
    else if (provider === 'ollama') {
      try {
        // Try OpenAI-compatible endpoint first
        try {
          const testResponse = await axios.post(
            `${endpoint}/v1/chat/completions`,
            {
              model,
              messages: [{ role: 'user', content: 'test' }],
              tools: [
                {
                  type: 'function',
                  function: {
                    name: 'test_tool',
                    description: 'Test tool',
                    parameters: {
                      type: 'object',
                      properties: {},
                    },
                  },
                },
              ],
              max_tokens: 10,
            },
            {
              headers,
              timeout: 10000,
              validateStatus: (status: number) => status < 500,
            }
          );

          if (testResponse.status === 200) {
            supportsToolCalling = true;
            supportsFunctionCalling = true;
          }
        } catch {
          // Ollama models typically support tool calling if they're newer models
          // We'll mark as potentially supported
          supportsToolCalling = true;
        }

        // Try to get model info
        try {
          const response = await axios.get(`${endpoint}/api/show`, {
            params: { name: model },
            timeout: 10000,
          });
          if (response.data) {
            details = response.data;
          }
        } catch {
          // Ignore
        }
      } catch (error: unknown) {
        // For Ollama, assume tool calling is supported for most models
        supportsToolCalling = true;
      }
    }

    return res.json({
      success: true,
      capabilities: {
        supportsToolCalling,
        supportsFunctionCalling,
        provider,
        model,
        details,
      },
    });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error('Unknown error');
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check model capabilities',
    });
  }
});

// Admin-scoped MCP chat
router.post('/admin/chat', requireScopes({ scopes: [Scope.ADMIN_READ], requireAll: false }), async (req: Request, res: Response) => {
  try {
    const config = getLlmConfig(req);
    const messages: ChatMessage[] = req.body.messages || [];
    const { messages: updated, toolCalls } = await LlmService.chatWithTools(config, messages, adminToolSpecs);

    if (toolCalls && toolCalls.length > 0) {
      const ctx = resolveContext(req, 'admin');
      const results = await Promise.all(toolCalls.map(async (tc) => ({ tool_call_id: tc.id, output: await dispatchTool(ctx, tc.name, tc.arguments) })));
      const withTools = LlmService.appendToolResults(updated, results);
      const finalTurn = await LlmService.chatWithTools(config, withTools, adminToolSpecs);
      return res.json({ success: true, messages: finalTurn.messages });
    }

    return res.json({ success: true, messages: updated });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error('Unknown error');
    res.status(500).json({ success: false, error: error.message || 'MCP admin chat failed' });
  }
});

// Project-scoped MCP chat
router.post('/projects/:projectId/chat', requireScopes({ scopes: [Scope.PROJECTS_READ], projectSpecific: true }), async (req: Request, res: Response) => {
  try {
    const config = getLlmConfig(req);
    const messages: ChatMessage[] = req.body.messages || [];
    const { projectId } = req.params;

    const { messages: updated, toolCalls } = await LlmService.chatWithTools(config, messages, projectToolSpecs);

    if (toolCalls && toolCalls.length > 0) {
      const ctx = resolveContext(req, 'project', projectId);
      const results = await Promise.all(toolCalls.map(async (tc) => ({ tool_call_id: tc.id, output: await dispatchTool(ctx, tc.name, tc.arguments) })));
      const withTools = LlmService.appendToolResults(updated, results);
      const finalTurn = await LlmService.chatWithTools(config, withTools, projectToolSpecs);
      return res.json({ success: true, messages: finalTurn.messages });
    }

    return res.json({ success: true, messages: updated });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error('Unknown error');
    res.status(500).json({ success: false, error: error.message || 'MCP project chat failed' });
  }
});

export default router;