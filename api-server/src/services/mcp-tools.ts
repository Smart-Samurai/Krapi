import { McpToolDefinition, AppStateContext } from "../types/mcp";

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
    ) => {
      const {
        route_name,
        description = `Test route created by MCP tool: ${route_name}`,
      } = args;

      try {
        // Import database service here to avoid circular dependencies
        const databaseService = require("./database").default;

        const routePath = `/test/${route_name}`;

        // Check if route already exists
        const existingRoute = databaseService.getRouteByPath(routePath);
        if (existingRoute) {
          return {
            success: false,
            error: `Route with path "${routePath}" already exists`,
          };
        }

        // Create the route
        const newRoute = databaseService.createRoute({
          name: route_name,
          path: routePath,
          description: description,
          access_level: "public",
        });

        const message = `Route "${route_name}" created successfully with path "${routePath}". Description: ${description}`;

        return {
          success: true,
          message: message,
          route_id: newRoute.id,
          route_path: routePath,
        };
      } catch (error) {
        return {
          success: false,
          error: `Error creating route: ${error}`,
        };
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
    ) => {
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

        return {
          success: true,
          users: filteredUsers,
          count: filteredUsers.length,
          message: `Retrieved ${filteredUsers.length} users`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Error retrieving users: ${error}`,
        };
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
    ) => {
      const { username, email, password, role = "user", active = true } = args;

      try {
        // Import database service here to avoid circular dependencies
        const databaseService = require("./database").default;

        // Check if username already exists
        const existingUser = databaseService.getUserByUsername(username);
        if (existingUser) {
          return {
            success: false,
            error: `User with username "${username}" already exists`,
          };
        }

        // Create the user
        const newUser = databaseService.createUser({
          username: username,
          email: email || "",
          password: password,
          role: role,
          active: active,
        });

        if (!newUser) {
          return {
            success: false,
            error: "Failed to create user",
          };
        }

        return {
          success: true,
          user_id: newUser.id,
          username: username,
          role: role,
          message: `User "${username}" created successfully with role "${role}"`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Error creating user: ${error}`,
        };
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
    ) => {
      const { access_level, limit = 50 } = args;

      try {
        let filteredRoutes = context.routes;

        if (access_level) {
          // Note: This would need to be implemented based on your actual route structure
          // For now, we'll just return all routes
        }

        filteredRoutes = filteredRoutes.slice(0, Number(limit));

        return {
          success: true,
          routes: filteredRoutes,
          count: filteredRoutes.length,
          message: `Retrieved ${filteredRoutes.length} routes`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Error retrieving routes: ${error}`,
        };
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
    ) => {
      const { name, path, description, access_level = "public" } = args;

      try {
        // Import database service here to avoid circular dependencies
        const databaseService = require("./database").default;

        // Check if route already exists
        const existingRoute = databaseService.getRouteByPath(path);
        if (existingRoute) {
          return {
            success: false,
            error: `Route with path "${path}" already exists`,
          };
        }

        // Create the route
        const newRoute = databaseService.createRoute({
          name: name,
          path: path,
          description: description || "",
          access_level: access_level,
        });

        return {
          success: true,
          route_id: newRoute.id,
          name: name,
          path: path,
          access_level: access_level,
          message: `Route "${name}" created successfully with path "${path}"`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Error creating route: ${error}`,
        };
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
    ) => {
      const { path } = args;

      try {
        // Import database service here to avoid circular dependencies
        const databaseService = require("./database").default;

        const routeToDelete = databaseService.getRouteByPath(path);
        if (!routeToDelete) {
          return {
            success: false,
            error: `Route with path "${path}" not found`,
          };
        }

        // Delete the route
        const deleted = databaseService.deleteRoute(path);
        if (!deleted) {
          return {
            success: false,
            error: `Failed to delete route "${path}"`,
          };
        }

        return {
          success: true,
          deleted_route: routeToDelete,
          message: `Route "${routeToDelete.name}" with path "${path}" deleted successfully`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Error deleting route: ${error}`,
        };
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
    ) => {
      const { key, content_type = "text", value, route_path } = args;

      try {
        // Import database service here to avoid circular dependencies
        const databaseService = require("./database").default;

        // Check if route exists
        const route = databaseService.getRouteByPath(route_path);
        if (!route) {
          return {
            success: false,
            error: `Route with path "${route_path}" not found`,
          };
        }

        // Check if content key already exists for this route
        const existingContent = databaseService.getContentByKeyAndRoute(
          key,
          route_path
        );
        if (existingContent) {
          return {
            success: false,
            error: `Content with key "${key}" already exists for route "${route_path}"`,
          };
        }

        // Create the content
        const newContent = databaseService.createContent({
          key: key,
          data: value,
          description: `Content created by MCP tool`,
          route_path: route_path,
          content_type: content_type,
        });

        return {
          success: true,
          content_id: newContent.id,
          key: key,
          content_type: content_type,
          message: `Content item "${key}" created successfully with type "${content_type}" for route "${route_path}"`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Error creating content: ${error}`,
        };
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
    ) => {
      const { route_path, content_type, limit = 50 } = args;

      try {
        // Import database service here to avoid circular dependencies
        const databaseService = require("./database").default;

        let filteredContent = databaseService.getAllContent();

        if (route_path) {
          filteredContent = filteredContent.filter(
            (item: any) => item.route_path === route_path
          );
        }

        if (content_type) {
          filteredContent = filteredContent.filter(
            (item: any) => item.content_type === content_type
          );
        }

        filteredContent = filteredContent.slice(0, Number(limit));

        return {
          success: true,
          content: filteredContent,
          count: filteredContent.length,
          message: `Retrieved ${filteredContent.length} content items`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Error retrieving content: ${error}`,
        };
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
    ) => {
      const { key, route_path } = args;

      try {
        // Import database service here to avoid circular dependencies
        const databaseService = require("./database").default;

        const contentToDelete = databaseService.getContentByKeyAndRoute(
          key,
          route_path
        );
        if (!contentToDelete) {
          return {
            success: false,
            error: `Content with key "${key}" not found for route "${route_path}"`,
          };
        }

        // Delete the content
        const deleted = databaseService.deleteContent(key);
        if (!deleted) {
          return {
            success: false,
            error: `Failed to delete content "${key}"`,
          };
        }

        return {
          success: true,
          deleted_content: contentToDelete,
          message: `Content item "${key}" deleted successfully from route "${route_path}"`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Error deleting content: ${error}`,
        };
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
    ) => {
      const { limit = 50 } = args;

      try {
        // Import database service here to avoid circular dependencies
        const databaseService = require("./database").default;

        const schemas = databaseService.getAllSchemas().slice(0, Number(limit));

        return {
          success: true,
          schemas: schemas,
          count: schemas.length,
          message: `Retrieved ${schemas.length} schemas`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Error retrieving schemas: ${error}`,
        };
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
    ) => {
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

        return {
          success: true,
          stats: stats,
          detailed: {},
          timestamp: new Date().toISOString(),
          message: `System statistics retrieved successfully`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Error retrieving system stats: ${error}`,
        };
      }
    },
  },
];
