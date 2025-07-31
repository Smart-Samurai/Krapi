import { Router } from 'express';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { StorageController } from '@/controllers/storage.controller';
import multer from 'multer';

const router = Router();
const controller = new StorageController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB default limit
  }
});

// All routes require authentication
router.use(authenticate);

// File management routes
router.get('/:projectId/storage/files', authorize('storage.read'), controller.getFiles);
router.get('/:projectId/storage/files/:fileId', authorize('storage.read'), controller.getFile);
router.post('/:projectId/storage/files', authorize('storage.upload'), upload.single('file'), controller.uploadFile);
router.get('/:projectId/storage/files/:fileId/download', authorize('storage.read'), controller.downloadFile);
router.delete('/:projectId/storage/files/:fileId', authorize('storage.delete'), controller.deleteFile);

// Storage stats
router.get('/:projectId/storage/stats', authorize('storage.read'), controller.getStorageStats);

export default router;