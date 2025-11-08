import crypto from "crypto";
/**
 * Storage Service for BackendSDK
 * 
 * Provides comprehensive file and storage management functionality including:
 * - File upload and download
 * - File metadata management
 * - File versioning and history
 * - File permissions and access control
 * - File organization (folders, tags)
 * - File transformations and thumbnails
 * - Storage quotas and analytics
 * 
 * @class StorageService
 * @example
 * const storageService = new StorageService(dbConnection, logger);
 * const fileInfo = await storageService.uploadFile(projectId, uploadRequest, fileBuffer);
 */

import { DatabaseConnection, Logger } from "./core";

export interface StoredFile {
  id: string;
  project_id: string;
  original_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_extension: string;
  file_hash: string;
  storage_provider: string;
  storage_path: string;
  storage_url?: string;
  is_public: boolean;
  folder_id?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  access_count: number;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface FileFolder {
  id: string;
  project_id: string;
  name: string;
  path: string;
  parent_id?: string;
  description?: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_hash: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  is_current: boolean;
}

export interface FilePermission {
  id: string;
  file_id: string;
  user_id?: string;
  role?: string;
  permission_type: "read" | "write" | "delete" | "admin";
  granted_by: string;
  created_at: string;
  expires_at?: string;
}

export interface UploadRequest {
  original_name: string;
  file_size: number;
  mime_type: string;
  folder_id?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  is_public?: boolean;
  uploaded_by: string;
}

export interface FileUrlRequest {
  file_id: string;
  expires_in?: number;
  access_type?: "download" | "preview" | "stream";
  user_id?: string;
}

export interface FileFilter {
  folder_id?: string;
  mime_type?: string;
  file_extension?: string;
  tags?: string[];
  uploaded_by?: string;
  is_public?: boolean;
  created_after?: string;
  created_before?: string;
  size_min?: number;
  size_max?: number;
  search?: string;
}

export interface StorageStatistics {
  total_files: number;
  total_size: number;
  files_by_type: Record<string, { count: number; size: number }>;
  files_by_folder: Record<string, { count: number; size: number }>;
  storage_used_percentage: number;
  recent_uploads: number;
  most_accessed_files: Array<{
    file_id: string;
    file_name: string;
    access_count: number;
  }>;
  largest_files: Array<{
    file_id: string;
    file_name: string;
    file_size: number;
  }>;
}

export interface StorageQuota {
  project_id: string;
  max_storage_bytes: number;
  max_files: number;
  max_file_size: number;
  allowed_mime_types: string[];
  blocked_mime_types: string[];
  current_storage_bytes: number;
  current_files: number;
}

interface DatabaseRow {
  [key: string]: unknown;
}

interface CountRow extends DatabaseRow {
  count: string;
}

interface StorageUsageRow extends DatabaseRow {
  file_count: string;
  total_size: string;
}

interface StorageQuotaRow extends DatabaseRow {
  max_storage_bytes: string;
  max_files: string;
  current_storage_bytes: string;
  current_files: string;
}

interface FileTypeStatsRow extends DatabaseRow {
  mime_type: string;
  count: string;
  size: string;
}

interface FolderStatsRow extends DatabaseRow {
  folder_id: string;
  count: string;
  size: string;
}

interface FileInfoRow extends DatabaseRow {
  id: string;
  original_name: string;
  access_count: number;
  file_size: number;
}

export class StorageService {
  private db: DatabaseConnection;
  private logger: Logger;

  /**
   * Create a new StorageService instance
   * 
   * @param {DatabaseConnection} databaseConnection - Database connection
   * @param {Logger} logger - Logger instance
   */
  constructor(databaseConnection: DatabaseConnection, logger: Logger) {
    this.db = databaseConnection;
    this.logger = logger;
  }

