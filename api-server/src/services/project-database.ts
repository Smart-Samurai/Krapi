import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";
import {
  Project,
  Collection,
  Document,
  ProjectUser,
  ProjectApiKey,
  ProjectStats,
} from "../types/projects";

class ProjectDatabaseService {
  private db!: Database.Database;
  private projectDbPath: string;

  constructor() {
    this.projectDbPath = path.join(__dirname, "../../data/projects.db");
    this.initializeDatabase();
  }

  private initializeDatabase() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.projectDbPath);
      if (!require("fs").existsSync(dataDir)) {
        require("fs").mkdirSync(dataDir, { recursive: true });
      }

      console.log(`📊 Initializing project database at: ${this.projectDbPath}`);
      this.db = new Database(this.projectDbPath, {
        verbose:
          process.env.NODE_ENV === "development" ? console.log : undefined,
      });

      // Enable WAL mode for better concurrency
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("foreign_keys = ON");

      this.createTables();
      this.seedDefaultProject();

      console.log("✅ Project database initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize project database:", error);
      throw error;
    }
  }

  private createTables() {
    try {
      console.log("📊 Creating project database tables...");

      // Projects table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          domain TEXT,
          settings TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT NOT NULL,
          status TEXT DEFAULT 'active'
        );
      `);

      // Collections table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS collections (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          schema TEXT NOT NULL,
          indexes TEXT DEFAULT '[]',
          permissions TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          document_count INTEGER DEFAULT 0,
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
          UNIQUE(project_id, name)
        );
      `);

      // Documents table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          collection_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT NOT NULL,
          updated_by TEXT NOT NULL,
          FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE,
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        );
      `);

      // Project users table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS project_users (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          name TEXT,
          avatar TEXT,
          status TEXT DEFAULT 'active',
          email_verified BOOLEAN DEFAULT 0,
          phone_verified BOOLEAN DEFAULT 0,
          oauth_providers TEXT DEFAULT '[]',
          preferences TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
          UNIQUE(project_id, email)
        );
      `);

      // Project API keys table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS project_api_keys (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          key TEXT UNIQUE NOT NULL,
          permissions TEXT NOT NULL,
          expires_at DATETIME,
          last_used DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        );
      `);

      // Project sessions table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS project_sessions (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          ip_address TEXT NOT NULL,
          user_agent TEXT,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES project_users (id) ON DELETE CASCADE
        );
      `);

      // Project files table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS project_files (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          original_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          path TEXT NOT NULL,
          uploaded_by TEXT NOT NULL,
          permissions TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        );
      `);

      // Project webhooks table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS project_webhooks (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          events TEXT NOT NULL,
          headers TEXT DEFAULT '{}',
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        );
      `);

      // API request logs table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS project_api_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id TEXT NOT NULL,
          api_key_id TEXT,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          status_code INTEGER,
          response_time REAL,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
          FOREIGN KEY (api_key_id) REFERENCES project_api_keys (id) ON DELETE SET NULL
        );
      `);

      // Create indexes for better performance
      this.db.exec(
        `CREATE INDEX IF NOT EXISTS idx_collections_project_id ON collections(project_id);`
      );
      this.db.exec(
        `CREATE INDEX IF NOT EXISTS idx_documents_collection_id ON documents(collection_id);`
      );
      this.db.exec(
        `CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);`
      );
      this.db.exec(
        `CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(project_id);`
      );
      this.db.exec(
        `CREATE INDEX IF NOT EXISTS idx_project_api_keys_project_id ON project_api_keys(project_id);`
      );
      this.db.exec(
        `CREATE INDEX IF NOT EXISTS idx_project_sessions_project_id ON project_sessions(project_id);`
      );
      this.db.exec(
        `CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);`
      );
      this.db.exec(
        `CREATE INDEX IF NOT EXISTS idx_project_api_logs_project_id ON project_api_logs(project_id);`
      );

      // Create triggers for updated_at
      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_projects_timestamp 
        AFTER UPDATE ON projects
        BEGIN
          UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
      `);

      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_collections_timestamp 
        AFTER UPDATE ON collections
        BEGIN
          UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
      `);

      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_documents_timestamp 
        AFTER UPDATE ON documents
        BEGIN
          UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
      `);

      console.log("✅ Project database tables created successfully");
    } catch (error) {
      console.error("❌ Error creating project database tables:", error);
      throw error;
    }
  }

  private seedDefaultProject() {
    try {
      const projectCount = this.db
        .prepare("SELECT COUNT(*) as count FROM projects")
        .get() as { count: number };

      if (projectCount.count === 0) {
        const defaultProject: Project = {
          id: randomUUID(),
          name: "Default Project",
          description: "Default project created during initialization",
          domain: "localhost",
          settings: {
            auth: {
              enabled: true,
              methods: ["email"],
              oauth_providers: [],
              email_verification: false,
              phone_verification: false,
            },
            storage: {
              max_file_size: 10 * 1024 * 1024, // 10MB
              allowed_types: ["image/*", "application/pdf", "text/*"],
              compression: true,
            },
            api: {
              rate_limit: 1000,
              cors_origins: ["*"],
            },
            database: {
              max_collections: 100,
              max_documents_per_collection: 10000,
            },
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: "system",
          status: "active",
        };

        this.db
          .prepare(
            `
          INSERT INTO projects (id, name, description, domain, settings, created_at, updated_at, created_by, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
          )
          .run(
            defaultProject.id,
            defaultProject.name,
            defaultProject.description,
            defaultProject.domain,
            JSON.stringify(defaultProject.settings),
            defaultProject.created_at,
            defaultProject.updated_at,
            defaultProject.created_by,
            defaultProject.status
          );

        console.log("✅ Default project created successfully");
      }
    } catch (error) {
      console.error("❌ Error seeding default project:", error);
    }
  }

  // Project operations
  getAllProjects(): Project[] {
    const results = this.db
      .prepare("SELECT * FROM projects ORDER BY created_at DESC")
      .all() as any[];

    return results.map((project) => ({
      ...project,
      settings: JSON.parse(project.settings),
    }));
  }

  getProjectById(id: string): Project | null {
    const result = this.db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(id) as any;

    if (!result) return null;

    return {
      ...result,
      settings: JSON.parse(result.settings),
    };
  }

  createProject(
    project: Omit<Project, "id" | "created_at" | "updated_at"> & { id?: string }
  ): Project {
    const id = project.id || randomUUID();
    const now = new Date().toISOString();

    // Check if project with this ID already exists
    const existingProject = this.getProjectById(id);
    if (existingProject) {
      throw new Error(`Project with ID '${id}' already exists`);
    }

    this.db
      .prepare(
        `
      INSERT INTO projects (id, name, description, domain, settings, created_at, updated_at, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        project.name,
        project.description || null,
        project.domain || null,
        JSON.stringify(project.settings),
        now,
        now,
        project.created_by,
        project.status
      );

    return this.getProjectById(id)!;
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const current = this.getProjectById(id);
    if (!current) return null;

    const fields = [];
    const params = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push("description = ?");
      params.push(updates.description);
    }
    if (updates.domain !== undefined) {
      fields.push("domain = ?");
      params.push(updates.domain);
    }
    if (updates.settings !== undefined) {
      fields.push("settings = ?");
      params.push(JSON.stringify(updates.settings));
    }
    if (updates.status !== undefined) {
      fields.push("status = ?");
      params.push(updates.status);
    }

    if (fields.length === 0) return current;

    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    this.db
      .prepare(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);

    return this.getProjectById(id);
  }

  deleteProject(id: string): boolean {
    const result = this.db.prepare("DELETE FROM projects WHERE id = ?").run(id);
    return result.changes > 0;
  }

  // Collection operations
  getCollectionsByProject(projectId: string): Collection[] {
    const results = this.db
      .prepare(
        "SELECT * FROM collections WHERE project_id = ? ORDER BY created_at DESC"
      )
      .all(projectId) as any[];

    return results.map((collection) => ({
      ...collection,
      schema: JSON.parse(collection.schema),
      indexes: JSON.parse(collection.indexes),
      permissions: JSON.parse(collection.permissions),
    }));
  }

  getCollectionById(id: string): Collection | null {
    const result = this.db
      .prepare("SELECT * FROM collections WHERE id = ?")
      .get(id) as any;

    if (!result) return null;

    return {
      ...result,
      schema: JSON.parse(result.schema),
      indexes: JSON.parse(result.indexes),
      permissions: JSON.parse(result.permissions),
    };
  }

  createCollection(
    collection: Omit<
      Collection,
      "id" | "created_at" | "updated_at" | "document_count"
    >
  ): Collection {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT INTO collections (id, project_id, name, description, schema, indexes, permissions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        collection.project_id,
        collection.name,
        collection.description || null,
        JSON.stringify(collection.schema),
        JSON.stringify(collection.indexes),
        JSON.stringify(collection.permissions),
        now,
        now
      );

    return this.getCollectionById(id)!;
  }

  updateCollection(
    id: string,
    updates: Partial<Collection>
  ): Collection | null {
    const current = this.getCollectionById(id);
    if (!current) return null;

    const fields = [];
    const params = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push("description = ?");
      params.push(updates.description);
    }
    if (updates.schema !== undefined) {
      fields.push("schema = ?");
      params.push(JSON.stringify(updates.schema));
    }
    if (updates.indexes !== undefined) {
      fields.push("indexes = ?");
      params.push(JSON.stringify(updates.indexes));
    }
    if (updates.permissions !== undefined) {
      fields.push("permissions = ?");
      params.push(JSON.stringify(updates.permissions));
    }

    if (fields.length === 0) return current;

    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    this.db
      .prepare(`UPDATE collections SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);

    return this.getCollectionById(id);
  }

  deleteCollection(id: string): boolean {
    const result = this.db
      .prepare("DELETE FROM collections WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  // Document operations
  getDocumentsByCollection(
    collectionId: string,
    limit: number = 100,
    offset: number = 0
  ): Document[] {
    const results = this.db
      .prepare(
        `
      SELECT * FROM documents 
      WHERE collection_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `
      )
      .all(collectionId, limit, offset) as any[];

    return results.map((document) => ({
      ...document,
      data: JSON.parse(document.data),
    }));
  }

  getDocumentById(id: string): Document | null {
    const result = this.db
      .prepare("SELECT * FROM documents WHERE id = ?")
      .get(id) as any;

    if (!result) return null;

    return {
      ...result,
      data: JSON.parse(result.data),
    };
  }

  createDocument(
    document: Omit<Document, "id" | "created_at" | "updated_at">
  ): Document {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT INTO documents (id, collection_id, project_id, data, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        document.collection_id,
        document.project_id,
        JSON.stringify(document.data),
        now,
        now,
        document.created_by,
        document.updated_by
      );

    // Update document count
    this.db
      .prepare(
        `
      UPDATE collections 
      SET document_count = document_count + 1 
      WHERE id = ?
    `
      )
      .run(document.collection_id);

    return this.getDocumentById(id)!;
  }

  updateDocument(id: string, updates: Partial<Document>): Document | null {
    const current = this.getDocumentById(id);
    if (!current) return null;

    const fields = [];
    const params = [];

    if (updates.data !== undefined) {
      fields.push("data = ?");
      params.push(JSON.stringify(updates.data));
    }
    if (updates.updated_by !== undefined) {
      fields.push("updated_by = ?");
      params.push(updates.updated_by);
    }

    if (fields.length === 0) return current;

    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    this.db
      .prepare(`UPDATE documents SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);

    return this.getDocumentById(id);
  }

  deleteDocument(id: string): boolean {
    const document = this.getDocumentById(id);
    if (!document) return false;

    const result = this.db
      .prepare("DELETE FROM documents WHERE id = ?")
      .run(id);

    if (result.changes > 0) {
      // Update document count
      this.db
        .prepare(
          `
        UPDATE collections 
        SET document_count = document_count - 1 
        WHERE id = ?
      `
        )
        .run(document.collection_id);
    }

    return result.changes > 0;
  }

  // Project user operations
  getProjectUsers(projectId: string): ProjectUser[] {
    const results = this.db
      .prepare(
        "SELECT * FROM project_users WHERE project_id = ? ORDER BY created_at DESC"
      )
      .all(projectId) as any[];

    return results.map((user) => ({
      ...user,
      oauth_providers: JSON.parse(user.oauth_providers),
      preferences: JSON.parse(user.preferences),
      email_verified: Boolean(user.email_verified),
      phone_verified: Boolean(user.phone_verified),
    }));
  }

  getProjectUserById(id: string): ProjectUser | null {
    const result = this.db
      .prepare("SELECT * FROM project_users WHERE id = ?")
      .get(id) as any;

    if (!result) return null;

    return {
      ...result,
      oauth_providers: JSON.parse(result.oauth_providers),
      preferences: JSON.parse(result.preferences),
      email_verified: Boolean(result.email_verified),
      phone_verified: Boolean(result.phone_verified),
    };
  }

  getProjectUserByEmail(projectId: string, email: string): ProjectUser | null {
    const result = this.db
      .prepare("SELECT * FROM project_users WHERE project_id = ? AND email = ?")
      .get(projectId, email) as any;

    if (!result) return null;

    return {
      ...result,
      oauth_providers: JSON.parse(result.oauth_providers),
      preferences: JSON.parse(result.preferences),
      email_verified: Boolean(result.email_verified),
      phone_verified: Boolean(result.phone_verified),
    };
  }

  createProjectUser(
    user: Omit<ProjectUser, "id" | "created_at" | "updated_at">
  ): ProjectUser {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT INTO project_users (id, project_id, email, phone, name, avatar, status, email_verified, phone_verified, oauth_providers, preferences, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        user.project_id,
        user.email,
        user.phone || null,
        user.name || null,
        user.avatar || null,
        user.status,
        user.email_verified ? 1 : 0,
        user.phone_verified ? 1 : 0,
        JSON.stringify(user.oauth_providers),
        JSON.stringify(user.preferences),
        now,
        now
      );

    return this.getProjectUserById(id)!;
  }

  updateProjectUser(
    id: string,
    updates: Partial<ProjectUser>
  ): ProjectUser | null {
    const current = this.getProjectUserById(id);
    if (!current) return null;

    const fields = [];
    const params = [];

    if (updates.email !== undefined) {
      fields.push("email = ?");
      params.push(updates.email);
    }
    if (updates.phone !== undefined) {
      fields.push("phone = ?");
      params.push(updates.phone);
    }
    if (updates.name !== undefined) {
      fields.push("name = ?");
      params.push(updates.name);
    }
    if (updates.avatar !== undefined) {
      fields.push("avatar = ?");
      params.push(updates.avatar);
    }
    if (updates.status !== undefined) {
      fields.push("status = ?");
      params.push(updates.status);
    }
    if (updates.email_verified !== undefined) {
      fields.push("email_verified = ?");
      params.push(updates.email_verified ? 1 : 0);
    }
    if (updates.phone_verified !== undefined) {
      fields.push("phone_verified = ?");
      params.push(updates.phone_verified ? 1 : 0);
    }
    if (updates.oauth_providers !== undefined) {
      fields.push("oauth_providers = ?");
      params.push(JSON.stringify(updates.oauth_providers));
    }
    if (updates.preferences !== undefined) {
      fields.push("preferences = ?");
      params.push(JSON.stringify(updates.preferences));
    }
    if (updates.last_login !== undefined) {
      fields.push("last_login = ?");
      params.push(updates.last_login);
    }

    if (fields.length === 0) return current;

    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    this.db
      .prepare(`UPDATE project_users SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);

    return this.getProjectUserById(id);
  }

  deleteProjectUser(id: string): boolean {
    const result = this.db
      .prepare("DELETE FROM project_users WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  // API Key operations
  getProjectApiKeys(projectId: string): ProjectApiKey[] {
    const results = this.db
      .prepare(
        "SELECT * FROM project_api_keys WHERE project_id = ? ORDER BY created_at DESC"
      )
      .all(projectId) as any[];

    return results.map((key) => ({
      ...key,
      permissions: JSON.parse(key.permissions),
    }));
  }

  getProjectApiKeyByKey(key: string): ProjectApiKey | null {
    const result = this.db
      .prepare("SELECT * FROM project_api_keys WHERE key = ?")
      .get(key) as any;

    if (!result) return null;

    return {
      ...result,
      permissions: JSON.parse(result.permissions),
    };
  }

  createProjectApiKey(
    apiKey: Omit<ProjectApiKey, "id" | "created_at">
  ): ProjectApiKey {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT INTO project_api_keys (id, project_id, name, key, permissions, expires_at, created_at, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        apiKey.project_id,
        apiKey.name,
        apiKey.key,
        JSON.stringify(apiKey.permissions),
        apiKey.expires_at || null,
        now,
        apiKey.created_by,
        apiKey.status
      );

    return this.getProjectApiKeyByKey(apiKey.key)!;
  }

  updateProjectApiKey(
    id: string,
    updates: Partial<ProjectApiKey>
  ): ProjectApiKey | null {
    const current = this.db
      .prepare("SELECT * FROM project_api_keys WHERE id = ?")
      .get(id) as any;
    if (!current) return null;

    const fields = [];
    const params = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      params.push(updates.name);
    }
    if (updates.permissions !== undefined) {
      fields.push("permissions = ?");
      params.push(JSON.stringify(updates.permissions));
    }
    if (updates.expires_at !== undefined) {
      fields.push("expires_at = ?");
      params.push(updates.expires_at);
    }
    if (updates.last_used !== undefined) {
      fields.push("last_used = ?");
      params.push(updates.last_used);
    }
    if (updates.status !== undefined) {
      fields.push("status = ?");
      params.push(updates.status);
    }

    if (fields.length === 0) return this.getProjectApiKeyByKey(current.key);

    params.push(id);
    this.db
      .prepare(`UPDATE project_api_keys SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);

    return this.getProjectApiKeyByKey(current.key);
  }

  deleteProjectApiKey(id: string): boolean {
    const result = this.db
      .prepare("DELETE FROM project_api_keys WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  // Project stats
  getProjectStats(projectId: string): ProjectStats {
    const totalUsers = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM project_users WHERE project_id = ?"
      )
      .get(projectId) as { count: number };
    const totalDocuments = this.db
      .prepare("SELECT COUNT(*) as count FROM documents WHERE project_id = ?")
      .get(projectId) as { count: number };
    const totalCollections = this.db
      .prepare("SELECT COUNT(*) as count FROM collections WHERE project_id = ?")
      .get(projectId) as { count: number };
    const totalFiles = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM project_files WHERE project_id = ?"
      )
      .get(projectId) as { count: number };
    const storageUsed = this.db
      .prepare(
        "SELECT SUM(size) as total FROM project_files WHERE project_id = ?"
      )
      .get(projectId) as { total: number };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const apiRequestsToday = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM project_api_logs WHERE project_id = ? AND created_at >= ?"
      )
      .get(projectId, today.toISOString()) as { count: number };
    const apiRequestsTotal = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM project_api_logs WHERE project_id = ?"
      )
      .get(projectId) as { count: number };

    return {
      total_users: totalUsers.count,
      total_documents: totalDocuments.count,
      total_collections: totalCollections.count,
      total_files: totalFiles.count,
      storage_used: storageUsed.total || 0,
      api_requests_today: apiRequestsToday.count,
      api_requests_total: apiRequestsTotal.count,
    };
  }

  // API request tracking
  trackApiRequest(
    projectId: string,
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    apiKeyId?: string,
    ipAddress?: string,
    userAgent?: string
  ): void {
    try {
      this.db
        .prepare(
          `
        INSERT INTO project_api_logs (project_id, api_key_id, method, path, status_code, response_time, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          projectId,
          apiKeyId || null,
          method,
          path,
          statusCode,
          responseTime,
          ipAddress || null,
          userAgent || null
        );
    } catch (error) {
      console.error("Error tracking API request:", error);
    }
  }

  close() {
    this.db.close();
  }
}

export default new ProjectDatabaseService();
