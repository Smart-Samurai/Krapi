/**
 * KRAPI Socket Interface
 *
 * This defines the complete interface that must be implemented by both:
 * - Client (Plug): HTTP-based methods for frontend apps
 * - Server (Socket): Database-based methods for backend apps
 *
 * Every method here MUST work identically in both environments.
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
      user: any;
      scopes: string[];
    }>;

    setSessionToken(token: string): void;

    logout(): Promise<{ success: boolean }>;

    getCurrentUser(): Promise<any>;

    refreshSession(): Promise<{
      session_token: string;
      expires_at: string;
    }>;

    validateSession(token: string): Promise<{
      valid: boolean;
      session?: any;
    }>;

    changePassword(
      oldPassword: string,
      newPassword: string
    ): Promise<{ success: boolean }>;
  };

  // Projects management
  projects: {
    create(projectData: {
      name: string;
      description?: string;
      settings?: Record<string, unknown>;
    }): Promise<any>;

    get(projectId: string): Promise<any>;

    update(projectId: string, updates: Record<string, unknown>): Promise<any>;

    delete(projectId: string): Promise<{ success: boolean }>;

    getAll(options?: {
      limit?: number;
      offset?: number;
      search?: string;
      status?: string;
    }): Promise<any[]>;

    getStatistics(projectId: string): Promise<any>;

    getSettings(projectId: string): Promise<any>;

    updateSettings(
      projectId: string,
      settings: Record<string, unknown>
    ): Promise<any>;

    getActivity(
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        action_type?: string;
        start_date?: string;
        end_date?: string;
      }
    ): Promise<any[]>;
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
    ): Promise<any>;

    get(projectId: string, collectionName: string): Promise<any>;

    getAll(
      projectId: string,
      options?: {
        limit?: number;
        offset?: number;
        search?: string;
      }
    ): Promise<any[]>;

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
    ): Promise<any>;

    delete(
      projectId: string,
      collectionName: string
    ): Promise<{ success: boolean }>;

    getSchema(projectId: string, collectionName: string): Promise<any>;

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

    getStatistics(projectId: string, collectionName: string): Promise<any>;
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
    ): Promise<any>;

    get(
      projectId: string,
      collectionName: string,
      documentId: string
    ): Promise<any>;

    update(
      projectId: string,
      collectionName: string,
      documentId: string,
      updateData: {
        data: Record<string, unknown>;
        updated_by?: string;
      }
    ): Promise<any>;

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
    ): Promise<any[]>;

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
    ): Promise<any[]>;

    bulkCreate(
      projectId: string,
      collectionName: string,
      documents: Array<{
        data: Record<string, unknown>;
        created_by?: string;
      }>
    ): Promise<{
      created: any[];
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
      updated: any[];
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
    ): Promise<any[]>;

    get(projectId: string, userId: string): Promise<any>;

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
    ): Promise<any>;

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
    ): Promise<any>;

    delete(projectId: string, userId: string): Promise<{ success: boolean }>;

    updateRole(projectId: string, userId: string, role: string): Promise<any>;

    updatePermissions(
      projectId: string,
      userId: string,
      permissions: string[]
    ): Promise<any>;

    getActivity(
      projectId: string,
      userId: string,
      options?: {
        limit?: number;
        offset?: number;
        start_date?: string;
        end_date?: string;
      }
    ): Promise<any[]>;

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
      file: any,
      options?: {
        folder?: string;
        filename?: string;
        metadata?: Record<string, unknown>;
        public?: boolean;
      }
    ): Promise<any>;

    downloadFile(projectId: string, fileId: string): Promise<any>;

    getFile(projectId: string, fileId: string): Promise<any>;

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
    ): Promise<any[]>;

    createFolder(
      projectId: string,
      folderData: {
        name: string;
        parent_folder_id?: string;
        metadata?: Record<string, unknown>;
      }
    ): Promise<any>;

    getFolders(projectId: string, parentFolderId?: string): Promise<any[]>;

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
    getConfig(projectId: string): Promise<any>;

    updateConfig(
      projectId: string,
      config: {
        provider: string;
        settings: Record<string, unknown>;
      }
    ): Promise<any>;

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
    ): Promise<any[]>;

    getTemplate(projectId: string, templateId: string): Promise<any>;

    createTemplate(
      projectId: string,
      template: {
        name: string;
        subject: string;
        body: string;
        variables: string[];
        type?: string;
      }
    ): Promise<any>;

    updateTemplate(
      projectId: string,
      templateId: string,
      updates: {
        name?: string;
        subject?: string;
        body?: string;
        variables?: string[];
      }
    ): Promise<any>;

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
    ): Promise<any[]>;
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
    ): Promise<any[]>;

    get(projectId: string, keyId: string): Promise<any>;

    create(
      projectId: string,
      keyData: {
        name: string;
        scopes: string[];
        expires_at?: string;
        rate_limit?: number;
        metadata?: Record<string, unknown>;
      }
    ): Promise<any>;

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
    ): Promise<any>;

    delete(projectId: string, keyId: string): Promise<{ success: boolean }>;

    regenerate(projectId: string, keyId: string): Promise<any>;

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
  };

  // Testing utilities
  testing: {
    createTestProject(options?: {
      name?: string;
      with_collections?: boolean;
      with_documents?: boolean;
      document_count?: number;
    }): Promise<any>;

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
  getConfig(): any;
  close(): Promise<void>;
}
