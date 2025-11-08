import {
  ProjectUser,
  AdminUser,
  ProjectSettings,
  EmailConfig,
  EmailTemplate,
  FileInfo,
  StorageStats,
  AdminRole,
  AccessLevel,
} from "@krapi/sdk";

import {
  BackendProjectUser,
  BackendAdminUser,
  BackendFileRecord,
} from "@/types";

/**
 * Type Mapper Utility
 * 
 * Converts between backend types and SDK types to ensure compatibility.
 * Provides mapping functions for users, projects, settings, email, and storage types.
 * 
 * @class TypeMapper
 * @example
 * const backendUser = { id: '1', username: 'user', ... };
 * const sdkUser = TypeMapper.mapProjectUser(backendUser);
 */
export class TypeMapper {
  /**
   * Map backend project user to SDK project user
   * 
   * @param {BackendProjectUser} backendUser - Backend project user
   * @returns {ProjectUser} SDK project user
   * 
   * @example
   * const sdkUser = TypeMapper.mapProjectUser(backendUser);
   */
  static mapProjectUser(backendUser: BackendProjectUser): ProjectUser {
    return {
      id: backendUser.id,
      project_id: backendUser.project_id,
      username: backendUser.username || "",
      email: backendUser.email || "",
      // Note: first_name and last_name are not available in ProjectUser interface
      // is_verified is not available in ProjectUser interface
      is_active: backendUser.is_active,
      // Note: access_scopes is not available in ProjectUser interface
      // Note: register_date is not available in ProjectUser interface
      updated_at: backendUser.updated_at,
      last_login: backendUser.last_login,
      // Note: email_verified_at and phone_verified_at are not available in ProjectUser interface
      // Note: custom_fields is not available in ProjectUser interface
      role: "user",
      permissions: backendUser.scopes || [],
      metadata: backendUser.metadata || {},
      login_count: 0,
      created_at: backendUser.created_at,
    };
  }

  /**
   * Map backend admin user to SDK admin user
   * 
   * @param {BackendAdminUser} backendUser - Backend admin user
   * @returns {AdminUser} SDK admin user
   * 
   * @example
   * const sdkUser = TypeMapper.mapAdminUser(backendUser);
   */
  static mapAdminUser(backendUser: BackendAdminUser): AdminUser {
    // Map backend AdminRole to SDK AdminRole
    let sdkRole: AdminRole;
    switch (backendUser.role) {
      case "master_admin":
        sdkRole = AdminRole.MASTER_ADMIN;
        break;
      case "admin":
        sdkRole = AdminRole.ADMIN;
        break;
      case "developer":
        sdkRole = AdminRole.DEVELOPER;
        break;
      default:
        sdkRole = AdminRole.ADMIN;
    }

    // Map backend AccessLevel to SDK AccessLevel
    let sdkAccessLevel: AccessLevel;
    switch (backendUser.access_level) {
      case "full":
        sdkAccessLevel = AccessLevel.ADMIN;
        break;
      case "read_write":
        sdkAccessLevel = AccessLevel.WRITE;
        break;
      case "read_only":
        sdkAccessLevel = AccessLevel.READ;
        break;
      default:
        sdkAccessLevel = AccessLevel.WRITE;
    }

    return {
      id: backendUser.id,
      username: backendUser.username,
      email: backendUser.email,
      password_hash: backendUser.password_hash,
      role: sdkRole,
      access_level: sdkAccessLevel,
      permissions: backendUser.permissions.map((p) => p.toString()),
      active: backendUser.active,
      created_at: backendUser.created_at,
      updated_at: backendUser.updated_at,
      last_login: backendUser.last_login,
    };
  }

