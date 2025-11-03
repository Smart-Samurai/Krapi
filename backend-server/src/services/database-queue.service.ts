/**
 * Database Operation Queue Service
 *
 * This service implements a FIFO queue for database operations to prevent overload
 * and ensure all requests are processed in order. It includes:
 *
 * 1. Request queuing - All database operations are queued and processed sequentially
 * 2. Rate limiting - Controls the rate of database operations to prevent overload
 * 3. Priority handling - Important operations can be prioritized
 * 4. Monitoring - Tracks queue size, processing time, and errors
 *
 * Usage:
 * ```typescript
 * const queue = DatabaseQueue.getInstance();
 * await queue.initialize();
 * const result = await queue.enqueue((db) => db.query('SELECT * FROM users'));
 * ```
 */

interface QueueItem<T = unknown> {
  id: string;
  operation: (db: DatabaseConnection) => Promise<T>;
  priority: number; // Higher number = higher priority
  timestamp: number;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

interface DatabaseConnection {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;
  connect?: () => Promise<void>;
  end?: () => Promise<void>;
}

export interface QueueMetrics {
  queueSize: number;
  processingCount: number;
  totalProcessed: number;
  totalErrors: number;
  averageWaitTime: number;
  averageProcessTime: number;
  queueItems: Array<{
    id: string;
    priority: number;
    timestamp: number;
  }>;
}

export class DatabaseQueue {
  private static instance: DatabaseQueue;
  private queue: QueueItem[] = [];
  private processing = false;
  private dbConnection: DatabaseConnection | null = null;
  private config: {
    maxConcurrent: number;
    rateLimitPerSecond: number;
    maxQueueSize: number;
    enablePriority: boolean;
  };
  private metrics: {
    totalProcessed: number;
    totalErrors: number;
    waitTimes: number[];
    processTimes: number[];
    lastProcessTime: number | null;
  };
  private rateLimiter: {
    tokens: number;
    lastRefill: number;
  };
  private processorInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      maxConcurrent: parseInt(process.env.DB_QUEUE_MAX_CONCURRENT || "5"), // Max 5 concurrent operations
      rateLimitPerSecond: parseInt(process.env.DB_QUEUE_RATE_LIMIT || "50"), // 50 operations per second
      maxQueueSize: parseInt(process.env.DB_QUEUE_MAX_SIZE || "1000"), // Max 1000 queued items
      enablePriority: process.env.DB_QUEUE_ENABLE_PRIORITY !== "false",
    };

    this.metrics = {
      totalProcessed: 0,
      totalErrors: 0,
      waitTimes: [],
      processTimes: [],
      lastProcessTime: null,
    };

