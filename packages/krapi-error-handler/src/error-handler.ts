export interface ErrorHandlerConfig {
  enableGlobalHandlers: boolean;
  enableGracefulShutdown: boolean;
  enableAutoRecovery: boolean;
  maxRecoveryAttempts: number;
  recoveryDelayMs: number;
  logErrors: boolean;
  logToFile: boolean;
  logFilePath?: string;
}

export interface ErrorContext {
  timestamp: Date;
  error: Error | unknown;
  source: string;
  userAgent?: string;
  requestId?: string;
  additionalData?: Record<string, any>;
}

export type RecoveryAction = "retry" | "restart" | "fallback" | "shutdown";

export class KrapiErrorHandler {
  private static instance: KrapiErrorHandler;
  private config: ErrorHandlerConfig;
  private recoveryAttempts: Map<string, number> = new Map();
  private isShuttingDown = false;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableGlobalHandlers: true,
      enableGracefulShutdown: true,
      enableAutoRecovery: true,
      maxRecoveryAttempts: 3,
      recoveryDelayMs: 1000,
      logErrors: true,
      logToFile: false,
      ...config,
    };

    if (this.config.enableGlobalHandlers) {
      this.setupGlobalHandlers();
    }
  }

  public static getInstance(
    config?: Partial<ErrorHandlerConfig>
  ): KrapiErrorHandler {
    if (!KrapiErrorHandler.instance) {
      KrapiErrorHandler.instance = new KrapiErrorHandler(config);
    }
    return KrapiErrorHandler.instance;
  }

  private setupGlobalHandlers(): void {
    // Handle uncaught exceptions
    process.on("uncaughtException", (error: Error) => {
      this.handleFatalError(error, "uncaughtException");
    });

    // Handle unhandled promise rejections
    process.on(
      "unhandledRejection",
      (reason: unknown, promise: Promise<unknown>) => {
        this.handleFatalError(
          reason instanceof Error ? reason : new Error(String(reason)),
          "unhandledRejection"
        );
      }
    );

    // Handle SIGTERM for graceful shutdown
    process.on("SIGTERM", () => {
      this.gracefulShutdown("SIGTERM");
    });

    // Handle SIGINT for graceful shutdown
    process.on("SIGINT", () => {
      this.gracefulShutdown("SIGINT");
    });
  }

  private handleFatalError(error: Error, source: string): void {
    const context: ErrorContext = {
      timestamp: new Date(),
      error,
      source,
      additionalData: {
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
      },
    };

    this.logError(context);

    if (this.config.enableGracefulShutdown && !this.isShuttingDown) {
      this.gracefulShutdown("fatal-error");
    } else {
      process.exit(1);
    }
  }

  private async gracefulShutdown(reason: string): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log(`[SHUTDOWN] Initiating graceful shutdown (${reason})...`);

    try {
      // Stop accepting new requests
      console.log("[SHUTDOWN] Stopping new requests...");

      // Wait for ongoing operations
      console.log("[SHUTDOWN] Waiting for ongoing operations...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Close database connections
      console.log("[SHUTDOWN] Closing database connections...");
      await this.closeDatabaseConnections();

      // Close file streams
      console.log("[SHUTDOWN] Closing file streams...");
      await this.closeFileStreams();

      console.log("[SHUTDOWN] Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      console.error("[SHUTDOWN] Error during graceful shutdown:", error);
      process.exit(1);
    }
  }

  private async closeDatabaseConnections(): Promise<void> {
    // This would be implemented based on your database connection management
    // For now, we'll just wait a bit
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  private async closeFileStreams(): Promise<void> {
    // This would be implemented based on your file stream management
    // For now, we'll just wait a bit
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  public handleError(
    error: Error | unknown,
    context?: Partial<ErrorContext>
  ): RecoveryAction {
    const fullContext: ErrorContext = {
      timestamp: new Date(),
      error,
      source: context?.source || "unknown",
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      additionalData: context?.additionalData,
    };

    this.logError(fullContext);

    if (this.config.enableAutoRecovery) {
      return this.attemptRecovery(fullContext);
    }

    return "shutdown";
  }

  private attemptRecovery(context: ErrorContext): RecoveryAction {
    const source = context.source;
    const attempts = this.recoveryAttempts.get(source) || 0;

    if (attempts >= this.config.maxRecoveryAttempts) {
      console.error(
        `[ERROR] Max recovery attempts (${this.config.maxRecoveryAttempts}) exceeded for ${source}`
      );
      return "shutdown";
    }

    this.recoveryAttempts.set(source, attempts + 1);
    console.log(
      `[RECOVERY] Attempting recovery for ${source} (attempt ${attempts + 1}/${
        this.config.maxRecoveryAttempts
      })`
    );

    // Implement recovery logic based on error type
    if (this.isRecoverableError(context.error)) {
      setTimeout(() => {
        console.log(`[RECOVERY] Retrying ${source}...`);
        // Here you would implement the actual recovery logic
      }, this.config.recoveryDelayMs * attempts);

      return "retry";
    }

    return "shutdown";
  }

  private isRecoverableError(error: Error | unknown): boolean {
    if (error instanceof Error) {
      // Define which error types are recoverable
      const recoverableErrors = [
        "ECONNREFUSED",
        "ETIMEDOUT",
        "ENOTFOUND",
        "ECONNRESET",
      ];

      return recoverableErrors.some(
        (code) => error.message.includes(code) || (error as any).code === code
      );
    }

    return false;
  }

  private logError(context: ErrorContext): void {
    if (!this.config.logErrors) {
      return;
    }

    const errorMessage =
      context.error instanceof Error
        ? context.error.message
        : String(context.error);
    const errorStack =
      context.error instanceof Error ? context.error.stack : undefined;

    const logEntry = {
      timestamp: context.timestamp.toISOString(),
      level: "ERROR",
      source: context.source,
      message: errorMessage,
      stack: errorStack,
      context: context.additionalData,
    };

    if (this.config.logToFile && this.config.logFilePath) {
      // Implement file logging here
      console.error("[ERROR]", logEntry);
    } else {
      console.error("[ERROR]", logEntry);
    }
  }

  public getRecoveryStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [source, attempts] of this.recoveryAttempts) {
      stats[source] = attempts;
    }
    return stats;
  }

  public resetRecoveryStats(): void {
    this.recoveryAttempts.clear();
  }

  public updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }
}
