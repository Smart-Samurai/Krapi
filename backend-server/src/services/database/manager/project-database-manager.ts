import * as fs from 'fs/promises';
import * as path from 'path';

import { DatabaseConnectionPool } from './database-connection-pool';

/**
 * Project Database Manager
 *
 * Manages project-specific databases including creation, initialization,
 * and database-specific operations.
 */
export class ProjectDatabaseManager {
  constructor(
    private connectionPool: DatabaseConnectionPool,
    private dataDir = './data'
  ) {}

  /**
   * Ensure project database exists and is initialized
   */
  async ensureProjectDatabase(projectId: string): Promise<void> {
    const dbPath = this.getProjectDatabasePath(projectId);

    // Create directory if it doesn't exist
    await this.ensureDirectoryExists(path.dirname(dbPath));

    // Check if database file exists
    try {
      await fs.access(dbPath);
    } catch {
      // Database doesn't exist, create it
      await this.createProjectDatabase(projectId);
    }
  }

  /**
   * Create a new project database with required tables
   */
  async createProjectDatabase(projectId: string): Promise<void> {
    const dbPath = this.getProjectDatabasePath(projectId);
    const executor = await this.connectionPool.getConnection(dbPath);

    try {
      // Create tables for project database
      await this.createProjectTables(executor);
      console.log(`✅ Created database for project: ${projectId}`);
    } finally {
      this.connectionPool.releaseConnection(dbPath);
    }
  }

  /**
   * Delete project database
   */
  async deleteProjectDatabase(projectId: string): Promise<void> {
    const dbPath = this.getProjectDatabasePath(projectId);

    // Close any existing connections
    this.connectionPool.releaseConnection(dbPath);

    try {
      await fs.unlink(dbPath);
      console.log(`🗑️ Deleted database for project: ${projectId}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * List all project database files
   */
  async listProjectDatabases(): Promise<string[]> {
    try {
      const projectsDir = path.join(this.dataDir, 'projects');
      const files = await fs.readdir(projectsDir);
      return files
        .filter(file => file.endsWith('.db'))
        .map(file => file.replace('.db', ''));
    } catch {
      return [];
    }
  }

  /**
   * Get project database path
   */
  private getProjectDatabasePath(projectId: string): string {
    return path.join(this.dataDir, 'projects', `${projectId}.db`);
  }

  /**
   * Create required tables for project database
   */
  private async createProjectTables(executor: { execute: Function }): Promise<void> {
    // Files table - SDK requires specific column names
    // CRITICAL: SDK inserts 'filename' but not 'name', so 'name' must be nullable
    await executor.execute(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT,
        filename TEXT,
        original_name TEXT,
        path TEXT,
        file_path TEXT,
        size INTEGER NOT NULL,
        file_size INTEGER,
        file_extension TEXT,
        mime_type TEXT NOT NULL,
        folder_id TEXT,
        storage_provider TEXT DEFAULT 'local',
        storage_path TEXT,
        storage_url TEXT,
        is_public BOOLEAN DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]',
        metadata TEXT,
        created_by TEXT,
        uploaded_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_accessed TEXT,
        access_count INTEGER DEFAULT 0,
        deleted_at TEXT,
        deleted_by TEXT
      )
    `);

    // File versions table
    await executor.execute(`
      CREATE TABLE IF NOT EXISTS file_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        changes_description TEXT,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      )
    `);

    // File permissions table
    await executor.execute(`
      CREATE TABLE IF NOT EXISTS file_permissions (
        file_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        permission TEXT NOT NULL,
        granted_at TEXT NOT NULL,
        PRIMARY KEY (file_id, user_id, permission),
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      )
    `);

    // File tags table
    await executor.execute(`
      CREATE TABLE IF NOT EXISTS file_tags (
        file_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        added_at TEXT NOT NULL,
        PRIMARY KEY (file_id, tag),
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      )
    `);

    // Folders table
    await executor.execute(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        parent_id TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Collections table
    await executor.execute(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        fields TEXT NOT NULL,
        indexes TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Documents table (dynamic, created per collection)
    // This will be created when collections are created

    // Create indexes
    await executor.execute(`CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id)`);
    await executor.execute(`CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id)`);
    await executor.execute(`CREATE INDEX IF NOT EXISTS idx_files_created_by ON files(created_by)`);
    await executor.execute(`CREATE INDEX IF NOT EXISTS idx_file_versions_file ON file_versions(file_id)`);
    await executor.execute(`CREATE INDEX IF NOT EXISTS idx_folders_project ON folders(project_id)`);
    await executor.execute(`CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id)`);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
}

