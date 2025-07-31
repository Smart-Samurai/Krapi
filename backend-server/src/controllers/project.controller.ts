import { Request, Response } from 'express';
import { DatabaseService } from '@/services/database.service';
import { AuthenticatedRequest, ApiResponse, PaginatedResponse, Project, ChangeAction } from '@/types';

export class ProjectController {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // Get all projects
  getAllProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const projects = await this.db.getAllProjects();
      
      // Simple pagination
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedProjects = projects.slice(startIndex, endIndex);

      res.status(200).json({
        success: true,
        data: paginatedProjects,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: projects.length,
          totalPages: Math.ceil(projects.length / limitNum),
          hasNext: pageNum < Math.ceil(projects.length / limitNum),
          hasPrev: pageNum > 1
        }
      } as PaginatedResponse<Project>);
    } catch (error) {
      console.error('Get all projects error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch projects'
      } as ApiResponse);
        return;
    }
  };

  // Get project by ID
  getProjectById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const project = await this.db.getProjectById(id);

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: project
      } as ApiResponse<Project>);
        return;
    } catch (error) {
      console.error('Get project by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project'
      } as ApiResponse);
        return;
    }
  };

  // Create project
  createProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { name, description, settings = {} } = req.body;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
        return;
      }

      // Create project
      const newProject = await this.db.createProject({
        name,
        description,
        settings,
        created_by: currentUser.id,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        api_key: `krapi_${require('uuid').v4().replace(/-/g, '')}`
      });

      // Log the action
      await this.db.createChangelogEntry({
        project_id: newProject.id,
        entity_type: 'project',
        entity_id: newProject.id,
        action: ChangeAction.CREATE,
        changes: { name, description },
        performed_by: currentUser.id,
        session_id: authReq.session?.id,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        data: newProject,
        message: 'Project created successfully. API Key: ' + newProject.api_key
      } as ApiResponse<Project>);
        return;
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create project'
      } as ApiResponse);
        return;
    }
  };

  // Update project
  updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { id } = req.params;
      const updates = req.body;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
        return;
      }

      // Check if project exists
      const existingProject = await this.db.getProjectById(id);
      if (!existingProject) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        } as ApiResponse);
        return;
      }

      // Update project
      const updatedProject = await this.db.updateProject(id, updates);

      if (!updatedProject) {
        res.status(500).json({
          success: false,
          error: 'Failed to update project'
        } as ApiResponse);
        return;
      }

      // Log the action
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      Object.keys(updates).forEach(key => {
        if (updates[key] !== existingProject[key as keyof Project]) {
          changes[key] = { old: existingProject[key as keyof Project], new: updates[key] };
        }
      });

      if (Object.keys(changes).length > 0) {
        await this.db.createChangelogEntry({
          project_id: id,
          entity_type: 'project',
          entity_id: id,
          action: ChangeAction.UPDATE,
          changes,
          performed_by: currentUser.id,
          session_id: authReq.session?.id,
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        success: true,
        data: updatedProject
      } as ApiResponse<Project>);
        return;
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update project'
      } as ApiResponse);
        return;
    }
  };

  // Delete project
  deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { id } = req.params;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
        return;
      }

      // Check if project exists
      const existingProject = await this.db.getProjectById(id);
      if (!existingProject) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        } as ApiResponse);
        return;
      }

      // Delete project
      const deleted = await this.db.deleteProject(id);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete project'
        } as ApiResponse);
        return;
      }

      // Log the action
      await this.db.createChangelogEntry({
        project_id: id,
        entity_type: 'project',
        entity_id: id,
        action: ChangeAction.DELETE,
        changes: { name: existingProject.name },
        performed_by: currentUser.id,
        session_id: authReq.session?.id,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully'
      } as ApiResponse);
        return;
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete project'
      } as ApiResponse);
        return;
    }
  };

  // Get project statistics
  getProjectStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Check if project exists
      const project = await this.db.getProjectById(id);
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        } as ApiResponse);
        return;
      }

      // Get stats
      const tables = await this.db.getProjectTableSchemas(id);
      const users = await this.db.getProjectUsers(id);
      const files = await this.db.getProjectFiles(id);

      // Calculate document count
      let documentCount = 0;
      for (const table of tables) {
        const { total } = await this.db.getDocumentsByTable(table.id);
        documentCount += total;
      }

      const stats = {
        tables: tables.length,
        documents: documentCount,
        users: users.length,
        files: files.length,
        storage_used: files.reduce((sum, file) => sum + file.size, 0)
      };

      res.status(200).json({
        success: true,
        data: stats
      } as ApiResponse);
        return;
    } catch (error) {
      console.error('Get project stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project statistics'
      } as ApiResponse);
        return;
    }
  };

  // Get project activity logs
  getProjectActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      // Check if project exists
      const project = await this.db.getProjectById(id);
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        } as ApiResponse);
        return;
      }

      // Get changelog entries for this project
      const activities = await this.db.getProjectChangelog(
        id,
        parseInt(limit as string) || 100
      );

      res.status(200).json({
        success: true,
        data: activities
      } as ApiResponse);
        return;
    } catch (error) {
      console.error('Get project activity error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project activity'
      } as ApiResponse);
        return;
    }
  };

  // Regenerate API key
  regenerateApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { id } = req.params;

      if (!currentUser) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        } as ApiResponse);
        return;
      }

      // Check if project exists
      const existingProject = await this.db.getProjectById(id);
      if (!existingProject) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        } as ApiResponse);
        return;
      }

      // Generate new API key
      const newApiKey = `krapi_${require('uuid').v4().replace(/-/g, '')}`;

      // Update project with new API key
      const updatedProject = await this.db.updateProject(id, { api_key: newApiKey });

      if (!updatedProject) {
        res.status(500).json({
          success: false,
          error: 'Failed to regenerate API key'
        } as ApiResponse);
        return;
      }

      // Log the action
      await this.db.createChangelogEntry({
        project_id: id,
        entity_type: 'project',
        entity_id: id,
        action: ChangeAction.UPDATE,
        changes: { api_key: 'regenerated' },
        performed_by: currentUser.id,
        session_id: authReq.session?.id,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        data: { api_key: newApiKey },
        message: 'API key regenerated successfully'
      } as ApiResponse);
        return;
    } catch (error) {
      console.error('Regenerate API key error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to regenerate API key'
      } as ApiResponse);
        return;
    }
  };
}

export default new ProjectController();