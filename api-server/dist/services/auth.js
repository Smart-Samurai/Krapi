"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const core_database_1 = __importDefault(require("./core-database"));
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const coreDatabase = new core_database_1.default();
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
    static async login(email, password) {
        const user = coreDatabase.getUserByEmail(email);
        if (!user || !user.active) {
            return null;
        }
        const isValidPassword = bcryptjs_1.default.compareSync(password, user.password_hash);
        if (!isValidPassword) {
            return null;
        }
        const { password_hash: _, ...userWithoutPassword } = user;
        const token = this.generateToken({
            id: user.id,
            username: user.username,
            role: user.role,
        });
        return { user: userWithoutPassword, token };
    }
    static async createUser(userData) {
        // Check if user already exists
        const existingUser = coreDatabase.getUserByEmail(userData.email);
        if (existingUser) {
            return null;
        }
        const hashedPassword = bcryptjs_1.default.hashSync(userData.password, 10);
        const user = coreDatabase.createUser({
            username: userData.email, // Use email as username for now
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            password_hash: hashedPassword,
            role: userData.role || "admin",
            active: userData.active !== false,
            permissions: userData.permissions || {},
        });
        if (!user) {
            return null;
        }
        const { password_hash: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    static async getAllUsers() {
        const users = coreDatabase.getAllUsers();
        return users.map((user) => {
            const { password_hash: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.js.map