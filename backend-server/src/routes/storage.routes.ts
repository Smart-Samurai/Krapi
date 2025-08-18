import { Router, IRouter } from "express";

import { StorageController } from "@/controllers/storage.controller";
import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { uploadSingle } from "@/middleware/upload.middleware";
import { Scope } from "@/types";

const router: IRouter = Router();
const controller = new StorageController();

// All routes require authentication
router.use(authenticate);

// File operations
router.get(
  "/:projectId/files",
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  controller.getFiles
);

router.get(
  "/:projectId/files/:fileId",
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  controller.getFile
);

router.get(
  "/:projectId/files/:fileId/download",
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  controller.downloadFile
);

router.post(
  "/:projectId/upload",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  uploadSingle,
  controller.uploadFile
);

router.delete(
  "/:projectId/files/:fileId",
  requireScopes({
    scopes: [Scope.STORAGE_DELETE],
    projectSpecific: true,
  }),
  controller.deleteFile
);

// Folder operations
router.post(
  "/:projectId/folders",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.createFolder
);

router.get(
  "/:projectId/folders",
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  controller.getFolders
);

router.delete(
  "/:projectId/folders/:folderId",
  requireScopes({
    scopes: [Scope.STORAGE_DELETE],
    projectSpecific: true,
  }),
  controller.deleteFolder
);

// File URL generation
router.get(
  "/:projectId/files/:fileId/url",
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  controller.getFileUrl
);

// Storage statistics
router.get(
  "/:projectId/stats",
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  controller.getStorageStats
);

// Bulk operations
router.post(
  "/:projectId/bulk-delete",
  requireScopes({
    scopes: [Scope.STORAGE_DELETE],
    projectSpecific: true,
  }),
  controller.bulkDeleteFiles
);

router.post(
  "/:projectId/bulk-move",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.bulkMoveFiles
);

router.post(
  "/:projectId/bulk-update-metadata",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.bulkUpdateMetadata
);

// File operations
router.put(
  "/:projectId/files/:fileId/copy",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.copyFile
);

router.put(
  "/:projectId/files/:fileId/move",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.moveFile
);

router.put(
  "/:projectId/files/:fileId/rename",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.renameFile
);

router.put(
  "/:projectId/files/:fileId/metadata",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.updateFileMetadata
);

// File tags
router.post(
  "/:projectId/files/:fileId/tags",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.addFileTags
);

router.delete(
  "/:projectId/files/:fileId/tags",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.removeFileTags
);

// File permissions
router.get(
  "/:projectId/files/:fileId/permissions",
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  controller.getFilePermissions
);

router.post(
  "/:projectId/files/:fileId/permissions",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.grantFilePermission
);

router.delete(
  "/:projectId/files/:fileId/permissions/:userId",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.revokeFilePermission
);

// File versions
router.get(
  "/:projectId/files/:fileId/versions",
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  controller.getFileVersions
);

router.post(
  "/:projectId/files/:fileId/versions",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  uploadSingle,
  controller.uploadFileVersion
);

router.post(
  "/:projectId/files/:fileId/versions/:versionId/restore",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.restoreFileVersion
);

// Public/private file management
router.put(
  "/:projectId/files/:fileId/public",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.makeFilePublic
);

router.put(
  "/:projectId/files/:fileId/private",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  controller.makeFilePrivate
);

export default router;
