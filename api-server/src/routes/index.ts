import { Router, Router as RouterType } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import projectRoutes from './project.routes';
import databaseRoutes from './database.routes';
import storageRoutes from './storage.routes';

const router: RouterType = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'KRAPI Backend is running',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// API version info
router.get('/version', (req, res) => {
  res.json({
    success: true,
    data: {
      version: '2.0.0',
      api: 'KRAPI',
      documentation: '/docs'
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/projects', projectRoutes);
router.use('/database', databaseRoutes);
router.use('/storage', storageRoutes);

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

export default router;