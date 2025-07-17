import { McpToolDefinition, McpToolResult, AppStateContext } from "../types/mcp";
import database from "./database";

/**
 * Get current application state context
 */
async function getAppStateContext(): Promise<AppStateContext> {
  try {
    const [contentItems, users, routes, schemas, files] = await Promise.all([
      Promise.resolve(database.getAllContent()),
      Promise.resolve(database.getAllUsers()),
      Promise.resolve(database.getAllRoutes()),
      Promise.resolve(database.getAllSchemas()),
      Promise.resolve(database.getAllFiles()),
    ]);

    return {
      contentItems: contentItems.map((item) => ({
        id: item.id,
        key: item.key,
        value: item.data,
        type: item.content_type,
        route_path: item.route_path,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })),
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.active,
        created_at: user.created_at,
        last_login: user.last_login,
      })),
      routes: routes.map((route) => ({
        id: route.id,
        path: route.path,
        name: route.name,
        description: route.description,
        parent_id: route.parent_id,
        created_at: route.created_at,
      })),
      schemas: schemas.map((schema) => ({
        id: schema.id,
        name: schema.name,
        description: schema.description,
        definition: schema.definition,
        created_at: schema.created_at,
      })),
      files: files.map((file) => ({
        id: file.id,
        filename: file.filename,
        original_name: file.original_name,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
        uploaded_by: file.uploaded_by,
        created_at: file.created_at,
      })),
    };
  } catch (error) {
    console.error("Failed to get app state context:", error);
    throw error;
  }
}

/**
 * MCP Tool: Get Content Items
 */
