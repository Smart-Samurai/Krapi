"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_1 = require("../services/auth");
const core_database_1 = __importDefault(require("../services/core-database"));
const coreDatabase = new core_database_1.default();
class AuthController {
    static async login(req, res) {
        try {
            console.log("🔐 AuthController: Login request received");
            console.log("🔐 AuthController: Request body:", {
                username: req.body.username ? "present" : "missing",
                password: req.body.password ? "present" : "missing",
            });
            const { email, password } = req.body;
            if (!email || !password) {
                console.log("🔐 AuthController: Missing email or password");
                const response = {
                    success: false,
                    error: "Email and password are required",
                };
                res.status(400).json(response);
                return;
            }
            console.log("🔐 AuthController: Calling AuthService.login");
            const result = await auth_1.AuthService.login(email, password);
            console.log("🔐 AuthController: AuthService result:", result ? "success" : "failed");
            // Log the login attempt
            coreDatabase.createLoginLog({
                username: email, // Use email as username for logging
                ip_address: req.ip || req.connection.remoteAddress || "unknown",
                user_agent: req.headers["user-agent"],
                success: !!result,
                location: "Local Network", // In a real app, you'd geolocate this
                failure_reason: result ? undefined : "Invalid credentials",
            });
            if (!result) {
                console.log("🔐 AuthController: Login failed - invalid credentials");
                const response = {
                    success: false,
                    error: "Invalid username or password",
                };
                res.status(401).json(response);
                return;
            }
            console.log("🔐 AuthController: Login successful, sending response");
            const response = {
                success: true,
                token: result.token,
                user: result.user,
            };
            console.log("🔐 AuthController: Response:", response);
            res.json(response);
        }
        catch (error) {
            console.error("Login error:", error);
            const response = {
                success: false,
                error: "Internal server error",
            };
            res.status(500).json(response);
        }
    }
    static async verify(req, res) {
        // This endpoint is protected by auth middleware, so if we get here, token is valid
        const user = req.user;
        // Get the full user details from database
        const fullUser = coreDatabase.getUserById(user?.id || 0);
        if (!fullUser) {
            const response = {
                success: false,
                error: "User not found",
            };
            res.status(404).json(response);
            return;
        }
        // Transform to match frontend User interface
        const userResponse = {
            id: fullUser.id,
            username: fullUser.username,
            email: fullUser.email,
            role: fullUser.role,
            active: fullUser.active,
            created_at: fullUser.created_at,
            updated_at: fullUser.updated_at,
            last_login: fullUser.last_login,
        };
        const response = {
            success: true,
            data: userResponse,
        };
        res.json(response);
    }
    static async getAllUsers(req, res) {
        try {
            // Check if user is admin
            if (req.user?.role !== "admin") {
                const response = {
                    success: false,
                    error: "Admin access required",
                };
                res.status(403).json(response);
                return;
            }
            const users = coreDatabase.getAllUsers();
            // Remove password hashes from response
            const safeUsers = users.map((user) => ({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                active: user.active,
                created_at: user.created_at,
                updated_at: user.updated_at,
                last_login: user.last_login,
            }));
            const response = {
                success: true,
                data: safeUsers,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get all users error:", error);
            const response = {
                success: false,
                error: "Internal server error",
            };
            res.status(500).json(response);
        }
    }
    static async getLoginLogs(req, res) {
        try {
            // Check if user is admin
            if (req.user?.role !== "admin") {
                const response = {
                    success: false,
                    error: "Admin access required",
                };
                res.status(403).json(response);
                return;
            }
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const logs = coreDatabase.getLoginLogs(page, limit);
            const response = {
                success: true,
                data: logs,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get login logs error:", error);
            const response = {
                success: false,
                error: "Internal server error",
            };
            res.status(500).json(response);
        }
    }
    static async getDatabaseStats(req, res) {
        try {
            // Check if user is admin
            if (req.user?.role !== "admin") {
                const response = {
                    success: false,
                    error: "Admin access required",
                };
                res.status(403).json(response);
                return;
            }
            const stats = coreDatabase.getDatabaseStats();
            const response = {
                success: true,
                data: stats,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get database stats error:", error);
            const response = {
                success: false,
                error: "Internal server error",
            };
            res.status(500).json(response);
        }
    }
    static async createUser(req, res) {
        try {
            // Check if user is admin
            if (req.user?.role !== "admin") {
                const response = {
                    success: false,
                    error: "Admin access required",
                };
                res.status(403).json(response);
                return;
            }
            const { email, firstName, lastName, password, role = "admin", permissions, } = req.body;
            if (!email || !firstName || !lastName || !password) {
                const response = {
                    success: false,
                    error: "Email, first name, last name, and password are required",
                };
                res.status(400).json(response);
                return;
            }
            const user = await auth_1.AuthService.createUser({
                email,
                firstName,
                lastName,
                password,
                role: role,
                active: true,
                permissions,
            });
            if (!user) {
                const response = {
                    success: false,
                    error: "User already exists or creation failed",
                };
                res.status(400).json(response);
                return;
            }
            const response = {
                success: true,
                data: user,
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error("Create user error:", error);
            const response = {
                success: false,
                error: "Internal server error",
            };
            res.status(500).json(response);
        }
    }
    static async getUserById(req, res) {
        try {
            // Check if user is admin
            if (req.user?.role !== "admin") {
                const response = {
                    success: false,
                    error: "Admin access required",
                };
                res.status(403).json(response);
                return;
            }
            const userId = parseInt(req.params.id || req.body.userId || req.body.id);
            const user = coreDatabase.getUserById(userId);
            if (!user) {
                const response = {
                    success: false,
                    error: "User not found",
                };
                res.status(404).json(response);
                return;
            }
            // Remove password hash from response
            const { password_hash: _, ...safeUser } = user;
            const response = {
                success: true,
                data: safeUser,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Get user by ID error:", error);
            const response = {
                success: false,
                error: "Internal server error",
            };
            res.status(500).json(response);
        }
    }
    static async updateUser(req, res) {
        try {
            // Check if user is admin
            if (req.user?.role !== "admin") {
                const response = {
                    success: false,
                    error: "Admin access required",
                };
                res.status(403).json(response);
                return;
            }
            const userId = parseInt(req.params.id || req.body.userId || req.body.id);
            const { username, email, role, active } = req.body;
            const user = coreDatabase.getUserById(userId);
            if (!user) {
                const response = {
                    success: false,
                    error: "User not found",
                };
                res.status(404).json(response);
                return;
            }
            const updatedUser = coreDatabase.updateUser(userId, {
                username: username || user.username,
                email: email || user.email,
                role: role || user.role,
                active: active !== undefined ? active : user.active,
            });
            if (!updatedUser) {
                const response = {
                    success: false,
                    error: "Failed to update user",
                };
                res.status(500).json(response);
                return;
            }
            // Remove password hash from response
            const { password_hash: _, ...safeUser } = updatedUser;
            const response = {
                success: true,
                data: safeUser,
            };
            res.json(response);
        }
        catch (error) {
            console.error("Update user error:", error);
            const response = {
                success: false,
                error: "Internal server error",
            };
            res.status(500).json(response);
        }
    }
    static async deleteUser(req, res) {
        try {
            // Check if user is admin
            if (req.user?.role !== "admin") {
                const response = {
                    success: false,
                    error: "Admin access required",
                };
                res.status(403).json(response);
                return;
            }
            const userId = parseInt(req.params.id || req.body.userId || req.body.id);
            // Prevent admin from deleting themselves
            if (userId === req.user?.id) {
                const response = {
                    success: false,
                    error: "Cannot delete your own account",
                };
                res.status(400).json(response);
                return;
            }
            const success = coreDatabase.deleteUser(userId);
            if (!success) {
                const response = {
                    success: false,
                    error: "User not found or deletion failed",
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: "User deleted successfully",
            };
            res.json(response);
        }
        catch (error) {
            console.error("Delete user error:", error);
            const response = {
                success: false,
                error: "Internal server error",
            };
            res.status(500).json(response);
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.js.map