  /**
   * Get all files for a project
   * 
   * @param {string} projectId - Project ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Maximum number of files
   * @param {number} [options.offset] - Number of files to skip
   * @param {FileFilter} [options.filter] - File filters
   * @param {boolean} [options.include_deleted] - Include deleted files
   * @returns {Promise<StoredFile[]>} Array of stored files
   * @throws {Error} If query fails
   * 
   * @example
   * const files = await storageService.getAllFiles('project-id', {
   *   limit: 10,
   *   filter: { mime_type: 'image/jpeg' }
   * });
   */
  async getAllFiles(
    projectId: string,
    options?: {
      limit?: number;
      offset?: number;
      filter?: FileFilter;
      include_deleted?: boolean;
    }
  ): Promise<StoredFile[]> {
    try {
      let query = "SELECT * FROM files WHERE project_id = $1";
      const params: unknown[] = [projectId];
      let paramCount = 1;

      if (!options?.include_deleted) {
        query += " AND is_deleted = false";
      }

      if (options?.filter) {
        const { filter } = options;

        if (filter.folder_id) {
          paramCount++;
          query += ` AND folder_id = $${paramCount}`;
          params.push(filter.folder_id);
        }

        if (filter.mime_type) {
          paramCount++;
          query += ` AND mime_type = $${paramCount}`;
          params.push(filter.mime_type);
        }

        if (filter.file_extension) {
          paramCount++;
          query += ` AND file_extension = $${paramCount}`;
          params.push(filter.file_extension);
        }

        if (filter.tags && filter.tags.length > 0) {
          paramCount++;
          query += ` AND tags && $${paramCount}`;
          params.push(filter.tags);
        }

        if (filter.uploaded_by) {
          paramCount++;
          query += ` AND uploaded_by = $${paramCount}`;
          params.push(filter.uploaded_by);
        }

        if (filter.is_public !== undefined) {
          paramCount++;
          query += ` AND is_public = $${paramCount}`;
          params.push(filter.is_public);
        }

        if (filter.created_after) {
          paramCount++;
          query += ` AND created_at >= $${paramCount}`;
          params.push(filter.created_after);
        }

        if (filter.created_before) {
          paramCount++;
          query += ` AND created_at <= $${paramCount}`;
          params.push(filter.created_before);
        }

        if (filter.size_min) {
          paramCount++;
          query += ` AND file_size >= $${paramCount}`;
          params.push(filter.size_min);
        }

        if (filter.size_max) {
          paramCount++;
          query += ` AND file_size <= $${paramCount}`;
          params.push(filter.size_max);
        }

        if (filter.search) {
          paramCount++;
          query += ` AND (original_name ILIKE $${paramCount} OR tags::text ILIKE $${paramCount})`;
          params.push(`%${filter.search}%`);
        }
      }

      query += " ORDER BY created_at DESC";

      if (options?.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(options.limit);
      }

      if (options?.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(options.offset);
      }

      const result = await this.db.query(query, params);
      return result.rows as StoredFile[];
    } catch (error) {
      this.logger.error("Failed to get files:", error);
      throw new Error("Failed to get files");
    }
  }

  async getFileById(
    projectId: string,
    fileId: string
  ): Promise<StoredFile | null> {
    try {
      const result = await this.db.query(
        "SELECT * FROM files WHERE project_id = $1 AND id = $2 AND is_deleted = false",
        [projectId, fileId]
      );

      if (result.rows.length > 0) {
        // Update access tracking
        await this.updateFileAccess(fileId);
        return result.rows[0] as StoredFile;
      }

      return null;
    } catch (error) {
      this.logger.error("Failed to get file by ID:", error);
      throw new Error("Failed to get file by ID");
    }
  }

