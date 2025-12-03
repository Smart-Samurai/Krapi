import * as fs from "fs/promises";
import * as path from "path";

import { SQLiteAdapter } from "./sqlite-adapter";

/**
 * Database Connection Manager
 *
 * Manages database connections for main and project-specific databases.
 * Handles connection pooling, path resolution, and database initialization.
 */
export class DatabaseConnectionManager {
  private mainAdapter: SQLiteAdapter | null = null;
  private projectAdapters = new Map<string, SQLiteAdapter>();
  private dataDir: string;

  constructor(dataDir = "./data") {
    this.dataDir = dataDir;
  }

  /**
   * Get main database adapter
   */
  async getMainAdapter(): Promise<SQLiteAdapter> {
    if (!this.mainAdapter) {
      this.mainAdapter = new SQLiteAdapter();
      const dbPath = this.getMainDatabasePath();
      await this.ensureDirectoryExists(path.dirname(dbPath));
      await this.mainAdapter.connect(dbPath);
    }
    return this.mainAdapter;
  }

  /**
   * Get project database adapter
   */
  async getProjectAdapter(projectId: string): Promise<SQLiteAdapter> {
    if (!this.projectAdapters.has(projectId)) {
      const adapter = new SQLiteAdapter();
      const dbPath = this.getProjectDatabasePath(projectId);
      await this.ensureDirectoryExists(path.dirname(dbPath));
      await adapter.connect(dbPath);
      this.projectAdapters.set(projectId, adapter);
    }
    return this.projectAdapters.get(projectId)!;
  }

  /**
   * Close main database connection
   */
  async closeMainConnection(): Promise<void> {
    if (this.mainAdapter) {
      await this.mainAdapter.disconnect();
      this.mainAdapter = null;
    }
  }

  /**
   * Close project database connection
   */
  async closeProjectConnection(projectId: string): Promise<void> {
    const adapter = this.projectAdapters.get(projectId);
    if (adapter) {
      await adapter.disconnect();
      this.projectAdapters.delete(projectId);
    }
  }

  /**
   * Close all connections
   */
  async closeAllConnections(): Promise<void> {
    await this.closeMainConnection();
    for (const projectId of this.projectAdapters.keys()) {
      await this.closeProjectConnection(projectId);
    }
  }

  /**
   * Get main database path
   */
  private getMainDatabasePath(): string {
    return path.join(this.dataDir, "krapi.db");
  }

  /**
   * Get project database path
   */
  private getProjectDatabasePath(projectId: string): string {
    return path.join(this.dataDir, "projects", `${projectId}.db`);
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

  /**
   * Get connection status
   */
  getConnectionStatus(): { main: boolean; projects: Record<string, boolean> } {
    const projects: Record<string, boolean> = {};
    for (const [projectId, adapter] of this.projectAdapters) {
      projects[projectId] = adapter.isConnected;
    }

    return {
      main: this.mainAdapter?.isConnected || false,
      projects,
    };
  }
}
