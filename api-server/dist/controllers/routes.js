"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutesController = void 0;
const database_1 = __importDefault(require("../services/database"));
class RoutesController {
    static getAllRoutes(req, res) {
        try {
            const { parent_id } = req.query;
            const routes = parent_id
                ? database_1.default.getNestedRoutes(parseInt(parent_id))
                : database_1.default.getAllRoutes();
            const response = {
                success: true,
                data: routes,
                message: `Retrieved ${routes.length} routes`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get all routes error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve routes",
            };
            res.status(500).json(response);
        }
    }
    static getRouteByPath(req, res) {
        try {
            const { path } = req.params;
            const route = database_1.default.getRouteByPath(path);
            if (!route) {
                const response = {
                    success: false,
                    error: `Route with path '${path}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: route,
                message: `Retrieved route for path '${path}'`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get route by path error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve route",
            };
            res.status(500).json(response);
        }
    }
    static createRoute(req, res) {
        try {
            const { path, name, description, schema, parent_id, access_level } = req.body;
            // Validate required fields
            if (!path || !name) {
                const response = {
                    success: false,
                    error: "Path and name are required",
                };
                res.status(400).json(response);
                return;
            }
            // Check if path already exists
            const existingRoute = database_1.default.getRouteByPath(path);
            if (existingRoute) {
                const response = {
                    success: false,
                    error: `Route with path '${path}' already exists`,
                };
                res.status(409).json(response);
                return;
            }
            // Validate parent route exists if parent_id is provided
            if (parent_id) {
                const parentRoute = database_1.default.getRouteById(parent_id);
                if (!parentRoute) {
                    const response = {
                        success: false,
                        error: `Parent route with id '${parent_id}' not found`,
                    };
                    res.status(400).json(response);
                    return;
                }
            }
            const newRoute = database_1.default.createRoute({
                path,
                name,
                description,
                schema,
                parent_id,
                access_level: access_level || "public",
            });
            const response = {
                success: true,
                data: newRoute,
                message: `Route created with path '${path}'`,
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error("Create route error:", error);
            const response = {
                success: false,
                error: error instanceof Error ? error.message : "Failed to create route",
            };
            res.status(500).json(response);
        }
    }
    static updateRoute(req, res) {
        try {
            const { path } = req.params;
            const updates = req.body;
            const updatedRoute = database_1.default.updateRoute(path, updates);
            if (!updatedRoute) {
                const response = {
                    success: false,
                    error: `Route with path '${path}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: updatedRoute,
                message: `Route updated for path '${path}'`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Update route error:", error);
            const response = {
                success: false,
                error: "Failed to update route",
            };
            res.status(500).json(response);
        }
    }
    static deleteRoute(req, res) {
        try {
            const { path } = req.params;
            const deleted = database_1.default.deleteRoute(path);
            if (!deleted) {
                const response = {
                    success: false,
                    error: `Route with path '${path}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: `Route with path '${path}' deleted successfully`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Delete route error:", error);
            const response = {
                success: false,
                error: "Failed to delete route",
            };
            res.status(500).json(response);
        }
    }
    static getNestedRoutes(req, res) {
        try {
            const { parent_id } = req.params;
            const parentIdNumber = parent_id ? parseInt(parent_id) : undefined;
            const routes = database_1.default.getNestedRoutes(parentIdNumber);
            const response = {
                success: true,
                data: routes,
                message: `Retrieved ${routes.length} nested routes`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get nested routes error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve nested routes",
            };
            res.status(500).json(response);
        }
    }
    static getRouteById(req, res) {
        try {
            const { id } = req.params;
            const routeId = parseInt(id);
            if (isNaN(routeId)) {
                const response = {
                    success: false,
                    error: "Invalid route ID",
                };
                res.status(400).json(response);
                return;
            }
            const route = database_1.default.getRouteById(routeId);
            if (!route) {
                const response = {
                    success: false,
                    error: `Route with ID ${routeId} not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: route,
                message: `Retrieved route with ID ${routeId}`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get route by ID error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve route",
            };
            res.status(500).json(response);
        }
    }
    static getRouteTree(req, res) {
        try {
            const routes = database_1.default.getAllRoutes();
            // Build tree structure
            const buildTree = (parentId) => {
                return routes
                    .filter((route) => route.parent_id === parentId)
                    .map((route) => ({
                    ...route,
                    children: buildTree(route.id),
                }));
            };
            const routeTree = buildTree();
            const response = {
                success: true,
                data: routeTree,
                message: `Retrieved route tree with ${routes.length} routes`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get route tree error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve route tree",
            };
            res.status(500).json(response);
        }
    }
}
exports.RoutesController = RoutesController;
//# sourceMappingURL=routes.js.map