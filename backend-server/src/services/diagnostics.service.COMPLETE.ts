/**
 * Diagnostics Service - Complete Implementation
 * 
 * This is the complete, production-ready diagnostics service.
 * Ready to be integrated into the SDK.
 * 
 * COPY THIS FILE TO THE SDK AND ADAPT AS NEEDED.
 */

import type { BackendSDK } from "@smartsamurai/krapi-sdk";

// ============================================================================
// TYPES
// ============================================================================

export interface DiagnosticTest {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

export interface DiagnosticsResult {
  tests: DiagnosticTest[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

interface DatabaseHealthResult {
  healthy: boolean;
  message: string;
  details?: {
    missingTables?: string[];
    error?: string;
  };
}

// ============================================================================
// DIAGNOSTICS SERVICE
// ============================================================================

/**
 * Diagnostics Service
 * 
 * Fast, lightweight diagnostics system that runs quickly without hanging.
 * Performs essential health checks without relying on slow SDK operations.
 * 
 * Performance Requirements:
 * - MUST complete in < 1 second
 * - Each test MUST have individual timeout protection
 * - MUST never throw errors (always return result)
 * 
 * @class DiagnosticsService
 */
export class DiagnosticsService {
  private backendSDK: BackendSDK;
  private getDatabaseHealth: () => Promise<DatabaseHealthResult>;

  /**
   * Create a new DiagnosticsService
   * 
   * @param {BackendSDK} backendSDK - BackendSDK instance
   * @param {() => Promise<DatabaseHealthResult>} getDatabaseHealth - Function to check database health
   */
  constructor(
    backendSDK: BackendSDK,
    getDatabaseHealth: () => Promise<DatabaseHealthResult>
  ) {
    this.backendSDK = backendSDK;
    this.getDatabaseHealth = getDatabaseHealth;
  }

  /**
   * Run fast diagnostics - completes in < 1 second
   * 
   * Performs essential health checks:
   * - Database connectivity (fast query)
   * - System resources (memory)
   * - SDK initialization status
   * - Database schema (critical tables)
   * 
   * All checks have individual timeouts to prevent hanging.
   * 
   * @returns {Promise<DiagnosticsResult>} Diagnostics results with tests and summary
   * 
   * @example
   * const diagnostics = await diagnosticsService.runDiagnostics();
   * console.log(`Passed: ${diagnostics.summary.passed}/${diagnostics.summary.total}`);
   */
  async runDiagnostics(): Promise<DiagnosticsResult> {
    const startTime = Date.now();
    const tests: DiagnosticTest[] = [];

    // Test 1: Database Connectivity (fast - should complete in < 100ms)
    await this.runTestWithTimeout(
      "Database Connectivity",
      async () => {
        const health = await this.getDatabaseHealth();
        if (!health.healthy) {
          throw new Error(health.message || "Database health check failed");
        }
        return `Database connected and healthy`;
      },
      500, // 500ms timeout
      tests
    );

    // Test 2: System Resources (instant - no async operations)
    await this.runTestWithTimeout(
      "System Resources",
      async () => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapLimitMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        const usagePercent = Math.round((heapUsedMB / heapLimitMB) * 100);

        if (usagePercent > 90) {
          throw new Error(`Critical memory usage: ${usagePercent}% (${heapUsedMB}MB / ${heapLimitMB}MB)`);
        } else if (usagePercent > 80) {
          return `High memory usage: ${usagePercent}% (${heapUsedMB}MB / ${heapLimitMB}MB)`;
        } else {
          return `Memory usage normal: ${usagePercent}% (${heapUsedMB}MB / ${heapLimitMB}MB)`;
        }
      },
      100, // 100ms timeout (should be instant)
      tests
    );

    // Test 3: SDK Initialization (fast - just check if SDK exists)
    await this.runTestWithTimeout(
      "SDK Initialization",
      async () => {
        if (!this.backendSDK) {
          throw new Error("BackendSDK not initialized");
        }
        // Quick check - just verify SDK is available
        // IMPORTANT: Don't call slow methods like getSettings() or runDiagnostics()
        // This would cause infinite recursion or hanging
        return "SDK initialized and available";
      },
      100, // 100ms timeout (should be instant)
      tests
    );

    // Test 4: Database Schema (fast - check critical tables exist)
    await this.runTestWithTimeout(
      "Database Schema",
      async () => {
        const health = await this.getDatabaseHealth();
        if (health.details?.missingTables && health.details.missingTables.length > 0) {
          throw new Error(`Missing critical tables: ${health.details.missingTables.join(", ")}`);
        }
        return "All critical tables exist";
      },
      500, // 500ms timeout
      tests
    );

    // Calculate summary
    const duration = Date.now() - startTime;
    const summary = {
      total: tests.length,
      passed: tests.filter((t) => t.passed).length,
      failed: tests.filter((t) => !t.passed).length,
      duration,
    };

    return { tests, summary };
  }

  /**
   * Run a single diagnostic test with timeout protection
   * 
   * This ensures no test can hang the entire diagnostics operation.
   * Each test has its own timeout, and if it exceeds, it's marked as failed.
   * 
   * @private
   * @param {string} name - Test name
   * @param {() => Promise<string>} testFn - Test function that returns success message
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {DiagnosticTest[]} tests - Array to append test result to
   */
  private async runTestWithTimeout(
    name: string,
    testFn: () => Promise<string>,
    timeoutMs: number,
    tests: DiagnosticTest[]
  ): Promise<void> {
    const testStart = Date.now();
    
    try {
      const result = await Promise.race([
        testFn(),
        new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error(`Test timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);

      tests.push({
        name,
        passed: true,
        message: result,
        duration: Date.now() - testStart,
      });
    } catch (error) {
      tests.push({
        name,
        passed: false,
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - testStart,
      });
    }
  }
}

// ============================================================================
// INTEGRATION EXAMPLES
// ============================================================================

/**
 * Example 1: Integrate into BackendSDK
 * 
 * ```typescript
 * import { DiagnosticsService } from './diagnostics.service';
 * 
 * class BackendSDK {
 *   private diagnosticsService: DiagnosticsService;
 * 
 *   constructor(...) {
 *     // ... existing initialization ...
 *     
 *     // Initialize diagnostics service
 *     this.diagnosticsService = new DiagnosticsService(
 *       this,
 *       async () => {
 *         // Use SDK's database service to check health
 *         return await this.database.checkHealth();
 *       }
 *     );
 *   }
 * 
 *   async runDiagnostics(): Promise<DiagnosticsResult> {
 *     return await this.diagnosticsService.runDiagnostics();
 *   }
 * }
 * ```
 */

/**
 * Example 2: Integrate into HealthService
 * 
 * ```typescript
 * import { DiagnosticsService } from './diagnostics.service';
 * 
 * class HealthService {
 *   constructor(private backendSDK: BackendSDK) {}
 * 
 *   async runDiagnostics(): Promise<ApiResponse<DiagnosticsResult>> {
 *     const diagnosticsService = new DiagnosticsService(
 *       this.backendSDK,
 *       async () => {
 *         // Use SDK's database service to check health
 *         return await this.backendSDK.database.checkHealth();
 *       }
 *     );
 *     
 *     const result = await diagnosticsService.runDiagnostics();
 *     return {
 *       success: true,
 *       data: result
 *     };
 *   }
 * }
 * ```
 */

/**
 * Example 3: Standalone usage
 * 
 * ```typescript
 * import { DiagnosticsService } from './diagnostics.service';
 * 
 * const diagnosticsService = new DiagnosticsService(
 *   backendSDK,
 *   async () => {
 *     // Custom database health check
 *     return await customDatabaseService.checkHealth();
 *   }
 * );
 * 
 * const result = await diagnosticsService.runDiagnostics();
 * console.log(`Diagnostics: ${result.summary.passed}/${result.summary.total} passed`);
 * ```
 */


