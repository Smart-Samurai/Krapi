import type { AdminUser } from "@smartsamurai/krapi-sdk";

/**
 * Extended Admin User type
 * Extends the SDK AdminUser with additional frontend-specific properties
 */
export interface ExtendedAdminUser extends AdminUser {
  project_ids?: string[];
}

