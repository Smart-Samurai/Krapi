import { Router, Router as RouterType } from 'express';
import authController from '@/controllers/auth.controller';
import { validate, requestSchemas } from '@/middleware/validation.middleware';
import { authenticateJWT } from '@/middleware/auth.middleware';

const router: RouterType = Router();

// Public routes
router.post('/admin/login', validate(requestSchemas.adminLogin), authController.adminLogin);
router.post('/admin/session', validate(requestSchemas.createSession), authController.createAdminSession);
router.post('/project/:projectId/session', validate(requestSchemas.createSession), authController.createProjectSession);
router.post('/session/validate', authController.validateSession);

// Protected routes
router.use(authenticateJWT);
router.get('/me', authController.getCurrentUser);
router.post('/logout', authController.logout);
router.post('/change-password', authController.changePassword);

export default router;