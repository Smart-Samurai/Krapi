"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requirePermission = exports.authenticateToken = void 0;
const auth_1 = require("../services/auth");
const database_1 = __importDefault(require("../services/database"));
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
    if (!token) {
        const response = {
            success: false,
            error: "Access token required",
        };
        res.status(401).json(response);
        return;
    }
    const payload = auth_1.AuthService.verifyToken(token);
    if (!payload) {
        const response = {
            success: false,
            error: "Invalid or expired token",
        };
        res.status(403).json(response);
        return;
    }
    // Get full user details including permissions
    const user = database_1.default.getUserById(payload.userId);
    if (!user || !user.active) {
        const response = {
            success: false,
            error: "User not found or inactive",
        };
        res.status(403).json(response);
        return;
    }
    req.user = {
        userId: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
    };
    next();
};
exports.authenticateToken = authenticateToken;
// Permission checking middleware
const requirePermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.user) {
            const response = {
                success: false,
                error: "Authentication required",
            };
            res.status(401).json(response);
            return;
        }
        if (!req.user.permissions.includes(requiredPermission) &&
            req.user.role !== "admin") {
            const response = {
                success: false,
                error: `Insufficient permissions. Required: ${requiredPermission}`,
            };
            res.status(403).json(response);
            return;
        }
        next();
    };
};
exports.requirePermission = requirePermission;
// Role checking middleware
const requireRole = (requiredRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            const response = {
                success: false,
                error: "Authentication required",
            };
            res.status(401).json(response);
            return;
        }
        if (!requiredRoles.includes(req.user.role)) {
            const response = {
                success: false,
                error: `Insufficient role. Required one of: ${requiredRoles.join(", ")}`,
            };
            res.status(403).json(response);
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.js.map