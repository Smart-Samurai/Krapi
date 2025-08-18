/**
 * Auth HTTP Client for KRAPI SDK
 *
 * HTTP-based authentication methods for frontend apps
 */

import {
  Session,
  LoginResponse,
  ApiKeyAuthRequest,
  ApiKeyAuthResponse,
  PasswordChangeRequest,
  PasswordResetRequest,
} from "../auth-service";
import { ApiResponse } from "../core";

import { BaseHttpClient } from "./base-http-client";

export class AuthHttpClient extends BaseHttpClient {
  // Constructor inherited from BaseHttpClient

  // Admin Authentication
  async adminLogin(credentials: {
    username: string;
    password: string;
    remember_me?: boolean;
  }): Promise<ApiResponse<LoginResponse>> {
    const response = await this.post<LoginResponse>(
      "/auth/admin/login",
      credentials
    );

    // Auto-set session token if provided
    if (response.data?.token) {
      this.setSessionToken(response.data.token);
    }

    return response;
  }

  async adminApiLogin(
    request: ApiKeyAuthRequest
  ): Promise<ApiResponse<ApiKeyAuthResponse>> {
    const response = await this.post<ApiKeyAuthResponse>(
      "/auth/admin/api-login",
      request
    );

    // Auto-set session token if provided
    if (response.data?.token) {
      this.setSessionToken(response.data.token);
    }

    return response;
  }

  // Project User Authentication
  async projectLogin(
    projectId: string,
    credentials: {
      email: string;
      password: string;
      remember_me?: boolean;
    }
  ): Promise<ApiResponse<LoginResponse>> {
    const response = await this.post<LoginResponse>(
      `/auth/projects/${projectId}/login`,
      credentials
    );

    // Auto-set session token if provided
    if (response.data?.token) {
      this.setSessionToken(response.data.token);
    }

    return response;
  }

  async projectApiLogin(
    projectId: string,
    request: ApiKeyAuthRequest
  ): Promise<ApiResponse<ApiKeyAuthResponse>> {
    const response = await this.post<ApiKeyAuthResponse>(
      `/auth/projects/${projectId}/api-login`,
      request
    );

    // Auto-set session token if provided
    if (response.data?.token) {
      this.setSessionToken(response.data.token);
    }

    return response;
  }

  // Session Management
  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    const response = await this.post<{ success: boolean }>("/auth/logout");
    this.clearAuth(); // Clear local auth state
    return response;
  }

  async getCurrentSession(): Promise<ApiResponse<Session>> {
    return this.get<Session>("/auth/me");
  }

  async refreshSession(): Promise<
    ApiResponse<{ session_token: string; expires_at: string }>
  > {
    const response = await this.post<{
      session_token: string;
      expires_at: string;
    }>("/auth/refresh");

    // Auto-set new session token
    if (response.data?.session_token) {
      this.setSessionToken(response.data.session_token);
    }

    return response;
  }

  async createSession(apiKey: string): Promise<
    ApiResponse<{
      session_token: string;
      expires_at: string;
      user_type: "admin" | "project";
      scopes: string[];
    }>
  > {
    return this.post<{
      session_token: string;
      expires_at: string;
      user_type: "admin" | "project";
      scopes: string[];
    }>("/auth/sessions", {
      api_key: apiKey,
    });
  }

  async revokeSession(
    sessionId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(`/auth/sessions/${sessionId}`);
  }

  async revokeAllSessions(): Promise<
    ApiResponse<{ success: boolean; revoked_count: number }>
  > {
    return this.post<{ success: boolean; revoked_count: number }>(
      "/auth/revoke-all"
    );
  }

  // Password Management
  async changePassword(
    userId: string,
    userType: "admin" | "project",
    passwordData: PasswordChangeRequest
  ): Promise<ApiResponse<{ success: boolean }>> {
    const endpoint =
      userType === "admin"
        ? `/auth/change-password`
        : `/auth/users/${userId}/change-password`;

    return this.post<{ success: boolean }>(endpoint, passwordData);
  }

  async resetPassword(resetData: PasswordResetRequest): Promise<
    ApiResponse<{
      success: boolean;
      reset_token?: string;
    }>
  > {
    return this.post<{ success: boolean; reset_token?: string }>(
      "/auth/reset-password",
      resetData
    );
  }

  // Session Queries
  async getUserSessions(
    userId: string,
    userType: "admin" | "project"
  ): Promise<ApiResponse<Session[]>> {
    const endpoint =
      userType === "admin"
        ? `/auth/admin/sessions`
        : `/auth/users/${userId}/sessions`;

    return this.get<Session[]>(endpoint);
  }

  // Validation Methods
  async validateSession(sessionToken: string): Promise<
    ApiResponse<{
      valid: boolean;
      session?: Session;
    }>
  > {
    return this.post<{ valid: boolean; session?: Session }>(
      "/auth/session/validate",
      {
        token: sessionToken,
      }
    );
  }

  async validateApiKey(apiKey: string): Promise<
    ApiResponse<{
      valid: boolean;
      key_info?: {
        id: string;
        name: string;
        type: string;
        scopes: string[];
      };
    }>
  > {
    return this.post<{
      valid: boolean;
      key_info?: {
        id: string;
        name: string;
        type: string;
        scopes: string[];
      };
    }>("/auth/validate-key", {
      api_key: apiKey,
    });
  }
}
