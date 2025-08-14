/**
 * Testing Service for KRAPI SDK
 *
 * Provides testing utilities, health checks, and development helpers.
 */

import { DatabaseConnection, Logger } from "./core";

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
  details?: Record<string, unknown>;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  totalPassed: number;
  totalFailed: number;
  duration: number;
  success: boolean;
}

export interface DatabaseTestResult {
  connection: boolean;
  tables: boolean;
  indexes: boolean;
  constraints: boolean;
  performance: boolean;
  details: Record<string, unknown>;
}

export interface EndpointTestResult {
  endpoint: string;
  method: string;
  status: number;
  responseTime: number;
  success: boolean;
  error?: string;
}

export class TestingService {
  private db: DatabaseConnection;
  private logger: Logger;

  constructor(databaseConnection: DatabaseConnection, logger: Logger) {
    this.db = databaseConnection;
    this.logger = logger;
  }

  // Database Testing
  async runDatabaseTests(): Promise<TestSuite> {
    const startTime = Date.now();
    const tests: TestResult[] = [];

    // Test database connection
    tests.push(await this.testDatabaseConnection());

    // Test required tables
    tests.push(await this.testRequiredTables());

    // Test database performance
    tests.push(await this.testDatabasePerformance());

    // Test data integrity
    tests.push(await this.testDataIntegrity());

    const endTime = Date.now();
    const totalPassed = tests.filter((t) => t.passed).length;
    const totalFailed = tests.length - totalPassed;

    return {
      name: "Database Tests",
      tests,
      totalPassed,
      totalFailed,
      duration: endTime - startTime,
      success: totalFailed === 0,
    };
  }

