import { Request, Response } from 'express';
import { DatabaseService } from '@/services/database.service';
import { AuthService } from '@/services/auth.service';
import { AuthenticatedRequest, ApiResponse, PaginatedResponse, AdminUser, ChangeAction } from '@/types';

export class AdminController {
  private db: DatabaseService;
  private authService: AuthService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.authService = AuthService.getInstance();
  }

  // Get all admin users
  getAllAdminUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const users = this.db.getAllAdminUsers();
      
      // Simple pagination
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedUsers = users.slice(startIndex, endIndex);

      // Remove password hashes from response
      const sanitizedUsers = paginatedUsers.map(user => {
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.status(200).json({
        success: true,
        data: sanitizedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: users.length,
          pages: Math.ceil(users.length / limitNum)
        }
      } as PaginatedResponse<Omit<AdminUser, 'password_hash'>>);
    } catch (error) {
      console.error('Get all admin users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch admin users'
      } as ApiResponse);
        return;
    }
  };

  // Get admin user by ID
  getAdminUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const user = this.db.getAdminUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Admin user not found'
        } as ApiResponse);
        return;
      }

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = user;

      res.status(200).json({
        success: true,
        data: userWithoutPassword
      } as ApiResponse<Omit<AdminUser, 'password_hash'>>);
        return;
    } catch (error) {
      console.error('Get admin user by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch admin user'
      } as ApiResponse);
        return;
    }
  };

  // Create admin user
  createAdminUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { email, username, password, role, access_level, permissions = [] } = req.body;

      // Check if email already exists
      const existingUser = this.db.getAdminUserByEmail(email);
      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'Email already exists'
        } as ApiResponse);
        return;
      }

      // Hash password
      const password_hash = await this.authService.hashPassword(password);

      // Create user
      const newUser = this.db.createAdminUser({
        email,
        username,
        password_hash,
        role,
        access_level,
        permissions,
        active: true
      });

      // Log the action
      this.db.createChangelogEntry({
        entity_type: 'admin_user',
        entity_id: newUser.id,
        action: ChangeAction.CREATE,
        changes: { email, username, role, access_level },
        performed_by: currentUser?.id || 'system',
        session_id: authReq.session?.id
      });

      // Remove password hash from response
      const { password_hash: _, ...userWithoutPassword } = newUser;

      res.status(201).json({
        success: true,
        data: userWithoutPassword
      } as ApiResponse<Omit<AdminUser, 'password_hash'>>);
        return;
    } catch (error) {
      console.error('Create admin user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create admin user'
      } as ApiResponse);
        return;
    }
  };

  // Update admin user
  updateAdminUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { id } = req.params;
      const updates = req.body;

      // Check if user exists
      const existingUser = this.db.getAdminUserById(id);
      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'Admin user not found'
        } as ApiResponse);
        return;
      }

      // Prevent users from modifying their own role (unless master admin)
      if (currentUser?.id === id && updates.role && 'role' in currentUser && currentUser.role !== 'master_admin') {
        res.status(403).json({
          success: false,
          error: 'Cannot modify your own role'
        } as ApiResponse);
        return;
      }

      // If password is being updated, hash it
      if (updates.password) {
        updates.password_hash = await this.authService.hashPassword(updates.password);
        delete updates.password;
      }

      // Update user
      const updatedUser = this.db.updateAdminUser(id, updates);

      if (!updatedUser) {
        res.status(500).json({
          success: false,
          error: 'Failed to update admin user'
        } as ApiResponse);
        return;
      }

      // Log the action
      const changes: any = {};
      Object.keys(updates).forEach(key => {
        if (key !== 'password_hash' && updates[key] !== existingUser[key as keyof AdminUser]) {
          changes[key] = { old: existingUser[key as keyof AdminUser], new: updates[key] };
        }
      });

      if (Object.keys(changes).length > 0) {
        this.db.createChangelogEntry({
          entity_type: 'admin_user',
          entity_id: id,
          action: ChangeAction.UPDATE,
          changes,
          performed_by: currentUser?.id || 'system',
          session_id: authReq.session?.id
        });
      }

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = updatedUser;

      res.status(200).json({
        success: true,
        data: userWithoutPassword
      } as ApiResponse<Omit<AdminUser, 'password_hash'>>);
        return;
    } catch (error) {
      console.error('Update admin user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update admin user'
      } as ApiResponse);
        return;
    }
  };

  // Delete admin user
  deleteAdminUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { id } = req.params;

      // Check if user exists
      const existingUser = this.db.getAdminUserById(id);
      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'Admin user not found'
        } as ApiResponse);
        return;
      }

      // Prevent users from deleting themselves
      if (currentUser?.id === id) {
        res.status(403).json({
          success: false,
          error: 'Cannot delete your own account'
        } as ApiResponse);
        return;
      }

      // Prevent deleting the last master admin
      if (existingUser.role === 'master_admin') {
        const allAdmins = this.db.getAllAdminUsers();
        const masterAdmins = allAdmins.filter(u => u.role === 'master_admin' && u.active);
        if (masterAdmins.length <= 1) {
          res.status(403).json({
            success: false,
            error: 'Cannot delete the last master admin'
          } as ApiResponse);
        return;
        }
      }

      // Delete user
      const deleted = this.db.deleteAdminUser(id);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete admin user'
        } as ApiResponse);
        return;
      }

      // Log the action
      this.db.createChangelogEntry({
        entity_type: 'admin_user',
        entity_id: id,
        action: ChangeAction.DELETE,
        changes: { email: existingUser.email, username: existingUser.username },
        performed_by: currentUser?.id || 'system',
        session_id: authReq.session?.id
      });

      res.status(200).json({
        success: true,
        message: 'Admin user deleted successfully'
      } as ApiResponse);
        return;
    } catch (error) {
      console.error('Delete admin user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete admin user'
      } as ApiResponse);
        return;
    }
  };

  // Toggle admin user active status
  toggleAdminUserStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { id } = req.params;

      // Check if user exists
      const existingUser = this.db.getAdminUserById(id);
      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'Admin user not found'
        } as ApiResponse);
        return;
      }

      // Prevent users from deactivating themselves
      if (currentUser?.id === id) {
        res.status(403).json({
          success: false,
          error: 'Cannot deactivate your own account'
        } as ApiResponse);
        return;
      }

      // Toggle active status
      const updatedUser = this.db.updateAdminUser(id, { active: !existingUser.active });

      if (!updatedUser) {
        res.status(500).json({
          success: false,
          error: 'Failed to update admin user status'
        } as ApiResponse);
        return;
      }

      // Log the action
      this.db.createChangelogEntry({
        entity_type: 'admin_user',
        entity_id: id,
        action: ChangeAction.UPDATE,
        changes: { active: { old: existingUser.active, new: updatedUser.active } },
        performed_by: currentUser?.id || 'system',
        session_id: authReq.session?.id
      });

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = updatedUser;

      res.status(200).json({
        success: true,
        data: userWithoutPassword
      } as ApiResponse<Omit<AdminUser, 'password_hash'>>);
        return;
    } catch (error) {
      console.error('Toggle admin user status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update admin user status'
      } as ApiResponse);
        return;
    }
  };

  // Get admin user activity logs
  getAdminUserActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      // Check if user exists
      const user = this.db.getAdminUserById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Admin user not found'
        } as ApiResponse);
        return;
      }

      // Get changelog entries for this user
      const activities = this.db.getChangelogEntries({
        entity_type: 'admin_user',
        entity_id: id,
        limit: parseInt(limit as string)
      });

      res.status(200).json({
        success: true,
        data: activities
      } as ApiResponse);
        return;
    } catch (error) {
      console.error('Get admin user activity error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch admin user activity'
      } as ApiResponse);
        return;
    }
  };
}

export default new AdminController();