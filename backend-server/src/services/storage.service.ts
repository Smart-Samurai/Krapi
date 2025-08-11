import { DatabaseService } from "./database.service";
import { FileInfo, StorageStats } from "@/types";

/**
 * Storage Service
 *
 * This service handles file operations and storage management.
 */
export class StorageService {
  private static instance: StorageService;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async uploadFile(file: any, metadata?: any): Promise<FileInfo> {
    // Implementation for file upload
    // This would typically handle file storage to disk/S3/etc.
    // For now, we'll create a file record in the database
    const fileRecord = await this.db.createFile({
      project_id: metadata?.projectId || "default",
      filename: file.originalname || file.name || "unknown",
      original_name: file.originalname || file.name || "unknown",
      mime_type: file.mimetype || "application/octet-stream",
      size: file.size || 0,
      path: metadata?.path || "/uploads/",
      metadata: metadata || {},
      uploaded_by: metadata?.uploadedBy || "system",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active: true,
    });

    return {
      id: fileRecord.id,
      project_id: fileRecord.project_id,
      filename: fileRecord.filename,
      original_name: fileRecord.original_name,
      mime_type: fileRecord.mime_type,
      size: fileRecord.size,
      url: `${metadata?.baseUrl || ""}${fileRecord.path}${fileRecord.filename}`,
      uploaded_by: fileRecord.uploaded_by,
      created_at: fileRecord.created_at,
      updated_at: fileRecord.updated_at,
    };
  }

  async downloadFile(
    fileId: string
  ): Promise<{ buffer: Buffer; filename: string; mime_type: string }> {
    const fileRecord = await this.db.getFile(fileId);
    if (!fileRecord) {
      throw new Error("File not found");
    }

    // In a real implementation, this would read the file from storage
    // For now, we'll return a mock buffer
    const buffer = Buffer.from("Mock file content");

    return {
      buffer,
      filename: fileRecord.filename,
      mime_type: fileRecord.mime_type,
    };
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const result = await this.db.deleteFile(fileId);
    return result !== null;
  }

  async getFileInfo(fileId: string): Promise<FileInfo> {
    const fileRecord = await this.db.getFile(fileId);
    if (!fileRecord) {
      throw new Error("File not found");
    }

    return {
      id: fileRecord.id,
      project_id: fileRecord.project_id,
      filename: fileRecord.filename,
      original_name: fileRecord.original_name,
      mime_type: fileRecord.mime_type,
      size: fileRecord.size,
      url: `${fileRecord.path}${fileRecord.filename}`,
      uploaded_by: fileRecord.uploaded_by,
      created_at: fileRecord.created_at,
      updated_at: fileRecord.updated_at,
    };
  }

  async getFiles(projectId: string): Promise<FileInfo[]> {
    const files = await this.db.getProjectFiles(projectId);

    return files.map((file) => ({
      id: file.id,
      project_id: file.project_id,
      filename: file.filename,
      original_name: file.original_name,
      mime_type: file.mime_type,
      size: file.size,
      url: `${file.path}${file.filename}`,
      uploaded_by: file.uploaded_by,
      created_at: file.created_at,
      updated_at: file.updated_at,
    }));
  }

  async getStorageStats(projectId: string): Promise<StorageStats> {
    const files = await this.db.getProjectFiles(projectId);

    const total_size = files.reduce((sum, file) => sum + file.size, 0);
    const file_count = files.length;

    // Mock storage limit and usage percentage for now
    const storage_limit = 1024 * 1024 * 1024; // 1GB
    const usage_percentage = (total_size / storage_limit) * 100;

    return {
      total_size,
      file_count,
      storage_limit,
      usage_percentage,
    };
  }
}
