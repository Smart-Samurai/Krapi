"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const core_database_1 = __importDefault(require("../services/core-database"));
const coreDatabase = new core_database_1.default();
class UsersController {
    // Get all admin users
    static async getAllUsers(req, res) {
        try {
            const users = coreDatabase.getAllUsers();
            // Filter to only show admin users (master_admin, admin, project_admin, limited_admin)
            const adminUsers = users.filter((user) => user.role === "master_admin" ||
                user.role === "admin" ||
                user.role === "project_admin" ||
                user.role === "limited_admin");
            const response = {
                success: true,
                data: adminUsers,
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error("❌ UsersController.getAllUsers error:", error);
            const response = {
                success: false,
                error: "Failed to fetch admin users",
            };
            res.status(500).json(response);
        }
    }
    // Get user by ID
    static async getUserById(req, res) {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                const response = {
                    success: false,
                    error: "Invalid user ID",
                };
                res.status(400).json(response);
                return;
            }
            const user = coreDatabase.getUserById(userId);
            if (!user) {
                const response = {
                    success: false,
                    error: "User not found",
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: user,
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error("❌ UsersController.getUserById error:", error);
            const response = {
                success: false,
                error: "Failed to fetch user",
            };
            res.status(500).json(response);
        }
    }
    // Get admin user stats
    static async getAdminStats(req, res) {
        try {
            const users = coreDatabase.getAllUsers();
            // Filter to only admin users
            const adminUsers = users.filter((user) => user.role === "master_admin" ||
                user.role === "admin" ||
                user.role === "project_admin" ||
                user.role === "limited_admin");
            const stats = {
                total: adminUsers.length,
                active: adminUsers.filter((u) => u.active).length,
                masterAdmins: adminUsers.filter((u) => u.role === "master_admin")
                    .length,
                inactive: adminUsers.filter((u) => !u.active).length,
            };
            const response = {
                success: true,
                data: stats,
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error("❌ UsersController.getAdminStats error:", error);
            const response = {
                success: false,
                error: "Failed to fetch admin stats",
            };
            res.status(500).json(response);
        }
    }
}
exports.UsersController = UsersController;
//# sourceMappingURL=users.js.map