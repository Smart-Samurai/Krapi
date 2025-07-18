/**
 * Authentication Routes
 * 
 * This file defines all HTTP routes for the authentication feature.
 * It connects the Express router to the AuthController methods.
 */

import express, { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router: express.Router = Router();

/**
 * Public authentication routes (no auth required)
 */

// POST /auth/login - User login
router.post('/login', AuthController.login);

// GET /auth/health - Health check for auth service
router.get('/health', AuthController.healthCheck);

/**
 * Protected authentication routes (require valid token)
 * Note: These routes will be protected by middleware in the main app
 */

// POST /auth/logout - User logout
router.post('/logout', AuthController.logout);

// GET /auth/profile - Get current user profile
router.get('/profile', AuthController.getProfile);

// GET /auth/verify - Verify token validity
router.get('/verify', AuthController.verifyToken);

// PUT /auth/password - Change user password
router.put('/password', AuthController.changePassword);

/**
 * Admin authentication routes (require admin permissions)
 */

// GET /auth/sessions - Get active sessions (admin only)
// PUT /auth/security-settings - Update security settings (admin only)
// GET /auth/login-logs - Get login attempt logs (admin only)
// These will be implemented when admin functionality is added

export default router;