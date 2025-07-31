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

      const users = await this.db.getAllAdminUsers();
      
      // Simple pagination
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedUsers = users.slice(startIndex, endIndex);

      // Remove password hashes from response
      const sanitizedUsers = paginatedUsers.map(user => {
        const { password_hash: _password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.status(200).json({
        success: true,
        data: sanitizedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: users.length,
          totalPages: Math.ceil(users.length / limitNum),
          hasNext: pageNum < Math.ceil(users.length / limitNum),
          hasPrev: pageNum > 1
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

      const user = await this.db.getAdminUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Admin user not found'
        } as ApiResponse);
        return;
      }

      // Remove password hash from response
      const { password_hash: _password_hash, ...userWithoutPassword } = user;

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
      const existingUser = await this.db.getAdminUserByEmail(email);
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
      const newUser = await this.db.createAdminUser({
        email,
        username,
        password_hash,
        role,
        access_level,
        permissions,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Log the action
      await this.db.createChangelogEntry({
        entity_type: 'admin_user',
        entity_id: newUser.id,
        action: ChangeAction.CREATED,
        changes: { email, username, role, access_level },
        performed_by: currentUser?.id || 'system',
        session_id: authReq.session?.id,
        timestamp: new Date().toISOString()
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
      const existingUser = await this.db.getAdminUserById(id);
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
      const updatedUser = await this.db.updateAdminUser(id, updates);

      if (!updatedUser) {
        res.status(500).json({
          success: false,
          error: 'Failed to update admin user'
        } as ApiResponse);
        return;
      }

      // Log the action
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      Object.keys(updates).forEach(key => {
        if (key !== 'password_hash' && updates[key] !== existingUser[key as keyof AdminUser]) {
          changes[key] = { old: existingUser[key as keyof AdminUser], new: updates[key] };
        }
      });

      if (Object.keys(changes).length > 0) {
        await this.db.createChangelogEntry({
          entity_type: 'admin_user',
          entity_id: id,
          action: ChangeAction.UPDATED,
          changes,
          performed_by: currentUser?.id || 'system',
          session_id: authReq.session?.id,
          timestamp: new Date().toISOString()
        });
      }

      // Remove password hash from response
      const { password_hash: _password_hash, ...userWithoutPassword } = updatedUser;

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
      const existingUser = await this.db.getAdminUserById(id);
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
        const allAdmins = await this.db.getAllAdminUsers();
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
      const deleted = await this.db.deleteAdminUser(id);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete admin user'
        } as ApiResponse);
        return;
      }

      // Log the action
      await this.db.createChangelogEntry({
        entity_type: 'admin_user',
        entity_id: id,
        action: ChangeAction.DELETED,
        changes: { email: existingUser.email, username: existingUser.username },
        performed_by: currentUser?.id || 'system',
        session_id: authReq.session?.id,
        timestamp: new Date().toISOString()
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
      const existingUser = await this.db.getAdminUserById(id);
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
      const updatedUser = await this.db.updateAdminUser(id, { active: !existingUser.active });

      if (!updatedUser) {
        res.status(500).json({
          success: false,
          error: 'Failed to update admin user status'
        } as ApiResponse);
        return;
      }

      // Log the action
      await this.db.createChangelogEntry({
        entity_type: 'admin_user',
        entity_id: id,
        action: ChangeAction.UPDATED,
        changes: { active: { old: existingUser.active, new: updatedUser.active } },
        performed_by: currentUser?.id || 'system',
        session_id: authReq.session?.id,
        timestamp: new Date().toISOString()
      });

      // Remove password hash from response
      const { password_hash: _password_hash, ...userWithoutPassword } = updatedUser;

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
      const activities = await this.db.getChangelogEntries({
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

  // Get user API keys
  getUserApiKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      // Check if user exists
      const user = await this.db.getAdminUserById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        } as ApiResponse);
        return;
      }

      // Get API keys for the user
      const apiKeys = await this.db.getUserApiKeys(userId);

      // Remove the actual key values for security
      const sanitizedKeys = apiKeys.map(key => ({
        ...key,
        key: key.key.substring(0, 10) + '...' // Show only first 10 chars
      }));

      res.status(200).json({
        success: true,
        data: sanitizedKeys
      } as ApiResponse);
    } catch (error) {
      console.error('Get user API keys error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch API keys'
      } as ApiResponse);
    }
  };

  // Create user API key
  createUserApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { userId } = req.params;
      const { name, scopes, project_ids } = req.body;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
        return;
      }

      // Check if user exists
      const user = await this.db.getAdminUserById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        } as ApiResponse);
        return;
      }

      // Generate new API key
      const apiKey = `krapi_admin_${require('uuid').v4().replace(/-/g, '')}`;

      // Create API key entry
      const newApiKey = await this.db.createUserApiKey({
        user_id: userId,
        name,
        key: apiKey,
        type: 'admin',
        scopes: scopes || [],
        project_ids: project_ids || null,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
        last_used_at: null,
        active: true
      });

      // Log the action
      await this.db.createChangelogEntry({
        entity_type: 'api_key',
        entity_id: newApiKey.id,
        action: ChangeAction.CREATED,
        changes: { name, scopes, user_id: userId },
        performed_by: currentUser.id,
        session_id: authReq.session?.id,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        data: newApiKey,
        message: 'API key created successfully'
      } as ApiResponse);
    } catch (error) {
      console.error('Create user API key error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create API key'
      } as ApiResponse);
    }
  };

  // Delete API key
  deleteApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { keyId } = req.params;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
        return;
      }

      // Check if API key exists
      const apiKey = await this.db.getApiKeyById(keyId);
      if (!apiKey) {
        res.status(404).json({
          success: false,
          error: 'API key not found'
        } as ApiResponse);
        return;
      }

      // Delete API key
      const deleted = await this.db.deleteApiKey(keyId);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete API key'
        } as ApiResponse);
        return;
      }

      // Log the action
      await this.db.createChangelogEntry({
        entity_type: 'api_key',
        entity_id: keyId,
        action: ChangeAction.DELETED,
        changes: { name: apiKey.name },
        performed_by: currentUser.id,
        session_id: authReq.session?.id,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'API key deleted successfully'
      } as ApiResponse);
    } catch (error) {
      console.error('Delete API key error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete API key'
      } as ApiResponse);
    }
  };

  // Get system statistics
  getSystemStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get counts for various entities
      const projects = await this.db.getAllProjects();
      const users = await this.db.getAllAdminUsers();
      const sessions = await this.db.getActiveSessions();
      
      // Calculate storage usage
      let totalStorage = 0;
      let totalDocuments = 0;
      let totalCollections = 0;

      for (const project of projects) {
        const files = await this.db.getProjectFiles(project.id);
        totalStorage += files.reduce((sum, file) => sum + file.size, 0);
        
        const collections = await this.db.getProjectTableSchemas(project.id);
        totalCollections += collections.length;
        
        for (const collection of collections) {
          const { total } = await this.db.getDocumentsByTable(collection.id);
          totalDocuments += total;
        }
      }

      const stats = {
        projects: {
          total: projects.length,
          active: projects.filter(p => p.active).length
        },
        users: {
          total: users.length,
          active: users.filter(u => u.active).length
        },
        sessions: {
          active: sessions.length
        },
        storage: {
          used_bytes: totalStorage,
          used_mb: Math.round(totalStorage / (1024 * 1024)),
          used_gb: Math.round(totalStorage / (1024 * 1024 * 1024) * 100) / 100
        },
        database: {
          collections: totalCollections,
          documents: totalDocuments
        }
      };

      res.status(200).json({
        success: true,
        data: stats
      } as ApiResponse);
    } catch (error) {
      console.error('Get system stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system statistics'
      } as ApiResponse);
    }
  };

  // Get activity logs
  getActivityLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = 100, offset = 0, entity_type, action, user_id } = req.query;

      // Build filter object
      const filters: any = {};
      if (entity_type) filters.entity_type = entity_type;
      if (action) filters.action = action;
      if (user_id) filters.performed_by = user_id;

      // Get activity logs with filters
      const logs = await this.db.getActivityLogs({
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        filters
      });

      res.status(200).json({
        success: true,
        data: logs
      } as ApiResponse);
    } catch (error) {
      console.error('Get activity logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch activity logs'
      } as ApiResponse);
    }
  };
}

export default new AdminController();