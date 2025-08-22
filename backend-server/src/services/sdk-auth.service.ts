import { AuthService } from '@krapi/sdk';

export class SDKAuthService {
  constructor(private authService: AuthService) {}

  async adminLogin(credentials: { username: string; password: string }): Promise<unknown> {
    // SDK doesn't have adminLogin, we need to use authenticateAdmin
    return await this.authService.authenticateAdmin(credentials);
  }

  async adminApiKeyLogin(apiKey: string): Promise<unknown> {
    // SDK doesn't have adminApiKeyLogin, we need to use createSessionFromApiKey
    return await this.authService.createSessionFromApiKey(apiKey);
  }

  async createSession(sessionData: {
    user_id: string;
    user_type: 'admin' | 'project';
    project_id?: string;
    scopes: string[];
    remember_me?: boolean;
    ip_address?: string;
    user_agent?: string;
  }): Promise<unknown> {
    return await this.authService.createSession(sessionData);
  }

  async projectLogin(_projectId: string, _credentials: { username: string; password: string }): Promise<unknown> {
    // SDK doesn't have projectLogin, this would need to be implemented
    throw new Error('projectLogin not implemented in SDK');
  }

  async projectApiKeyLogin(_apiKey: string): Promise<unknown> {
    // SDK doesn't have projectApiKeyLogin, this would need to be implemented
    throw new Error('projectApiKeyLogin not implemented in SDK');
  }

  async validateSession(sessionToken: string): Promise<unknown> {
    return await this.authService.validateSession(sessionToken);
  }

  async refreshSession(_sessionToken: string): Promise<unknown> {
    // SDK doesn't have refreshSession, this would need to be implemented
    throw new Error('refreshSession not implemented in SDK');
  }

  async logout(sessionToken: string): Promise<unknown> {
    return await this.authService.revokeSession(sessionToken);
  }

  async changePassword(
    userId: string,
    userType: 'admin' | 'project',
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    return await this.authService.changePassword(userId, userType, {
      current_password: currentPassword,
      new_password: newPassword
    });
  }

  async resetPassword(email: string): Promise<unknown> {
    // SDK expects PasswordResetRequest object, not just email
    return await this.authService.resetPassword({ email });
  }

  async confirmPasswordReset(_token: string, _newPassword: string): Promise<unknown> {
    // SDK doesn't have confirmPasswordReset, this would need to be implemented
    throw new Error('confirmPasswordReset not implemented in SDK');
  }

  async createApiKey(_userId: string, _apiKeyData: {
    name: string;
    scopes: string[];
    expiresAt?: Date;
    rateLimit?: number;
  }): Promise<unknown> {
    // SDK doesn't have createApiKey in AuthService, this would need to be implemented
    throw new Error('createApiKey not implemented in AuthService');
  }

  async validateApiKey(_apiKey: string): Promise<unknown> {
    // SDK doesn't have validateApiKey, this would need to be implemented
    throw new Error('validateApiKey not implemented in SDK');
  }

  async revokeApiKey(_apiKeyId: string): Promise<unknown> {
    // SDK doesn't have revokeApiKey, this would need to be implemented
    throw new Error('revokeApiKey not implemented in SDK');
  }

  async getUserSessions(userId: string): Promise<unknown[]> {
    // SDK requires userType parameter
    return await this.authService.getUserSessions(userId, 'admin');
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    // SDK requires userType parameter
    return await this.authService.revokeAllUserSessions(userId, 'admin');
  }

  async getUserPermissions(_userId: string): Promise<unknown> {
    // SDK doesn't have getUserPermissions, this would need to be implemented
    throw new Error('getUserPermissions not implemented in SDK');
  }

  async checkUserPermission(_userId: string, _resource: string, _action: string): Promise<boolean> {
    // SDK doesn't have checkUserPermission, this would need to be implemented
    throw new Error('checkUserPermission not implemented in SDK');
  }

  async getUserScopes(_userId: string): Promise<string[]> {
    // SDK doesn't have getUserScopes, this would need to be implemented
    throw new Error('getUserScopes not implemented in SDK');
  }

  async checkUserScope(_userId: string, _scope: string): Promise<boolean> {
    // SDK doesn't have checkUserScope, this would need to be implemented
    throw new Error('checkUserScope not implemented in SDK');
  }
}
