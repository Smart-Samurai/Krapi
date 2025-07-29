"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const admin_routes_1 = __importDefault(require("./admin.routes"));
const project_routes_1 = __importDefault(require("./project.routes"));
const database_routes_1 = __importDefault(require("./database.routes"));
const storage_routes_1 = __importDefault(require("./storage.routes"));
const router = (0, express_1.Router)();
// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'KRAPI Backend is running',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});
// API version info
router.get('/version', (req, res) => {
    res.json({
        success: true,
        data: {
            version: '2.0.0',
            api: 'KRAPI',
            documentation: '/docs'
        }
    });
});
// Mount route modules
router.use('/auth', auth_routes_1.default);
router.use('/admin', admin_routes_1.default);
router.use('/projects', project_routes_1.default);
router.use('/database', database_routes_1.default);
router.use('/storage', storage_routes_1.default);
// 404 handler
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map