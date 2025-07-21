/**
 * Authentication API Client
 *
 * This module handles all API calls related to authentication functionality.
 * It provides a clean interface for the frontend components to interact with
 * the authentication backend services.
 */

import axios from "axios";

// Use environment variable or fallback to localhost
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3470/api";

// Create axios instance specifically for auth
const authAxios = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: false,
});

// Request interceptor to add auth token (except for login)
authAxios.interceptors.request.use((config) => {
  // Only add token if we're in a browser environment and not for login endpoint
  if (typeof window !== "undefined" && !config.url?.includes("/login")) {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle auth errors
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Auth API Error:", error.message);

    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        // Only redirect if not already on login page
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Authentication API interface types
 */
export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

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

export interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: AuthUser;
    expiresAt: string;
  };
  error?: string;
  message?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

/**
 * Authentication API Client
 */
export const authenticationAPI = {
  /**
   * User login
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
      const response = await authAxios.post("/login", credentials);

      // Store token in localStorage if login successful
      if (response.data.success && response.data.data?.token) {
        localStorage.setItem("auth_token", response.data.data.token);
      }

      return response.data;
    } catch (error: any) {
      console.error("Login error:", error);
      throw {
        success: false,
        error: error.response?.data?.error || "Login failed",
      };
    }
  },

  /**
   * User logout
   */
  logout: async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await authAxios.post("/logout");

      // Remove token from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
      }

      return response.data;
    } catch (error: any) {
      console.error("Logout error:", error);

      // Still remove token even if API call fails
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
      }

      return { success: true, message: "Logged out locally" };
    }
  },

  /**
   * Verify token and get current user
   */
  verify: async (): Promise<{
    success: boolean;
    data?: AuthUser;
    error?: string;
  }> => {
    try {
      const response = await authAxios.get("/verify");
      return response.data;
    } catch (error: any) {
      console.error("Token verification error:", error);
      throw {
        success: false,
        error: error.response?.data?.error || "Token verification failed",
      };
    }
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<{
    success: boolean;
    data?: AuthUser;
    error?: string;
  }> => {
    try {
      const response = await authAxios.get("/profile");
      return response.data;
    } catch (error: any) {
      console.error("Get profile error:", error);
      throw {
        success: false,
        error: error.response?.data?.error || "Failed to get profile",
      };
    }
  },

  /**
   * Change user password
   */
  changePassword: async (
    data: ChangePasswordData
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const response = await authAxios.put("/password", data);
      return response.data;
    } catch (error: any) {
      console.error("Change password error:", error);
      throw {
        success: false,
        error: error.response?.data?.error || "Failed to change password",
      };
    }
  },

  /**
   * Check authentication service health
   */
  healthCheck: async (): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> => {
    try {
      const response = await authAxios.get("/health");
      return response.data;
    } catch (error: any) {
      console.error("Auth health check error:", error);
      throw {
        success: false,
        error:
          error.response?.data?.error || "Authentication service unavailable",
      };
    }
  },

  /**
   * Check if user is authenticated (has valid token)
   */
  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("auth_token");
    return !!token;
  },

  /**
   * Get stored authentication token
   */
  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  },

  /**
   * Remove authentication token
   */
  removeToken: (): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  },
};

export default authenticationAPI;
