import { DatabaseQueryExecutor } from "./database-query-executor";

/**
 * Database Health Checker
 *
 * Performs health checks on database integrity, performance,
 * and data consistency.
 */
export class DatabaseHealthChecker {
  constructor(private executor: DatabaseQueryExecutor) {}

  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: Record<string, unknown>;
  }> {
    const issues: string[] = [];
    const metrics: Record<string, unknown> = {};

    try {
      // Check database integrity
      const integrityResult = await this.checkIntegrity();
      metrics.integrity = integrityResult;

      if (!integrityResult.healthy) {
        issues.push(...integrityResult.issues);
      }

      // Check table structure
      const tableCheck = await this.checkTableStructure();
      metrics.tables = tableCheck;

      if (!tableCheck.healthy) {
        issues.push(...tableCheck.issues);
      }

      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics();
      metrics.performance = performanceMetrics;

      // Check data consistency
      const consistencyCheck = await this.checkDataConsistency();
      metrics.consistency = consistencyCheck;

      if (!consistencyCheck.healthy) {
        issues.push(...consistencyCheck.issues);
      }

      return {
        healthy: issues.length === 0,
        issues,
        metrics,
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [
          `Health check failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ],
        metrics: {},
      };
    }
  }

  /**
   * Check database integrity
   */
  private async checkIntegrity(): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    try {
      const result = await this.executor.selectOne("PRAGMA integrity_check");
      const resultObj = result as Record<string, unknown> | null;
      const healthy = resultObj?.integrity_check === "ok";

      return {
        healthy,
        issues: healthy ? [] : ["Database integrity check failed"],
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [
          `Integrity check error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ],
      };
    }
  }

  /**
   * Check table structure
   */
  private async checkTableStructure(): Promise<{
    healthy: boolean;
    issues: string[];
    tableCount: number;
  }> {
    try {
      const tables = await this.executor.getTableNames();
      const issues: string[] = [];

      // Check for required tables
      const requiredTables = ["admin_users", "projects", "sessions"];
      for (const requiredTable of requiredTables) {
        if (!tables.includes(requiredTable)) {
          issues.push(`Missing required table: ${requiredTable}`);
        }
      }

      return {
        healthy: issues.length === 0,
        issues,
        tableCount: tables.length,
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [
          `Table structure check error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ],
        tableCount: 0,
      };
    }
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(): Promise<{
    pageCount: number;
    pageSize: number;
    cacheSize: number;
    autoVacuum: number;
    synchronous: number;
  }> {
    const pageCountRes = (await this.executor.selectOne(
      "PRAGMA page_count"
    )) as Record<string, unknown> | null;
    const pageSizeRes = (await this.executor.selectOne(
      "PRAGMA page_size"
    )) as Record<string, unknown> | null;
    const cacheSizeRes = (await this.executor.selectOne(
      "PRAGMA cache_size"
    )) as Record<string, unknown> | null;
    const autoVacuumRes = (await this.executor.selectOne(
      "PRAGMA auto_vacuum"
    )) as Record<string, unknown> | null;
    const synchronousRes = (await this.executor.selectOne(
      "PRAGMA synchronous"
    )) as Record<string, unknown> | null;

    return {
      pageCount: (pageCountRes?.page_count as number) || 0,
      pageSize: (pageSizeRes?.page_size as number) || 0,
      cacheSize: (cacheSizeRes?.cache_size as number) || 0,
      autoVacuum: (autoVacuumRes?.auto_vacuum as number) || 0,
      synchronous: (synchronousRes?.synchronous as number) || 0,
    };
  }

  /**
   * Check data consistency
   */
  private async checkDataConsistency(): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check for orphaned records (example: sessions without users)
      const orphanedSessions = await this.executor.select(`
        SELECT COUNT(*) as count FROM sessions s
        LEFT JOIN admin_users u ON s.user_id = u.id
        WHERE u.id IS NULL
      `);

      const orphanedCount = (
        orphanedSessions[0] as Record<string, unknown> | undefined
      )?.count as number | undefined;
      if (orphanedCount && orphanedCount > 0) {
        issues.push(`Found ${orphanedCount} orphaned sessions`);
      }

      // Check for other consistency issues as needed

      return {
        healthy: issues.length === 0,
        issues,
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [
          `Data consistency check error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ],
      };
    }
  }
}
