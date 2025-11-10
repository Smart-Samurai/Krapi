import { AuthService } from "@smartsamurai/krapi-sdk";

/**
 * SDK Auth Service Wrapper
 * 
 * Wrapper service that delegates to the SDK AuthService.
 * Provides a consistent interface for backend services to access authentication operations.
 * 
 * @class SDKAuthService
 * @example
 * const authService = new AuthService(dbConnection);
 * const sdkAuthService = new SDKAuthService(authService);
 * const session = await sdkAuthService.adminLogin({ username: 'admin', password: 'pass' });
 */
export class SDKAuthService {
  /**
   * Create a new SDKAuthService instance
   * 
   * @param {AuthService} authService - SDK AuthService instance
   */
  constructor(private authService: AuthService) {}

  /**
   * Admin login with username and password
   * 
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.username - Admin username
   * @param {string} credentials.password - Admin password
   * @returns {Promise<unknown>} Authentication result with session token
   * 
   * @example
   * const result = await sdkAuthService.adminLogin({
   *   username: 'admin',
   *   password: 'password'
   * });
   */
  async adminLogin(credentials: {
    username: string;
    password: string;
  }): Promise<unknown> {
    // SDK doesn't have adminLogin, we need to use authenticateAdmin
    return await this.authService.authenticateAdmin(credentials);
  }

  /**
   * Admin login with API key
   * 
   * @param {string} apiKey - Admin API key
   * @returns {Promise<unknown>} Authentication result with session token
   * 
   * @example
   * const result = await sdkAuthService.adminApiKeyLogin('ak_...');
   */
  async adminApiKeyLogin(apiKey: string): Promise<unknown> {
    // SDK doesn't have adminApiKeyLogin, we need to use createSessionFromApiKey
    return await this.authService.createSessionFromApiKey(apiKey);
  }

  /**
   * Create a new session
   * 
   * @param {Object} sessionData - Session data
   * @param {string} sessionData.user_id - User ID
   * @param {"admin" | "project"} sessionData.user_type - User type
   * @param {string} [sessionData.project_id] - Project ID (for project users)
   * @param {string[]} sessionData.scopes - User scopes
   * @param {boolean} [sessionData.remember_me] - Whether to remember session
   * @param {string} [sessionData.ip_address] - Client IP address
   * @param {string} [sessionData.user_agent] - Client user agent
   * @returns {Promise<unknown>} Created session
   * 
   * @example
   * const session = await sdkAuthService.createSession({
   *   user_id: 'user-id',
   *   user_type: 'admin',
   *   scopes: ['admin:read']
   * });
   */
  async createSession(sessionData: {
    user_id: string;
    user_type: "admin" | "project";
    project_id?: string;
    scopes: string[];
    remember_me?: boolean;
    ip_address?: string;
    user_agent?: string;
  }): Promise<unknown> {
    return await this.authService.createSession(sessionData);
  }

  async projectLogin(
    _projectId: string,
    _credentials: { username: string; password: string }
  ): Promise<unknown> {
    // SDK doesn't have projectLogin, this would need to be implemented
    throw new Error("projectLogin not implemented in SDK");
  }

  async projectApiKeyLogin(_apiKey: string): Promise<unknown> {
    // SDK doesn't have projectApiKeyLogin, this would need to be implemented
    throw new Error("projectApiKeyLogin not implemented in SDK");
  }

  /**
   * Validate a session token
   * 
   * @param {string} sessionToken - Session token to validate
   * @returns {Promise<unknown>} Session data if valid
   * 
   * @example
   * const session = await sdkAuthService.validateSession('session-token');
   */
  async validateSession(sessionToken: string): Promise<unknown> {
    return await this.authService.validateSession(sessionToken);
  }

  async refreshSession(_sessionToken: string): Promise<unknown> {
    // SDK doesn't have refreshSession, this would need to be implemented
    throw new Error("refreshSession not implemented in SDK");
  }

