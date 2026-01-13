import { Request, Response } from "express";


// Testing handlers
import { CheckSchemaHandler } from "./handlers/testing/check-schema.handler";
import { CleanupTestDataHandler } from "./handlers/testing/cleanup-test-data.handler";
import { CreateTestProjectHandler } from "./handlers/testing/create-test-project.handler";
import { DeleteTestProjectHandler } from "./handlers/testing/delete-test-project.handler";
import { GetTestProjectsHandler } from "./handlers/testing/get-test-projects.handler";
import { ResetTestDataHandler } from "./handlers/testing/reset-test-data.handler";
import { isTestingEnabled } from "./handlers/testing/testing-utils";

import {
  AuthenticatedRequest,
  ApiResponse,
} from "@/types";

/**
 * Testing Controller
 * 
 * Provides utilities for development and testing.
 * Simulates third-party applications that use the SDK to connect to Krapi Server.
 * 
 * CRITICAL ARCHITECTURE: This controller uses the REGULAR SDK (client mode),
 * NOT BackendSDK. It connects via HTTP to the frontend proxy (port 3498),
 * exactly like third-party applications do.
 * 
 * This ensures that:
 * - All functionality is accessible via HTTP/SDK
 * - Third-party apps can perform all operations
 * - The full request path is tested (Frontend -> Backend -> Database)
 * 
 * Only available in development mode or when ENABLE_TESTING is set to "true".
 * 
 * This controller now delegates to specialized handlers for core operations.
 * Additional handlers can be created incrementally for remaining operations.
 * 
 * @class TestingController
 * @example
 * const controller = new TestingController();
 * // Controller is ready to handle testing requests
 */
export class TestingController {
  // Handlers
  private createTestProjectHandler: CreateTestProjectHandler;
  private cleanupTestDataHandler: CleanupTestDataHandler;
  private getTestProjectsHandler: GetTestProjectsHandler;
  private deleteTestProjectHandler: DeleteTestProjectHandler;
  private resetTestDataHandler: ResetTestDataHandler;
  private checkSchemaHandler: CheckSchemaHandler;

  constructor() {
    // Initialize handlers
    this.createTestProjectHandler = new CreateTestProjectHandler();
    this.cleanupTestDataHandler = new CleanupTestDataHandler();
    this.getTestProjectsHandler = new GetTestProjectsHandler();
    this.deleteTestProjectHandler = new DeleteTestProjectHandler();
    this.resetTestDataHandler = new ResetTestDataHandler();
    this.checkSchemaHandler = new CheckSchemaHandler();
  }

  // Core operations - delegate to handlers
  createTestProject = async (req: Request, res: Response): Promise<void> => {
    await this.createTestProjectHandler.handle(req, res);
  };

  cleanup = async (req: Request, res: Response): Promise<void> => {
    await this.cleanupTestDataHandler.handle(req, res);
  };

  getTestProjects = async (req: Request, res: Response): Promise<void> => {
    await this.getTestProjectsHandler.handle(req, res);
  };

  deleteTestProject = async (req: Request, res: Response): Promise<void> => {
    await this.deleteTestProjectHandler.handle(req, res);
  };

  resetTestData = async (req: Request, res: Response): Promise<void> => {
    await this.resetTestDataHandler.handle(req, res);
  };

  checkSchema = async (req: Request, res: Response): Promise<void> => {
    await this.checkSchemaHandler.handle(req, res);
  };
  // seedData - Seed test data
  // runPerformanceTest - Performance testing
  // runLoadTest - Load testing

