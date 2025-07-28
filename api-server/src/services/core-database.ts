import Database from "better-sqlite3";
import path from "path";

// Core types for the simplified database
interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  password_hash: string;
  role: "master_admin" | "admin" | "project_admin" | "limited_admin" | "user";
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  permissions?: Record<string, boolean>;
}

interface LoginLog {
  id: number;
  username: string;
  ip_address: string;
  user_agent?: string;
  success: boolean;
  timestamp: string;
  location?: string;
  failure_reason?: string;
}

interface SystemSetting {
  key: string;
  value: string;
  description?: string;
  category: string;
  encrypted: boolean;
  created_at: string;
  updated_at: string;
}

class CoreDatabaseService {
  private db: Database.Database;

  constructor() {
    try {
      const dbPath = path.join(__dirname, "../../data/core.db");

      // Ensure data directory exists
      const dataDir = path.dirname(dbPath);
      if (!require("fs").existsSync(dataDir)) {
        require("fs").mkdirSync(dataDir, { recursive: true });
      }

      console.log(`📊 Initializing core database at: ${dbPath}`);
      this.db = new Database(dbPath, {
        verbose:
          process.env.NODE_ENV === "development" ? console.log : undefined,
      });

      // Enable WAL mode for better concurrency
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("foreign_keys = ON");

      this.initializeTables();
      this.seedDefaultData();

      console.log("✅ Core database initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize core database:", error);
      throw error;
    }
  }

  private initializeTables() {
    try {
      console.log("📊 Creating core database tables...");

      // Users table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          firstName TEXT,
          lastName TEXT,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          active BOOLEAN NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          permissions TEXT
        );
      `);

      // Login logs table
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

      // System settings table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL DEFAULT 'general',
          encrypted BOOLEAN NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_login_logs_username ON login_logs(username);
        CREATE INDEX IF NOT EXISTS idx_login_logs_timestamp ON login_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
      `);

