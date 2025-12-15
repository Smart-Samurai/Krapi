import { v4 as uuidv4 } from "uuid";

import { MultiDatabaseManager } from "../../multi-database-manager.service";
import { DatabaseCoreService } from "../core/database-core.service";
import { DatabaseMappersService } from "../database-mappers.service";

import { BackendSession } from "@/types";

/**
 * Session Service
 * 
 * Handles all session CRUD operations.
 * Sessions are stored in the main database.
 */
export class SessionService {
  constructor(
    private dbManager: MultiDatabaseManager,
    private core: DatabaseCoreService,
    private mappers: DatabaseMappersService
  ) {}

  /**
   * Create a new session
   */
  async createSession(
    data: Omit<BackendSession, "id" | "createdAt" | "lastActivity">
  ): Promise<BackendSession> {
    await this.core.ensureReady();
    
    // Generate session ID (SQLite doesn't support RETURNING *)
    const sessionId = uuidv4();

    // Insert into main DB
    await this.dbManager.queryMain(
      `INSERT INTO sessions (id, token, user_id, project_id, type, user_type, scopes, metadata, created_at, expires_at, consumed, is_active, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        sessionId,
        data.token,
        data.user_id,
        data.project_id || null,
        data.type || data.user_type,
        data.user_type || data.type,
        JSON.stringify(data.scopes ?? []), // SQLite stores arrays as JSON strings
        JSON.stringify(data.metadata ?? {}), // SQLite stores objects as JSON strings
        data.created_at || new Date().toISOString(),
        data.expires_at,
        data.consumed ? 1 : 0, // SQLite uses INTEGER 1/0 for booleans
        1, // is_active (SQLite uses INTEGER 1 for true)
        data.ip_address || null,
        data.user_agent || null,
      ]
    );

    // Query back the inserted row (SQLite doesn't support RETURNING *)
    const result = await this.dbManager.queryMain(
      "SELECT * FROM sessions WHERE id = $1",
      [sessionId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Failed to create session");
    }
    return this.mappers.mapSession(row as Record<string, unknown>);
  }

  /**
   * Get session by token
   */
  async getSessionByToken(token: string): Promise<BackendSession | null> {
    await this.core.ensureReady();
    
    // First, try to find session by token (without expiration check) for debugging
    const debugResult = await this.dbManager.queryMain(
      "SELECT * FROM sessions WHERE token = $1",
      [token]
    );

    const firstRow = debugResult.rows[0] as Record<string, unknown> | undefined;
    console.log("🔍 [DB DEBUG] getSessionByToken:", {
      tokenLength: token?.length,
      tokenPrefix: typeof token === "string" ? token.substring(0, 20) : "N/A",
      foundRows: debugResult.rows.length,
      rowData: firstRow
        ? {
            id: firstRow.id,
            token:
              typeof firstRow.token === "string"
                ? firstRow.token.substring(0, 20)
                : "N/A",
            is_active: firstRow.is_active,
            expires_at: firstRow.expires_at,
            consumed: firstRow.consumed,
            expiresInMs:
              typeof firstRow.expires_at === "string"
                ? new Date(firstRow.expires_at).getTime() - Date.now()
                : null,
          }
        : null,
    });

    // CRITICAL: SQLite stores expires_at as ISO string, so we need to compare with ISO string
    // Use datetime('now') to get current time in ISO format for comparison
    const result = await this.dbManager.queryMain(
      "SELECT * FROM sessions WHERE token = $1 AND is_active = 1 AND datetime(expires_at) > datetime('now')",
      [token]
    );

    if (result.rows.length === 0 && firstRow) {
      console.log("⚠️ [DB DEBUG] Session found but filtered out:", {
        is_active: firstRow.is_active,
        expires_at: firstRow.expires_at,
        expiresInMs:
          typeof firstRow.expires_at === "string"
            ? new Date(firstRow.expires_at).getTime() - Date.now()
            : null,
        currentTime: new Date().toISOString(),
      });
    }

    if (result.rows.length > 0) {
      // Update last activity
      await this.dbManager.queryMain(
        "UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1",
        [result.rows[0]?.id as string]
      );
      const row = result.rows[0];
      if (row) {
        return this.mappers.mapSession(row as Record<string, unknown>);
      }
    }

    return null;
  }

  /**
   * Invalidate session
   */
  async invalidateSession(token: string): Promise<boolean> {
    await this.core.ensureReady();
    
    const result = await this.dbManager.queryMain(
      "UPDATE sessions SET is_active = 0 WHERE token = $1",
      [token]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Consume session (mark as consumed)
   */
  async consumeSession(token: string): Promise<BackendSession | null> {
    await this.core.ensureReady();
    
    // Update in main DB
    await this.dbManager.queryMain(
      `UPDATE sessions 
       SET consumed = 1, consumed_at = CURRENT_TIMESTAMP 
       WHERE token = $1 AND consumed = 0`,
      [token]
    );

    // Query back the updated row
    const result = await this.dbManager.queryMain(
      "SELECT * FROM sessions WHERE token = $1",
      [token]
    );

    const row = result.rows[0];
    return row ? this.mappers.mapSession(row as Record<string, unknown>) : null;
  }

  /**
   * Update session
   */
  async updateSession(
    token: string,
    updates: { consumed?: boolean; last_activity?: boolean }
  ): Promise<BackendSession | null> {
    await this.core.ensureReady();
    
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (updates.consumed !== undefined) {
      setClauses.push(`consumed = $${paramCount++}`);
      values.push(updates.consumed ? 1 : 0); // SQLite uses INTEGER 1/0 for booleans
      if (updates.consumed) {
        setClauses.push(`consumed_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updates.last_activity) {
      setClauses.push(`last_activity = CURRENT_TIMESTAMP`);
    }

    if (setClauses.length === 0) {
      return this.getSessionByToken(token);
    }

    values.push(token);

    // SQLite doesn't support RETURNING *, so update and query back separately
    await this.dbManager.queryMain(
      `UPDATE sessions SET ${setClauses.join(", ")} WHERE token = $${paramCount}`,
      values
    );

    // Query back the updated row
    return this.getSessionByToken(token);
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<BackendSession | null> {
    await this.core.ensureReady();
    
    const result = await this.dbManager.queryMain(
      "SELECT * FROM sessions WHERE id = $1",
      [sessionId]
    );

    const row = result.rows[0];
    return row ? this.mappers.mapSession(row as Record<string, unknown>) : null;
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    await this.core.ensureReady();
    
    await this.dbManager.queryMain(
      "UPDATE sessions SET is_active = 0 WHERE user_id = $1",
      [userId]
    );
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    await this.core.ensureReady();
    
    const result = await this.dbManager.queryMain(
      "UPDATE sessions SET is_active = 0 WHERE datetime(expires_at) < datetime('now') AND is_active = 1",
      []
    );

    return result.rowCount ?? 0;
  }

  /**
   * Cleanup old sessions
   */
  async cleanupOldSessions(daysOld = 30): Promise<number> {
    await this.core.ensureReady();
    
    const result = await this.dbManager.queryMain(
      `DELETE FROM sessions WHERE datetime(created_at) < datetime('now', '-${daysOld} days')`,
      []
    );

    return result.rowCount ?? 0;
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(): Promise<BackendSession[]> {
    await this.core.ensureReady();
    
    const result = await this.dbManager.queryMain(
      "SELECT * FROM sessions WHERE is_active = 1 AND datetime(expires_at) > datetime('now') ORDER BY created_at DESC"
    );

    return result.rows.map((row) =>
      this.mappers.mapSession(row as Record<string, unknown>)
    );
  }
}








