#!/bin/bash

controller_file="backend-server/src/controllers/project.controller.ts"

# Check if methods already exist
if grep -q "getProjectSettings" "$controller_file"; then
    echo "Methods already exist, skipping..."
    exit 0
fi

# Create a temporary file with the missing methods
cat > missing_methods.txt << 'METHODS'

  // Project settings methods
  getProjectSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if project exists and user has access
      const project = await db.project.findFirst({
        where: {
          id: projectId,
          userId: userId
        },
        select: {
          id: true,
          name: true,
          description: true,
          settings: true
        }
      });

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          settings: project.settings || {}
        }
      });
    } catch (error) {
      console.error('Error getting project settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  updateProjectSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { settings } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if project exists and user has access
      const project = await db.project.findFirst({
        where: {
          id: projectId,
          userId: userId
        }
      });

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Update project settings
      const updatedProject = await db.project.update({
        where: { id: projectId },
        data: { settings },
        select: {
          id: true,
          name: true,
          description: true,
          settings: true
        }
      });

      res.json({
        success: true,
        data: updatedProject
      });
    } catch (error) {
      console.error('Error updating project settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Project API key management methods
  createProjectApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { name, scopes } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if project exists and user has access
      const project = await db.project.findFirst({
        where: {
          id: projectId,
          userId: userId
        }
      });

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Generate API key
      const crypto = require('crypto');
      const apiKey = crypto.randomBytes(32).toString('hex');
      const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

      // Create API key record
      const newApiKey = await db.projectApiKey.create({
        data: {
          projectId,
          name: name || 'Default API Key',
          keyHash: hashedKey,
          scopes: scopes || [],
          createdAt: new Date(),
          lastUsed: null
        },
        select: {
          id: true,
          name: true,
          scopes: true,
          createdAt: true,
          lastUsed: true
        }
      });

      res.status(201).json({
        success: true,
        data: {
          ...newApiKey,
          key: apiKey // Only return the plain key on creation
        }
      });
    } catch (error) {
      console.error('Error creating project API key:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  getProjectApiKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if project exists and user has access
      const project = await db.project.findFirst({
        where: {
          id: projectId,
          userId: userId
        }
      });

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Get API keys (without the actual key values)
      const apiKeys = await db.projectApiKey.findMany({
        where: { projectId },
        select: {
          id: true,
          name: true,
          scopes: true,
          createdAt: true,
          lastUsed: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: apiKeys
      });
    } catch (error) {
      console.error('Error getting project API keys:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  deleteProjectApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, keyId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Check if project exists and user has access
      const project = await db.project.findFirst({
        where: {
          id: projectId,
          userId: userId
        }
      });

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Check if API key exists and belongs to this project
      const apiKey = await db.projectApiKey.findFirst({
        where: {
          id: keyId,
          projectId: projectId
        }
      });

      if (!apiKey) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      // Delete the API key
      await db.projectApiKey.delete({
        where: { id: keyId }
      });

      res.json({
        success: true,
        message: 'API key deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting project API key:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
METHODS

# Find the last closing brace of the class and insert before it
sed -i '/^}$/i\
'"$(cat missing_methods.txt)"'' "$controller_file"

rm missing_methods.txt

echo "Successfully added missing methods to project controller"
