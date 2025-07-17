/**
 * Authentication Service
 * 
 * This service handles all authentication-related business logic including
 * user login, registration, token management, and session handling.
 * It's designed to be self-contained and easily testable.
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import DatabaseConnection from "../../../shared/database/connection";
import { validateEmail, validatePassword, validateUsername } from "../../../shared/utils/validation";
import {
  LoginCredentials,
  RegisterUserData,
  AuthResult,
  AuthUser,
  TokenPayload,
  LoginLog,
  SessionInfo,
  AuthError
} from "../types";

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || "default-secret-change-in-production";
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
  private static readonly SALT_ROUNDS = 12;
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

  /**
   * Authenticate user with username and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResult | null> {
    const { username, password, rememberMe } = credentials;

    try {
      // Check if account is locked
      if (await this.isAccountLocked(username)) {
        throw new Error(AuthError.ACCOUNT_LOCKED);
      }

      // Get user from database
      const user = await this.getUserByUsername(username);
      if (!user) {
        await this.recordFailedLogin(username, "User not found");
        return null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        await this.recordFailedLogin(username, "Invalid password");
        return null;
      }

      // Generate JWT token
      const expiresIn = rememberMe ? "30d" : this.JWT_EXPIRES_IN;
      const token = this.generateToken(user, expiresIn);
      
      // Update last login
      await this.updateLastLogin(user.id);
      
      // Clear failed login attempts
      await this.clearFailedLoginAttempts(username);
      
      // Record successful login
      await this.recordSuccessfulLogin(username);

      // Create session
      const session = await this.createSession(user.id, token);

      return {
        token,
        user: this.formatUserResponse(user),
        expiresAt: session.expiresAt
      };

    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  /**
   * Register a new user
   */
  static async register(userData: RegisterUserData): Promise<AuthUser> {
    const { username, email, password, firstName, lastName } = userData;

    // Validate input
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      throw new Error(usernameValidation.error);
    }

    if (!validateEmail(email)) {
      throw new Error("Invalid email format");
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(", "));
    }

    // Check if user already exists
    const existingUser = await this.getUserByUsername(username);
    if (existingUser) {
      throw new Error(AuthError.USER_ALREADY_EXISTS);
    }

    const existingEmail = await this.getUserByEmail(email);
    if (existingEmail) {
      throw new Error("Email already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create user
    const userId = randomUUID();
    const now = new Date().toISOString();

    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare(`
      INSERT INTO users (
        id, username, email, password, role, first_name, last_name, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      username,
      email,
      hashedPassword,
      "viewer", // Default role
      firstName || null,
      lastName || null,
      now,
      now
    );

    const newUser = await this.getUserById(userId);
    if (!newUser) {
      throw new Error("Failed to create user");
    }

    return this.formatUserResponse(newUser);
  }

  /**
   * Verify JWT token and get user information
   */
  static async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      
      // Check if session is still valid
      const session = await this.getSessionByToken(token);
      if (!session) {
        return null;
      }

      // Get current user data
      const user = await this.getUserById(decoded.userId);
      if (!user) {
        return null;
      }

      // Update last activity
      await this.updateSessionActivity(session.id);

      return this.formatUserResponse(user);
    } catch (error) {
      console.error("Token verification error:", error);
      return null;
    }
  }

  /**
   * Logout user and invalidate session
   */
  static async logout(token: string): Promise<boolean> {
    try {
      const session = await this.getSessionByToken(token);
      if (session) {
        await this.deleteSession(session.id);
      }
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error(AuthError.USER_NOT_FOUND);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(", "));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Update password
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare(`
      UPDATE users 
      SET password = ?, updated_at = ? 
      WHERE id = ?
    `);

    stmt.run(hashedPassword, new Date().toISOString(), userId);

    // Invalidate all sessions for this user (force re-login)
    await this.deleteAllUserSessions(userId);

    return true;
  }

  // Private helper methods

  private static async getUserByUsername(username: string): Promise<any> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
    return stmt.get(username);
  }

  private static async getUserByEmail(email: string): Promise<any> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
    return stmt.get(email);
  }

  private static async getUserById(userId: string): Promise<any> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
    return stmt.get(userId);
  }

  private static generateToken(user: any, expiresIn: string = this.JWT_EXPIRES_IN): string {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: this.getUserPermissions(user.role)
    };

    return jwt.sign(payload, this.JWT_SECRET, { expiresIn });
  }

  private static getUserPermissions(role: string): string[] {
    const permissions: Record<string, string[]> = {
      admin: [
        "users.read", "users.write", "users.delete",
        "content.read", "content.write", "content.delete",
        "routes.read", "routes.write", "routes.delete",
        "files.read", "files.write", "files.delete",
        "admin.panel", "system.config"
      ],
      editor: [
        "content.read", "content.write",
        "routes.read", "routes.write",
        "files.read", "files.write"
      ],
      viewer: [
        "content.read",
        "routes.read",
        "files.read"
      ]
    };

    return permissions[role] || [];
  }

  private static formatUserResponse(user: any): AuthUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: this.getUserPermissions(user.role),
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.avatar,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  private static async updateLastLogin(userId: string): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare("UPDATE users SET last_login = ? WHERE id = ?");
    stmt.run(new Date().toISOString(), userId);
  }

  private static async createSession(userId: string, token: string): Promise<SessionInfo> {
    const sessionId = randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare(`
      INSERT INTO user_sessions (id, user_id, token, created_at, expires_at, last_activity)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(sessionId, userId, token, now, expiresAt, now);

    return {
      id: sessionId,
      userId,
      token,
      ipAddress: "",
      userAgent: "",
      createdAt: now,
      expiresAt,
      lastActivity: now
    };
  }

  private static async getSessionByToken(token: string): Promise<SessionInfo | null> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare("SELECT * FROM user_sessions WHERE token = ? AND expires_at > ?");
    const session = stmt.get(token, new Date().toISOString());
    return session || null;
  }

  private static async updateSessionActivity(sessionId: string): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare("UPDATE user_sessions SET last_activity = ? WHERE id = ?");
    stmt.run(new Date().toISOString(), sessionId);
  }

  private static async deleteSession(sessionId: string): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare("DELETE FROM user_sessions WHERE id = ?");
    stmt.run(sessionId);
  }

  private static async deleteAllUserSessions(userId: string): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare("DELETE FROM user_sessions WHERE user_id = ?");
    stmt.run(userId);
  }

  private static async isAccountLocked(username: string): Promise<boolean> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare(`
      SELECT COUNT(*) as attempts, MAX(created_at) as last_attempt
      FROM login_logs 
      WHERE username = ? AND success = 0 AND created_at > ?
    `);
    
    const lockoutThreshold = new Date(Date.now() - this.LOCKOUT_TIME).toISOString();
    const result = stmt.get(username, lockoutThreshold) as any;
    
    return result.attempts >= this.MAX_LOGIN_ATTEMPTS;
  }

  private static async recordFailedLogin(username: string, reason: string): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare(`
      INSERT INTO login_logs (id, username, success, failure_reason, created_at)
      VALUES (?, ?, 0, ?, ?)
    `);
    stmt.run(randomUUID(), username, reason, new Date().toISOString());
  }

  private static async recordSuccessfulLogin(username: string): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare(`
      INSERT INTO login_logs (id, username, success, created_at)
      VALUES (?, ?, 1, ?)
    `);
    stmt.run(randomUUID(), username, new Date().toISOString());
  }

  private static async clearFailedLoginAttempts(username: string): Promise<void> {
    const db = DatabaseConnection.getInstance();
    const stmt = db.prepare("DELETE FROM login_logs WHERE username = ? AND success = 0");
    stmt.run(username);
  }
}