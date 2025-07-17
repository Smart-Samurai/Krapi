"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("./database"));
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
class AuthService {
    static generateToken(payload) {
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });
    }
    static verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch {
            return null;
        }
    }
    static async login(username, password) {
        const user = database_1.default.getUserByUsername(username);
        if (!user || !user.active) {
            return null;
        }
        const isValidPassword = bcryptjs_1.default.compareSync(password, user.password);
        if (!isValidPassword) {
            return null;
        }
        const { password: _, ...userWithoutPassword } = user;
        const token = this.generateToken({
            id: user.id,
            userId: user.id,
            uuid: user.uuid,
            username: user.username,
            role: user.role,
            permissions: user.permissions,
        });
        return { user: userWithoutPassword, token };
    }
    static async changePassword(userId, currentPassword, newPassword) {
        const user = database_1.default.getUserById(userId);
        if (!user) {
            return false;
        }
        const isValidPassword = bcryptjs_1.default.compareSync(currentPassword, user.password);
        if (!isValidPassword) {
            return false;
        }
        const hashedNewPassword = bcryptjs_1.default.hashSync(newPassword, 10);
        return database_1.default.updateUserPassword(userId, hashedNewPassword);
    }
    static async createUser(userData) {
        // Check if user already exists
        const existingUser = database_1.default.getUserByUsername(userData.username);
        if (existingUser) {
            return null;
        }
        const hashedPassword = bcryptjs_1.default.hashSync(userData.password, 10);
        // Get default permissions for role
        const rolePermissions = this.getDefaultPermissionsForRole(userData.role || "viewer");
        const user = database_1.default.createUser({
            username: userData.username,
            password: hashedPassword,
            email: userData.email,
            role: userData.role || "viewer",
            permissions: userData.permissions || rolePermissions,
            active: true,
        });
        if (!user) {
            return null;
        }
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    static getDefaultPermissionsForRole(role) {
        switch (role) {
            case "admin":
                return [
                    "read",
                    "write",
                    "delete",
                    "manage_users",
                    "manage_files",
                    "manage_routes",
                ];
            case "editor":
                return ["read", "write", "manage_files"];
            case "viewer":
            default:
                return ["read"];
        }
    }
    static async getAllUsers() {
        const users = database_1.default.getAllUsers();
        return users.map((user) => {
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.js.map