  /**
   * Run integration tests
   */
  runIntegrationTests = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isTestingEnabled()) {
        res.status(403).json({
          success: false,
          error: "Testing endpoints are not available in production",
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      const results: Array<{
        suite: string;
        tests: Array<{
          name: string;
          passed: boolean;
          duration: number;
          error?: string;
        }>;
      }> = [];
      const startTime = Date.now();

      // Test Suite 1: Project Operations
      const projectSuite: {
        suite: string;
        tests: Array<{
          name: string;
          passed: boolean;
          duration: number;
          error?: string;
        }>;
      } = {
        suite: "Project Operations",
        tests: [],
      };

      results.push(projectSuite);

      // Calculate summary
      let totalTests = 0;
      let passedTests = 0;
      let failedTests = 0;

      for (const suite of results) {
        for (const test of suite.tests) {
          totalTests++;
          if (test.passed) {
            passedTests++;
          } else {
            failedTests++;
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          results,
          summary: {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            duration: Date.now() - startTime,
          },
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Run integration tests error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to run integration tests",
      } as ApiResponse);
    }
  };

  /**
   * Run tests
   */
  runTests = async (req: Request, res: Response): Promise<void> => {
    console.log("🔍 [TESTING DEBUG] runTests called");
    try {
      if (!isTestingEnabled()) {
        console.log("❌ [TESTING DEBUG] Production mode - rejecting (set ENABLE_TESTING=true to allow)");
        res.status(403).json({
          success: false,
          error: "Testing endpoints are not available in production. Set ENABLE_TESTING=true to enable.",
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      console.log("🔍 [TESTING DEBUG] Current user:", currentUser ? currentUser.id : "null");

      if (!currentUser) {
        console.log("❌ [TESTING DEBUG] No current user");
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      const { testSuite } = req.body;
      console.log("🔍 [TESTING DEBUG] Running test suite:", testSuite || "all");

      // Run the specified test suite or all tests
      const results = await this.runTestSuite(testSuite || "all");
      console.log("✅ [TESTING DEBUG] Test suite completed, returning results");

      res.json({
        success: true,
        data: results,
      } as ApiResponse);
    } catch (error) {
      console.error("❌ [TESTING DEBUG] Error running tests:", error);
      res.status(500).json({
        success: false,
        error: "Failed to run tests",
      } as ApiResponse);
    }
  };

  /**
   * Run specific test scenario
   */
  runScenario = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isTestingEnabled()) {
        res.status(403).json({
          success: false,
          error: "Testing endpoints are not available in production",
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      const { scenarioName } = req.params;
      if (!scenarioName) {
        res.status(400).json({
          success: false,
          error: "Scenario name is required",
        } as ApiResponse);
        return;
      }
      const { options } = req.body;

      const results = await this.runTestScenario(scenarioName, options);

      res.json({
        success: true,
        data: results,
      } as ApiResponse);
    } catch (error) {
      console.error("Error running test scenario:", error);
      res.status(500).json({
        success: false,
        error: "Failed to run test scenario",
      } as ApiResponse);
    }
  };

  /**
   * Get available test scenarios
   */
  getAvailableScenarios = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!isTestingEnabled()) {
        res.status(403).json({
          success: false,
          error: "Testing endpoints are not available in production",
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      const scenarios = [
        "user_creation",
        "collection_operations",
        "document_crud",
        "api_key_management",
        "storage_operations",
        "email_sending",
        "performance_test",
        "load_test",
      ];

      res.json({
        success: true,
        data: scenarios,
      } as ApiResponse);
    } catch (error) {
      console.error("Error getting test scenarios:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get test scenarios",
      } as ApiResponse);
    }
  };

  /**
   * Seed data for testing
   */
  seedData = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isTestingEnabled()) {
        res.status(403).json({
          success: false,
          error: "Testing endpoints are not available in production",
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      const { projectId: _projectId } = req.params;
      const { seedType: _seedType, options: _options } = req.body;

      // Seed project data not implemented yet
      const result = { success: true, message: "Seeding not implemented" };

      res.json({
        success: true,
        data: result,
      } as ApiResponse);
    } catch (error) {
      console.error("Error seeding data:", error);
      res.status(500).json({
        success: false,
        error: "Failed to seed data",
      } as ApiResponse);
    }
  };

  /**
   * Run performance test
   */
  runPerformanceTest = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isTestingEnabled()) {
        res.status(403).json({
          success: false,
          error: "Testing endpoints are not available in production",
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      const { testConfig: _testConfig } = req.body;

      const results = await this.runPerformanceTestSuite(_testConfig);

      res.json({
        success: true,
        data: results,
      } as ApiResponse);
    } catch (error) {
      console.error("Error running performance test:", error);
      res.status(500).json({
        success: false,
        error: "Failed to run performance test",
      } as ApiResponse);
    }
  };

  /**
   * Run load test
   */
  runLoadTest = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isTestingEnabled()) {
        res.status(403).json({
          success: false,
          error: "Testing endpoints are not available in production",
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        } as ApiResponse);
        return;
      }

      const { testConfig: _testConfig } = req.body;

      const results = await this.runLoadTestSuite(_testConfig);

      res.json({
        success: true,
        data: results,
      } as ApiResponse);
    } catch (error) {
      console.error("Error running load test:", error);
      res.status(500).json({
        success: false,
        error: "Failed to run load test",
      } as ApiResponse);
    }
  };

  private async runTestSuite(_testSuite: string): Promise<unknown> {
    // Placeholder - actual implementation would run test suite
    return { success: true, message: "Test suite execution not fully implemented" };
  }

  private async runTestScenario(_scenarioName: string, _options?: unknown): Promise<unknown> {
    // Placeholder - actual implementation would run test scenario
    return { success: true, message: "Test scenario execution not fully implemented" };
  }

  private async runPerformanceTestSuite(_testConfig?: unknown): Promise<unknown> {
    // Placeholder - actual implementation would run performance tests
    return { success: true, message: "Performance test execution not fully implemented" };
  }

  private async runLoadTestSuite(_testConfig?: unknown): Promise<unknown> {
    // Placeholder - actual implementation would run load tests
    return { success: true, message: "Load test execution not fully implemented" };
  }
}
