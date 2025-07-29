import { Request, Response } from 'express';
import { AuthService } from '@/services/auth.service';
import { DatabaseService } from '@/services/database.service';
import { AuthenticatedRequest, ApiResponse, SessionType } from '@/types';

export class AuthController {
  private authService: AuthService;
  private db: DatabaseService;

  constructor() {
    this.authService = AuthService.getInstance();
    this.db = DatabaseService.getInstance();
  }

  // Create admin session
  createAdminSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { api_key } = req.body;

      const session = await this.authService.createAdminSession(api_key);

      if (!session) {
        res.status(401).json({
          success: false,
          error: 'Invalid API key'
        } as ApiResponse);
        return;
      }

              // Log session creation
        await this.authService.logAuthAction('session_created', 'admin', undefined, session.id);

      res.status(200).json({
        success: true,
        data: {
          session_token: session.token,
          expires_at: session.expires_at
        }
      } as ApiResponse<{ session_token: string, expires_at: string }>);
        return;
    } catch (error) {
      console.error('Create admin session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create session'
      } as ApiResponse);
        return;
    }
  };

  // Create project session
  createProjectSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { api_key } = req.body;

      const session = await this.authService.createProjectSession(projectId, api_key);

      if (!session) {
        res.status(401).json({
          success: false,
          error: 'Invalid project ID or API key'
        } as ApiResponse);
        return;
      }

              // Log session creation
        await this.authService.logAuthAction('session_created', api_key, projectId, session.id);

      res.status(200).json({
        success: true,
        data: {
          session_token: session.token,
          expires_at: session.expires_at
        }
      } as ApiResponse<{ session_token: string, expires_at: string }>);
        return;
    } catch (error) {
      console.error('Create project session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create session'
      } as ApiResponse);
        return;
    }
  };

  // Admin login (creates a session and returns JWT)
  adminLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const user = await this.authService.authenticateAdmin(email, password);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        } as ApiResponse);
        return;
      }

      // Create a session for the admin user
      const token = require('uuid').v4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      const session = await this.db.createSession({
        token,
        type: SessionType.ADMIN,
        user_id: user.id,
        permissions: ['*'],
        expires_at: expiresAt,
        consumed: false,
        created_at: new Date().toISOString()
      });

      // Generate JWT
      const jwt = this.authService.generateJWT({
        id: user.id,
        type: SessionType.ADMIN,
        permissions: ['*']
      });

      // Log login
      await this.authService.logAuthAction('login', user.id, undefined, session.id);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            access_level: user.access_level
          },
          token: jwt,
          session_token: session.token,
          expires_at: session.expires_at
        }
      } as ApiResponse);
        return;
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed'
      } as ApiResponse);
        return;
    }
  };

  // Validate session (for checking if a session is still valid)
  validateSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { session_token } = req.body;

      const session = await this.db.getSessionByToken(session_token);

      if (!session || session.consumed || new Date(session.expires_at) < new Date()) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired session'
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          expires_at: session.expires_at,
          type: session.type
        }
      } as ApiResponse);
        return;
    } catch (error) {
      console.error('Validate session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate session'
      } as ApiResponse);
        return;
    }
  };

  // Logout (invalidate session)
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const session = authReq.session;
      const user = authReq.user;

      if (session && !session.consumed) {
        // Consume the session to invalidate it
        await this.db.consumeSession(session.token);
      }

      // Log logout
      if (user) {
        await this.authService.logAuthAction('logout', user.id, undefined, session?.id);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      } as ApiResponse);
        return;
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      } as ApiResponse);
        return;
    }
  };

  // Get current user info
  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        } as ApiResponse);
        return;
      }

      // Determine user type and return appropriate data
      if ('role' in user) {
        // AdminUser
        res.status(200).json({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            access_level: user.access_level,
            permissions: user.permissions
          }
        } as ApiResponse);
      } else {
        // ProjectUser
        res.status(200).json({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            active: user.active
          }
        } as ApiResponse);
      }
      return;
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user info'
      } as ApiResponse);
        return;
    }
  };

  // Change password
  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;
      const { current_password, new_password } = req.body;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        } as ApiResponse);
        return;
      }

      // Verify current password
      const validUser = await this.authService.authenticateAdmin(user.email, current_password);
      if (!validUser) {
        res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        } as ApiResponse);
        return;
      }

      // Hash new password
      const hashedPassword = await this.authService.hashPassword(new_password);

      // Update password
      this.db.updateAdminUser(user.id, { password_hash: hashedPassword });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      } as ApiResponse);
        return;
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      } as ApiResponse);
        return;
    }
  };
}

export default new AuthController();