import { Router, Router as RouterType } from 'express';
import projectController from '@/controllers/project.controller';
import { validate, requestSchemas } from '@/middleware/validation.middleware';
import { authenticateJWT, requireAdmin } from '@/middleware/auth.middleware';

const router: RouterType = Router();

// All project routes require authentication and admin role
router.use(authenticateJWT);
router.use(requireAdmin);

// Project management
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', validate(requestSchemas.createProject), projectController.createProject);
router.put('/:id', validate(requestSchemas.updateProject), projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.get('/:id/stats', projectController.getProjectStats);
router.get('/:id/activity', projectController.getProjectActivity);
router.post('/:id/regenerate-api-key', projectController.regenerateApiKey);

export default router;