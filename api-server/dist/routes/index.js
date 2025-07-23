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
        message: "Krapi API Server is running",
        version: "1.0.0",
        documentation: "See UNIFIED_API_DOCUMENTATION.md for the new API structure",
        endpoints: {
            // Legacy API (deprecated - will be removed)
            legacy: "/api/*",
            // New Unified API (recommended)
            unified: {
                base: "/krapi/v1",
                health: "GET /krapi/v1/health",
                auth: "POST /krapi/v1/auth",
                api: "POST /krapi/v1/api (all operations)",
            },
        },
        note: "The old API endpoints are deprecated. Please use the new unified API at /krapi/v1",
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map