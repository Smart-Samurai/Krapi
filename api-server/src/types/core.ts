// Core types for the project-driven Krapi architecture

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  password_hash: string;
  role: "master_admin" | "admin" | "project_admin" | "limited_admin" | "user";
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  permissions?: Record<string, boolean>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: Omit<User, "password_hash">;
  error?: string;
}

export interface AuthPayload {
  id: number;
  username: string;
  role: "master_admin" | "admin" | "project_admin" | "limited_admin" | "user";
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: "master_admin" | "admin" | "project_admin" | "limited_admin" | "user";
  active?: boolean;
  permissions?: Record<string, boolean>;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: "master_admin" | "admin" | "project_admin" | "limited_admin" | "user";
  active?: boolean;
  password?: string;
  permissions?: Record<string, boolean>;
}

export interface LoginLog {
  id: number;
  username: string;
  ip_address: string;
  user_agent?: string;
  success: boolean;
  timestamp: string;
  location?: string;
  failure_reason?: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
  category: string;
  encrypted: boolean;
  created_at: string;
  updated_at: string;
}

export interface HealthStatus {
  status: string;
  uptime: number;
  version: string;
  timestamp: string;
}

export interface DatabaseStats {
  users: number;
  loginLogs: number;
  systemSettings: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Unified API types
export interface UnifiedApiRequest {
  operation: string;
  resource: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface UnifiedApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
