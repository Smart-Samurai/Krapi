import axios from 'axios';
import { Router, Request, Response, NextFunction } from 'express';

import { LlmService, LlmConfig, ChatMessage } from './llm.service';
import { McpToolsService, ToolContext } from './tools.service';

import { authenticate, requireScopes } from '@/middleware/auth.middleware';
import { DatabaseService } from '@/services/database.service';
import { Scope, CollectionField } from '@/types';

const router: ReturnType<typeof Router> = Router();
const tools = new McpToolsService();
const db = DatabaseService.getInstance();

/**
 * Resolve tool execution context from request
 * 
 * Extracts user and project information from the authenticated request
 * to create a ToolContext for MCP tool execution.
 * 
 * @param {Request & { user?: { id: string } }} req - Express request with authenticated user
 * @param {'admin' | 'project'} scope - The scope of the operation
 * @param {string} [projectId] - Optional project ID for project-scoped operations
 * @returns {ToolContext} The resolved tool context
 * 
 * @example
 * const ctx = resolveContext(req, 'project', 'project-uuid');
 */
function resolveContext(req: Request & { user?: { id: string } }, scope: 'admin' | 'project', projectId?: string): ToolContext {
  return {
    scope,
    projectId,
    userId: req.user?.id,
  };
}

/**
 * Extract LLM configuration from request body
 * 
 * Validates and extracts LLM provider configuration from the request.
 * 
 * @param {Request} req - Express request containing LLM config in body
 * @returns {LlmConfig} The LLM configuration
 * @throws {Error} If provider, endpoint, or model are missing
 * 
 * @example
 * const config = getLlmConfig(req);
 * // { provider: 'openai', endpoint: 'https://api.openai.com', apiKey: 'key', model: 'gpt-4' }
 */
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
    description: 'Create a user in this project',
    parameters: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
        metadata: { type: 'object' },
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

// Tool argument interfaces
interface CreateProjectArgs {
  name: string;
  description?: string;
  project_url?: string;
}

interface GetProjectArgs {
  project_id: string;
}

interface UpdateProjectArgs {
  project_id: string;
  name?: string;
  description?: string;
  project_url?: string;
  active?: boolean;
}

interface DeleteProjectArgs {
  project_id: string;
}

interface GetProjectSettingsArgs {
  project_id: string;
}

interface GetProjectStatsArgs {
  project_id: string;
}

interface CreateCollectionArgs {
  name: string;
  description?: string;
  fields: CollectionField[];
}

interface GetCollectionArgs {
  collection_name: string;
}

interface UpdateCollectionArgs {
  collection_name: string;
  description?: string;
  fields?: CollectionField[];
}

interface DeleteCollectionArgs {
  collection_name: string;
}

interface CreateDocumentArgs {
  collection_name: string;
  data: Record<string, unknown>;
}

interface GetDocumentArgs {
  collection_name: string;
  document_id: string;
}

interface ListDocumentsArgs {
  collection_name: string;
  limit?: number;
  offset?: number;
  page?: number;
  order_by?: string;
  order?: "asc" | "desc";
  where?: Record<string, unknown>;
}

interface SearchDocumentsArgs {
  collection_name: string;
  search_term: string;
  search_fields?: string[];
  limit?: number;
  offset?: number;
}

interface CountDocumentsArgs {
  collection_name: string;
  where?: Record<string, unknown>;
}

interface UpdateDocumentArgs {
  collection_name: string;
  document_id: string;
  data: Record<string, unknown>;
}

interface DeleteDocumentArgs {
  collection_name: string;
  document_id: string;
}

interface BulkCreateDocumentsArgs {
  collection_name: string;
  documents: Record<string, unknown>[];
}

interface BulkUpdateDocumentsArgs {
  collection_name: string;
  updates: Array<{ document_id: string; data: Record<string, unknown> }>;
}

interface BulkDeleteDocumentsArgs {
  collection_name: string;
  document_ids: string[];
}

interface CreateProjectUserArgs {
  username?: string;
  email?: string;
  password: string;
  metadata?: Record<string, unknown>;
}

interface GetProjectUserArgs {
  user_id: string;
}

