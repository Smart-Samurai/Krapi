import { Router, Router as RouterType } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import projectRoutes from './project.routes';
import collectionsRoutes from './collections.routes';
import storageRoutes from './storage.routes';
import { DatabaseService } from '@/services/database.service';

const router: RouterType = Router();

// Health check
router.get('/health', async (req, res) => {
  try {
    const db = DatabaseService.getInstance();
    const dbHealth = await db.performHealthCheck();
    
    res.json({
      success: true,
      message: 'KRAPI Backend is running',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      database: dbHealth
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database repair endpoint (protected - should be admin only in production)
router.post('/health/repair', async (req, res) => {
  try {
    const db = DatabaseService.getInstance();
    const repairResult = await db.repairDatabase();
    
    res.json({
      success: repairResult.success,
      message: repairResult.success ? 'Database repair completed' : 'Database repair failed',
      actions: repairResult.actions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database repair failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
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
router.use('/projects', collectionsRoutes); // Collections are under projects
router.use('/projects', storageRoutes); // Storage is under projects

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

export default router;