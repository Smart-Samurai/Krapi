/**
 * Diagnostics Service
 * 
 * Fast, lightweight diagnostics system that runs quickly without hanging.
 * Performs essential health checks without relying on slow SDK operations.
 */

import { BackendSDK } from "@smartsamurai/krapi-sdk";

import { DatabaseService } from "./database.service";

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

export class DiagnosticsService {
  private backendSDK: BackendSDK;
  private databaseService: DatabaseService;

  constructor(backendSDK: BackendSDK) {
    this.backendSDK = backendSDK;
    this.databaseService = DatabaseService.getInstance();
  }

  /**
   * Run fast diagnostics - completes in < 1 second
   * 
   * Performs essential health checks:
   * - Database connectivity (fast query)
   * - System resources (memory)
   * - SDK initialization status
   * 
   * All checks have individual timeouts to prevent hanging.
   */
  async runDiagnostics(): Promise<DiagnosticsResult> {
    const startTime = Date.now();
    const tests: DiagnosticTest[] = [];

    // Test 1: Database Connectivity (fast - should complete in < 100ms)
    await this.runTestWithTimeout(
      "Database Connectivity",
      async () => {
        const health = await this.databaseService.checkHealth();
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
        // Don't call slow methods like getSettings()
        return "SDK initialized and available";
      },
      100, // 100ms timeout (should be instant)
      tests
    );

    // Test 4: Database Tables (fast - check critical tables exist)
    await this.runTestWithTimeout(
      "Database Schema",
      async () => {
        const health = await this.databaseService.checkHealth();
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

