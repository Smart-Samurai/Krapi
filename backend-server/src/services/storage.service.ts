import { DatabaseService } from "./database.service";
import * as fs from "fs";
import * as path from "path";

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

  async uploadFile(file: File | Buffer, metadata?: Record<string, unknown>): Promise<FileInfo> {
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.promises.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const originalName = (file as { originalname?: string; name?: string })?.originalname || (file as { name?: string })?.name || "unknown";
    const fileExtension = path.extname(originalName);
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

          // Save file to disk
      if (file instanceof Buffer) {
        await fs.promises.writeFile(filePath, file);
      } else {
        // Handle File object (from multer)
        if ('arrayBuffer' in file && typeof file.arrayBuffer === 'function') {
          const buffer = Buffer.from(await file.arrayBuffer());
          await fs.promises.writeFile(filePath, buffer);
        } else {
          // Fallback for other file types
          const buffer = Buffer.from(file as any);
          await fs.promises.writeFile(filePath, buffer);
        }
      }

    // Create file record in database
    const fileRecord = await this.db.createFile({
      project_id: (metadata as { projectId?: string })?.projectId || "default",
      filename: uniqueFilename,
      original_name: originalName,
      mime_type: (file as { mimetype?: string })?.mimetype || "application/octet-stream",
      size: (file as { size?: number })?.size || 0,
      path: "/uploads/",
      metadata: metadata || {},
      uploaded_by: (metadata as { uploadedBy?: string })?.uploadedBy || "system",
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
      url: `${(metadata as { baseUrl?: string })?.baseUrl || ""}${fileRecord.path}${fileRecord.filename}`,
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

    // Read file from filesystem
    const filePath = path.join(process.cwd(), 'uploads', fileRecord.path, fileRecord.filename);
    
    try {
      const buffer = await fs.promises.readFile(filePath);
      return {
        buffer,
        filename: fileRecord.filename,
        mime_type: fileRecord.mime_type,
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
