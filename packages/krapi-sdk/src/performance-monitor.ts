import { Logger } from "./core";

export interface PerformanceMetric {
  id: string;
  operation: string;
  collection_name?: string;
  duration_ms: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  records_processed: number;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface LoadTestResult {
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
  average_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  total_duration_ms: number;
  operations_per_second: number;
  memory_peak_mb: number;
  cpu_peak_percent: number;
  errors: string[];
}

export interface QueryPerformance {
  query: string;
  execution_time_ms: number;
  rows_returned: number;
  rows_scanned: number;
  index_usage: boolean;
  optimization_suggestions: string[];
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private startTime = 0;
  private memoryStart = 0;
  private initialized = false;

  constructor(
    private dbConnection: {
      query: (sql: string, params?: unknown[]) => Promise<{ rows?: unknown[] }>;
    },
    private logger: Logger = console
  ) {
    // Don't initialize in constructor - use lazy initialization
  }

  /**
   * Initialize performance monitoring tables
   */
  private async initializePerformanceTables(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Wait for essential tables to exist first
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        try {
          // Check if admin_users and projects tables exist
          const tablesCheck = await this.dbConnection.query(`
            SELECT 1 FROM information_schema.tables 
            WHERE table_name IN ('admin_users', 'projects') AND table_schema = 'public'
          `);

          if (tablesCheck.rows && tablesCheck.rows.length >= 2) {
            break; // Both tables exist, proceed
          }

          // Wait a bit and try again
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;
        } catch {
          // Table check failed, wait and try again
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      if (attempts >= maxAttempts) {
        this.logger.warn(
          "Essential tables not found after waiting, skipping performance table creation"
        );
        return;
      }

      // First check if uuid-ossp extension exists
      const extensionCheck = await this.dbConnection.query(`
        SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
      `);

      const hasUuidExtension =
        extensionCheck.rows && extensionCheck.rows.length > 0;
      const idDefault = hasUuidExtension
        ? "DEFAULT uuid_generate_v4()"
        : "DEFAULT gen_random_uuid()";

      // Create performance_metrics table
      await this.dbConnection.query(`
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id VARCHAR(255) PRIMARY KEY,
          operation_name VARCHAR(255) NOT NULL,
          operation_type VARCHAR(100),
          duration_ms INTEGER NOT NULL,
          memory_usage_mb DECIMAL(10,2),
          cpu_usage_percent DECIMAL(5,2),
          rows_affected INTEGER,
          success BOOLEAN DEFAULT true,
          error_message TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create query_performance table
      await this.dbConnection.query(`
        CREATE TABLE IF NOT EXISTS query_performance (
          id UUID PRIMARY KEY ${idDefault},
          query_hash VARCHAR(64) NOT NULL,
          query_text TEXT NOT NULL,
          execution_time_ms INTEGER NOT NULL,
          rows_returned INTEGER,
          rows_scanned INTEGER,
          index_usage BOOLEAN,
          cache_hit BOOLEAN,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create load_test_results table
      await this.dbConnection.query(`
        CREATE TABLE IF NOT EXISTS load_test_results (
          id UUID PRIMARY KEY ${idDefault},
          test_name VARCHAR(255) NOT NULL,
          concurrent_users INTEGER NOT NULL,
          total_requests INTEGER NOT NULL,
          successful_requests INTEGER NOT NULL,
          failed_requests INTEGER NOT NULL,
          average_response_time_ms DECIMAL(10,2),
          p95_response_time_ms DECIMAL(10,2),
          p99_response_time_ms DECIMAL(10,2),
          throughput_rps DECIMAL(10,2),
          memory_peak_mb DECIMAL(10,2),
          cpu_peak_percent DECIMAL(5,2),
          test_duration_seconds INTEGER,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create indexes
      await this.dbConnection.query(`
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation ON performance_metrics(operation_name)
      `);
      await this.dbConnection.query(`
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_created ON performance_metrics(created_at)
      `);
      await this.dbConnection.query(`
        CREATE INDEX IF NOT EXISTS idx_query_performance_hash ON query_performance(query_hash)
      `);
      await this.dbConnection.query(`
        CREATE INDEX IF NOT EXISTS idx_load_test_results_name ON load_test_results(test_name)
      `);

      this.initialized = true;
      this.logger.info("Performance monitoring tables initialized");
    } catch (error) {
      this.logger.error("Failed to initialize performance tables:", error);
      // Don't throw error, just log it - this service is not critical for basic functionality
    }
  }

  /**
   * Ensure tables are initialized before any operation
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializePerformanceTables();
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    this.startTime = Date.now();
    this.memoryStart = this.getMemoryUsage();
    this.logger.info("Performance monitoring started");
  }

  /**
   * Stop performance monitoring and get results
   */
  stopMonitoring(): {
    total_duration_ms: number;
    memory_used_mb: number;
    cpu_usage_percent: number;
  } {
    const totalDuration = Date.now() - this.startTime;
    const memoryUsed = this.getMemoryUsage() - this.memoryStart;
    const cpuUsage = this.getCPUUsage();

    this.logger.info(
      `Performance monitoring stopped. Duration: ${totalDuration}ms, Memory: ${memoryUsed}MB`
    );

    return {
      total_duration_ms: totalDuration,
      memory_used_mb: memoryUsed,
      cpu_usage_percent: cpuUsage,
    };
  }

  /**
   * Measure operation performance
   */
  async measureOperation<T>(
    operation: string,
    collectionName: string | undefined,
    operationFn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    await this.ensureInitialized();

    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();
    const startCPU = this.getCPUUsage();

    try {
      const result = await operationFn();
      const duration = Date.now() - startTime;
      const memoryUsed = this.getMemoryUsage() - startMemory;
      const cpuUsed = this.getCPUUsage() - startCPU;

      const metric: PerformanceMetric = {
        id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation,
        collection_name: collectionName,
        duration_ms: duration,
        memory_usage_mb: memoryUsed,
        cpu_usage_percent: cpuUsed,
        records_processed: 0, // This would need to be calculated based on the operation
        success: true,
        metadata,
        timestamp: new Date(),
      };

      await this.saveMetric(metric);
      this.metrics.push(metric);

      this.logger.info(`Operation '${operation}' completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const memoryUsed = this.getMemoryUsage() - startMemory;
      const cpuUsed = this.getCPUUsage() - startCPU;

      const metric: PerformanceMetric = {
        id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation,
        collection_name: collectionName,
        duration_ms: duration,
        memory_usage_mb: memoryUsed,
        cpu_usage_percent: cpuUsed,
        records_processed: 0,
        success: false,
        error_message: error instanceof Error ? error.message : "Unknown error",
        metadata,
        timestamp: new Date(),
      };

      await this.saveMetric(metric);
      this.metrics.push(metric);

      this.logger.error(
        `Operation '${operation}' failed after ${duration}ms:`,
        error
      );
      throw error;
    }
  }

  /**
   * Run load test with multiple concurrent operations
   */
  async runLoadTest(
    operation: string,
    collectionName: string | undefined,
    operationFn: () => Promise<unknown>,
    concurrency = 10,
    totalOperations = 100
  ): Promise<LoadTestResult> {
    await this.ensureInitialized();

    this.startMonitoring();
    const results: PerformanceMetric[] = [];
    const errors: string[] = [];

    this.logger.info(
      `Starting load test: ${totalOperations} operations with concurrency ${concurrency}`
    );

    // Create operation batches
    const batches: (() => Promise<void>)[] = [];
    for (let i = 0; i < totalOperations; i++) {
      batches.push(async () => {
        try {
          const result = await this.measureOperation(
            operation,
            collectionName,
            operationFn
          );
          results.push(result as PerformanceMetric);
        } catch (error) {
          errors.push(error instanceof Error ? error.message : "Unknown error");
        }
      });
    }

    // Execute batches with concurrency control
    const batchSize = Math.ceil(batches.length / concurrency);
    const batchPromises: Promise<void>[] = [];

    for (let i = 0; i < concurrency; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, batches.length);
      const batch = batches.slice(start, end);

      batchPromises.push(
        Promise.all(batch.map((operation) => operation())).then(() => {})
      );
    }

    await Promise.all(batchPromises);

    const _monitoringResults = this.stopMonitoring();
    const successfulOperations = results.filter((r) => r.success).length;
    const failedOperations = results.filter((r) => !r.success).length;

    const durations = results.map((r) => r.duration_ms);
    const averageDuration =
      durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const totalDuration = results.reduce((sum, r) => sum + r.duration_ms, 0);

    const operationsPerSecond = successfulOperations / (totalDuration / 1000);

    const memoryPeak = Math.max(...results.map((r) => r.memory_usage_mb));
    const cpuPeak = Math.max(...results.map((r) => r.cpu_usage_percent));

    const loadTestResult: LoadTestResult = {
      total_operations: totalOperations,
      successful_operations: successfulOperations,
      failed_operations: failedOperations,
      average_duration_ms: averageDuration,
      min_duration_ms: minDuration,
      max_duration_ms: maxDuration,
      total_duration_ms: totalDuration,
      operations_per_second: operationsPerSecond,
      memory_peak_mb: memoryPeak,
      cpu_peak_percent: cpuPeak,
      errors,
    };

    this.logger.info("Load test completed:", loadTestResult);
    return loadTestResult;
  }

  /**
   * Analyze query performance
   */
  async analyzeQueryPerformance(
    query: string,
    params: unknown[] = []
  ): Promise<QueryPerformance> {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      // Execute the query
      const result = await this.dbConnection.query(query, params);
      const executionTime = Date.now() - startTime;

      const rowsReturned = result.rows?.length || 0;
      const rowsScanned = this.estimateRowsScanned(query);
      const indexUsage = this.detectIndexUsage(query);
      const optimizationSuggestions = this.generateOptimizationSuggestions(
        query,
        executionTime,
        rowsReturned,
        rowsScanned
      );

      return {
        query,
        execution_time_ms: executionTime,
        rows_returned: rowsReturned,
        rows_scanned: rowsScanned,
        index_usage: indexUsage,
        optimization_suggestions: optimizationSuggestions,
      };
    } catch (error) {
      this.logger.error("Failed to analyze query performance:", error);
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(
    days = 30,
    operation?: string,
    collectionName?: string
  ): Promise<{
    total_operations: number;
    average_duration_ms: number;
    success_rate: number;
    top_slow_operations: Array<{ operation: string; avg_duration: number }>;
    memory_usage_trend: Array<{ date: string; avg_memory: number }>;
    cpu_usage_trend: Array<{ date: string; avg_cpu: number }>;
  }> {
    await this.ensureInitialized();

    try {
      let whereClause = "WHERE created_at >= NOW() - INTERVAL '1 day' * $1";
      const params: unknown[] = [days];
      let paramIndex = 1;

      if (operation) {
        paramIndex++;
        whereClause += ` AND operation_name = $${paramIndex}`;
        params.push(operation);
      }

      if (collectionName) {
        paramIndex++;
        whereClause += ` AND operation_name = $${paramIndex}`;
        params.push(collectionName);
      }

      // Total operations and success rate
      const statsResult = await this.dbConnection.query(
        `
        SELECT 
          COUNT(*) as total_operations,
          AVG(duration_ms) as avg_duration,
          COUNT(CASE WHEN success THEN 1 END) as successful_operations
        FROM performance_metrics ${whereClause}
      `,
        params
      );

      const stats = statsResult.rows?.[0] as Record<string, unknown>;
      const totalOperations = parseInt(
        (stats.total_operations as string) || "0"
      );
      const averageDuration = parseFloat(stats.avg_duration as string) || 0;
      const successRate =
        totalOperations > 0
          ? (parseInt((stats.successful_operations as string) || "0") /
              totalOperations) *
            100
          : 0;

      // Top slow operations
      const slowOpsResult = await this.dbConnection.query(
        `
        SELECT operation_name, AVG(duration_ms) as avg_duration
        FROM performance_metrics ${whereClause}
        GROUP BY operation_name
        ORDER BY avg_duration DESC
        LIMIT 10
      `,
        params
      );

      const topSlowOperations = (slowOpsResult.rows || []).map(
        (row: Record<string, unknown>) => ({
          operation: row.operation_name as string,
          avg_duration: parseFloat(row.avg_duration as string),
        })
      );

      // Memory usage trend
      const memoryResult = await this.dbConnection.query(
        `
        SELECT 
          DATE(created_at) as date,
          AVG(memory_usage_mb) as avg_memory
        FROM performance_metrics ${whereClause}
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
        params
      );

      const memoryUsageTrend = (memoryResult.rows || []).map(
        (row: Record<string, unknown>) => ({
          date: row.date as string,
          avg_memory: parseFloat(row.avg_memory as string),
        })
      );

      // CPU usage trend
      const cpuResult = await this.dbConnection.query(
        `
        SELECT 
          DATE(created_at) as date,
          AVG(cpu_usage_percent) as avg_cpu
        FROM performance_metrics ${whereClause}
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
        params
      );

      const cpuUsageTrend = (cpuResult.rows || []).map(
        (row: Record<string, unknown>) => ({
          date: row.date as string,
          avg_cpu: parseFloat(row.avg_cpu as string),
        })
      );

      return {
        total_operations: totalOperations,
        average_duration_ms: averageDuration,
        success_rate: successRate,
        top_slow_operations: topSlowOperations,
        memory_usage_trend: memoryUsageTrend,
        cpu_usage_trend: cpuUsageTrend,
      };
    } catch (error) {
      this.logger.error("Failed to get performance statistics:", error);
      throw error;
    }
  }

  /**
   * Clean old performance metrics
   */
  async cleanOldMetrics(daysToKeep = 90): Promise<number> {
    await this.ensureInitialized();

    try {
      const result = await this.dbConnection.query(
        `
        DELETE FROM performance_metrics 
        WHERE created_at < NOW() - INTERVAL '1 day' * $1
      `,
        [daysToKeep]
      );

      const deletedCount = (result as { rowCount?: number }).rowCount || 0;
      this.logger.info(`Cleaned ${deletedCount} old performance metrics`);

      return deletedCount;
    } catch (error) {
      this.logger.error("Failed to clean old performance metrics:", error);
      throw error;
    }
  }

  /**
   * Save performance metric to database
   */
  private async saveMetric(metric: PerformanceMetric): Promise<void> {
    try {
      await this.dbConnection.query(
        `
        INSERT INTO performance_metrics (
          id, operation_name, duration_ms, memory_usage_mb,
          cpu_usage_percent, success, error_message, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          metric.id,
          metric.operation,
          metric.duration_ms,
          metric.memory_usage_mb,
          metric.cpu_usage_percent,
          metric.success,
          metric.error_message,
          JSON.stringify(metric.metadata || {}),
        ]
      );
    } catch (error) {
      this.logger.error("Failed to save performance metric:", error);
    }
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    if (typeof process !== "undefined" && process.memoryUsage) {
      return (
        Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100
      );
    }
    return 0;
  }

  /**
   * Get current CPU usage percentage
   */
  private getCPUUsage(): number {
    // This is a simplified CPU usage calculation
    // In a real implementation, you'd want to use system monitoring tools
    return Math.random() * 100; // Placeholder
  }

  /**
   * Estimate rows scanned based on query complexity
   */
  private estimateRowsScanned(query: string): number {
    // This is a simplified estimation
    // In a real implementation, you'd analyze the query plan
    const complexity = query.toLowerCase().includes("where") ? 2 : 1;
    return Math.floor(Math.random() * 1000 * complexity);
  }

  /**
   * Detect if query uses indexes
   */
  private detectIndexUsage(query: string): boolean {
    // This is a simplified detection
    // In a real implementation, you'd analyze the query plan
    return (
      query.toLowerCase().includes("where") &&
      (query.toLowerCase().includes("id") ||
        query.toLowerCase().includes("name"))
    );
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    query: string,
    executionTime: number,
    rowsReturned: number,
    rowsScanned: number
  ): string[] {
    const suggestions: string[] = [];

    if (executionTime > 100) {
      suggestions.push(
        "Query execution time is high. Consider adding indexes on frequently queried columns."
      );
    }

    if (rowsScanned > rowsReturned * 10) {
      suggestions.push(
        "Query scans many more rows than returned. Consider adding WHERE clauses or indexes."
      );
    }

    if (query.toLowerCase().includes("select *")) {
      suggestions.push(
        "Avoid SELECT *. Specify only needed columns to reduce data transfer."
      );
    }

    if (
      query.toLowerCase().includes("order by") &&
      !query.toLowerCase().includes("limit")
    ) {
      suggestions.push(
        "ORDER BY without LIMIT can be expensive. Consider adding LIMIT clause."
      );
    }

    return suggestions;
  }
}
