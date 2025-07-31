import { Router } from 'express';
import { authenticate, authorize } from '@/middleware/auth.middleware';
import { CollectionsController } from '@/controllers/collections.controller';

const router = Router();
const controller = new CollectionsController();

// All routes require authentication
router.use(authenticate);

// Collection routes
router.get('/:projectId/collections', authorize('collections.read'), controller.getCollections);
router.get('/:projectId/collections/:collectionName', authorize('collections.read'), controller.getCollection);
router.post('/:projectId/collections', authorize('collections.write'), controller.createCollection);
router.put('/:projectId/collections/:collectionName', authorize('collections.write'), controller.updateCollection);
router.delete('/:projectId/collections/:collectionName', authorize('collections.write'), controller.deleteCollection);

// Document routes
router.get('/:projectId/collections/:collectionName/documents', authorize('collections.read'), controller.getDocuments);
router.get('/:projectId/collections/:collectionName/documents/:documentId', authorize('collections.read'), controller.getDocument);
router.post('/:projectId/collections/:collectionName/documents', authorize('collections.write'), controller.createDocument);
router.put('/:projectId/collections/:collectionName/documents/:documentId', authorize('collections.write'), controller.updateDocument);
router.delete('/:projectId/collections/:collectionName/documents/:documentId', authorize('collections.write'), controller.deleteDocument);

export default router;