const getContentTool: McpToolDefinition = {
  name: "get_content",
  description: "Retrieve content items from the CMS. Can filter by route path, content type, or search by key.",
  inputSchema: {
    type: "object",
    properties: {
      route_path: {
        type: "string",
        description: "Filter by route path (e.g., '/home', '/blog')",
      },
      content_type: {
        type: "string", 
        description: "Filter by content type (e.g., 'text', 'json', 'markdown')",
      },
      key: {
        type: "string",
        description: "Search for specific content key",
      },
      limit: {
        type: "number",
        description: "Maximum number of items to return (default: 50)",
      },
    },
  },
  handler: async (args, context) => {
    try {
      let content = context.contentItems;

      if (args.route_path) {
        content = content.filter(item => item.route_path === args.route_path);
      }

      if (args.content_type) {
        content = content.filter(item => item.type === args.content_type);
      }

      if (args.key) {
        content = content.filter(item => 
          item.key.toLowerCase().includes((args.key as string).toLowerCase())
        );
      }

      const limit = Math.min((args.limit as number) || 50, 100);
      content = content.slice(0, limit);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            count: content.length,
            data: content
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

/**
 * MCP Tool: Create Content Item
 */
const createContentTool: McpToolDefinition = {
  name: "create_content",
  description: "Create a new content item in the CMS",
  inputSchema: {
    type: "object",
    properties: {
      key: {
        type: "string",
        description: "Unique key for the content item"
      },
      data: {
        description: "The content data (can be text, JSON, etc.)"
      },
      content_type: {
        type: "string",
        description: "Type of content (text, json, markdown, etc.)"
      },
      route_path: {
        type: "string",
        description: "Route path where this content belongs"
      },
      description: {
        type: "string",
        description: "Optional description of the content"
      }
    },
    required: ["key", "data", "content_type", "route_path"]
  },
  handler: async (args) => {
    try {
      const result = database.createContent({
        key: args.key as string,
        data: args.data,
        content_type: args.content_type as string,
        route_path: args.route_path as string,
        description: args.description as string | undefined,
        schema: undefined, // Optional schema
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: "Content created successfully",
            data: result
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

/**
 * MCP Tool: Update Content Item  
 */
const updateContentTool: McpToolDefinition = {
  name: "update_content",
  description: "Update an existing content item by key",
  inputSchema: {
    type: "object",
    properties: {
      key: {
        type: "string",
        description: "Key of the content item to update"
      },
      data: {
        description: "New content data"
      },
      content_type: {
        type: "string",
        description: "New content type"
      },
      description: {
        type: "string", 
        description: "New description"
      }
    },
    required: ["key"]
  },
  handler: async (args) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (args.data !== undefined) updateData.data = args.data;
      if (args.content_type) updateData.content_type = args.content_type;
      if (args.description) updateData.description = args.description;

      const result = database.updateContent(args.key as string, updateData);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: "Content updated successfully",
            data: result
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

/**
 * MCP Tool: Delete Content Item
 */
const deleteContentTool: McpToolDefinition = {
  name: "delete_content",
  description: "Delete a content item by key",
  inputSchema: {
    type: "object",
    properties: {
      key: {
        type: "string",
        description: "Key of the content item to delete"
      }
    },
    required: ["key"]
  },
  handler: async (args) => {
    try {
      const deleted = database.deleteContent(args.key as string);

      if (!deleted) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Content not found or could not be deleted"
            }, null, 2)
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: "Content deleted successfully"
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

/**
 * MCP Tool: Get Users
 */
const getUsersTool: McpToolDefinition = {
  name: "get_users",
  description: "Retrieve user accounts from the system",
  inputSchema: {
    type: "object",
    properties: {
      is_active: {
        type: "boolean",
        description: "Filter by active status"
      },
      role: {
        type: "string",
        description: "Filter by user role"
      }
    }
  },
  handler: async (args, context) => {
    try {
      let users = context.users;

      if (args.is_active !== undefined) {
        users = users.filter(user => user.is_active === args.is_active);
      }

      if (args.role) {
        users = users.filter(user => user.role === args.role);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            count: users.length,
            data: users
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

/**
 * MCP Tool: Create User
 */
const createUserTool: McpToolDefinition = {
  name: "create_user",
  description: "Create a new user account",
  inputSchema: {
    type: "object",
    properties: {
      username: {
        type: "string",
        description: "Username for the new user"
      },
      password: {
        type: "string",
        description: "Password for the new user"
      },
      email: {
        type: "string",
        description: "Email address for the new user"
      },
      role: {
        type: "string",
        description: "Role for the new user (admin, editor, viewer)"
      }
    },
    required: ["username", "password", "email"]
  },
  handler: async (args) => {
    try {
      const result = database.createUser({
        username: args.username as string,
        password: args.password as string,
        email: args.email as string,
        role: (args.role as string) || "viewer",
        permissions: "[]",
        active: true,
      });

      if (!result) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Failed to create user (username may already exist)"
            }, null, 2)
          }],
          isError: true
        };
      }

      // Remove password from response
      const safeResult = { ...result };
      delete (safeResult as any).password;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: "User created successfully",
            data: safeResult
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

/**
 * MCP Tool: Get Routes
 */
const getRoutesTool: McpToolDefinition = {
  name: "get_routes",
  description: "Retrieve all routes from the system",
  inputSchema: {
    type: "object",
    properties: {
      parent_id: {
        type: "number",
        description: "Filter by parent route ID"
      }
    }
  },
  handler: async (args, context) => {
    try {
      let routes = context.routes;

      if (args.parent_id !== undefined) {
        routes = routes.filter(route => route.parent_id === args.parent_id);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            count: routes.length,
            data: routes
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

/**
 * MCP Tool: Create Route
 */
const createRouteTool: McpToolDefinition = {
  name: "create_route",
  description: "Create a new route in the system",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Route path (e.g., '/about', '/blog')"
      },
      name: {
        type: "string",
        description: "Display name for the route"
      },
      description: {
        type: "string",
        description: "Optional description of the route"
      },
      parent_id: {
        type: "number",
        description: "Optional parent route ID"
      }
    },
    required: ["path", "name"]
  },
  handler: async (args) => {
    try {
      const result = database.createRoute({
        path: args.path as string,
        name: args.name as string,
        description: args.description as string,
        schema: undefined,
        parent_id: args.parent_id as number | undefined,
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: "Route created successfully",
            data: result
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

/**
 * MCP Tool: Get Schemas
 */
const getSchemasTool: McpToolDefinition = {
  name: "get_schemas", 
  description: "Retrieve content schemas from the system",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Filter by schema name"
      }
    }
  },
  handler: async (args, context) => {
    try {
      let schemas = context.schemas;

      if (args.name) {
        schemas = schemas.filter(schema => 
          schema.name.toLowerCase().includes((args.name as string).toLowerCase())
        );
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            count: schemas.length,
            data: schemas
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

/**
 * MCP Tool: Get System Statistics
 */
const getStatsTool: McpToolDefinition = {
  name: "get_stats",
  description: "Get overall system statistics and health information",
  inputSchema: {
    type: "object",
    properties: {}
  },
  handler: async (args, context) => {
    try {
      const stats = {
        content_count: context.contentItems.length,
        user_count: context.users.length,
        active_user_count: context.users.filter(u => u.is_active).length,
        route_count: context.routes.length,
        schema_count: context.schemas.length,
        file_count: context.files.length,
        content_by_type: context.contentItems.reduce((acc, item) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        content_by_route: context.contentItems.reduce((acc, item) => {
          acc[item.route_path] = (acc[item.route_path] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            data: stats
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        }],
        isError: true
      };
    }
  }
};

/**
 * Export all MCP tools
 */
export const mcpTools: McpToolDefinition[] = [
  getContentTool,
  createContentTool,
  updateContentTool,
  deleteContentTool,
  getUsersTool,
  createUserTool,
  getRoutesTool,
  createRouteTool,
  getSchemasTool,
  getStatsTool,
];

/**
 * Get app state context for tools
 */
export { getAppStateContext };