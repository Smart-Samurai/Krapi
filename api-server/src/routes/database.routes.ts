import { Router, Router as RouterType } from 'express';
import databaseController from '@/controllers/database.controller';
import { validate, requestSchemas } from '@/middleware/validation.middleware';
import { authenticateSession, authenticateJWT, requireProjectAccess } from '@/middleware/auth.middleware';

const router: RouterType = Router();

// Session-based routes (first request after session creation)
router.post('/:projectId/schemas', authenticateSession, validate(requestSchemas.createTableSchema), databaseController.createTableSchema);

// JWT-based routes (subsequent requests)
router.use(authenticateJWT);
router.use(requireProjectAccess);

// Table schema management
router.get('/:projectId/schemas', databaseController.getTableSchemas);
router.get('/:projectId/schemas/:tableName', databaseController.getTableSchema);
router.put('/:projectId/schemas/:tableName', databaseController.updateTableSchema);
router.delete('/:projectId/schemas/:tableName', databaseController.deleteTableSchema);

// Document management
router.get('/:projectId/:tableName/documents', validate(requestSchemas.listDocuments), databaseController.getDocuments);
router.get('/:projectId/:tableName/documents/:documentId', databaseController.getDocument);
router.post('/:projectId/:tableName/documents', validate(requestSchemas.createDocument), databaseController.createDocument);
router.put('/:projectId/:tableName/documents/:documentId', validate(requestSchemas.updateDocument), databaseController.updateDocument);
router.delete('/:projectId/:tableName/documents/:documentId', databaseController.deleteDocument);

export default router;