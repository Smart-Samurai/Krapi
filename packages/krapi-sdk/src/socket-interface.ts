/**
 * KRAPI Socket Interface
 * 
 * This defines the complete interface that must be implemented by both:
 * - Client (Plug): HTTP-based methods for frontend apps
 * - Server (Socket): Database-based methods for backend apps
 * 
 * Every method here MUST work identically in both environments.
 * This ensures perfect "plug and socket" compatibility - the same code works
 * in both client and server environments without modification.
 * 
 * @module socket-interface
 * @example
 * // Client usage
 * await krapi.connect({ endpoint: 'https://api.example.com', apiKey: 'key' });
 * const projects = await krapi.projects.list();
 * 
 * @example
 * // Server usage (identical code!)
 * await krapi.connect({ database: dbConnection });
 * const projects = await krapi.projects.list();
 */
// Import all required types
import type {
  AdminUser,
  ProjectUser,
  Project,
  ProjectStats,
  ProjectSettings,
  ActivityLog,
  Collection,
  Document,
  FileInfo,
  EmailConfig,
  EmailTemplate,
  ApiKey,
} from "./types";

/**
 * KRAPI Socket Interface
 * 
 * Complete interface that must be implemented by both client and server SDK implementations.
 * Ensures perfect plug/socket compatibility - same methods, same signatures, same behavior.
 * 
 * @interface KrapiSocketInterface
 * @example
 * // Both client and server implement this interface identically
 * class MySDK implements KrapiSocketInterface {
 *   auth: { ... };
 *   projects: { ... };
 *   collections: { ... };
 *   // ... all methods from interface
 * }
 */
export interface KrapiSocketInterface {
  // Authentication methods
  auth: {
    createSession(apiKey: string): Promise<{
      session_token: string;
      expires_at: string;
      user_type: "admin" | "project";
      scopes: string[];
    }>;

    login(
      username: string,
      password: string,
      remember_me?: boolean
    ): Promise<{
      session_token: string;
      expires_at: string;
      user: AdminUser | ProjectUser;
      scopes: string[];
    }>;

    setSessionToken(token: string): void;

    setApiKey(apiKey: string): void;

    logout(): Promise<{ success: boolean }>;

    getCurrentUser(): Promise<{
      success: boolean;
      data?: AdminUser | ProjectUser;
      error?: string;
    }>;

    refreshSession(): Promise<{
      session_token: string;
      expires_at: string;
    }>;

    validateSession(token: string): Promise<{
      valid: boolean;
      session?: AdminUser | ProjectUser;
    }>;

    changePassword(
      oldPassword: string,
      newPassword: string
    ): Promise<{ success: boolean }>;

    regenerateApiKey(
      req: unknown
    ): Promise<{ success: boolean; data?: { apiKey: string }; error?: string }>;
  };

