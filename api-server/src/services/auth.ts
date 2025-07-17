import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { AuthPayload, User } from "../types";
import database from "./database";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "24h";

export class AuthService {
  static generateToken(payload: AuthPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });
  }

  static verifyToken(token: string): AuthPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch {
      return null;
    }
  }

  static async login(
    username: string,
    password: string
  ): Promise<{ user: Omit<User, "password">; token: string } | null> {
    const user = database.getUserByUsername(username);

    if (!user || !user.active) {
      return null;
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);

    if (!isValidPassword) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = this.generateToken({
      id: user.id!,
      userId: user.id!,
      uuid: user.uuid!,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    });

    return { user: userWithoutPassword, token };
  }

  static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = database.getUserById(userId);

    if (!user) {
      return false;
    }

    const isValidPassword = bcrypt.compareSync(currentPassword, user.password);

    if (!isValidPassword) {
      return false;
    }

    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
    return database.updateUserPassword(userId, hashedNewPassword);
  }

  static async createUser(userData: {
    username: string;
    password: string;
    email?: string;
    role?: "admin" | "editor" | "viewer";
    permissions?: string[];
  }): Promise<Omit<User, "password"> | null> {
    // Check if user already exists
    const existingUser = database.getUserByUsername(userData.username);
    if (existingUser) {
      return null;
    }

    const hashedPassword = bcrypt.hashSync(userData.password, 10);

    // Get default permissions for role
    const rolePermissions = this.getDefaultPermissionsForRole(
      userData.role || "viewer"
    );

    const user = database.createUser({
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

  private static getDefaultPermissionsForRole(role: string): string[] {
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

  static async getAllUsers(): Promise<Omit<User, "password">[]> {
    const users = database.getAllUsers();
    return users.map((user) => {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }
}
