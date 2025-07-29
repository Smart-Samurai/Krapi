// Import for type usage
import { AdminUser as AdminUserType } from '@/types';

// Re-export main types from the backend
export type {
  AdminUser,
  AdminRole,
  AccessLevel,
  AdminPermission,
  Project,
  ProjectSettings,
  EmailConfig,
  StorageConfig,
  AuthConfig,
  RateLimitConfig,
  TableSchema,
  TableField,
  FieldType,
  FieldValidation,
  TableIndex,
  Document,
  FileRecord,
  ProjectUser,
  Session,
  SessionType,
  ChangelogEntry,
  ChangeAction,
  ApiResponse,
  PaginatedResponse,
  QueryOptions
} from '@/types';

// Additional SDK-specific types
export interface FileInfo {
  id: string;
  filename: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
  uploaded_by?: string;
}

export interface CreateSessionResponse {
  session_token: string;
  expires_at: string;
}

export interface LoginResponse {
  user: Omit<AdminUserType, 'password_hash'>;
  token: string;
  session_token: string;
  expires_at: string;
}

export interface ProjectStats {
  tables: number;
  documents: number;
  users: number;
  files: number;
  storage_used: number;
}

export interface StorageStats {
  total_files: number;
  total_size: number;
  max_file_size: number;
  allowed_types: string[];
}

export interface KrapiError {
  success: false;
  error: string;
  details?: any;
}