import { DatabaseQueryExecutor } from '../adapter/database-query-executor';
import { SQLiteAdapter } from '../adapter/sqlite-adapter';

/**
 * Database Connection Pool
 *
 * Manages a pool of database connections for efficient reuse and resource management.
 */
export class DatabaseConnectionPool {
  private connections = new Map<string, {
    adapter: SQLiteAdapter;
    executor: DatabaseQueryExecutor;
    lastUsed: number;
    inUse: boolean;
  }>();
  private maxConnections = 10;
  private connectionTimeout = 30000; // 30 seconds

  /**
   * Get a connection from the pool
   */
  async getConnection(databasePath: string): Promise<DatabaseQueryExecutor> {
    const now = Date.now();

    // Check if we have an existing connection
    const existing = this.connections.get(databasePath);
    if (existing && !existing.inUse && (now - existing.lastUsed) < this.connectionTimeout) {
      existing.inUse = true;
      existing.lastUsed = now;
      return existing.executor;
    }

    // Create new connection if under limit
    if (this.connections.size < this.maxConnections) {
      const adapter = new SQLiteAdapter();
      await adapter.connect(databasePath);
      const executor = new DatabaseQueryExecutor(adapter);

      this.connections.set(databasePath, {
        adapter,
        executor,
        lastUsed: now,
        inUse: true,
      });

      return executor;
    }

    // Wait for an available connection
    return this.waitForAvailableConnection(databasePath);
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(databasePath: string): void {
    const connection = this.connections.get(databasePath);
    if (connection) {
      connection.inUse = false;
      connection.lastUsed = Date.now();
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    for (const [path, connection] of this.connections) {
      try {
        await connection.adapter.disconnect();
      } catch (error) {
        console.error(`Error closing connection for ${path}:`, error);
      }
    }
    this.connections.clear();
  }

  /**
   * Clean up expired connections
   */
  cleanup(): void {
    const now = Date.now();
    for (const [path, connection] of this.connections) {
      if (!connection.inUse && (now - connection.lastUsed) > this.connectionTimeout) {
        try {
          connection.adapter.disconnect();
          this.connections.delete(path);
        } catch (error) {
          console.error(`Error cleaning up connection for ${path}:`, error);
        }
      }
    }
  }

  /**
   * Wait for an available connection
   */
  private async waitForAvailableConnection(databasePath: string): Promise<DatabaseQueryExecutor> {
    return new Promise((resolve, reject) => {
      const checkConnection = () => {
        const connection = this.connections.get(databasePath);
        if (connection && !connection.inUse) {
          connection.inUse = true;
          connection.lastUsed = Date.now();
          resolve(connection.executor);
          return;
        }

        // Check again in 100ms
        setTimeout(checkConnection, 100);
      };

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Connection pool timeout'));
      }, 5000);

      checkConnection();
    });
  }

  /**
   * Get pool statistics
   */
  getStats(): { total: number; inUse: number; available: number } {
    let inUse = 0;
    for (const connection of this.connections.values()) {
      if (connection.inUse) inUse++;
    }

    return {
      total: this.connections.size,
      inUse,
      available: this.connections.size - inUse,
    };
  }
}







