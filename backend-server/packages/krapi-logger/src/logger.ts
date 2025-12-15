import fs from "fs";
import path from "path";
import { EventEmitter } from "events";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error" | "fatal";
  service:
    | "backend"
    | "frontend"
    | "database"
    | "auth"
    | "api"
    | "system"
    | "monitor";
  message: string;
  data?: any;
  stack?: string;
  userId?: string;
  projectId?: string;
  requestId?: string;
  duration?: number;
}

export interface LogConfig {
  level: string;
  enableFileLogging: boolean;
  enableConsoleLogging: boolean;
  logFilePath: string;
  maxLogFiles: number;
  maxLogSize: string;
  enableMetrics: boolean;
}

export class KrapiLogger extends EventEmitter {
  private static instance: KrapiLogger;
  private config: LogConfig;
  private logs: LogEntry[] = [];
  private metrics: Map<string, any> = new Map();
  private logFileStream: fs.WriteStream | null = null;
  private currentLogFile = "";
  private logFileSize = 0;
  private maxLogSizeBytes = 0;

  private constructor(config: Partial<LogConfig> = {}) {
    super();
    this.config = {
      level: config.level || process.env.LOG_LEVEL || "info",
      enableFileLogging: config.enableFileLogging ?? true,
      enableConsoleLogging: config.enableConsoleLogging ?? true,
      logFilePath: config.logFilePath || process.env.LOG_FILE_PATH || "./logs",
      maxLogFiles:
        config.maxLogFiles || parseInt(process.env.MAX_LOG_FILES || "10"),
      maxLogSize: config.maxLogSize || process.env.MAX_LOG_SIZE || "10MB",
      enableMetrics: config.enableMetrics ?? true,
    };

    this.maxLogSizeBytes = this.parseSize(this.config.maxLogSize);
    this.ensureLogDirectory();
    this.setupLogRotation();
  }

  public static getInstance(config?: Partial<LogConfig>): KrapiLogger {
    if (!KrapiLogger.instance) {
      KrapiLogger.instance = new KrapiLogger(config);
    }
    return KrapiLogger.instance;
  }

  private parseSize(sizeStr: string): number {
    const units: { [key: string]: number } = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
    };

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
    if (!match) return 10 * 1024 * 1024; // Default 10MB

