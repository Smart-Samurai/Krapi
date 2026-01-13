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
  private queue: QueueItem<unknown>[] = [];
  private activeOperations = new Set<string>(); // Track active operations by ID
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
      // Optimized defaults for production:
      // - maxConcurrent: 10 allows better database utilization
      // - rateLimitPerSecond: 100 ops/sec is safe for SQLite with proper indexing
      // - maxQueueSize: 5000 provides buffer for traffic spikes
      maxConcurrent: parseInt(process.env.DB_QUEUE_MAX_CONCURRENT || "10"), // Max 10 concurrent operations (increased from 5)
      rateLimitPerSecond: parseInt(process.env.DB_QUEUE_RATE_LIMIT || "100"), // 100 operations per second (increased from 50)
      maxQueueSize: parseInt(process.env.DB_QUEUE_MAX_SIZE || "5000"), // Max 5000 queued items (increased from 1000)
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
   * 
   * Sets up the database connection and starts the queue processor.
   * Must be called before enqueueing operations.
   * 
   * @param {DatabaseConnection} dbConnection - Database connection interface
   * @returns {Promise<void>}
   * @throws {Error} If queue is already initialized
   * 
   * @example
   * await queue.initialize(dbConnection);
   * // Queue is now ready to process operations
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
   * 
   * Adds a database operation to the queue for processing. Operations are
   * processed in FIFO order by default, or priority order if priority is enabled.
   * 
   * @template T
   * @param {Function} operation - Database operation function
   * @param {number} [priority=0] - Operation priority (higher = processed first)
   * @returns {Promise<T>} Result of the database operation
   * @throws {Error} If queue is not initialized
   * @throws {Error} If queue is full
   * 
   * @example
   * const result = await queue.enqueue(async (db) => {
   *   return await db.query('SELECT * FROM users');
   * });
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
          this.queue.push(item as QueueItem<unknown>);
        } else {
          this.queue.splice(insertIndex, 0, item as QueueItem<unknown>);
        }
      } else {
        // FIFO - add to end
        this.queue.push(item as QueueItem<unknown>);
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
   * Now supports true concurrent operations up to maxConcurrent
   */
  private async processQueue(): Promise<void> {
    if (!this.dbConnection || this.queue.length === 0) {
      return;
    }

    // Refill rate limiter tokens
    this.refillRateLimiterTokens();

    // Process multiple items concurrently up to maxConcurrent
    while (this.activeOperations.size < this.config.maxConcurrent && this.queue.length > 0) {
      // Check rate limit
      if (this.rateLimiter.tokens <= 0) {
        break; // Wait for tokens to refill
      }

      // Get next item from queue (highest priority first, or FIFO)
      const item = this.queue.shift();
      if (!item) {
        break;
      }

      // Consume a token
      this.rateLimiter.tokens--;

      // Start processing the item (non-blocking)
      this.processItem(item).catch((error) => {
        console.error("Error processing queue item:", error);
      });
    }
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: QueueItem<unknown>): Promise<void> {
    // Mark as active
    this.activeOperations.add(item.id);
    const processStartTime = Date.now();

    try {
      const result = await item.operation(this.dbConnection!);
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
      // Remove from active operations
      this.activeOperations.delete(item.id);
      // Trigger processing of next items if queue has items
      if (this.queue.length > 0) {
        // Use setImmediate to avoid blocking
        setImmediate(() => {
          this.processQueue().catch((error) => {
            console.error("Queue processor error:", error);
          });
        });
      }
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
  /**
   * Get queue metrics for monitoring
   * 
   * Returns comprehensive metrics about the queue including size, processing
   * statistics, wait times, and error counts.
   * 
   * @returns {QueueMetrics} Queue metrics object
   * 
   * @example
   * const metrics = queue.getMetrics();
   * console.log(`Queue size: ${metrics.queueSize}`);
   * console.log(`Total processed: ${metrics.totalProcessed}`);
   * console.log(`Average wait time: ${metrics.averageWaitTime}ms`);
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
      processingCount: this.activeOperations.size,
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
    return this.activeOperations.size > 0;
  }

  /**
   * Shutdown the queue gracefully
   */
  async shutdown(): Promise<void> {
    this.stopProcessor();

    // Wait for all active operations to complete
    while (this.activeOperations.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Clear remaining queue
    this.clearQueue();
  }
}
