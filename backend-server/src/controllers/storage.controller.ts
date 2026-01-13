import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Request, Response } from "express";


// Storage handlers - alphabetically ordered
import { AddFileTagsHandler } from "./handlers/storage/add-file-tags.handler";
import { BulkDeleteFilesHandler } from "./handlers/storage/bulk-delete-files.handler";
import { BulkMoveFilesHandler } from "./handlers/storage/bulk-move-files.handler";
import { BulkUpdateFileMetadataHandler } from "./handlers/storage/bulk-update-file-metadata.handler";
import { CopyFileHandler } from "./handlers/storage/copy-file.handler";
import { DeleteFileHandler } from "./handlers/storage/delete-file.handler";
import { DownloadFileHandler } from "./handlers/storage/download-file.handler";
import { GetFileInfoHandler } from "./handlers/storage/get-file-info.handler";
import { GetFilePermissionsHandler } from "./handlers/storage/get-file-permissions.handler";
import { GetFileVersionsHandler } from "./handlers/storage/get-file-versions.handler";
import { GetFilesHandler } from "./handlers/storage/get-files.handler";
import { GetStorageStatsHandler } from "./handlers/storage/get-storage-stats.handler";
import { GrantFilePermissionHandler } from "./handlers/storage/grant-file-permission.handler";
import { MakeFilePrivateHandler } from "./handlers/storage/make-file-private.handler";
import { MakeFilePublicHandler } from "./handlers/storage/make-file-public.handler";
import { MoveFileHandler } from "./handlers/storage/move-file.handler";
import { RemoveFileTagsHandler } from "./handlers/storage/remove-file-tags.handler";
import { RenameFileHandler } from "./handlers/storage/rename-file.handler";
import { RestoreFileVersionHandler } from "./handlers/storage/restore-file-version.handler";
import { RevokeFilePermissionHandler } from "./handlers/storage/revoke-file-permission.handler";
import { UpdateFileMetadataHandler } from "./handlers/storage/update-file-metadata.handler";
import { UploadFileVersionHandler } from "./handlers/storage/upload-file-version.handler";
import { UploadFileHandler } from "./handlers/storage/upload-file.handler";

import { ApiResponse } from "@/types";

/**
 * Storage Controller
 *
 * Handles all file and folder operations including:
 * - File upload/download
 * - File management (copy, move, rename, delete)
 * - File metadata and tags
 * - File permissions and access control
 * - File versioning
 * - Bulk operations
 *
 * Follows SDK-first architecture: all methods use BackendSDK when available.
 * Falls back to direct services if SDK is not available.
 *
 * This controller now delegates to specialized handlers for each operation.
 * Additional handlers can be created incrementally for remaining operations.
 *
 * @class StorageController
 * @example
 * const controller = new StorageController();
 * controller.setBackendSDK(backendSDK);
 * // Controller is ready to handle storage requests
 */
export class StorageController {

  // Handlers
  private uploadFileHandler?: UploadFileHandler;
  private getFilesHandler?: GetFilesHandler;
  private getFileInfoHandler?: GetFileInfoHandler;
  private downloadFileHandler?: DownloadFileHandler;
  private deleteFileHandler?: DeleteFileHandler;
  private getStorageStatsHandler?: GetStorageStatsHandler;
  private copyFileHandler?: CopyFileHandler;
  private moveFileHandler?: MoveFileHandler;
  private renameFileHandler?: RenameFileHandler;
  private updateFileMetadataHandler?: UpdateFileMetadataHandler;
  private addFileTagsHandler?: AddFileTagsHandler;
  private removeFileTagsHandler?: RemoveFileTagsHandler;
  private getFilePermissionsHandler?: GetFilePermissionsHandler;
  private grantFilePermissionHandler?: GrantFilePermissionHandler;
  private revokeFilePermissionHandler?: RevokeFilePermissionHandler;
  private getFileVersionsHandler?: GetFileVersionsHandler;
  private uploadFileVersionHandler?: UploadFileVersionHandler;
  private restoreFileVersionHandler?: RestoreFileVersionHandler;
  private makeFilePublicHandler?: MakeFilePublicHandler;
  private makeFilePrivateHandler?: MakeFilePrivateHandler;
  private bulkDeleteFilesHandler?: BulkDeleteFilesHandler;
  private bulkMoveFilesHandler?: BulkMoveFilesHandler;
  private bulkUpdateFileMetadataHandler?: BulkUpdateFileMetadataHandler;

