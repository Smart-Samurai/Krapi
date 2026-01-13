import * as fs from "fs";
import * as path from "path";

import { DatabaseService } from "./database.service";
import { FileEncryptionService } from "./file-encryption.service";
import { MultiDatabaseManager } from "./multi-database-manager.service";

import { FileInfo, StorageStats } from "@/types";

/**
 * Storage Service
 * 
 * Singleton service that handles file upload, storage, and management operations.
 * Manages file storage in project-specific directories and maintains file metadata
 * in the database.
 * 
 * Features:
 * - File upload with metadata support
 * - Project-specific file storage directories
 * - File retrieval and download
 * - File deletion and cleanup
 * - Storage statistics and quota management
 * - File versioning support
 * 
 * Files are stored in project-specific directories: `data/projects/{projectId}/files/`
 * 
 * @class StorageService
 * @example
 * const storage = StorageService.getInstance();
 * 
 * // Upload a file
 * const fileInfo = await storage.uploadFile(fileBuffer, {
 *   projectId: 'project-uuid',
 *   uploadedBy: 'user-id'
 * });
 * 
 * // Get file
 * const file = await storage.getFile('file-id');
 */
export class StorageService {
  private static instance: StorageService;
  private db: DatabaseService;
  private dbManager: MultiDatabaseManager;
  private encryptionService: FileEncryptionService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    // Initialize MultiDatabaseManager to access project folder paths
    const mainDbPath = process.env.DB_PATH || process.env.SQLITE_DB_PATH || undefined;
    const projectsDbDir = process.env.PROJECTS_DB_DIR || undefined;
    this.dbManager = new MultiDatabaseManager(mainDbPath, projectsDbDir);
    this.encryptionService = FileEncryptionService.getInstance();
  }

  /**
   * Get singleton instance of StorageService
   * 
   * Creates a new instance if one doesn't exist, otherwise returns
   * the existing singleton instance.
   * 
   * @returns {StorageService} The singleton StorageService instance
   * 
   * @example
   * const storage = StorageService.getInstance();
   */
  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Upload a file to storage
   * 
   * Uploads a file to the project-specific storage directory and creates
   * a file record in the database. Supports both File objects and Buffers.
   * 
   * @param {File | Buffer} file - The file to upload (File object or Buffer)
   * @param {Record<string, unknown>} [metadata] - Optional file metadata
   * @param {string} [metadata.projectId] - Project ID (defaults to "default")
   * @param {string} [metadata.baseUrl] - Base URL for file access
   * @param {string} [metadata.uploadedBy] - User ID who uploaded the file
   * @returns {Promise<FileInfo>} File information including ID, path, and URL
   * @throws {Error} If file upload fails or project ID is invalid
   * 
   * @example
   * const fileBuffer = Buffer.from('file content');
   * const fileInfo = await storage.uploadFile(fileBuffer, {
   *   projectId: 'project-uuid',
   *   uploadedBy: 'user-id',
   *   baseUrl: 'https://api.example.com'
   * });
   * console.log('File uploaded:', fileInfo.id);
   */
  async uploadFile(
    file: File | Buffer,
    metadata?: Record<string, unknown>
  ): Promise<FileInfo> {
    const projectId =
      (metadata as { projectId?: string })?.projectId || "default";
    const folderId =
      (metadata as { folderId?: string })?.folderId ||
      (metadata as { folder_id?: string })?.folder_id;
    const uploadedBy =
      (metadata as { uploadedBy?: string })?.uploadedBy || "system";
    const baseUrl = (metadata as { baseUrl?: string })?.baseUrl;

    // Get project-specific files folder: data/projects/{projectId}/files/
    const projectFilesPath = this.dbManager.getProjectFilesPath(projectId);
    await fs.promises.mkdir(projectFilesPath, { recursive: true });

    // Generate unique filename
    const originalName =
      (metadata as { originalName?: string })?.originalName ||
      (file as { originalname?: string; name?: string })?.originalname ||
      (file as { name?: string })?.name ||
      "unknown";
    const fileExtension = path.extname(originalName);
    const uniqueFilename = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}${fileExtension}`;
    const filePath = path.join(projectFilesPath, uniqueFilename);

    // Get file buffer
    let fileBuffer: Buffer;
    if (file instanceof Buffer) {
      fileBuffer = file;
    } else {
      // Handle File object (from multer)
      if ("arrayBuffer" in file && typeof file.arrayBuffer === "function") {
        fileBuffer = Buffer.from(await file.arrayBuffer());
      } else {
        // Fallback for other file types
        fileBuffer = Buffer.from(file as ArrayLike<number>);
      }
    }

    // Encrypt file before saving
    const encryptedBuffer = await this.encryptionService.encrypt(fileBuffer);

    // Save encrypted file to disk
    await fs.promises.writeFile(filePath, encryptedBuffer);

    // Create file record in database
    // Store relative path: files/{filename} (relative to project folder)
    const relativePath = path.posix.join("files", uniqueFilename);
    const normalizedBaseUrl = baseUrl
      ? baseUrl.endsWith("/")
        ? baseUrl.slice(0, -1)
        : baseUrl
      : "";
    const url = normalizedBaseUrl
      ? `${normalizedBaseUrl}/${relativePath}`
      : relativePath;

    const fileRecord = await this.db.createFile({
      project_id: projectId,
      filename: uniqueFilename,
      original_name: originalName,
      mime_type:
        (metadata as { mimeType?: string })?.mimeType ||
        (file as { mimetype?: string })?.mimetype ||
        "application/octet-stream",
      size:
        (metadata as { fileSize?: number })?.fileSize ||
        (file as { size?: number })?.size ||
        fileBuffer.length,
      path: relativePath, // Store relative path: files/{filename}
      url,
      metadata: {
        ...(metadata || {}),
        folder_id: folderId,
      },
      uploaded_by: uploadedBy,
      folder_id: folderId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return {
      id: fileRecord.id,
      project_id: fileRecord.project_id,
      name: fileRecord.filename,
      filename: fileRecord.filename, // Alias for backward compatibility
      original_name: fileRecord.original_name,
      path: fileRecord.path,
      mime_type: fileRecord.mime_type,
      size: fileRecord.size,
      url: fileRecord.url || url,
      uploaded_by: fileRecord.uploaded_by,
      created_at: fileRecord.created_at,
      updated_at: fileRecord.updated_at,
      public: false,
    };
  }

  async downloadFile(
    fileId: string
  ): Promise<{ buffer: Buffer; filename: string; mime_type: string }> {
    const fileRecord = await this.db.getFile(fileId);
    if (!fileRecord) {
      throw new Error("File not found");
    }

    // Construct full file path: data/projects/{projectId}/files/{filename}
    // file.path is stored as relative: files/{filename}
    const projectFilesPath = this.dbManager.getProjectFilesPath(fileRecord.project_id);
    const filePath = path.join(
      projectFilesPath,
      path.basename(fileRecord.path || fileRecord.filename)
    );

    try {
      const encryptedBuffer = await fs.promises.readFile(filePath);
      
      // Decrypt file when reading
      const buffer = await this.encryptionService.decrypt(encryptedBuffer);
      
      return {
        buffer,
        filename: fileRecord.filename,
        mime_type: fileRecord.mime_type,
      };
    } catch (error) {
      throw new Error(
        `Failed to read file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
      name: fileRecord.filename,
      filename: fileRecord.filename, // Alias for backward compatibility
      original_name: fileRecord.original_name,
      path: fileRecord.path,
      mime_type: fileRecord.mime_type,
      size: fileRecord.size,
      url: fileRecord.url || fileRecord.path,
      uploaded_by: fileRecord.uploaded_by,
      created_at: fileRecord.created_at,
      updated_at: fileRecord.updated_at || fileRecord.created_at, // Use created_at as fallback
      public: false,
    };
  }

  async getFiles(projectId: string): Promise<FileInfo[]> {
    const files = await this.db.getProjectFiles(projectId);

    return files.map((file) => ({
      id: file.id,
      project_id: file.project_id,
      name: file.filename,
      filename: file.filename, // Alias for backward compatibility
      original_name: file.original_name,
      path: file.path,
      mime_type: file.mime_type,
      size: file.size,
      url: `${file.path}${file.filename}`,
      uploaded_by: file.uploaded_by,
      created_at: file.created_at,
      updated_at: file.updated_at || file.created_at, // Use created_at as fallback
      public: false,
    }));
  }

  async getStorageStats(projectId: string): Promise<StorageStats> {
    const files = await this.db.getProjectFiles(projectId);

    const total_size = files.reduce((sum, file) => sum + file.size, 0);
    const file_count = files.length;

    // Storage limit and usage percentage calculation (unused for now)
    // const storage_limit = 1024 * 1024 * 1024; // 1GB
    // const usage_percentage = (total_size / storage_limit) * 100;

    // Get collections count from database
    let collections_count = 0;
    try {
      const collections = await this.db.getProjectCollections(projectId);
      collections_count = collections.length;
    } catch (error) {
      console.error("Error getting collections count:", error);
    }

    return {
      total_size,
      file_count,
      collections_count,
      projects_count: 1, // Current project
      last_updated: new Date().toISOString(),
    };
  }
}
