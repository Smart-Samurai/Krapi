import { Router } from 'express';
import { StorageController } from '@/controllers/storage.controller';
import { 
  authenticate, 
  requireStorageRead, 
  requireStorageWrite,
  requireScopes
} from '@/middleware/auth.middleware';
import { Scope } from '@/types';
import { uploadMiddleware } from '@/middleware/upload.middleware';

const router = Router();
const controller = new StorageController();

// All routes require authentication
router.use(authenticate);

// File operations
router.get('/:projectId/storage/files', requireStorageRead, controller.getFiles);
router.get('/:projectId/storage/files/:fileId', requireStorageRead, controller.getFile);
router.get('/:projectId/storage/files/:fileId/download', requireStorageRead, controller.downloadFile);
router.post('/:projectId/storage/upload', requireStorageWrite, uploadMiddleware.single('file'), controller.uploadFile);
router.delete('/:projectId/storage/files/:fileId', requireScopes({
  scopes: [Scope.STORAGE_DELETE],
  projectSpecific: true
}), controller.deleteFile);

// Storage statistics
router.get('/:projectId/storage/stats', requireStorageRead, controller.getStorageStats);

export default router;