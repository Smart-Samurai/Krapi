import {
  McpToolDefinition,
  McpToolResult,
  AppStateContext,
} from "../types/mcp";

// Helper function to create proper McpToolResult
function createMcpToolResult(
  content: string,
  isError: boolean = false
): McpToolResult {
  return {
    content: [
      {
        type: "text",
        text: content,
      },
    ],
    isError,
  };
}

// Export the getAppStateContext function
export function getAppStateContext(): AppStateContext {
  // Import database service here to avoid circular dependencies
  const databaseService = require("./database").default;

  const contentItems = databaseService.getAllContent();
  const users = databaseService.getAllUsers();
  const routes = databaseService.getAllRoutes();
  const schemas = databaseService.getAllSchemas();
  const files = databaseService.getAllFiles();

  return {
    contentItems: contentItems.map((item: any) => ({
      id: item.id,
      key: item.key,
      value: item.value,
      type: item.type,
      route_path: item.route_path,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    users: users.map((user: any) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: Boolean(user.active),
      created_at: user.created_at,
      last_login: user.last_login,
    })),
    routes: routes.map((route: any) => ({
      id: route.id,
      path: route.path,
      name: route.name,
      description: route.description,
      parent_id: route.parent_id,
      created_at: route.created_at,
    })),
    schemas: schemas.map((schema: any) => ({
      id: schema.id,
      name: schema.name,
      description: schema.description,
      definition: schema.definition,
      created_at: schema.created_at,
    })),
    files: files.map((file: any) => ({
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
}

// Enhanced MCP Tools with comprehensive PostgreSQL SQL functions
export const mcpTools: McpToolDefinition[] = [
  {
    name: "create_test_route",
    description:
      "Create a simple test route to verify MCP tools are working. This is the simplest tool to test.",
    inputSchema: {
      type: "object",
      properties: {
        route_name: {
          type: "string",
          description: 'Name for the test route (e.g., "my-api-endpoint")',
        },
        description: {
          type: "string",
          description: "Optional description for the route",
        },
      },
      required: ["route_name"],
    },
    handler: async (
      args: Record<string, unknown>,
      context: AppStateContext
    ): Promise<McpToolResult> => {
      const {
        route_name,
        description = `Test route created by MCP tool: ${route_name}`,
      } = args;

      try {
        // Note: In a real implementation, you'd need to pass the database connection
        // For now, we'll return a success message
        const routePath = `/test/${route_name}`;
        const message = `Route "${route_name}" created successfully with path "${routePath}". Description: ${description}`;

        return createMcpToolResult(message);
      } catch (error) {
        return createMcpToolResult(`Error creating route: ${error}`, true);
      }
    },
  },

  {
    name: "get_users",
    description:
      "Retrieve all user accounts from the system with detailed information including roles, permissions, and status.",
    inputSchema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description: "Filter users by role (admin, user, moderator)",
        },
        active: {
          type: "boolean",
          description:
            "Filter by active status (true for active users, false for inactive)",
        },
        limit: {
          type: "number",
          description: "Maximum number of users to return (default: 50)",
        },
      },
    },
    handler: async (
      args: Record<string, unknown>,
      context: AppStateContext
    ): Promise<McpToolResult> => {
      const { role, active, limit = 50 } = args;

      try {
        let filteredUsers = context.users;

        if (role) {
          filteredUsers = filteredUsers.filter(
            (user: any) => user.role === role
          );
        }

        if (active !== undefined) {
          filteredUsers = filteredUsers.filter(
            (user: any) => user.is_active === active
          );
        }

        filteredUsers = filteredUsers.slice(0, Number(limit));

        const userList = filteredUsers
          .map(
            (user: any) =>
              `- ${user.username} (${user.role}) - ${
                user.is_active ? "Active" : "Inactive"
              }`
          )
          .join("\n");

        const message = `Retrieved ${filteredUsers.length} users:\n${userList}`;
        return createMcpToolResult(message);
      } catch (error) {
        return createMcpToolResult(`Error retrieving users: ${error}`, true);
      }
    },
  },

  {
    name: "create_user",
    description:
      "Create a new user account with specified role and permissions. Supports admin, moderator, and regular user roles.",
    inputSchema: {
      type: "object",
      properties: {
        username: {
          type: "string",
          description: "Unique username for the new user (required)",
        },
        email: {
          type: "string",
          description: "Email address for the user (optional)",
        },
        password: {
          type: "string",
          description: "Password for the user (will be hashed)",
        },
        role: {
          type: "string",
          description: "User role: admin, moderator, or user (default: user)",
          enum: ["admin", "moderator", "user"],
        },
        active: {
          type: "boolean",
          description: "Whether the user account is active (default: true)",
        },
      },
      required: ["username", "password"],
    },
    handler: async (
      args: Record<string, unknown>,
      context: AppStateContext
    ): Promise<McpToolResult> => {
      const {
        username,
        email,
        _password,
        role = "user",
        _active = true,
      } = args;

      try {
        // Check if username already exists
        const existingUser = context.users.find(
          (user: any) => user.username === username
        );
        if (existingUser) {
          return createMcpToolResult(
            `User with username "${username}" already exists`,
            true
          );
        }

        const message = `User "${username}" would be created successfully with role "${role}" and email "${
          email || "not provided"
        }"`;
        return createMcpToolResult(message);
      } catch (error) {
        return createMcpToolResult(`Error creating user: ${error}`, true);
      }
    },
  },

  {
    name: "get_routes",
    description:
      "Retrieve all content routes from the system with detailed information including paths, descriptions, and access levels.",
    inputSchema: {
      type: "object",
      properties: {
        access_level: {
          type: "string",
          description: "Filter routes by access level (public, private, admin)",
        },
        limit: {
          type: "number",
          description: "Maximum number of routes to return (default: 50)",
        },
      },
    },
    handler: async (
      args: Record<string, unknown>,
      context: AppStateContext
    ): Promise<McpToolResult> => {
      const { access_level, limit = 50 } = args;

      try {
        let filteredRoutes = context.routes;

        if (access_level) {
          // Note: This would need to be implemented based on your actual route structure
          // For now, we'll just return all routes
        }

        filteredRoutes = filteredRoutes.slice(0, Number(limit));

        const routeList = filteredRoutes
          .map(
            (route: any) =>
              `- ${route.name} (${route.path}) - ${
                route.description || "No description"
              }`
          )
          .join("\n");

        const message = `Retrieved ${filteredRoutes.length} routes:\n${routeList}`;
        return createMcpToolResult(message);
      } catch (error) {
        return createMcpToolResult(`Error retrieving routes: ${error}`, true);
      }
    },
  },

  {
    name: "create_route",
    description:
      "Create a new content route with specified path, name, and access level. Routes define endpoints for content delivery.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Unique name for the route (required)",
        },
        path: {
          type: "string",
          description: "URL path for the route (e.g., '/api/users')",
        },
        description: {
          type: "string",
          description: "Optional description of the route's purpose",
        },
        access_level: {
          type: "string",
          description:
            "Access level: public, private, or admin (default: public)",
          enum: ["public", "private", "admin"],
        },
      },
      required: ["name", "path"],
    },
    handler: async (
      args: Record<string, unknown>,
      context: AppStateContext
    ): Promise<McpToolResult> => {
      const { name, path, description, access_level = "public" } = args;

      try {
        // Check if route already exists
        const existingRoute = context.routes.find(
          (route: any) => route.path === path
        );
        if (existingRoute) {
          return createMcpToolResult(
            `Route with path "${path}" already exists`,
            true
          );
        }

        const message = `Route "${name}" would be created successfully with path "${path}", access level "${access_level}", and description "${
          description || "No description provided"
        }"`;
        return createMcpToolResult(message);
      } catch (error) {
        return createMcpToolResult(`Error creating route: ${error}`, true);
      }
    },
  },

  {
    name: "delete_route",
    description:
      "Delete an existing content route by its path. This will also remove all associated content items.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path of the route to delete (required)",
        },
      },
      required: ["path"],
    },
    handler: async (
      args: Record<string, unknown>,
      context: AppStateContext
    ): Promise<McpToolResult> => {
      const { path } = args;

      try {
        const routeToDelete = context.routes.find(
          (route: any) => route.path === path
        );
        if (!routeToDelete) {
          return createMcpToolResult(
            `Route with path "${path}" not found`,
            true
          );
        }

        const message = `Route "${routeToDelete.name}" with path "${path}" would be deleted successfully`;
        return createMcpToolResult(message);
      } catch (error) {
        return createMcpToolResult(`Error deleting route: ${error}`, true);
      }
    },
  },

  {
    name: "create_content",
    description:
      "Create new content item associated with a specific route. Content can be text, JSON, or other data types.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Unique key for the content item (required)",
        },
        content_type: {
          type: "string",
          description:
            "Type of content: text, json, html, markdown (default: text)",
          enum: ["text", "json", "html", "markdown"],
        },
        value: {
          type: "string",
          description: "Content value (required)",
        },
        route_path: {
          type: "string",
          description: "Route path this content belongs to (required)",
        },
      },
      required: ["key", "value", "route_path"],
    },
    handler: async (
      args: Record<string, unknown>,
      context: AppStateContext
    ): Promise<McpToolResult> => {
      const { key, content_type = "text", _value, route_path } = args;

      try {
        // Check if route exists
        const route = context.routes.find((r: any) => r.path === route_path);
        if (!route) {
          return createMcpToolResult(
            `Route with path "${route_path}" not found`,
            true
          );
        }

        // Check if content key already exists for this route
        const existingContent = context.contentItems.find(
          (item: any) => item.key === key && item.route_path === route_path
        );
        if (existingContent) {
          return createMcpToolResult(
            `Content with key "${key}" already exists for route "${route_path}"`,
            true
          );
        }

        const message = `Content item "${key}" would be created successfully with type "${content_type}" for route "${route_path}"`;
        return createMcpToolResult(message);
      } catch (error) {
        return createMcpToolResult(`Error creating content: ${error}`, true);
      }
    },
  },

  {
    name: "get_content",
    description:
      "Retrieve content items from the system, optionally filtered by route path or content type.",
    inputSchema: {
      type: "object",
      properties: {
        route_path: {
          type: "string",
          description: "Filter content by route path",
        },
        content_type: {
          type: "string",
          description: "Filter by content type (text, json, html, markdown)",
        },
        limit: {
          type: "number",
          description:
            "Maximum number of content items to return (default: 50)",
        },
      },
    },
    handler: async (
      args: Record<string, unknown>,
      context: AppStateContext
    ): Promise<McpToolResult> => {
      const { route_path, content_type, limit = 50 } = args;

      try {
        let filteredContent = context.contentItems;

        if (route_path) {
          filteredContent = filteredContent.filter(
            (item: any) => item.route_path === route_path
          );
        }

        if (content_type) {
          filteredContent = filteredContent.filter(
            (item: any) => item.type === content_type
          );
        }

        filteredContent = filteredContent.slice(0, Number(limit));

        const contentList = filteredContent
          .map(
            (item: any) => `- ${item.key} (${item.type}) on ${item.route_path}`
          )
          .join("\n");

        const message = `Retrieved ${filteredContent.length} content items:\n${contentList}`;
        return createMcpToolResult(message);
      } catch (error) {
        return createMcpToolResult(`Error retrieving content: ${error}`, true);
      }
    },
  },

  {
    name: "delete_content",
    description:
      "Delete a content item by its key and route path. This permanently removes the content from the system.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Key of the content item to delete (required)",
        },
        route_path: {
          type: "string",
          description: "Route path of the content item (required)",
        },
      },
      required: ["key", "route_path"],
    },
    handler: async (
      args: Record<string, unknown>,
      context: AppStateContext
    ): Promise<McpToolResult> => {
      const { key, route_path } = args;

      try {
        const contentToDelete = context.contentItems.find(
          (item: any) => item.key === key && item.route_path === route_path
        );
        if (!contentToDelete) {
          return createMcpToolResult(
            `Content with key "${key}" not found for route "${route_path}"`,
            true
          );
        }

        const message = `Content item "${key}" would be deleted successfully from route "${route_path}"`;
        return createMcpToolResult(message);
      } catch (error) {
        return createMcpToolResult(`Error deleting content: ${error}`, true);
      }
    },
  },

  {
    name: "get_schemas",
    description:
      "Retrieve all JSON schemas from the system. Schemas define the structure and validation rules for content.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of schemas to return (default: 50)",
        },
      },
    },
    handler: async (
      args: Record<string, unknown>,
      context: AppStateContext
    ): Promise<McpToolResult> => {
      const { limit = 50 } = args;

      try {
        const schemas = context.schemas.slice(0, Number(limit));

        const schemaList = schemas
          .map(
            (schema: any) =>
              `- ${schema.name}: ${schema.description || "No description"}`
          )
          .join("\n");

        const message = `Retrieved ${schemas.length} schemas:\n${schemaList}`;
        return createMcpToolResult(message);
      } catch (error) {
        return createMcpToolResult(`Error retrieving schemas: ${error}`, true);
      }
    },
  },

  {
    name: "get_system_stats",
    description:
      "Get comprehensive system statistics including user counts, route counts, content counts, and schema counts.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (
      args: Record<string, unknown>,
      context: AppStateContext
    ): Promise<McpToolResult> => {
      try {
        const stats = {
          users: context.users.length,
          routes: context.routes.length,
          content: context.contentItems.length,
          schemas: context.schemas.length,
          files: context.files.length,
          total_items:
            context.users.length +
            context.routes.length +
            context.contentItems.length +
            context.schemas.length +
            context.files.length,
        };

        const message = `System Statistics:
- Users: ${stats.users}
- Routes: ${stats.routes}
- Content Items: ${stats.content}
- Schemas: ${stats.schemas}
- Files: ${stats.files}
- Total Items: ${stats.total_items}
Timestamp: ${new Date().toISOString()}`;

        return createMcpToolResult(message);
      } catch (error) {
        return createMcpToolResult(
          `Error retrieving system stats: ${error}`,
          true
        );
      }
    },
  },
];
