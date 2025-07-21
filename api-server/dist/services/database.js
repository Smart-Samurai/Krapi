"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
class DatabaseService {
    // Helper function to safely parse JSON fields from database
    parseJsonFields(obj) {
        const result = { ...obj };
        if (typeof result.data === "string" && result.data) {
            try {
                result.data = JSON.parse(result.data);
            }
            catch {
                // Keep as string if parsing fails
            }
        }
        if (typeof result.schema === "string" && result.schema) {
            try {
                result.schema = JSON.parse(result.schema);
            }
            catch {
                // Keep as string if parsing fails
            }
        }
        return result;
    }
    constructor() {
        try {
            const dbPath = path_1.default.join(__dirname, "../../data/app.db");
            // Ensure data directory exists
            const dataDir = path_1.default.dirname(dbPath);
            if (!require("fs").existsSync(dataDir)) {
                require("fs").mkdirSync(dataDir, { recursive: true });
            }
            console.log(`📊 Initializing database at: ${dbPath}`);
            this.db = new better_sqlite3_1.default(dbPath, {
                verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
            });
            // Enable WAL mode for better concurrency
            this.db.pragma("journal_mode = WAL");
            this.db.pragma("foreign_keys = ON");
            this.initializeTables();
            this.seedDefaultData();
            this.seedSampleNotifications();
            console.log("✅ Database initialized successfully");
        }
        catch (error) {
            console.error("❌ Failed to initialize database:", error);
            throw error;
        }
    }
    initializeTables() {
        try {
            console.log("📊 Creating database tables...");
            // Create roles table
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        permissions TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
            // Create users table with enhanced fields
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'viewer',
        permissions TEXT DEFAULT '[]',
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
            // Create content_routes table
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS content_routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        schema TEXT,
        parent_id INTEGER,
        access_level TEXT DEFAULT 'public',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES content_routes (id) ON DELETE CASCADE
      );
    `);
            // Create enhanced content table
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        data TEXT NOT NULL,
        description TEXT,
        schema TEXT,
        route_path TEXT NOT NULL,
        parent_route_id INTEGER,
        content_type TEXT DEFAULT 'json',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_route_id) REFERENCES content_routes (id) ON DELETE CASCADE
      );
    `);
            // Create schemas table
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS content_schemas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        schema TEXT NOT NULL,
        version TEXT DEFAULT '1.0.0',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
            // Create files table
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        path TEXT NOT NULL,
        uploaded_by INTEGER NOT NULL,
        access_level TEXT DEFAULT 'public',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
            // Create email templates table
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        subject TEXT NOT NULL,
        template_html TEXT NOT NULL,
        template_text TEXT,
        variables TEXT DEFAULT '[]',
        description TEXT,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
            // Create email logs table
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER,
        recipient_email TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        sent_at DATETIME,
        opened_at DATETIME,
        clicked_at DATETIME,
        variables TEXT DEFAULT '{}',
        message_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES email_templates (id) ON DELETE SET NULL
      );
    `);
            // Create notifications table
            this.db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT 0,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);
            // Create login_logs table
            this.db.exec(`
    CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      user_agent TEXT,
      success BOOLEAN NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      location TEXT,
      failure_reason TEXT
    );
  `);
            // Create sessions table
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
            // Create email settings table
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'general',
        encrypted BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
            // Create notification preferences table
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        email_notifications BOOLEAN DEFAULT 1,
        content_updates BOOLEAN DEFAULT 1,
        user_management BOOLEAN DEFAULT 1,
        system_alerts BOOLEAN DEFAULT 1,
        marketing_emails BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id)
      );
    `);
            // Create API management tables
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        key TEXT UNIQUE NOT NULL,
        permissions TEXT NOT NULL,
        rate_limit INTEGER DEFAULT 1000,
        active BOOLEAN DEFAULT 1,
        expires_at DATETIME,
        last_used DATETIME,
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_endpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        handler TEXT NOT NULL,
        description TEXT,
        auth_required BOOLEAN DEFAULT 1,
        permissions TEXT DEFAULT '[]',
        rate_limit INTEGER DEFAULT 100,
        active BOOLEAN DEFAULT 1,
        request_count INTEGER DEFAULT 0,
        avg_response_time REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(method, path)
      );
    `);
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        requests_per_minute INTEGER NOT NULL,
        requests_per_hour INTEGER NOT NULL,
        requests_per_day INTEGER NOT NULL,
        applies_to TEXT DEFAULT 'global',
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
            this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_request_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key_id INTEGER,
        endpoint_id INTEGER,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        status_code INTEGER,
        response_time REAL,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (api_key_id) REFERENCES api_keys (id) ON DELETE SET NULL,
        FOREIGN KEY (endpoint_id) REFERENCES api_endpoints (id) ON DELETE SET NULL
      );
    `);
            // Add new columns to existing tables if they don't exist
            const addColumnIfNotExists = (table, column, type, defaultValue) => {
                try {
                    const defaultClause = defaultValue ? ` DEFAULT ${defaultValue}` : "";
                    this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${defaultClause}`);
                }
                catch {
                    // Column might already exist, which is fine
                }
            };
            // Remove the access_level column from content table since routes now control access
            try {
                this.db.exec(`
        CREATE TABLE IF NOT EXISTS content_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          data TEXT NOT NULL,
          description TEXT,
          schema TEXT,
          route_path TEXT NOT NULL,
          parent_route_id INTEGER,
          content_type TEXT DEFAULT 'json',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_route_id) REFERENCES content_routes (id) ON DELETE CASCADE
        );
      `);
                this.db.exec(`
        INSERT OR IGNORE INTO content_new (id, key, data, description, schema, route_path, parent_route_id, content_type, created_at, updated_at)
        SELECT id, key, data, description, schema, route_path, parent_route_id, content_type, created_at, updated_at
        FROM content;
      `);
                this.db.exec(`DROP TABLE IF EXISTS content;`);
                this.db.exec(`ALTER TABLE content_new RENAME TO content;`);
            }
            catch {
                // Migration might have already been applied
                console.log("Content table migration skipped");
            }
            // Add new columns to existing users table
            addColumnIfNotExists("users", "email", "TEXT");
            addColumnIfNotExists("users", "role", "TEXT", "'viewer'");
            addColumnIfNotExists("users", "permissions", "TEXT", "'[]'");
            addColumnIfNotExists("users", "active", "BOOLEAN", "1");
            // Add new columns to existing content table
            addColumnIfNotExists("content", "schema", "TEXT");
            addColumnIfNotExists("content", "route_path", "TEXT", "'/default'");
            addColumnIfNotExists("content", "parent_route_id", "INTEGER");
            addColumnIfNotExists("content", "content_type", "TEXT", "'json'");
            addColumnIfNotExists("content", "access_level", "TEXT", "'public'");
            // Add UUID columns to existing tables for better API compatibility
            addColumnIfNotExists("users", "uuid", "TEXT");
            addColumnIfNotExists("content_routes", "uuid", "TEXT");
            addColumnIfNotExists("content", "uuid", "TEXT");
            addColumnIfNotExists("content_schemas", "uuid", "TEXT");
            addColumnIfNotExists("files", "uuid", "TEXT");
            // Generate UUIDs for existing records that don't have them
            this.generateMissingUUIDs();
            // Create triggers for updated_at
            this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_content_timestamp 
      AFTER UPDATE ON content
      BEGIN
        UPDATE content SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);
            this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_content_routes_timestamp 
      AFTER UPDATE ON content_routes
      BEGIN
        UPDATE content_routes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);
            // Create indexes for better performance
            this.db.exec(`CREATE INDEX IF NOT EXISTS idx_content_route_path ON content(route_path);`);
            this.db.exec(`CREATE INDEX IF NOT EXISTS idx_content_access_level ON content(access_level);`);
            this.db.exec(`CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);`);
            this.db.exec(`CREATE INDEX IF NOT EXISTS idx_routes_parent_id ON content_routes(parent_id);`);
            console.log("✅ Database tables created successfully");
        }
        catch (error) {
            console.error("❌ Error initializing database tables:", error);
            throw error;
        }
    }
    seedDefaultData() {
        // Seed default roles
        const checkRoles = this.db
            .prepare("SELECT COUNT(*) as count FROM roles")
            .get();
        if (checkRoles.count === 0) {
            const roles = [
                {
                    name: "admin",
                    permissions: JSON.stringify([
                        "read",
                        "write",
                        "delete",
                        "manage_users",
                        "manage_files",
                        "manage_routes",
                    ]),
                    description: "Full system access",
                },
                {
                    name: "editor",
                    permissions: JSON.stringify(["read", "write", "manage_files"]),
                    description: "Content management access",
                },
                {
                    name: "viewer",
                    permissions: JSON.stringify(["read"]),
                    description: "Read-only access",
                },
            ];
            const insertRole = this.db.prepare("INSERT INTO roles (name, permissions, description) VALUES (?, ?, ?)");
            roles.forEach((role) => {
                insertRole.run(role.name, role.permissions, role.description);
            });
        }
        // Seed default user
        const checkUser = this.db
            .prepare("SELECT COUNT(*) as count FROM users")
            .get();
        if (checkUser.count === 0) {
            const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
            const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
            const bcrypt = require("bcryptjs");
            const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
            this.db
                .prepare("INSERT INTO users (username, password, role, permissions, active) VALUES (?, ?, ?, ?, ?)")
                .run(defaultUsername, hashedPassword, "admin", JSON.stringify([
                "read",
                "write",
                "delete",
                "manage_users",
                "manage_files",
                "manage_routes",
            ]), 1);
            console.log(`Default admin user created: ${defaultUsername}/${defaultPassword}`);
        }
        // Seed default route
        const checkRoutes = this.db
            .prepare("SELECT COUNT(*) as count FROM content_routes")
            .get();
        if (checkRoutes.count === 0) {
            this.db
                .prepare("INSERT INTO content_routes (path, name, description, access_level) VALUES (?, ?, ?, ?)")
                .run("default", "Default Route", "Default content route", "public");
        }
        // Seed default email templates
        this.seedDefaultEmailTemplates();
    }
    seedDefaultEmailTemplates() {
        const checkTemplates = this.db
            .prepare("SELECT COUNT(*) as count FROM email_templates")
            .get();
        if (checkTemplates.count === 0) {
            const templates = [
                {
                    name: "user-created-notification",
                    subject: "New User Created - {{user.username}}",
                    template_html: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #2563eb;">New User Created</h2>
                  <p>A new user has been created in the CMS system:</p>
                  
                  <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Username:</strong> {{user.username}}</p>
                    <p><strong>Email:</strong> {{user.email}}</p>
                    <p><strong>Role:</strong> {{user.role}}</p>
                    <p><strong>Created:</strong> {{user.created_at}}</p>
                  </div>
                  
                  <p>This is an automated notification from your Krapi CMS system.</p>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                    <p>Krapi CMS - Content Management System</p>
                  </div>
                </div>
              </body>
            </html>
          `,
                    template_text: `
New User Created

A new user has been created in the CMS system:

Username: {{user.username}}
Email: {{user.email}}
Role: {{user.role}}
Created: {{user.created_at}}

This is an automated notification from your Krapi CMS system.

Krapi CMS - Content Management System
          `,
                    variables: '["user.username", "user.email", "user.role", "user.created_at"]',
                    description: "Notification sent when a new user is created",
                    active: 1,
                },
                {
                    name: "content-updated-notification",
                    subject: "Content Updated - {{content.key}}",
                    template_html: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #059669;">Content Updated</h2>
                  <p>Content has been updated in the CMS:</p>
                  
                  <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Content Key:</strong> {{content.key}}</p>
                    <p><strong>Route:</strong> {{content.route_path}}</p>
                    <p><strong>Type:</strong> {{content.content_type}}</p>
                    <p><strong>Updated By:</strong> {{updatedBy.username}}</p>
                    <p><strong>Updated At:</strong> {{content.updated_at}}</p>
                  </div>
                  
                  {{#if content.description}}
                  <p><strong>Description:</strong> {{content.description}}</p>
                  {{/if}}
                  
                  <p>This is an automated notification from your Krapi CMS system.</p>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                    <p>Krapi CMS - Content Management System</p>
                  </div>
                </div>
              </body>
            </html>
          `,
                    template_text: `
Content Updated

Content has been updated in the CMS:

Content Key: {{content.key}}
Route: {{content.route_path}}
Type: {{content.content_type}}
Updated By: {{updatedBy.username}}
Updated At: {{content.updated_at}}

{{#if content.description}}
Description: {{content.description}}
{{/if}}

This is an automated notification from your Krapi CMS system.

Krapi CMS - Content Management System
          `,
                    variables: '["content.key", "content.route_path", "content.content_type", "content.updated_at", "content.description", "updatedBy.username"]',
                    description: "Notification sent when content is updated",
                    active: 1,
                },
                {
                    name: "system-alert-notification",
                    subject: "System Alert - {{alert.type}}",
                    template_html: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #dc2626;">System Alert</h2>
                  <p>A system alert has been triggered:</p>
                  
                  <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                    <p><strong>Alert Type:</strong> {{alert.type}}</p>
                    <p><strong>Message:</strong> {{alert.message}}</p>
                    <p><strong>Severity:</strong> {{alert.severity}}</p>
                    <p><strong>Time:</strong> {{alert.timestamp}}</p>
                  </div>
                  
                  {{#if alert.details}}
                  <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Details:</strong></p>
                    <pre style="white-space: pre-wrap; font-size: 12px;">{{alert.details}}</pre>
                  </div>
                  {{/if}}
                  
                  <p>Please investigate this alert promptly.</p>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                    <p>Krapi CMS - Content Management System</p>
                  </div>
                </div>
              </body>
            </html>
          `,
                    template_text: `
System Alert

A system alert has been triggered:

Alert Type: {{alert.type}}
Message: {{alert.message}}
Severity: {{alert.severity}}
Time: {{alert.timestamp}}

{{#if alert.details}}
Details:
{{alert.details}}
{{/if}}

Please investigate this alert promptly.

Krapi CMS - Content Management System
          `,
                    variables: '["alert.type", "alert.message", "alert.severity", "alert.timestamp", "alert.details"]',
                    description: "Notification sent for system alerts",
                    active: 1,
                },
                {
                    name: "welcome-email",
                    subject: "Welcome to {{siteName}} CMS",
                    template_html: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #2563eb; text-align: center;">Welcome to {{siteName}}!</h1>
                  
                  <p>Hello {{user.username}},</p>
                  
                  <p>Welcome to the {{siteName}} Content Management System. Your account has been successfully created.</p>
                  
                  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Your Account Details:</h3>
                    <p><strong>Username:</strong> {{user.username}}</p>
                    <p><strong>Email:</strong> {{user.email}}</p>
                    <p><strong>Role:</strong> {{user.role}}</p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="{{loginUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Access CMS Dashboard
                    </a>
                  </div>
                  
                  <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                  
                  <p>Best regards,<br>The {{siteName}} Team</p>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                    <p>This email was sent from {{siteName}} CMS. If you didn't expect this email, please contact our support team.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
                    template_text: `
Welcome to {{siteName}}!

Hello {{user.username}},

Welcome to the {{siteName}} Content Management System. Your account has been successfully created.

Your Account Details:
Username: {{user.username}}
Email: {{user.email}}
Role: {{user.role}}

You can access the CMS dashboard at: {{loginUrl}}

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The {{siteName}} Team

This email was sent from {{siteName}} CMS. If you didn't expect this email, please contact our support team.
          `,
                    variables: '["siteName", "user.username", "user.email", "user.role", "loginUrl"]',
                    description: "Welcome email for new users",
                    active: 1,
                },
            ];
            const insertTemplate = this.db.prepare("INSERT INTO email_templates (name, subject, template_html, template_text, variables, description, active) VALUES (?, ?, ?, ?, ?, ?, ?)");
            templates.forEach((template) => {
                insertTemplate.run(template.name, template.subject, template.template_html, template.template_text || null, JSON.stringify(template.variables || []), template.description || null, template.active ? 1 : 0);
            });
            console.log("Default email templates created");
        }
    }
    // Content operations
    getAllContent(routePath, contentType) {
        let query = "SELECT c.*, cr.name as route_name FROM content c LEFT JOIN content_routes cr ON c.parent_route_id = cr.id";
        const params = [];
        const conditions = [];
        if (routePath) {
            conditions.push("c.route_path = ?");
            params.push(routePath);
        }
        if (contentType) {
            conditions.push("c.content_type = ?");
            params.push(contentType);
        }
        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }
        query += " ORDER BY c.created_at DESC";
        const results = this.db.prepare(query).all(...params);
        return results.map((item) => {
            const parsed = { ...item };
            if (item.data) {
                parsed.data = JSON.parse(item.data);
            }
            if (item.schema) {
                parsed.schema = JSON.parse(item.schema);
            }
            return parsed;
        });
    }
    getContentByKey(key) {
        const result = this.db
            .prepare("SELECT c.*, cr.name as route_name FROM content c LEFT JOIN content_routes cr ON c.parent_route_id = cr.id WHERE c.key = ?")
            .get(key);
        if (!result)
            return null;
        if (result.data && typeof result.data === "string") {
            result.data = JSON.parse(result.data);
        }
        if (result.schema && typeof result.schema === "string") {
            result.schema = JSON.parse(result.schema);
        }
        return result;
    }
    getContentByKeyAndRoute(key, routePath) {
        // Try to find content with the exact route path first
        let result = this.db
            .prepare(`SELECT c.*, cr.name as route_name 
         FROM content c 
         LEFT JOIN content_routes cr ON c.parent_route_id = cr.id 
         WHERE c.key = ? AND c.route_path = ?`)
            .get(key, routePath);
        // If not found and routePath doesn't start with '/', try with '/' prefix
        if (!result && !routePath.startsWith("/")) {
            result = this.db
                .prepare(`SELECT c.*, cr.name as route_name 
           FROM content c 
           LEFT JOIN content_routes cr ON c.parent_route_id = cr.id 
           WHERE c.key = ? AND c.route_path = ?`)
                .get(key, "/" + routePath);
        }
        // If not found and routePath starts with '/', try without '/' prefix
        if (!result && routePath.startsWith("/")) {
            result = this.db
                .prepare(`SELECT c.*, cr.name as route_name 
           FROM content c 
           LEFT JOIN content_routes cr ON c.parent_route_id = cr.id 
           WHERE c.key = ? AND c.route_path = ?`)
                .get(key, routePath.substring(1));
        }
        if (result && result.data && typeof result.data === "string") {
            result.data = JSON.parse(result.data);
        }
        if (result && result.schema && typeof result.schema === "string") {
            result.schema = JSON.parse(result.schema);
        }
        return result;
    }
    createContent(item) {
        const routeExists = this.getRouteByPath(item.route_path);
        if (!routeExists) {
            throw new Error(`Route ${item.route_path} does not exist`);
        }
        const uuid = (0, crypto_1.randomUUID)();
        const stmt = this.db.prepare("INSERT INTO content (uuid, key, data, description, schema, route_path, parent_route_id, content_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        const result = stmt.run(uuid, item.key, JSON.stringify(item.data), item.description || null, item.schema ? JSON.stringify(item.schema) : null, item.route_path, routeExists.id, item.content_type);
        return this.getContentById(result.lastInsertRowid);
    }
    updateContent(key, updates) {
        const current = this.getContentByKey(key);
        if (!current)
            return null;
        const fields = [];
        const params = [];
        if (updates.data !== undefined) {
            fields.push("data = ?");
            params.push(JSON.stringify(updates.data));
        }
        if (updates.description !== undefined) {
            fields.push("description = ?");
            params.push(updates.description);
        }
        if (updates.schema !== undefined) {
            fields.push("schema = ?");
            params.push(updates.schema ? JSON.stringify(updates.schema) : null);
        }
        if (updates.content_type !== undefined) {
            fields.push("content_type = ?");
            params.push(updates.content_type);
        }
        if (fields.length === 0)
            return current;
        fields.push("updated_at = CURRENT_TIMESTAMP");
        params.push(key);
        const stmt = this.db.prepare(`UPDATE content SET ${fields.join(", ")} WHERE key = ?`);
        const result = stmt.run(...params);
        if (result.changes > 0) {
            return this.getContentByKey(key);
        }
        return null;
    }
    updateContentById(id, updates) {
        const current = this.getContentById(id);
        if (!current)
            return null;
        const fields = [];
        const params = [];
        if (updates.data !== undefined) {
            fields.push("data = ?");
            params.push(JSON.stringify(updates.data));
        }
        if (updates.description !== undefined) {
            fields.push("description = ?");
            params.push(updates.description);
        }
        if (updates.schema !== undefined) {
            fields.push("schema = ?");
            params.push(updates.schema ? JSON.stringify(updates.schema) : null);
        }
        if (updates.content_type !== undefined) {
            fields.push("content_type = ?");
            params.push(updates.content_type);
        }
        if (fields.length === 0)
            return current;
        fields.push("updated_at = CURRENT_TIMESTAMP");
        params.push(id);
        const stmt = this.db.prepare(`UPDATE content SET ${fields.join(", ")} WHERE id = ?`);
        const result = stmt.run(...params);
        if (result.changes > 0) {
            return this.getContentById(id);
        }
        return null;
    }
    deleteContent(key) {
        const stmt = this.db.prepare("DELETE FROM content WHERE key = ?");
        const result = stmt.run(key);
        return result.changes > 0;
    }
    deleteContentById(id) {
        const stmt = this.db.prepare("DELETE FROM content WHERE id = ?");
        const result = stmt.run(id);
        return result.changes > 0;
    }
    getContentById(id) {
        const result = this.db
            .prepare("SELECT c.*, cr.name as route_name FROM content c LEFT JOIN content_routes cr ON c.parent_route_id = cr.id WHERE c.id = ?")
            .get(id);
        if (result && result.data && typeof result.data === "string") {
            result.data = JSON.parse(result.data);
        }
        if (result && result.schema && typeof result.schema === "string") {
            result.schema = JSON.parse(result.schema);
        }
        return result;
    }
    // Content Routes operations
    getAllRoutes() {
        const routes = this.db
            .prepare("SELECT * FROM content_routes ORDER BY created_at DESC")
            .all();
        return routes.map((route) => {
            if (route.schema && typeof route.schema === "string") {
                route.schema = JSON.parse(route.schema);
            }
            return route;
        });
    }
    getRouteByPath(path) {
        const result = this.db
            .prepare("SELECT * FROM content_routes WHERE path = ?")
            .get(path);
        if (result && result.schema && typeof result.schema === "string") {
            result.schema = JSON.parse(result.schema);
        }
        return result;
    }
    getRouteById(id) {
        const result = this.db
            .prepare("SELECT * FROM content_routes WHERE id = ?")
            .get(id);
        if (result && result.schema && typeof result.schema === "string") {
            result.schema = JSON.parse(result.schema);
        }
        return result;
    }
    createRoute(route) {
        const uuid = (0, crypto_1.randomUUID)();
        const stmt = this.db.prepare("INSERT INTO content_routes (uuid, path, name, description, schema, parent_id, access_level) VALUES (?, ?, ?, ?, ?, ?, ?)");
        const result = stmt.run(uuid, route.path, route.name, route.description || null, route.schema ? JSON.stringify(route.schema) : null, route.parent_id || null, route.access_level || "public");
        return this.getRouteById(result.lastInsertRowid);
    }
    updateRoute(path, updates) {
        const current = this.getRouteByPath(path);
        if (!current)
            return null;
        const fields = [];
        const params = [];
        if (updates.name !== undefined) {
            fields.push("name = ?");
            params.push(updates.name);
        }
        if (updates.description !== undefined) {
            fields.push("description = ?");
            params.push(updates.description);
        }
        if (updates.schema !== undefined) {
            fields.push("schema = ?");
            params.push(updates.schema ? JSON.stringify(updates.schema) : null);
        }
        if (updates.access_level !== undefined) {
            fields.push("access_level = ?");
            params.push(updates.access_level);
        }
        if (fields.length === 0)
            return current;
        fields.push("updated_at = CURRENT_TIMESTAMP");
        params.push(path);
        const stmt = this.db.prepare(`UPDATE content_routes SET ${fields.join(", ")} WHERE path = ?`);
        const result = stmt.run(...params);
        if (result.changes > 0) {
            return this.getRouteByPath(path);
        }
        return null;
    }
    deleteRoute(path) {
        const stmt = this.db.prepare("DELETE FROM content_routes WHERE path = ?");
        const result = stmt.run(path);
        return result.changes > 0;
    }
    getNestedRoutes(parentId) {
        const query = parentId
            ? "SELECT * FROM content_routes WHERE parent_id = ? ORDER BY created_at DESC"
            : "SELECT * FROM content_routes WHERE parent_id IS NULL ORDER BY created_at DESC";
        const routes = this.db.prepare(query).all(parentId);
        return routes.map((route) => {
            if (route.schema && typeof route.schema === "string") {
                route.schema = JSON.parse(route.schema);
            }
            return route;
        });
    }
    // User operations
    getUserByUsername(username) {
        const result = this.db
            .prepare("SELECT * FROM users WHERE username = ?")
            .get(username);
        if (result &&
            result.permissions &&
            typeof result.permissions === "string") {
            result.permissions = JSON.parse(result.permissions);
        }
        return result;
    }
    getUserById(id) {
        const result = this.db
            .prepare("SELECT * FROM users WHERE id = ?")
            .get(id);
        if (result &&
            result.permissions &&
            typeof result.permissions === "string") {
            result.permissions = JSON.parse(result.permissions);
        }
        return result;
    }
    getAllUsers() {
        const users = this.db
            .prepare("SELECT * FROM users ORDER BY created_at DESC")
            .all();
        return users.map((user) => {
            if (user.permissions && typeof user.permissions === "string") {
                user.permissions = JSON.parse(user.permissions);
            }
            return user;
        });
    }
    createUser(userData) {
        try {
            const stmt = this.db.prepare("INSERT INTO users (username, password, email, role, permissions, active) VALUES (?, ?, ?, ?, ?, ?)");
            const result = stmt.run(userData.username, userData.password, userData.email || null, userData.role, JSON.stringify(userData.permissions), userData.active ? 1 : 0);
            return this.getUserById(result.lastInsertRowid);
        }
        catch {
            // User already exists or other error
            return null;
        }
    }
    updateUser(id, updates) {
        const current = this.getUserById(id);
        if (!current)
            return null;
        const fields = [];
        const params = [];
        if (updates.username !== undefined) {
            fields.push("username = ?");
            params.push(updates.username);
        }
        if (updates.password !== undefined) {
            fields.push("password = ?");
            params.push(updates.password);
        }
        if (updates.email !== undefined) {
            fields.push("email = ?");
            params.push(updates.email);
        }
        if (updates.role !== undefined) {
            fields.push("role = ?");
            params.push(updates.role);
        }
        if (updates.permissions !== undefined) {
            fields.push("permissions = ?");
            params.push(JSON.stringify(updates.permissions));
        }
        if (updates.active !== undefined) {
            fields.push("active = ?");
            params.push(updates.active ? 1 : 0);
        }
        if (fields.length === 0)
            return current;
        params.push(id);
        const stmt = this.db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`);
        const result = stmt.run(...params);
        if (result.changes > 0) {
            return this.getUserById(id);
        }
        return null;
    }
    deleteUser(id) {
        const stmt = this.db.prepare("DELETE FROM users WHERE id = ?");
        const result = stmt.run(id);
        return result.changes > 0;
    }
    updateUserPassword(userId, hashedPassword) {
        const stmt = this.db.prepare("UPDATE users SET password = ? WHERE id = ?");
        const result = stmt.run(hashedPassword, userId);
        return result.changes > 0;
    }
    // File operations
    getAllFiles(uploadedBy, accessLevel) {
        let query = "SELECT * FROM files";
        const params = [];
        const conditions = [];
        if (uploadedBy) {
            conditions.push("uploaded_by = ?");
            params.push(uploadedBy);
        }
        if (accessLevel) {
            conditions.push("access_level = ?");
            params.push(accessLevel);
        }
        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }
        query += " ORDER BY created_at DESC";
        return this.db.prepare(query).all(...params);
    }
    getFileById(id) {
        return this.db
            .prepare("SELECT * FROM files WHERE id = ?")
            .get(id);
    }
    getFileByFilename(filename) {
        return this.db
            .prepare("SELECT * FROM files WHERE filename = ?")
            .get(filename);
    }
    createFile(fileData) {
        const stmt = this.db.prepare("INSERT INTO files (filename, original_name, mime_type, size, path, uploaded_by, access_level) VALUES (?, ?, ?, ?, ?, ?, ?)");
        const result = stmt.run(fileData.filename, fileData.original_name, fileData.mime_type, fileData.size, fileData.path, fileData.uploaded_by, fileData.access_level || "public");
        return this.getFileById(result.lastInsertRowid);
    }
    deleteFile(id) {
        const stmt = this.db.prepare("DELETE FROM files WHERE id = ?");
        const result = stmt.run(id);
        return result.changes > 0;
    }
    // Role operations
    getAllRoles() {
        const roles = this.db
            .prepare("SELECT * FROM roles ORDER BY created_at DESC")
            .all();
        return roles.map((role) => {
            if (role.permissions && typeof role.permissions === "string") {
                role.permissions = JSON.parse(role.permissions);
            }
            return role;
        });
    }
    getRoleByName(name) {
        const result = this.db
            .prepare("SELECT * FROM roles WHERE name = ?")
            .get(name);
        if (result &&
            result.permissions &&
            typeof result.permissions === "string") {
            result.permissions = JSON.parse(result.permissions);
        }
        return result;
    }
    // Schema Management Methods
    getAllSchemas() {
        const results = this.db
            .prepare("SELECT * FROM content_schemas ORDER BY created_at DESC")
            .all();
        return results.map((schema) => {
            if (typeof schema.schema === "string") {
                schema.schema = JSON.parse(schema.schema);
            }
            return schema;
        });
    }
    getSchemaById(id) {
        const result = this.db
            .prepare("SELECT * FROM content_schemas WHERE id = ?")
            .get(id);
        if (result && result.schema && typeof result.schema === "string") {
            result.schema = JSON.parse(result.schema);
        }
        return result;
    }
    getSchemaByName(name) {
        const result = this.db
            .prepare("SELECT * FROM content_schemas WHERE name = ?")
            .get(name);
        if (result && result.schema && typeof result.schema === "string") {
            result.schema = JSON.parse(result.schema);
        }
        return result;
    }
    createSchema(schema) {
        const uuid = (0, crypto_1.randomUUID)();
        const stmt = this.db.prepare("INSERT INTO content_schemas (uuid, name, description, schema, version) VALUES (?, ?, ?, ?, ?)");
        const result = stmt.run(uuid, schema.name, schema.description || null, JSON.stringify(schema.schema), schema.version || "1.0.0");
        return this.getSchemaById(result.lastInsertRowid);
    }
    updateSchema(id, updates) {
        const current = this.getSchemaById(id);
        if (!current)
            return null;
        const fields = [];
        const params = [];
        if (updates.name !== undefined) {
            fields.push("name = ?");
            params.push(updates.name);
        }
        if (updates.description !== undefined) {
            fields.push("description = ?");
            params.push(updates.description);
        }
        if (updates.schema !== undefined) {
            fields.push("schema = ?");
            params.push(JSON.stringify(updates.schema));
        }
        if (updates.version !== undefined) {
            fields.push("version = ?");
            params.push(updates.version);
        }
        if (fields.length === 0)
            return current;
        fields.push("updated_at = CURRENT_TIMESTAMP");
        params.push(id);
        const stmt = this.db.prepare(`UPDATE content_schemas SET ${fields.join(", ")} WHERE id = ?`);
        stmt.run(...params);
        return this.getSchemaById(id);
    }
    deleteSchema(id) {
        const stmt = this.db.prepare("DELETE FROM content_schemas WHERE id = ?");
        const result = stmt.run(id);
        return result.changes > 0;
    }
    isSchemaInUse(schemaId) {
        const result = this.db
            .prepare("SELECT COUNT(*) as count FROM content WHERE schema LIKE ? OR schema = ?")
            .get(`%"schema_id":${schemaId}%`, `{"schema_id":${schemaId}}`);
        return result.count > 0;
    }
    generateMissingUUIDs() {
        const tables = [
            "users",
            "content_routes",
            "content",
            "content_schemas",
            "files",
        ];
        tables.forEach((table) => {
            try {
                // Get records without UUIDs
                const records = this.db
                    .prepare(`SELECT id FROM ${table} WHERE uuid IS NULL OR uuid = ''`)
                    .all();
                if (records.length > 0) {
                    const updateStmt = this.db.prepare(`UPDATE ${table} SET uuid = ? WHERE id = ?`);
                    records.forEach((record) => {
                        const uuid = (0, crypto_1.randomUUID)();
                        updateStmt.run(uuid, record.id);
                    });
                    console.log(`Generated ${records.length} UUIDs for ${table} table`);
                }
            }
            catch (error) {
                console.log(`Error generating UUIDs for ${table}:`, error);
            }
        });
    }
    close() {
        this.db.close();
    }
    /**
     * Get all tables in the database with their row counts and detailed column info
     */
    getAllTables() {
        try {
            // Get all table names
            const tables = this.db
                .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
                .all()
                .map((row) => row.name);
            // Get row count and detailed columns for each table
            return tables.map((tableName) => {
                const countResult = this.db
                    .prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
                    .get();
                const rowCount = countResult.count;
                const columnsInfo = this.db
                    .prepare(`PRAGMA table_info(${tableName})`)
                    .all();
                const columns = columnsInfo.map((col) => ({
                    name: col.name,
                    type: col.type,
                    nullable: col.notnull === 0,
                    defaultValue: col.dflt_value || undefined,
                    primaryKey: col.pk === 1,
                }));
                return {
                    name: tableName,
                    rowCount,
                    columns,
                };
            });
        }
        catch (error) {
            console.error("Error getting tables:", error);
            return [];
        }
    }
    /**
     * Check if a table name is valid (to prevent SQL injection)
     */
    isValidTableName(tableName) {
        // Check if the table exists in the database
        const tableExists = this.db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
            .get(tableName);
        return !!tableExists;
    }
    /**
     * Get data from a specific table
     */
    getTableData(tableName, limit = 100) {
        // Get column information
        const columnsInfo = this.db
            .prepare(`PRAGMA table_info(${tableName})`)
            .all();
        const columns = columnsInfo.map((col) => col.name);
        // Get rows
        const rows = this.db
            .prepare(`SELECT * FROM ${tableName} LIMIT ${limit}`)
            .all();
        return { columns, rows };
    }
    /**
     * Execute a custom SQL query
     */
    executeQuery(query) {
        try {
            // Execute the query
            const stmt = this.db.prepare(query);
            const rows = stmt.all();
            // If no rows, return empty result
            if (!rows || rows.length === 0) {
                return { columns: [], rows: [] };
            }
            // Extract column names from the first row
            const firstRow = rows[0];
            const columns = Object.keys(firstRow);
            return { columns, rows };
        }
        catch (error) {
            throw new Error(`SQL Error: ${error.message}`);
        }
    }
    /**
     * Export the entire database as a JSON object
     */
    exportDatabase() {
        try {
            const tables = this.getAllTables();
            const result = {};
            // Export each table
            for (const table of tables) {
                const data = this.db.prepare(`SELECT * FROM ${table.name}`).all();
                result[table.name] = data;
            }
            return result;
        }
        catch (error) {
            console.error("Error exporting database:", error);
            throw error;
        }
    }
    /**
     * Reinitialize the database after reset
     */
    reinitialize() {
        try {
            // Close and reopen the database
            const dbPath = this.db.name;
            this.db.close();
            // Reopen the database
            this.db = new better_sqlite3_1.default(dbPath);
            // Reinitialize tables and seed data
            this.initializeTables();
            this.seedDefaultData();
            console.log("Database reinitialized successfully");
        }
        catch (error) {
            console.error("Error reinitializing database:", error);
            throw error;
        }
    }
    // Email settings management
    getEmailSettings() {
        const result = this.db
            .prepare("SELECT key, value, description, category, encrypted FROM email_settings")
            .all();
        return result;
    }
    setEmailSetting(key, value, description, category = "general", encrypted = false) {
        const stmt = this.db.prepare("INSERT OR REPLACE INTO email_settings (key, value, description, category, encrypted, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)");
        stmt.run(key, value, description || null, category, encrypted ? 1 : 0);
    }
    getEmailSetting(key) {
        const result = this.db
            .prepare("SELECT value FROM email_settings WHERE key = ?")
            .get(key);
        return result?.value || null;
    }
    // Email template management
    getAllEmailTemplates() {
        const results = this.db
            .prepare("SELECT * FROM email_templates ORDER BY created_at DESC")
            .all();
        return results.map((template) => ({
            ...template,
            variables: JSON.parse(template.variables || "[]"),
            active: Boolean(template.active),
        }));
    }
    getEmailTemplateById(id) {
        const result = this.db
            .prepare("SELECT * FROM email_templates WHERE id = ?")
            .get(id);
        if (!result)
            return null;
        return {
            ...result,
            variables: JSON.parse(result.variables || "[]"),
            active: Boolean(result.active),
        };
    }
    getEmailTemplateByName(name) {
        const result = this.db
            .prepare("SELECT * FROM email_templates WHERE name = ?")
            .get(name);
        if (!result)
            return null;
        return {
            ...result,
            variables: JSON.parse(result.variables || "[]"),
            active: Boolean(result.active),
        };
    }
    createEmailTemplate(template) {
        const stmt = this.db.prepare("INSERT INTO email_templates (name, subject, template_html, template_text, variables, description, active) VALUES (?, ?, ?, ?, ?, ?, ?)");
        const result = stmt.run(template.name, template.subject, template.template_html, template.template_text || null, JSON.stringify(template.variables || []), template.description || null, template.active ? 1 : 0);
        return this.getEmailTemplateById(result.lastInsertRowid);
    }
    updateEmailTemplate(id, updates) {
        const current = this.getEmailTemplateById(id);
        if (!current)
            return null;
        const fields = [];
        const params = [];
        if (updates.name !== undefined) {
            fields.push("name = ?");
            params.push(updates.name);
        }
        if (updates.subject !== undefined) {
            fields.push("subject = ?");
            params.push(updates.subject);
        }
        if (updates.template_html !== undefined) {
            fields.push("template_html = ?");
            params.push(updates.template_html);
        }
        if (updates.template_text !== undefined) {
            fields.push("template_text = ?");
            params.push(updates.template_text);
        }
        if (updates.variables !== undefined) {
            fields.push("variables = ?");
            params.push(JSON.stringify(updates.variables));
        }
        if (updates.description !== undefined) {
            fields.push("description = ?");
            params.push(updates.description);
        }
        if (updates.active !== undefined) {
            fields.push("active = ?");
            params.push(updates.active ? 1 : 0);
        }
        if (fields.length === 0)
            return current;
        fields.push("updated_at = CURRENT_TIMESTAMP");
        params.push(id);
        const stmt = this.db.prepare(`UPDATE email_templates SET ${fields.join(", ")} WHERE id = ?`);
        stmt.run(...params);
        return this.getEmailTemplateById(id);
    }
    deleteEmailTemplate(id) {
        const stmt = this.db.prepare("DELETE FROM email_templates WHERE id = ?");
        const result = stmt.run(id);
        return result.changes > 0;
    }
    // Email log management
    createEmailLog(log) {
        const stmt = this.db.prepare("INSERT INTO email_logs (template_id, recipient_email, sender_email, subject, status, error_message, sent_at, opened_at, clicked_at, variables, message_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        const result = stmt.run(log.template_id || null, log.recipient_email, log.sender_email, log.subject, log.status, log.error_message || null, log.sent_at || null, log.opened_at || null, log.clicked_at || null, JSON.stringify(log.variables || {}), log.message_id || null);
        return this.getEmailLogById(result.lastInsertRowid);
    }
    getEmailLogById(id) {
        const result = this.db
            .prepare("SELECT * FROM email_logs WHERE id = ?")
            .get(id);
        if (!result)
            return null;
        return {
            ...result,
            variables: JSON.parse(result.variables || "{}"),
        };
    }
    getEmailLogs(page = 1, limit = 50, status) {
        const offset = (page - 1) * limit;
        let query = "SELECT * FROM email_logs";
        let countQuery = "SELECT COUNT(*) as total FROM email_logs";
        const queryParams = [];
        const countParams = [];
        if (status) {
            query += " WHERE status = ?";
            countQuery += " WHERE status = ?";
            queryParams.push(status);
            countParams.push(status);
        }
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        queryParams.push(limit, offset);
        const logs = this.db.prepare(query).all(...queryParams);
        const countResult = this.db.prepare(countQuery).get(...countParams);
        return {
            logs: logs.map((log) => ({
                ...log,
                variables: JSON.parse(log.variables || "{}"),
            })),
            total: countResult.total,
            page,
            limit,
        };
    }
    getEmailStats(startDate, endDate) {
        let query = "SELECT status, COUNT(*) as count FROM email_logs";
        const params = [];
        if (startDate || endDate) {
            query += " WHERE";
            const conditions = [];
            if (startDate) {
                conditions.push(" created_at >= ?");
                params.push(startDate);
            }
            if (endDate) {
                conditions.push(" created_at <= ?");
                params.push(endDate);
            }
            query += conditions.join(" AND");
        }
        query += " GROUP BY status";
        const results = this.db.prepare(query).all(...params);
        const stats = {
            total: 0,
            sent: 0,
            failed: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
        };
        results.forEach((result) => {
            stats.total += result.count;
            switch (result.status) {
                case "sent":
                case "delivered":
                    stats.sent += result.count;
                    break;
                case "failed":
                    stats.failed += result.count;
                    break;
                case "opened":
                    stats.opened += result.count;
                    break;
                case "clicked":
                    stats.clicked += result.count;
                    break;
                case "bounced":
                    stats.bounced += result.count;
                    break;
            }
        });
        return stats;
    }
    // Notification preferences
    getNotificationPreferences(userId) {
        const result = this.db
            .prepare("SELECT * FROM notification_preferences WHERE user_id = ?")
            .get(userId);
        return result || null;
    }
    setNotificationPreferences(preferences) {
        const stmt = this.db.prepare("INSERT OR REPLACE INTO notification_preferences (user_id, email_notifications, content_updates, user_management, system_alerts, marketing_emails, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)");
        stmt.run(preferences.user_id, preferences.email_notifications ? 1 : 0, preferences.content_updates ? 1 : 0, preferences.user_management ? 1 : 0, preferences.system_alerts ? 1 : 0, preferences.marketing_emails ? 1 : 0);
        return this.getNotificationPreferences(preferences.user_id);
    }
    getUsersWithNotificationPreference(type) {
        const column = type === "user_created"
            ? "user_management"
            : type === "content_updated"
                ? "content_updates"
                : "system_alerts";
        const users = this.db
            .prepare(`
        SELECT u.* FROM users u
        LEFT JOIN notification_preferences np ON u.id = np.user_id
        WHERE u.email IS NOT NULL AND u.email != '' AND u.active = 1
        AND (np.${column} = 1 OR np.${column} IS NULL)
        AND (np.email_notifications = 1 OR np.email_notifications IS NULL)
      `)
            .all();
        return users.map((user) => ({
            ...user,
            permissions: JSON.parse(user.permissions || "[]"),
        }));
    }
    // API Management Methods
    getApiKeys() {
        const results = this.db
            .prepare("SELECT * FROM api_keys ORDER BY created_at DESC")
            .all();
        return results.map((key) => ({
            ...key,
            permissions: JSON.parse(key.permissions || "[]"),
            active: Boolean(key.active),
        }));
    }
    getApiKeyById(id) {
        const result = this.db
            .prepare("SELECT * FROM api_keys WHERE id = ?")
            .get(id);
        if (!result)
            return null;
        return {
            ...result,
            permissions: JSON.parse(result.permissions || "[]"),
            active: Boolean(result.active),
        };
    }
    createApiKey(apiKey) {
        const uuid = (0, crypto_1.randomUUID)();
        const stmt = this.db.prepare("INSERT INTO api_keys (uuid, name, key, permissions, rate_limit, active, expires_at, usage_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        const result = stmt.run(uuid, apiKey.name, `krapi_${require("crypto").randomBytes(32).toString("hex")}`, JSON.stringify(apiKey.permissions), apiKey.rate_limit || 1000, apiKey.active ? 1 : 0, apiKey.expires_at || null, 0);
        const created = this.db
            .prepare("SELECT * FROM api_keys WHERE id = ?")
            .get(result.lastInsertRowid);
        return {
            ...created,
            permissions: JSON.parse(created.permissions || "[]"),
            active: Boolean(created.active),
        };
    }
    updateApiKey(id, updates) {
        const fields = [];
        const params = [];
        if (updates.name !== undefined) {
            fields.push("name = ?");
            params.push(updates.name);
        }
        if (updates.permissions !== undefined) {
            fields.push("permissions = ?");
            params.push(JSON.stringify(updates.permissions));
        }
        if (updates.rate_limit !== undefined) {
            fields.push("rate_limit = ?");
            params.push(updates.rate_limit);
        }
        if (updates.active !== undefined) {
            fields.push("active = ?");
            params.push(updates.active ? 1 : 0);
        }
        if (updates.expires_at !== undefined) {
            fields.push("expires_at = ?");
            params.push(updates.expires_at);
        }
        if (updates.key !== undefined) {
            fields.push("key = ?");
            params.push(updates.key);
        }
        if (updates.usage_count !== undefined) {
            fields.push("usage_count = ?");
            params.push(updates.usage_count);
        }
        if (fields.length === 0)
            return this.getApiKeyById(id);
        params.push(id);
        const stmt = this.db.prepare(`UPDATE api_keys SET ${fields.join(", ")} WHERE id = ?`);
        const result = stmt.run(...params);
        if (result.changes > 0) {
            return this.getApiKeyById(id);
        }
        return null;
    }
    deleteApiKey(id) {
        const stmt = this.db.prepare("DELETE FROM api_keys WHERE id = ?");
        const result = stmt.run(id);
        return result.changes > 0;
    }
    getApiEndpoints() {
        const results = this.db
            .prepare("SELECT * FROM api_endpoints ORDER BY created_at DESC")
            .all();
        return results.map((endpoint) => ({
            ...endpoint,
            auth_required: Boolean(endpoint.auth_required),
            permissions: JSON.parse(endpoint.permissions || "[]"),
            active: Boolean(endpoint.active),
        }));
    }
    createApiEndpoint(endpoint) {
        const uuid = (0, crypto_1.randomUUID)();
        const stmt = this.db.prepare("INSERT INTO api_endpoints (uuid, method, path, handler, description, auth_required, permissions, rate_limit, active, request_count, avg_response_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        const result = stmt.run(uuid, endpoint.method, endpoint.path, endpoint.handler, endpoint.description || "", endpoint.auth_required ? 1 : 0, JSON.stringify(endpoint.permissions || []), endpoint.rate_limit || 100, endpoint.active ? 1 : 0, endpoint.request_count || 0, endpoint.avg_response_time || 0);
        const created = this.db
            .prepare("SELECT * FROM api_endpoints WHERE id = ?")
            .get(result.lastInsertRowid);
        return {
            ...created,
            auth_required: Boolean(created.auth_required),
            permissions: JSON.parse(created.permissions || "[]"),
            active: Boolean(created.active),
        };
    }
    updateApiEndpoint(id, updates) {
        const fields = [];
        const params = [];
        if (updates.method !== undefined) {
            fields.push("method = ?");
            params.push(updates.method);
        }
        if (updates.path !== undefined) {
            fields.push("path = ?");
            params.push(updates.path);
        }
        if (updates.handler !== undefined) {
            fields.push("handler = ?");
            params.push(updates.handler);
        }
        if (updates.description !== undefined) {
            fields.push("description = ?");
            params.push(updates.description);
        }
        if (updates.auth_required !== undefined) {
            fields.push("auth_required = ?");
            params.push(updates.auth_required ? 1 : 0);
        }
        if (updates.permissions !== undefined) {
            fields.push("permissions = ?");
            params.push(JSON.stringify(updates.permissions));
        }
        if (updates.rate_limit !== undefined) {
            fields.push("rate_limit = ?");
            params.push(updates.rate_limit);
        }
        if (updates.active !== undefined) {
            fields.push("active = ?");
            params.push(updates.active ? 1 : 0);
        }
        if (fields.length === 0)
            return this.getApiEndpointById(id);
        params.push(id);
        const stmt = this.db.prepare(`UPDATE api_endpoints SET ${fields.join(", ")} WHERE id = ?`);
        const result = stmt.run(...params);
        if (result.changes > 0) {
            return this.getApiEndpointById(id);
        }
        return null;
    }
    getApiEndpointById(id) {
        const result = this.db
            .prepare("SELECT * FROM api_endpoints WHERE id = ?")
            .get(id);
        if (!result)
            return null;
        return {
            ...result,
            auth_required: Boolean(result.auth_required),
            permissions: JSON.parse(result.permissions || "[]"),
            active: Boolean(result.active),
        };
    }
    deleteApiEndpoint(id) {
        const stmt = this.db.prepare("DELETE FROM api_endpoints WHERE id = ?");
        const result = stmt.run(id);
        return result.changes > 0;
    }
    /**
     * Track an API request to update statistics
     */
    trackApiRequest(method, path, responseTime, statusCode) {
        try {
            // Find the endpoint
            const endpoint = this.db
                .prepare("SELECT * FROM api_endpoints WHERE method = ? AND path = ?")
                .get(method, path);
            if (endpoint) {
                // Update request count and average response time
                const newRequestCount = endpoint.request_count + 1;
                const newAvgTime = (endpoint.avg_response_time * endpoint.request_count + responseTime) /
                    newRequestCount;
                this.db
                    .prepare("UPDATE api_endpoints SET request_count = ?, avg_response_time = ? WHERE id = ?")
                    .run(newRequestCount, Math.round(newAvgTime), endpoint.id);
            }
            // Log the request for analytics
            this.db
                .prepare("INSERT INTO api_request_logs (method, path, status_code, response_time, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)")
                .run(method, path, statusCode, responseTime);
        }
        catch (error) {
            console.error("Error tracking API request:", error);
        }
    }
    getApiStats() {
        try {
            console.log("🔍 Getting API stats...");
            // Get total requests from all endpoints
            const totalResult = this.db
                .prepare("SELECT SUM(request_count) as total FROM api_endpoints")
                .get();
            console.log("📊 Total requests result:", totalResult);
            // Get today's requests from api_request_logs table
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayResult = this.db
                .prepare("SELECT COUNT(*) as count FROM api_request_logs WHERE created_at >= ?")
                .get(today.toISOString());
            // Get average response time from actual requests
            const avgTimeResult = this.db
                .prepare(`SELECT AVG(response_time) as avg_time 
         FROM api_request_logs 
         WHERE response_time IS NOT NULL 
         AND created_at >= datetime('now', '-7 days')`)
                .get();
            // Calculate error rate from actual requests
            const errorResult = this.db
                .prepare(`SELECT 
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors,
          COUNT(*) as total
         FROM api_request_logs 
         WHERE created_at >= datetime('now', '-7 days')`)
                .get();
            const errorRate = errorResult.total > 0
                ? (errorResult.errors / errorResult.total) * 100
                : 0;
            // Get active keys count
            const activeKeysResult = this.db
                .prepare("SELECT COUNT(*) as count FROM api_keys WHERE active = 1")
                .get();
            // Get top endpoints by request count
            const topEndpoints = this.db
                .prepare("SELECT path, method, request_count as requests FROM api_endpoints ORDER BY request_count DESC LIMIT 5")
                .all();
            // Get blocked requests from rate limit violations
            const blockedResult = this.db
                .prepare(`SELECT COUNT(*) as count 
         FROM api_request_logs 
         WHERE status_code = 429 
         AND created_at >= datetime('now', '-1 day')`)
                .get();
            // Calculate bandwidth (simplified since we don't track request/response sizes yet)
            const bandwidthMB = 0; // TODO: Add request_size and response_size columns to api_request_logs
            return {
                total_requests: totalResult.total || 0,
                requests_today: todayResult.count,
                avg_response_time: Math.round(avgTimeResult.avg_time || 0),
                error_rate: Math.round(errorRate * 10) / 10,
                active_keys: activeKeysResult.count,
                blocked_requests: blockedResult.count,
                bandwidth_used: `${bandwidthMB} MB`,
                top_endpoints: topEndpoints,
            };
        }
        catch (error) {
            console.error("❌ Error in getApiStats:", error);
            throw error;
        }
    }
    getRateLimits() {
        const results = this.db
            .prepare("SELECT * FROM rate_limits ORDER BY created_at DESC")
            .all();
        return results.map((limit) => ({
            ...limit,
            active: Boolean(limit.active),
        }));
    }
    createRateLimit(rateLimit) {
        const uuid = (0, crypto_1.randomUUID)();
        const stmt = this.db.prepare("INSERT INTO rate_limits (uuid, name, requests_per_minute, requests_per_hour, requests_per_day, applies_to, active) VALUES (?, ?, ?, ?, ?, ?, ?)");
        const result = stmt.run(uuid, rateLimit.name, rateLimit.requests_per_minute, rateLimit.requests_per_hour, rateLimit.requests_per_day, rateLimit.applies_to, rateLimit.active ? 1 : 0);
        const created = this.db
            .prepare("SELECT * FROM rate_limits WHERE id = ?")
            .get(result.lastInsertRowid);
        return {
            ...created,
            active: Boolean(created.active),
        };
    }
    updateRateLimit(id, updates) {
        const fields = [];
        const params = [];
        if (updates.name !== undefined) {
            fields.push("name = ?");
            params.push(updates.name);
        }
        if (updates.requests_per_minute !== undefined) {
            fields.push("requests_per_minute = ?");
            params.push(updates.requests_per_minute);
        }
        if (updates.requests_per_hour !== undefined) {
            fields.push("requests_per_hour = ?");
            params.push(updates.requests_per_hour);
        }
        if (updates.requests_per_day !== undefined) {
            fields.push("requests_per_day = ?");
            params.push(updates.requests_per_day);
        }
        if (updates.applies_to !== undefined) {
            fields.push("applies_to = ?");
            params.push(updates.applies_to);
        }
        if (updates.active !== undefined) {
            fields.push("active = ?");
            params.push(updates.active ? 1 : 0);
        }
        if (fields.length === 0)
            return this.getRateLimitById(id);
        params.push(id);
        const stmt = this.db.prepare(`UPDATE rate_limits SET ${fields.join(", ")} WHERE id = ?`);
        const result = stmt.run(...params);
        if (result.changes > 0) {
            return this.getRateLimitById(id);
        }
        return null;
    }
    getRateLimitById(id) {
        const result = this.db
            .prepare("SELECT * FROM rate_limits WHERE id = ?")
            .get(id);
        if (!result)
            return null;
        return {
            ...result,
            active: Boolean(result.active),
        };
    }
    deleteRateLimit(id) {
        const stmt = this.db.prepare("DELETE FROM rate_limits WHERE id = ?");
        const result = stmt.run(id);
        return result.changes > 0;
    }
    seedSampleNotifications() {
        try {
            // Check if notifications already exist
            const notificationCount = this.db
                .prepare("SELECT COUNT(*) as count FROM notifications")
                .get();
            if (notificationCount.count === 0) {
                // Get admin users to create notifications for
                const adminUsers = this.db
                    .prepare("SELECT id FROM users WHERE role = 'admin' OR role = 'editor'")
                    .all();
                if (adminUsers.length > 0) {
                    const sampleNotifications = [
                        {
                            type: "system_alert",
                            title: "Welcome to Krapi CMS",
                            message: "Your CMS is now ready to use. Start by creating content and managing your data.",
                        },
                        {
                            type: "content_created",
                            title: "Sample Content Created",
                            message: "Initial sample content has been created in your CMS.",
                        },
                        {
                            type: "user_created",
                            title: "Admin Account Active",
                            message: "Your administrator account has been successfully set up.",
                        },
                    ];
                    // Create notifications for each admin user
                    adminUsers.forEach((user) => {
                        sampleNotifications.forEach((notification) => {
                            this.createNotification({
                                user_id: user.id,
                                type: notification.type,
                                title: notification.title,
                                message: notification.message,
                            });
                        });
                    });
                    console.log("Sample notifications seeded successfully");
                }
            }
        }
        catch (error) {
            console.error("Error seeding sample notifications:", error);
        }
    }
    /**
     * Search across multiple content types
     */
    search(query, limit = 20) {
        try {
            const searchPattern = `%${query.toLowerCase()}%`;
            const results = [];
            // Search content
            const contentQuery = `
        SELECT 'content' as type, c.id, c.key as title, c.description, c.route_path, c.content_type
        FROM content c 
        WHERE LOWER(c.key) LIKE ? OR LOWER(c.description) LIKE ? OR LOWER(c.data) LIKE ?
        LIMIT 10
      `;
            const contentResults = this.db
                .prepare(contentQuery)
                .all(searchPattern, searchPattern, searchPattern);
            results.push(...contentResults);
            // Search routes
            const routeQuery = `
        SELECT 'route' as type, id, name as title, description, path, access_level
        FROM content_routes 
        WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(path) LIKE ?
        LIMIT 10
      `;
            const routeResults = this.db
                .prepare(routeQuery)
                .all(searchPattern, searchPattern, searchPattern);
            results.push(...routeResults);
            // Search users
            const userQuery = `
        SELECT 'user' as type, id, username as title, email as description, role
        FROM users 
        WHERE LOWER(username) LIKE ? OR LOWER(email) LIKE ?
        LIMIT 10
      `;
            const userResults = this.db
                .prepare(userQuery)
                .all(searchPattern, searchPattern);
            results.push(...userResults);
            // Search files
            const fileQuery = `
        SELECT 'file' as type, id, original_name as title, mime_type as description, filename, size
        FROM files 
        WHERE LOWER(filename) LIKE ? OR LOWER(original_name) LIKE ?
        LIMIT 10
      `;
            const fileResults = this.db
                .prepare(fileQuery)
                .all(searchPattern, searchPattern);
            results.push(...fileResults);
            return results.slice(0, limit);
        }
        catch (error) {
            console.error("Database search error:", error);
            return [];
        }
    }
    // Notification Management Methods
    createNotification(notification) {
        try {
            const stmt = this.db.prepare("INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)");
            const result = stmt.run(notification.user_id, notification.type, notification.title, notification.message, notification.data ? JSON.stringify(notification.data) : null);
            return result.lastInsertRowid;
        }
        catch (error) {
            console.error("Error creating notification:", error);
            throw error;
        }
    }
    getUserNotifications(userId, limit = 20, unreadOnly = false) {
        try {
            let query = "SELECT * FROM notifications WHERE user_id = ?";
            const params = [userId];
            if (unreadOnly) {
                query += " AND read = 0";
            }
            query += " ORDER BY created_at DESC LIMIT ?";
            params.push(limit);
            const results = this.db.prepare(query).all(...params);
            return results.map((notification) => ({
                ...notification,
                data: notification.data ? JSON.parse(notification.data) : null,
                read: Boolean(notification.read),
            }));
        }
        catch (error) {
            console.error("Error getting user notifications:", error);
            return [];
        }
    }
    getUnreadNotificationCount(userId) {
        try {
            const result = this.db
                .prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0")
                .get(userId);
            return result.count;
        }
        catch (error) {
            console.error("Error getting unread notification count:", error);
            return 0;
        }
    }
    markNotificationAsRead(notificationId, userId) {
        try {
            const stmt = this.db.prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?");
            const result = stmt.run(notificationId, userId);
            return result.changes > 0;
        }
        catch (error) {
            console.error("Error marking notification as read:", error);
            return false;
        }
    }
    markAllNotificationsAsRead(userId) {
        try {
            const stmt = this.db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0");
            const result = stmt.run(userId);
            return result.changes;
        }
        catch (error) {
            console.error("Error marking all notifications as read:", error);
            return 0;
        }
    }
    deleteNotification(notificationId, userId) {
        try {
            const stmt = this.db.prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?");
            const result = stmt.run(notificationId, userId);
            return result.changes > 0;
        }
        catch (error) {
            console.error("Error deleting notification:", error);
            return false;
        }
    }
    // Helper method to create activity notifications
    createActivityNotification(type, title, message, data) {
        try {
            // Get all admin users to notify
            const adminUsers = this.db
                .prepare("SELECT id FROM users WHERE role = 'admin' OR role = 'editor'")
                .all();
            // Create notification for each admin user
            adminUsers.forEach((user) => {
                this.createNotification({
                    user_id: user.id,
                    type,
                    title,
                    message,
                    data,
                });
            });
        }
        catch (error) {
            console.error("Error creating activity notification:", error);
        }
    }
    // Login logs management
    getLoginLogs(page = 1, limit = 50) {
        try {
            // Get total count
            const totalResult = this.db
                .prepare("SELECT COUNT(*) as count FROM login_logs")
                .get();
            // Get paginated logs
            const offset = (page - 1) * limit;
            const logs = this.db
                .prepare("SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?")
                .all(limit, offset);
            return {
                logs: logs.map((log) => ({
                    id: log.id,
                    username: log.username,
                    ip_address: log.ip_address,
                    user_agent: log.user_agent,
                    success: log.success === 1,
                    timestamp: log.timestamp,
                    location: log.location,
                    failure_reason: log.failure_reason,
                })),
                total: totalResult.count,
                page,
                limit,
            };
        }
        catch (error) {
            console.error("Error getting login logs:", error);
            return {
                logs: [],
                total: 0,
                page,
                limit,
            };
        }
    }
    createLoginLog(log) {
        try {
            const stmt = this.db.prepare("INSERT INTO login_logs (username, ip_address, user_agent, success, location, failure_reason) VALUES (?, ?, ?, ?, ?, ?)");
            stmt.run(log.username, log.ip_address, log.user_agent || null, log.success ? 1 : 0, log.location || null, log.failure_reason || null);
        }
        catch (error) {
            console.error("Error creating login log:", error);
        }
    }
    // Session management
    getActiveSessions() {
        // For now, return empty array since we don't have session tracking implemented
        // In a real implementation, this would query a sessions table
        return [];
    }
}
exports.default = new DatabaseService();
//# sourceMappingURL=database.js.map