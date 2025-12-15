import { DatabaseService } from "../../../database.service";

/**
 * File Access Service
 *
 * Handles file access control including public/private access and URL generation.
 */
export class FileAccessService {
  constructor(private db: DatabaseService) {}

  async makeFilePublic(projectId: string, fileId: string) {
    const sql = `UPDATE files SET is_public = 1, updated_at = ? WHERE id = ? AND project_id = ?`;
    const now = new Date().toISOString();

    await this.db.executeProject(projectId, sql, [now, fileId, projectId]);

    // Generate public URL
    const publicUrl = this.generatePublicFileUrl(projectId, fileId);
    return { publicUrl };
  }

  async makeFilePrivate(projectId: string, fileId: string) {
    const sql = `UPDATE files SET is_public = 0, updated_at = ? WHERE id = ? AND project_id = ?`;
    const now = new Date().toISOString();

    await this.db.executeProject(projectId, sql, [now, fileId, projectId]);
    return { success: true };
  }

  async isFilePublic(projectId: string, fileId: string) {
    const sql = `SELECT is_public FROM files WHERE id = ? AND project_id = ?`;
    const result = await this.db.queryProjectOne(projectId, sql, [
      fileId,
      projectId,
    ]);
    return result?.is_public === 1;
  }

  async getPublicFiles(
    projectId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let sql = `SELECT * FROM files WHERE project_id = ? AND is_public = 1 ORDER BY created_at DESC`;
    const params: unknown[] = [projectId];

    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    const result = await this.db.queryProject(projectId, sql, params);
    return result;
  }

  async generateFileUrl(projectId: string, fileId: string, isPublic = false) {
    if (isPublic) {
      return this.generatePublicFileUrl(projectId, fileId);
    } else {
      return this.generatePrivateFileUrl(projectId, fileId);
    }
  }

  private generatePublicFileUrl(projectId: string, fileId: string) {
    // Public URL format: /api/files/public/{projectId}/{fileId}
    return `/api/files/public/${projectId}/${fileId}`;
  }

  private generatePrivateFileUrl(projectId: string, fileId: string) {
    // Private URL format: /api/files/private/{projectId}/{fileId}
    return `/api/files/private/${projectId}/${fileId}`;
  }

  async validateFileAccess(projectId: string, fileId: string, userId?: string) {
    const file = await this.db.queryProjectOne(
      projectId,
      "SELECT * FROM files WHERE id = ? AND project_id = ?",
      [fileId, projectId]
    );

    if (!file) {
      return { canAccess: false, reason: "File not found" };
    }

    // Public files can be accessed by anyone
    if (file.is_public) {
      return { canAccess: true };
    }

    // Private files require authentication
    if (!userId) {
      return { canAccess: false, reason: "Authentication required" };
    }

    // Check if user owns the file or has permissions
    if (file.created_by === userId) {
      return { canAccess: true };
    }

    // Check file permissions
    const permission = await this.db.queryProjectOne(
      projectId,
      "SELECT 1 FROM file_permissions WHERE file_id = ? AND user_id = ? AND permission IN (?, ?)",
      [fileId, userId, "read", "write"]
    );

    if (permission) {
      return { canAccess: true };
    }

    return { canAccess: false, reason: "Insufficient permissions" };
  }
}
