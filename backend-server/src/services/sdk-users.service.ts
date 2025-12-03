import { UsersService } from "@smartsamurai/krapi-sdk";

/**
 * SDK Users Service Wrapper
 * 
 * Wrapper service that delegates to the SDK UsersService.
 * Provides a consistent interface for backend services to access project user operations.
 * 
 * @class SDKUsersService
 * @example
 * const usersService = new UsersService(dbConnection);
 * const sdkUsersService = new SDKUsersService(usersService);
 * const user = await sdkUsersService.createUser('project-id', userData);
 */
export class SDKUsersService {
  /**
   * Create a new SDKUsersService instance
   * 
   * @param {UsersService} usersService - SDK UsersService instance
   */
  constructor(private usersService: UsersService) {}

  async getProjectUsers(
    _projectId: string,
    _options: {
      limit?: number;
      offset?: number;
      search?: string;
      role?: string;
      is_active?: boolean;
    } = {}
  ): Promise<unknown[]> {
    // SDK doesn't have getProjectUsers, this would need to be implemented
    throw new Error("getProjectUsers not implemented in SDK");
  }

  async getUserById(
    projectId: string,
    userId: string
  ): Promise<unknown | null> {
    // SDK expects: getUserById(projectId, userId)
    return await this.usersService.getUserById(projectId, userId);
  }

  async getUserByEmail(
    projectId: string,
    email: string
  ): Promise<unknown | null> {
    // SDK expects: getUserByEmail(projectId, email)
    return await this.usersService.getUserByEmail(projectId, email);
  }

  async getUserByUsername(
    projectId: string,
    username: string
  ): Promise<unknown | null> {
    // SDK expects: getUserByUsername(projectId, username)
    return await this.usersService.getUserByUsername(projectId, username);
  }

  /**
   * Create a new project user
   * 
   * @param {string} projectId - Project ID
   * @param {Object} userData - User data
   * @param {string} userData.username - Username
   * @param {string} userData.email - Email address
   * @param {string} userData.password - Password
   * @param {string} [userData.role] - User role
   * @param {Record<string, unknown>} [userData.metadata] - User metadata
   * @returns {Promise<unknown>} Created user
   * 
   * @example
   * const user = await sdkUsersService.createUser('project-id', {
   *   username: 'newuser',
   *   email: 'user@example.com',
   *   password: 'password'
   * });
   */
  async createUser(
    projectId: string,
    userData: {
      username: string;
      email: string;
      password: string;
      role?: string;
      permissions?: string[];
      metadata?: Record<string, unknown>;
    },
    createdBy?: string
  ): Promise<unknown> {
    // SDK expects: createUser(projectId, userData: CreateUserRequest, createdBy?)
    const createUserData: {
      username: string;
      email: string;
      password: string;
      role?: string;
      permissions?: string[];
      metadata?: Record<string, unknown>;
    } = {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      ...(userData.role && { role: userData.role }),
      ...(userData.permissions && { permissions: userData.permissions }),
      ...(userData.metadata && { metadata: userData.metadata }),
    };
    return await this.usersService.createUser(projectId, createUserData, createdBy);
  }

  async updateUser(
    _projectId: string,
    _userId: string,
    _updates: {
      username?: string;
      email?: string;
      role?: string;
      metadata?: Record<string, unknown>;
      is_active?: boolean;
    }
  ): Promise<unknown | null> {
    // SDK expects: updateUser(projectId, userId, updates: UpdateUserRequest, updatedBy?)
    throw new Error("updateUser not implemented in SDK");
  }

  async deleteUser(_projectId: string, _userId: string): Promise<boolean> {
    // SDK expects: deleteUser(projectId, userId, deletedBy?)
    throw new Error("deleteUser not implemented in SDK");
  }

  async changePassword(
    _projectId: string,
    _userId: string,
    _newPassword: string,
    _changedBy?: string
  ): Promise<boolean> {
    // SDK expects: changeUserPassword(projectId, userId, newPassword, changedBy?)
    throw new Error("changePassword not implemented in SDK");
  }

  async resetPassword(_userId: string, _newPassword: string): Promise<unknown> {
    // SDK doesn't have resetPassword, this would need to be implemented
    throw new Error("resetPassword not implemented in SDK");
  }

  async verifyEmail(
    _userId: string,
    _verificationToken: string
  ): Promise<unknown> {
    // SDK doesn't have verifyEmail, this would need to be implemented
    throw new Error("verifyEmail not implemented in SDK");
  }

  async sendVerificationEmail(_userId: string): Promise<unknown> {
    // SDK doesn't have sendVerificationEmail, this would need to be implemented
    throw new Error("sendVerificationEmail not implemented in SDK");
  }

  async getUserProfile(_userId: string): Promise<unknown> {
    // SDK doesn't have getUserProfile, this would need to be implemented
    throw new Error("getUserProfile not implemented in SDK");
  }

  async updateUserProfile(
    _userId: string,
    _profile: {
      first_name?: string;
      last_name?: string;
      display_name?: string;
      avatar_url?: string;
      bio?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<unknown> {
    // SDK doesn't have updateUserProfile, this would need to be implemented
    throw new Error("updateUserProfile not implemented in SDK");
  }

  async getUserPermissions(_userId: string): Promise<unknown> {
    // SDK doesn't have getUserPermissions, this would need to be implemented
    throw new Error("getUserPermissions not implemented in SDK");
  }

  async updateUserPermissions(
    _userId: string,
    _permissions: string[]
  ): Promise<unknown> {
    // SDK doesn't have updateUserPermissions, this would need to be implemented
    throw new Error("updateUserPermissions not implemented in SDK");
  }
}