      console.log("✅ Core database tables created successfully");
    } catch (error) {
      console.error("❌ Failed to create core database tables:", error);
      throw error;
    }
  }

  private seedDefaultData() {
    try {
      // Check if admin user already exists
      const existingAdmin = this.db
        .prepare("SELECT id FROM users WHERE username = ?")
        .get("admin");

      if (!existingAdmin) {
        console.log("🌱 Seeding default admin user...");

        // Create admin user with default password 'admin'
        const bcrypt = require("bcryptjs");
        const hashedPassword = bcrypt.hashSync("admin", 10);

        this.db
          .prepare(
            "INSERT INTO users (username, email, firstName, lastName, password_hash, role, active) VALUES (?, ?, ?, ?, ?, ?, ?)"
          )
          .run(
            "admin@krapi.local",
            "admin@krapi.local",
            "Master",
            "Administrator",
            hashedPassword,
            "master_admin",
            1
          );

        console.log(
          "✅ Default admin user created (email: admin@krapi.local, password: admin)"
        );
      }

      // Seed default system settings
      const defaultSettings = [
        {
          key: "site_name",
          value: "Krapi",
          description: "Site name",
          category: "general",
        },
        {
          key: "site_description",
          value: "Project-driven API platform",
          description: "Site description",
          category: "general",
        },
        {
          key: "maintenance_mode",
          value: "false",
          description: "Maintenance mode",
          category: "system",
        },
        {
          key: "session_timeout",
          value: "3600",
          description: "Session timeout in seconds",
          category: "security",
        },
      ];

      for (const setting of defaultSettings) {
        this.db
          .prepare(
            "INSERT OR IGNORE INTO system_settings (key, value, description, category) VALUES (?, ?, ?, ?)"
          )
          .run(
            setting.key,
            setting.value,
            setting.description,
            setting.category
          );
      }

      console.log("✅ Default system settings seeded");
    } catch (error) {
      console.error("❌ Failed to seed default data:", error);
    }
  }

  // User operations
  getUserByUsername(username: string): User | null {
    return this.db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as User | null;
  }

  getUserByEmail(email: string): User | null {
    return this.db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email) as User | null;
  }

  getUserById(id: number): User | null {
    return this.db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id) as User | null;
  }

  getAllUsers(): User[] {
    return this.db
      .prepare("SELECT * FROM users ORDER BY created_at DESC")
      .all() as User[];
  }

  createUser(
    userData: Omit<User, "id" | "created_at" | "updated_at">
  ): User | null {
    try {
      const stmt = this.db.prepare(
        "INSERT INTO users (username, email, firstName, lastName, password_hash, role, active, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );
      const result = stmt.run(
        userData.username,
        userData.email,
        userData.firstName || null,
        userData.lastName || null,
        userData.password_hash,
        userData.role,
        userData.active ? 1 : 0,
        userData.permissions ? JSON.stringify(userData.permissions) : null
      );

      return this.getUserById(result.lastInsertRowid as number);
    } catch (error) {
      console.error("Failed to create user:", error);
      return null;
    }
  }

  updateUser(id: number, updates: Partial<User>): User | null {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.username !== undefined) {
        fields.push("username = ?");
        values.push(updates.username);
      }
      if (updates.email !== undefined) {
        fields.push("email = ?");
        values.push(updates.email);
      }
      if (updates.role !== undefined) {
        fields.push("role = ?");
        values.push(updates.role);
      }
      if (updates.active !== undefined) {
        fields.push("active = ?");
        values.push(updates.active ? 1 : 0);
      }
      if (updates.last_login !== undefined) {
        fields.push("last_login = ?");
        values.push(updates.last_login);
      }

      fields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);

      const stmt = this.db.prepare(
        `UPDATE users SET ${fields.join(", ")} WHERE id = ?`
      );
      stmt.run(...values);

      return this.getUserById(id);
    } catch (error) {
      console.error("Failed to update user:", error);
      return null;
    }
  }

  updateUserPassword(userId: number, hashedPassword: string): boolean {
    try {
      this.db
        .prepare(
          "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .run(hashedPassword, userId);
      return true;
    } catch (error) {
      console.error("Failed to update user password:", error);
      return false;
    }
  }

  deleteUser(id: number): boolean {
    try {
      const stmt = this.db.prepare("DELETE FROM users WHERE id = ?");
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error("Failed to delete user:", error);
      return false;
    }
  }

  // Login log operations
  createLoginLog(log: Omit<LoginLog, "id" | "timestamp">): void {
    try {
      this.db
        .prepare(
          "INSERT INTO login_logs (username, ip_address, user_agent, success, location, failure_reason) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run(
          log.username,
          log.ip_address,
          log.user_agent,
          log.success ? 1 : 0,
          log.location,
          log.failure_reason
        );
    } catch (error) {
      console.error("Failed to create login log:", error);
    }
  }

  getLoginLogs(
    page: number = 1,
    limit: number = 50
  ): {
    logs: LoginLog[];
    total: number;
    page: number;
    limit: number;
  } {
    try {
      const offset = (page - 1) * limit;

      const total = this.db
        .prepare("SELECT COUNT(*) as count FROM login_logs")
        .get() as { count: number };

      const logs = this.db
        .prepare(
          "SELECT * FROM login_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        )
        .all(limit, offset) as LoginLog[];

      return {
        logs,
        total: total.count,
        page,
        limit,
      };
    } catch (error) {
      console.error("Failed to get login logs:", error);
      return { logs: [], total: 0, page, limit };
    }
  }

  // System settings operations
  getSystemSettings(category?: string): SystemSetting[] {
    try {
      if (category) {
        return this.db
          .prepare(
            "SELECT * FROM system_settings WHERE category = ? ORDER BY key"
          )
          .all(category) as SystemSetting[];
      } else {
        return this.db
          .prepare("SELECT * FROM system_settings ORDER BY category, key")
          .all() as SystemSetting[];
      }
    } catch (error) {
      console.error("Failed to get system settings:", error);
      return [];
    }
  }

  getSystemSetting(key: string): string | null {
    try {
      const setting = this.db
        .prepare("SELECT value FROM system_settings WHERE key = ?")
        .get(key) as { value: string } | null;

      return setting?.value || null;
    } catch (error) {
      console.error("Failed to get system setting:", error);
      return null;
    }
  }

  setSystemSetting(
    key: string,
    value: string,
    description?: string,
    category = "general"
  ): boolean {
    try {
      this.db
        .prepare(
          "INSERT OR REPLACE INTO system_settings (key, value, description, category, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)"
        )
        .run(key, value, description, category);
      return true;
    } catch (error) {
      console.error("Failed to set system setting:", error);
      return false;
    }
  }

  // Database utilities
  close(): void {
    this.db.close();
  }

  getDatabaseStats(): {
    users: number;
    loginLogs: number;
    systemSettings: number;
  } {
    try {
      const users = this.db
        .prepare("SELECT COUNT(*) as count FROM users")
        .get() as { count: number };

      const loginLogs = this.db
        .prepare("SELECT COUNT(*) as count FROM login_logs")
        .get() as { count: number };

      const systemSettings = this.db
        .prepare("SELECT COUNT(*) as count FROM system_settings")
        .get() as { count: number };

      return {
        users: users.count,
        loginLogs: loginLogs.count,
        systemSettings: systemSettings.count,
      };
    } catch (error) {
      console.error("Failed to get database stats:", error);
      return { users: 0, loginLogs: 0, systemSettings: 0 };
    }
  }
}

export default CoreDatabaseService;
