import { DatabaseQueue } from "../../database-queue.service";
import { MultiDatabaseManager } from "../../multi-database-manager.service";
import { SQLiteAdapter } from "../../sqlite-adapter.service";

/**
 * Database Core Service
 *
 * Handles singleton instance, connection management, and core database state.
 * This is the foundation that other database services depend on.
 */
export class DatabaseCoreService {
  private adapter: SQLiteAdapter;
  private dbManager: MultiDatabaseManager;
  private static instance: DatabaseCoreService;
  private _isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 10;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (error: Error) => void;
  private lastHealthCheck: Date | null = null;
  private queue: DatabaseQueue;
  private queueInitialized = false;

  /** Check if database is connected */
  isConnected(): boolean {
    return this._isConnected;
  }

  /** Set connection status */
  setConnected(value: boolean): void {
    this._isConnected = value;
  }

  private constructor() {
    // Create the ready promise
    this.readyPromise = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    // Initialize database queue
    this.queue = DatabaseQueue.getInstance();

    // Initialize multi-database manager
    const mainDbPath =
      process.env.DB_PATH || process.env.SQLITE_DB_PATH || undefined;
    const projectsDbDir = process.env.PROJECTS_DB_DIR || undefined;
    this.dbManager = new MultiDatabaseManager(mainDbPath, projectsDbDir);

    // SQLite database configuration (keep for backward compatibility)
    const dbPath = process.env.DB_PATH || process.env.SQLITE_DB_PATH;
    this.adapter = new SQLiteAdapter(dbPath);
  }

  /**
   * Get singleton instance of DatabaseCoreService
   */
  static getInstance(): DatabaseCoreService {
    if (!DatabaseCoreService.instance) {
      DatabaseCoreService.instance = new DatabaseCoreService();
    }
    return DatabaseCoreService.instance;
  }

  /**
   * Get the ready promise
   */
  getReadyPromise(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Resolve the ready promise
   */
  resolveReady(): void {
    this.readyResolve();
  }

  /**
   * Reject the ready promise
   */
  rejectReady(error: Error): void {
    this.readyReject(error);
  }

  /**
   * Wait for database to be ready
   */
  async waitForReady(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Get database connection adapter
   */
  async getConnection(): Promise<SQLiteAdapter> {
    return this.adapter;
  }

  /**
   * Get the database manager
   */
  getDbManager(): MultiDatabaseManager {
    return this.dbManager;
  }

  /**
   * Get the database queue
   */
  getQueue(): DatabaseQueue {
    return this.queue;
  }

  /**
   * Check if queue is initialized
   */
  isQueueInitialized(): boolean {
    return this.queueInitialized;
  }

  /**
   * Set queue initialized flag
   */
  setQueueInitialized(value: boolean): void {
    this.queueInitialized = value;
  }

  /**
   * Check if database is connected
   */
  checkConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Get connection attempts
   */
  getConnectionAttempts(): number {
    return this.connectionAttempts;
  }

  /**
   * Increment connection attempts
   */
  incrementConnectionAttempts(): void {
    this.connectionAttempts++;
  }

  /**
   * Get max connection attempts
   */
  getMaxConnectionAttempts(): number {
    return this.maxConnectionAttempts;
  }

  /**
   * Get last health check time
   */
  getLastHealthCheck(): Date | null {
    return this.lastHealthCheck;
  }

  /**
   * Set last health check time
   */
  setLastHealthCheck(date: Date | null): void {
    this.lastHealthCheck = date;
  }

  /**
   * Ensure database is ready before operations
   */
  async ensureReady(): Promise<void> {
    if (!this.isConnected()) {
      // In development mode, don't block on table creation
      if (process.env.NODE_ENV === "development") {
        console.log(
          "🚀 Development mode: Allowing operations while tables are being created"
        );
        return; // Don't wait for tables to be fully created
      }
      await this.waitForReady();
    }
  }
}
