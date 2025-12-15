/**
 * Users Routes
 * 
 * Handles project user management endpoints.
 * Base path: /krapi/k1/projects/:projectId/users
 * 
 * Routes:
 * - GET /:projectId/users - List project users
 * - GET /:projectId/users/:userId - Get user by ID
 * - POST /:projectId/users - Create user
 * - PUT /:projectId/users/:userId - Update user
 * - DELETE /:projectId/users/:userId - Delete user
 * - PUT /:projectId/users/:userId/scopes - Update user scopes
 * - POST /:projectId/users/authenticate - Authenticate user (public)
 * - POST /:projectId/users/:userId/verify-email - Verify email (public)
 * - POST /:projectId/users/password-reset - Send password reset (public)
 * - POST /:projectId/users/password-reset/confirm - Confirm password reset (public)
 * 
 * @module routes/users.routes
 */
import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Router, IRouter } from "express";

import { UsersController } from "@/controllers/users.controller";
import { GetUserStatisticsHandler } from "@/routes/handlers/users/get-statistics.handler";
import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";

// Use mergeParams: true to merge params from parent route (/projects/:projectId/users)
const router: IRouter = Router({ mergeParams: true });
const controller = new UsersController();
let getUserStatisticsHandler: GetUserStatisticsHandler;

/**
 * Initialize BackendSDK for users routes
 * 
 * @param {BackendSDK} sdk - BackendSDK instance
 * @returns {void}
 */
export const initializeUsersSDK = (sdk: BackendSDK) => {
  controller.setBackendSDK(sdk);
  getUserStatisticsHandler = new GetUserStatisticsHandler(sdk);
};

// All routes require authentication except for public endpoints
router.use(authenticate);

// User management routes
// Route is already nested under /projects/:projectId/users, so use "/" for list
router.get(
  "/",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  controller.getUsers
);

// User statistics route - MUST come before /:userId to prevent "statistics" from being matched as userId
router.get(
  "/statistics",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    if (!getUserStatisticsHandler) {
      res.status(500).json({
        success: false,
        error: "User statistics handler not initialized",
      });
      return;
    }
    await getUserStatisticsHandler.handle(req, res);
  }
);

router.get(
  "/:userId",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  controller.getUser
);

router.post(
  "/",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.createUser
);

router.put(
  "/:userId",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.updateUser
);

router.delete(
  "/:userId",
  requireScopes({
    scopes: [Scope.PROJECTS_DELETE],
    projectSpecific: true,
  }),
  controller.deleteUser
);

// User scopes management
router.put(
  "/:userId/scopes",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.updateUserScopes
);

// Authentication endpoint (public for project users)
router.post("/authenticate", controller.authenticateUser);

// Email verification (public)
router.post("/:userId/verify-email", controller.verifyEmail);

// Password reset (public)
router.post("/password-reset", controller.sendPasswordReset);
router.post(
  "/password-reset/confirm",
  controller.resetPassword
);

export default router;