    this.rateLimiter = {
      tokens: this.config.rateLimitPerSecond,
      lastRefill: Date.now(),
    };
  }

  static getInstance(): DatabaseQueue {
    if (!DatabaseQueue.instance) {
      DatabaseQueue.instance = new DatabaseQueue();
    }
    return DatabaseQueue.instance;
  }

  /**
   * Initialize the queue with a database connection
   */
  async initialize(dbConnection: DatabaseConnection): Promise<void> {
    if (this.dbConnection) {
      throw new Error("Database queue already initialized");
    }

    this.dbConnection = dbConnection;

    // Start processing queue
    this.startProcessor();

    console.log("? Database queue initialized", {
      maxConcurrent: this.config.maxConcurrent,
      rateLimitPerSecond: this.config.rateLimitPerSecond,
      maxQueueSize: this.config.maxQueueSize,
    });
  }

  /**
   * Enqueue a database operation
   * Operations are processed in FIFO order (or priority order if enabled)
   */
  async enqueue<T>(
    operation: (db: DatabaseConnection) => Promise<T>,
    priority = 0
  ): Promise<T> {
    if (!this.dbConnection) {
      throw new Error("Database queue not initialized. Call initialize() first.");
    }

    // Check if queue is full
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error(
        `Database queue is full (${this.config.maxQueueSize} items). Please try again later.`
      );
    }

    const enqueueTime = Date.now();

    return new Promise<T>((resolve, reject) => {
      const item: QueueItem<T> = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        operation: operation as (db: DatabaseConnection) => Promise<T>,
        priority,
        timestamp: enqueueTime,
        resolve,
        reject,
      };

      // Insert based on priority (higher priority = first)
      if (this.config.enablePriority && priority > 0) {
        const insertIndex = this.queue.findIndex((q) => q.priority < priority);
        if (insertIndex === -1) {
          this.queue.push(item);
        } else {
          this.queue.splice(insertIndex, 0, item);
        }
      } else {
        // FIFO - add to end
        this.queue.push(item);
      }

      // Calculate wait time when processed
      const originalResolve = item.resolve;
      item.resolve = (value: T | PromiseLike<T>) => {
        const waitTime = Date.now() - enqueueTime;
        this.metrics.waitTimes.push(waitTime);
        // Keep only last 1000 wait times for average calculation
        if (this.metrics.waitTimes.length > 1000) {
          this.metrics.waitTimes.shift();
        }
        originalResolve(value);
      };
    });
  }

  /**
   * Start the queue processor
   */
  private startProcessor(): void {
    if (this.processorInterval) {
      return; // Already running
    }

    // Process queue every 50ms for responsiveness
    this.processorInterval = setInterval(() => {
      this.processQueue().catch((error) => {
        console.error("Queue processor error:", error);
      });
    }, 50);
  }

  /**
   * Stop the queue processor
   */
  stopProcessor(): void {
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
      this.processorInterval = null;
    }
  }

  /**
   * Process items from the queue
   */
  private async processQueue(): Promise<void> {
    if (!this.dbConnection || this.queue.length === 0) {
      return;
    }

    // Refill rate limiter tokens
    this.refillRateLimiterTokens();

    // Check if we can process more items
    const currentlyProcessing = this.processing ? 1 : 0;
    if (currentlyProcessing >= this.config.maxConcurrent) {
      return;
    }

    // Check rate limit
    if (this.rateLimiter.tokens <= 0) {
      return; // Wait for tokens to refill
    }

    // Get next item from queue (highest priority first, or FIFO)
    const item = this.queue.shift();
    if (!item) {
      return;
    }

    // Consume a token
    this.rateLimiter.tokens--;

    // Process the item
    this.processing = true;
    const processStartTime = Date.now();

    try {
      const result = await item.operation(this.dbConnection);
      const processTime = Date.now() - processStartTime;
      this.metrics.processTimes.push(processTime);
      // Keep only last 1000 process times
      if (this.metrics.processTimes.length > 1000) {
        this.metrics.processTimes.shift();
      }
      this.metrics.totalProcessed++;
      this.metrics.lastProcessTime = Date.now();
      item.resolve(result);
    } catch (error) {
      this.metrics.totalErrors++;
      item.reject(error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Refill rate limiter tokens based on time elapsed
   */
  private refillRateLimiterTokens(): void {
    const now = Date.now();
    const timeElapsed = (now - this.rateLimiter.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = Math.floor(timeElapsed * this.config.rateLimitPerSecond);

    if (tokensToAdd > 0) {
      this.rateLimiter.tokens = Math.min(
        this.config.rateLimitPerSecond,
        this.rateLimiter.tokens + tokensToAdd
      );
      this.rateLimiter.lastRefill = now;
    }
  }

  /**
   * Get current queue metrics
   */
  getMetrics(): QueueMetrics {
    const averageWaitTime =
      this.metrics.waitTimes.length > 0
        ? this.metrics.waitTimes.reduce((a, b) => a + b, 0) / this.metrics.waitTimes.length
        : 0;

    const averageProcessTime =
      this.metrics.processTimes.length > 0
        ? this.metrics.processTimes.reduce((a, b) => a + b, 0) /
          this.metrics.processTimes.length
        : 0;

    return {
      queueSize: this.queue.length,
      processingCount: this.processing ? 1 : 0,
      totalProcessed: this.metrics.totalProcessed,
      totalErrors: this.metrics.totalErrors,
      averageWaitTime: Math.round(averageWaitTime),
      averageProcessTime: Math.round(averageProcessTime),
      queueItems: this.queue.map((item) => ({
        id: item.id,
        priority: item.priority,
        timestamp: item.timestamp,
      })),
    };
  }

  /**
   * Clear the queue (use with caution)
   */
  clearQueue(): void {
    // Reject all pending items
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        item.reject(new Error("Queue was cleared"));
      }
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is processing
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Shutdown the queue gracefully
   */
  async shutdown(): Promise<void> {
    this.stopProcessor();

    // Wait for current operation to complete
    while (this.processing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Clear remaining queue
    this.clearQueue();
  }
}