  /**
   * Set BackendSDK instance for SDK-first architecture
   *
   * @param {BackendSDK} sdk - BackendSDK instance
   * @returns {void}
   */
  setBackendSDK(sdk: BackendSDK): void {

    // Initialize handlers
    this.uploadFileHandler = new UploadFileHandler(sdk, 10 * 1024 * 1024);
    this.getFilesHandler = new GetFilesHandler(sdk);
    this.getFileInfoHandler = new GetFileInfoHandler(sdk);
    this.downloadFileHandler = new DownloadFileHandler(sdk);
    this.deleteFileHandler = new DeleteFileHandler(sdk);
    this.getStorageStatsHandler = new GetStorageStatsHandler(sdk);
    this.copyFileHandler = new CopyFileHandler(sdk);
    this.moveFileHandler = new MoveFileHandler(sdk);
    this.renameFileHandler = new RenameFileHandler(sdk);
    this.updateFileMetadataHandler = new UpdateFileMetadataHandler(sdk);
    this.addFileTagsHandler = new AddFileTagsHandler(sdk);
    this.removeFileTagsHandler = new RemoveFileTagsHandler(sdk);
    this.getFilePermissionsHandler = new GetFilePermissionsHandler(sdk);
    this.grantFilePermissionHandler = new GrantFilePermissionHandler(sdk);
    this.revokeFilePermissionHandler = new RevokeFilePermissionHandler(sdk);
    this.getFileVersionsHandler = new GetFileVersionsHandler(sdk);
    this.uploadFileVersionHandler = new UploadFileVersionHandler(sdk);
    this.restoreFileVersionHandler = new RestoreFileVersionHandler(sdk);
    this.makeFilePublicHandler = new MakeFilePublicHandler(sdk);
    this.makeFilePrivateHandler = new MakeFilePrivateHandler(sdk);
    this.bulkDeleteFilesHandler = new BulkDeleteFilesHandler(sdk);
    this.bulkMoveFilesHandler = new BulkMoveFilesHandler(sdk);
    this.bulkUpdateFileMetadataHandler = new BulkUpdateFileMetadataHandler(sdk);
  }

  // Core file operations - delegate to handlers
  uploadFile = async (req: Request, res: Response): Promise<void> => {
    if (!this.uploadFileHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.uploadFileHandler.handle(req, res);
  };

  getFiles = async (req: Request, res: Response): Promise<void> => {
    if (!this.getFilesHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.getFilesHandler.handle(req, res);
  };

  getFileInfo = async (req: Request, res: Response): Promise<void> => {
    if (!this.getFileInfoHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.getFileInfoHandler.handle(req, res);
  };

  downloadFile = async (req: Request, res: Response): Promise<void> => {
    if (!this.downloadFileHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.downloadFileHandler.handle(req, res);
  };

  deleteFile = async (req: Request, res: Response): Promise<void> => {
    if (!this.deleteFileHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.deleteFileHandler.handle(req, res);
  };

  getStorageStats = async (req: Request, res: Response): Promise<void> => {
    if (!this.getStorageStatsHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.getStorageStatsHandler.handle(req, res);
  };

  // File management operations - delegate to handlers
  copyFile = async (req: Request, res: Response): Promise<void> => {
    if (!this.copyFileHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.copyFileHandler.handle(req, res);
  };

  moveFile = async (req: Request, res: Response): Promise<void> => {
    if (!this.moveFileHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.moveFileHandler.handle(req, res);
  };

  renameFile = async (req: Request, res: Response): Promise<void> => {
    if (!this.renameFileHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.renameFileHandler.handle(req, res);
  };

  updateFileMetadata = async (req: Request, res: Response): Promise<void> => {
    if (!this.updateFileMetadataHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.updateFileMetadataHandler.handle(req, res);
  };

  // File tags operations - delegate to handlers
  addFileTags = async (req: Request, res: Response): Promise<void> => {
    if (!this.addFileTagsHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.addFileTagsHandler.handle(req, res);
  };

  removeFileTags = async (req: Request, res: Response): Promise<void> => {
    if (!this.removeFileTagsHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.removeFileTagsHandler.handle(req, res);
  };

  // File permissions operations - delegate to handlers
  getFilePermissions = async (req: Request, res: Response): Promise<void> => {
    if (!this.getFilePermissionsHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.getFilePermissionsHandler.handle(req, res);
  };

  grantFilePermission = async (req: Request, res: Response): Promise<void> => {
    if (!this.grantFilePermissionHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.grantFilePermissionHandler.handle(req, res);
  };

  revokeFilePermission = async (req: Request, res: Response): Promise<void> => {
    if (!this.revokeFilePermissionHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.revokeFilePermissionHandler.handle(req, res);
  };

  // File versioning operations - delegate to handlers
  getFileVersions = async (req: Request, res: Response): Promise<void> => {
    if (!this.getFileVersionsHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.getFileVersionsHandler.handle(req, res);
  };

  uploadFileVersion = async (req: Request, res: Response): Promise<void> => {
    if (!this.uploadFileVersionHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.uploadFileVersionHandler.handle(req, res);
  };

  restoreFileVersion = async (req: Request, res: Response): Promise<void> => {
    if (!this.restoreFileVersionHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.restoreFileVersionHandler.handle(req, res);
  };

  // File access operations - delegate to handlers
  makeFilePublic = async (req: Request, res: Response): Promise<void> => {
    if (!this.makeFilePublicHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.makeFilePublicHandler.handle(req, res);
  };

  makeFilePrivate = async (req: Request, res: Response): Promise<void> => {
    if (!this.makeFilePrivateHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.makeFilePrivateHandler.handle(req, res);
  };

  // Bulk operations - delegate to handlers
  bulkDeleteFiles = async (req: Request, res: Response): Promise<void> => {
    if (!this.bulkDeleteFilesHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.bulkDeleteFilesHandler.handle(req, res);
  };

  bulkMoveFiles = async (req: Request, res: Response): Promise<void> => {
    if (!this.bulkMoveFilesHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.bulkMoveFilesHandler.handle(req, res);
  };

  bulkUpdateFileMetadata = async (req: Request, res: Response): Promise<void> => {
    if (!this.bulkUpdateFileMetadataHandler) {
      res.status(500).json({
        success: false,
        error: "BackendSDK not initialized",
      } as ApiResponse);
      return;
    }
    await this.bulkUpdateFileMetadataHandler.handle(req, res);
  };
}
