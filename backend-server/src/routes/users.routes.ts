import { Router } from 'express';
import usersController from '@/controllers/users.controller';
import { 
  authenticate, 
  requireScopes
} from '@/middleware/auth.middleware';
import { Scope } from '@/types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User management routes
router.get('/:projectId/users', requireScopes({
  scopes: [Scope.PROJECTS_READ],
  projectSpecific: true
}), usersController.getUsers);

router.get('/:projectId/users/:userId', requireScopes({
  scopes: [Scope.PROJECTS_READ],
  projectSpecific: true
}), usersController.getUser);

router.post('/:projectId/users', requireScopes({
  scopes: [Scope.PROJECTS_WRITE],
  projectSpecific: true
}), usersController.createUser);

router.put('/:projectId/users/:userId', requireScopes({
  scopes: [Scope.PROJECTS_WRITE],
  projectSpecific: true
}), usersController.updateUser);

router.delete('/:projectId/users/:userId', requireScopes({
  scopes: [Scope.PROJECTS_DELETE],
  projectSpecific: true
}), usersController.deleteUser);

// User scopes management
router.put('/:projectId/users/:userId/scopes', requireScopes({
  scopes: [Scope.PROJECTS_WRITE],
  projectSpecific: true
}), usersController.updateUserScopes);

// Authentication endpoint (public for project users)
router.post('/:projectId/users/authenticate', usersController.authenticateUser);

export default router;