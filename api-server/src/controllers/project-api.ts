import { Request, Response } from "express";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import projectDatabase from "../services/project-database";
import {
  Project,
  Collection,
  Document,
  ProjectUser,
  ProjectApiKey,
  CollectionSchema,
} from "../types";

class ProjectApiController {
  // Authentication methods
  authenticateApiKey = async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) {
        res.status(401).json({
          success: false,
          error: "API key required",
        });
        return;
      }

      const keyData = projectDatabase.getProjectApiKeyByKey(apiKey);
      if (!keyData || keyData.status !== "active") {
        res.status(401).json({
          success: false,
          error: "Invalid or inactive API key",
        });
        return;
      }

      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        res.status(401).json({
          success: false,
          error: "API key has expired",
        });
        return;
      }

      // Update last used timestamp
      projectDatabase.updateProjectApiKey(keyData.id, {
        last_used: new Date().toISOString(),
      });

      // Add project context to request
      (req as any).projectId = keyData.project_id;
      (req as any).apiKey = keyData;

      res.status(200).json({
        success: true,
        message: "Authentication successful",
        project_id: keyData.project_id,
      });
    } catch (error) {
      console.error("API key authentication error:", error);
      res.status(500).json({
        success: false,
        error: "Authentication failed",
      });
    }
  };

  authenticateUser = async (req: Request, res: Response) => {
    try {
      const { email, password, project_id } = req.body;

      if (!email || !password || !project_id) {
        res.status(400).json({
          success: false,
          error: "Email, password, and project_id are required",
        });
        return;
      }

      const user = projectDatabase.getProjectUserByEmail(project_id, email);
      if (!user || user.status !== "active") {
        res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
        return;
      }

      // For now, we'll use a simple password check
      // In a real implementation, you'd store hashed passwords
      if (password !== "password123") {
        // Temporary for demo
        res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          user_id: user.id,
          project_id: user.project_id,
          email: user.email,
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      // Update last login
      projectDatabase.updateProjectUser(user.id, {
        last_login: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          status: user.status,
        },
      });
    } catch (error) {
      console.error("User authentication error:", error);
      res.status(500).json({
        success: false,
        error: "Authentication failed",
      });
    }
  };

  // Project operations
  getProjects = async (req: Request, res: Response) => {
    try {
      const projects = projectDatabase.getAllProjects();

      res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get projects",
      });
    }
  };

  getProject = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const project = projectDatabase.getProjectById(projectId);

      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        });
      }

      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get project",
      });
    }
  };

  createProject = async (req: Request, res: Response) => {
    try {
      const { name, description, domain, settings } =
        (req as any).unifiedOperation?.params || req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: "Project name is required",
        });
        return;
      }

      const project: Omit<Project, "id" | "created_at" | "updated_at"> = {
        name,
        description,
        domain,
        settings: settings || {
          auth: {
            enabled: true,
            methods: ["email"],
            oauth_providers: [],
            email_verification: false,
            phone_verification: false,
          },
          storage: {
            max_file_size: 10 * 1024 * 1024,
            allowed_types: ["image/*", "application/pdf", "text/*"],
            compression: true,
          },
          api: {
            rate_limit: 1000,
            cors_origins: ["*"],
          },
          database: {
            max_collections: 100,
            max_documents_per_collection: 10000,
          },
        },
        created_by: (req as any).user?.id || "system",
        status: "active",
      };

      const createdProject = projectDatabase.createProject(project);

      res.status(201).json({
        success: true,
        data: createdProject,
      });
    } catch (error) {
      console.error("Create project error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create project",
      });
    }
  };

  updateProject = async (req: Request, res: Response) => {
    try {
      const { projectId } = (req as any).unifiedOperation?.params || req.params;
      const updates = (req as any).unifiedOperation?.params || req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
        return;
      }

      const existingProject = projectDatabase.getProjectById(projectId);
      if (!existingProject) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        });
        return;
      }

      const updatedProject = projectDatabase.updateProject(projectId, updates);

      res.status(200).json({
        success: true,
        data: updatedProject,
      });
    } catch (error) {
      console.error("Update project error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update project",
      });
    }
  };

  deleteProject = async (req: Request, res: Response) => {
    try {
      const { projectId } = (req as any).unifiedOperation?.params || req.params;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: "Project ID is required",
        });
        return;
      }

      const existingProject = projectDatabase.getProjectById(projectId);
      if (!existingProject) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        });
        return;
      }

      projectDatabase.deleteProject(projectId);

      res.status(200).json({
        success: true,
        message: "Project deleted successfully",
      });
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete project",
      });
    }
  };

  // Collection operations
  getCollections = async (req: Request, res: Response) => {
    try {
      const projectId = (req as any).projectId || req.params.projectId;
      const collections = projectDatabase.getCollectionsByProject(projectId);

      res.status(200).json({
        success: true,
        data: collections,
      });
    } catch (error) {
      console.error("Get collections error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get collections",
      });
    }
  };

  getCollection = async (req: Request, res: Response) => {
    try {
      const { collectionId } = req.params;
      const collection = projectDatabase.getCollectionById(collectionId);

      if (!collection) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        });
      }

      res.status(200).json({
        success: true,
        data: collection,
      });
    } catch (error) {
      console.error("Get collection error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get collection",
      });
    }
  };

  createCollection = async (req: Request, res: Response) => {
    try {
      console.log("🔍 createCollection called with:", {
        projectId: (req as any).projectId,
        params: req.params,
        body: req.body,
      });

      const projectId = (req as any).projectId || req.params.projectId;
      const { name, description, schema, permissions } = req.body;

      if (!name || !schema) {
        res.status(400).json({
          success: false,
          error: "Collection name and schema are required",
        });
        return;
      }

      const collection: Omit<
        Collection,
        "id" | "created_at" | "updated_at" | "document_count"
      > = {
        project_id: projectId,
        name,
        description,
        schema: schema as CollectionSchema,
        indexes: [],
        permissions: permissions || {
          read: ["*"],
          write: ["*"],
          delete: ["*"],
          create: ["*"],
        },
      };

      const createdCollection = projectDatabase.createCollection(collection);

      res.status(201).json({
        success: true,
        data: createdCollection,
      });
    } catch (error) {
      console.error("Create collection error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create collection",
      });
    }
  };

  updateCollection = async (req: Request, res: Response) => {
    try {
      const { collectionId } = req.params;
      const updates = req.body;

      const updatedCollection = projectDatabase.updateCollection(
        collectionId,
        updates
      );

      if (!updatedCollection) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        });
      }

      res.status(200).json({
        success: true,
        data: updatedCollection,
      });
    } catch (error) {
      console.error("Update collection error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update collection",
      });
    }
  };

  deleteCollection = async (req: Request, res: Response) => {
    try {
      const { collectionId } = req.params;
      const success = projectDatabase.deleteCollection(collectionId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Collection deleted successfully",
      });
    } catch (error) {
      console.error("Delete collection error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete collection",
      });
    }
  };

  // Document operations
  getDocuments = async (req: Request, res: Response) => {
    try {
      const { collectionId } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      const documents = projectDatabase.getDocumentsByCollection(
        collectionId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.status(200).json({
        success: true,
        data: documents,
      });
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get documents",
      });
    }
  };

  getDocument = async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const document = projectDatabase.getDocumentById(documentId);

      if (!document) {
        res.status(404).json({
          success: false,
          error: "Document not found",
        });
      }

      res.status(200).json({
        success: true,
        data: document,
      });
    } catch (error) {
      console.error("Get document error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get document",
      });
    }
  };

  createDocument = async (req: Request, res: Response) => {
    try {
      console.log("🔍 createDocument called with:", {
        params: req.params,
        body: req.body,
        data: req.body.data,
      });

      const { collectionId } = req.params;
      const { data } = req.body;

      if (!data) {
        res.status(400).json({
          success: false,
          error: "Document data is required",
        });
        return;
      }

      const collection = projectDatabase.getCollectionById(collectionId);
      if (!collection) {
        res.status(404).json({
          success: false,
          error: "Collection not found",
        });
        return;
      }

      const document: Omit<Document, "id" | "created_at" | "updated_at"> = {
        collection_id: collectionId,
        project_id: collection.project_id,
        data,
        created_by: (req as any).user?.id || "system",
        updated_by: (req as any).user?.id || "system",
      };

      const createdDocument = projectDatabase.createDocument(document);

      res.status(201).json({
        success: true,
        data: createdDocument,
      });
    } catch (error) {
      console.error("Create document error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create document",
      });
    }
  };

  updateDocument = async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const updates = req.body;

      const updatedDocument = projectDatabase.updateDocument(documentId, {
        ...updates,
        updated_by: (req as any).user?.id || "system",
      });

      if (!updatedDocument) {
        res.status(404).json({
          success: false,
          error: "Document not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedDocument,
      });
    } catch (error) {
      console.error("Update document error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update document",
      });
    }
  };

  deleteDocument = async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const success = projectDatabase.deleteDocument(documentId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: "Document not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Document deleted successfully",
      });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete document",
      });
    }
  };

  // User operations
  getUsers = async (req: Request, res: Response) => {
    try {
      const projectId = (req as any).projectId || req.params.projectId;
      const users = projectDatabase.getProjectUsers(projectId);

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get users",
      });
    }
  };

  getUser = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const user = projectDatabase.getProjectUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get user",
      });
    }
  };

  createUser = async (req: Request, res: Response) => {
    try {
      console.log("🔍 createUser called with:", {
        projectId: (req as any).projectId,
        params: req.params,
        body: req.body,
        headers: req.headers,
      });

      const projectId = (req as any).projectId || req.params.projectId;
      const { email, name, phone } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: "Email is required",
        });
        return;
      }

      const user: Omit<ProjectUser, "id" | "created_at" | "updated_at"> = {
        project_id: projectId,
        email,
        name,
        phone,
        status: "active",
        email_verified: false,
        phone_verified: false,
        oauth_providers: [],
        preferences: {},
      };

      const createdUser = projectDatabase.createProjectUser(user);

      res.status(201).json({
        success: true,
        data: createdUser,
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create user",
      });
    }
  };

  updateUser = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const updates = req.body;

      const updatedUser = projectDatabase.updateProjectUser(userId, updates);

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update user",
      });
    }
  };

  deleteUser = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const success = projectDatabase.deleteProjectUser(userId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete user",
      });
    }
  };

  // API Key operations
  getApiKeys = async (req: Request, res: Response) => {
    try {
      const projectId = (req as any).projectId || req.params.projectId;
      const apiKeys = projectDatabase.getProjectApiKeys(projectId);

      res.status(200).json({
        success: true,
        data: apiKeys,
      });
    } catch (error) {
      console.error("Get API keys error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get API keys",
      });
    }
  };

  createApiKey = async (req: Request, res: Response) => {
    try {
      const projectId = (req as any).projectId || req.params.projectId;
      const { name, permissions } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: "API key name is required",
        });
      }

      const apiKey: Omit<ProjectApiKey, "id" | "created_at"> = {
        project_id: projectId,
        name,
        key: `krapi_${randomUUID()}`,
        permissions: permissions || ["*"],
        created_by: (req as any).user?.id || "system",
        status: "active",
      };

      const createdApiKey = projectDatabase.createProjectApiKey(apiKey);

      res.status(201).json({
        success: true,
        data: createdApiKey,
      });
    } catch (error) {
      console.error("Create API key error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create API key",
      });
    }
  };

  deleteApiKey = async (req: Request, res: Response) => {
    try {
      const { keyId } = req.params;
      const success = projectDatabase.deleteProjectApiKey(keyId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: "API key not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "API key deleted successfully",
      });
    } catch (error) {
      console.error("Delete API key error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete API key",
      });
    }
  };

  // Stats
  getProjectStats = async (req: Request, res: Response) => {
    try {
      const projectId = (req as any).projectId || req.params.projectId;
      const stats = projectDatabase.getProjectStats(projectId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get project stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get project stats",
      });
    }
  };
}

export default new ProjectApiController();
