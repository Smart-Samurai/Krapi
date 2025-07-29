import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { DatabaseService } from './services/database.service';
import { AuthService } from './services/auth.service';

// Load environment variables
dotenv.config();

// Initialize services
DatabaseService.getInstance();
const authService = AuthService.getInstance();

// Create Express app
const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || ['http://localhost:3469'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['X-Auth-Token']
}));

// Compression
app.use(compression());

// Request logging
app.use(morgan(process.env.LOG_FORMAT || 'combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/krapi/k1', limiter);

// Mount routes
app.use('/krapi/k1', routes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
  console.error('Global error handler:', err);
  
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.details
    });
    return;
  }
  
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
    return;
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, () => {
  console.log(`🚀 KRAPI Backend v2.0.0 running on http://${HOST}:${PORT}`);
  console.log(`📚 API Base URL: http://${HOST}:${PORT}/krapi/k1`);
  console.log(`🔐 Default admin: ${process.env.DEFAULT_ADMIN_EMAIL} / ${process.env.DEFAULT_ADMIN_PASSWORD}`);
  
  // Schedule session cleanup
  setInterval(async () => {
    try {
      const cleaned = await authService.cleanupSessions();
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
      }
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }, 60 * 60 * 1000); // Every hour
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    DatabaseService.getInstance().close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    DatabaseService.getInstance().close();
    process.exit(0);
  });
});

export default app;