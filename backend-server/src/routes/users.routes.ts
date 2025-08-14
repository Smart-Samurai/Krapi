import { Router, IRouter } from "express";

import { UsersController } from "@/controllers/users.controller";
import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";

const router: IRouter = Router();
const controller = new UsersController();

// All routes require authentication except for public endpoints
router.use(authenticate);

// User management routes
router.get(
  "/:projectId/users",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  controller.getUsers
);

router.get(
  "/:projectId/users/:userId",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  controller.getUser
);

router.post(
  "/:projectId/users",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.createUser
);

router.put(
  "/:projectId/users/:userId",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.updateUser
);

router.delete(
  "/:projectId/users/:userId",
  requireScopes({
    scopes: [Scope.PROJECTS_DELETE],
    projectSpecific: true,
  }),
  controller.deleteUser
);

// User scopes management
router.put(
  "/:projectId/users/:userId/scopes",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.updateUserScopes
);

// Authentication endpoint (public for project users)
router.post("/:projectId/users/authenticate", controller.authenticateUser);

// Email verification (public)
router.post("/:projectId/users/:userId/verify-email", controller.verifyEmail);

// Password reset (public)
router.post("/:projectId/users/password-reset", controller.sendPasswordReset);
router.post(
  "/:projectId/users/password-reset/confirm",
  controller.resetPassword
);

export default router;
