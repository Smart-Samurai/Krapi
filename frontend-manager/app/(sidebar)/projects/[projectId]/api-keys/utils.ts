/**
 * API Keys Utility Functions
 */

import type { ApiKey } from "./types";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "session_token" && value) return value;
  }
  return localStorage.getItem("session_token");
}

export function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt || expiresAt === "null" || expiresAt === "undefined") return false;
  try {
    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime())) return false;
    return expiryDate < new Date();
  } catch {
    return false;
  }
}

export function isExpiringSoon(expiresAt?: string | null): boolean {
  if (!expiresAt || expiresAt === "null" || expiresAt === "undefined") return false;
  try {
    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime())) return false;
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    return expiryDate <= thirtyDaysFromNow && expiryDate > now;
  } catch {
    return false;
  }
}

export function normalizeApiKey(key: unknown, projectId: string): ApiKey {
  const apiKey = key as Record<string, unknown>;
  return {
    id: String(apiKey.id || ""),
    name: String(apiKey.name || ""),
    project_id: String(apiKey.project_id || projectId),
    key: apiKey.key ? String(apiKey.key) : undefined,
    scopes: Array.isArray(apiKey.scopes) ? apiKey.scopes.map(String) : [],
    is_active: Boolean(apiKey.is_active),
    expires_at: apiKey.expires_at ? String(apiKey.expires_at) : null,
    created_at: String(apiKey.created_at || new Date().toISOString()),
    updated_at: String(apiKey.updated_at || apiKey.created_at || new Date().toISOString()),
    metadata: apiKey.metadata && typeof apiKey.metadata === "object" && !Array.isArray(apiKey.metadata) 
      ? apiKey.metadata as Record<string, unknown> 
      : {},
  };
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString || dateString === "null" || dateString === "undefined") return "Never";
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Invalid date" : date.toLocaleDateString();
  } catch {
    return "Invalid date";
  }
}

