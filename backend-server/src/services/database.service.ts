import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  AdminUser, 
  AdminRole, 
  AccessLevel,
  AdminPermission,
  Project,
  ProjectSettings,
  TableSchema,
  TableField,
  TableIndex,
  Document,
  FileRecord,
  ProjectUser,
  Session,
  SessionType,
  ChangelogEntry,
  ChangeAction
} from '@/types';

export class DatabaseService {
  private pool: Pool;
  private static instance: DatabaseService;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 10;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private readyReject!: (error: Error) => void;

  private constructor() {
    // Create the ready promise
    this.readyPromise = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    // PostgreSQL connection configuration
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'krapi',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000, // Increased from 2000
    });

    // Set up error handlers
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    // Initialize with proper error handling
    this.initializeWithRetry().catch((error) => {
      console.error('Database initialization failed:', error);
      this.readyReject(error);
    });
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Public method to wait for database to be ready
  async waitForReady(): Promise<void> {
    return this.readyPromise;
  }

  // Check if database is ready (non-blocking)
  isReady(): boolean {
    return this.isConnected;
  }

  // Ensure database is ready before operations
  private async ensureReady(): Promise<void> {
    if (!this.isConnected) {
      await this.waitForReady();
    }
  }

  private async initializeWithRetry() {
    while (this.connectionAttempts < this.maxConnectionAttempts && !this.isConnected) {
      this.connectionAttempts++;
      console.log(`Attempting to connect to PostgreSQL (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})...`);
      
      try {
        // Test the connection
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        this.isConnected = true;
        console.log('Successfully connected to PostgreSQL');
        
        // Initialize tables after successful connection
        await this.initializeTables();
        
        // Resolve the ready promise on successful initialization
        this.readyResolve();
        break;
      } catch (error) {
        console.error(`Failed to connect to PostgreSQL (attempt ${this.connectionAttempts}):`, error);
        
        if (this.connectionAttempts < this.maxConnectionAttempts) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, this.connectionAttempts - 1), 10000);
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          console.error('Max connection attempts reached. Please ensure PostgreSQL is running.');
          const connectionError = new Error('Failed to connect to PostgreSQL after multiple attempts');
          this.readyReject(connectionError);
          throw connectionError;
        }
      }
    }
  }

  private async initializeTables() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Admin Users Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK (role IN ('master_admin', 'admin', 'developer')),
          access_level VARCHAR(50) NOT NULL CHECK (access_level IN ('full', 'read_write', 'read_only')),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP,
          login_count INTEGER DEFAULT 0
        )
      `);

      // Projects Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          api_key VARCHAR(255) UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES admin_users(id),
          settings JSONB DEFAULT '{}'::jsonb,
          storage_used BIGINT DEFAULT 0,
          api_calls_count BIGINT DEFAULT 0,
          last_api_call TIMESTAMP
        )
      `);

      // Project Users Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'viewer')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, admin_user_id)
        )
      `);

      // Table Schemas
      await client.query(`
        CREATE TABLE IF NOT EXISTS table_schemas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          table_name VARCHAR(255) NOT NULL,
          schema JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES admin_users(id),
          UNIQUE(project_id, table_name)
        )
      `);

      // Documents Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          table_name VARCHAR(255) NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES admin_users(id),
          updated_by UUID REFERENCES admin_users(id)
        )
      `);

      // Create index for documents
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_documents_project_table 
        ON documents(project_id, table_name)
      `);

      // Files Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS files (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          mime_type VARCHAR(255) NOT NULL,
          size BIGINT NOT NULL,
          path VARCHAR(500) NOT NULL,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES admin_users(id)
        )
      `);

      // Sessions Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          token VARCHAR(500) UNIQUE NOT NULL,
          user_id UUID REFERENCES admin_users(id),
          project_id UUID REFERENCES projects(id),
          user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('admin', 'project')),
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true
        )
      `);

      // Create index for sessions
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)
      `);

      // Changelog Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS changelog (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          user_id UUID REFERENCES admin_users(id),
          action VARCHAR(50) NOT NULL,
          resource_type VARCHAR(50) NOT NULL,
          resource_id VARCHAR(255),
          details JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create updated_at trigger function
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // Create triggers for updated_at
      const tablesWithUpdatedAt = ['admin_users', 'projects', 'table_schemas'];
      for (const table of tablesWithUpdatedAt) {
        await client.query(`
          DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
          CREATE TRIGGER update_${table}_updated_at 
          BEFORE UPDATE ON ${table} 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);
      }

      await client.query('COMMIT');
      
      // Seed default data after tables are created
      await this.seedDefaultData();
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async seedDefaultData() {
    try {
      // Check if master admin exists
      const result = await this.pool.query(
        'SELECT id FROM admin_users WHERE username = $1',
        ['admin']
      );

      if (result.rows.length === 0) {
        // Create default master admin
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await this.pool.query(
          `INSERT INTO admin_users (username, email, password, role, access_level) 
           VALUES ($1, $2, $3, $4, $5)`,
          ['admin', 'admin@krapi.com', hashedPassword, 'master_admin', 'full']
        );
        console.log('Default master admin created');
      }
    } catch (error) {
      console.error('Error seeding default data:', error);
    }
  }

  // Admin User Management
  async createAdminUser(data: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin' | 'loginCount'> & { password?: string }): Promise<AdminUser> {
    await this.ensureReady();
    const hashedPassword = data.password_hash || (data.password ? await bcrypt.hash(data.password, 10) : '');
    
    const result = await this.pool.query(
      `INSERT INTO admin_users (username, email, password, role, access_level, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [data.username, data.email, hashedPassword, data.role, data.access_level, data.active ?? true]
    );

    return this.mapAdminUser(result.rows[0]);
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      'SELECT * FROM admin_users WHERE username = $1',
      [username]
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      'SELECT * FROM admin_users WHERE email = $1',
      [email]
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async getAdminUserById(id: string): Promise<AdminUser | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      'SELECT * FROM admin_users WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    await this.ensureReady();
    const result = await this.pool.query(
      'SELECT * FROM admin_users ORDER BY created_at DESC'
    );

    return result.rows.map(row => this.mapAdminUser(row));
  }

  async updateAdminUser(id: string, data: Partial<AdminUser>): Promise<AdminUser | null> {
    await this.ensureReady();
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${paramCount++}`);
      values.push(data.role);
    }
    if (data.access_level !== undefined) {
      fields.push(`access_level = $${paramCount++}`);
      values.push(data.access_level);
    }
    if (data.active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.active);
    }
    if ('password' in data && typeof data.password === 'string') {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      fields.push(`password = $${paramCount++}`);
      values.push(hashedPassword);
    }

    if (fields.length === 0) return this.getAdminUserById(id);

    values.push(id);
    const result = await this.pool.query(
      `UPDATE admin_users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapAdminUser(result.rows[0]) : null;
  }

  async updateLoginInfo(id: string): Promise<void> {
    await this.ensureReady();
    await this.pool.query(
      `UPDATE admin_users 
       SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1 
       WHERE id = $1`,
      [id]
    );
  }

  async deleteAdminUser(id: string): Promise<boolean> {
    await this.ensureReady();
    const result = await this.pool.query(
      'DELETE FROM admin_users WHERE id = $1',
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async verifyAdminPassword(username: string, password: string): Promise<AdminUser | null> {
    await this.ensureReady();
    const user = await this.getAdminUserByUsername(username);
    if (!user || !user.active) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    await this.updateLoginInfo(user.id);
    return user;
  }

  // Project Methods
  async createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'storageUsed' | 'apiCallsCount' | 'lastApiCall'>): Promise<Project> {
    await this.ensureReady();
    const apiKey = `pk_${uuidv4().replace(/-/g, '')}`;
    
    const result = await this.pool.query(
      `INSERT INTO projects (name, description, api_key, is_active, created_by, settings) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [data.name, data.description, apiKey, data.active ?? true, data.created_by, data.settings || {}]
    );

    return this.mapProject(result.rows[0]);
  }

  async getProjectById(id: string): Promise<Project | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? this.mapProject(result.rows[0]) : null;
  }

  async getProjectByApiKey(apiKey: string): Promise<Project | null> {
    await this.ensureReady();
    const result = await this.pool.query(
      'SELECT * FROM projects WHERE api_key = $1 AND is_active = true',
      [apiKey]
    );

    return result.rows.length > 0 ? this.mapProject(result.rows[0]) : null;
  }

  async getAllProjects(): Promise<Project[]> {
    const result = await this.pool.query(
      'SELECT * FROM projects ORDER BY created_at DESC'
    );

    return result.rows.map(row => this.mapProject(row));
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.active);
    }
    if (data.settings !== undefined) {
      fields.push(`settings = $${paramCount++}`);
      values.push(data.settings);
    }

    if (fields.length === 0) return this.getProjectById(id);

    values.push(id);
    const result = await this.pool.query(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapProject(result.rows[0]) : null;
  }

  async regenerateProjectApiKey(id: string): Promise<string | null> {
    const apiKey = `pk_${uuidv4().replace(/-/g, '')}`;
    
    const result = await this.pool.query(
      'UPDATE projects SET api_key = $1 WHERE id = $2 RETURNING api_key',
      [apiKey, id]
    );

    return result.rows.length > 0 ? result.rows[0].api_key : null;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM projects WHERE id = $1',
      [id]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async updateProjectStats(projectId: string, storageChange: number = 0, apiCall: boolean = false): Promise<void> {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (storageChange !== 0) {
      updates.push(`storage_used = storage_used + $${paramCount++}`);
      values.push(storageChange);
    }

    if (apiCall) {
      updates.push(`api_calls_count = api_calls_count + 1`);
      updates.push(`last_api_call = CURRENT_TIMESTAMP`);
    }

    if (updates.length > 0) {
      values.push(projectId);
      await this.pool.query(
        `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );
    }
  }

  // Project User Methods
  async addProjectUser(projectId: string, adminUserId: string, role: string): Promise<ProjectUser> {
    const result = await this.pool.query(
      `INSERT INTO project_users (project_id, admin_user_id, role) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [projectId, adminUserId, role]
    );

    return this.mapProjectUser(result.rows[0]);
  }

  async getProjectUsers(projectId: string): Promise<ProjectUser[]> {
    const result = await this.pool.query(
      `SELECT pu.*, au.username, au.email 
       FROM project_users pu 
       JOIN admin_users au ON pu.admin_user_id = au.id 
       WHERE pu.project_id = $1 
       ORDER BY pu.created_at DESC`,
      [projectId]
    );

    return result.rows.map(row => this.mapProjectUser(row));
  }

  async getUserProjects(adminUserId: string): Promise<Project[]> {
    const result = await this.pool.query(
      `SELECT p.* 
       FROM projects p 
       JOIN project_users pu ON p.id = pu.project_id 
       WHERE pu.admin_user_id = $1 
       ORDER BY p.created_at DESC`,
      [adminUserId]
    );

    return result.rows.map(row => this.mapProject(row));
  }

  async removeProjectUser(projectId: string, adminUserId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM project_users WHERE project_id = $1 AND admin_user_id = $2',
      [projectId, adminUserId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async checkProjectAccess(projectId: string, adminUserId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT id FROM project_users WHERE project_id = $1 AND admin_user_id = $2',
      [projectId, adminUserId]
    );

    return result.rows.length > 0;
  }

  // Table Schema Methods
  async createTableSchema(projectId: string, tableName: string, schema: { description?: string; fields: TableField[]; indexes?: TableIndex[] }, createdBy: string): Promise<TableSchema> {
    const result = await this.pool.query(
      `INSERT INTO table_schemas (project_id, table_name, schema, created_by) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [projectId, tableName, schema, createdBy]
    );

    return this.mapTableSchema(result.rows[0]);
  }

  async getTableSchema(projectId: string, tableName: string): Promise<TableSchema | null> {
    const result = await this.pool.query(
      'SELECT * FROM table_schemas WHERE project_id = $1 AND table_name = $2',
      [projectId, tableName]
    );

    return result.rows.length > 0 ? this.mapTableSchema(result.rows[0]) : null;
  }

  async getProjectTableSchemas(projectId: string): Promise<TableSchema[]> {
    const result = await this.pool.query(
      'SELECT * FROM table_schemas WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );

    return result.rows.map(row => this.mapTableSchema(row));
  }

  async updateTableSchema(projectId: string, tableName: string, schema: { description?: string; fields?: TableField[]; indexes?: TableIndex[] }): Promise<TableSchema | null> {
    const result = await this.pool.query(
      `UPDATE table_schemas 
       SET schema = $1 
       WHERE project_id = $2 AND table_name = $3 
       RETURNING *`,
      [schema, projectId, tableName]
    );

    return result.rows.length > 0 ? this.mapTableSchema(result.rows[0]) : null;
  }

  async deleteTableSchema(projectId: string, tableName: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete all documents for this table
      await client.query(
        'DELETE FROM documents WHERE project_id = $1 AND table_name = $2',
        [projectId, tableName]
      );

      // Delete the schema
      const result = await client.query(
        'DELETE FROM table_schemas WHERE project_id = $1 AND table_name = $2',
        [projectId, tableName]
      );

      await client.query('COMMIT');
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Document Methods
  async createDocument(projectId: string, tableName: string, data: Record<string, unknown>, createdBy?: string): Promise<Document> {
    const result = await this.pool.query(
      `INSERT INTO documents (project_id, table_name, data, created_by, updated_by) 
       VALUES ($1, $2, $3, $4, $4) 
       RETURNING *`,
      [projectId, tableName, data, createdBy]
    );

    return this.mapDocument(result.rows[0]);
  }

  async getDocument(projectId: string, tableName: string, documentId: string): Promise<Document | null> {
    const result = await this.pool.query(
      'SELECT * FROM documents WHERE id = $1 AND project_id = $2 AND table_name = $3',
      [documentId, projectId, tableName]
    );

    return result.rows.length > 0 ? this.mapDocument(result.rows[0]) : null;
  }

  async getDocuments(
    projectId: string, 
    tableName: string, 
    options: { 
      limit?: number; 
      offset?: number; 
      orderBy?: string; 
      order?: 'asc' | 'desc';
      where?: Record<string, unknown>;
    } = {}
  ): Promise<{ documents: Document[]; total: number }> {
    const { limit = 100, offset = 0, orderBy = 'created_at', order = 'desc', where } = options;

    let whereClause = 'WHERE project_id = $1 AND table_name = $2';
    const params: unknown[] = [projectId, tableName];

    if (where && Object.keys(where).length > 0) {
      Object.entries(where).forEach(([key, value], _index) => {
        whereClause += ` AND data->>'${key}' = $${params.length + 1}`;
        params.push(value);
      });
    }

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM documents ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get documents
    const result = await this.pool.query(
      `SELECT * FROM documents ${whereClause} 
       ORDER BY ${orderBy} ${order.toUpperCase()} 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      documents: result.rows.map(row => this.mapDocument(row)),
      total
    };
  }

  async updateDocument(projectId: string, tableName: string, documentId: string, data: Record<string, unknown>, updatedBy?: string): Promise<Document | null> {
    const result = await this.pool.query(
      `UPDATE documents 
       SET data = $1, updated_by = $2 
       WHERE id = $3 AND project_id = $4 AND table_name = $5 
       RETURNING *`,
      [data, updatedBy, documentId, projectId, tableName]
    );

    return result.rows.length > 0 ? this.mapDocument(result.rows[0]) : null;
  }

  async deleteDocument(projectId: string, tableName: string, documentId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM documents WHERE id = $1 AND project_id = $2 AND table_name = $3',
      [documentId, projectId, tableName]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getDocumentsByTable(tableId: string, options?: { limit?: number; offset?: number }): Promise<{ documents: Document[]; total: number }> {
    // First get the table schema to get project_id and table_name
    const tableResult = await this.pool.query(
      'SELECT project_id, name FROM table_schemas WHERE id = $1',
      [tableId]
    );
    
    if (tableResult.rows.length === 0) {
      return { documents: [], total: 0 };
    }
    
    const { project_id, name } = tableResult.rows[0];
    return this.getDocuments(project_id, name, options);
  }

  // File Methods
  async createFile(data: Omit<FileRecord, 'id' | 'createdAt'>): Promise<FileRecord> {
    const result = await this.pool.query(
      `INSERT INTO files (project_id, filename, original_name, mime_type, size, path, metadata, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [data.project_id, data.filename, data.original_name, data.mime_type, data.size, data.path, {}, data.uploaded_by]
    );

    await this.updateProjectStats(data.project_id, data.size);
    return this.mapFile(result.rows[0]);
  }

  async getFile(fileId: string): Promise<FileRecord | null> {
    const result = await this.pool.query(
      'SELECT * FROM files WHERE id = $1',
      [fileId]
    );

    return result.rows.length > 0 ? this.mapFile(result.rows[0]) : null;
  }

  async getProjectFiles(projectId: string): Promise<FileRecord[]> {
    const result = await this.pool.query(
      'SELECT * FROM files WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );

    return result.rows.map(row => this.mapFile(row));
  }

  async deleteFile(fileId: string): Promise<FileRecord | null> {
    const result = await this.pool.query(
      'DELETE FROM files WHERE id = $1 RETURNING *',
      [fileId]
    );

    if (result.rows.length > 0) {
      const file = this.mapFile(result.rows[0]);
      await this.updateProjectStats(file.project_id, -file.size);
      return file;
    }

    return null;
  }

  // Session Methods
  async createSession(data: Omit<Session, 'id' | 'createdAt' | 'lastActivity'>): Promise<Session> {
    const result = await this.pool.query(
      `INSERT INTO sessions (token, user_id, project_id, user_type, metadata, expires_at, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [data.token, data.user_id, data.project_id, data.type, data.permissions || [], data.expires_at, !data.consumed]
    );

    return this.mapSession(result.rows[0]);
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    const result = await this.pool.query(
      'SELECT * FROM sessions WHERE token = $1 AND is_active = true AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );

    if (result.rows.length > 0) {
      // Update last activity
      await this.pool.query(
        'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
        [result.rows[0].id]
      );
      return this.mapSession(result.rows[0]);
    }

    return null;
  }

  async invalidateSession(token: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE sessions SET is_active = false WHERE token = $1',
      [token]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async consumeSession(token: string): Promise<Session | null> {
    const result = await this.pool.query(
      `UPDATE sessions 
       SET consumed = true, consumed_at = CURRENT_TIMESTAMP 
       WHERE token = $1 AND consumed = false 
       RETURNING *`,
      [token]
    );

    return result.rows.length > 0 ? this.mapSession(result.rows[0]) : null;
  }

  async updateSession(token: string, updates: { consumed?: boolean; last_activity?: boolean }): Promise<Session | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.consumed !== undefined) {
      setClauses.push(`consumed = $${paramCount++}`);
      values.push(updates.consumed);
      if (updates.consumed) {
        setClauses.push(`consumed_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updates.last_activity) {
      setClauses.push(`last_activity = CURRENT_TIMESTAMP`);
    }

    if (setClauses.length === 0) {
      // No updates requested
      return this.getSessionByToken(token);
    }

    values.push(token);
    const result = await this.pool.query(
      `UPDATE sessions 
       SET ${setClauses.join(', ')} 
       WHERE token = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapSession(result.rows[0]) : null;
  }

  async invalidateUserSessions(userId: string): Promise<void> {
    await this.pool.query(
      'UPDATE sessions SET is_active = false WHERE user_id = $1',
      [userId]
    );
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.pool.query(
      'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP OR is_active = false'
    );

    return result.rowCount ?? 0;
  }

  // Changelog Methods
  async createChangelogEntry(data: Omit<ChangelogEntry, 'id' | 'createdAt'>): Promise<ChangelogEntry> {
    const result = await this.pool.query(
      `INSERT INTO changelog (project_id, entity_type, entity_id, action, changes, performed_by, session_id, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [data.project_id, data.entity_type, data.entity_id, data.action, data.changes || {}, data.performed_by, data.session_id, data.timestamp || new Date().toISOString()]
    );

    return this.mapChangelogEntry(result.rows[0]);
  }

  async getProjectChangelog(projectId: string, limit: number = 100): Promise<ChangelogEntry[]> {
    const result = await this.pool.query(
      `SELECT c.*, au.username 
       FROM changelog c 
       LEFT JOIN admin_users au ON c.user_id = au.id 
       WHERE c.project_id = $1 
       ORDER BY c.created_at DESC 
       LIMIT $2`,
      [projectId, limit]
    );

    return result.rows.map(row => this.mapChangelogEntry(row));
  }

  async getChangelogEntries(filters: { 
    project_id?: string; 
    entity_type?: string; 
    entity_id?: string; 
    limit?: number 
  }): Promise<ChangelogEntry[]> {
    const { project_id, entity_type, entity_id, limit = 100 } = filters;
    const conditions: string[] = [];
    const values: unknown[] = [];
    
    if (project_id) {
      conditions.push(`project_id = $${values.length + 1}`);
      values.push(project_id);
    }
    
    if (entity_type) {
      conditions.push(`entity_type = $${values.length + 1}`);
      values.push(entity_type);
    }
    
    if (entity_id) {
      conditions.push(`entity_id = $${values.length + 1}`);
      values.push(entity_id);
    }
    
    values.push(limit);
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const result = await this.pool.query(
      `SELECT c.*, au.username 
       FROM changelog c 
       LEFT JOIN admin_users au ON c.performed_by = au.id 
       ${whereClause}
       ORDER BY c.created_at DESC 
       LIMIT $${values.length}`,
      values
    );

    return result.rows.map(row => this.mapChangelogEntry(row));
  }

  // Mapping functions
  private mapAdminUser(row: Record<string, unknown>): AdminUser {
    return {
      id: row.id as string,
      username: row.username as string,
      email: row.email as string,
      password_hash: row.password as string,
      role: row.role as AdminRole,
      access_level: row.access_level as AccessLevel,
      permissions: (row.permissions as AdminPermission[]) || [],
      active: row.is_active as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      last_login: row.last_login as string | undefined
    };
  }

  private mapProject(row: Record<string, unknown>): Project {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      api_key: row.api_key as string,
      active: row.is_active as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      created_by: row.created_by as string,
      settings: row.settings as ProjectSettings
    };
  }

  private mapProjectUser(row: Record<string, unknown>): ProjectUser {
    // Note: This is mapping from project_users join with admin_users
    // The project_users table links admin users to projects
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      email: row.email as string,
      name: row.username as string | undefined,
      verified: true, // Admin users are considered verified
      active: (row.is_active as boolean) || true,
      created_at: row.created_at as string,
      updated_at: row.created_at as string // Using created_at as updated_at for this join
    };
  }

  private mapTableSchema(row: Record<string, unknown>): TableSchema {
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      name: row.table_name as string,
      fields: row.schema as TableField[],
      indexes: (row.indexes as TableIndex[]) || [],
      created_at: row.created_at as string,
      updated_at: row.updated_at as string
    };
  }

  private mapDocument(row: Record<string, unknown>): Document {
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      table_id: row.table_id as string,
      data: row.data as Record<string, unknown>,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      created_by: row.created_by as string | undefined,
      updated_by: row.updated_by as string | undefined
    };
  }

  private mapFile(row: Record<string, unknown>): FileRecord {
    return {
      id: row.id as string,
      project_id: row.project_id as string,
      filename: row.filename as string,
      original_name: row.original_name as string,
      mime_type: row.mime_type as string,
      size: parseInt(row.size as string),
      path: row.path as string,
      uploaded_by: row.created_by as string,
      created_at: row.created_at as string
    };
  }

  private mapSession(row: Record<string, unknown>): Session {
    return {
      id: row.id as string,
      token: row.token as string,
      type: row.user_type as SessionType,
      user_id: row.user_id as string,
      api_key: row.api_key as string | undefined,
      project_id: row.project_id as string | undefined,
      permissions: (row.permissions as string[]) || [],
      expires_at: row.expires_at as string,
      created_at: row.created_at as string,
      consumed: (row.consumed as boolean) || false,
      consumed_at: row.consumed_at as string | undefined
    };
  }

  private mapChangelogEntry(row: Record<string, unknown>): ChangelogEntry {
    return {
      id: row.id as string,
      project_id: row.project_id as string | undefined,
      entity_type: row.entity_type as string,
      entity_id: row.entity_id as string,
      action: row.action as ChangeAction,
      changes: (row.changes as Record<string, unknown>) || {},
      performed_by: row.performed_by as string,
      session_id: row.session_id as string | undefined,
      timestamp: row.created_at as string
    };
  }

  // Close connection pool
  async close(): Promise<void> {
    await this.pool.end();
  }
}