"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const routes_1 = __importDefault(require("./routes"));
const database_service_1 = require("./services/database.service");
const auth_service_1 = require("./services/auth.service");
// Load environment variables
dotenv_1.default.config();
// Initialize services
database_service_1.DatabaseService.getInstance();
const authService = auth_service_1.AuthService.getInstance();
// Create Express app
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || ['http://localhost:3469'];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    exposedHeaders: ['X-Auth-Token']
}));
// Compression
app.use((0, compression_1.default)());
// Request logging
app.use((0, morgan_1.default)(process.env.LOG_FORMAT || 'combined'));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/krapi/v1/', limiter);
// Mount routes
app.use('/krapi/v1', routes_1.default);
// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    if (err.name === 'ValidationError') {
        res.status(400).json({
            success: false,
            error: 'Validation error',
            details: err.details
        });
        return;
    }
    if (err.name === 'UnauthorizedError') {
        res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
        return;
    }
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});
// Start server
const PORT = process.env.PORT || 3470;
const HOST = process.env.HOST || 'localhost';
const server = app.listen(PORT, () => {
    console.log(`🚀 KRAPI Backend v2.0.0 running on http://${HOST}:${PORT}`);
    console.log(`📚 API Base URL: http://${HOST}:${PORT}/krapi/v1`);
    console.log(`🔐 Default admin: ${process.env.DEFAULT_ADMIN_EMAIL} / ${process.env.DEFAULT_ADMIN_PASSWORD}`);
    // Schedule session cleanup
    setInterval(async () => {
        try {
            const cleaned = await authService.cleanupSessions();
            if (cleaned > 0) {
                console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
            }
        }
        catch (error) {
            console.error('Session cleanup error:', error);
        }
    }, 60 * 60 * 1000); // Every hour
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        database_service_1.DatabaseService.getInstance().close();
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        database_service_1.DatabaseService.getInstance().close();
        process.exit(0);
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map