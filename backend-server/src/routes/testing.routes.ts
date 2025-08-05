import { Router, IRouter } from "express";
import { TestingController } from "@/controllers/testing.controller";
import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";

const router: IRouter = Router();
const controller = new TestingController();

// All routes require authentication
router.use(authenticate);

// Create test project with optional sample data
router.post(
  "/create-project",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
  }),
  controller.createTestProject
);

// Clean up test data
router.post(
  "/cleanup",
  requireScopes({
    scopes: [Scope.PROJECTS_DELETE],
  }),
  controller.cleanup
);

// Run integration tests
router.post(
  "/integration-tests",
  requireScopes({
    scopes: [Scope.ADMIN_READ],
  }),
  controller.runIntegrationTests
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
