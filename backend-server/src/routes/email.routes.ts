/**
 * Email Routes
 *
 * Handles email configuration and template management for projects
 * All routes are prefixed with /projects/:projectId/email
 *
 * SDK-driven implementation using BackendSDK for all functionality
 */

import { Router } from "express";
import { BackendSDK } from "@krapi/sdk";

import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";

const router: Router = Router();

// Initialize the BackendSDK - will be set from app.ts
let backendSDK: BackendSDK;

export const initializeEmailSDK = (sdk: BackendSDK) => {
  backendSDK = sdk;
};

// Apply authentication middleware to all email routes
router.use(authenticate);

// GET /projects/:projectId/email/config
// Get email configuration for a project
router.get(
  "/:projectId/email/config",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { projectId } = req.params;
      const config = await backendSDK.email.getConfig(projectId);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error("Error getting email config:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email configuration",
      });
    }
  }
);

// PUT /projects/:projectId/email/config
// Update email configuration for a project
router.put(
  "/:projectId/email/config",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { projectId } = req.params;
      const configData = req.body;
      const config = await backendSDK.email.updateConfig(projectId, configData);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error("Error updating email config:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update email configuration",
      });
    }
  }
);

// POST /projects/:projectId/email/test
// Test email configuration by sending a test email
router.post(
  "/:projectId/email/test",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { projectId } = req.params;
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: "Email address is required",
        });
        return;
      }

      const result = await backendSDK.email.testConfig(projectId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error testing email config:", error);
      res.status(500).json({
        success: false,
        error: "Failed to test email configuration",
      });
    }
  }
);

// GET /projects/:projectId/email/templates
// Get all email templates for a project
router.get(
  "/:projectId/email/templates",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { projectId } = req.params;
      const templates = await backendSDK.email.getTemplates(projectId);

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      console.error("Error getting email templates:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email templates",
      });
    }
  }
);

// GET /projects/:projectId/email/templates/:templateId
// Get a specific email template
router.get(
  "/:projectId/email/templates/:templateId",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { projectId, templateId } = req.params;
      const result = await backendSDK.email.getTemplate(templateId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: "Email template not found",
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error getting email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email template",
      });
    }
  }
);

// POST /projects/:projectId/email/templates
// Create a new email template
router.post(
  "/:projectId/email/templates",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { projectId } = req.params;
      const templateData = req.body;

      if (!templateData.name || !templateData.subject || !templateData.body) {
        res.status(400).json({
          success: false,
          error: "Name, subject, and body are required",
        });
        return;
      }

      // Add project ID to template data
      const templateWithProject = {
        ...templateData,
        projectId,
      };

      const result = await backendSDK.email.createTemplate(templateWithProject);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error creating email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create email template",
      });
    }
  }
);

// PUT /projects/:projectId/email/templates/:templateId
// Update an email template
router.put(
  "/:projectId/email/templates/:templateId",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { projectId, templateId } = req.params;
      const templateData = req.body;

      if (!templateData.name || !templateData.subject || !templateData.body) {
        res.status(400).json({
          success: false,
          error: "Name, subject, and body are required",
        });
        return;
      }

      // Add project ID to template data
      const templateWithProject = {
        ...templateData,
        projectId,
      };

      const result = await backendSDK.email.updateTemplate(
        templateId,
        templateWithProject
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error updating email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update email template",
      });
    }
  }
);

// DELETE /projects/:projectId/email/templates/:templateId
// Delete an email template
router.delete(
  "/:projectId/email/templates/:templateId",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { projectId, templateId } = req.params;
      const result = await backendSDK.email.deleteTemplate(templateId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: "Email template not found",
        });
      }

      res.json({
        success: true,
        message: "Email template deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete email template",
      });
    }
  }
);

// POST /projects/:projectId/email/send
// Send an email using a template or custom content
router.post(
  "/:projectId/email/send",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { projectId } = req.params;
      const emailData = req.body;

      if (!emailData.to || !emailData.subject || !emailData.body) {
        res.status(400).json({
          success: false,
          error: "To, subject, and body are required",
        });
        return;
      }

      // Add project ID to email data
      const emailWithProject = {
        ...emailData,
        projectId,
      };

      const result = await backendSDK.email.sendEmailRequest(emailWithProject);

      res.json({
        success: true,
        data: { sent: result },
      });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send email",
      });
    }
  }
);

export default router;
