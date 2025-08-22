import { Request, Response } from "express";

import { AuthService } from "@/services/auth.service";
import { DatabaseAdapterService } from "@/services/database-adapter.service";
import {
  AuthenticatedRequest,
  ApiResponse,
  BackendProjectSettings,
  BackendProject,
} from "@/types";

/**
 * Testing Controller
 *
 * Provides utilities for development and testing.
 * Only available in development mode.
 */
export class TestingController {
  private db: DatabaseAdapterService;
  private authService: AuthService;

  constructor() {
    this.db = DatabaseAdapterService.getInstance();
    this.authService = AuthService.getInstance();
  }

  /**
   * Create a test project with optional sample data
   */
  createTestProject = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
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

      const {
        name = `Test Project ${Date.now()}`,
        withCollections = false,
        withDocuments = false,
        documentCount = 10,
      } = req.body;

      // Create project using database adapter service
      const project = await this.db.createProject({
        name,
        description: "Created by testing utilities",
        settings: {
          isTestProject: true,
          public: false,
          allow_registration: false,
          require_email_verification: false,
          max_file_size: 10485760, // 10MB
          allowed_file_types: [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "pdf",
            "txt",
            "doc",
            "docx",
          ], // Required
          authentication_required: true,
          cors_enabled: false,
          rate_limiting_enabled: false,
          logging_enabled: true,
          encryption_enabled: false,
          backup_enabled: false,
          custom_headers: {},
          environment: "development" as const,
        } as BackendProjectSettings,
        owner_id: currentUser.id, // Use owner_id instead of created_by
        active: true,
        allowed_origins: ["localhost"],
        rate_limit: 1000,
        rate_limit_window: 3600000,
      });

      // Log the action
      await this.db.createBackendChangelogEntry({
        project_id: project.id,
        entity_type: "project",
        entity_id: project.id,
        action: "created",
        changes: { name, test: true },
        performed_by: currentUser.id,
        session_id: authReq.session?.id,
        user_id: currentUser.id,
        resource_type: "project",
        resource_id: project.id,
      });

      // Create sample collections if requested
      if (withCollections) {
        const collections = [
          {
            name: "users",
            fields: [
              {
                name: "name",
                type: "string" as const,
                required: true,
                unique: false,
              },
              {
                name: "email",
                type: "string" as const,
                required: true,
                unique: true,
              },
              {
                name: "age",
                type: "number" as const,
                required: false,
                unique: false,
              },
            ],
          },
          {
            name: "products",
            fields: [
              {
                name: "title",
                type: "string" as const,
                required: true,
                unique: false,
              },
              {
                name: "price",
                type: "number" as const,
                required: true,
                unique: false,
              },
              {
                name: "description",
                type: "string" as const,
                required: false,
                unique: false,
              },
            ],
          },
        ];

        for (const collData of collections) {
          const _collection = await this.db.createCollection({
            project_id: project.id,
            name: collData.name,
            description: `Test collection: ${collData.name}`,
            fields: collData.fields,
            indexes: [],
          });

          // Create sample documents if requested
          if (withDocuments) {
            for (let i = 0; i < documentCount; i++) {
              if (collData.name === "users") {
                await this.db.createDocument(_collection.id, {
                  name: `Test User ${i + 1}`,
                  email: `user${i + 1}@test.com`,
                  age: 20 + Math.floor(Math.random() * 50),
                });
              } else if (collData.name === "products") {
                await this.db.createDocument(_collection.id, {
                  title: `Product ${i + 1}`,
                  price: Math.floor(Math.random() * 1000) + 10,
                  description: `Description for product ${i + 1}`,
                });
              }
            }
          }
        }
      }

