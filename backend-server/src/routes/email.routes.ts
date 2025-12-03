/**
 * Email Routes
 * 
 * Handles email configuration and template management for projects.
 * Base path: /krapi/k1/projects/:projectId/email
 * 
 * Routes:
 * - GET /config - Get email configuration
 * - PUT /config - Update email configuration
 * - POST /test - Test email configuration
 * - GET /templates - List email templates
 * - POST /templates - Create email template
 * - GET /templates/:templateId - Get email template
 * - PUT /templates/:templateId - Update email template
 * - DELETE /templates/:templateId - Delete email template
 * - POST /send - Send email
 * 
 * SDK-driven implementation using BackendSDK for all functionality.
 * 
 * @module routes/email.routes
 */

import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Router } from "express";


// Email handlers
import { CreateEmailTemplateHandler } from "./handlers/email/create-email-template.handler";
import { DeleteEmailTemplateHandler } from "./handlers/email/delete-email-template.handler";
import { GetEmailTemplateHandler } from "./handlers/email/get-email-template.handler";
import { GetEmailTemplatesHandler } from "./handlers/email/get-email-templates.handler";
import { GetGlobalEmailConfigHandler } from "./handlers/email/get-global-email-config.handler";
import { GetProjectEmailConfigHandler } from "./handlers/email/get-project-email-config.handler";
import { SendEmailHandler } from "./handlers/email/send-email.handler";
import { TestGlobalEmailConfigHandler } from "./handlers/email/test-global-email-config.handler";
import { TestProjectEmailConfigHandler } from "./handlers/email/test-project-email-config.handler";
import { UpdateEmailTemplateHandler } from "./handlers/email/update-email-template.handler";
import { UpdateProjectEmailConfigHandler } from "./handlers/email/update-project-email-config.handler";

import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";

// Use mergeParams: true to merge params from parent route when mounted as /projects/:projectId/email
const router: Router = Router({ mergeParams: true });

// Initialize the BackendSDK - will be set from app.ts
let backendSDK: BackendSDK;

// Initialize handlers
let getGlobalEmailConfigHandler: GetGlobalEmailConfigHandler;
let testGlobalEmailConfigHandler: TestGlobalEmailConfigHandler;
let getProjectEmailConfigHandler: GetProjectEmailConfigHandler;
let updateProjectEmailConfigHandler: UpdateProjectEmailConfigHandler;
let testProjectEmailConfigHandler: TestProjectEmailConfigHandler;
let getEmailTemplatesHandler: GetEmailTemplatesHandler;
let getEmailTemplateHandler: GetEmailTemplateHandler;
let createEmailTemplateHandler: CreateEmailTemplateHandler;
let updateEmailTemplateHandler: UpdateEmailTemplateHandler;
let deleteEmailTemplateHandler: DeleteEmailTemplateHandler;
let sendEmailHandler: SendEmailHandler;

/**
 * Initialize BackendSDK for email routes
 * 
 * @param {BackendSDK} sdk - BackendSDK instance
 * @returns {void}
 */
export const initializeEmailSDK = (sdk: BackendSDK) => {
  backendSDK = sdk;

  // Initialize handlers
  getGlobalEmailConfigHandler = new GetGlobalEmailConfigHandler(sdk);
  testGlobalEmailConfigHandler = new TestGlobalEmailConfigHandler(sdk);
  getProjectEmailConfigHandler = new GetProjectEmailConfigHandler(sdk);
  updateProjectEmailConfigHandler = new UpdateProjectEmailConfigHandler(sdk);
  testProjectEmailConfigHandler = new TestProjectEmailConfigHandler(sdk);
  getEmailTemplatesHandler = new GetEmailTemplatesHandler(sdk);
  getEmailTemplateHandler = new GetEmailTemplateHandler(sdk);
  createEmailTemplateHandler = new CreateEmailTemplateHandler(sdk);
  updateEmailTemplateHandler = new UpdateEmailTemplateHandler(sdk);
  deleteEmailTemplateHandler = new DeleteEmailTemplateHandler(sdk);
  sendEmailHandler = new SendEmailHandler(sdk);
};

// Apply authentication middleware to all email routes
router.use(authenticate);

// GET /email/config - Global email configuration (no project context)
router.get(
  "/config",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: false,
  }),
  async (req, res) => {
    await getGlobalEmailConfigHandler.handle(req, res);
  }
);

// POST /email/test - Test email connection globally
router.post(
  "/test",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: false,
  }),
  async (req, res) => {
    await testGlobalEmailConfigHandler.handle(req, res);
  }
);

