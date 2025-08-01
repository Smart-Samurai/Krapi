import { Router, IRouter } from "express";
import { StorageController } from "@/controllers/storage.controller";
import { authenticate, requireScopes } from "@/middleware/auth.middleware";
import { Scope } from "@/types";
import { uploadSingle } from "@/middleware/upload.middleware";

const router: IRouter = Router();
const controller = new StorageController();

// All routes require authentication
router.use(authenticate);

// File operations
router.get(
  "/:projectId/storage/files",
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  controller.getFiles
);
router.get(
  "/:projectId/storage/files/:fileId",
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  controller.getFile
);
router.get(
  "/:projectId/storage/files/:fileId/download",
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  controller.downloadFile
);
router.post(
  "/:projectId/storage/upload",
  requireScopes({
    scopes: [Scope.STORAGE_WRITE],
    projectSpecific: true,
  }),
  uploadSingle as any,
  controller.uploadFile
);
router.delete(
  "/:projectId/storage/files/:fileId",
  requireScopes({
    scopes: [Scope.STORAGE_DELETE],
    projectSpecific: true,
  }),
  controller.deleteFile
);

// Storage statistics
router.get(
  "/:projectId/storage/stats",
  requireScopes({
    scopes: [Scope.STORAGE_READ],
    projectSpecific: true,
  }),
  controller.getStorageStats
);

export default router;
