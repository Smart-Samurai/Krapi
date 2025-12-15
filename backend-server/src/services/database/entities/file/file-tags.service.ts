import { DatabaseService } from "../../../database.service";

/**
 * File Tags Service
 *
 * Handles file tagging operations including adding, removing, and querying tags.
 */
export class FileTagsService {
  constructor(private db: DatabaseService) {}

  async addFileTags(projectId: string, fileId: string, tags: string[]) {
    const sql = `INSERT OR IGNORE INTO file_tags (file_id, tag, added_at) VALUES (?, ?, ?)`;
    const now = new Date().toISOString();

    for (const tag of tags) {
      await this.db.executeProject(projectId, sql, [fileId, tag, now]);
    }
  }

  async removeFileTags(projectId: string, fileId: string, tags: string[]) {
    const placeholders = tags.map(() => "?").join(",");
    const sql = `DELETE FROM file_tags WHERE file_id = ? AND tag IN (${placeholders})`;

    const params = [fileId, ...tags];
    await this.db.executeProject(projectId, sql, params);
  }

  async getFileTags(projectId: string, fileId: string): Promise<string[]> {
    const sql = `SELECT tag FROM file_tags WHERE file_id = ? ORDER BY added_at DESC`;
    const result = await this.db.queryProject(projectId, sql, [fileId]);
    return result.rows.map((row: Record<string, unknown>) => row.tag as string);
  }

  async getFilesByTags(projectId: string, tags: string[]) {
    const placeholders = tags.map(() => "?").join(",");
    const sql = `
      SELECT DISTINCT f.*
      FROM files f
      JOIN file_tags ft ON f.id = ft.file_id
      WHERE ft.tag IN (${placeholders})
      ORDER BY f.created_at DESC
    `;

    const result = await this.db.queryProject(projectId, sql, tags);
    return result;
  }

  async getPopularTags(projectId: string, limit = 20) {
    const sql = `
      SELECT tag, COUNT(*) as count
      FROM file_tags
      GROUP BY tag
      ORDER BY count DESC
      LIMIT ?
    `;

    const result = await this.db.queryProject(projectId, sql, [limit]);
    return result;
  }

  async searchFilesByTag(projectId: string, tagPattern: string) {
    const sql = `
      SELECT DISTINCT f.*
      FROM files f
      JOIN file_tags ft ON f.id = ft.file_id
      WHERE ft.tag LIKE ?
      ORDER BY f.created_at DESC
    `;

    const result = await this.db.queryProject(projectId, sql, [
      `%${tagPattern}%`,
    ]);
    return result;
  }

  async removeAllFileTags(projectId: string, fileId: string) {
    const sql = `DELETE FROM file_tags WHERE file_id = ?`;
    await this.db.executeProject(projectId, sql, [fileId]);
  }
}
