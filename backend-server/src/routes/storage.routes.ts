/**
 * Storage Routes
 *
 * Handles file storage-related endpoints for projects.
 * Base path: /krapi/k1/projects/:projectId/storage
 *
 * Routes:
 * - POST /upload - Upload a file
 * - GET /download/:fileId - Download a file
 * - GET /metadata/:fileId - Get file metadata
 * - GET /info - Get storage info
 * - GET /stats - Get storage statistics
 * - GET /files - List files
 * - DELETE /files/:fileId - Delete a file
 * - GET /folders - List folders
 * - POST /folders - Create folder
 * - DELETE /folders/:folderId - Delete folder
 *
 * All routes require authentication and storage scopes.
 * SDK-driven implementation using BackendSDK for all functionality.
 *
 * @module routes/storage.routes
 */
import { BackendSDK } from "@smartsamurai/krapi-sdk";
import { Router } from "express";
import multer from "multer";


// Storage handlers
import { CreateFolderHandler } from "./handlers/storage/create-folder.handler";
import { DeleteFileHandler } from "./handlers/storage/delete-file.handler";
import { DeleteFolderHandler } from "./handlers/storage/delete-folder.handler";
import { DownloadFileHandler } from "./handlers/storage/download-file.handler";
import { GetFileMetadataHandler } from "./handlers/storage/get-file-metadata.handler";
import { GetFileUrlHandler } from "./handlers/storage/get-file-url.handler";
import { GetStorageInfoHandler } from "./handlers/storage/get-storage-info.handler";
import { GetStorageStatsHandler } from "./handlers/storage/get-storage-stats.handler";
import { ListFilesHandler } from "./handlers/storage/list-files.handler";
import { ListFoldersHandler } from "./handlers/storage/list-folders.handler";
import { UploadFileHandler } from "./handlers/storage/upload-file.handler";

import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";

// Use mergeParams: true to merge params from parent route
const router: Router = Router({ mergeParams: true });

// Initialize handlers
let uploadFileHandler: UploadFileHandler;
let downloadFileHandler: DownloadFileHandler;
let getFileMetadataHandler: GetFileMetadataHandler;
let getFileUrlHandler: GetFileUrlHandler;
let getStorageInfoHandler: GetStorageInfoHandler;
let getStorageStatsHandler: GetStorageStatsHandler;
let listFilesHandler: ListFilesHandler;
let deleteFileHandler: DeleteFileHandler;
let listFoldersHandler: ListFoldersHandler;
let createFolderHandler: CreateFolderHandler;
let deleteFolderHandler: DeleteFolderHandler;

/**
 * Initialize BackendSDK for storage routes
 *
 * @param {BackendSDK} sdk - BackendSDK instance
 * @returns {void}
 */
export const initializeStorageSDK = (sdk: BackendSDK) => {
  // Initialize handlers
  uploadFileHandler = new UploadFileHandler(sdk);
  downloadFileHandler = new DownloadFileHandler(sdk);
  getFileMetadataHandler = new GetFileMetadataHandler(sdk);
  getFileUrlHandler = new GetFileUrlHandler(sdk);
  getStorageInfoHandler = new GetStorageInfoHandler(sdk);
  getStorageStatsHandler = new GetStorageStatsHandler(sdk);
  listFilesHandler = new ListFilesHandler(sdk);
  deleteFileHandler = new DeleteFileHandler(sdk);
  listFoldersHandler = new ListFoldersHandler(sdk);
  createFolderHandler = new CreateFolderHandler(sdk);
  deleteFolderHandler = new DeleteFolderHandler(sdk);
};

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// File upload endpoint
router.post(
  "/upload",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: false,
  }),
  upload.single("file"),
  async (req, res) => {
    await uploadFileHandler.handle(req, res);
  }
);

// File download endpoint
router.get(
  "/download/:fileId",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: false,
  }),
  async (req, res) => {
    await downloadFileHandler.handle(req, res);
  }
);

// File download endpoint (SDK path compatibility)
router.get(
  "/files/:fileId/download",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: false,
  }),
  async (req, res) => {
    await downloadFileHandler.handle(req, res);
  }
);

// File download endpoint (SDK path without /download for legacy compatibility)
router.get(
  "/files/:fileId",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: false,
  }),
  async (req, res) => {
    await downloadFileHandler.handle(req, res);
  }
);

// File metadata endpoint
router.get(
  "/metadata/:fileId",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: false,
  }),
  async (req, res) => {
    await getFileMetadataHandler.handle(req, res);
  }
);

// Get file URL endpoint
router.get(
  "/files/:fileId/url",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    await getFileUrlHandler.handle(req, res);
  }
);

// Get storage info endpoint
router.get(
  "/info",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    await getStorageInfoHandler.handle(req, res);
  }
);

// Get storage stats endpoint
router.get(
  "/stats",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    await getStorageStatsHandler.handle(req, res);
  }
);

// Delete file endpoint
router.delete(
  "/files/:fileId",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_DELETE],
    projectSpecific: true,
  }),
  async (req, res) => {
    await deleteFileHandler.handle(req, res);
  }
);

// List files endpoint
router.get(
  "/files",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    await listFilesHandler.handle(req, res);
  }
);

// Get folders endpoint
router.get(
  "/folders",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  async (req, res) => {
    await listFoldersHandler.handle(req, res);
  }
);

// Create folder endpoint
router.post(
  "/folders",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    await createFolderHandler.handle(req, res);
  }
);

// Delete folder endpoint
router.delete(
  "/folders/:folderId",
  authenticate,
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  async (req, res) => {
    await deleteFolderHandler.handle(req, res);
  }
);

export default router;