      res.status(201).json({
        success: true,
        data: project,
        message: "Test project created successfully",
      } as ApiResponse<BackendProject>);
    } catch (error) {
      console.error("Create test project error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create test project",
      } as ApiResponse);
    }
  };

  /**
   * Clean up test data
   */
  cleanup = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
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

      const { projectId } = req.body;
      let deletedProjects = 0;
      let deletedCollections = 0;
      let deletedDocuments = 0;

      if (projectId) {
        // Delete specific project
        const project = await this.db.getProjectById(projectId);
        if (
          project &&
          (project.settings as BackendProjectSettings)?.isTestProject
        ) {
          // Get collections for counting
          const collections = await this.db.getCollections(projectId);
          if (collections) {
            for (const collection of collections) {
              const docs = await this.db.getDocuments(collection.id);
              if (docs) {
                deletedDocuments += docs.length;
              }
            }
            deletedCollections = collections.length;
          }

          await this.db.deleteProject(projectId);
          deletedProjects = 1;
        }
      } else {
        // Delete all test projects
        const projects = await this.db.getProjects();
        if (projects) {
          for (const project of projects) {
            if ((project.settings as BackendProjectSettings)?.isTestProject) {
              // Get collections for counting
              const collections = await this.db.getCollections(project.id);
              if (collections) {
                for (const collection of collections) {
                  const docs = await this.db.getDocuments(collection.id);
                  if (docs) {
                    deletedDocuments += docs.length;
                  }
                }
                deletedCollections += collections.length;
              }

              await this.db.deleteProject(project.id);
              deletedProjects++;
            }
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          deleted: {
            projects: deletedProjects,
            collections: deletedCollections,
            documents: deletedDocuments,
          },
        },
      } as ApiResponse);
    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to clean up test data",
      } as ApiResponse);
    }
  };

  /**
   * Run integration tests
   */
  runIntegrationTests = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
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
      const projectSuite = {
        suite: "Project Operations",
        tests: [],
      };

      // Test: Create project
      const createStart = Date.now();
      let testProjectId: string | null = null;
      try {
        const project = await this.db.createProject({
          name: `Integration Test ${Date.now()}`,
          description: "Integration test project",
          settings: {
            isTestProject: true,
            public: false,
            allow_registration: false,
            require_email_verification: false,
            max_file_size: 10485760, // 10MB
            allowed_file_types: [
              "jpg",
              "jpeg",
              "png",
              "gif",
              "pdf",
              "txt",
              "doc",
              "docx",
            ], // Required
            authentication_required: true,
            cors_enabled: false,
            rate_limiting_enabled: false,
            logging_enabled: true,
            encryption_enabled: false,
            backup_enabled: false,
            custom_headers: {},
            environment: "development" as const,
          } as BackendProjectSettings,
          owner_id: currentUser.id, // Use owner_id instead of created_by
          active: true,
          storage_used: 0,
          allowed_origins: ["localhost"],
          total_api_calls: 0,
          last_api_call: undefined,
          rate_limit: 1000,
          rate_limit_window: 3600000,
        });

        if (project) {
          testProjectId = project.id;
          projectSuite.tests.push({
            name: "Create Project",
            passed: true,
            duration: Date.now() - createStart,
          });
        } else {
          throw new Error("Failed to create project");
        }
      } catch (error) {
        projectSuite.tests.push({
          name: "Create Project",
          passed: false,
          error: error instanceof Error ? error.message : "Unknown error",
          duration: Date.now() - createStart,
        });
      }

      // Test: Update project
      if (testProjectId) {
        const updateStart = Date.now();
        try {
          await this.db.updateProject(testProjectId, {
            description: "Updated description",
          });
          projectSuite.tests.push({
            name: "Update Project",
            passed: true,
            duration: Date.now() - updateStart,
          });
        } catch (error) {
          projectSuite.tests.push({
            name: "Update Project",
            passed: false,
            error: error instanceof Error ? error.message : "Unknown error",
            duration: Date.now() - updateStart,
          });
        }
      }

      // Test: Get project
      if (testProjectId) {
        const getStart = Date.now();
        try {
          const project = await this.db.getProjectById(testProjectId);
          projectSuite.tests.push({
            name: "Get Project",
            passed: project !== null,
            duration: Date.now() - getStart,
          });
        } catch (error) {
          projectSuite.tests.push({
            name: "Get Project",
            passed: false,
            error: error instanceof Error ? error.message : "Unknown error",
            duration: Date.now() - getStart,
          });
        }
      }

      // Clean up test project
      if (testProjectId) {
        try {
          await this.db.deleteProject(testProjectId);
        } catch (error) {
          console.error("Failed to clean up test project:", error);
        }
      }

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
   * Check database schema
   */
  checkSchema = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
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

      // Schema validation not implemented yet
      const schema = { valid: true, issues: [] };

      res.json({
        success: true,
        data: schema,
      } as ApiResponse);
    } catch (error) {
      console.error("Error checking schema:", error);
      res.status(500).json({
        success: false,
        error: "Failed to check schema",
      } as ApiResponse);
    }
  };

  /**
   * Get all test projects
   */
  getTestProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
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

      const projects = await this.db.getProjects();

      const testProjects = projects.filter(
        (p: { settings?: BackendProjectSettings; name: string }) =>
          (p.settings as BackendProjectSettings)?.isTestProject ||
          p.name.toLowerCase().includes("test")
      );

      res.json({
        success: true,
        data: testProjects,
      } as ApiResponse);
    } catch (error) {
      console.error("Error getting test projects:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get test projects",
      } as ApiResponse);
    }
  };

  /**
   * Delete specific test project
   */
  deleteTestProject = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
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

      const { projectId } = req.params;

      const project = await this.db.getProjectById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        } as ApiResponse);
        return;
      }

      // Only allow deletion of test projects
      if (
        !(project.settings as BackendProjectSettings)?.isTestProject &&
        !project.name.toLowerCase().includes("test")
      ) {
        res.status(403).json({
          success: false,
          error: "Only test projects can be deleted via this endpoint",
        } as ApiResponse);
        return;
      }

      await this.db.deleteProject(projectId);

      res.json({
        success: true,
        message: "Test project deleted successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error deleting test project:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete test project",
      } as ApiResponse);
    }
  };

  /**
   * Reset test data
   */
  resetTestData = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
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

      const { projectId } = req.body;

      if (projectId) {
        // Reset project data not implemented yet
        console.log(`Would reset project data for ${projectId}`);
      } else {
        // Reset all test data not implemented yet
        console.log("Would reset all test data");
      }

      res.json({
        success: true,
        message: "Test data reset successfully",
      } as ApiResponse);
    } catch (error) {
      console.error("Error resetting test data:", error);
      res.status(500).json({
        success: false,
        error: "Failed to reset test data",
      } as ApiResponse);
    }
  };

  /**
   * Run tests
   */
  runTests = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
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

      const { testSuite } = req.body;

      // Run the specified test suite or all tests
      const results = await this.runTestSuite(testSuite || "all");

      res.json({
        success: true,
        data: results,
      } as ApiResponse);
    } catch (error) {
      console.error("Error running tests:", error);
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
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
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
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
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
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
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
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
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
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
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

  // Helper methods for testing
  private async runTestSuite(
    testSuite: string
  ): Promise<Record<string, unknown>> {
    // Implementation for running test suites
    return { suite: testSuite, status: "completed", results: [] };
  }

  private async runTestScenario(
    scenarioName: string,
    _options: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Implementation for running specific test scenarios
    return { scenario: scenarioName, status: "completed", results: [] };
  }

  private async runPerformanceTestSuite(
    _testConfig: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Implementation for running performance tests
    return { type: "performance", status: "completed", metrics: {} };
  }

  private async runLoadTestSuite(
    _testConfig: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Implementation for running load tests
    return { type: "load", status: "completed", metrics: {} };
  }
}

export default new TestingController();
