import { DatabaseService } from "../../../database.service";

/**
 * File Versions Service
 *
 * Handles file versioning including creating versions, retrieving versions,
 * and restoring from versions.
 */
export class FileVersionsService {
  constructor(private db: DatabaseService) {}

  async createFileVersion(
    projectId: string,
    fileId: string,
    versionData: {
      version_number: number;
      size: number;
      mime_type: string;
      storage_path: string;
      created_by: string;
      changes_description?: string;
    }
  ) {
    const sql = `
      INSERT INTO file_versions (
        file_id, version_number, size, mime_type,
        storage_path, created_by, created_at, changes_description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      fileId,
      versionData.version_number,
      versionData.size,
      versionData.mime_type,
      versionData.storage_path,
      versionData.created_by,
      new Date().toISOString(),
      versionData.changes_description || null,
    ];

    await this.db.executeProject(projectId, sql, params);
    return versionData;
  }

  async getFileVersions(projectId: string, fileId: string) {
    const sql = `
      SELECT fv.*, u.username as created_by_username
      FROM file_versions fv
      LEFT JOIN project_users u ON fv.created_by = u.id
      WHERE fv.file_id = ?
      ORDER BY fv.version_number DESC
    `;

    const result = await this.db.queryProject(projectId, sql, [fileId]);
    return result;
  }

  async getFileVersion(
    projectId: string,
    fileId: string,
    versionNumber: number
  ) {
    const sql = `SELECT * FROM file_versions WHERE file_id = ? AND version_number = ?`;
    const result = await this.db.queryProjectOne(projectId, sql, [
      fileId,
      versionNumber,
    ]);
    return result;
  }

  async getLatestFileVersion(projectId: string, fileId: string) {
    const sql = `
      SELECT * FROM file_versions
      WHERE file_id = ?
      ORDER BY version_number DESC
      LIMIT 1
    `;

    const result = await this.db.queryProjectOne(projectId, sql, [fileId]);
    return result;
  }

  async deleteFileVersion(
    projectId: string,
    fileId: string,
    versionNumber: number
  ) {
    const sql = `DELETE FROM file_versions WHERE file_id = ? AND version_number = ?`;
    const result = await this.db.executeProject(projectId, sql, [
      fileId,
      versionNumber,
    ]);
    return result.changes > 0;
  }

  async getNextVersionNumber(
    projectId: string,
    fileId: string
  ): Promise<number> {
    const sql = `SELECT MAX(version_number) as max_version FROM file_versions WHERE file_id = ?`;
    const result = await this.db.queryProjectOne(projectId, sql, [fileId]);
    const maxVersion = (result?.max_version as number | undefined) || 0;
    return maxVersion + 1;
  }
}