  /**
   * Map backend project settings to SDK project settings
   * 
   * @param {Record<string, unknown>} _backendSettings - Backend project settings
   * @returns {ProjectSettings} SDK project settings
   * 
   * @example
   * const sdkSettings = TypeMapper.mapProjectSettings(backendSettings);
   */
  static mapProjectSettings(
    _backendSettings: Record<string, unknown>
  ): ProjectSettings {
    return {
      // Note: storage property is not available in ProjectSettings interface
      // Note: auth is not available in ProjectSettings interface
      // Note: rate_limit is not available in ProjectSettings interface
      // Note: isTestProject is not available in ProjectSettings interface
      authentication_required: false,
      cors_enabled: true,
      rate_limiting_enabled: false,
      logging_enabled: true,
      // Note: debug_mode, maintenance_mode, api_version, max_file_size, allowed_file_types are not available in ProjectSettings interface
      encryption_enabled: false,
      backup_enabled: false,
      max_file_size: 10485760,
      allowed_file_types: ["*"],
      // Note: max_storage_size is not available in ProjectSettings interface
      // Note: max_api_calls_per_minute is not available in ProjectSettings interface
      custom_headers: {},
      environment: "development",
    };
  }

  /**
   * Map backend email config to SDK email config
   * 
   * @param {Record<string, unknown>} backendConfig - Backend email configuration
   * @returns {EmailConfig} SDK email configuration
   * 
   * @example
   * const sdkConfig = TypeMapper.mapEmailConfig(backendConfig);
   */
  static mapEmailConfig(backendConfig: Record<string, unknown>): EmailConfig {
    return {
      smtp_host: backendConfig.smtp_host as string,
      smtp_port: backendConfig.smtp_port as number,
      smtp_username: backendConfig.smtp_username as string,
      smtp_password: backendConfig.smtp_password as string,
      smtp_secure: backendConfig.smtp_secure as boolean,
      from_email: backendConfig.from_email as string,
      from_name: backendConfig.from_name as string,
    };
  }

  /**
   * Map backend email template to SDK email template
   * 
   * @param {Object} backendTemplate - Backend email template
   * @param {string} backendTemplate.id - Template ID
   * @param {string} backendTemplate.project_id - Project ID
   * @param {string} backendTemplate.name - Template name
   * @param {string} backendTemplate.subject - Email subject
   * @param {string} backendTemplate.body - Email body
   * @param {string[]} [backendTemplate.variables] - Template variables
   * @param {string} backendTemplate.created_at - Creation timestamp
   * @param {string} backendTemplate.updated_at - Update timestamp
   * @returns {EmailTemplate} SDK email template
   * 
   * @example
   * const sdkTemplate = TypeMapper.mapEmailTemplate(backendTemplate);
   */
  static mapEmailTemplate(backendTemplate: {
    id: string;
    project_id: string;
    name: string;
    subject: string;
    body: string;
    variables?: string[];
    created_at: string;
    updated_at: string;
  }): EmailTemplate {
    return {
      id: backendTemplate.id,
      project_id: backendTemplate.project_id,
      name: backendTemplate.name,
      subject: backendTemplate.subject,
      body: backendTemplate.body,
      variables: backendTemplate.variables || [],
      created_at: backendTemplate.created_at,
      updated_at: backendTemplate.updated_at,
    };
  }

  static mapFileInfo(backendFile: BackendFileRecord): FileInfo {
    return {
      id: backendFile.id,
      project_id: backendFile.project_id,
      name: backendFile.filename,
      filename: backendFile.filename, // Alias for backward compatibility
      original_name: backendFile.original_name,
      mime_type: backendFile.mime_type,
      size: backendFile.size,
      path: backendFile.path,
      url: backendFile.url,
      uploaded_by: backendFile.uploaded_by,
      // relations not available in SDK FileInfo
      created_at: backendFile.created_at,
      updated_at: backendFile.updated_at || backendFile.created_at, // Use created_at as fallback
      public: false,
    };
  }

  static mapStorageStats(backendStats: Record<string, unknown>): StorageStats {
    return {
      total_size: backendStats.total_size as number,
      file_count: backendStats.file_count as number,
      collections_count: (backendStats.collections_count as number) || 0,
      projects_count: (backendStats.projects_count as number) || 1,
      last_updated:
        (backendStats.last_updated as string) || new Date().toISOString(),
    };
  }
}
