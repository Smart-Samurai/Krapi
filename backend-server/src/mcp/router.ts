import { Router, Request, Response, NextFunction } from "express";

import { AdminChatHandler } from "./handlers/chat/admin-chat.handler";
import { ProjectChatHandler } from "./handlers/chat/project-chat.handler";
import { ModelCapabilitiesHandler } from "./handlers/llm/model-capabilities.handler";
import { ModelsHandler } from "./handlers/llm/models.handler";
import { McpToolsService, ToolContext } from "./tools.service";

import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { DatabaseService } from "@/services/database.service";
import { Scope, CollectionField } from "@/types";

// Import handlers

const router: ReturnType<typeof Router> = Router();
const tools = new McpToolsService();
const db = DatabaseService.getInstance();

// Initialize handlers
const modelsHandler = new ModelsHandler();
const modelCapabilitiesHandler = new ModelCapabilitiesHandler();
const adminChatHandler = new AdminChatHandler(tools);
const projectChatHandler = new ProjectChatHandler(tools);

// Tool argument interfaces (keeping for backward compatibility with existing dispatchTool)
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
  filter: Record<string, unknown>;
  data: Record<string, unknown>;
}

interface BulkDeleteDocumentsArgs {
  collection_name: string;
  filter: Record<string, unknown>;
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

// Tool specs (keeping for backward compatibility with existing dispatchTool)
// const adminToolSpecs = [
//  {
//    name: 'create_project',
//    description: 'Create a new project',
//    parameters: {
//      type: 'object',
//      properties: {
//        name: { type: 'string' },
//        description: { type: 'string' },
//        project_url: { type: 'string' },
//      },
//      required: ['name'],
//    },
//  },
//  {
//    name: 'get_project',
//    description: 'Get project details by ID',
//    parameters: {
//      type: 'object',
//      properties: {
//        project_id: { type: 'string' },
//      },
//      required: ['project_id'],
//    },
//  },
//  {
//    name: 'update_project',
//    description: 'Update project details',
//    parameters: {
//      type: 'object',
//      properties: {
//        project_id: { type: 'string' },
//        name: { type: 'string' },
//        description: { type: 'string' },
//        project_url: { type: 'string' },
//        active: { type: 'boolean' },
//      },
//      required: ['project_id'],
//    },
//  },
//  {
//    name: 'delete_project',
//    description: 'Delete a project',
//    parameters: {
//      type: 'object',
//      properties: {
//        project_id: { type: 'string' },
//      },
//      required: ['project_id'],
//    },
//  },
//  {
//    name: 'list_projects',
//    description: 'List projects optionally filtered by name',
//    parameters: {
//      type: 'object',
//      properties: {
//        search: { type: 'string' },
//      },
//    },
//  },
//  {
//    name: 'get_project_settings',
//    description: 'Get project settings',
//    parameters: {
//      type: 'object',
//      properties: {
//        project_id: { type: 'string' },
//      },
//      required: ['project_id'],
//    },
//  },
//  {
//    name: 'get_project_stats',
//    description: 'Get project statistics',
//    parameters: {
//      type: 'object',
//      properties: {
//        project_id: { type: 'string' },
//      },
//      required: ['project_id'],
//    },
//  },
//];

const _projectToolSpecs = [
  {
    name: "create_collection",
    description: "Create a collection in this project",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        fields: { type: "array", items: { type: "object" } },
      },
      required: ["name"],
    },
  },
  {
    name: "get_collection",
    description: "Get collection details by name",
    parameters: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
      },
      required: ["collection_name"],
    },
  },
  {
    name: "list_collections",
    description: "List collections (schemas) in this project",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "update_collection",
    description: "Update a collection",
    parameters: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        description: { type: "string" },
        fields: { type: "array", items: { type: "object" } },
      },
      required: ["collection_name"],
    },
  },
  {
    name: "delete_collection",
    description: "Delete a collection",
    parameters: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
      },
      required: ["collection_name"],
    },
  },
  {
    name: "create_document",
    description: "Create a document in a collection",
    parameters: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        data: { type: "object" },
      },
      required: ["collection_name", "data"],
    },
  },
  {
    name: "get_document",
    description: "Get a document by ID",
    parameters: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        document_id: { type: "string" },
      },
      required: ["collection_name", "document_id"],
    },
  },
  {
    name: "list_documents",
    description: "List documents in a collection with filtering and pagination",
    parameters: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        limit: { type: "number" },
        offset: { type: "number" },
        page: { type: "number" },
        order_by: { type: "string" },
        order: { type: "string", enum: ["asc", "desc"] },
        where: { type: "object" },
      },
      required: ["collection_name"],
    },
  },
  {
    name: "search_documents",
    description: "Search documents in a collection by text",
    parameters: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        search_term: { type: "string" },
        search_fields: { type: "array", items: { type: "string" } },
        limit: { type: "number" },
        offset: { type: "number" },
      },
      required: ["collection_name", "search_term"],
    },
  },
  {
    name: "count_documents",
    description: "Count documents in a collection with optional filtering",
    parameters: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        where: { type: "object" },
      },
      required: ["collection_name"],
    },
  },
  {
    name: "update_document",
    description: "Update a document by id",
    parameters: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        document_id: { type: "string" },
        data: { type: "object" },
      },
      required: ["collection_name", "document_id", "data"],
    },
  },
  {
    name: "delete_document",
    description: "Delete a document by id",
    parameters: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        document_id: { type: "string" },
      },
      required: ["collection_name", "document_id"],
    },
  },
  {
    name: "bulk_create_documents",
    description: "Create multiple documents in a collection",
    parameters: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        documents: { type: "array", items: { type: "object" } },
      },
      required: ["collection_name", "documents"],
    },
  },
  {
    name: "bulk_update_documents",
    description: "Update multiple documents in a collection",
    parameters: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              document_id: { type: "string" },
              data: { type: "object" },
            },
            required: ["document_id", "data"],
          },
        },
      },
      required: ["collection_name", "updates"],
    },
  },
  {
    name: "bulk_delete_documents",
    description: "Delete multiple documents in a collection",
    parameters: {
      type: "object",
      properties: {
        collection_name: { type: "string" },
        document_ids: { type: "array", items: { type: "string" } },
      },
      required: ["collection_name", "document_ids"],
    },
  },
  {
    name: "create_project_user",
    description:
      "Create a user in this project with all available fields. All fields except password are optional, but you should fill as many as possible with sample data when creating test users.",
    parameters: {
      type: "object",
      properties: {
        username: {
          type: "string",
          description: "Username for the user (optional if email provided)",
        },
        email: {
          type: "string",
          description:
            "Email address for the user (optional if username provided)",
        },
        password: {
          type: "string",
          description: "Password for the user (required)",
        },
        phone: { type: "string", description: "Phone number for the user" },
        name: { type: "string", description: "First name of the user" },
        last_name: { type: "string", description: "Last name of the user" },
        address: { type: "string", description: "Address of the user" },
        role: {
          type: "string",
          description: 'Role of the user (default: "user")',
        },
        is_verified: {
          type: "boolean",
          description: "Whether the user email is verified (default: false)",
        },
        metadata: {
          type: "object",
          description: "Additional metadata for the user",
        },
      },
      required: ["password"],
    },
  },
  {
    name: "get_project_user",
    description: "Get a project user by ID",
    parameters: {
      type: "object",
      properties: {
        user_id: { type: "string" },
      },
      required: ["user_id"],
    },
  },
  {
    name: "list_users",
    description: "List/search users in this project",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string" },
      },
    },
  },
  {
    name: "update_project_user",
    description: "Update a project user",
    parameters: {
      type: "object",
      properties: {
        user_id: { type: "string" },
        username: { type: "string" },
        email: { type: "string" },
        metadata: { type: "object" },
      },
      required: ["user_id"],
    },
  },
  {
    name: "delete_project_user",
    description: "Delete a project user",
    parameters: {
      type: "object",
      properties: {
        user_id: { type: "string" },
      },
      required: ["user_id"],
    },
  },
];

