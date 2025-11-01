import {
  QueryOptions,
  ProjectStats,
  ProjectSettings,
  Collection,
  Document,
  ChangelogEntry,
  CreateChangelogEntry,
  AdminUser,
  AdminRole,
  AccessLevel,
  CollectionField,
  CollectionIndex,
  UserRole,
} from "@krapi/sdk";

import { DatabaseService } from "./database.service";

import { TypeMapper } from "@/lib/type-mapper";
import {
  BackendProject,
  BackendProjectUser,
  BackendProjectSettings,
  BackendChangelogEntry,
  CreateBackendChangelogEntry,
  BackendApiKey,
  BackendCreateProjectRequest,
} from "@/types";

/**
 * Database Adapter Service
 *
 * This service wraps the existing DatabaseService to provide
 * a consistent interface for the controllers.
 */
export class DatabaseAdapterService {
  private static instance: DatabaseAdapterService;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): DatabaseAdapterService {
    if (!DatabaseAdapterService.instance) {
      DatabaseAdapterService.instance = new DatabaseAdapterService();
    }
    return DatabaseAdapterService.instance;
  }

  // Projects
  async getProjects(options: QueryOptions = {}): Promise<BackendProject[]> {
    const projects = await this.db.getAllProjects();

    // Apply pagination if options are provided
    if (options?.limit || options?.offset) {
      const limit = options.limit || 10;
      const offset = options.offset || 0;
      return projects.slice(offset, offset + limit);
    }

    return projects;
  }

  async getProjectById(id: string): Promise<BackendProject | null> {
    return await this.db.getProjectById(id);
  }

  async createProject(
    data: BackendCreateProjectRequest
  ): Promise<BackendProject> {
    // Ensure required properties have default values
    const projectData = {
      ...data,
      allowed_origins: data.allowed_origins || [],
      settings: {
        public: false,
        allow_registration: false,
        require_email_verification: false,
        ...data.settings,
      },
    };
    return await this.db.createProject(projectData);
  }

  async updateProject(
    id: string,
    updates: Partial<BackendProject>
  ): Promise<BackendProject | null> {
    const result = await this.db.updateProject(id, updates);
    if (!result) {
      throw new Error("Project not found");
    }
    return result;
  }

  async deleteProject(id: string): Promise<boolean> {
    return await this.db.deleteProject(id);
  }

  async getProjectStats(id: string): Promise<ProjectStats> {
    try {
      // Get the project to verify it exists
      const project = await this.db.getProjectById(id);
      if (!project) {
        throw new Error("Project not found");
      }

      // Get collections count
      const collections = await this.db.getProjectCollections(id);
      const collectionsCount = collections.length;

      // Get documents count across all collections
      // Get documents count for this project
      let documentsCount = 0;
      try {
        const collections = await this.db.getProjectCollections(id);
        for (const collection of collections) {
          const count = await this.db.countDocuments(id, collection.name);
          documentsCount += count;
        }
      } catch (error) {
        console.error("Error counting documents:", error);
        documentsCount = 0;
      }

      // Get users count for this project
      const usersResult = await this.db.getProjectUsers(id);
      const usersCount = usersResult.total;

      // Get storage used (this would need to be implemented in database service)
      // For now, we'll estimate based on collections and documents
      const storageUsed = collectionsCount * 1024 + documentsCount * 512; // Rough estimate in bytes

      // Get API calls count (this would need to be tracked in a separate table)
      // For now, return 0 as this feature needs to be implemented
      const apiCallsCount = 0;

      // Get last API call (this would need to be tracked in a separate table)
      // For now, return undefined as this feature needs to be implemented
      const lastApiCall = undefined;

      return {
        storage_used: storageUsed,
        api_calls_count: apiCallsCount,
        last_api_call: lastApiCall,
        collections_count: collectionsCount,
        documents_count: documentsCount,
        users_count: usersCount,
        total_users: usersCount,
        total_collections: collectionsCount,
        total_documents: documentsCount,
        total_files: 0, // Not implemented yet
        api_requests_today: 0, // Not implemented yet
        api_requests_month: 0, // Not implemented yet
      };
    } catch (error) {
      console.error("Get project stats error:", error);
      // Return default stats on error
      return {
        storage_used: 0,
        api_calls_count: 0,
        last_api_call: undefined,
        collections_count: 0,
        documents_count: 0,
        users_count: 0,
        total_users: 0,
        total_collections: 0,
        total_documents: 0,
        total_files: 0,
        api_requests_today: 0,
        api_requests_month: 0,
      };
    }
  }

  async getProjectSettings(projectId: string): Promise<BackendProjectSettings> {
    const project = await this.db.getProjectById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    return project.settings;
  }

  async updateProjectSettings(
    id: string,
    settings: Partial<ProjectSettings>
  ): Promise<ProjectSettings> {
    // Get current project settings
    const currentProject = await this.db.getProjectById(id);
    if (!currentProject) throw new Error("Project not found");

    // Merge with current settings to ensure required properties are present
    const updatedSettings = {
      ...currentProject.settings,
      ...settings,
    };

    const project = await this.db.updateProject(id, {
      settings: updatedSettings,
    });
    if (!project) {
      throw new Error("Project not found");
    }

    // Convert BackendProjectSettings to ProjectSettings
    return {
      authentication_required:
        project.settings.authentication_required || false,
      cors_enabled: project.settings.cors_enabled || false,
      rate_limiting_enabled: project.settings.rate_limiting_enabled || false,
      logging_enabled: project.settings.logging_enabled || true,
      encryption_enabled: project.settings.encryption_enabled || false,
      backup_enabled: project.settings.backup_enabled || false,
      max_file_size: project.settings.max_file_size || 10485760,
      allowed_file_types: project.settings.allowed_file_types || [],
      webhook_url: undefined,
      custom_headers: project.settings.custom_headers || {},
      environment: project.settings.environment || "development",
    };
  }

  // Collections
  async getCollections(projectId: string): Promise<Collection[]> {
    return await this.db.getProjectCollections(projectId);
  }

  async getCollectionById(id: string): Promise<Collection | null> {
    try {
      // Since the database service doesn't have getCollectionById,
      // we'll need to search through all projects to find the collection
      const allProjects = await this.db.getAllProjects();

      for (const project of allProjects) {
        try {
          const collections = await this.db.getProjectCollections(project.id);
          const collection = collections.find((col) => col.id === id);
          if (collection) {
            return collection;
          }
        } catch {
          // Continue to next project
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error("Get collection by ID error:", error);
      return null;
    }
  }

  async createCollection(collection: Partial<Collection>): Promise<Collection> {
    if (!collection.project_id || !collection.name) {
      throw new Error("Project ID and name are required");
    }

    try {
      const createdCollection = await this.db.createCollection(
        collection.project_id,
        collection.name,
        {
          description: collection.description,
          fields: collection.fields || [],
          indexes: collection.indexes || [],
        },
        "system" // Use default creator since created_by doesn't exist in Collection type
      );

      // Map the database result to Collection type
      return {
        id: createdCollection.id as string,
        project_id: createdCollection.project_id as string,
        name: createdCollection.name as string,
        description: (createdCollection.description as string) || "",
        fields: (createdCollection.fields as CollectionField[]) || [],
        indexes: (createdCollection.indexes as CollectionIndex[]) || [],
        schema: {
          fields: (createdCollection.fields as CollectionField[]) || [],
          indexes: (createdCollection.indexes as CollectionIndex[]) || [],
        },
        settings: {
          read_permissions: [],
          write_permissions: [],
          delete_permissions: [],
          enable_audit_log: true,
          enable_soft_delete: false,
          enable_versioning: false,
        },
        created_at: createdCollection.created_at as string,
        updated_at: createdCollection.updated_at as string,
      };
    } catch (error) {
      console.error("Create collection error:", error);
      throw new Error("Failed to create collection");
    }
  }

  async updateCollection(
    id: string,
    updates: Partial<Collection>
  ): Promise<Collection> {
    try {
      // Get the collection first to get the project ID
      const collection = await this.getCollectionById(id);
      if (!collection) {
        throw new Error("Collection not found");
      }

      // Update the collection using the database service
      const updatedCollection = await this.db.updateCollection(
        collection.project_id,
        collection.name,
        {
          description: updates.description,
          fields: updates.fields,
          indexes: updates.indexes,
        }
      );

      // Map the result back to Collection type
      return {
        id: updatedCollection.id as string,
        project_id: updatedCollection.project_id as string,
        name: updatedCollection.name as string,
        description: (updatedCollection.description as string) || "",
        fields: (updatedCollection.fields as CollectionField[]) || [],
        indexes: (updatedCollection.indexes as CollectionIndex[]) || [],
        schema: {
          fields: (updatedCollection.fields as CollectionField[]) || [],
          indexes: (updatedCollection.indexes as CollectionIndex[]) || [],
        },
        settings: {
          read_permissions: [],
          write_permissions: [],
          delete_permissions: [],
          enable_audit_log: true,
          enable_soft_delete: false,
          enable_versioning: false,
        },
        created_at: updatedCollection.created_at as string,
        updated_at: updatedCollection.updated_at as string,
      };
    } catch (error) {
      console.error("Update collection error:", error);
      throw new Error("Failed to update collection");
    }
  }

  async deleteCollection(id: string): Promise<boolean> {
    try {
      // Get the collection first to get the project ID
      const collection = await this.getCollectionById(id);
      if (!collection) {
        throw new Error("Collection not found");
      }

      // Delete the collection using the database service
      const result = await this.db.deleteCollection(
        collection.project_id,
        collection.name
      );

      return result;
    } catch (error) {
      console.error("Delete collection error:", error);
      throw new Error("Failed to delete collection");
    }
  }

  // Documents
  async getDocuments(
    collectionId: string,
    options?: QueryOptions
  ): Promise<Document[]> {
    try {
      // Get the collection first to get the project ID and name
      const collection = await this.getCollectionById(collectionId);
      if (!collection) {
        throw new Error("Collection not found");
      }

      // Get documents using the database service
      const result = await this.db.getDocuments(
        collection.project_id,
        collection.name,
        {
          limit: options?.limit || 100,
          offset: options?.offset || 0,
        }
      );

      return result.documents;
    } catch (error) {
      console.error("Get documents error:", error);
      return [];
    }
  }

  async getDocumentById(id: string): Promise<Document | null> {
    try {
      // Use the database service's getDocumentById method
      const document = await this.db.getDocumentById(id);
      return document;
    } catch (error) {
      console.error("Get document by ID error:", error);
      return null;
    }
  }

  async createDocument(
    collectionId: string,
    data: Record<string, unknown>
  ): Promise<Document> {
    try {
      // Get collection to validate structure and get project info
      const collection = await this.getCollectionById(collectionId);
      if (!collection) {
        throw new Error(`Collection ${collectionId} not found`);
      }

      // Validate data against collection schema
      const validatedData = await this.validateDocumentData(collection, data);

      // Create document in database
      const document = await this.db.createDocument(
        collection.project_id,
        collection.name,
        validatedData
      );

      return document as Document;
    } catch (error) {
      console.error("Create document error:", error);
      throw new Error("Failed to create document");
    }
  }

  async updateDocument(
    id: string,
    updates: Record<string, unknown>
  ): Promise<Document> {
    try {
      // Get document to get collection info
      const existingDocument = await this.db.getDocumentById(id);
      if (!existingDocument) {
        throw new Error(`Document ${id} not found`);
      }

      // Get collection to validate structure
      const collection = await this.getCollectionById(
        existingDocument.collection_id as string
      );
      if (!collection) {
        throw new Error(
          `Collection ${existingDocument.collection_id} not found`
        );
      }

      // Validate updates against collection schema
      const validatedUpdates = await this.validateDocumentData(
        collection,
        updates
      );

      // Update document in database
      const document = await this.db.updateDocument(
        collection.project_id,
        collection.name,
        id,
        validatedUpdates
      );

      return document as Document;
    } catch (error) {
      console.error("Update document error:", error);
      throw new Error("Failed to update document");
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      // Get document to get collection info
      const existingDocument = await this.db.getDocumentById(id);
      if (!existingDocument) {
        throw new Error(`Document ${id} not found`);
      }

      // Get collection to get the name
      const collection = await this.getCollectionById(
        existingDocument.collection_id as string
      );
      if (!collection) {
        throw new Error(
          `Collection ${existingDocument.collection_id} not found`
        );
      }

      // Delete document in database
      const result = await this.db.deleteDocument(
        collection.project_id,
        collection.name,
        id
      );

      return result;
    } catch (error) {
      console.error("Delete document error:", error);
      throw new Error("Failed to delete document");
    }
  }

  // Users
  async getUsers(
    projectId: string,
    options?: QueryOptions
  ): Promise<BackendProjectUser[]> {
    const result = await this.db.getProjectUsers(projectId, {
      limit: options?.limit,
      offset: options?.offset,
      search: options?.search,
    });

    return result.users.map((user) => {
      const mappedUser = TypeMapper.mapProjectUser(user);
      return {
        ...mappedUser,
        username: mappedUser.username || "",
        email: mappedUser.email || "",
        role: mappedUser.role as unknown as UserRole,
        status: "active" as const,
      };
    });
  }

  async getUserById(id: string): Promise<BackendProjectUser | null> {
    // Get user from database
    const user = await this.db.getProjectUserById(id);
    if (!user) {
      return null;
    }

    const mappedUser = TypeMapper.mapProjectUser(user);
    return {
      ...mappedUser,
      username: mappedUser.username || "",
      email: mappedUser.email || "",
      role: mappedUser.role as unknown as UserRole,
      status: "active" as const,
    };
  }

  async createUser(
    user: Partial<BackendProjectUser>
  ): Promise<BackendProjectUser> {
    if (!user.project_id || !user.username || !user.email) {
      throw new Error("Project ID, username, and email are required");
    }

    const backendUser = await this.db.createProjectUser(user.project_id, {
      username: user.username,
      email: user.email,
      password: (user as { password?: string }).password || "",
      phone: (user as { phone?: string }).phone,
      scopes: (user as { access_scopes?: string[] }).access_scopes || [],
    });

    const mappedUser = TypeMapper.mapProjectUser(backendUser);
    return {
      ...mappedUser,
      username: mappedUser.username || "",
      email: mappedUser.email || "",
      role: mappedUser.role as unknown as UserRole,
      status: "active" as const,
    };
  }

  async updateUser(
    id: string,
    updates: Partial<BackendProjectUser>
  ): Promise<BackendProjectUser> {
    // Get user to get project ID
    const existingUser = await this.db.getProjectUserById(id);
    if (!existingUser) {
      throw new Error(`User ${id} not found`);
    }

    // Update user in database
    const user = await this.db.updateProjectUser(existingUser.project_id, id, {
      username: updates.username,
      email: updates.email,
      phone: (updates as { phone?: string }).phone,
      scopes: (updates as { access_scopes?: string[] }).access_scopes,
      metadata: (updates as { custom_fields?: Record<string, unknown> })
        .custom_fields,
    });

    const mappedUser = TypeMapper.mapProjectUser(user);
    return {
      ...mappedUser,
      username: mappedUser.username || "",
      email: mappedUser.email || "",
      role: mappedUser.role as unknown as UserRole,
      status: "active" as const,
    };
  }

  async deleteUser(id: string): Promise<boolean> {
    // Get user to get project ID
    const existingUser = await this.db.getProjectUserById(id);
    if (!existingUser) {
      throw new Error(`User ${id} not found`);
    }

    // Delete user from database
    const result = await this.db.deleteProjectUser(existingUser.project_id, id);
    return result !== null;
  }

  // Helper method to validate document data against collection schema
  private async validateDocumentData(
    collection: Collection,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Basic validation - ensure required fields are present
    const requiredFields =
      collection.fields?.filter((f) => f.required)?.map((f) => f.name) || [];

    for (const fieldName of requiredFields) {
      if (!(fieldName in data)) {
        throw new Error(`Required field '${fieldName}' is missing`);
      }
    }

    // Type validation could be added here
    // For now, return the data as-is
    return data;
  }

  // API Keys
  async getApiKeys(projectId: string): Promise<BackendApiKey[]> {
    return await this.db.getProjectApiKeys(projectId);
  }

  async getApiKeyById(_id: string): Promise<BackendApiKey | null> {
    return await this.db.getApiKeyById(_id);
  }

  async createApiKey(key: Partial<BackendApiKey>): Promise<BackendApiKey> {
    const result = await this.db.createApiKey({
      name: key.name!,
      scopes: key.scopes!,
      project_id: key.project_id,
      user_id: key.user_id!,
      expires_at: key.expires_at,
      rate_limit: key.rate_limit,
      metadata: key.metadata,
    });
    return result;
  }

  async updateApiKey(
    id: string,
    updates: Partial<BackendApiKey>
  ): Promise<BackendApiKey> {
    const result = await this.db.updateApiKey(id, updates);
    return result;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    return await this.db.deleteApiKey(id);
  }

  // Admin Users
  async getAdminUsers(options?: QueryOptions): Promise<AdminUser[]> {
    const users = await this.db.getAllAdminUsers();

    // Apply pagination if options are provided
    if (options?.limit || options?.offset) {
      const limit = options.limit || 10;
      const offset = options.offset || 0;
      const paginatedUsers = users.slice(offset, offset + limit);
      return paginatedUsers;
    }

    return users;
  }

  async getAdminUserById(id: string): Promise<AdminUser | null> {
    const user = await this.db.getAdminUserById(id);
    return user;
  }

  async createAdminUser(
    user: Omit<
      AdminUser,
      "id" | "created_at" | "updated_at" | "last_login" | "login_count"
    > & { password?: string }
  ): Promise<AdminUser> {
    // Convert SDK AdminUser to backend AdminUser format
    const backendUser = {
      username: user.username,
      email: user.email,
      password: user.password || "default_password",
      role: user.role as unknown as AdminRole,
      access_level: user.access_level as unknown as AccessLevel,
      permissions: user.permissions as unknown as string[],
      active: user.active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      password_hash: "", // Will be set by the database service
    };

    const result = await this.db.createAdminUser(backendUser);
    return result;
  }

  async updateAdminUser(
    id: string,
    data: Partial<AdminUser>
  ): Promise<AdminUser> {
    const result = await this.db.updateAdminUser(
      id,
      data as unknown as Record<string, unknown>
    );
    if (!result) {
      throw new Error("Admin user not found");
    }
    return result;
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    return await this.db.deleteAdminUser(id);
  }

  // Changelog (SDK type)
  async createChangelogEntry(
    _entry: CreateChangelogEntry
  ): Promise<ChangelogEntry> {
    // SDK changelog entries are different from backend changelog entries
    // For now, throw an error as this needs proper implementation
    throw new Error("SDK changelog entries not implemented yet");
  }

  // Backend-specific changelog entry creation
  async createBackendChangelogEntry(
    entry: CreateBackendChangelogEntry
  ): Promise<BackendChangelogEntry> {
    return await this.db.createChangelogEntry(entry);
  }

  async getChangelogEntries(
    _projectId: string,
    _options?: QueryOptions
  ): Promise<ChangelogEntry[]> {
    // SDK changelog entries are different from backend changelog entries
    // For now, return empty array as this needs proper implementation
    return [];
  }
}
