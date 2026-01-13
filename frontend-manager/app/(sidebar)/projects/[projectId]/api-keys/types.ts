/**
 * API Key Types
 * Shared type definitions for API keys components
 */

export type ApiKey = {
  id: string;
  name: string;
  project_id: string;
  key?: string;
  scopes: string[];
  is_active: boolean;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
};

export type ApiKeyFormData = {
  name: string;
  scopes: string[];
  expires_at: string;
  metadata: Record<string, unknown>;
};

