import { Router } from 'express';
import { AdminController } from '@/controllers/admin.controller';
import { 
  authenticate, 
  requireScopes
} from '@/middleware/auth.middleware';
import { Scope } from '@/types';

const router = Router();
const controller = new AdminController();

// All routes require authentication
router.use(authenticate);

// Admin user management
router.get('/users', requireScopes({
  scopes: [Scope.ADMIN_READ]
}), controller.getAdminUsers);

router.get('/users/:userId', requireScopes({
  scopes: [Scope.ADMIN_READ]
}), controller.getAdminUser);

router.post('/users', requireScopes({
  scopes: [Scope.ADMIN_WRITE]
}), controller.createAdminUser);

router.put('/users/:userId', requireScopes({
  scopes: [Scope.ADMIN_WRITE]
}), controller.updateAdminUser);

router.delete('/users/:userId', requireScopes({
  scopes: [Scope.ADMIN_DELETE]
}), controller.deleteAdminUser);

// API key management for admin users
router.get('/users/:userId/api-keys', requireScopes({
  scopes: [Scope.ADMIN_READ]
}), controller.getUserApiKeys);

router.post('/users/:userId/api-keys', requireScopes({
  scopes: [Scope.ADMIN_WRITE]
}), controller.createUserApiKey);

router.delete('/api-keys/:keyId', requireScopes({
  scopes: [Scope.ADMIN_WRITE]
}), controller.deleteApiKey);

// System statistics
router.get('/stats', requireScopes({
  scopes: [Scope.ADMIN_READ]
}), controller.getSystemStats);

// Activity logs
router.get('/activity', requireScopes({
  scopes: [Scope.ADMIN_READ]
}), controller.getActivityLogs);

export default router;