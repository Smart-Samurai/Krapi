/**
 * Backup Service for BackendSDK
 * 
 * Provides encrypted backup and restore functionality for KRAPI projects.
 * Supports:
 * - Individual project backups (encrypted)
 * - System-wide backups (encrypted)
 * - Backup versioning
 * - Secure backup storage
 */

import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { promisify } from "util";
import * as zlib from "zlib";

import { DatabaseConnection, Logger } from "./core";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface BackupMetadata {
  id: string;
  project_id?: string;
  type: "project" | "system";
  created_at: string;
  size: number;
  encrypted: boolean;
  version: string;
  description?: string;
}

export interface BackupOptions {
  projectId?: string;
  description?: string;
  password?: string;
  includeFiles?: boolean;
  compressionLevel?: number;
}

export interface RestoreOptions {
  password?: string;
  overwrite?: boolean;
}

/**
 * Backup Service for KRAPI
 * Provides encrypted backup and restore functionality
 */
export class BackupService {
  private backupsDir: string;
  private encryptionAlgorithm = "aes-256-gcm";
  private keyDerivationIterations = 100000;

  constructor(
    private dbConnection: DatabaseConnection,
    private logger: Logger = console,
    backupsDir?: string
  ) {
    this.backupsDir = backupsDir || path.join(process.cwd(), "data", "backups");
  }

