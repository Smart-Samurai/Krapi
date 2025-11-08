import { ProjectsService, ProjectSettings } from "@krapi/sdk";

/**
 * SDK Projects Service Wrapper
 * 
 * Wrapper service that delegates to the SDK ProjectsService.
 * Provides a consistent interface for backend services to access project operations.
 * 
 * @class SDKProjectsService
 * @example
 * const projectsService = new ProjectsService(dbConnection);
 * const sdkProjectsService = new SDKProjectsService(projectsService);
 * const project = await sdkProjectsService.getProjectById('project-id');
 */
export class SDKProjectsService {
  private projectsService: ProjectsService;

  /**
   * Create a new SDKProjectsService instance
   * 
   * @param {ProjectsService} projectsService - SDK ProjectsService instance
   */
  constructor(projectsService: ProjectsService) {
    this.projectsService = projectsService;
  }

  /**
   * Get project by ID
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<Project | null>} Project or null if not found
   * 
   * @example
   * const project = await sdkProjectsService.getProjectById('project-id');
   */
  async getProjectById(projectId: string) {
    return await this.projectsService.getProjectById(projectId);
  }

  /**
   * Get all projects
   * 
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of projects to return
   * @param {number} [options.offset] - Number of projects to skip
   * @param {string} [options.search] - Search term for project name/description
   * @param {boolean} [options.active] - Filter by active status
   * @param {string} [options.owner_id] - Filter by owner ID
   * @returns {Promise<Project[]>} Array of projects
   * 
   * @example
   * const projects = await sdkProjectsService.getAllProjects({ limit: 10, active: true });
   */
  async getAllProjects(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    active?: boolean;
    owner_id?: string;
  }) {
    return await this.projectsService.getAllProjects(options);
  }

  /**
   * Create a new project
   * 
   * @param {string} ownerId - Owner/admin user ID
   * @param {Object} projectData - Project data
   * @param {string} projectData.name - Project name
   * @param {string} [projectData.description] - Project description
   * @param {ProjectSettings} [projectData.settings] - Project settings
   * @param {string[]} [projectData.allowed_origins] - Allowed CORS origins
   * @param {boolean} [projectData.is_active] - Whether project is active
   * @returns {Promise<Project>} Created project
   * 
   * @example
   * const project = await sdkProjectsService.createProject('owner-id', {
   *   name: 'My Project',
   *   description: 'Project description'
   * });
   */
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

  /**
   * Update an existing project
   * 
   * @param {string} projectId - Project ID
   * @param {Object} updates - Project updates
   * @param {string} [updates.name] - New project name
   * @param {string} [updates.description] - New project description
   * @param {ProjectSettings} [updates.settings] - Updated project settings
   * @param {string[]} [updates.allowed_origins] - Updated allowed origins
   * @param {boolean} [updates.is_active] - Updated active status
   * @returns {Promise<Project>} Updated project
   * 
   * @example
   * const updated = await sdkProjectsService.updateProject('project-id', {
   *   name: 'Updated Name'
   * });
   */
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

  /**
   * Delete a project (soft delete)
   * 
   * Marks the project as deleted but doesn't remove it from the database.
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} True if deleted successfully
   * 
   * @example
   * await sdkProjectsService.deleteProject('project-id');
   */
  async deleteProject(projectId: string) {
    return await this.projectsService.deleteProject(projectId);
  }

  /**
   * Hard delete a project
   * 
   * Permanently removes the project and all its data from the database.
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<boolean>} True if deleted successfully
   * 
   * @example
   * await sdkProjectsService.hardDeleteProject('project-id');
   */
  async hardDeleteProject(projectId: string) {
    return await this.projectsService.hardDeleteProject(projectId);
  }

  /**
   * Get project statistics
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<ProjectStats>} Project statistics
   * 
   * @example
   * const stats = await sdkProjectsService.getProjectStatistics('project-id');
   */
  async getProjectStatistics(projectId: string) {
    return await this.projectsService.getProjectStatistics(projectId);
  }

  /**
   * Update project settings
   * 
   * @param {string} projectId - Project ID
   * @param {ProjectSettings} settings - Updated project settings
   * @returns {Promise<Project>} Updated project
   * 
   * @example
   * await sdkProjectsService.updateProjectSettings('project-id', {
   *   authentication_required: true
   * });
   */
  async updateProjectSettings(projectId: string, settings: ProjectSettings) {
    return await this.projectsService.updateProjectSettings(
      projectId,
      settings
    );
  }

  /**
   * Create a project API key
   * 
   * @param {string} projectId - Project ID
   * @param {Object} apiKeyData - API key data
   * @param {string} apiKeyData.name - API key name
   * @param {string[]} apiKeyData.scopes - API key scopes
   * @param {string} [apiKeyData.expires_at] - Expiration date (ISO string)
   * @returns {Promise<ApiKey>} Created API key
   * 
   * @example
   * const apiKey = await sdkProjectsService.createProjectApiKey('project-id', {
   *   name: 'My API Key',
   *   scopes: ['collections:read', 'documents:write']
   * });
   */
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

  /**
   * Delete a project API key
   * 
   * @param {string} keyId - API key ID
   * @returns {Promise<boolean>} True if deleted successfully
   * 
   * @example
   * await sdkProjectsService.deleteProjectApiKey('key-id');
   */
  async deleteProjectApiKey(keyId: string) {
    return await this.projectsService.deleteProjectApiKey(keyId);
  }

  /**
   * Get project by API key
   * 
   * @param {string} apiKey - API key string
   * @returns {Promise<Project | null>} Project or null if not found
   * 
   * @example
   * const project = await sdkProjectsService.getProjectByApiKey('pk_...');
   */
  async getProjectByApiKey(apiKey: string) {
    return await this.projectsService.getProjectByApiKey(apiKey);
  }

  // Record API call
  async recordApiCall(projectId: string) {
    return await this.projectsService.recordApiCall(projectId);
  }
}
