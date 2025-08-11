import { DatabaseService } from "./database.service";
import {
  Project,
  ProjectSettings,
  ProjectStats,
  Collection,
  Document,
  ProjectUser as BackendProjectUser,
  AdminUser as BackendAdminUser,
  ApiKey,
  ChangelogEntry,
  CreateChangelogEntry,
} from "@/types";
import {
  QueryOptions,
  ProjectUser,
  AdminUser,
  ProjectSettings as SDKProjectSettings,
  ProjectStats as SDKProjectStats,
  Collection as SDKCollection,
  Document as SDKDocument,
  ApiKey as SDKApiKey,
  ChangelogEntry as SDKChangelogEntry,
} from "@krapi/sdk";
import { TypeMapper } from "@/lib/type-mapper";

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
    if (options?.limit || (options as any)?.offset) {
      const limit = options.limit || 10;
      const offset = (options as any).offset || 0;
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);
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

  async getProjectStats(_id: string): Promise<ProjectStats> {
    // This would need to be implemented in the database service
    // For now, return a mock implementation
    return {
      storage_used: 0,
      api_calls_count: 0,
      last_api_call: undefined,
      collections_count: 0,
      documents_count: 0,
      users_count: 0,
    };
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

  async getCollectionById(_id: string): Promise<Collection | null> {
    // The database service doesn't have getCollectionById, so we'll need to implement this
    // For now, return null
    return null;
  }

  async createCollection(collection: Partial<Collection>): Promise<Collection> {
    if (!collection.project_id || !collection.name) {
      throw new Error("Project ID and name are required");
    }

    return await this.db.createCollection(
      collection.project_id,
      collection.name,
      {
        description: collection.description,
        fields: collection.fields || [],
        indexes: collection.indexes || [],
      },
      "system" // Use default creator since created_by doesn't exist in Collection type
    );
  }

  async updateCollection(
    _id: string,
    _updates: Partial<Collection>
  ): Promise<Collection> {
    // The database service doesn't have updateCollection by ID, so we'll need to implement this
    // For now, throw an error
    throw new Error("Update collection by ID not implemented yet");
  }

  async deleteCollection(_id: string): Promise<boolean> {
    // The database service doesn't have deleteCollection by ID, so we'll need to implement this
    // For now, throw an error
    throw new Error("Delete collection by ID not implemented yet");
  }

  // Documents
  async getDocuments(
    _collectionId: string,
    _options?: QueryOptions
  ): Promise<Document[]> {
    // The database service expects projectId and collectionName, not collectionId
    // We'll need to get the collection first to get the projectId
    // For now, return empty array
    return [];
  }

  async getDocumentById(_id: string): Promise<Document | null> {
    // The database service doesn't have getDocumentById, so we'll need to implement this
    // For now, return null
    return null;
  }

  async createDocument(
    _collectionId: string,
    _data: Record<string, any>
  ): Promise<Document> {
    // The database service expects projectId and collectionName, not collectionId
    // We'll need to get the collection first to get the projectId
    // For now, throw an error
    throw new Error("Create document not implemented yet");
  }

  async updateDocument(
    _id: string,
    _updates: Record<string, any>
  ): Promise<Document> {
    // The database service doesn't have updateDocument by ID, so we'll need to implement this
    // For now, throw an error
    throw new Error("Update document by ID not implemented yet");
  }

  async deleteDocument(_id: string): Promise<boolean> {
    // The database service doesn't have deleteDocument by ID, so we'll need to implement this
    // For now, throw an error
    throw new Error("Delete document by ID not implemented yet");
  }

  // Users
  async getUsers(
    projectId: string,
    options?: QueryOptions
  ): Promise<ProjectUser[]> {
    const result = await this.db.getProjectUsers(projectId, {
      limit: options?.limit,
      offset: (options as any)?.offset,
      search: options?.search,
      active:
        (options as any)?.active !== undefined ? (options as any).active : true,
    });

    return result.users.map(TypeMapper.mapProjectUser);
  }

  async getUserById(_id: string): Promise<ProjectUser | null> {
    // The database service doesn't have getUserById, so we'll need to implement this
    // For now, return null
    return null;
  }

  async createUser(user: Partial<ProjectUser>): Promise<ProjectUser> {
    if (!user.project_id || !user.username || !user.email) {
      throw new Error("Project ID, username, and email are required");
    }

    const backendUser = await this.db.createProjectUser(user.project_id, {
      username: user.username,
      email: user.email,
      password: (user as any).password || "",
      phone: user.phone,
      scopes: user.access_scopes || [],
      metadata: user.custom_fields,
    });

    return TypeMapper.mapProjectUser(backendUser);
  }

  async updateUser(
    _id: string,
    _updates: Partial<ProjectUser>
  ): Promise<ProjectUser> {
    // The database service expects projectId and userId, not just id
    // We'll need to get the user first to get the projectId
    // For now, throw an error
    throw new Error("Update user not implemented yet");
  }

  async deleteUser(_id: string): Promise<boolean> {
    // The database service expects projectId and userId, not just id
    // We'll need to get the user first to get the projectId
    // For now, throw an error
    throw new Error("Delete user not implemented yet");
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
    if (options?.limit || (options as any)?.offset) {
      const limit = options.limit || 10;
      const offset = (options as any).offset || 0;
      return users.slice(offset, offset + limit).map(TypeMapper.mapAdminUser);
    }

    return users.map(TypeMapper.mapAdminUser);
  }

  async getAdminUserById(id: string): Promise<AdminUser | null> {
    return await this.db.getAdminUserById(id);
  }

  async createAdminUser(
    user: Omit<
      AdminUser,
      "id" | "created_at" | "updated_at" | "last_login" | "login_count"
    > & { password?: string }
  ): Promise<AdminUser> {
    if (!user.username || !user.email || !user.password_hash) {
      throw new Error("Username, email, and password_hash are required");
    }

    const backendUser = await this.db.createAdminUser({
      username: user.username,
      email: user.email,
      password_hash: user.password_hash,
      role: user.role as any,
      access_level: user.access_level as any,
      permissions: user.permissions as any[],
      active: user.active,
      password: user.password,
    } as any);

    return TypeMapper.mapAdminUser(backendUser);
  }

  async updateAdminUser(
    id: string,
    data: Partial<AdminUser>
  ): Promise<AdminUser> {
    const result = await this.db.updateAdminUser(id, data as any);
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
    } as any);
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
    if (options?.limit || (options as any)?.offset) {
      const limit = options.limit || 10;
      const offset = (options as any).offset || 0;
      return entries.slice(offset, offset + limit);
    }

    return entries;
  }
}
