import {
  ProjectUser as SDKProjectUser,
  AdminUser as SDKAdminUser,
  ProjectSettings as SDKProjectSettings,
  EmailConfig as SDKEmailConfig,
  EmailTemplate as SDKEmailTemplate,
  FileInfo as SDKFileInfo,
  StorageStats as SDKStorageStats,
  AdminRole as SDKAdminRole,
  AccessLevel as SDKAccessLevel,
} from "@krapi/sdk";

import {
  ProjectUser as BackendProjectUser,
  AdminUser as BackendAdminUser,
  ProjectSettings as BackendProjectSettings,
  EmailConfig as BackendEmailConfig,
  FileInfo as BackendFileInfo,
  StorageStats as BackendStorageStats,
} from "@/types";

/**
 * Type Mapper Utility
 *
 * Converts between backend types and SDK types to ensure compatibility
 */
export class TypeMapper {
  static mapProjectUser(backendUser: BackendProjectUser): SDKProjectUser {
    return {
      id: backendUser.id,
      project_id: backendUser.project_id,
      username: backendUser.username,
      email: backendUser.email,
      phone: backendUser.phone,
      is_verified: backendUser.is_verified,
      is_active: backendUser.is_active,
      access_scopes: backendUser.scopes || [],
      register_date: backendUser.created_at,
      updated_at: backendUser.updated_at,
      last_login: backendUser.last_login,
      email_verified_at: backendUser.email_verified_at,
      phone_verified_at: backendUser.phone_verified_at,
      custom_fields: backendUser.metadata || {},
    };
  }

  static mapAdminUser(backendUser: BackendAdminUser): SDKAdminUser {
    // Map backend AdminRole to SDK AdminRole
    let sdkRole: SDKAdminRole;
    switch (backendUser.role) {
      case "master_admin":
        sdkRole = SDKAdminRole.MASTER_ADMIN;
        break;
      case "admin":
        sdkRole = SDKAdminRole.ADMIN;
        break;
      case "project_admin":
        sdkRole = SDKAdminRole.DEVELOPER; // Map project_admin to developer
        break;
      case "limited_admin":
        sdkRole = SDKAdminRole.DEVELOPER; // Map limited_admin to developer
        break;
      default:
        sdkRole = SDKAdminRole.DEVELOPER;
    }

    // Map backend AccessLevel to SDK AccessLevel
    let sdkAccessLevel: SDKAccessLevel;
    switch (backendUser.access_level) {
      case "full":
        sdkAccessLevel = SDKAccessLevel.FULL;
        break;
      case "projects_only":
        sdkAccessLevel = SDKAccessLevel.READ_WRITE;
        break;
      case "read_only":
        sdkAccessLevel = SDKAccessLevel.READ_ONLY;
        break;
      case "custom":
        sdkAccessLevel = SDKAccessLevel.READ_WRITE;
        break;
      default:
        sdkAccessLevel = SDKAccessLevel.READ_WRITE;
    }

    return {
      id: backendUser.id,
      username: backendUser.username,
      email: backendUser.email,
      password_hash: backendUser.password_hash,
      role: sdkRole,
      access_level: sdkAccessLevel,
      permissions: backendUser.permissions,
      active: backendUser.active,
      created_at: backendUser.created_at,
      updated_at: backendUser.updated_at,
      last_login: backendUser.last_login,
    };
  }

  static mapProjectSettings(
    backendSettings: BackendProjectSettings
  ): SDKProjectSettings {
    return {
      email: backendSettings.email_config,
      storage: backendSettings.storage_config
        ? {
            max_file_size: backendSettings.storage_config.max_file_size,
            allowed_mime_types: backendSettings.storage_config.allowed_types,
            storage_limit: 1024 * 1024 * 1024, // Default 1GB since backend doesn't have this
          }
        : undefined,
      auth: backendSettings.auth_config,
      rate_limit: backendSettings.rate_limits,
      isTestProject: backendSettings.isTestProject,
    };
  }

  static mapEmailConfig(backendConfig: BackendEmailConfig): SDKEmailConfig {
    return {
      smtp_host: backendConfig.smtp_host,
      smtp_port: backendConfig.smtp_port,
      smtp_username: backendConfig.smtp_username,
      smtp_password: backendConfig.smtp_password,
      smtp_secure: backendConfig.smtp_secure,
      from_email: backendConfig.from_email,
      from_name: backendConfig.from_name,
    };
  }

  static mapEmailTemplate(backendTemplate: {
    id: string;
    project_id: string;
    name: string;
    subject: string;
    body: string;
    variables?: string[];
    created_at: string;
    updated_at: string;
  }): SDKEmailTemplate {
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

  static mapFileInfo(backendFile: BackendFileInfo): SDKFileInfo {
    return {
      id: backendFile.id,
      project_id: backendFile.project_id,
      filename: backendFile.filename,
      original_name: backendFile.original_name,
      mime_type: backendFile.mime_type,
      size: backendFile.size,
      url: backendFile.url,
      uploaded_by: backendFile.uploaded_by,
      relations: backendFile.relations || [],
      created_at: backendFile.created_at,
      updated_at: backendFile.updated_at || backendFile.created_at,
    };
  }

  static mapStorageStats(backendStats: BackendStorageStats): SDKStorageStats {
    return {
      total_size: backendStats.total_size,
      file_count: backendStats.file_count,
      storage_limit: backendStats.storage_limit,
      usage_percentage: backendStats.usage_percentage,
    };
  }
}
