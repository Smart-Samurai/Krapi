import { McpToolDefinition, AppStateContext } from "../types/mcp";

// Export the getAppStateContext function
export async function getAppStateContext(
  _args: any,
  _context: any
): Promise<AppStateContext> {
  return {
    contentItems: [],
    users: [],
    routes: [],
    schemas: [],
    files: [],
  };
}

// Simplified MCP Tools for testing and basic functionality
export const mcpTools: McpToolDefinition[] = [
  {
    name: "mcp_test",
    description:
      "A simple tool calling test that checks the current user's information. This tool will return the username, email, and access level of the user who is currently interacting with the system.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (
      _args: Record<string, unknown>,
      _context: AppStateContext
    ) => {
      try {
        // Get the current user from the context
        // For now, we'll return a default user since we need to implement user context
        const currentUser = {
          username: "test_user",
          email: "test@example.com",
          access_level: "admin",
          role: "admin",
        };

        return {
          success: true,
          user_info: currentUser,
          message: `MCP test successful. Current user: ${currentUser.username} (${currentUser.email}) with ${currentUser.access_level} access level.`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Error in MCP test: ${error}`,
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
      _context: AppStateContext
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
];