  private async testDatabaseConnection(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      await this.db.query("SELECT 1 as test");
      return {
        name: "Database Connection",
        passed: true,
        message: "Database connection successful",
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: "Database Connection",
        passed: false,
        message: `Database connection failed: ${error}`,
        duration: Date.now() - startTime,
        details: { error },
      };
    }
  }

  private async testRequiredTables(): Promise<TestResult> {
    const startTime = Date.now();
    const requiredTables = [
      "admin_users",
      "projects",
      "collections",
      "documents",
      "api_keys",
      "sessions",
      "files",
      "changelog",
    ];

    try {
      const missingTables = [];

      for (const table of requiredTables) {
        const result = await this.db.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
          [table]
        );
        const exists = (result.rows[0] as { exists: boolean }).exists;
        if (!exists) {
          missingTables.push(table);
        }
      }

      const passed = missingTables.length === 0;
      return {
        name: "Required Tables",
        passed,
        message: passed
          ? "All required tables exist"
          : `Missing tables: ${missingTables.join(", ")}`,
        duration: Date.now() - startTime,
        details: { missingTables, requiredTables },
      };
    } catch (error) {
      return {
        name: "Required Tables",
        passed: false,
        message: `Failed to check tables: ${error}`,
        duration: Date.now() - startTime,
        details: { error },
      };
    }
  }

  private async testDatabasePerformance(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Test simple query performance
      const perfStart = Date.now();
      await this.db.query("SELECT COUNT(*) FROM admin_users");
      const queryTime = Date.now() - perfStart;

      const passed = queryTime < 1000; // Should complete within 1 second
      return {
        name: "Database Performance",
        passed,
        message: passed
          ? `Query completed in ${queryTime}ms`
          : `Query too slow: ${queryTime}ms`,
        duration: Date.now() - startTime,
        details: { queryTime, threshold: 1000 },
      };
    } catch (error) {
      return {
        name: "Database Performance",
        passed: false,
        message: `Performance test failed: ${error}`,
        duration: Date.now() - startTime,
        details: { error },
      };
    }
  }

  private async testDataIntegrity(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      // Check for orphaned records, constraint violations, etc.
      const issues = [];

      // Check for projects without valid admin owners
      const orphanedProjectsResult = await this.db.query(`
        SELECT COUNT(*) as count 
        FROM projects p 
        LEFT JOIN admin_users a ON p.created_by = a.id 
        WHERE a.id IS NULL AND p.created_by IS NOT NULL
      `);
      const orphanedProjects = parseInt(
        (orphanedProjectsResult.rows[0] as { count: string }).count
      );
      if (orphanedProjects > 0) {
        issues.push(`${orphanedProjects} projects with invalid owners`);
      }

      // Check for collections without valid projects
      const orphanedCollectionsResult = await this.db.query(`
        SELECT COUNT(*) as count 
        FROM collections c 
        LEFT JOIN projects p ON c.project_id = p.id 
        WHERE p.id IS NULL
      `);
      const orphanedCollections = parseInt(
        (orphanedCollectionsResult.rows[0] as { count: string }).count
      );
      if (orphanedCollections > 0) {
        issues.push(
          `${orphanedCollections} collections without valid projects`
        );
      }

      const passed = issues.length === 0;
      return {
        name: "Data Integrity",
        passed,
        message: passed
          ? "No data integrity issues found"
          : `Issues found: ${issues.join(", ")}`,
        duration: Date.now() - startTime,
        details: { issues, orphanedProjects, orphanedCollections },
      };
    } catch (error) {
      return {
        name: "Data Integrity",
        passed: false,
        message: `Data integrity test failed: ${error}`,
        duration: Date.now() - startTime,
        details: { error },
      };
    }
  }

  // API Endpoint Testing (for integration tests)
  async testEndpoint(
    baseUrl: string,
    endpoint: string,
    method = "GET",
    headers?: Record<string, string>,
    body?: unknown
  ): Promise<EndpointTestResult> {
    const startTime = Date.now();

    try {
      // Use built-in fetch or node-fetch fallback
      let fetchFn: any;
      if (globalThis.fetch) {
        fetchFn = globalThis.fetch;
      } else {
        try {
          const nodeFetch = await import("node-fetch" as any);
          fetchFn = nodeFetch.default;
        } catch {
          throw new Error(
            "No fetch implementation available. Install node-fetch for Node.js environments."
          );
        }
      }
      const url = `${baseUrl}${endpoint}`;
      const options: any = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      };

      if (
        body &&
        (method === "POST" || method === "PUT" || method === "PATCH")
      ) {
        options.body = JSON.stringify(body);
      }

      const response = await fetchFn(url, options);
      const responseTime = Date.now() - startTime;

      return {
        endpoint,
        method,
        status: response.status,
        responseTime,
        success: response.status >= 200 && response.status < 300,
      };
    } catch (error) {
      return {
        endpoint,
        method,
        status: 0,
        responseTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Test Suite Runner
  async runFullTestSuite(): Promise<{
    database: TestSuite;
    summary: {
      totalTests: number;
      totalPassed: number;
      totalFailed: number;
      duration: number;
      success: boolean;
    };
  }> {
    const startTime = Date.now();

    // Run database tests
    const database = await this.runDatabaseTests();

    // Calculate summary
    const totalTests = database.tests.length;
    const totalPassed = database.totalPassed;
    const totalFailed = database.totalFailed;
    const duration = Date.now() - startTime;
    const success = totalFailed === 0;

    return {
      database,
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        duration,
        success,
      },
    };
  }

  // Development helpers
  async generateTestData(projectId?: string): Promise<{
    success: boolean;
    created: {
      collections: number;
      documents: number;
      users: number;
      files: number;
    };
  }> {
    try {
      let collections = 0;
      let documents = 0;
      let users = 0;
      const files = 0;

      // If no project ID provided, create a test project
      let testProjectId = projectId;
      if (!testProjectId) {
        const projectResult = await this.db.query(
          "INSERT INTO projects (name, description, created_by) VALUES ($1, $2, $3) RETURNING id",
          ["Test Project", "Generated test project", "system"]
        );
        testProjectId = (projectResult.rows[0] as { id: string }).id;
      }

      // Create test collections
      for (let i = 1; i <= 3; i++) {
        await this.db.query(
          "INSERT INTO collections (project_id, name, description, schema) VALUES ($1, $2, $3, $4)",
          [
            testProjectId,
            `test_collection_${i}`,
            `Test collection ${i}`,
            JSON.stringify({
              fields: [
                { name: "title", type: "string", required: true },
                { name: "description", type: "text", required: false },
                { name: "status", type: "string", required: false },
              ],
            }),
          ]
        );
        collections++;

        // Create test documents for each collection
        for (let j = 1; j <= 5; j++) {
          await this.db.query(
            `INSERT INTO documents (collection_id, project_id, data, created_by) 
             VALUES ((SELECT id FROM collections WHERE name = $1), $2, $3, $4)`,
            [
              `test_collection_${i}`,
              testProjectId,
              JSON.stringify({
                title: `Test Document ${j}`,
                description: `This is test document ${j} in collection ${i}`,
                status: j % 2 === 0 ? "active" : "draft",
              }),
              "system",
            ]
          );
          documents++;
        }
      }

      // Create test users
      for (let i = 1; i <= 5; i++) {
        await this.db.query(
          "INSERT INTO project_users (project_id, email, username, role, is_active) VALUES ($1, $2, $3, $4, $5)",
          [
            testProjectId,
            `test.user${i}@example.com`,
            `testuser${i}`,
            i === 1 ? "admin" : "member",
            true,
          ]
        );
        users++;
      }

      return {
        success: true,
        created: {
          collections,
          documents,
          users,
          files, // Files would need file system integration
        },
      };
    } catch (error) {
      this.logger.error("Failed to generate test data:", error);
      throw new Error("Failed to generate test data");
    }
  }

  async cleanupTestData(
    projectId?: string
  ): Promise<{ success: boolean; deleted: number }> {
    try {
      let deleted = 0;

      if (projectId) {
        // Delete specific project's test data
        const result = await this.db.query(
          "DELETE FROM projects WHERE id = $1 AND name LIKE 'Test%'",
          [projectId]
        );
        deleted = result.rowCount || 0;
      } else {
        // Delete all test data
        const results = await Promise.all([
          this.db.query("DELETE FROM projects WHERE name LIKE 'Test%'"),
          this.db.query("DELETE FROM collections WHERE name LIKE 'test_%'"),
          this.db.query(
            "DELETE FROM project_users WHERE email LIKE 'test.%@example.com'"
          ),
        ]);
        deleted = results.reduce(
          (sum: number, result) => sum + (result.rowCount || 0),
          0
        );
      }

      return { success: true, deleted };
    } catch (error) {
      this.logger.error("Failed to cleanup test data:", error);
      throw new Error("Failed to cleanup test data");
    }
  }
}