  // Projects management
  projects: {
    create(projectData: {
      name: string;
      description?: string;
      settings?: Record<string, unknown>;
    }): Promise<Project>;

    get(projectId: string): Promise<Project>;

    update(
      projectId: string,
      updates: Record<string, unknown>
    ): Promise<Project>;

    delete(projectId: string): Promise<{ success: boolean }>;

    getAll(options?: {
      limit?: number;
      offset?: number;
      search?: string;
      status?: string;
    }): Promise<Project[]>;

    getStatistics(projectId: string): Promise<ProjectStats>;

    getSettings(projectId: string): Promise<ProjectSettings>;

    updateSettings(
      projectId: string,
      settings: Record<string, unknown>
    ): Promise<ProjectSettings>;

    getActivity(
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        action_type?: string;
        start_date?: string;
        end_date?: string;
      }
    ): Promise<ActivityLog[]>;
  };

  // Collections management
  collections: {
    create(
      projectId: string,
      collectionData: {
        name: string;
        description?: string;
        fields: Array<{
          name: string;
          type: string;
          required?: boolean;
          unique?: boolean;
          indexed?: boolean;
          default?: unknown;
          validation?: Record<string, unknown>;
        }>;
        indexes?: Array<{
          name: string;
          fields: string[];
          unique?: boolean;
        }>;
      }
    ): Promise<Collection>;

    get(projectId: string, collectionName: string): Promise<Collection>;

    getAll(
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        search?: string;
      }
    ): Promise<Collection[]>;

    update(
      projectId: string,
      collectionName: string,
      updates: {
        description?: string;
        fields?: Array<{
          name: string;
          type: string;
          required?: boolean;
          unique?: boolean;
          indexed?: boolean;
          default?: unknown;
          validation?: Record<string, unknown>;
        }>;
        indexes?: Array<{
          name: string;
          fields: string[];
          unique?: boolean;
        }>;
      }
    ): Promise<Collection>;

    delete(
      projectId: string,
      collectionName: string
    ): Promise<{ success: boolean }>;

    getSchema(projectId: string, collectionName: string): Promise<Collection>;

    validateSchema(
      projectId: string,
      collectionName: string
    ): Promise<{
      valid: boolean;
      issues: Array<{
        type: string;
        field?: string;
        message: string;
        severity: "error" | "warning" | "info";
      }>;
    }>;

    getStatistics(
      projectId: string,
      collectionName: string
    ): Promise<{ total_documents: number; total_size_bytes: number }>;
  };

  // Documents management
  documents: {
    create(
      projectId: string,
      collectionName: string,
      documentData: {
        data: Record<string, unknown>;
        created_by?: string;
      }
    ): Promise<Document>;

    get(
      projectId: string,
      collectionName: string,
      documentId: string
    ): Promise<Document>;

    update(
      projectId: string,
      collectionName: string,
      documentId: string,
      updateData: {
        data: Record<string, unknown>;
        updated_by?: string;
      }
    ): Promise<Document>;

    delete(
      projectId: string,
      collectionName: string,
      documentId: string,
      deletedBy?: string
    ): Promise<{ success: boolean }>;

    getAll(
      projectId: string,
      collectionName: string,
      options?: {
        filter?: Record<string, unknown>;
        limit?: number;
        offset?: number;
        orderBy?: string;
        order?: "asc" | "desc";
        search?: string;
      }
    ): Promise<Document[]>;

    search(
      projectId: string,
      collectionName: string,
      query: {
        text?: string;
        fields?: string[];
        filters?: Record<string, unknown>;
        limit?: number;
        offset?: number;
      }
    ): Promise<Document[]>;

    bulkCreate(
      projectId: string,
      collectionName: string,
      documents: Array<{
        data: Record<string, unknown>;
        created_by?: string;
      }>
    ): Promise<{
      created: Document[];
      errors: Array<{ index: number; error: string }>;
    }>;

    bulkUpdate(
      projectId: string,
      collectionName: string,
      updates: Array<{
        id: string;
        data: Record<string, unknown>;
        updated_by?: string;
      }>
    ): Promise<{
      updated: Document[];
      errors: Array<{ id: string; error: string }>;
    }>;

    bulkDelete(
      projectId: string,
      collectionName: string,
      documentIds: string[],
      deletedBy?: string
    ): Promise<{
      deleted_count: number;
      errors: Array<{ id: string; error: string }>;
    }>;

    count(
      projectId: string,
      collectionName: string,
      filter?: Record<string, unknown>
    ): Promise<{ count: number }>;

    aggregate(
      projectId: string,
      collectionName: string,
      aggregation: {
        group_by?: string[];
        aggregations: Record<
          string,
          {
            type: "count" | "sum" | "avg" | "min" | "max";
            field?: string;
          }
        >;
        filters?: Record<string, unknown>;
      }
    ): Promise<{
      groups: Record<string, Record<string, number>>;
      total_groups: number;
    }>;
  };

  // Users management
  users: {
    getAll(
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        search?: string;
        role?: string;
        status?: string;
      }
    ): Promise<ProjectUser[]>;

    get(projectId: string, userId: string): Promise<ProjectUser>;

    create(
      projectId: string,
      userData: {
        username: string;
        email: string;
        password: string;
        first_name?: string;
        last_name?: string;
        role?: string;
        permissions?: string[];
        metadata?: Record<string, unknown>;
      }
    ): Promise<ProjectUser>;

    update(
      projectId: string,
      userId: string,
      updates: {
        username?: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        role?: string;
        permissions?: string[];
        is_active?: boolean;
        metadata?: Record<string, unknown>;
      }
    ): Promise<ProjectUser>;

    delete(projectId: string, userId: string): Promise<{ success: boolean }>;

    updateRole(
      projectId: string,
      userId: string,
      role: string
    ): Promise<ProjectUser>;

    updatePermissions(
      projectId: string,
      userId: string,
      permissions: string[]
    ): Promise<ProjectUser>;

    getActivity(
      projectId: string,
      userId: string,
      options?: {
        limit?: number;
        offset?: number;
        start_date?: string;
        end_date?: string;
      }
    ): Promise<
      {
        id: string;
        action: string;
        timestamp: string;
        details: Record<string, unknown>;
      }[]
    >;

    getStatistics(projectId: string): Promise<{
      total_users: number;
      active_users: number;
      users_by_role: Record<string, number>;
      recent_logins: number;
    }>;
  };

  // Storage management
  storage: {
    uploadFile(
      projectId: string,
      file: File | Blob,
      options?: {
        folder?: string;
        filename?: string;
        metadata?: Record<string, unknown>;
        public?: boolean;
      }
    ): Promise<FileInfo>;

    downloadFile(projectId: string, fileId: string): Promise<Blob>;

    getFile(projectId: string, fileId: string): Promise<FileInfo>;

    deleteFile(
      projectId: string,
      fileId: string
    ): Promise<{ success: boolean }>;

    getFiles(
      projectId: string,
      options?: {
        folder?: string;
        limit?: number;
        offset?: number;
        search?: string;
        type?: string;
      }
    ): Promise<FileInfo[]>;

    createFolder(
      projectId: string,
      folderData: {
        name: string;
        parent_folder_id?: string;
        metadata?: Record<string, unknown>;
      }
    ): Promise<{
      id: string;
      name: string;
      parent_folder_id?: string;
      metadata?: Record<string, unknown>;
    }>;

    getFolders(
      projectId: string,
      parentFolderId?: string
    ): Promise<
      {
        id: string;
        name: string;
        parent_folder_id?: string;
        metadata?: Record<string, unknown>;
      }[]
    >;

    deleteFolder(
      projectId: string,
      folderId: string
    ): Promise<{ success: boolean }>;

    getStatistics(projectId: string): Promise<{
      total_files: number;
      total_size_bytes: number;
      files_by_type: Record<string, number>;
      storage_quota: {
        used: number;
        limit: number;
        percentage: number;
      };
    }>;

    getFileUrl(
      projectId: string,
      fileId: string,
      options?: {
        expires_in?: number;
        download?: boolean;
      }
    ): Promise<{ url: string; expires_at?: string }>;
  };

  // Email management
  email: {
    getConfig(projectId: string): Promise<EmailConfig>;

    updateConfig(
      projectId: string,
      config: {
        provider: string;
        settings: Record<string, unknown>;
      }
    ): Promise<EmailConfig>;

    testConfig(
      projectId: string,
      testEmail: string
    ): Promise<{ success: boolean; message?: string }>;

    getTemplates(
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        search?: string;
      }
    ): Promise<EmailTemplate[]>;

    getTemplate(projectId: string, templateId: string): Promise<EmailTemplate>;

    createTemplate(
      projectId: string,
      template: {
        name: string;
        subject: string;
        body: string;
        variables: string[];
        type?: string;
      }
    ): Promise<EmailTemplate>;

    updateTemplate(
      projectId: string,
      templateId: string,
      updates: {
        name?: string;
        subject?: string;
        body?: string;
        variables?: string[];
      }
    ): Promise<EmailTemplate>;

    deleteTemplate(
      projectId: string,
      templateId: string
    ): Promise<{ success: boolean }>;

    send(
      projectId: string,
      emailData: {
        to: string | string[];
        cc?: string | string[];
        bcc?: string | string[];
        subject: string;
        body: string;
        template_id?: string;
        template_variables?: Record<string, unknown>;
        attachments?: Array<{
          filename: string;
          content: string | Buffer;
          content_type?: string;
        }>;
      }
    ): Promise<{
      success: boolean;
      message_id?: string;
      error?: string;
    }>;

    getHistory(
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        status?: string;
        start_date?: string;
        end_date?: string;
      }
    ): Promise<
      {
        id: string;
        to: string;
        subject: string;
        status: string;
        sent_at: string;
      }[]
    >;
  };

  // API Keys management
  apiKeys: {
    getAll(
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        type?: string;
        status?: string;
      }
    ): Promise<ApiKey[]>;

    get(projectId: string, keyId: string): Promise<ApiKey>;

    create(
      projectId: string,
      keyData: {
        name: string;
        scopes: string[];
        expires_at?: string;
        rate_limit?: number;
        metadata?: Record<string, unknown>;
      }
    ): Promise<ApiKey>;

    update(
      projectId: string,
      keyId: string,
      updates: {
        name?: string;
        scopes?: string[];
        expires_at?: string;
        is_active?: boolean;
        rate_limit?: number;
        metadata?: Record<string, unknown>;
      }
    ): Promise<ApiKey>;

    delete(projectId: string, keyId: string): Promise<{ success: boolean }>;

    regenerate(projectId: string, keyId: string): Promise<ApiKey>;

    validateKey(apiKey: string): Promise<{
      valid: boolean;
      key_info?: {
        id: string;
        name: string;
        type: string;
        scopes: string[];
        project_id?: string;
      };
    }>;
  };

  // Database initialization and management
  database: {
    initialize(): Promise<{
      success: boolean;
      message: string;
      tablesCreated: string[];
      defaultDataInserted: boolean;
    }>;

    getHealth(): Promise<{
      database: boolean;
      storage: boolean;
      email: boolean;
      overall: boolean;
      details: Record<string, unknown>;
    }>;

    createDefaultAdmin(): Promise<{
      success: boolean;
      message: string;
      adminUser?: unknown;
    }>;
  };

  // Health and diagnostics
  health: {
    check(): Promise<{
      healthy: boolean;
      message: string;
      details?: Record<string, unknown>;
      version: string;
    }>;

    checkDatabase(): Promise<{
      healthy: boolean;
      message: string;
      details?: Record<string, unknown>;
    }>;

    runDiagnostics(): Promise<{
      tests: Array<{
        name: string;
        passed: boolean;
        message: string;
        duration: number;
      }>;
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
    }>;

    validateSchema(): Promise<{
      valid: boolean;
      issues: Array<{
        type: string;
        table?: string;
        field?: string;
        message: string;
        severity: "error" | "warning" | "info";
      }>;
    }>;

    autoFix(): Promise<{
      success: boolean;
      fixes_applied: number;
      details: string[];
      remaining_issues: number;
    }>;

    migrate(): Promise<{
      success: boolean;
      migrations_applied: number;
      details: string[];
    }>;

    getStats(): Promise<{
      database: {
        size_bytes: number;
        tables_count: number;
        connections: number;
        uptime: number;
      };
      system: {
        memory_usage: number;
        cpu_usage: number;
        disk_usage: number;
      };
    }>;

    repairDatabase(): Promise<{
      success: boolean;
      actions: string[];
    }>;
  };

  // Testing utilities
  testing: {
    createTestProject(options?: {
      name?: string;
      with_collections?: boolean;
      with_documents?: boolean;
      document_count?: number;
    }): Promise<Project>;

    cleanup(projectId?: string): Promise<{
      success: boolean;
      deleted: {
        projects: number;
        collections: number;
        documents: number;
        files: number;
        users: number;
      };
    }>;

    runTests(testSuite?: string): Promise<{
      results: Array<{
        suite: string;
        tests: Array<{
          name: string;
          passed: boolean;
          error?: string;
          duration: number;
        }>;
      }>;
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
    }>;

    seedData(
      projectId: string,
      seedType: string,
      options?: Record<string, unknown>
    ): Promise<{
      success: boolean;
      created: Record<string, number>;
    }>;
  };

  // Utility methods
  getMode(): "client" | "server" | null;
  getConfig(): {
    mode: "client" | "server" | null;
    endpoint?: string;
    apiKey?: string;
    database?: Record<string, unknown>;
  };
  close(): Promise<void>;
}
