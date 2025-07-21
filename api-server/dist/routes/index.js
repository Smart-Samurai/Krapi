"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const api_1 = __importDefault(require("./api"));
const router = (0, express_1.Router)();
// API routes
router.use("/api", api_1.default);
// Root endpoint
router.get("/", (req, res) => {
    res.json({
        message: "API Server is running",
        version: "1.0.0",
        endpoints: {
            health: "/api/health",
            auth: {
                login: "POST /api/auth/login",
                verify: "GET /api/auth/verify",
            },
            projects: {
                list: "GET /api/v2/admin/projects",
                create: "POST /api/v2/admin/projects",
                get: "GET /api/v2/admin/projects/:projectId",
                collections: "GET /api/v2/projects/:projectId/collections",
                documents: "GET /api/v2/projects/:projectId/collections/:collectionId/documents",
            },
        },
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map