  async uploadFile(
    projectId: string,
    fileData: UploadRequest,
    fileBuffer: Buffer
  ): Promise<StoredFile> {
    try {
      // Check storage quota
      await this.checkStorageQuota(projectId, fileData.file_size);

      // Generate file hash for deduplication
      const fileHash = await this.generateFileHash(fileBuffer);

      // Check if file already exists (deduplication)
      const existingFile = await this.findFileByHash(projectId, fileHash);
      if (existingFile && !existingFile.is_deleted) {
        // Return existing file instead of uploading duplicate
        return existingFile;
      }

      // Generate unique file name
      const fileExtension = this.getFileExtension(fileData.original_name);
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}.${fileExtension}`;

      // Determine storage path
      const storagePath = this.generateStoragePath(projectId, fileName);

      // In a real implementation, you would save to actual storage here
      // const storageUrl = await this.saveToStorage(storagePath, fileBuffer);
      const storageUrl = `/storage/${projectId}/${fileName}`;

      const result = await this.db.query(
        `INSERT INTO files (
          project_id, original_name, file_name, file_path, file_size, 
          mime_type, file_extension, file_hash, storage_provider, storage_path, 
          storage_url, is_public, folder_id, tags, metadata, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
        RETURNING *`,
        [
          projectId,
          fileData.original_name,
          fileName,
          storagePath,
          fileData.file_size,
          fileData.mime_type,
          fileExtension,
          fileHash,
          "local", // In production, this could be "s3", "gcs", etc.
          storagePath,
          storageUrl,
          fileData.is_public || false,
          fileData.folder_id,
          fileData.tags || [],
          fileData.metadata || {},
          fileData.uploaded_by,
        ]
      );

      // Create initial version
      await this.createFileVersion((result.rows[0] as StoredFile).id, {
        version_number: 1,
        file_name: fileName,
        file_path: storagePath,
        file_size: fileData.file_size,
        file_hash: fileHash,
        storage_path: storagePath,
        uploaded_by: fileData.uploaded_by,
        is_current: true,
      });

      // Update storage usage
      await this.updateStorageUsage(projectId);

      return result.rows[0] as StoredFile;
    } catch (error) {
      this.logger.error("Failed to upload file:", error);
      throw new Error("Failed to upload file");
    }
  }

  async updateFile(
    projectId: string,
    fileId: string,
    updates: {
      original_name?: string;
      folder_id?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
      is_public?: boolean;
    },
    _updatedBy: string
  ): Promise<StoredFile | null> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (updates.original_name !== undefined) {
        fields.push(`original_name = $${paramCount++}`);
        values.push(updates.original_name);
      }
      if (updates.folder_id !== undefined) {
        fields.push(`folder_id = $${paramCount++}`);
        values.push(updates.folder_id);
      }
      if (updates.tags !== undefined) {
        fields.push(`tags = $${paramCount++}`);
        values.push(updates.tags);
      }
      if (updates.metadata !== undefined) {
        // Merge with existing metadata
        const currentFile = await this.getFileById(projectId, fileId);
        if (currentFile) {
          const mergedMetadata = {
            ...currentFile.metadata,
            ...updates.metadata,
          };
          fields.push(`metadata = $${paramCount++}`);
          values.push(mergedMetadata);
        }
      }
      if (updates.is_public !== undefined) {
        fields.push(`is_public = $${paramCount++}`);
        values.push(updates.is_public);
      }

      if (fields.length === 0) {
        return this.getFileById(projectId, fileId);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(projectId, fileId);

      const result = await this.db.query(
        `UPDATE files SET ${fields.join(", ")} 
         WHERE project_id = $${paramCount++} AND id = $${paramCount} AND is_deleted = false
         RETURNING *`,
        values
      );

      return result.rows.length > 0 ? (result.rows[0] as StoredFile) : null;
    } catch (error) {
      this.logger.error("Failed to update file:", error);
      throw new Error("Failed to update file");
    }
  }

  async deleteFile(
    projectId: string,
    fileId: string,
    deletedBy: string,
    permanent = false
  ): Promise<boolean> {
    try {
      if (permanent) {
        // Hard delete - remove from storage and database
        const file = await this.getFileById(projectId, fileId);
        if (file) {
          // In real implementation, delete from actual storage
          // await this.deleteFromStorage(file.storage_path);

          // Delete file versions
          await this.db.query("DELETE FROM file_versions WHERE file_id = $1", [
            fileId,
          ]);

          // Delete file permissions
          await this.db.query(
            "DELETE FROM file_permissions WHERE file_id = $1",
            [fileId]
          );

          // Delete the file record
          const result = await this.db.query(
            "DELETE FROM files WHERE project_id = $1 AND id = $2",
            [projectId, fileId]
          );

          // Update storage usage
          await this.updateStorageUsage(projectId);

          return result.rowCount > 0;
        }
        return false;
      } else {
        // Soft delete
        const result = await this.db.query(
          `UPDATE files SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $3, updated_at = CURRENT_TIMESTAMP 
           WHERE project_id = $1 AND id = $2 AND is_deleted = false`,
          [projectId, fileId, deletedBy]
        );
        return result.rowCount > 0;
      }
    } catch (error) {
      this.logger.error("Failed to delete file:", error);
      throw new Error("Failed to delete file");
    }
  }

  async restoreFile(
    projectId: string,
    fileId: string,
    _restoredBy: string
  ): Promise<boolean> {
    try {
      const result = await this.db.query(
        `UPDATE files SET is_deleted = false, deleted_at = NULL, deleted_by = NULL, updated_at = CURRENT_TIMESTAMP 
         WHERE project_id = $1 AND id = $2 AND is_deleted = true`,
        [projectId, fileId]
      );
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Failed to restore file:", error);
      throw new Error("Failed to restore file");
    }
  }

  // Folder Management
  async getAllFolders(projectId: string): Promise<FileFolder[]> {
    try {
      const result = await this.db.query(
        "SELECT * FROM file_folders WHERE project_id = $1 ORDER BY path",
        [projectId]
      );
      return result.rows as FileFolder[];
    } catch (error) {
      this.logger.error("Failed to get folders:", error);
      throw new Error("Failed to get folders");
    }
  }

  async createFolder(
    projectId: string,
    folderData: {
      name: string;
      parent_id?: string;
      description?: string;
      is_public?: boolean;
    },
    createdBy: string
  ): Promise<FileFolder> {
    try {
      // Generate folder path
      let path = folderData.name;
      if (folderData.parent_id) {
        const parentFolder = await this.getFolderById(
          projectId,
          folderData.parent_id
        );
        if (parentFolder) {
          path = `${parentFolder.path}/${folderData.name}`;
        }
      }

      const result = await this.db.query(
        `INSERT INTO file_folders (project_id, name, path, parent_id, description, is_public, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          projectId,
          folderData.name,
          path,
          folderData.parent_id,
          folderData.description,
          folderData.is_public || false,
          createdBy,
        ]
      );
      return result.rows[0] as FileFolder;
    } catch (error) {
      this.logger.error("Failed to create folder:", error);
      throw new Error("Failed to create folder");
    }
  }

