/**
 * Backup Scheduler Service
 * 
 * Manages automated backups for projects based on their backup_automation settings.
 * Runs scheduled backups according to project configuration.
 * 
 * Features:
 * - Scheduled backups (hourly, daily, weekly, monthly)
 * - Automatic backup execution
 * - Schedule management
 * - Backup history tracking
 * 
 * @class BackupSchedulerService
 * @example
 * const scheduler = new BackupSchedulerService(db, backendSDK, logger);
 * scheduler.start();
 * // Backups will run automatically based on project settings
 */
import KrapiLogger from "@krapi/logger";
import type { BackendSDK } from "@krapi/sdk";

import type { DatabaseService } from "./database.service";

/**
 * Backup schedule configuration
 * 
 * @typedef {Object} BackupSchedule
 * @property {string} projectId - Project ID for the backup schedule
 * @property {"hourly" | "daily" | "weekly" | "monthly"} frequency - Backup frequency
 * @property {string} [time] - Time of day for backup (HH:mm format)
 * @property {number} [day_of_week] - Day of week (0-6, Sunday = 0) for weekly backups
 * @property {number} [day_of_month] - Day of month (1-31) for monthly backups
 * @property {Date} [lastBackup] - Timestamp of last backup
 * @property {Date} [nextBackup] - Timestamp of next scheduled backup
 */
export interface BackupSchedule {
  projectId: string;
  frequency: "hourly" | "daily" | "weekly" | "monthly";
  time?: string;
  day_of_week?: number;
  day_of_month?: number;
  lastBackup?: Date;
  nextBackup?: Date;
}

