"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const database_1 = __importDefault(require("../services/database"));
class SearchController {
    static async searchAll(req, res) {
        const startTime = Date.now();
        try {
            const { q: query, limit = 20 } = req.query;
            if (!query || typeof query !== "string" || query.trim().length < 2) {
                const response = {
                    success: false,
                    error: "Search query must be at least 2 characters long",
                };
                res.status(400).json(response);
                return;
            }
            const searchTerm = query.trim();
            const searchLimit = Math.min(parseInt(limit) || 20, 100);
            // Use the database search method
            const rawResults = database_1.default.search(searchTerm, searchLimit);
            // Transform results to our SearchResult format
            const results = rawResults.map((item, index) => {
                let url = "/dashboard";
                const metadata = {};
                switch (item.type) {
                    case "content":
                        url = `/dashboard/content?key=${item.title}`;
                        metadata.route_path = item.route_path;
                        metadata.content_type = item.content_type;
                        break;
                    case "route":
                        url = `/dashboard/routes-content?route=${item.path}`;
                        metadata.path = item.path;
                        metadata.access_level = item.access_level;
                        break;
                    case "user":
                        url = `/dashboard/users?user=${item.id}`;
                        metadata.role = item.role;
                        break;
                    case "file":
                        url = `/dashboard/files?file=${item.id}`;
                        metadata.filename = item.filename;
                        metadata.size = item.size;
                        break;
                }
                return {
                    type: item.type,
                    id: item.id,
                    title: item.title,
                    description: item.description || "",
                    url,
                    metadata,
                    relevance: rawResults.length - index, // Simple relevance based on order
                };
            });
            const took = Date.now() - startTime;
            const response = {
                success: true,
                data: {
                    results,
                    total: results.length,
                    query: query,
                    took,
                },
                message: `Found ${results.length} results`,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Search error:", error);
            const response = {
                success: false,
                error: "Search failed",
            };
            res.status(500).json(response);
        }
    }
}
exports.SearchController = SearchController;
//# sourceMappingURL=search.js.map