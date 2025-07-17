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
            admin: {
                getAllContent: "GET /api/admin/content",
                getContent: "GET /api/admin/content/:key",
                createContent: "POST /api/admin/content",
                updateContent: "PUT /api/admin/content/:key",
                deleteContent: "DELETE /api/admin/content/:key",
            },
            public: {
                getContent: "GET /api/content/:key",
            },
        },
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map