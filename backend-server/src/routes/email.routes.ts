/**
 * Email Routes
 * 
 * Handles email configuration and template management for projects
 * All routes are prefixed with /projects/:projectId/email
 */

import { Router, Request, Response } from 'express';
import { authenticateProject } from '@/middleware/auth.middleware';
import { validateProjectAccess } from '@/middleware/validation.middleware';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    type: string;
    projectId?: string;
  };
}

const router: Router = Router();

// Apply authentication middleware to all email routes
router.use(authenticateProject);
router.use(validateProjectAccess);

/**
 * GET /projects/:projectId/email/config
 * Get email configuration for a project
 */
router.get('/config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params as { projectId: string };
    const db = req.app.locals.db;
    
    const config = await db.getEmailConfig(projectId);
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get email configuration'
    });
  }
});

/**
 * PUT /projects/:projectId/email/config
 * Update email configuration for a project
 */
router.put('/config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params as { projectId: string };
    const configData = req.body;
    const db = req.app.locals.db;
    
    const updated = await db.updateEmailConfig(projectId, configData);
    
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update email configuration'
    });
  }
});

/**
 * POST /projects/:projectId/email/test
 * Test email configuration by sending a test email
 */
router.post('/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params as { projectId: string };
    const { email } = req.body;
    const db = req.app.locals.db;
    
    const result = await db.testEmailConfig(projectId, email);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test email'
    });
  }
});

/**
 * GET /projects/:projectId/email/templates
 * Get all email templates for a project
 */
router.get('/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params as { projectId: string };
    const db = req.app.locals.db;
    
    const templates = await db.getEmailTemplates(projectId);
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get email templates'
    });
  }
});

/**
 * POST /projects/:projectId/email/templates
 * Create a new email template
 */
router.post('/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params as { projectId: string };
    const templateData = req.body;
    const db = req.app.locals.db;
    
    const template = await db.createEmailTemplate(projectId, templateData);
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create email template'
    });
  }
});

/**
 * GET /projects/:projectId/email/templates/:templateId
 * Get a specific email template
 */
router.get('/templates/:templateId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, templateId } = req.params as { projectId: string; templateId: string };
    const db = req.app.locals.db;
    
    const template = await db.getEmailTemplate(projectId, templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Email template not found'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get email template'
    });
  }
});

/**
 * PUT /projects/:projectId/email/templates/:templateId
 * Update an email template
 */
router.put('/templates/:templateId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, templateId } = req.params as { projectId: string; templateId: string };
    const templateData = req.body;
    const db = req.app.locals.db;
    
    const template = await db.updateEmailTemplate(projectId, templateId, templateData);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Email template not found'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update email template'
    });
  }
});

/**
 * DELETE /projects/:projectId/email/templates/:templateId
 * Delete an email template
 */
router.delete('/templates/:templateId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, templateId } = req.params as { projectId: string; templateId: string };
    const db = req.app.locals.db;
    
    const result = await db.deleteEmailTemplate(projectId, templateId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Email template not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Email template deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete email template'
    });
  }
});

/**
 * POST /projects/:projectId/email/send
 * Send an email using a template or custom content
 */
router.post('/send', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params as { projectId: string };
    const emailData = req.body;
    const db = req.app.locals.db;
    
    const result = await db.sendEmail(projectId, emailData);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    });
  }
});

export default router; 