  /**
   * Register a new user
   * 
   * @param {Object} registerData - Registration data
   * @param {string} registerData.username - Username
   * @param {string} registerData.email - Email address
   * @param {string} registerData.password - Password
   * @param {string} [registerData.role] - User role
   * @param {string} [registerData.access_level] - Access level
   * @param {string[]} [registerData.permissions] - User permissions
   * @returns {Promise<unknown>} Registration result
   * 
   * @example
   * const result = await sdkAuthService.register({
   *   username: 'newuser',
   *   email: 'user@example.com',
   *   password: 'password'
   * });
   */
  async register(registerData: {
    username: string;
    email: string;
    password: string;
    role?: string;
    access_level?: string;
    permissions?: string[];
  }): Promise<unknown> {
    return await this.authService.register(registerData);
  }

  /**
   * Logout and invalidate session
   * 
   * @param {string} [sessionId] - Session ID to invalidate (if not provided, invalidates current session)
   * @returns {Promise<unknown>} Logout result
   * 
   * @example
   * await sdkAuthService.logout('session-id');
   */
  async logout(sessionId?: string): Promise<unknown> {
    return await this.authService.logout(sessionId);
  }

  /**
   * Change user password
   * 
   * @param {string} userId - User ID
   * @param {"admin" | "project"} userType - User type
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} True if password changed successfully
   * 
   * @example
   * const success = await sdkAuthService.changePassword(
   *   'user-id',
   *   'admin',
   *   'old-password',
   *   'new-password'
   * );
   */
  async changePassword(
    userId: string,
    userType: "admin" | "project",
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    return await this.authService.changePassword(userId, userType, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  async resetPassword(email: string): Promise<unknown> {
    // SDK expects PasswordResetRequest object, not just email
    return await this.authService.resetPassword({ email });
  }

  async confirmPasswordReset(
    _token: string,
    _newPassword: string
  ): Promise<unknown> {
    // SDK doesn't have confirmPasswordReset, this would need to be implemented
    throw new Error("confirmPasswordReset not implemented in SDK");
  }

  async createApiKey(
    _userId: string,
    _apiKeyData: {
      name: string;
      scopes: string[];
      expiresAt?: Date;
      rateLimit?: number;
    }
  ): Promise<unknown> {
    // SDK doesn't have createApiKey in AuthService, this would need to be implemented
    throw new Error("createApiKey not implemented in AuthService");
  }

  async validateApiKey(_apiKey: string): Promise<unknown> {
    // SDK doesn't have validateApiKey, this would need to be implemented
    throw new Error("validateApiKey not implemented in SDK");
  }

  async revokeApiKey(_apiKeyId: string): Promise<unknown> {
    // SDK doesn't have revokeApiKey, this would need to be implemented
    throw new Error("revokeApiKey not implemented in SDK");
  }

  async getUserSessions(userId: string): Promise<unknown[]> {
    // SDK requires userType parameter
    return await this.authService.getUserSessions(userId, "admin");
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    // SDK requires userType parameter
    return await this.authService.revokeAllUserSessions(userId, "admin");
  }

  async getUserPermissions(_userId: string): Promise<unknown> {
    // SDK doesn't have getUserPermissions, this would need to be implemented
    throw new Error("getUserPermissions not implemented in SDK");
  }

  async checkUserPermission(
    _userId: string,
    _resource: string,
    _action: string
  ): Promise<boolean> {
    // SDK doesn't have checkUserPermission, this would need to be implemented
    throw new Error("checkUserPermission not implemented in SDK");
  }

  async getUserScopes(_userId: string): Promise<string[]> {
    // SDK doesn't have getUserScopes, this would need to be implemented
    throw new Error("getUserScopes not implemented in SDK");
  }

  async checkUserScope(_userId: string, _scope: string): Promise<boolean> {
    // SDK doesn't have checkUserScope, this would need to be implemented
    throw new Error("checkUserScope not implemented in SDK");
  }
}
