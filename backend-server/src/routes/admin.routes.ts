import { Router, Router as RouterType } from 'express';
import adminController from '@/controllers/admin.controller';
import { validate, requestSchemas } from '@/middleware/validation.middleware';
import { authenticateJWT, requireAdmin, requireMasterAdmin } from '@/middleware/auth.middleware';

const router: RouterType = Router();

// All admin routes require authentication and admin role
router.use(authenticateJWT);
router.use(requireAdmin);

// Admin user management
router.get('/users', adminController.getAllAdminUsers);
router.get('/users/:id', adminController.getAdminUserById);
router.post('/users', requireMasterAdmin, validate(requestSchemas.createAdminUser), adminController.createAdminUser);
router.put('/users/:id', requireMasterAdmin, validate(requestSchemas.updateAdminUser), adminController.updateAdminUser);
router.delete('/users/:id', requireMasterAdmin, adminController.deleteAdminUser);
router.post('/users/:id/toggle-status', requireMasterAdmin, adminController.toggleAdminUserStatus);
router.get('/users/:id/activity', adminController.getAdminUserActivity);

export default router;