    const size = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    return size * (units[unit] || 1);
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.logFilePath)) {
      fs.mkdirSync(this.config.logFilePath, { recursive: true });
    }
  }

  private setupLogRotation(): void {
    if (!this.config.enableFileLogging) return;

    const timestamp = new Date().toISOString().split("T")[0];
    this.currentLogFile = path.join(
      this.config.logFilePath,
      `krapi-${timestamp}.log`
    );

    try {
      this.logFileStream = fs.createWriteStream(this.currentLogFile, {
        flags: "a",
      });
      this.logFileSize = fs.existsSync(this.currentLogFile)
        ? fs.statSync(this.currentLogFile).size
        : 0;
    } catch (error) {
      console.error("Failed to setup log file:", error);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ["debug", "info", "warn", "error", "fatal"];
    const configLevelIndex = levels.indexOf(this.config.level);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= configLevelIndex;
  }

  private rotateLogFile(): void {
    if (!this.config.enableFileLogging || !this.logFileStream) return;

    try {
      this.logFileStream.end();

      // Move current log to archive
      const archiveFile = this.currentLogFile.replace(
        ".log",
        `-${Date.now()}.log`
      );
      fs.renameSync(this.currentLogFile, archiveFile);

      // Clean up old log files
      this.cleanupOldLogs();

      // Create new log file
      this.setupLogRotation();
    } catch (error) {
      console.error("Failed to rotate log file:", error);
    }
  }

  private cleanupOldLogs(): void {
    try {
      const files = fs
        .readdirSync(this.config.logFilePath)
        .filter((file) => file.startsWith("krapi-") && file.endsWith(".log"))
        .map((file) => ({
          name: file,
          path: path.join(this.config.logFilePath, file),
          mtime: fs.statSync(path.join(this.config.logFilePath, file)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Keep only the most recent files
      if (files.length > this.config.maxLogFiles) {
        files.slice(this.config.maxLogFiles).forEach((file) => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error("Failed to cleanup old logs:", error);
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.config.enableFileLogging || !this.logFileStream) return;

    try {
      const logLine = JSON.stringify(entry) + "\n";
      this.logFileStream.write(logLine);
      this.logFileSize += Buffer.byteLength(logLine, "utf8");

      // Rotate if file is too large
      if (this.logFileSize >= this.maxLogSizeBytes) {
        this.rotateLogFile();
      }
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsoleLogging) return;

    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const service = `[${entry.service}]`.padEnd(10);
    const message = entry.message;

    const logMessage = `${timestamp} ${level} ${service} ${message}`;

    switch (entry.level) {
      case "debug":
        console.debug(logMessage);
        break;
      case "info":
        console.info(logMessage);
        break;
      case "warn":
        console.warn(logMessage);
        break;
      case "error":
      case "fatal":
        console.error(logMessage);
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  private createLogEntry(
    level: LogEntry["level"],
    service: LogEntry["service"],
    message: string,
    data?: any,
    options?: Partial<LogEntry>
  ): LogEntry {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      data,
      stack: options?.stack,
      userId: options?.userId,
      projectId: options?.projectId,
      requestId: options?.requestId,
      duration: options?.duration,
    };
  }

  public log(
    level: LogEntry["level"],
    service: LogEntry["service"],
    message: string,
    data?: any,
    options?: Partial<LogEntry>
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, service, message, data, options);

    // Add to memory buffer (keep last 1000 entries)
    this.logs.push(entry);
    if (this.logs.length > 1000) {
      this.logs.shift();
    }

    // Write to outputs
    this.writeToConsole(entry);
    this.writeToFile(entry);

    // Emit event for real-time monitoring
    this.emit("log", entry);

    // Update metrics
    if (this.config.enableMetrics) {
      this.updateMetrics(entry);
    }
  }

  public debug(
    service: LogEntry["service"],
    message: string,
    data?: any,
    options?: Partial<LogEntry>
  ): void {
    this.log("debug", service, message, data, options);
  }

  public info(
    service: LogEntry["service"],
    message: string,
    data?: any,
    options?: Partial<LogEntry>
  ): void {
    this.log("info", service, message, data, options);
  }

  public warn(
    service: LogEntry["service"],
    message: string,
    data?: any,
    options?: Partial<LogEntry>
  ): void {
    this.log("warn", service, message, data, options);
  }

  public error(
    service: LogEntry["service"],
    message: string,
    data?: any,
    options?: Partial<LogEntry>
  ): void {
    this.log("error", service, message, data, options);
  }

  public fatal(
    service: LogEntry["service"],
    message: string,
    data?: any,
    options?: Partial<LogEntry>
  ): void {
    this.log("fatal", service, message, data, options);
  }

  private updateMetrics(entry: LogEntry): void {
    const key = `${entry.service}.${entry.level}`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
  }

  public getLogs(limit = 100, level?: string, service?: string): LogEntry[] {
    let filtered = this.logs;

    if (level) {
      filtered = filtered.filter((log) => log.level === level);
    }

    if (service) {
      filtered = filtered.filter((log) => log.service === service);
    }

    return filtered.slice(-limit);
  }

  public getMetrics(): Map<string, any> {
    return new Map(this.metrics);
  }

  public getSystemStatus(): {
    totalLogs: number;
    logFileSize: number;
    metrics: { [key: string]: number };
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    return {
      totalLogs: this.logs.length,
      logFileSize: this.logFileSize,
      metrics: Object.fromEntries(this.metrics),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  public clearLogs(): void {
    this.logs = [];
    this.metrics.clear();
  }

  public shutdown(): void {
    if (this.logFileStream) {
      this.logFileStream.end();
    }
  }
}

export default KrapiLogger;
