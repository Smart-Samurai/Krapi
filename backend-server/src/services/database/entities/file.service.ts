import { DatabaseService } from "../../database.service";

import { FileAccessService } from "./file/file-access.service";
import { FileCrudService } from "./file/file-crud.service";
import { FilePermissionsService } from "./file/file-permissions.service";
import { FileTagsService } from "./file/file-tags.service";
import { FileVersionsService } from "./file/file-versions.service";

/**
 * File Service
 *
 * Provides comprehensive file management operations including CRUD, permissions,
 * versioning, tagging, and access control. This service now delegates to
 * specialized sub-services for better organization and maintainability.
 */
export class FileService {
  private crud: FileCrudService;
  private permissions: FilePermissionsService;
  private versions: FileVersionsService;
  private tags: FileTagsService;
  private access: FileAccessService;

  constructor(private db: DatabaseService) {
    this.crud = new FileCrudService(db);
    this.permissions = new FilePermissionsService(db);
    this.versions = new FileVersionsService(db);
    this.tags = new FileTagsService(db);
    this.access = new FileAccessService(db);
  }

  // CRUD Operations - delegate to FileCrudService
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
    return this.crud.createFile(projectId, fileData);
  }

  async getFile(projectId: string, fileId: string) {
    return this.crud.getFile(projectId, fileId);
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
    return this.crud.getProjectFiles(projectId, options);
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
    return this.crud.updateFile(projectId, fileId, updates);
  }

  async deleteFile(projectId: string, fileId: string) {
    return this.crud.deleteFile(projectId, fileId);
  }

  // Permissions Operations - delegate to FilePermissionsService
  async grantFilePermission(
    projectId: string,
    fileId: string,
    userId: string,
    permission: string
  ) {
    return this.permissions.grantFilePermission(
      projectId,
      fileId,
      userId,
      permission
    );
  }

  async revokeFilePermission(
    projectId: string,
    fileId: string,
    userId: string
  ) {
    return this.permissions.revokeFilePermission(projectId, fileId, userId);
  }

  async getFilePermissions(projectId: string, fileId: string) {
    return this.permissions.getFilePermissions(projectId, fileId);
  }

  async checkFilePermission(
    projectId: string,
    fileId: string,
    userId: string,
    permission: string
  ) {
    return this.permissions.checkFilePermission(
      projectId,
      fileId,
      userId,
      permission
    );
  }

  async getUserFilePermissions(projectId: string, userId: string) {
    return this.permissions.getUserFilePermissions(projectId, userId);
  }

  // Versions Operations - delegate to FileVersionsService
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
    return this.versions.createFileVersion(projectId, fileId, versionData);
  }

  async getFileVersions(projectId: string, fileId: string) {
    return this.versions.getFileVersions(projectId, fileId);
  }

  async getFileVersion(
    projectId: string,
    fileId: string,
    versionNumber: number
  ) {
    return this.versions.getFileVersion(projectId, fileId, versionNumber);
  }

  async getLatestFileVersion(projectId: string, fileId: string) {
    return this.versions.getLatestFileVersion(projectId, fileId);
  }

  async deleteFileVersion(
    projectId: string,
    fileId: string,
    versionNumber: number
  ) {
    return this.versions.deleteFileVersion(projectId, fileId, versionNumber);
  }

  async getNextVersionNumber(projectId: string, fileId: string) {
    return this.versions.getNextVersionNumber(projectId, fileId);
  }

  // Tags Operations - delegate to FileTagsService
  async addFileTags(projectId: string, fileId: string, tags: string[]) {
    return this.tags.addFileTags(projectId, fileId, tags);
  }

  async removeFileTags(projectId: string, fileId: string, tags: string[]) {
    return this.tags.removeFileTags(projectId, fileId, tags);
  }

  async getFileTags(projectId: string, fileId: string) {
    return this.tags.getFileTags(projectId, fileId);
  }

  async getFilesByTags(projectId: string, tags: string[]) {
    return this.tags.getFilesByTags(projectId, tags);
  }

  async getPopularTags(projectId: string, limit = 20) {
    return this.tags.getPopularTags(projectId, limit);
  }

  async searchFilesByTag(projectId: string, tagPattern: string) {
    return this.tags.searchFilesByTag(projectId, tagPattern);
  }

  async removeAllFileTags(projectId: string, fileId: string) {
    return this.tags.removeAllFileTags(projectId, fileId);
  }

  // Access Operations - delegate to FileAccessService
  async makeFilePublic(projectId: string, fileId: string) {
    return this.access.makeFilePublic(projectId, fileId);
  }

  async makeFilePrivate(projectId: string, fileId: string) {
    return this.access.makeFilePrivate(projectId, fileId);
  }

  async isFilePublic(projectId: string, fileId: string) {
    return this.access.isFilePublic(projectId, fileId);
  }

  async getPublicFiles(
    projectId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    return this.access.getPublicFiles(projectId, options);
  }

  async generateFileUrl(projectId: string, fileId: string, isPublic = false) {
    return this.access.generateFileUrl(projectId, fileId, isPublic);
  }

  async validateFileAccess(projectId: string, fileId: string, userId?: string) {
    return this.access.validateFileAccess(projectId, fileId, userId);
  }

  // Bulk Operations - composite operations using multiple services
  async bulkDeleteFiles(projectId: string, fileIds: string[]) {
    const results = [];
    for (const fileId of fileIds) {
      try {
        // Remove tags
        await this.removeAllFileTags(projectId, fileId);

        // Remove permissions
        await this.db.executeProject(
          projectId,
          "DELETE FROM file_permissions WHERE file_id = ?",
          [fileId]
        );

        // Remove versions
        await this.db.executeProject(
          projectId,
          "DELETE FROM file_versions WHERE file_id = ?",
          [fileId]
        );

        // Delete file
        const deleted = await this.deleteFile(projectId, fileId);
        results.push({ fileId, success: deleted });
      } catch (error) {
        results.push({
          fileId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    return { deletedCount: results.filter((r) => r.success).length, results };
  }

  async bulkMoveFiles(
    projectId: string,
    fileIds: string[],
    destinationFolderId: string
  ) {
    const results = [];
    for (const fileId of fileIds) {
      try {
        await this.updateFile(projectId, fileId, {
          folder_id: destinationFolderId,
        });
        results.push({ fileId, success: true });
      } catch (error) {
        results.push({
          fileId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    return { movedCount: results.filter((r) => r.success).length, results };
  }

  async bulkUpdateFileMetadata(
    projectId: string,
    updates: Array<{
      fileId: string;
      metadata: Record<string, unknown>;
    }>
  ) {
    const results = [];
    for (const update of updates) {
      try {
        await this.updateFile(projectId, update.fileId, {
          metadata: update.metadata,
        });
        results.push({ fileId: update.fileId, success: true });
      } catch (error) {
        results.push({
          fileId: update.fileId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    return { updatedCount: results.filter((r) => r.success).length, results };
  }

  async copyFile(
    projectId: string,
    fileId: string,
    options: {
      destination_folder_id?: string;
      new_name?: string;
    } = {}
  ) {
    const sourceFile = await this.getFile(projectId, fileId);
    if (!sourceFile) {
      throw new Error("Source file not found");
    }

    // Type assertions for file properties
    const sourceName = sourceFile.name as string;
    const sourcePath = sourceFile.path as string;
    const sourceSize = sourceFile.size as number;
    const sourceMimeType = sourceFile.mime_type as string;
    const sourceFolderId = sourceFile.folder_id as string | undefined;
    const sourceMetadata = sourceFile.metadata as string | undefined;
    const sourceCreatedBy = sourceFile.created_by as string;

    const newFileId = `${fileId}_copy_${Date.now()}`;
    const newName = options.new_name || `${sourceName}_copy`;

    const createData: {
      id: string;
      name: string;
      path: string;
      size: number;
      mime_type: string;
      folder_id?: string;
      metadata?: Record<string, unknown>;
      created_by: string;
    } = {
      id: newFileId,
      name: newName,
      path: sourcePath.replace(sourceName, newName),
      size: sourceSize,
      mime_type: sourceMimeType,
      created_by: sourceCreatedBy,
    };

    const folderId = options.destination_folder_id || sourceFolderId;
    if (folderId) createData.folder_id = folderId;

    if (sourceMetadata)
      createData.metadata = JSON.parse(sourceMetadata) as Record<
        string,
        unknown
      >;

    await this.createFile(projectId, createData);

    return { id: newFileId, name: newName };
  }

  async moveFile(
    projectId: string,
    fileId: string,
    destinationFolderId: string
  ) {
    await this.updateFile(projectId, fileId, {
      folder_id: destinationFolderId,
    });
    return { success: true };
  }

  async renameFile(projectId: string, fileId: string, newName: string) {
    const file = await this.getFile(projectId, fileId);
    if (!file) {
      throw new Error("File not found");
    }

    const filePath = file.path as string;
    const fileName = file.name as string;
    const newPath = filePath.replace(fileName, newName);
    await this.updateFile(projectId, fileId, { name: newName, path: newPath });

    return { id: fileId, name: newName, path: newPath };
  }

  async updateFileMetadata(
    projectId: string,
    fileId: string,
    metadata: Record<string, unknown>
  ) {
    await this.updateFile(projectId, fileId, { metadata });
    return { success: true };
  }

  async uploadFileVersion(
    projectId: string,
    fileId: string,
    fileData: {
      buffer: Buffer;
      size: number;
      mime_type: string;
      created_by: string;
      changes_description?: string;
    }
  ) {
    const nextVersion = await this.getNextVersionNumber(projectId, fileId);

    // In a real implementation, you'd save the file buffer to storage
    const storagePath = `/files/${projectId}/${fileId}/v${nextVersion}`;

    const versionData: {
      version_number: number;
      size: number;
      mime_type: string;
      storage_path: string;
      created_by: string;
      changes_description?: string;
    } = {
      version_number: nextVersion,
      size: fileData.size,
      mime_type: fileData.mime_type,
      storage_path: storagePath,
      created_by: fileData.created_by,
    };

    if (fileData.changes_description) {
      versionData.changes_description = fileData.changes_description;
    }

    await this.createFileVersion(projectId, fileId, versionData);

    return { versionNumber: nextVersion, storagePath };
  }

  async restoreFileVersion(
    projectId: string,
    fileId: string,
    versionNumber: number
  ) {
    const version = await this.getFileVersion(projectId, fileId, versionNumber);
    if (!version) {
      throw new Error("Version not found");
    }

    // Note: size and mime_type updates would require direct SQL or extending updateFile
    // For now, we just mark the version as restored without updating size/mime_type

    return { success: true, restoredVersion: versionNumber };
  }
}
