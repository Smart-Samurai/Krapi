import { Router, Router as RouterType } from 'express';
import storageController from '@/controllers/storage.controller';
import { validate, requestSchemas } from '@/middleware/validation.middleware';
import { authenticateJWT, requireProjectAccess } from '@/middleware/auth.middleware';

const router: RouterType = Router();

// All storage routes require authentication and project access
router.use(authenticateJWT);
router.use(requireProjectAccess);

// File management
router.get('/:projectId/files', storageController.getFiles);
router.get('/:projectId/files/:fileId', storageController.getFileInfo);
router.get('/:projectId/files/:fileId/download', storageController.downloadFile);
router.post('/:projectId/files', validate(requestSchemas.uploadFile), storageController.uploadFile);
router.delete('/:projectId/files/:fileId', storageController.deleteFile);

// Storage stats
router.get('/:projectId/stats', storageController.getStorageStats);

export default router;