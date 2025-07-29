import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/auth.service';
import { DatabaseService } from '@/services/database.service';
import { AuthenticatedRequest, SessionType, AdminPermission } from '@/types';

const authService = AuthService.getInstance();
const db = DatabaseService.getInstance();

// Session-based authentication middleware
export const authenticateSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionToken = req.headers['x-session-token'] as string;
    
    if (!sessionToken) {
      res.status(401).json({
        success: false,
        error: 'Session token required'
      });
      return;
    }

    const validation = await authService.validateSession(sessionToken);
    
    if (!validation.valid || !validation.session) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired session'
      });
      return;
    }

    // Attach session and related data to request
    (req as AuthenticatedRequest).session = validation.session;
    (req as AuthenticatedRequest).project = validation.project;
    (req as AuthenticatedRequest).user = validation.user;

    // Generate JWT for subsequent requests
    const jwt = authService.generateJWT({
      id: validation.session.id,
      type: validation.session.type,
      projectId: validation.project?.id,
      permissions: validation.session.permissions
    });

    // Set JWT in response header
    res.setHeader('X-Auth-Token', jwt);

    next();
  } catch (error) {
    console.error('Session authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
      return;
  }
};

// JWT-based authentication middleware (for requests after session validation)
export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
      return;
    }

    const payload = authService.verifyJWT(token);
    
    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    // Attach data to request based on token type
    if (payload.type === SessionType.ADMIN && payload.id) {
      const user = await db.getAdminUserById(payload.id);
      if (!user || !user.active) {
        res.status(401).json({
          success: false,
          error: 'User not found or inactive'
        });
      return;
      }
      (req as AuthenticatedRequest).user = user;
    } else if (payload.type === SessionType.PROJECT && payload.projectId) {
      const project = await db.getProjectById(payload.projectId);
      if (!project || !project.active) {
        res.status(401).json({
          success: false,
          error: 'Project not found or inactive'
        });
      return;
      }
      (req as AuthenticatedRequest).project = project;
    }

    next();
  } catch (error) {
    console.error('JWT authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
      return;
  }
};

// Admin-only middleware
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user || !('role' in user) || !['master_admin', 'admin'].includes(user.role)) {
    res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
      return;
  }

  next();
};

// Master admin only middleware
export const requireMasterAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user || !('role' in user) || user.role !== 'master_admin') {
    res.status(403).json({
      success: false,
      error: 'Master admin access required'
    });
      return;
  }

  next();
};

// Project access middleware
export const requireProjectAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const project = (req as AuthenticatedRequest).project;
  const projectId = req.params.projectId || req.body.projectId;
  
  if (!project || (projectId && project.id !== projectId)) {
    res.status(403).json({
      success: false,
      error: 'Project access denied'
    });
      return;
  }

  next();
};

// Permission check middleware
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = (req as AuthenticatedRequest).session;
    const user = (req as AuthenticatedRequest).user;
    
    // Master admins have all permissions
    if (user && 'role' in user && user.role === 'master_admin') {
      return next();
    }

    // Check session permissions
    if (session && (session.permissions.includes('*') || session.permissions.includes(permission))) {
      return next();
    }

    // Check user permissions
    if (user && 'permissions' in user && user.permissions.some((p: AdminPermission) => 
      p.resource === permission.split('.')[0] && 
      p.actions.includes(permission.split('.')[1])
    )) {
      return next();
    }

    res.status(403).json({
      success: false,
      error: `Permission denied: ${permission}`
    });
      return;
  };
};