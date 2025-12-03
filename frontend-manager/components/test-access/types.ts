/**
 * Test Access Component Types
 *
 * Shared types for test-access page components.
 *
 * @module components/test-access/types
 */

/**
 * Test Result Interface
 *
 * @interface TestResult
 * @property {string} name - Test name
 * @property {boolean} passed - Whether test passed
 * @property {string} [message] - Test message
 * @property {number} duration - Test duration in milliseconds
 * @property {string} [error] - Error message if failed
 */
export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  duration: number;
  error?: string;
}

/**
 * Test Suite Interface
 *
 * @interface TestSuite
 * @property {string} suite - Suite name
 * @property {TestResult[]} tests - Test results
 */
export interface TestSuite {
  suite: string;
  tests: TestResult[];
}

/**
 * Health Check Interface
 *
 * @interface HealthCheck
 * @property {boolean} healthy - Whether system is healthy
 * @property {string} message - Health message
 * @property {unknown} [details] - Additional details
 * @property {string} [version] - System version
 */
export interface HealthCheck {
  healthy: boolean;
  message: string;
  details?: unknown;
  version?: string;
}

/**
 * Diagnostic Result Interface
 *
 * @interface DiagnosticResult
 * @property {TestResult[]} tests - Test results
 * @property {Object} summary - Test summary
 * @property {number} summary.total - Total tests
 * @property {number} summary.passed - Passed tests
 * @property {number} summary.failed - Failed tests
 */
export interface DiagnosticResult {
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

/**
 * Test Project Interface
 *
 * Local type definition to avoid importing SDK in client
 */
export interface TestProject {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  settings?: Record<string, unknown>;
}

/**
 * Running State Interface
 *
 * Tracks which operations are currently running
 */
export interface RunningState {
  health: boolean;
  dbHealth: boolean;
  integration: boolean;
  diagnostics: boolean;
  testProject: boolean;
  cleanup: boolean;
}

