import { QueryOptions, ProjectUser, AdminUser } from "@krapi/sdk";

import { DatabaseService } from "./database.service";

import { TypeMapper } from "@/lib/type-mapper";
import {
  Project,
  ProjectSettings,
  ProjectStats,
  Collection,
  Document,
  ApiKey,
  ChangelogEntry,
  CreateChangelogEntry,
  AdminRole,
  AccessLevel,
  AdminPermission,
  CollectionField,
  CollectionIndex,
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
  async getProjects(options?: QueryOptions): Promise<Project[]> {
    const projects = await this.db.getAllProjects();

    // Apply pagination if options are provided
    if (options?.limit || options?.offset) {
      const limit = options.limit || 10;
      const offset = options.offset || 0;
      return projects.slice(offset, offset + limit);
    }

    return projects;
  }

  async getProjectById(id: string): Promise<Project | null> {
    return await this.db.getProjectById(id);
  }

  async createProject(
    project: Omit<Project, "id" | "created_at" | "updated_at">
  ): Promise<Project> {
    return await this.db.createProject({
      ...project,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
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
      // Since getCollectionDocuments doesn't exist, we'll estimate based on collections
      const documentsCount = 0;
      // TODO: Implement proper document counting when the method is available
      // For now, we'll use a placeholder value

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
      };
    }
  }

  async getProjectSettings(id: string): Promise<ProjectSettings> {
    const project = await this.db.getProjectById(id);
    if (!project) {
      throw new Error("Project not found");
    }
    return project.settings;
  }

  async updateProjectSettings(
    id: string,
    settings: Partial<ProjectSettings>
  ): Promise<ProjectSettings> {
    const project = await this.db.updateProject(id, { settings });
    if (!project) {
      throw new Error("Project not found");
    }
    return project.settings;
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
  ): Promise<ProjectUser[]> {
    const result = await this.db.getProjectUsers(projectId, {
      limit: options?.limit,
      offset: options?.offset,
      search: options?.search,
      active:
        (options as { active?: boolean })?.active !== undefined
          ? (options as { active?: boolean }).active
          : true,
    });

    return result.users.map(TypeMapper.mapProjectUser);
  }

  async getUserById(id: string): Promise<ProjectUser | null> {
    // Get user from database
    const user = await this.db.getProjectUserById(id);
    if (!user) {
      return null;
    }

    return TypeMapper.mapProjectUser(user);
  }

  async createUser(user: Partial<ProjectUser>): Promise<ProjectUser> {
    if (!user.project_id || !user.username || !user.email) {
      throw new Error("Project ID, username, and email are required");
    }

    const backendUser = await this.db.createProjectUser(user.project_id, {
      username: user.username,
      email: user.email,
      password: (user as { password?: string }).password || "",
      phone: (user as { phone?: string }).phone,
      scopes: (user as { access_scopes?: string[] }).access_scopes || [],
      metadata: (user as { custom_fields?: Record<string, unknown> })
        .custom_fields,
    });

    return TypeMapper.mapProjectUser(backendUser);
  }

  async updateUser(
    id: string,
    updates: Partial<ProjectUser>
  ): Promise<ProjectUser> {
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

    return TypeMapper.mapProjectUser(user);
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
  async getApiKeys(projectId: string): Promise<ApiKey[]> {
    return await this.db.getProjectApiKeys(projectId);
  }

  async getApiKeyById(_id: string): Promise<ApiKey | null> {
    return await this.db.getApiKeyById(_id);
  }

  async createApiKey(key: Partial<ApiKey>): Promise<ApiKey> {
    if (!key.name || !key.type || !key.owner_id || !key.scopes) {
      throw new Error("Name, type, owner_id, and scopes are required");
    }

    return await this.db.createApiKey({
      name: key.name,
      type: key.type,
      owner_id: key.owner_id,
      scopes: key.scopes,
      project_ids: key.project_ids,
      expires_at: key.expires_at,
    });
  }

  async updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey> {
    const result = await this.db.updateApiKey(id, updates);
    if (!result) {
      throw new Error("API key not found");
    }
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
      return paginatedUsers.map((user) => TypeMapper.mapAdminUser(user));
    }

    return users.map((user) => TypeMapper.mapAdminUser(user));
  }

  async getAdminUserById(id: string): Promise<AdminUser | null> {
    const user = await this.db.getAdminUserById(id);
    return user ? TypeMapper.mapAdminUser(user) : null;
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
      permissions: user.permissions as unknown as AdminPermission[],
      active: user.active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      password_hash: "", // Will be set by the database service
    };

    const result = await this.db.createAdminUser(backendUser);
    return TypeMapper.mapAdminUser(result);
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
    return TypeMapper.mapAdminUser(result);
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    return await this.db.deleteAdminUser(id);
  }

  // Changelog
  async createChangelogEntry(
    entry: CreateChangelogEntry
  ): Promise<ChangelogEntry> {
    return await this.db.createChangelogEntry({
      ...entry,
      createdAt: new Date().toISOString(),
    } as unknown as Omit<ChangelogEntry, "id" | "created_at">);
  }

  async getChangelogEntries(
    projectId: string,
    options?: QueryOptions
  ): Promise<ChangelogEntry[]> {
    const entries = await this.db.getProjectChangelog(
      projectId,
      options?.limit || 100
    );

    // Apply pagination if options are provided
    if (options?.limit || options?.offset) {
      const limit = options.limit || 10;
      const offset = options.offset || 0;
      return entries.slice(offset, offset + limit);
    }

    return entries;
  }
}
