/**
 * Authentication Feature Types
 * 
 * This file contains all TypeScript interfaces and types
 * specific to the authentication functionality.
 */

import { ApiResponse } from "../../../types";

/**
 * User authentication credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * User registration data
 */
export interface RegisterUserData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * JWT token payload
 */
export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

/**
 * Authentication result
 */
export interface AuthResult {
  token: string;
  user: AuthUser;
  expiresAt: string;
}

/**
 * Authenticated user information
 */
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  firstName?: string;
  lastName?: string;
  avatar?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Login attempt log
 */
export interface LoginLog {
  id: string;
  username: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  location?: string;
  failureReason?: string;
  timestamp: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset data
 */
export interface PasswordResetData {
  token: string;
  newPassword: string;
}

/**
 * Session information
 */
export interface SessionInfo {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
}

/**
 * API Responses
 */
export interface LoginResponse extends ApiResponse<AuthResult> {}

export interface RegisterResponse extends ApiResponse<AuthUser> {}

export interface ProfileResponse extends ApiResponse<AuthUser> {}

export interface LogoutResponse extends ApiResponse<{ message: string }> {}

export interface PasswordResetResponse extends ApiResponse<{ message: string }> {}

/**
 * Authentication errors
 */
export enum AuthError {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS",
  INVALID_TOKEN = "INVALID_TOKEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  PASSWORD_TOO_WEAK = "PASSWORD_TOO_WEAK",
  INVALID_RESET_TOKEN = "INVALID_RESET_TOKEN"
}

/**
 * Permission levels
 */
export enum Permission {
  // User management
  USERS_READ = "users.read",
  USERS_WRITE = "users.write",
  USERS_DELETE = "users.delete",
  
  // Content management
  CONTENT_READ = "content.read",
  CONTENT_WRITE = "content.write",
  CONTENT_DELETE = "content.delete",
  
  // Route management
  ROUTES_READ = "routes.read",
  ROUTES_WRITE = "routes.write",
  ROUTES_DELETE = "routes.delete",
  
  // System administration
  ADMIN_PANEL = "admin.panel",
  SYSTEM_CONFIG = "system.config",
  
  // File management
  FILES_READ = "files.read",
  FILES_WRITE = "files.write",
  FILES_DELETE = "files.delete"
}

/**
 * User roles
 */
export enum UserRole {
  ADMIN = "admin",
  EDITOR = "editor",
  VIEWER = "viewer",
  GUEST = "guest"
}