  async getFolderById(
    projectId: string,
    folderId: string
  ): Promise<FileFolder | null> {
    try {
      const result = await this.db.query(
        "SELECT * FROM file_folders WHERE project_id = $1 AND id = $2",
        [projectId, folderId]
      );
      return result.rows.length > 0 ? (result.rows[0] as FileFolder) : null;
    } catch (error) {
      this.logger.error("Failed to get folder by ID:", error);
      throw new Error("Failed to get folder by ID");
    }
  }

  // File Versioning
  async createFileVersion(
    fileId: string,
    versionData: {
      version_number: number;
      file_name: string;
      file_path: string;
      file_size: number;
      file_hash: string;
      storage_path: string;
      uploaded_by: string;
      is_current: boolean;
    }
  ): Promise<FileVersion> {
    try {
      // If this is the current version, mark others as not current
      if (versionData.is_current) {
        await this.db.query(
          "UPDATE file_versions SET is_current = false WHERE file_id = $1",
          [fileId]
        );
      }

      const result = await this.db.query(
        `INSERT INTO file_versions (
          file_id, version_number, file_name, file_path, file_size, 
          file_hash, storage_path, uploaded_by, is_current
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          fileId,
          versionData.version_number,
          versionData.file_name,
          versionData.file_path,
          versionData.file_size,
          versionData.file_hash,
          versionData.storage_path,
          versionData.uploaded_by,
          versionData.is_current,
        ]
      );
      return result.rows[0] as FileVersion;
    } catch (error) {
      this.logger.error("Failed to create file version:", error);
      throw new Error("Failed to create file version");
    }
  }

  async getFileVersions(fileId: string): Promise<FileVersion[]> {
    try {
      const result = await this.db.query(
        "SELECT * FROM file_versions WHERE file_id = $1 ORDER BY version_number DESC",
        [fileId]
      );
      return result.rows as FileVersion[];
    } catch (error) {
      this.logger.error("Failed to get file versions:", error);
      throw new Error("Failed to get file versions");
    }
  }

  // Storage Statistics and Quotas
  async getStorageStatistics(projectId: string): Promise<StorageStatistics> {
    try {
      const [
        totalFilesResult,
        totalSizeResult,
        filesByTypeResult,
        filesByFolderResult,
        quotaResult,
        recentUploadsResult,
        mostAccessedResult,
        largestFilesResult,
      ] = await Promise.all([
        this.db.query(
          "SELECT COUNT(*) FROM files WHERE project_id = $1 AND is_deleted = false",
          [projectId]
        ),
        this.db.query(
          "SELECT COALESCE(SUM(file_size), 0) as total_size FROM files WHERE project_id = $1 AND is_deleted = false",
          [projectId]
        ),
        this.db.query(
          "SELECT mime_type, COUNT(*) as count, COALESCE(SUM(file_size), 0) as size FROM files WHERE project_id = $1 AND is_deleted = false GROUP BY mime_type",
          [projectId]
        ),
        this.db.query(
          "SELECT COALESCE(folder_id, 'root') as folder_id, COUNT(*) as count, COALESCE(SUM(file_size), 0) as size FROM files WHERE project_id = $1 AND is_deleted = false GROUP BY folder_id",
          [projectId]
        ),
        this.db.query(
          "SELECT max_storage_bytes FROM storage_quotas WHERE project_id = $1",
          [projectId]
        ),
        this.db.query(
          "SELECT COUNT(*) FROM files WHERE project_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'",
          [projectId]
        ),
        this.db.query(
          "SELECT id, original_name, access_count FROM files WHERE project_id = $1 AND is_deleted = false ORDER BY access_count DESC LIMIT 10",
          [projectId]
        ),
        this.db.query(
          "SELECT id, original_name, file_size FROM files WHERE project_id = $1 AND is_deleted = false ORDER BY file_size DESC LIMIT 10",
          [projectId]
        ),
      ]);

      const filesByType: Record<string, { count: number; size: number }> = {};
      for (const row of filesByTypeResult.rows) {
        const data = row as FileTypeStatsRow;
        filesByType[data.mime_type] = {
          count: parseInt(data.count),
          size: parseInt(data.size),
        };
      }

      const filesByFolder: Record<string, { count: number; size: number }> = {};
      for (const row of filesByFolderResult.rows) {
        const data = row as FolderStatsRow;
        filesByFolder[data.folder_id] = {
          count: parseInt(data.count),
          size: parseInt(data.size),
        };
      }

      const totalSizeRow = totalSizeResult.rows[0] as { total_size: string };
      const totalSize = parseInt(totalSizeRow.total_size);
      const maxStorage =
        quotaResult.rows.length > 0
          ? parseInt(
              (quotaResult.rows[0] as { max_storage_bytes: string })
                .max_storage_bytes
            )
          : 1073741824; // 1GB default

      return {
        total_files: parseInt((totalFilesResult.rows[0] as CountRow).count),
        total_size: totalSize,
        files_by_type: filesByType,
        files_by_folder: filesByFolder,
        storage_used_percentage: (totalSize / maxStorage) * 100,
        recent_uploads: parseInt(
          (recentUploadsResult.rows[0] as CountRow).count
        ),
        most_accessed_files: mostAccessedResult.rows.map((row) => {
          const fileRow = row as FileInfoRow;
          return {
            file_id: fileRow.id,
            file_name: fileRow.original_name,
            access_count: fileRow.access_count,
          };
        }),
        largest_files: largestFilesResult.rows.map((row) => {
          const fileRow = row as FileInfoRow;
          return {
            file_id: fileRow.id,
            file_name: fileRow.original_name,
            file_size: fileRow.file_size,
          };
        }),
      };
    } catch (error) {
      this.logger.error("Failed to get storage statistics:", error);
      throw new Error("Failed to get storage statistics");
    }
  }

  // Utility Methods
  private async generateFileHash(buffer: Buffer): Promise<string> {
    try {
      return crypto.createHash("sha256").update(buffer).digest("hex");
    } catch {
      return `hash_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
  }

  private getFileExtension(fileName: string): string {
    const parts = fileName.split(".");
    return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
  }

  private generateStoragePath(projectId: string, fileName: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${projectId}/${year}/${month}/${day}/${fileName}`;
  }

  private async findFileByHash(
    projectId: string,
    fileHash: string
  ): Promise<StoredFile | null> {
    try {
      const result = await this.db.query(
        "SELECT * FROM files WHERE project_id = $1 AND file_hash = $2 AND is_deleted = false LIMIT 1",
        [projectId, fileHash]
      );
      return result.rows.length > 0 ? (result.rows[0] as StoredFile) : null;
    } catch {
      return null;
    }
  }

  private async updateFileAccess(fileId: string): Promise<void> {
    try {
      await this.db.query(
        "UPDATE files SET last_accessed = CURRENT_TIMESTAMP, access_count = access_count + 1 WHERE id = $1",
        [fileId]
      );
    } catch (error) {
      this.logger.error("Failed to update file access:", error);
      // Don't throw here as this shouldn't break the main operation
    }
  }

  private async checkStorageQuota(
    projectId: string,
    fileSize: number
  ): Promise<void> {
    try {
      const quotaResult = await this.db.query(
        "SELECT max_storage_bytes, max_files, current_storage_bytes, current_files FROM storage_quotas WHERE project_id = $1",
        [projectId]
      );

      if (quotaResult.rows.length > 0) {
        const quota = quotaResult.rows[0] as StorageQuotaRow;

        if (
          parseInt(quota.current_storage_bytes) + fileSize >
          parseInt(quota.max_storage_bytes)
        ) {
          throw new Error("Storage quota exceeded");
        }

        if (parseInt(quota.current_files) >= parseInt(quota.max_files)) {
          throw new Error("File count quota exceeded");
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("quota")) {
        throw error;
      }
      // If quota doesn't exist, allow upload (could be created on first upload)
    }
  }

  private async updateStorageUsage(projectId: string): Promise<void> {
    try {
      const result = await this.db.query(
        "SELECT COUNT(*) as file_count, COALESCE(SUM(file_size), 0) as total_size FROM files WHERE project_id = $1 AND is_deleted = false",
        [projectId]
      );

      const data = result.rows[0] as StorageUsageRow;

      await this.db.query(
        `INSERT INTO storage_quotas (project_id, current_files, current_storage_bytes) 
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id) 
         DO UPDATE SET current_files = $2, current_storage_bytes = $3`,
        [projectId, parseInt(data.file_count), parseInt(data.total_size)]
      );
    } catch (error) {
      this.logger.error("Failed to update storage usage:", error);
      // Don't throw here as this shouldn't break the main operation
    }
  }

  /**
   * Get storage information for a project
   */
  async getStorageInfo(projectId: string): Promise<{
    total_files: number;
    total_size: number;
    storage_used_percentage: number;
    quota: number;
  }> {
    try {
      const [totalFilesResult, totalSizeResult, quotaResult] =
        await Promise.all([
          this.db.query(
            "SELECT COUNT(*) FROM files WHERE project_id = $1 AND is_deleted = false",
            [projectId]
          ),
          this.db.query(
            "SELECT COALESCE(SUM(file_size), 0) as total_size FROM files WHERE project_id = $1 AND is_deleted = false",
            [projectId]
          ),
          this.db.query(
            "SELECT max_storage_bytes FROM storage_quotas WHERE project_id = $1",
            [projectId]
          ),
        ]);

      const totalFiles = parseInt((totalFilesResult.rows[0] as CountRow).count);
      const totalSize = parseInt(
        (totalSizeResult.rows[0] as { total_size: string }).total_size
      );
      const quota =
        quotaResult.rows.length > 0
          ? parseInt(
              (quotaResult.rows[0] as { max_storage_bytes: string })
                .max_storage_bytes
            )
          : 1073741824; // 1GB default

      return {
        total_files: totalFiles,
        total_size: totalSize,
        storage_used_percentage: (totalSize / quota) * 100,
        quota,
      };
    } catch (error) {
      this.logger.error(
        `Error getting storage info for project ${projectId}:`,
        error
      );
      throw new Error("Failed to get storage info");
    }
  }
}
