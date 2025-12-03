import { DatabaseService } from "../../../database.service";

/**
 * File CRUD Operations Service
 *
 * Handles basic Create, Read, Update, Delete operations for files.
 */
export class FileCrudService {
  constructor(private db: DatabaseService) {}

  async createFile(
    projectId: string,
    fileData: {
      id: string;
      name: string;
      path: string;
      size: number;
      mime_type: string;
      folder_id?: string;
      metadata?: Record<string, unknown>;
      created_by: string;
    }
  ) {
    const sql = `
      INSERT INTO files (
        id, project_id, name, path, size, mime_type,
        folder_id, metadata, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = new Date().toISOString();
    const params = [
      fileData.id,
      projectId,
      fileData.name,
      fileData.path,
      fileData.size,
      fileData.mime_type,
      fileData.folder_id || null,
      fileData.metadata ? JSON.stringify(fileData.metadata) : null,
      fileData.created_by,
      now,
      now,
    ];

    await this.db.executeProject(projectId, sql, params);
    return fileData;
  }

  async getFile(projectId: string, fileId: string) {
    const sql = `SELECT * FROM files WHERE id = ? AND project_id = ?`;
    const result = await this.db.queryProjectOne(projectId, sql, [
      fileId,
      projectId,
    ]);
    return result;
  }

  async getProjectFiles(
    projectId: string,
    options: {
      folder_id?: string;
      limit?: number;
      offset?: number;
      search?: string;
    } = {}
  ) {
    let sql = `SELECT * FROM files WHERE project_id = ?`;
    const params: unknown[] = [projectId];

    if (options.folder_id) {
      sql += ` AND folder_id = ?`;
      params.push(options.folder_id);
    }

    if (options.search) {
      sql += ` AND name LIKE ?`;
      params.push(`%${options.search}%`);
    }

    sql += ` ORDER BY created_at DESC`;

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

  async updateFile(
    projectId: string,
    fileId: string,
    updates: {
      name?: string;
      path?: string;
      folder_id?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const setParts: string[] = [];
    const params: unknown[] = [];

    if (updates.name !== undefined) {
      setParts.push("name = ?");
      params.push(updates.name);
    }

    if (updates.path !== undefined) {
      setParts.push("path = ?");
      params.push(updates.path);
    }

    if (updates.folder_id !== undefined) {
      setParts.push("folder_id = ?");
      params.push(updates.folder_id);
    }

    if (updates.metadata !== undefined) {
      setParts.push("metadata = ?");
      params.push(JSON.stringify(updates.metadata));
    }

    if (setParts.length === 0) {
      return;
    }

    setParts.push("updated_at = ?");
    params.push(new Date().toISOString());

    const sql = `UPDATE files SET ${setParts.join(
      ", "
    )} WHERE id = ? AND project_id = ?`;
    params.push(fileId, projectId);

    await this.db.executeProject(projectId, sql, params);
  }

  async deleteFile(projectId: string, fileId: string) {
    const sql = `DELETE FROM files WHERE id = ? AND project_id = ?`;
    const result = await this.db.executeProject(projectId, sql, [
      fileId,
      projectId,
    ]);
    return result.changes > 0;
  }
}
