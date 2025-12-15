import { DatabaseService } from "../../../database.service";

/**
 * File Permissions Service
 *
 * Handles file permission management including granting, revoking, and checking permissions.
 */
export class FilePermissionsService {
  constructor(private db: DatabaseService) {}

  async grantFilePermission(
    projectId: string,
    fileId: string,
    userId: string,
    permission: string
  ) {
    const sql = `
      INSERT OR REPLACE INTO file_permissions (
        file_id, user_id, permission, granted_at
      ) VALUES (?, ?, ?, ?)
    `;

    const params = [fileId, userId, permission, new Date().toISOString()];
    await this.db.executeProject(projectId, sql, params);
  }

  async revokeFilePermission(
    projectId: string,
    fileId: string,
    userId: string
  ) {
    const sql = `DELETE FROM file_permissions WHERE file_id = ? AND user_id = ?`;
    const result = await this.db.executeProject(projectId, sql, [
      fileId,
      userId,
    ]);
    return result.changes > 0;
  }

  async getFilePermissions(projectId: string, fileId: string) {
    const sql = `
      SELECT fp.*, u.username
      FROM file_permissions fp
      JOIN project_users u ON fp.user_id = u.id
      WHERE fp.file_id = ?
    `;

    const result = await this.db.queryProject(projectId, sql, [fileId]);
    return result;
  }

  async checkFilePermission(
    projectId: string,
    fileId: string,
    userId: string,
    permission: string
  ) {
    const sql = `
      SELECT 1 FROM file_permissions
      WHERE file_id = ? AND user_id = ? AND permission = ?
    `;

    const result = await this.db.queryProjectOne(projectId, sql, [
      fileId,
      userId,
      permission,
    ]);
    return !!result;
  }

  async getUserFilePermissions(projectId: string, userId: string) {
    const sql = `
      SELECT fp.*, f.name as file_name, f.path as file_path
      FROM file_permissions fp
      JOIN files f ON fp.file_id = f.id
      WHERE fp.user_id = ?
    `;

    const result = await this.db.queryProject(projectId, sql, [userId]);
    return result;
  }
}
