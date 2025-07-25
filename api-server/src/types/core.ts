// Core types for the project-driven Krapi architecture

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: "admin" | "user";
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface LoginRequest {
  username: string;
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
  role: "admin" | "user";
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role?: "admin" | "user";
  active?: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: "admin" | "user";
  active?: boolean;
  password?: string;
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
