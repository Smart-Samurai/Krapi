import { Request, Response } from "express";
import database from "../services/database";
import { ApiResponse, ContentRoute, CreateRouteRequest } from "../types";

export class RoutesController {
  static getAllRoutes(req: Request, res: Response): void {
    try {
      const { parent_id } = req.query;

      const routes = parent_id
        ? database.getNestedRoutes(parseInt(parent_id as string))
        : database.getAllRoutes();

      const response: ApiResponse<ContentRoute[]> = {
        success: true,
        data: routes,
        message: `Retrieved ${routes.length} routes`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get all routes error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve routes",
      };
      res.status(500).json(response);
    }
  }

  static getRouteByPath(req: Request, res: Response): void {
    try {
      const { path } = req.params;
      const route = database.getRouteByPath(path);

      if (!route) {
        const response: ApiResponse = {
          success: false,
          error: `Route with path '${path}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<ContentRoute> = {
        success: true,
        data: route,
        message: `Retrieved route for path '${path}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get route by path error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve route",
      };
      res.status(500).json(response);
    }
  }

  static createRoute(req: Request, res: Response): void {
    try {
      const { path, name, description, schema, parent_id, access_level } =
        req.body as CreateRouteRequest;

      // Validate required fields
      if (!path || !name) {
        const response: ApiResponse = {
          success: false,
          error: "Path and name are required",
        };
        res.status(400).json(response);
        return;
      }

      // Check if path already exists
      const existingRoute = database.getRouteByPath(path);
      if (existingRoute) {
        const response: ApiResponse = {
          success: false,
          error: `Route with path '${path}' already exists`,
        };
        res.status(409).json(response);
        return;
      }

      // Validate parent route exists if parent_id is provided
      if (parent_id) {
        const parentRoute = database.getRouteById(parent_id);
        if (!parentRoute) {
          const response: ApiResponse = {
            success: false,
            error: `Parent route with id '${parent_id}' not found`,
          };
          res.status(400).json(response);
          return;
        }
      }

      const newRoute = database.createRoute({
        path,
        name,
        description,
        schema,
        parent_id,
        access_level: access_level || "public",
      });

      const response: ApiResponse<ContentRoute> = {
        success: true,
        data: newRoute,
        message: `Route created with path '${path}'`,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error("Create route error:", error);
      const response: ApiResponse = {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create route",
      };
      res.status(500).json(response);
    }
  }

  static updateRoute(req: Request, res: Response): void {
    try {
      const { path } = req.params;
      const updates = req.body;

      const updatedRoute = database.updateRoute(path, updates);

      if (!updatedRoute) {
        const response: ApiResponse = {
          success: false,
          error: `Route with path '${path}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<ContentRoute> = {
        success: true,
        data: updatedRoute,
        message: `Route updated for path '${path}'`,
      };

      res.json(response);
    } catch (error) {
      console.error("Update route error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to update route",
      };
      res.status(500).json(response);
    }
  }

  static deleteRoute(req: Request, res: Response): void {
    try {
      const { path } = req.params;

      const deleted = database.deleteRoute(path);

      if (!deleted) {
        const response: ApiResponse = {
          success: false,
          error: `Route with path '${path}' not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: `Route with path '${path}' deleted successfully`,
      };

      res.json(response);
    } catch (error) {
      console.error("Delete route error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to delete route",
      };
      res.status(500).json(response);
    }
  }

  static getNestedRoutes(req: Request, res: Response): void {
    try {
      const { parent_id } = req.params;
      const parentIdNumber = parent_id ? parseInt(parent_id) : undefined;

      const routes = database.getNestedRoutes(parentIdNumber);

      const response: ApiResponse<ContentRoute[]> = {
        success: true,
        data: routes,
        message: `Retrieved ${routes.length} nested routes`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get nested routes error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve nested routes",
      };
      res.status(500).json(response);
    }
  }

  static getRouteById(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const routeId = parseInt(id);

      if (isNaN(routeId)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid route ID",
        };
        res.status(400).json(response);
        return;
      }

      const route = database.getRouteById(routeId);

      if (!route) {
        const response: ApiResponse = {
          success: false,
          error: `Route with ID ${routeId} not found`,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<ContentRoute> = {
        success: true,
        data: route,
        message: `Retrieved route with ID ${routeId}`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get route by ID error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve route",
      };
      res.status(500).json(response);
    }
  }

  static getRouteTree(req: Request, res: Response): void {
    try {
      const routes = database.getAllRoutes();

      // Build tree structure
      const buildTree = (parentId?: number): any[] => {
        return routes
          .filter((route) => route.parent_id === parentId)
          .map((route) => ({
            ...route,
            children: buildTree(route.id),
          }));
      };

      const routeTree = buildTree();

      const response: ApiResponse = {
        success: true,
        data: routeTree,
        message: `Retrieved route tree with ${routes.length} routes`,
      };

      res.json(response);
    } catch (error) {
      console.error("Get route tree error:", error);
      const response: ApiResponse = {
        success: false,
        error: "Failed to retrieve route tree",
      };
      res.status(500).json(response);
    }
  }
}
