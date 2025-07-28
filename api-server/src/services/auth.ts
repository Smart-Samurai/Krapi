import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { AuthPayload, User } from "../types/core";
import CoreDatabaseService from "./core-database";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-key-change-in-production";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "24h";

const coreDatabase = new CoreDatabaseService();

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
    email: string,
    password: string
  ): Promise<{ user: Omit<User, "password_hash">; token: string } | null> {
    const user = coreDatabase.getUserByEmail(email);

    if (!user || !user.active) {
      return null;
    }

    const isValidPassword = bcrypt.compareSync(password, user.password_hash);

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

  static async createUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role?: "master_admin" | "admin" | "project_admin" | "limited_admin";
    active?: boolean;
    permissions?: Record<string, boolean>;
  }): Promise<Omit<User, "password_hash"> | null> {
    // Check if user already exists
    const existingUser = coreDatabase.getUserByEmail(userData.email);
    if (existingUser) {
      return null;
    }

    const hashedPassword = bcrypt.hashSync(userData.password, 10);

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

  static async getAllUsers(): Promise<Omit<User, "password_hash">[]> {
    const users = coreDatabase.getAllUsers();
    return users.map((user) => {
      const { password_hash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }
}