  /**
   * Initialize backup directory
   */
  private async ensureBackupDir(): Promise<void> {
    try {
      await fs.mkdir(this.backupsDir, { recursive: true });
    } catch (error) {
      this.logger.error("Failed to create backup directory:", error);
      throw error;
    }
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  private async deriveKey(
    password: string,
    salt: Buffer
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        this.keyDerivationIterations,
        32, // 256 bits for AES-256
        "sha256",
        (error, derivedKey) => {
          if (error) {
            reject(error);
          } else {
            resolve(derivedKey);
          }
        }
      );
    });
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private async encryptData(
    data: Buffer,
    password: string
  ): Promise<{ encrypted: Buffer; iv: Buffer; salt: Buffer; tag: Buffer }> {
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const key = await this.deriveKey(password, salt);

    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, key, iv) as crypto.CipherGCM;
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();

    return { encrypted, iv, salt, tag };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private async decryptData(
    encrypted: Buffer,
    iv: Buffer,
    salt: Buffer,
    tag: Buffer,
    password: string
  ): Promise<Buffer> {
    const key = await this.deriveKey(password, salt);
    const decipher = crypto.createDecipheriv(this.encryptionAlgorithm, key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
  }

  /**
   * Generate backup ID
   */
  private generateBackupId(): string {
    return `backup_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
  }

  /**
   * Create encrypted backup of a project
   */
  async backupProject(options: BackupOptions): Promise<BackupMetadata & { password: string }> {
    if (!options.projectId) {
      throw new Error("Project ID is required for project backup");
    }

    try {
      await this.ensureBackupDir();

      const backupId = this.generateBackupId();
      const password =
        options.password || crypto.randomBytes(32).toString("hex");
      const timestamp = new Date().toISOString();

      // Collect project data
      const projectData: Record<string, unknown> = {
        project_id: options.projectId,
        timestamp,
        version: "2.0.0",
        type: "project",
        description: options.description || `Project backup ${timestamp}`,
      };

      // Get project metadata from main database
      const projectResult = await this.dbConnection.query(
        "SELECT * FROM projects WHERE id = $1",
        [options.projectId]
      );

      if (projectResult.rows.length === 0) {
        throw new Error(`Project ${options.projectId} not found`);
      }

      projectData.project = projectResult.rows[0];

      // Get project database path (assumes MultiDatabaseManager interface)
      const projectDbPath = path.join(
        process.cwd(),
        "data",
        "projects",
        `project_${options.projectId}.db`
      );

      // Read project database file
      try {
        const dbData = await fs.readFile(projectDbPath);
        projectData.database = dbData.toString("base64");
      } catch (error) {
        this.logger.warn(`Could not read project database: ${error}`);
        projectData.database = null;
      }

      // Serialize project data
      const jsonData = JSON.stringify(projectData);
      const dataBuffer = Buffer.from(jsonData, "utf8");

      // Compress data
      const compressed = await gzip(dataBuffer);

      // Encrypt data
      const { encrypted, iv, salt, tag } = await this.encryptData(
        compressed,
        password
      );

      // Create backup file structure
      const backupMetadata: BackupMetadata = {
        id: backupId,
        project_id: options.projectId,
        type: "project",
        created_at: timestamp,
        size: encrypted.length,
        encrypted: true,
        version: "2.0.0",
        description: options.description,
      };

      const backupFile = {
        metadata: backupMetadata,
        data: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        salt: salt.toString("base64"),
        tag: tag.toString("base64"),
      };

      // Save backup file
      const backupFilePath = path.join(
        this.backupsDir,
        `${backupId}.json`
      );
      await fs.writeFile(
        backupFilePath,
        JSON.stringify(backupFile, null, 2),
        "utf8"
      );

      // Save backup metadata in main database
      await this.dbConnection.query(
        `INSERT INTO backups (id, project_id, type, created_at, size, encrypted, version, description, file_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          backupId,
          options.projectId,
          "project",
          timestamp,
          encrypted.length,
          1, // SQLite stores booleans as integers (1 = true, 0 = false)
          "2.0.0",
          options.description || null,
          backupFilePath,
        ]
      );

      this.logger.info(`Created encrypted backup: ${backupId}`);

      return {
        ...backupMetadata,
        password,
      } as BackupMetadata & { password: string };
    } catch (error) {
      this.logger.error("Failed to create project backup:", error);
      throw new Error(
        `Failed to create backup: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Restore project from encrypted backup
   */
  async restoreProject(
    backupId: string,
    options: RestoreOptions = {}
  ): Promise<void> {
    try {
      // Get backup metadata
      const backupResult = await this.dbConnection.query(
        "SELECT * FROM backups WHERE id = $1",
        [backupId]
      );

      if (backupResult.rows.length === 0) {
        throw new Error(`Backup ${backupId} not found`);
      }

      const backup = backupResult.rows[0] as { file_path?: string; [key: string]: unknown };

      if (!backup.file_path) {
        throw new Error(`Backup ${backupId} has no file path`);
      }

      // Read backup file
      const backupFilePath = backup.file_path;
      const backupFileContent = await fs.readFile(backupFilePath, "utf8");
      const backupFile = JSON.parse(backupFileContent);

      if (!options.password) {
        throw new Error("Password is required to restore encrypted backup");
      }

      // Decrypt data
      const encrypted = Buffer.from(backupFile.data, "base64");
      const iv = Buffer.from(backupFile.iv, "base64");
      const salt = Buffer.from(backupFile.salt, "base64");
      const tag = Buffer.from(backupFile.tag, "base64");

      const decrypted = await this.decryptData(
        encrypted,
        iv,
        salt,
        tag,
        options.password
      );

      // Decompress data
      const decompressed = await gunzip(decrypted);
      const projectData = JSON.parse(decompressed.toString("utf8"));

      // Validate project data
      if (!projectData.project_id) {
        throw new Error("Invalid backup: missing project_id");
      }

      const projectId = projectData.project_id as string;

      // Check if project exists and overwrite flag
      const existingProject = await this.dbConnection.query(
        "SELECT id FROM projects WHERE id = $1",
        [projectId]
      );

      if (existingProject.rows.length > 0 && !options.overwrite) {
        throw new Error(
          `Project ${projectId} already exists. Use overwrite option to restore anyway.`
        );
      }

      // Restore project metadata in main database
      if (options.overwrite || existingProject.rows.length === 0) {
        await this.dbConnection.query(
          `INSERT OR REPLACE INTO projects (id, name, description, owner_id, api_key, settings, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            projectData.project.id,
            projectData.project.name,
            projectData.project.description || null,
            projectData.project.owner_id,
            projectData.project.api_key,
            projectData.project.settings || "{}",
            projectData.project.created_at,
            new Date().toISOString(),
          ]
        );
      }

      // Restore project database
      if (projectData.database) {
        const projectDbPath = path.join(
          process.cwd(),
          "data",
          "projects",
          `project_${projectId}.db`
        );

        // Ensure projects directory exists
        await fs.mkdir(path.dirname(projectDbPath), { recursive: true });

        // Restore database file
        const dbData = Buffer.from(projectData.database, "base64");
        await fs.writeFile(projectDbPath, dbData);

        this.logger.info(`Restored project database: ${projectId}`);
      }

      this.logger.info(`Project ${projectId} restored successfully`);
    } catch (error) {
      this.logger.error("Failed to restore project:", error);
      throw new Error(
        `Failed to restore backup: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * List all backups
   */
  async listBackups(
    projectId?: string,
    type?: "project" | "system"
  ): Promise<BackupMetadata[]> {
    try {
      let query = "SELECT * FROM backups WHERE 1=1";
      const params: unknown[] = [];
      let paramCount = 0;

      if (projectId) {
        paramCount++;
        query += ` AND project_id = $${paramCount}`;
        params.push(projectId);
      }

      if (type) {
        paramCount++;
        query += ` AND type = $${paramCount}`;
        params.push(type);
      }

      query += " ORDER BY created_at DESC";

      const result = await this.dbConnection.query(query, params);

      return (result.rows || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        project_id: (row.project_id as string) || undefined,
        type: row.type as "project" | "system",
        created_at: row.created_at as string,
        size: row.size as number,
        encrypted: row.encrypted as boolean,
        version: (row.version as string) || "2.0.0",
        description: row.description || undefined,
      })) as BackupMetadata[];
    } catch (error) {
      this.logger.error("Failed to list backups:", error);
      // If backups table doesn't exist, return empty array
      if (
        error instanceof Error &&
        (error.message.includes("no such table") ||
          error.message.includes("does not exist"))
      ) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      // Get backup metadata
      const backupResult = await this.dbConnection.query(
        "SELECT file_path FROM backups WHERE id = $1",
        [backupId]
      );

      if (backupResult.rows.length === 0) {
        throw new Error(`Backup ${backupId} not found`);
      }

      const backup = backupResult.rows[0] as { file_path?: string; [key: string]: unknown };

      if (!backup.file_path || typeof backup.file_path !== 'string') {
        throw new Error(`Backup ${backupId} has no file path`);
      }

      const filePath = backup.file_path;

      // Delete backup file
      try {
        await fs.unlink(filePath);
      } catch (error) {
        this.logger.warn(`Could not delete backup file: ${error}`);
      }

      // Delete backup metadata
      await this.dbConnection.query("DELETE FROM backups WHERE id = $1", [
        backupId,
      ]);

      this.logger.info(`Deleted backup: ${backupId}`);
    } catch (error) {
      this.logger.error("Failed to delete backup:", error);
      throw error;
    }
  }

  /**
   * Create system-wide backup (all projects + main database)
   */
  async backupSystem(options: BackupOptions = {}): Promise<BackupMetadata> {
    try {
      await this.ensureBackupDir();

      const backupId = this.generateBackupId();
      const password =
        options.password || crypto.randomBytes(32).toString("hex");
      const timestamp = new Date().toISOString();

      // Collect system data
      const systemData: Record<string, unknown> = {
        timestamp,
        version: "2.0.0",
        type: "system",
        description: options.description || `System backup ${timestamp}`,
      };

      // Get main database path
      const mainDbPath = path.join(process.cwd(), "data", "krapi_main.db");

      // Read main database file
      try {
        const mainDbData = await fs.readFile(mainDbPath);
        systemData.main_database = mainDbData.toString("base64");
      } catch (error) {
        this.logger.warn(`Could not read main database: ${error}`);
        systemData.main_database = null;
      }

      // Get all projects
      const projectsResult = await this.dbConnection.query(
        "SELECT id FROM projects WHERE is_active = 1"
      );

      systemData.projects = projectsResult.rows.map((row: Record<string, unknown>) => row.id as string);

      // Serialize system data
      const jsonData = JSON.stringify(systemData);
      const dataBuffer = Buffer.from(jsonData, "utf8");

      // Compress data
      const compressed = await gzip(dataBuffer);

      // Encrypt data
      const { encrypted, iv, salt, tag } = await this.encryptData(
        compressed,
        password
      );

      // Create backup file structure
      const backupMetadata: BackupMetadata = {
        id: backupId,
        type: "system",
        created_at: timestamp,
        size: encrypted.length,
        encrypted: true,
        version: "2.0.0",
        description: options.description,
      };

      const backupFile = {
        metadata: backupMetadata,
        data: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        salt: salt.toString("base64"),
        tag: tag.toString("base64"),
      };

      // Save backup file
      const backupFilePath = path.join(this.backupsDir, `${backupId}.json`);
      await fs.writeFile(
        backupFilePath,
        JSON.stringify(backupFile, null, 2),
        "utf8"
      );

      // Save backup metadata in main database
      try {
        await this.dbConnection.query(
          `INSERT INTO backups (id, type, created_at, size, encrypted, version, description, file_path)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            backupId,
            "system",
            timestamp,
            encrypted.length,
            1, // SQLite stores booleans as integers (1 = true, 0 = false)
            "2.0.0",
            options.description || null,
            backupFilePath,
          ]
        );
      } catch (error) {
        // If backups table doesn't exist, just log warning
        this.logger.warn("Could not save backup metadata to database:", error);
      }

      this.logger.info(`Created encrypted system backup: ${backupId}`);

      return {
        ...backupMetadata,
        password,
      } as BackupMetadata & { password: string };
    } catch (error) {
      this.logger.error("Failed to create system backup:", error);
      throw new Error(
        `Failed to create system backup: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