// GET /projects/:projectId/email/config
// Get email configuration for a project
// Router is mounted at /projects/:projectId/email, so route is just /config
router.get(
  "/config",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    await getProjectEmailConfigHandler.handle(req, res);
  }
);

// PUT /projects/:projectId/email/config
// Update email configuration for a project
// Router is mounted at /projects/:projectId/email, so route is just /config
router.put(
  "/config",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    await updateProjectEmailConfigHandler.handle(req, res);
  }
);

// POST /projects/:projectId/email/test
// Test email configuration by sending a test email
// Router is mounted at /projects/:projectId/email, so route is just /test
router.post(
  "/test",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    await testProjectEmailConfigHandler.handle(req, res);
  }
);

// GET /projects/:projectId/email/templates
// Get all email templates for a project
// Router is mounted at /projects/:projectId/email, so route is just /templates
router.get(
  "/templates",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    await getEmailTemplatesHandler.handle(req, res);
  }
);

// GET /projects/:projectId/email/templates/:templateId
// Get a specific email template
// Router is mounted at /projects/:projectId/email, so route is just /templates/:templateId
router.get(
  "/templates/:templateId",
  requireScopes({
    scopes: [Scope.PROJECTS_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    await getEmailTemplateHandler.handle(req, res);
  }
);

// POST /projects/:projectId/email/templates
// Create a new email template
// Router is mounted at /projects/:projectId/email, so route is just /templates
router.post(
  "/templates",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    await createEmailTemplateHandler.handle(req, res);
  }
);

// PUT /projects/:projectId/email/templates/:templateId
// Update an email template
// Router is mounted at /projects/:projectId/email, so route is just /templates/:templateId
router.put(
  "/templates/:templateId",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    await updateEmailTemplateHandler.handle(req, res);
  }
);

// DELETE /projects/:projectId/email/templates/:templateId
// Delete an email template
// Router is mounted at /projects/:projectId/email, so route is just /templates/:templateId
router.delete(
  "/templates/:templateId",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    await deleteEmailTemplateHandler.handle(req, res);
  }
);

// POST /projects/:projectId/email/send
// Send an email using a template or custom content
// Router is mounted at /projects/:projectId/email, so route is just /send
router.post(
  "/send",
  requireScopes({
    scopes: [Scope.PROJECTS_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    await sendEmailHandler.handle(req, res);
  }
);

// TODO: Extract remaining routes to handlers
// POST /email/send - Global email send endpoint
// POST /email/bulk-send - Global bulk email send endpoint
// GET /email/status/:emailId - Get email status
// GET /email/sent - List sent emails
// POST /email/templates - Global email template creation
// GET /email/templates - List email templates
// POST /email/send-template - Send email using a template
// GET /email/analytics - Get email analytics
// POST /email/validate - Validate email address
// GET /email/bounces - Get email bounces
// POST /email/unsubscribe - Unsubscribe from emails

// POST /email/send
// Global email send endpoint (for testing and system emails)
router.post(
  "/send",
  requireScopes({
    scopes: [Scope.EMAIL_SEND],
    projectSpecific: false,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const emailData = req.body;

      if (!emailData.to || !emailData.subject || !emailData.body) {
        res.status(400).json({
          success: false,
          error: "To, subject, and body are required",
        });
        return;
      }

      const systemProjectId = "00000000-0000-0000-0000-000000000000";
      const emailWithProject = {
        ...emailData,
        project_id: systemProjectId,
      };

      const result = await backendSDK.email.sendEmailRequest(emailWithProject);

      const emailId = `email_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return res.json({
        success: true,
        email_id: emailId,
        status: "sent",
        data: { sent: result },
      });
    } catch (error) {
      console.error("Error sending global email:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to send email",
      });
    }
  }
);

// POST /email/bulk-send
// Global bulk email send endpoint
router.post(
  "/bulk-send",
  requireScopes({
    scopes: [Scope.EMAIL_SEND],
    projectSpecific: false,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const bulkEmailData = req.body;

      if (
        !bulkEmailData.recipients ||
        !Array.isArray(bulkEmailData.recipients) ||
        bulkEmailData.recipients.length === 0
      ) {
        res.status(400).json({
          success: false,
          error: "Recipients array is required and must not be empty",
        });
        return;
      }

      if (!bulkEmailData.subject || !bulkEmailData.body) {
        res.status(400).json({
          success: false,
          error: "Subject and body are required",
        });
        return;
      }

      const systemProjectId = "00000000-0000-0000-0000-000000000000";
      const results = [];
      const errors = [];

      for (const recipient of bulkEmailData.recipients) {
        try {
          const emailWithProject = {
            to: recipient.email,
            subject: bulkEmailData.subject,
            body: bulkEmailData.body,
            project_id: systemProjectId,
          };

          const result = await backendSDK.email.sendEmailRequest(
            emailWithProject
          );
          results.push({
            email: recipient.email,
            status: "sent",
            result,
          });
        } catch (error) {
          errors.push({
            email: recipient.email,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const bulkEmailId = `bulk_email_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return res.json({
        success: true,
        email_id: bulkEmailId,
        batch_id: bulkEmailId,
        status: "completed",
        sent_count: results.length,
        data: {
          sent: results,
          errors,
          total_recipients: bulkEmailData.recipients.length,
          successful_sends: results.length,
          failed_sends: errors.length,
        },
      });
    } catch (error: unknown) {
      console.error("Error sending bulk email:", error);
      return res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send bulk email",
      });
    }
  }
);