// Dispatch tool function (keeping for backward compatibility)
async function _dispatchTool(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    // Admin tools
    case "create_project":
      return JSON.stringify(
        await tools.createProject(ctx, args as unknown as CreateProjectArgs)
      );
    case "get_project":
      return JSON.stringify(
        await tools.getProject(ctx, args as unknown as GetProjectArgs)
      );
    case "update_project":
      return JSON.stringify(
        await tools.updateProject(ctx, args as unknown as UpdateProjectArgs)
      );
    case "delete_project":
      return JSON.stringify(
        await tools.deleteProject(ctx, args as unknown as DeleteProjectArgs)
      );
    case "list_projects":
      return JSON.stringify(
        await tools.listProjects(ctx, args as unknown as SearchArgs)
      );
    case "get_project_settings":
      return JSON.stringify(
        await tools.getProjectSettings(
          ctx,
          args as unknown as GetProjectSettingsArgs
        )
      );
    case "get_project_stats":
      return JSON.stringify(
        await tools.getProjectStats(ctx, args as unknown as GetProjectStatsArgs)
      );

    // Collection tools
    case "create_collection":
      return JSON.stringify(
        await tools.createCollection(
          ctx,
          args as unknown as CreateCollectionArgs
        )
      );
    case "get_collection":
      return JSON.stringify(
        await tools.getCollection(ctx, args as unknown as GetCollectionArgs)
      );
    case "list_collections":
      return JSON.stringify(await tools.listCollections(ctx));
    case "update_collection":
      return JSON.stringify(
        await tools.updateCollection(
          ctx,
          args as unknown as UpdateCollectionArgs
        )
      );
    case "delete_collection":
      return JSON.stringify(
        await tools.deleteCollection(
          ctx,
          args as unknown as DeleteCollectionArgs
        )
      );

    // Document tools
    case "create_document":
      return JSON.stringify(
        await tools.createDocument(ctx, args as unknown as CreateDocumentArgs)
      );
    case "get_document":
      return JSON.stringify(
        await tools.getDocument(ctx, args as unknown as GetDocumentArgs)
      );
    case "list_documents":
      return JSON.stringify(
        await tools.listDocuments(ctx, args as unknown as ListDocumentsArgs)
      );
    case "search_documents":
      return JSON.stringify(
        await tools.searchDocuments(ctx, args as unknown as SearchDocumentsArgs)
      );
    case "count_documents":
      return JSON.stringify(
        await tools.countDocuments(ctx, args as unknown as CountDocumentsArgs)
      );
    case "update_document":
      return JSON.stringify(
        await tools.updateDocument(ctx, args as unknown as UpdateDocumentArgs)
      );
    case "delete_document":
      return JSON.stringify(
        await tools.deleteDocument(ctx, args as unknown as DeleteDocumentArgs)
      );
    case "bulk_create_documents":
      return JSON.stringify(
        await tools.bulkCreateDocuments(
          ctx,
          args as unknown as BulkCreateDocumentsArgs
        )
      );
    case "bulk_update_documents":
      return JSON.stringify(
        await tools.bulkUpdateDocuments(
          ctx,
          args as unknown as BulkUpdateDocumentsArgs
        )
      );
    case "bulk_delete_documents":
      return JSON.stringify(
        await tools.bulkDeleteDocuments(
          ctx,
          args as unknown as BulkDeleteDocumentsArgs
        )
      );

    // Project user tools
    case "create_project_user":
      return JSON.stringify(
        await tools.createProjectUser(
          ctx,
          args as unknown as CreateProjectUserArgs
        )
      );
    case "get_project_user":
      return JSON.stringify(
        await tools.getProjectUser(ctx, args as unknown as GetProjectUserArgs)
      );
    case "list_users":
      return JSON.stringify(
        await tools.listUsers(ctx, args as unknown as SearchArgs)
      );
    case "update_project_user":
      return JSON.stringify(
        await tools.updateProjectUser(
          ctx,
          args as unknown as UpdateProjectUserArgs
        )
      );
    case "delete_project_user":
      return JSON.stringify(
        await tools.deleteProjectUser(
          ctx,
          args as unknown as DeleteProjectUserArgs
        )
      );

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Conditional authentication middleware
async function conditionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // For admin routes, always require authentication
  if (req.path.startsWith("/admin/")) {
    return authenticate(req, res, next);
  }

  // For project routes, check project settings
  if (req.path.startsWith("/projects/")) {
    const projectId = req.params.projectId;
    if (projectId) {
      try {
        const project = await db.getProjectById(projectId);
        if (
          project &&
          project.settings &&
          project.settings.authentication_required === false
        ) {
          // Auth not required, allow request to proceed
          return next();
        }
      } catch (error) {
        // If we can't check project settings, require auth for safety
        console.error("Error checking project settings for MCP auth:", error);
      }
    }
  }

  // For other routes (like /models, /model-capabilities), check if they're project-specific
  // If there's a projectId in body or params, check project settings
  const projectId = req.params.projectId || req.body?.projectId;
  if (projectId) {
    try {
      const project = await db.getProjectById(projectId);
      if (
        project &&
        project.settings &&
        project.settings.authentication_required === false
      ) {
        // Auth not required, allow request to proceed
        return next();
      }
    } catch (error) {
      // If we can't check project settings, require auth for safety
      console.error("Error checking project settings for MCP auth:", error);
    }
  }

  // Default: require authentication
  return authenticate(req, res, next);
}

// Apply conditional authentication to all routes
router.use(conditionalAuthenticate);

// Use handlers for routes
router.post("/models", async (req: Request, res: Response) => {
  await modelsHandler.handle(req, res);
});

router.post("/model-capabilities", async (req: Request, res: Response) => {
  await modelCapabilitiesHandler.handle(req, res);
});

router.post(
  "/admin/chat",
  requireScopes({ scopes: [Scope.ADMIN_READ], requireAll: false }),
  async (req: Request, res: Response) => {
    await adminChatHandler.handle(req, res);
  }
);

router.post(
  "/projects/:projectId/chat",
  requireScopes({ scopes: [Scope.PROJECTS_READ], projectSpecific: true }),
  async (req: Request, res: Response) => {
    await projectChatHandler.handle(req, res);
  }
);

// Mark intentionally unused variables (kept for reference/future use)
void _projectToolSpecs;
void _dispatchTool;

export default router;
