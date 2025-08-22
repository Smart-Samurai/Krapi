import { ProjectsService, ProjectSettings } from "@krapi/sdk";

export class SDKProjectsService {
  private projectsService: ProjectsService;

  constructor(projectsService: ProjectsService) {
    this.projectsService = projectsService;
  }

  // Get project by ID
  async getProjectById(projectId: string) {
    return await this.projectsService.getProjectById(projectId);
  }

  // Get all projects
  async getAllProjects(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    active?: boolean;
    owner_id?: string;
  }) {
    return await this.projectsService.getAllProjects(options);
  }

  // Create project
  async createProject(
    ownerId: string,
    projectData: {
      name: string;
      description?: string;
      settings?: ProjectSettings;
      allowed_origins?: string[];
      is_active?: boolean;
    }
  ) {
    return await this.projectsService.createProject(ownerId, projectData);
  }

  // Update project
  async updateProject(
    projectId: string,
    updates: {
      name?: string;
      description?: string;
      settings?: ProjectSettings;
      allowed_origins?: string[];
      is_active?: boolean;
    }
  ) {
    return await this.projectsService.updateProject(projectId, updates);
  }

  // Delete project (soft delete)
  async deleteProject(projectId: string) {
    return await this.projectsService.deleteProject(projectId);
  }

  // Hard delete project
  async hardDeleteProject(projectId: string) {
    return await this.projectsService.hardDeleteProject(projectId);
  }

  // Get project statistics
  async getProjectStatistics(projectId: string) {
    return await this.projectsService.getProjectStatistics(projectId);
  }

  // Update project settings
  async updateProjectSettings(projectId: string, settings: ProjectSettings) {
    return await this.projectsService.updateProjectSettings(
      projectId,
      settings
    );
  }

  // Create project API key
  async createProjectApiKey(
    projectId: string,
    apiKeyData: {
      name: string;
      scopes: string[];
      expires_at?: string;
    }
  ) {
    return await this.projectsService.createProjectApiKey(
      projectId,
      apiKeyData
    );
  }

  // Delete project API key
  async deleteProjectApiKey(keyId: string) {
    return await this.projectsService.deleteProjectApiKey(keyId);
  }

  // Get project by API key
  async getProjectByApiKey(apiKey: string) {
    return await this.projectsService.getProjectByApiKey(apiKey);
  }

  // Record API call
  async recordApiCall(projectId: string) {
    return await this.projectsService.recordApiCall(projectId);
  }
}
