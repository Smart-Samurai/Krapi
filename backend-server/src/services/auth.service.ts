import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';
import { 
  AdminUser, 
  Session, 
  SessionType,
  Project,
  ChangeAction
} from '@/types';

export class AuthService {
  private static instance: AuthService;
  private db: DatabaseService;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private sessionExpiresIn: number;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-this';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.sessionExpiresIn = this.parseSessionDuration(process.env.SESSION_EXPIRES_IN || '1h');
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private parseSessionDuration(duration: string): number {
    const match = duration.match(/^(\d+)([hmd])$/);
    if (!match) return 3600000; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      default: return 3600000;
    }
  }

  // Admin Authentication
  async authenticateAdmin(email: string, password: string): Promise<AdminUser | null> {
    const user = await this.db.getAdminUserByEmail(email);
    if (!user || !user.active) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    // Update last login
    this.db.updateAdminUser(user.id, { last_login: new Date().toISOString() });

    return user;
  }

  // Create Admin Session
  async createAdminSession(apiKey: string): Promise<Session | null> {
    // For admin sessions, we use a special API key stored in environment
    const masterApiKey = process.env.MASTER_API_KEY || 'master_key_change_this';
    
    if (apiKey !== masterApiKey) {
      return null;
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + this.sessionExpiresIn).toISOString();

    const session = await this.db.createSession({
      token,
      type: SessionType.ADMIN,
      user_id: user.id,
      permissions: ['*'], // Full permissions for admin session
      expires_at: expiresAt,
      consumed: false,
      created_at: new Date().toISOString()
    });

    return session;
  }

  // Create Project Session
  async createProjectSession(projectId: string, apiKey: string): Promise<Session | null> {
    const project = await this.db.getProjectByApiKey(apiKey);
    
    if (!project || project.id !== projectId || !project.active) {
      return null;
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + this.sessionExpiresIn).toISOString();

    const session = await this.db.createSession({
      token,
      type: SessionType.PROJECT,
      api_key: apiKey,
      project_id: projectId,
      permissions: this.getProjectPermissions(project),
      expires_at: expiresAt,
      consumed: false,
      created_at: new Date().toISOString()
    });

    return session;
  }

  // Validate and Consume Session
  async validateSession(token: string): Promise<{ valid: boolean, session?: Session, project?: Project, user?: AdminUser }> {
    const session = await this.db.getSessionByToken(token);
    
    if (!session) {
      return { valid: false };
    }

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      return { valid: false };
    }

    // Check if already consumed
    if (session.consumed) {
      return { valid: false };
    }

    // Consume the session
    const consumedSession = await this.db.consumeSession(token);
    if (!consumedSession) {
      return { valid: false };
    }

    // Get associated data based on session type
    if (session.type === SessionType.ADMIN && session.user_id) {
      const user = await this.db.getAdminUserById(session.user_id);
      return { valid: true, session: consumedSession, user: user || undefined };
    } else if (session.type === SessionType.PROJECT && session.project_id) {
      const project = await this.db.getProjectById(session.project_id);
      return { valid: true, session: consumedSession, project: project || undefined };
    }

    return { valid: true, session: consumedSession };
  }

  // Generate JWT Token (for after session validation)
  generateJWT(payload: { id: string, type: SessionType, projectId?: string, permissions?: string[] }): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn } as jwt.SignOptions);
  }

  // Verify JWT Token
  verifyJWT(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch {
      return null;
    }
  }

  // Hash Password
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Get Project Permissions
  private getProjectPermissions(project: Project): string[] {
    const permissions = [
      'database.read',
      'database.write',
      'storage.read',
      'storage.write',
      'users.read',
      'users.write'
    ];

    // Add additional permissions based on project settings
    if (project.settings.email_config) {
      permissions.push('email.send');
    }

    return permissions;
  }

  // Clean up expired sessions
  async cleanupSessions(): Promise<number> {
    return this.db.cleanupExpiredSessions();
  }

  // Log authentication action
  async logAuthAction(action: 'login' | 'logout' | 'session_created', userId: string, projectId?: string, sessionId?: string) {
    await this.db.createChangelogEntry({
      project_id: projectId,
      entity_type: 'auth',
      entity_id: userId,
      action: ChangeAction.CREATE,
      changes: { action },
      performed_by: userId,
      session_id: sessionId,
      timestamp: new Date().toISOString()
    });
  }
}