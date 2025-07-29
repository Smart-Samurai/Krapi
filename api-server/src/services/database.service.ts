import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  AdminUser, 
  AdminRole, 
  AccessLevel,
  Project,
  TableSchema,
  Document,
  FileRecord,
  ProjectUser,
  Session,
  ChangelogEntry
} from '@/types';

export class DatabaseService {
  private db: Database.Database;
  private static instance: DatabaseService;

  private constructor() {
    const dbPath = process.env.DATABASE_PATH || './data/krapi.db';
    const dbDir = path.dirname(dbPath);
    
    // Ensure data directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    this.initializeTables();
    this.seedDefaultData();
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initializeTables() {
    // Admin Users Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        access_level TEXT NOT NULL,
        permissions TEXT NOT NULL DEFAULT '[]',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login TEXT
      );
    `);

    // Projects Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        api_key TEXT UNIQUE NOT NULL,
        settings TEXT NOT NULL DEFAULT '{}',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (created_by) REFERENCES admin_users(id)
      );
    `);

    // Table Schemas Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS table_schemas (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        fields TEXT NOT NULL,
        indexes TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(project_id, name)
      );
    `);

    // Documents Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        table_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT,
        updated_by TEXT,
        FOREIGN KEY (table_id) REFERENCES table_schemas(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);

    // Files Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        path TEXT NOT NULL,
        uploaded_by TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);

    // Project Users Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project_users (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        email TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        password_hash TEXT,
        verified INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(project_id, email)
      );
    `);

    // Sessions Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        user_id TEXT,
        api_key TEXT,
        project_id TEXT,
        permissions TEXT NOT NULL DEFAULT '[]',
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        consumed INTEGER NOT NULL DEFAULT 0,
        consumed_at TEXT
      );
    `);

    // Changelog Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS changelog (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        changes TEXT NOT NULL,
        performed_by TEXT NOT NULL,
        session_id TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
      );
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_documents_table_id ON documents(table_id);
      CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
      CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_users_email ON project_users(email);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_changelog_project_id ON changelog(project_id);
      CREATE INDEX IF NOT EXISTS idx_changelog_entity ON changelog(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_changelog_timestamp ON changelog(timestamp);
    `);
  }

  private seedDefaultData() {
    // Check if default admin exists
    const adminCount = this.db.prepare('SELECT COUNT(*) as count FROM admin_users').get() as { count: number };
    
    if (adminCount.count === 0) {
      const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@krapi.local';
      const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
      const hashedPassword = bcrypt.hashSync(defaultAdminPassword, 10);
      
      const adminId = uuidv4();
      const now = new Date().toISOString();
      
      this.db.prepare(`
        INSERT INTO admin_users (id, email, username, password_hash, role, access_level, permissions, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        adminId,
        defaultAdminEmail,
        'admin',
        hashedPassword,
        AdminRole.MASTER_ADMIN,
        AccessLevel.FULL,
        JSON.stringify([]),
        1,
        now,
        now
      );

      console.log(`✅ Default admin user created (email: ${defaultAdminEmail}, password: ${defaultAdminPassword})`);
    }

    // Create default "users" table schema for all projects
    this.ensureUsersTableSchema();
  }

  private ensureUsersTableSchema() {
    // This will be called when creating new projects to ensure they have a users table
  }

  // Admin User Methods
  getAdminUserByEmail(email: string): AdminUser | null {
    const row = this.db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email) as any;
    if (!row) return null;
    
    return {
      ...row,
      permissions: JSON.parse(row.permissions),
      active: Boolean(row.active)
    };
  }

  getAdminUserById(id: string): AdminUser | null {
    const row = this.db.prepare('SELECT * FROM admin_users WHERE id = ?').get(id) as any;
    if (!row) return null;
    
    return {
      ...row,
      permissions: JSON.parse(row.permissions),
      active: Boolean(row.active)
    };
  }

  getAllAdminUsers(): AdminUser[] {
    const rows = this.db.prepare('SELECT * FROM admin_users ORDER BY created_at DESC').all() as any[];
    return rows.map(row => ({
      ...row,
      permissions: JSON.parse(row.permissions),
      active: Boolean(row.active)
    }));
  }

  createAdminUser(user: Omit<AdminUser, 'id' | 'created_at' | 'updated_at'>): AdminUser {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO admin_users (id, email, username, password_hash, role, access_level, permissions, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      user.email,
      user.username,
      user.password_hash,
      user.role,
      user.access_level,
      JSON.stringify(user.permissions),
      user.active ? 1 : 0,
      now,
      now
    );

    return this.getAdminUserById(id)!;
  }

  updateAdminUser(id: string, updates: Partial<AdminUser>): AdminUser | null {
    const current = this.getAdminUserById(id);
    if (!current) return null;

    const fields = [];
    const values = [];

    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.username !== undefined) {
      fields.push('username = ?');
      values.push(updates.username);
    }
    if (updates.password_hash !== undefined) {
      fields.push('password_hash = ?');
      values.push(updates.password_hash);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    if (updates.access_level !== undefined) {
      fields.push('access_level = ?');
      values.push(updates.access_level);
    }
    if (updates.permissions !== undefined) {
      fields.push('permissions = ?');
      values.push(JSON.stringify(updates.permissions));
    }
    if (updates.active !== undefined) {
      fields.push('active = ?');
      values.push(updates.active ? 1 : 0);
    }
    if (updates.last_login !== undefined) {
      fields.push('last_login = ?');
      values.push(updates.last_login);
    }

    if (fields.length === 0) return current;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db.prepare(`UPDATE admin_users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getAdminUserById(id);
  }

  deleteAdminUser(id: string): boolean {
    const result = this.db.prepare('DELETE FROM admin_users WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Project Methods
  getProjectById(id: string): Project | null {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!row) return null;
    
    return {
      ...row,
      settings: JSON.parse(row.settings),
      active: Boolean(row.active)
    };
  }

  getProjectByApiKey(apiKey: string): Project | null {
    const row = this.db.prepare('SELECT * FROM projects WHERE api_key = ?').get(apiKey) as any;
    if (!row) return null;
    
    return {
      ...row,
      settings: JSON.parse(row.settings),
      active: Boolean(row.active)
    };
  }

  getAllProjects(): Project[] {
    const rows = this.db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as any[];
    return rows.map(row => ({
      ...row,
      settings: JSON.parse(row.settings),
      active: Boolean(row.active)
    }));
  }

  createProject(project: Omit<Project, 'id' | 'api_key' | 'created_at' | 'updated_at'>): Project {
    const id = uuidv4();
    const apiKey = `krapi_${uuidv4().replace(/-/g, '')}`;
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO projects (id, name, description, api_key, settings, created_by, created_at, updated_at, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      project.name,
      project.description || null,
      apiKey,
      JSON.stringify(project.settings),
      project.created_by,
      now,
      now,
      project.active ? 1 : 0
    );

    // Create default users table for the project
    this.createDefaultUsersTable(id);

    return this.getProjectById(id)!;
  }

  private createDefaultUsersTable(projectId: string) {
    const usersTableSchema: Omit<TableSchema, 'id' | 'created_at' | 'updated_at'> = {
      project_id: projectId,
      name: 'users',
      description: 'Default users table for authentication',
      fields: [
        { name: 'id', type: 'string' as any, required: true, unique: true },
        { name: 'email', type: 'string' as any, required: true, unique: true },
        { name: 'name', type: 'string' as any, required: false, unique: false },
        { name: 'phone', type: 'string' as any, required: false, unique: false },
        { name: 'password_hash', type: 'string' as any, required: false, unique: false },
        { name: 'verified', type: 'boolean' as any, required: true, unique: false, default: false },
        { name: 'active', type: 'boolean' as any, required: true, unique: false, default: true },
        { name: 'metadata', type: 'json' as any, required: false, unique: false },
        { name: 'created_at', type: 'datetime' as any, required: true, unique: false },
        { name: 'updated_at', type: 'datetime' as any, required: true, unique: false },
        { name: 'last_login', type: 'datetime' as any, required: false, unique: false }
      ],
      indexes: [
        { name: 'idx_users_email', fields: ['email'], unique: true }
      ]
    };

    this.createTableSchema(usersTableSchema);
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const current = this.getProjectById(id);
    if (!current) return null;

    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.settings !== undefined) {
      fields.push('settings = ?');
      values.push(JSON.stringify(updates.settings));
    }
    if (updates.active !== undefined) {
      fields.push('active = ?');
      values.push(updates.active ? 1 : 0);
    }

    if (fields.length === 0) return current;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getProjectById(id);
  }

  deleteProject(id: string): boolean {
    const result = this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Table Schema Methods
  getTableSchemaById(id: string): TableSchema | null {
    const row = this.db.prepare('SELECT * FROM table_schemas WHERE id = ?').get(id) as any;
    if (!row) return null;
    
    return {
      ...row,
      fields: JSON.parse(row.fields),
      indexes: JSON.parse(row.indexes)
    };
  }

  getTableSchemaByName(projectId: string, name: string): TableSchema | null {
    const row = this.db.prepare('SELECT * FROM table_schemas WHERE project_id = ? AND name = ?').get(projectId, name) as any;
    if (!row) return null;
    
    return {
      ...row,
      fields: JSON.parse(row.fields),
      indexes: JSON.parse(row.indexes)
    };
  }

  getTableSchemasByProject(projectId: string): TableSchema[] {
    const rows = this.db.prepare('SELECT * FROM table_schemas WHERE project_id = ? ORDER BY name').all(projectId) as any[];
    return rows.map(row => ({
      ...row,
      fields: JSON.parse(row.fields),
      indexes: JSON.parse(row.indexes)
    }));
  }

  createTableSchema(schema: Omit<TableSchema, 'id' | 'created_at' | 'updated_at'>): TableSchema {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO table_schemas (id, project_id, name, description, fields, indexes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      schema.project_id,
      schema.name,
      schema.description || null,
      JSON.stringify(schema.fields),
      JSON.stringify(schema.indexes),
      now,
      now
    );

    return this.getTableSchemaById(id)!;
  }

  updateTableSchema(id: string, updates: Partial<TableSchema>): TableSchema | null {
    const current = this.getTableSchemaById(id);
    if (!current) return null;

    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.fields !== undefined) {
      fields.push('fields = ?');
      values.push(JSON.stringify(updates.fields));
    }
    if (updates.indexes !== undefined) {
      fields.push('indexes = ?');
      values.push(JSON.stringify(updates.indexes));
    }

    if (fields.length === 0) return current;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db.prepare(`UPDATE table_schemas SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getTableSchemaById(id);
  }

  deleteTableSchema(id: string): boolean {
    const result = this.db.prepare('DELETE FROM table_schemas WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Document Methods
  getDocumentById(id: string): Document | null {
    const row = this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
    if (!row) return null;
    
    return {
      ...row,
      data: JSON.parse(row.data)
    };
  }

  getDocumentsByTable(tableId: string, options: any = {}): { documents: Document[], total: number } {
    const { page = 1, limit = 50, sort, order = 'desc', filter } = options;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM documents WHERE table_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM documents WHERE table_id = ?';
    const params = [tableId];
    
    // Add filtering if provided
    if (filter) {
      // This is a simplified version - in production, you'd want more sophisticated filtering
      const filterConditions = Object.entries(filter).map(([key, value]) => {
        params.push(`%${value}%`);
        return `data LIKE ?`;
      });
      
      if (filterConditions.length > 0) {
        const whereClause = ` AND ${filterConditions.join(' AND ')}`;
        query += whereClause;
        countQuery += whereClause;
      }
    }
    
    // Add sorting
    if (sort) {
      query += ` ORDER BY ${sort} ${order.toUpperCase()}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }
    
    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit.toString(), offset.toString());
    
    const documents = this.db.prepare(query).all(...params) as any[];
    const { total } = this.db.prepare(countQuery).get(...params.slice(0, -2)) as { total: number };
    
    return {
      documents: documents.map(doc => ({
        ...doc,
        data: JSON.parse(doc.data)
      })),
      total
    };
  }

  createDocument(document: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Document {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO documents (id, table_id, project_id, data, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      document.table_id,
      document.project_id,
      JSON.stringify(document.data),
      now,
      now,
      document.created_by || null,
      document.updated_by || null
    );

    return this.getDocumentById(id)!;
  }

  updateDocument(id: string, updates: Partial<Document>): Document | null {
    const current = this.getDocumentById(id);
    if (!current) return null;

    const fields = [];
    const values = [];

    if (updates.data !== undefined) {
      fields.push('data = ?');
      values.push(JSON.stringify(updates.data));
    }
    if (updates.updated_by !== undefined) {
      fields.push('updated_by = ?');
      values.push(updates.updated_by);
    }

    if (fields.length === 0) return current;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db.prepare(`UPDATE documents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getDocumentById(id);
  }

  deleteDocument(id: string): boolean {
    const result = this.db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // File Methods
  getFileById(id: string): FileRecord | null {
    const row = this.db.prepare('SELECT * FROM files WHERE id = ?').get(id) as any;
    return row || null;
  }

  getFilesByProject(projectId: string): FileRecord[] {
    return this.db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as FileRecord[];
  }

  createFile(file: Omit<FileRecord, 'id' | 'created_at'>): FileRecord {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO files (id, project_id, filename, original_name, mime_type, size, path, uploaded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      file.project_id,
      file.filename,
      file.original_name,
      file.mime_type,
      file.size,
      file.path,
      file.uploaded_by || null,
      now
    );

    return this.getFileById(id)!;
  }

  deleteFile(id: string): boolean {
    const result = this.db.prepare('DELETE FROM files WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Project User Methods
  getProjectUserById(id: string): ProjectUser | null {
    const row = this.db.prepare('SELECT * FROM project_users WHERE id = ?').get(id) as any;
    if (!row) return null;
    
    return {
      ...row,
      verified: Boolean(row.verified),
      active: Boolean(row.active),
      metadata: JSON.parse(row.metadata)
    };
  }

  getProjectUserByEmail(projectId: string, email: string): ProjectUser | null {
    const row = this.db.prepare('SELECT * FROM project_users WHERE project_id = ? AND email = ?').get(projectId, email) as any;
    if (!row) return null;
    
    return {
      ...row,
      verified: Boolean(row.verified),
      active: Boolean(row.active),
      metadata: JSON.parse(row.metadata)
    };
  }

  getProjectUsers(projectId: string): ProjectUser[] {
    const rows = this.db.prepare('SELECT * FROM project_users WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as any[];
    return rows.map(row => ({
      ...row,
      verified: Boolean(row.verified),
      active: Boolean(row.active),
      metadata: JSON.parse(row.metadata)
    }));
  }

  createProjectUser(user: Omit<ProjectUser, 'id' | 'created_at' | 'updated_at'>): ProjectUser {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO project_users (id, project_id, email, name, phone, password_hash, verified, active, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      user.project_id,
      user.email,
      user.name || null,
      user.phone || null,
      user.password_hash || null,
      user.verified ? 1 : 0,
      user.active ? 1 : 0,
      JSON.stringify(user.metadata || {}),
      now,
      now
    );

    return this.getProjectUserById(id)!;
  }

  updateProjectUser(id: string, updates: Partial<ProjectUser>): ProjectUser | null {
    const current = this.getProjectUserById(id);
    if (!current) return null;

    const fields = [];
    const values = [];

    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.phone !== undefined) {
      fields.push('phone = ?');
      values.push(updates.phone);
    }
    if (updates.password_hash !== undefined) {
      fields.push('password_hash = ?');
      values.push(updates.password_hash);
    }
    if (updates.verified !== undefined) {
      fields.push('verified = ?');
      values.push(updates.verified ? 1 : 0);
    }
    if (updates.active !== undefined) {
      fields.push('active = ?');
      values.push(updates.active ? 1 : 0);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    if (updates.last_login !== undefined) {
      fields.push('last_login = ?');
      values.push(updates.last_login);
    }

    if (fields.length === 0) return current;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db.prepare(`UPDATE project_users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getProjectUserById(id);
  }

  deleteProjectUser(id: string): boolean {
    const result = this.db.prepare('DELETE FROM project_users WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // Session Methods
  createSession(session: Omit<Session, 'id' | 'created_at'>): Session {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO sessions (id, token, type, user_id, api_key, project_id, permissions, expires_at, created_at, consumed, consumed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      session.token,
      session.type,
      session.user_id || null,
      session.api_key || null,
      session.project_id || null,
      JSON.stringify(session.permissions),
      session.expires_at,
      now,
      session.consumed ? 1 : 0,
      session.consumed_at || null
    );

    return this.getSessionById(id)!;
  }

  getSessionById(id: string): Session | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
    if (!row) return null;
    
    return {
      ...row,
      permissions: JSON.parse(row.permissions),
      consumed: Boolean(row.consumed)
    };
  }

  getSessionByToken(token: string): Session | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as any;
    if (!row) return null;
    
    return {
      ...row,
      permissions: JSON.parse(row.permissions),
      consumed: Boolean(row.consumed)
    };
  }

  consumeSession(token: string): Session | null {
    const session = this.getSessionByToken(token);
    if (!session || session.consumed) return null;

    const now = new Date().toISOString();
    this.db.prepare('UPDATE sessions SET consumed = 1, consumed_at = ? WHERE token = ?').run(now, token);
    
    return this.getSessionByToken(token);
  }

  cleanupExpiredSessions(): number {
    const now = new Date().toISOString();
    const result = this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
    return result.changes;
  }

  // Changelog Methods
  createChangelogEntry(entry: Omit<ChangelogEntry, 'id' | 'timestamp'>): ChangelogEntry {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO changelog (id, project_id, entity_type, entity_id, action, changes, performed_by, session_id, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entry.project_id || null,
      entry.entity_type,
      entry.entity_id,
      entry.action,
      JSON.stringify(entry.changes),
      entry.performed_by,
      entry.session_id || null,
      timestamp
    );

    return { ...entry, id, timestamp };
  }

  getChangelogEntries(options: { project_id?: string, entity_type?: string, entity_id?: string, limit?: number } = {}): ChangelogEntry[] {
    let query = 'SELECT * FROM changelog WHERE 1=1';
    const params = [];
    
    if (options.project_id) {
      query += ' AND project_id = ?';
      params.push(options.project_id);
    }
    
    if (options.entity_type) {
      query += ' AND entity_type = ?';
      params.push(options.entity_type);
    }
    
    if (options.entity_id) {
      query += ' AND entity_id = ?';
      params.push(options.entity_id);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }
    
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => ({
      ...row,
      changes: JSON.parse(row.changes)
    }));
  }

  // Utility Methods
  close() {
    this.db.close();
  }

  getDatabase(): Database.Database {
    return this.db;
  }
}