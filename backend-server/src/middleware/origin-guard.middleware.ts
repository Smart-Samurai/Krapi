/**
 * Origin Guard Middleware
 * 
 * Enforces project origin restrictions based on project settings.
 * Validates that requests come from allowed origins when origin enforcement is enabled.
 * 
 * @module middleware/origin-guard.middleware
 */
import { Request, Response, NextFunction } from 'express';

import { DatabaseService } from '@/services/database.service';

const db = DatabaseService.getInstance();

/**
 * Enforce project origin restrictions
 * 
 * Middleware that validates request origin against project's allowed origins.
 * Only enforces if project has origin enforcement enabled in settings.
 * 
 * @param {Request} req - Express request with projectId in params
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 * 
 * @throws {404} If project is not found
 * @throws {403} If origin is not allowed or not configured
 * @throws {500} If origin enforcement check fails
 * 
 * @example
 * router.use('/projects/:projectId', enforceProjectOrigin);
 */
export async function enforceProjectOrigin(req: Request & { params: { projectId?: string } }, res: Response, next: NextFunction) {
  try {
    const projectId = req.params.projectId;
    if (!projectId) return next();

    const project = await db.getProjectById(projectId);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const settings = project.settings || {};
    const enabled = (settings as { security?: { enforce_origin?: boolean } })?.security?.enforce_origin === true;
    if (!enabled) return next();

    const allowed = (project.project_url || '').trim();
    if (!allowed) return res.status(403).json({ success: false, error: 'Project origin not configured' });

    const origin = (req.headers.origin as string) || '';
    const referer = (req.headers.referer as string) || '';

    const ok = (origin && origin.startsWith(allowed)) || (referer && referer.startsWith(allowed));
    if (!ok) {
      return res.status(403).json({ success: false, error: 'Origin not allowed for this project' });
    }

    return next();
  } catch {
    return res.status(500).json({ success: false, error: 'Origin enforcement failed' });
  }
}