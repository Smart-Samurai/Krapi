/**
 * Testing Routes
 * 
 * Provides testing utilities for development and testing.
 * Simulates third-party applications that use the SDK to connect to Krapi Server.
 * 
 * CRITICAL: Testing controller uses REGULAR SDK (client mode), NOT BackendSDK.
 * It connects via HTTP to the frontend proxy, exactly like third-party apps.
 * 
 * Base path: /krapi/k1/testing
 * 
 * Routes:
 * - POST /projects - Create test project
 * - GET /projects - Get test projects
 * - DELETE /projects/:projectId - Delete test project
 * - DELETE /cleanup - Clean up test data
 * - POST /reset - Reset test data
 * - POST /run - Run integration tests
 * - POST /scenarios/:scenarioName - Run specific test scenario
 * - GET /scenarios - Get available test scenarios
 * 
 * Only available in development mode or when ENABLE_TESTING is enabled.
 * All routes require authentication.
 * 
 * @module routes/testing.routes
 */
import { Router, IRouter } from "express";

import { TestingController } from "@/controllers/testing.controller";
import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";

const router: IRouter = Router();
const controller = new TestingController();

// No SDK initialization needed - testing controller uses regular SDK (client mode)
// which connects via HTTP to frontend proxy automatically

// All routes require authentication
router.use(authenticate);

// Create test project with optional sample data
router.post(
  "/projects",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
  }),
  controller.createTestProject
);

// Get all test projects
router.get(
  "/projects",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
  }),
  controller.getTestProjects
);

// Delete specific test project
router.delete(
  "/projects/:projectId",
  requireScopes({
    scopes: [Scope.PROJECTS_DELETE],
  }),
  controller.deleteTestProject
);

// Clean up test data
router.delete(
  "/cleanup",
  requireScopes({
    scopes: [Scope.PROJECTS_DELETE],
  }),
  controller.cleanup
);

// Reset test data
router.post(
  "/reset",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
  }),
  controller.resetTestData
);

// Run integration tests
router.post(
  "/run",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.runTests
);

// Run specific test scenario
router.post(
  "/scenarios/:scenarioName",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.runScenario
);

// Get available test scenarios
router.get(
  "/scenarios",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.getAvailableScenarios
);

// Seed data for testing
router.post(
  "/seed/:projectId",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
  }),
  controller.seedData
);

// Performance testing
router.post(
  "/performance",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.runPerformanceTest
);

// Load testing
router.post(
  "/load",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.runLoadTest
);

// Check database schema
router.get(
  "/schema",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.checkSchema
);

export default router;
