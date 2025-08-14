import { StorageService } from "./storage.service";

import { FileInfo, StorageStats } from "@/types";

/**
 * Storage Adapter Service
 *
 * This service wraps the existing StorageService to provide
 * a consistent interface for the BackendSDK.
 */
export class StorageAdapterService {
  private static instance: StorageAdapterService;
  private storageService: StorageService;

  private constructor() {
    this.storageService = StorageService.getInstance();
  }

  static getInstance(): StorageAdapterService {
    if (!StorageAdapterService.instance) {
      StorageAdapterService.instance = new StorageAdapterService();
    }
    return StorageAdapterService.instance;
  }

  async uploadFile(file: File | Buffer, metadata?: Record<string, unknown>): Promise<FileInfo> {
    return await this.storageService.uploadFile(file, metadata);
  }

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

  async deleteFile(fileId: string): Promise<boolean> {
    return await this.storageService.deleteFile(fileId);
  }

  async getFileInfo(fileId: string): Promise<FileInfo> {
    return await this.storageService.getFileInfo(fileId);
  }

  async getFiles(projectId: string): Promise<FileInfo[]> {
    return await this.storageService.getFiles(projectId);
  }

  async getStorageStats(projectId: string): Promise<StorageStats> {
    return await this.storageService.getStorageStats(projectId);
  }
}