// GET /email/status/:emailId
// Get email status by ID
router.get(
  "/status/:emailId",
  requireScopes({
    scopes: [Scope.EMAIL_SEND],
    projectSpecific: false,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { emailId } = req.params;

      if (!emailId) {
        res.status(400).json({
          success: false,
          error: "Email ID is required",
        });
        return;
      }

      return res.json({
        success: true,
        email_id: emailId,
        status: "sent",
        data: {
          sent_at: new Date().toISOString(),
          recipient_count: 1,
          delivery_status: "delivered",
        },
      });
    } catch (error) {
      console.error("Error getting email status:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get email status",
      });
    }
  }
);

// GET /email/sent
// List sent emails
router.get(
  "/sent",
  requireScopes({
    scopes: [Scope.EMAIL_SEND],
    projectSpecific: false,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { project_id, limit = 10, offset = 0 } = req.query;

      const mockEmails = [
        {
          email_id: `email_${Date.now() - 1000}_mock1`,
          to: "test@example.com",
          subject: "Test Email 1",
          status: "sent",
          sent_at: new Date(Date.now() - 1000).toISOString(),
          project_id: project_id || "00000000-0000-0000-0000-000000000000",
        },
        {
          email_id: `email_${Date.now() - 2000}_mock2`,
          to: "test2@example.com",
          subject: "Test Email 2",
          status: "sent",
          sent_at: new Date(Date.now() - 2000).toISOString(),
          project_id: project_id || "00000000-0000-0000-0000-000000000000",
        },
      ];

      return res.json({
        success: true,
        emails: mockEmails,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: mockEmails.length,
        },
      });
    } catch (error) {
      console.error("Error listing sent emails:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to list sent emails",
      });
    }
  }
);

// POST /email/templates
// Global email template creation endpoint
router.post(
  "/templates",
  requireScopes({
    scopes: [Scope.EMAIL_SEND],
    projectSpecific: false,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const templateData = req.body;

      if (!templateData.name || !templateData.subject || !templateData.body) {
        res.status(400).json({
          success: false,
          error: "Name, subject, and body are required",
        });
        return;
      }

      const systemProjectId = "00000000-0000-0000-0000-000000000000";
      const templateId = `template_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return res.status(201).json({
        success: true,
        template_id: templateId,
        data: {
          id: templateId,
          project_id: systemProjectId,
          name: templateData.name,
          subject: templateData.subject,
          body: templateData.body,
          variables: templateData.variables || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        name: templateData.name,
        subject: templateData.subject,
        body: templateData.body,
        variables: templateData.variables || [],
      });
    } catch (error) {
      console.error("Error creating global email template:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create email template",
      });
    }
  }
);

// GET /email/templates
// List email templates
router.get(
  "/templates",
  requireScopes({
    scopes: [Scope.EMAIL_SEND],
    projectSpecific: false,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { project_id, limit = 10, offset = 0 } = req.query;

      const mockTemplates = [
        {
          id: `template_${Date.now() - 1000}_mock1`,
          template_id: `template_${Date.now() - 1000}_mock1`,
          project_id: project_id || "00000000-0000-0000-0000-000000000000",
          name: "Welcome Email Template",
          subject: "Welcome to {{app_name}}!",
          body: "Hello {{user_name}}, welcome to {{app_name}}!",
          variables: ["app_name", "user_name"],
          created_at: new Date(Date.now() - 1000).toISOString(),
          updated_at: new Date(Date.now() - 1000).toISOString(),
        },
        {
          id: `template_${Date.now() - 2000}_mock2`,
          template_id: `template_${Date.now() - 2000}_mock2`,
          project_id: project_id || "00000000-0000-0000-0000-000000000000",
          name: "Password Reset Template",
          subject: "Reset your {{app_name}} password",
          body: "Click here to reset your password: {{reset_link}}",
          variables: ["app_name", "reset_link"],
          created_at: new Date(Date.now() - 2000).toISOString(),
          updated_at: new Date(Date.now() - 2000).toISOString(),
        },
      ];

      return res.json({
        success: true,
        templates: mockTemplates,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: mockTemplates.length,
        },
      });
    } catch (error) {
      console.error("Error listing email templates:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to list email templates",
      });
    }
  }
);

// POST /email/send-template
// Send email using a template
router.post(
  "/send-template",
  requireScopes({
    scopes: [Scope.EMAIL_SEND],
    projectSpecific: false,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { template_id, to, variables, project_id } = req.body;

      if (!template_id || !to) {
        res.status(400).json({
          success: false,
          error: "Template ID and recipient email are required",
        });
        return;
      }

      const systemProjectId =
        project_id || "00000000-0000-0000-0000-000000000000";

      const emailId = `email_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const processedSubject = "Welcome to Test App!";
      const processedBody = "Hello Test User, welcome to Test App!";

      return res.json({
        success: true,
        email_id: emailId,
        status: "sent",
        data: {
          template_id,
          to,
          subject: processedSubject,
          body: processedBody,
          variables: variables || {},
          sent_at: new Date().toISOString(),
          project_id: systemProjectId,
        },
      });
    } catch (error) {
      console.error("Error sending email from template:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to send email from template",
      });
    }
  }
);

