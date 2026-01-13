/**
 * HTTP Request Queue Middleware
 *
 * Queues incoming HTTP requests to prevent server overload when too many
 * requests arrive simultaneously. This protects the server from being
 * overwhelmed by request floods.
 *
 * Features:
 * - Configurable max concurrent requests
 * - Configurable max queue size
 * - Priority support (can be extended)
 * - Automatic timeout handling
 * - Queue metrics
 *
 * @module middleware/request-queue.middleware
 */

import { Request, Response, NextFunction } from "express";

interface QueuedRequest {
  id: string;
  req: Request;
  res: Response;
  next: NextFunction;
  timestamp: number;
  priority: number;
  resolve: () => void;
  reject: (error: Error) => void;
}

interface RequestQueueConfig {
  maxConcurrent: number;
  maxQueueSize: number;
  requestTimeout: number;
  enablePriority: boolean;
}

interface RequestQueueMetrics {
  queueSize: number;
  activeRequests: number;
  totalProcessed: number;
  totalRejected: number;
  totalTimeouts: number;
}

/**
 * Create HTTP request queue middleware
 *
 * @param {Partial<RequestQueueConfig>} config - Queue configuration
 * @returns {Function} Express middleware function
 *
 * @example
 * const requestQueue = createRequestQueue({
 *   maxConcurrent: 100,
 *   maxQueueSize: 1000,
 *   requestTimeout: 30000
 * });
 * app.use('/krapi/k1', requestQueue);
 */
export function createRequestQueue(
  config: Partial<RequestQueueConfig> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const queueConfig: RequestQueueConfig = {
    maxConcurrent: parseInt(
      process.env.HTTP_QUEUE_MAX_CONCURRENT || "100"
    ),
    maxQueueSize: parseInt(process.env.HTTP_QUEUE_MAX_SIZE || "1000"),
    requestTimeout: parseInt(process.env.HTTP_QUEUE_TIMEOUT || "30000"), // 30 seconds
    enablePriority: process.env.HTTP_QUEUE_ENABLE_PRIORITY !== "false",
    ...config,
  };

  const queue: QueuedRequest[] = [];
  const activeRequests = new Set<string>();
  const metrics: RequestQueueMetrics = {
    queueSize: 0,
    activeRequests: 0,
    totalProcessed: 0,
    totalRejected: 0,
    totalTimeouts: 0,
  };

  // Process queue periodically
  const processQueue = (): void => {
    // Process up to maxConcurrent requests
    while (
      activeRequests.size < queueConfig.maxConcurrent &&
      queue.length > 0
    ) {
      const item = queue.shift();
      if (!item) {
        break;
      }

      // Check if request has timed out
      const waitTime = Date.now() - item.timestamp;
      if (waitTime > queueConfig.requestTimeout) {
        metrics.totalTimeouts++;
        item.reject(
          new Error(
            `Request timeout: waited ${waitTime}ms in queue (max: ${queueConfig.requestTimeout}ms)`
          )
        );
        continue;
      }

      // Mark as active
      activeRequests.add(item.id);
      metrics.activeRequests = activeRequests.size;
      metrics.queueSize = queue.length;

      // Process the request
      processRequest(item);
    }
  };

  // Process a single request
  const processRequest = (item: QueuedRequest): void => {
    // Set up response handlers to track completion
    let completed = false;

    const cleanup = (): void => {
      if (completed) return;
      completed = true;
      activeRequests.delete(item.id);
      metrics.activeRequests = activeRequests.size;
      metrics.totalProcessed++;
      metrics.queueSize = queue.length;

      // Process next items in queue
      if (queue.length > 0) {
        setImmediate(processQueue);
      }
    };

    // Handle response finish
    item.res.on("finish", cleanup);
    item.res.on("close", cleanup);

    // Handle errors
    const errorHandler = (error: Error): void => {
      cleanup();
      if (!item.res.headersSent) {
        item.res.status(500).json({
          success: false,
          error: "Request processing error",
          message: error.message,
        });
      }
    };

    item.req.on("error", errorHandler);

    // Process the request
    try {
      item.next();
    } catch (error) {
      errorHandler(error as Error);
    }
  };

  // Start queue processor (check every 50ms)
  const processorInterval = setInterval(processQueue, 50);

  // Cleanup on process exit
  process.on("SIGTERM", () => {
    clearInterval(processorInterval);
    // Reject all queued requests
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) {
        item.reject(new Error("Server shutting down"));
      }
    }
  });

  // Middleware function
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip queue for health checks
    if (req.path === "/health" || req.path === "/krapi/k1/health") {
      return next();
    }

    // Check if queue is full
    if (queue.length >= queueConfig.maxQueueSize) {
      metrics.totalRejected++;
      res.status(503).json({
        success: false,
        error: "Service temporarily unavailable",
        message: `Request queue is full (${queueConfig.maxQueueSize} items). Please try again later.`,
        retryAfter: 5, // seconds
      });
      return;
    }

    // If we have capacity, process immediately
    if (activeRequests.size < queueConfig.maxConcurrent) {
      const immediateId = `immediate-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      activeRequests.add(immediateId);
      metrics.activeRequests = activeRequests.size;

      const cleanup = (): void => {
        activeRequests.delete(immediateId);
        metrics.activeRequests = activeRequests.size;
        metrics.totalProcessed++;
        if (queue.length > 0) {
          setImmediate(processQueue);
        }
      };

      res.on("finish", cleanup);
      res.on("close", cleanup);
      return next();
    }

    // Otherwise, queue the request
    const queueItem: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      req,
      res,
      next,
      timestamp: Date.now(),
      priority: 0, // Can be extended to support priority headers
      resolve: () => {
        // Not used in current implementation
      },
      reject: (error: Error) => {
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            error: "Request queue error",
            message: error.message,
          });
        }
      },
    };

    queue.push(queueItem);
    metrics.queueSize = queue.length;

    // Set timeout for queued request
    setTimeout(() => {
      const index = queue.findIndex((item) => item.id === queueItem.id);
      if (index !== -1) {
        queue.splice(index, 1);
        metrics.totalTimeouts++;
        metrics.queueSize = queue.length;
        if (!res.headersSent) {
          res.status(504).json({
            success: false,
            error: "Request timeout",
            message: `Request timed out in queue after ${queueConfig.requestTimeout}ms`,
          });
        }
      }
    }, queueConfig.requestTimeout);

    // Try to process immediately
    setImmediate(processQueue);
  };
}

/**
 * Get request queue metrics
 * Can be exposed via an endpoint for monitoring
 */
export function getRequestQueueMetrics(): RequestQueueMetrics {
  // This would need to be connected to the actual queue instance
  // For now, return placeholder
  return {
    queueSize: 0,
    activeRequests: 0,
    totalProcessed: 0,
    totalRejected: 0,
    totalTimeouts: 0,
  };
}
