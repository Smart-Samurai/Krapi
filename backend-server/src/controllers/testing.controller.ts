import { Request, Response } from 'express';
import { DatabaseService } from '@/services/database.service';
import { AuthenticatedRequest, ApiResponse, Project, ChangeAction } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Testing Controller
 * 
 * Provides utilities for development and testing.
 * Only available in development mode.
 */
export class TestingController {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Create a test project with optional sample data
   */
  createTestProject = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({
          success: false,
          error: 'Testing endpoints are not available in production'
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      
      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
        return;
      }

      const {
        name = `Test Project ${Date.now()}`,
        withCollections = false,
        withDocuments = false,
        documentCount = 10
      } = req.body;

      // Create project
      const project = await this.db.createProject({
        name,
        description: 'Created by testing utilities',
        settings: { isTestProject: true },
        created_by: currentUser.id,
        active: true,
        api_key: `test_${uuidv4().replace(/-/g, '')}`
      });

      // Log the action
      await this.db.createChangelogEntry({
        project_id: project.id,
        entity_type: 'project',
        entity_id: project.id,
        action: ChangeAction.CREATED,
        changes: { name, test: true },
        performed_by: currentUser.id,
        session_id: authReq.session?.id,
        timestamp: new Date().toISOString()
      });

      // Create sample collections if requested
      if (withCollections) {
        const collections = [
          { name: 'users', fields: [
            { name: 'name', type: 'string', required: true },
            { name: 'email', type: 'string', required: true },
            { name: 'age', type: 'number' }
          ]},
          { name: 'products', fields: [
            { name: 'title', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
            { name: 'description', type: 'string' }
          ]}
        ];

        for (const collData of collections) {
          const collection = await this.db.createCollection({
            project_id: project.id,
            name: collData.name,
            fields: collData.fields,
            indexes: [],
            created_by: currentUser.id
          });

          // Create sample documents if requested
          if (withDocuments && collection) {
            for (let i = 0; i < documentCount; i++) {
              if (collData.name === 'users') {
                await this.db.createDocument(collection.id, {
                  name: `Test User ${i + 1}`,
                  email: `user${i + 1}@test.com`,
                  age: 20 + Math.floor(Math.random() * 50)
                });
              } else if (collData.name === 'products') {
                await this.db.createDocument(collection.id, {
                  title: `Product ${i + 1}`,
                  price: Math.floor(Math.random() * 1000) + 10,
                  description: `Description for product ${i + 1}`
                });
              }
            }
          }
        }
      }

      res.status(201).json({
        success: true,
        data: project,
        message: 'Test project created successfully'
      } as ApiResponse<Project>);
    } catch (error) {
      console.error('Create test project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create test project'
      } as ApiResponse);
    }
  };

  /**
   * Clean up test data
   */
  cleanup = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({
          success: false,
          error: 'Testing endpoints are not available in production'
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      
      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
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
        if (project && project.settings?.isTestProject) {
          // Get collections for counting
          const collections = await this.db.getProjectTableSchemas(projectId);
          for (const collection of collections) {
            const docs = await this.db.getDocumentsByTable(collection.id);
            deletedDocuments += docs.total;
          }
          deletedCollections = collections.length;
          
          await this.db.deleteProject(projectId);
          deletedProjects = 1;
        }
      } else {
        // Delete all test projects
        const projects = await this.db.getAllProjects();
        for (const project of projects) {
          if (project.settings?.isTestProject) {
            // Get collections for counting
            const collections = await this.db.getProjectTableSchemas(project.id);
            for (const collection of collections) {
              const docs = await this.db.getDocumentsByTable(collection.id);
              deletedDocuments += docs.total;
            }
            deletedCollections += collections.length;
            
            await this.db.deleteProject(project.id);
            deletedProjects++;
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          deleted: {
            projects: deletedProjects,
            collections: deletedCollections,
            documents: deletedDocuments
          }
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clean up test data'
      } as ApiResponse);
    }
  };

  /**
   * Run integration tests
   */
  runIntegrationTests = async (req: Request, res: Response): Promise<void> => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({
          success: false,
          error: 'Testing endpoints are not available in production'
        } as ApiResponse);
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      
      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
        return;
      }

      const results: any[] = [];
      const startTime = Date.now();

      // Test Suite 1: Project Operations
      const projectSuite = {
        suite: 'Project Operations',
        tests: []
      };

      // Test: Create project
      const createStart = Date.now();
      let testProjectId: string | null = null;
      try {
        const project = await this.db.createProject({
          name: `Integration Test ${Date.now()}`,
          description: 'Integration test project',
          settings: { isTestProject: true },
          created_by: currentUser.id,
          active: true,
          api_key: `test_${uuidv4().replace(/-/g, '')}`
        });
        testProjectId = project.id;
        projectSuite.tests.push({
          name: 'Create Project',
          passed: true,
          duration: Date.now() - createStart
        });
      } catch (error) {
        projectSuite.tests.push({
          name: 'Create Project',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - createStart
        });
      }

      // Test: Update project
      if (testProjectId) {
        const updateStart = Date.now();
        try {
          await this.db.updateProject(testProjectId, {
            description: 'Updated description'
          });
          projectSuite.tests.push({
            name: 'Update Project',
            passed: true,
            duration: Date.now() - updateStart
          });
        } catch (error) {
          projectSuite.tests.push({
            name: 'Update Project',
            passed: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - updateStart
          });
        }
      }

      // Test: Get project
      if (testProjectId) {
        const getStart = Date.now();
        try {
          const project = await this.db.getProjectById(testProjectId);
          projectSuite.tests.push({
            name: 'Get Project',
            passed: project !== null,
            duration: Date.now() - getStart
          });
        } catch (error) {
          projectSuite.tests.push({
            name: 'Get Project',
            passed: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - getStart
          });
        }
      }

      // Clean up test project
      if (testProjectId) {
        try {
          await this.db.deleteProject(testProjectId);
        } catch (error) {
          console.error('Failed to clean up test project:', error);
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
            duration: Date.now() - startTime
          }
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Run integration tests error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run integration tests'
      } as ApiResponse);
    }
  };
}

export default new TestingController();