export class BackupSchedulerService {
  private schedules: Map<string, BackupSchedule> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private db: DatabaseService,
    private backendSDK: BackendSDK,
    private logger: KrapiLogger | Console = console
  ) {}

  /**
   * Helper method to log messages with proper signature for both logger types
   */
  private logInfo(message: string): void {
    if (this.logger instanceof KrapiLogger) {
      this.logger.info("system", message);
    } else {
      this.logger.info(message);
    }
  }

  private logWarn(message: string): void {
    if (this.logger instanceof KrapiLogger) {
      this.logger.warn("system", message);
    } else {
      this.logger.warn(message);
    }
  }

  private logError(message: string, error?: unknown): void {
    if (this.logger instanceof KrapiLogger) {
      this.logger.error("system", message, { error });
    } else {
      this.logger.error(message, error);
    }
  }

  /**
   * Start the backup scheduler
   * 
   * Loads all project backup schedules and begins checking for
   * scheduled backups. Checks every minute for backups that need to run.
   * 
   * @returns {void}
   * 
   * @example
   * scheduler.start();
   * // Scheduler is now running and will execute backups automatically
   */
  start(): void {
    if (this.isRunning) {
      this.logWarn("Backup scheduler is already running");
      return;
    }

    this.isRunning = true;
    this.logInfo("Backup scheduler started");

    // Load all project schedules
    this.loadSchedules();

    // Check for scheduled backups every minute
    this.checkInterval = setInterval(() => {
      this.checkAndRunBackups();
    }, 60 * 1000); // Check every minute

    // Refresh schedules every 5 minutes to pick up any changes
    setInterval(() => {
      this.loadSchedules().catch((error) => {
        this.logError("Failed to refresh backup schedules:", error);
      });
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    // Run initial check
    this.checkAndRunBackups();
  }

  /**
   * Stop the backup scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear all intervals
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Clear all project-specific intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();

    this.logInfo("Backup scheduler stopped");
  }

  /**
   * Load schedules for all projects with backup automation enabled
   */
  private async loadSchedules(): Promise<void> {
    try {
      const projects = await this.db.getAllProjects();
      
      for (const project of projects) {
        const automation = project.settings?.backup_automation;
        
        if (automation?.enabled) {
          this.addSchedule(project.id, automation);
        } else {
          this.removeSchedule(project.id);
        }
      }

      this.logInfo(`Loaded ${this.schedules.size} backup schedules`);
    } catch (error) {
      this.logError("Failed to load backup schedules:", error);
    }
  }

  /**
   * Add or update a backup schedule for a project
   */
  addSchedule(projectId: string, automation: {
    frequency: "hourly" | "daily" | "weekly" | "monthly";
    time?: string;
    day_of_week?: number;
    day_of_month?: number;
  }): void {
    const schedule: BackupSchedule = {
      projectId,
      frequency: automation.frequency,
      time: automation.time,
      day_of_week: automation.day_of_week,
      day_of_month: automation.day_of_month,
    };

    // Calculate next backup time
    schedule.nextBackup = this.calculateNextBackup(schedule);

    this.schedules.set(projectId, schedule);
    this.logInfo(`Added backup schedule for project ${projectId}: ${automation.frequency}`);
  }

  /**
   * Remove a backup schedule for a project
   */
  removeSchedule(projectId: string): void {
    if (this.schedules.has(projectId)) {
      this.schedules.delete(projectId);
      
      // Clear any existing interval for this project
      const interval = this.intervals.get(projectId);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(projectId);
      }

      this.logInfo(`Removed backup schedule for project ${projectId}`);
    }
  }

  /**
   * Calculate the next backup time based on schedule
   */
  private calculateNextBackup(schedule: BackupSchedule): Date {
    const now = new Date();
    const next = new Date(now);

    switch (schedule.frequency) {
      case "hourly":
        next.setHours(next.getHours() + 1, 0, 0, 0);
        break;

      case "daily":
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(":").map(Number);
          next.setHours(hours, minutes || 0, 0, 0);
          
          // If time has passed today, schedule for tomorrow
          if (next <= now) {
            next.setDate(next.getDate() + 1);
          }
        } else {
          // Default to midnight
          next.setDate(next.getDate() + 1);
          next.setHours(0, 0, 0, 0);
        }
        break;

      case "weekly":
        if (schedule.day_of_week !== undefined && schedule.time) {
          const [hours, minutes] = schedule.time.split(":").map(Number);
          const targetDay = schedule.day_of_week;
          const currentDay = now.getDay();
          
          let daysUntilTarget = (targetDay - currentDay + 7) % 7;
          if (daysUntilTarget === 0) {
            // Same day - check if time has passed
            next.setHours(hours, minutes || 0, 0, 0);
            if (next <= now) {
              daysUntilTarget = 7; // Schedule for next week
            }
          }
          
          next.setDate(next.getDate() + daysUntilTarget);
          next.setHours(hours, minutes || 0, 0, 0);
        } else {
          // Default to Sunday at midnight
          const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
          next.setDate(next.getDate() + daysUntilSunday);
          next.setHours(0, 0, 0, 0);
        }
        break;

      case "monthly":
        if (schedule.day_of_month !== undefined && schedule.time) {
          const [hours, minutes] = schedule.time.split(":").map(Number);
          const targetDay = schedule.day_of_month;
          const currentDay = now.getDate();
          
          next.setDate(targetDay);
          next.setHours(hours, minutes || 0, 0, 0);
          
          // If day has passed this month, schedule for next month
          if (next <= now || targetDay < currentDay) {
            next.setMonth(next.getMonth() + 1);
            // Handle months with fewer days
            const daysInNextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
            next.setDate(Math.min(targetDay, daysInNextMonth));
          }
        } else {
          // Default to 1st of next month at midnight
          next.setMonth(next.getMonth() + 1);
          next.setDate(1);
          next.setHours(0, 0, 0, 0);
        }
        break;
    }

    return next;
  }

  /**
   * Check all schedules and run backups that are due
   */
  private async checkAndRunBackups(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const now = new Date();

    for (const [projectId, schedule] of this.schedules.entries()) {
      if (schedule.nextBackup && schedule.nextBackup <= now) {
        // Backup is due
        this.runBackup(projectId, schedule).catch((error) => {
          this.logError(`Failed to run backup for project ${projectId}:`, error);
        });
      }
    }
  }

  /**
   * Run a backup for a project
   */
  private async runBackup(projectId: string, schedule: BackupSchedule): Promise<void> {
    try {
      this.logInfo(`Running automated backup for project ${projectId}`);

      // Get project to access backup automation settings
      const project = await this.db.getProjectById(projectId);
      if (!project) {
        this.logWarn(`Project ${projectId} not found, removing schedule`);
        this.removeSchedule(projectId);
        return;
      }

      const automation = project.settings?.backup_automation;
      if (!automation?.enabled) {
        this.logInfo(`Backup automation disabled for project ${projectId}, removing schedule`);
        this.removeSchedule(projectId);
        return;
      }

      // Generate backup description
      const date = new Date().toISOString();
      const description = automation.description_template
        ? automation.description_template.replace("{date}", date)
        : `Automated backup - ${date}`;

      // Run the backup
      const backup = await this.backendSDK.backup.backupProject({
        projectId,
        description,
        includeFiles: automation.include_files ?? false,
      });

      this.logInfo(`Automated backup created for project ${projectId}: ${backup.id}`);

      // Update schedule
      schedule.lastBackup = new Date();
      schedule.nextBackup = this.calculateNextBackup(schedule);

      // Clean up old backups if retention is configured
      if (automation.retention_days || automation.max_backups) {
        await this.cleanupOldBackups(projectId, automation);
      }
    } catch (error) {
      this.logError(`Error running backup for project ${projectId}:`, error);
      
      // Reschedule for next interval even on failure
      schedule.nextBackup = this.calculateNextBackup(schedule);
    }
  }

  /**
   * Clean up old backups based on retention settings
   */
  private async cleanupOldBackups(
    projectId: string,
    automation: {
      retention_days?: number;
      max_backups?: number;
    }
  ): Promise<void> {
    try {
      const backupList = await this.backendSDK.backup.listBackups(projectId, "project");
      
      if (!backupList || !Array.isArray(backupList)) {
        return;
      }
      const now = new Date();
      const backupsToDelete: string[] = [];

      // Filter by retention days
      if (automation.retention_days) {
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - automation.retention_days);

        for (const backup of backupList) {
          const backupDate = new Date(backup.created_at);
          if (backupDate < cutoffDate) {
            backupsToDelete.push(backup.id);
          }
        }
      }

      // Filter by max backups (keep only the most recent N)
      if (automation.max_backups && backupList.length > automation.max_backups) {
        // Sort by date (newest first)
        const sorted = [...backupList].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Mark old ones for deletion
        for (let i = automation.max_backups; i < sorted.length; i++) {
          if (!backupsToDelete.includes(sorted[i].id)) {
            backupsToDelete.push(sorted[i].id);
          }
        }
      }

      // Delete old backups
      for (const backupId of backupsToDelete) {
        try {
          await this.backendSDK.backup.deleteBackup(backupId);
          this.logInfo(`Deleted old backup ${backupId} for project ${projectId}`);
        } catch (error) {
          this.logError(`Failed to delete backup ${backupId}:`, error);
        }
      }
    } catch (error) {
      this.logError(`Error cleaning up backups for project ${projectId}:`, error);
    }
  }

  /**
   * Refresh schedules (reload from database)
   */
  async refreshSchedules(): Promise<void> {
    await this.loadSchedules();
  }

  /**
   * Get all active schedules
   */
  getSchedules(): BackupSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get schedule for a specific project
   */
  getSchedule(projectId: string): BackupSchedule | undefined {
    return this.schedules.get(projectId);
  }
}

