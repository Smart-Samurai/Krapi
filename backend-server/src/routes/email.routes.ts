/**
 * Email Routes
 *
 * Handles email configuration and template management for projects
 * All routes are prefixed with /projects/:projectId/email
 */

import { Router } from "express";
import { EmailController } from "@/controllers/email.controller";
import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";

const router: Router = Router();
const controller = new EmailController();

// Apply authentication middleware to all email routes
router.use(authenticate);

/**
 * GET /projects/:projectId/email/config
 * Get email configuration for a project
 */
router.get(
  "/:projectId/email/config",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  controller.getEmailConfig
);

/**
 * PUT /projects/:projectId/email/config
 * Update email configuration for a project
 */
router.put(
  "/:projectId/email/config",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.updateEmailConfig
);

/**
 * POST /projects/:projectId/email/test
 * Test email configuration by sending a test email
 */
router.post(
  "/:projectId/email/test",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.testEmailConfig
);

/**
 * GET /projects/:projectId/email/templates
 * Get all email templates for a project
 */
router.get(
  "/:projectId/email/templates",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  controller.getEmailTemplates
);

/**
 * GET /projects/:projectId/email/templates/:templateId
 * Get a specific email template
 */
router.get(
  "/:projectId/email/templates/:templateId",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  controller.getEmailTemplate
);

/**
 * POST /projects/:projectId/email/templates
 * Create a new email template
 */
router.post(
  "/:projectId/email/templates",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.createEmailTemplate
);

/**
 * PUT /projects/:projectId/email/templates/:templateId
 * Update an email template
 */
router.put(
  "/:projectId/email/templates/:templateId",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.updateEmailTemplate
);

/**
 * DELETE /projects/:projectId/email/templates/:templateId
 * Delete an email template
 */
router.delete(
  "/:projectId/email/templates/:templateId",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.deleteEmailTemplate
);

/**
 * POST /projects/:projectId/email/send
 * Send an email using a template or custom content
 */
router.post(
  "/:projectId/email/send",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  controller.sendEmail
);

export default router;
