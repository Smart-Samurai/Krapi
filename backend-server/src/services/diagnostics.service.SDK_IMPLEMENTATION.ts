/**
 * Diagnostics Service - SDK Implementation Template
 * 
 * This is a template for implementing the DiagnosticsService in the SDK.
 * Copy this to the SDK and adapt as needed for SDK architecture.
 * 
 * Key Requirements:
 * - MUST complete in < 1 second
 * - Each test MUST have individual timeout protection
 * - MUST return DiagnosticsResult format
 * - MUST never throw errors (always return result)
 */

import type { BackendSDK } from "@smartsamurai/krapi-sdk";

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

/**
 * Diagnostics Service
 * 
 * Fast, lightweight diagnostics system that runs quickly without hanging.
 * Performs essential health checks without relying on slow operations.
 * 
 * @class DiagnosticsService
 */
export class DiagnosticsService {
  private backendSDK: BackendSDK;
  // Add other dependencies as needed (e.g., DatabaseService, etc.)

  constructor(backendSDK: BackendSDK) {
    this.backendSDK = backendSDK;
    // Initialize other dependencies
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
        // TODO: Replace with SDK's database health check method
        // Example: const health = await this.backendSDK.database.checkHealth();
        // For now, use a simple query check
        const health = await this.checkDatabaseHealth();
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
        // TODO: Replace with SDK's database schema check method
        // Example: const health = await this.backendSDK.database.checkHealth();
        const health = await this.checkDatabaseHealth();
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

  /**
   * Check database health
   * 
   * TODO: Replace with SDK's database health check method
   * This is a placeholder that should be replaced with actual SDK method.
   * 
   * @private
   * @returns {Promise<{healthy: boolean; message: string; details?: {missingTables?: string[]}}>}
   */
  private async checkDatabaseHealth(): Promise<{
    healthy: boolean;
    message: string;
    details?: {
      missingTables?: string[];
    };
  }> {
    // TODO: Implement using SDK's database service
    // Example:
    // const dbService = this.backendSDK.database;
    // return await dbService.checkHealth();
    
    // Placeholder implementation
    return {
      healthy: true,
      message: "Database is healthy",
    };
  }
}

/**
 * Integration Example for SDK
 * 
 * Add this to BackendSDK class:
 * 
 * ```typescript
 * class BackendSDK {
 *   private diagnosticsService: DiagnosticsService;
 * 
 *   constructor(...) {
 *     // ... existing initialization ...
 *     this.diagnosticsService = new DiagnosticsService(this);
 *   }
 * 
 *   async runDiagnostics(): Promise<DiagnosticsResult> {
 *     return await this.diagnosticsService.runDiagnostics();
 *   }
 * }
 * ```
 * 
 * Or add to HealthService:
 * 
 * ```typescript
 * class HealthService {
 *   async runDiagnostics(): Promise<ApiResponse<DiagnosticsResult>> {
 *     const diagnosticsService = new DiagnosticsService(this.backendSDK);
 *     const result = await diagnosticsService.runDiagnostics();
 *     return {
 *       success: true,
 *       data: result
 *     };
 *   }
 * }
 * ```
 */