interface UpdateProjectUserArgs {
  user_id: string;
  username?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

interface DeleteProjectUserArgs {
  user_id: string;
}

interface SearchArgs {
  search?: string;
}

/**
 * Dispatch a tool call to the appropriate handler
 * 
 * Routes tool calls from the LLM to the correct MCP tool service method.
 * All tool results are serialized to JSON strings for the LLM.
 * 
 * @param {ToolContext} ctx - Tool execution context
 * @param {string} name - Name of the tool to call
 * @param {Record<string, unknown>} args - Tool arguments
 * @returns {Promise<string>} JSON stringified result of the tool execution
 * @throws {Error} If the tool name is unknown
 * 
 * @example
 * const result = await dispatchTool(
 *   { scope: 'project', projectId: 'uuid' },
 *   'create_document',
 *   { collection_name: 'users', data: { name: 'John' } }
 * );
 */
async function dispatchTool(ctx: ToolContext, name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    // Admin tools
    case 'create_project': 
      return JSON.stringify(await tools.createProject(ctx, args as unknown as CreateProjectArgs));
    case 'get_project':
      return JSON.stringify(await tools.getProject(ctx, args as unknown as GetProjectArgs));
    case 'update_project': 
      return JSON.stringify(await tools.updateProject(ctx, args as unknown as UpdateProjectArgs));
    case 'delete_project':
      return JSON.stringify(await tools.deleteProject(ctx, args as unknown as DeleteProjectArgs));
    case 'list_projects': 
      return JSON.stringify(await tools.listProjects(ctx, args as unknown as SearchArgs));
    case 'get_project_settings':
      return JSON.stringify(await tools.getProjectSettings(ctx, args as unknown as GetProjectSettingsArgs));
    case 'get_project_stats':
      return JSON.stringify(await tools.getProjectStats(ctx, args as unknown as GetProjectStatsArgs));
    
    // Collection tools
    case 'create_collection': 
      return JSON.stringify(await tools.createCollection(ctx, args as unknown as CreateCollectionArgs));
    case 'get_collection':
      return JSON.stringify(await tools.getCollection(ctx, args as unknown as GetCollectionArgs));
    case 'list_collections': 
      return JSON.stringify(await tools.listCollections(ctx));
    case 'update_collection':
      return JSON.stringify(await tools.updateCollection(ctx, args as unknown as UpdateCollectionArgs));
    case 'delete_collection':
      return JSON.stringify(await tools.deleteCollection(ctx, args as unknown as DeleteCollectionArgs));
    
    // Document tools
    case 'create_document': 
      return JSON.stringify(await tools.createDocument(ctx, args as unknown as CreateDocumentArgs));
    case 'get_document':
      return JSON.stringify(await tools.getDocument(ctx, args as unknown as GetDocumentArgs));
    case 'list_documents': 
      return JSON.stringify(await tools.listDocuments(ctx, args as unknown as ListDocumentsArgs));
    case 'search_documents':
      return JSON.stringify(await tools.searchDocuments(ctx, args as unknown as SearchDocumentsArgs));
    case 'count_documents':
      return JSON.stringify(await tools.countDocuments(ctx, args as unknown as CountDocumentsArgs));
    case 'update_document': 
      return JSON.stringify(await tools.updateDocument(ctx, args as unknown as UpdateDocumentArgs));
    case 'delete_document': 
      return JSON.stringify(await tools.deleteDocument(ctx, args as unknown as DeleteDocumentArgs));
    case 'bulk_create_documents':
      return JSON.stringify(await tools.bulkCreateDocuments(ctx, args as unknown as BulkCreateDocumentsArgs));
    case 'bulk_update_documents':
      return JSON.stringify(await tools.bulkUpdateDocuments(ctx, args as unknown as BulkUpdateDocumentsArgs));
    case 'bulk_delete_documents':
      return JSON.stringify(await tools.bulkDeleteDocuments(ctx, args as unknown as BulkDeleteDocumentsArgs));
    
    // Project user tools
    case 'create_project_user':
      return JSON.stringify(await tools.createProjectUser(ctx, args as unknown as CreateProjectUserArgs));
    case 'get_project_user':
      return JSON.stringify(await tools.getProjectUser(ctx, args as unknown as GetProjectUserArgs));
    case 'list_users': 
      return JSON.stringify(await tools.listUsers(ctx, args as unknown as SearchArgs));
    case 'update_project_user':
      return JSON.stringify(await tools.updateProjectUser(ctx, args as unknown as UpdateProjectUserArgs));
    case 'delete_project_user':
      return JSON.stringify(await tools.deleteProjectUser(ctx, args as unknown as DeleteProjectUserArgs));
    
    default: 
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Conditional authentication middleware for MCP routes
 * 
 * Checks project settings for authentication_required flag.
 * If authentication_required is false, allows requests without authentication.
 * Admin routes always require authentication.
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 * 
 * @example
 * // Applied to all MCP routes
 * router.use(conditionalAuthenticate);
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
 * 
 * Fetches available models from the specified LLM provider endpoint.
 * Supports OpenAI, LM Studio, and Ollama providers.
 * 
 * @route POST /krapi/k1/mcp/models
 * @param {Request} req - Express request
 * @param {Object} req.body - Request body
 * @param {string} req.body.provider - LLM provider ('openai', 'lmstudio', or 'ollama')
 * @param {string} req.body.endpoint - LLM server endpoint URL
 * @param {string} [req.body.apiKey] - Optional API key for authentication
 * @param {Response} res - Express response
 * @returns {Promise<void>}
 * 
 * @example
 * POST /krapi/k1/mcp/models
 * Body: { provider: 'openai', endpoint: 'https://api.openai.com', apiKey: 'sk-...' }
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
 * 
 * Tests whether a specific model supports tool/function calling.
 * Returns capabilities information including tool calling support.
 * 
 * @route POST /krapi/k1/mcp/model-capabilities
 * @param {Request} req - Express request
 * @param {Object} req.body - Request body
 * @param {string} req.body.provider - LLM provider ('openai', 'lmstudio', or 'ollama')
 * @param {string} req.body.endpoint - LLM server endpoint URL
 * @param {string} req.body.model - Model name to test
 * @param {string} [req.body.apiKey] - Optional API key for authentication
 * @param {Response} res - Express response
 * @returns {Promise<void>}
 * 
 * @example
 * POST /krapi/k1/mcp/model-capabilities
 * Body: { provider: 'openai', endpoint: 'https://api.openai.com', model: 'gpt-4', apiKey: 'sk-...' }
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
      } catch {
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

/**
 * Admin-scoped MCP chat endpoint
 * 
 * Handles chat conversations with LLM models using admin-level tools.
 * Supports tool calling for project management operations.
 * Requires ADMIN_READ scope.
 * 
 * @route POST /krapi/k1/mcp/admin/chat
 * @param {Request} req - Express request
 * @param {Object} req.body - Request body
 * @param {string} req.body.provider - LLM provider
 * @param {string} req.body.endpoint - LLM server endpoint
 * @param {string} req.body.model - Model name
 * @param {string} [req.body.apiKey] - Optional API key
 * @param {ChatMessage[]} req.body.messages - Conversation messages
 * @param {Response} res - Express response
 * @returns {Promise<void>}
 * 
 * @example
 * POST /krapi/k1/mcp/admin/chat
 * Body: {
 *   provider: 'openai',
 *   endpoint: 'https://api.openai.com',
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Create a new project' }]
 * }
 */
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

/**
 * Project-scoped MCP chat endpoint
 * 
 * Handles chat conversations with LLM models using project-level tools.
 * Supports tool calling for collection, document, and user operations within a project.
 * Requires PROJECTS_READ scope for the specified project.
 * 
 * @route POST /krapi/k1/mcp/projects/:projectId/chat
 * @param {Request} req - Express request
 * @param {string} req.params.projectId - Project ID
 * @param {Object} req.body - Request body
 * @param {string} req.body.provider - LLM provider
 * @param {string} req.body.endpoint - LLM server endpoint
 * @param {string} req.body.model - Model name
 * @param {string} [req.body.apiKey] - Optional API key
 * @param {ChatMessage[]} req.body.messages - Conversation messages
 * @param {Response} res - Express response
 * @returns {Promise<void>}
 * 
 * @example
 * POST /krapi/k1/mcp/projects/project-uuid/chat
 * Body: {
 *   provider: 'openai',
 *   endpoint: 'https://api.openai.com',
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'List all users in this project' }]
 * }
 */
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