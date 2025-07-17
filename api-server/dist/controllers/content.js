"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentController = void 0;
const database_1 = __importDefault(require("../services/database"));
class ContentController {
    static getAllContent(req, res) {
        try {
            const { route_path, content_type } = req.query;
            const content = database_1.default.getAllContent(route_path, content_type);
            const response = {
                success: true,
                data: content,
                message: `Retrieved ${content.length} content items`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get all content error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve content",
            };
            res.status(500).json(response);
        }
    }
    static getContentByKey(req, res) {
        try {
            const { key } = req.params;
            const content = database_1.default.getContentByKey(key);
            if (!content) {
                const response = {
                    success: false,
                    error: `Content with key '${key}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: content,
                message: `Retrieved content for key '${key}'`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get content by key error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve content",
            };
            res.status(500).json(response);
        }
    }
    static getContentById(req, res) {
        try {
            const { id } = req.params;
            const numericId = parseInt(id);
            if (isNaN(numericId)) {
                const response = {
                    success: false,
                    error: "Invalid content ID",
                };
                res.status(400).json(response);
                return;
            }
            const content = database_1.default.getContentById(numericId);
            if (!content) {
                const response = {
                    success: false,
                    error: `Content with ID '${id}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: content,
                message: `Retrieved content for ID '${id}'`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get content by ID error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve content",
            };
            res.status(500).json(response);
        }
    }
    static createContent(req, res) {
        try {
            console.log("Create content request body:", JSON.stringify(req.body, null, 2));
            const { key, data, description, route_path, content_type } = req.body;
            const { schema } = req.body; // Schema is optional and not in the strict type
            // Validate required fields
            if (!key || data === undefined || !route_path || !content_type) {
                console.log("Validation failed - missing fields:", {
                    key: !!key,
                    data: data !== undefined,
                    route_path: !!route_path,
                    content_type: !!content_type,
                });
                const response = {
                    success: false,
                    error: "Key, data, route_path, and content_type are required",
                };
                res.status(400).json(response);
                return;
            }
            // Check if key already exists
            const existingContent = database_1.default.getContentByKey(key);
            if (existingContent) {
                const response = {
                    success: false,
                    error: `Content with key '${key}' already exists. Use PUT to update.`,
                };
                res.status(409).json(response);
                return;
            }
            const newContent = database_1.default.createContent({
                key,
                data,
                description,
                route_path,
                content_type,
                schema,
            });
            const response = {
                success: true,
                data: newContent,
                message: `Content created with key '${key}'`,
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error("Create content error:", error);
            const response = {
                success: false,
                error: error instanceof Error ? error.message : "Failed to create content",
            };
            res.status(500).json(response);
        }
    }
    static updateContent(req, res) {
        try {
            const { key } = req.params;
            const updates = req.body;
            const updatedContent = database_1.default.updateContent(key, updates);
            if (!updatedContent) {
                const response = {
                    success: false,
                    error: `Content with key '${key}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: updatedContent,
                message: `Content updated for key '${key}'`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Update content error:", error);
            const response = {
                success: false,
                error: "Failed to update content",
            };
            res.status(500).json(response);
        }
    }
    static updateContentById(req, res) {
        try {
            const { id } = req.params;
            const numericId = parseInt(id);
            const updates = req.body;
            if (isNaN(numericId)) {
                const response = {
                    success: false,
                    error: "Invalid content ID",
                };
                res.status(400).json(response);
                return;
            }
            const updatedContent = database_1.default.updateContentById(numericId, updates);
            if (!updatedContent) {
                const response = {
                    success: false,
                    error: `Content with ID '${id}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: updatedContent,
                message: `Content updated for ID '${id}'`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Update content by ID error:", error);
            const response = {
                success: false,
                error: "Failed to update content",
            };
            res.status(500).json(response);
        }
    }
    static deleteContent(req, res) {
        try {
            const { key } = req.params;
            const deleted = database_1.default.deleteContent(key);
            if (!deleted) {
                const response = {
                    success: false,
                    error: `Content with key '${key}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: `Content with key '${key}' deleted successfully`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Delete content error:", error);
            const response = {
                success: false,
                error: "Failed to delete content",
            };
            res.status(500).json(response);
        }
    }
    static deleteContentById(req, res) {
        try {
            const { id } = req.params;
            const numericId = parseInt(id);
            if (isNaN(numericId)) {
                const response = {
                    success: false,
                    error: "Invalid content ID",
                };
                res.status(400).json(response);
                return;
            }
            const deleted = database_1.default.deleteContentById(numericId);
            if (!deleted) {
                const response = {
                    success: false,
                    error: `Content with ID '${id}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: `Content with ID '${id}' deleted successfully`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Delete content by ID error:", error);
            const response = {
                success: false,
                error: "Failed to delete content",
            };
            res.status(500).json(response);
        }
    }
    static getPublicContentByRoute(req, res) {
        try {
            const { route_path, key } = req.params;
            // Find content by key and route path
            const content = database_1.default.getContentByKeyAndRoute(key, route_path);
            if (!content) {
                const response = {
                    success: false,
                    error: `Content with key '${key}' not found in route '${route_path}'`,
                };
                res.status(404).json(response);
                return;
            }
            // Check the route's access level for public endpoints
            const route = database_1.default.getRouteByPath(route_path);
            if (route && route.access_level === "private") {
                const response = {
                    success: false,
                    error: "Access denied",
                };
                res.status(403).json(response);
                return;
            }
            // For public endpoints, return formatted response
            const response = {
                success: true,
                data: content.data,
                message: `Retrieved content for key '${key}' from route '${route_path}'`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get public content by route error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve content",
            };
            res.status(500).json(response);
        }
    }
    static getPublicContent(req, res) {
        try {
            const { key } = req.params;
            const content = database_1.default.getContentByKey(key);
            if (!content) {
                const response = {
                    success: false,
                    error: `Content with key '${key}' not found`,
                };
                res.status(404).json(response);
                return;
            }
            // Check the route's access level for public endpoints
            const route = database_1.default.getRouteByPath(content.route_path);
            if (route && route.access_level === "private") {
                const response = {
                    success: false,
                    error: "Access denied",
                };
                res.status(403).json(response);
                return;
            }
            // For public endpoints, return formatted response
            const response = {
                success: true,
                data: content.data,
                message: `Retrieved content for key '${key}'`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get public content error:", error);
            const response = {
                success: false,
                error: "Failed to retrieve content",
            };
            res.status(500).json(response);
        }
    }
}
exports.ContentController = ContentController;
//# sourceMappingURL=content.js.map