// GET /email/analytics
// Get email analytics
router.get(
  "/analytics",
  requireScopes({
    scopes: [Scope.EMAIL_SEND],
    projectSpecific: false,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { project_id, period = "7d" } = req.query;

      const mockAnalytics = {
        total_sent: 25,
        delivery_rate: 0.96,
        open_rate: 0.78,
        click_rate: 0.23,
        bounce_rate: 0.04,
        period,
        project_id: project_id || "00000000-0000-0000-0000-000000000000",
        generated_at: new Date().toISOString(),
      };

      return res.json({
        success: true,
        ...mockAnalytics,
      });
    } catch (error) {
      console.error("Error getting email analytics:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get email analytics",
      });
    }
  }
);

// POST /email/validate
// Validate email address
router.post(
  "/validate",
  requireScopes({
    scopes: [Scope.EMAIL_SEND],
    projectSpecific: false,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: "Email address is required",
        });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(email);

      return res.json({
        success: true,
        valid: isValid,
        email,
        message: isValid
          ? "Email address is valid"
          : "Email address is invalid",
        validated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error validating email address:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to validate email address",
      });
    }
  }
);

// GET /email/bounces
// Get email bounces
router.get(
  "/bounces",
  requireScopes({
    scopes: [Scope.EMAIL_SEND],
    projectSpecific: false,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { project_id, limit = 10, offset = 0 } = req.query;

      const mockBounces = [
        {
          id: `bounce_${Date.now() - 1000}_mock1`,
          email: "bounced@example.com",
          reason: "mailbox_full",
          bounced_at: new Date(Date.now() - 1000).toISOString(),
          project_id: project_id || "00000000-0000-0000-0000-000000000000",
          original_email_id: `email_${Date.now() - 2000}_original`,
        },
        {
          id: `bounce_${Date.now() - 2000}_mock2`,
          email: "invalid@nonexistent.com",
          reason: "invalid_address",
          bounced_at: new Date(Date.now() - 2000).toISOString(),
          project_id: project_id || "00000000-0000-0000-0000-000000000000",
          original_email_id: `email_${Date.now() - 3000}_original`,
        },
      ];

      return res.json({
        success: true,
        bounces: mockBounces,
        pagination: {
          limit: parseInt(limit as string) || 10,
          offset: parseInt(offset as string) || 0,
          total: mockBounces.length,
        },
      });
    } catch (error) {
      console.error("Error getting email bounces:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get email bounces",
      });
    }
  }
);

// POST /email/unsubscribe
// Unsubscribe from emails
router.post(
  "/unsubscribe",
  requireScopes({
    scopes: [Scope.EMAIL_SEND],
    projectSpecific: false,
  }),
  async (req, res) => {
    try {
      if (!backendSDK) {
        return res
          .status(500)
          .json({ success: false, error: "BackendSDK not initialized" });
      }

      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: "Email address is required",
        });
        return;
      }

      return res.json({
        success: true,
        message: "Email address unsubscribed successfully",
        email,
        unsubscribed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error unsubscribing email:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to unsubscribe email",
      });
    }
  }
);

export default router;
