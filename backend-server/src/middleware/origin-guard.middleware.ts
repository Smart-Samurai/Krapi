import { Request, Response, NextFunction } from 'express';

import { DatabaseService } from '@/services/database.service';

const db = DatabaseService.getInstance();

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