import { StorageService } from "./storage.service";

import { FileInfo, StorageStats } from "@/types";

/**
 * Storage Adapter Service
 * 
 * Wraps the existing StorageService to provide a consistent interface for the BackendSDK.
 * Acts as an adapter layer between SDK and the core StorageService.
 * 
 * @class StorageAdapterService
 * @example
 * const adapter = StorageAdapterService.getInstance();
 * const fileInfo = await adapter.uploadFile(fileBuffer, { projectId: 'project-id' });
 */
export class StorageAdapterService {
  private static instance: StorageAdapterService;
  private storageService: StorageService;

  private constructor() {
    this.storageService = StorageService.getInstance();
  }

  /**
   * Get singleton instance of StorageAdapterService
   * 
   * @returns {StorageAdapterService} The singleton instance
   * 
   * @example
   * const adapter = StorageAdapterService.getInstance();
   */
  static getInstance(): StorageAdapterService {
    if (!StorageAdapterService.instance) {
      StorageAdapterService.instance = new StorageAdapterService();
    }
    return StorageAdapterService.instance;
  }

  /**
   * Upload a file
   * 
   * @param {File | Buffer} file - File to upload
   * @param {Record<string, unknown>} [metadata] - File metadata
   * @returns {Promise<FileInfo>} Uploaded file information
   * 
   * @example
   * const fileInfo = await adapter.uploadFile(fileBuffer, {
   *   projectId: 'project-id',
   *   uploadedBy: 'user-id'
   * });
   */
  async uploadFile(file: File | Buffer, metadata?: Record<string, unknown>): Promise<FileInfo> {
    return await this.storageService.uploadFile(file, metadata);
  }

  /**
   * Download a file
   * 
   * @param {string} fileId - File ID
   * @returns {Promise<Object>} File data
   * @returns {Buffer} returns.buffer - File content buffer
   * @returns {string} returns.filename - Original filename
   * @returns {string} returns.mimeType - MIME type
   * 
   * @example
   * const file = await adapter.downloadFile('file-id');
   * // Use file.buffer, file.filename, file.mimeType
   */
  async downloadFile(
    fileId: string
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const result = await this.storageService.downloadFile(fileId);
    return {
      buffer: result.buffer,
      filename: result.filename,
      mimeType: result.mime_type,
    };
  }

  /**
   * Delete a file
   * 
   * @param {string} fileId - File ID
   * @returns {Promise<boolean>} True if deleted successfully
   * 
   * @example
   * await adapter.deleteFile('file-id');
   */
  async deleteFile(fileId: string): Promise<boolean> {
    return await this.storageService.deleteFile(fileId);
  }

  /**
   * Get file information
   * 
   * @param {string} fileId - File ID
   * @returns {Promise<FileInfo>} File information
   * 
   * @example
   * const fileInfo = await adapter.getFileInfo('file-id');
   */
  async getFileInfo(fileId: string): Promise<FileInfo> {
    return await this.storageService.getFileInfo(fileId);
  }

  /**
   * Get all files for a project
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<FileInfo[]>} Array of file information
   * 
   * @example
   * const files = await adapter.getFiles('project-id');
   */
  async getFiles(projectId: string): Promise<FileInfo[]> {
    return await this.storageService.getFiles(projectId);
  }

  /**
   * Get storage statistics for a project
   * 
   * @param {string} projectId - Project ID
   * @returns {Promise<StorageStats>} Storage statistics
   * 
   * @example
   * const stats = await adapter.getStorageStats('project-id');
   */
  async getStorageStats(projectId: string): Promise<StorageStats> {
    return await this.storageService.getStorageStats(projectId);
  }
}
