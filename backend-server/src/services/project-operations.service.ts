import { BackendSDK } from "@smartsamurai/krapi-sdk";

import { AuthenticatedRequest } from "@/types";

/**
 * Project Operations Service
 * 
 * Handles business logic for project operations.
 * Separated from controller to improve testability and maintainability.
 */
export class ProjectOperationsService {
  constructor(private backendSDK: BackendSDK) {}

  /**
   * Get all projects with pagination
   */
  async getAllProjects(options: { page: number; limit: number }) {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    console.log("🔍 [PROJECT OPS] getAllProjects called", {
      limit,
      offset,
      page,
    });

    const projects = await this.backendSDK.projects.getAllProjects({
      limit,
      offset,
    });

    console.log("✅ [PROJECT OPS] getAllProjects succeeded", {
      projectsCount: Array.isArray(projects) ? projects.length : "not array",
    });

    return {
      projects: Array.isArray(projects) ? projects : [],
      pagination: {
        page,
        limit,
        total: Array.isArray(projects) ? projects.length : 0,
        totalPages: Math.ceil(
          (Array.isArray(projects) ? projects.length : 0) / limit
        ),
        hasNext: (Array.isArray(projects) ? projects.length : 0) >= limit,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Create a new project
   */
  async createProject(
    req: AuthenticatedRequest,
    projectData: { name: string; description?: string; settings?: Record<string, unknown> }
  ) {
    const currentUser = req.user;
    const { name, description, settings } = projectData;

    console.log("🔍 [PROJECT OPS] createProject called", {
      method: req.method,
      url: req.url,
      path: req.path,
      headers: {
        "x-project-id": req.headers["x-project-id"],
        authorization: req.headers.authorization ? "present" : "missing",
      },
      userId: currentUser?.id,
      projectName: name,
    });

    if (!currentUser) {
      throw new Error("Unauthorized: No user in request");
    }

    if (!name) {
      throw new Error("Project name is required");
    }

    console.log("🔍 [PROJECT OPS] About to call BackendSDK.projects.createProject", {
      ownerId: currentUser.id,
      projectData: { name, description, settings },
    });

    const project = await this.backendSDK.projects.createProject(
      currentUser.id,
      {
        name,
        ...(description && { description }),
        ...(settings && { settings }),
      }
    );

    console.log("✅ [PROJECT OPS] createProject succeeded", {
      projectId: project?.id,
      projectName: project?.name,
    });

    return project;
  }

  /**
   * Get project by ID
   */
  async getProjectById(projectId: string) {
    console.log("🔍 [PROJECT OPS] getProjectById called", {
      projectId,
    });

    const project = await this.backendSDK.projects.getProjectById(projectId);

    console.log("✅ [PROJECT OPS] getProjectById succeeded", {
      projectId: project?.id,
    });

    return project;
  }
}

