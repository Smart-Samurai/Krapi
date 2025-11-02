/**
 * KRAPI Plug and Socket Example
 *
 * This example demonstrates the perfect fit between client (plug) and server (socket).
 * The EXACT same methods work in both environments with identical interfaces.
 */

import { DatabaseConnection, Logger } from "./core";
import { krapi } from "./krapi";

/**
 * Business Logic Class - Works Identically in Both Environments
 *
 * This class can be used in both client and server applications
 * without any changes, demonstrating perfect plug/socket compatibility.
 */
export class TaskManager {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Setup task collection if it doesn't exist
   */
  async setup() {
    try {
      // Check if collection exists
      await krapi.collections.get(this.projectId, "tasks");
    } catch {
      // Collection doesn't exist, create it
      await krapi.collections.create(this.projectId, {
        name: "tasks",
        description: "Task management collection",
        fields: [
          { name: "title", type: "string", required: true },
          { name: "description", type: "text" },
          { name: "status", type: "string", default: "pending" },
          { name: "priority", type: "string", default: "medium" },
          { name: "assignee_id", type: "uuid" },
          { name: "due_date", type: "date" },
          { name: "created_at", type: "timestamp", default: "now()" },
          { name: "completed_at", type: "timestamp" },
          { name: "tags", type: "json", default: [] },
        ],
        indexes: [
          { name: "status_idx", fields: ["status"] },
          { name: "assignee_idx", fields: ["assignee_id"] },
          { name: "due_date_idx", fields: ["due_date"] },
        ],
      });
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData: {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    assignee_id?: string;
    due_date?: string;
    tags?: string[];
  }) {
    // Same method call works in both environments
    return krapi.documents.create(this.projectId, "tasks", {
      data: {
        ...taskData,
        status: "pending",
        created_at: new Date().toISOString(),
        tags: taskData.tags || [],
      },
    });
  }

  /**
   * Get all tasks with filtering
   */
  async getTasks(filter?: {
    status?: string;
    assignee_id?: string;
    priority?: string;
  }) {
    // Same method call works in both environments
    return krapi.documents.getAll(this.projectId, "tasks", {
      filter: filter || {},
    });
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: string) {
    return krapi.documents.update(this.projectId, "tasks", taskId, {
      data: {
        status,
        ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
      },
    });
  }

  /**
   * Get task statistics
   */
  async getStatistics() {
    const allTasks = await this.getTasks();
    const total = allTasks.length;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const task of allTasks) {
      const status = (task.data as Record<string, unknown>).status as string;
      const priority = (task.data as Record<string, unknown>).priority as string;

      byStatus[status] = (byStatus[status] || 0) + 1;
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    }

    return {
      total,
      by_status: byStatus,
      by_priority: byPriority,
    };
  }
}

/**
 * CLIENT USAGE EXAMPLE (The Plug)
 *
 * This shows how to use the TaskManager in a client application
 */
export async function clientExample(logger?: Logger) {
  if (logger) {
    logger.info("=== CLIENT EXAMPLE (The Plug) ===");
  }

  // Connect to KRAPI backend via HTTP
  await krapi.connect({
    endpoint: "https://api.myapp.com/krapi/k1",
    apiKey: "your-client-api-key",
  });

  if (logger) {
    logger.info(`Connected in ${krapi.getMode()} mode`);
  }

  // Create a project
  const project = await krapi.projects.create({
    name: "Client Task Project",
    description: "Created from client application",
  });

  // Use TaskManager - works perfectly
  const taskManager = new TaskManager(project.id);
  await taskManager.setup();

  // Create some tasks
  const task1 = await taskManager.createTask({
    title: "Setup CI/CD Pipeline",
    description: "Configure automated testing and deployment",
    priority: "high",
    due_date: "2024-02-01",
    tags: ["devops", "automation"],
  });

  const task2 = await taskManager.createTask({
    title: "Design User Interface",
    description: "Create mockups and wireframes",
    priority: "medium",
    due_date: "2024-02-15",
    tags: ["design", "ui"],
  });

  if (logger) {
    logger.info(`Tasks created via HTTP: [${task1.id}, ${task2.id}]`);
  }

  // Get all tasks
  const allTasks = await taskManager.getTasks();
  if (logger) {
    logger.info(`All tasks via HTTP: ${allTasks.length}`);
  }

  // Update task status
  await taskManager.updateTaskStatus(task1.id, "in_progress");
  if (logger) {
    logger.info("Task status updated via HTTP");
  }

  // Get statistics
  const stats = await taskManager.getStatistics();
  if (logger) {
    logger.info(`Task statistics via HTTP: ${JSON.stringify(stats)}`);
  }

  return { project, tasks: [task1, task2], stats };
}

/**
 * SERVER USAGE EXAMPLE (The Socket)
 *
 * This shows how to use the EXACT SAME TaskManager in a server application
 */
export async function serverExample(databaseConnection: DatabaseConnection, logger?: Logger) {
  if (logger) {
    logger.info("=== SERVER EXAMPLE (The Socket) ===");
  }

  // Connect to database directly
  await krapi.connect({
    database: databaseConnection,
    logger: logger || undefined,
  });

  if (logger) {
    logger.info(`Connected in ${krapi.getMode()} mode`);
  }

  // Create a project - SAME METHOD as client
  const project = await krapi.projects.create({
    name: "Server Task Project",
    description: "Created from server application",
  });

  // Use TaskManager - EXACT SAME CODE as client
  const taskManager = new TaskManager(project.id);
  await taskManager.setup();

  // Create some tasks - IDENTICAL to client
  const task1 = await taskManager.createTask({
    title: "Optimize Database Queries",
    description: "Review and optimize slow queries",
    priority: "high",
    due_date: "2024-02-03",
    tags: ["performance", "database"],
  });

  const task2 = await taskManager.createTask({
    title: "Add Caching Layer",
    description: "Implement Redis caching",
    priority: "medium",
    due_date: "2024-02-10",
    tags: ["performance", "caching"],
  });

  if (logger) {
    logger.info(`Tasks created via database: [${task1.id}, ${task2.id}]`);
  }

  // Get all tasks - SAME METHOD as client
  const allTasks = await taskManager.getTasks();
  if (logger) {
    logger.info(`All tasks via database: ${allTasks.length}`);
  }

  // Update task status - IDENTICAL to client
  await taskManager.updateTaskStatus(task1.id, "completed");
  if (logger) {
    logger.info("Task status updated via database");
  }

  // Get statistics - SAME CODE as client
  const stats = await taskManager.getStatistics();
  if (logger) {
    logger.info(`Task statistics via database: ${JSON.stringify(stats)}`);
  }

  return { project, tasks: [task1, task2], stats };
}

/**
 * SHARED BUSINESS LOGIC EXAMPLE
 *
 * This function works with either client or server setup
 */
export async function sharedBusinessLogic(projectId: string, logger?: Logger) {
  if (logger) {
    logger.info("=== SHARED BUSINESS LOGIC ===");
    logger.info(`Running in ${krapi.getMode()} mode`);
  }

  const taskManager = new TaskManager(projectId);

  // This works regardless of connection mode!
  const urgentTasks = await taskManager.getTasks({
    priority: "high",
    status: "pending",
  });

  if (logger) {
    logger.info(`Found ${urgentTasks.length} urgent tasks`);
  }

  // Process urgent tasks
  for (const task of urgentTasks) {
    await taskManager.updateTaskStatus(task.id, "in_progress");
    if (logger) {
      logger.info(`Started work on: ${task.data.title}`);
    }
  }

  return urgentTasks;
}

/**
 * PERFECT PLUG AND SOCKET DEMONSTRATION
 *
 * This shows how the same interface works seamlessly
 */
export async function demonstratePerfectFit(logger?: Logger) {
  if (logger) {
    logger.info("=== PERFECT PLUG AND SOCKET DEMONSTRATION ===\n");
  }

  // The interface is IDENTICAL regardless of environment
  const methods = [
    "krapi.connect()",
    "krapi.projects.create()",
    "krapi.collections.create()",
    "krapi.documents.create()",
    "krapi.documents.getAll()",
    "krapi.documents.update()",
    "krapi.getMode()",
    "krapi.close()",
  ];

  if (logger) {
    logger.info("Methods that work IDENTICALLY in both client and server:");
    methods.forEach((method, index) => {
      logger?.info(`${index + 1}. ${method}`);
    });

    logger.info(
      "\n? PERFECT FIT: Every client method has an exact server counterpart"
    );
    logger.info("? SAME INTERFACE: No code changes needed between environments");
    logger.info("? TYPE SAFETY: Full TypeScript support in both modes");
    logger.info("? BUSINESS LOGIC: Share code between frontend and backend");
  }

  return {
    message: "Client (plug) and Server (socket) fit together perfectly!",
    identical_methods: methods.length,
    environments_supported: ["client", "server"],
    type_safety: true,
    shared_business_logic: true,
  };
}
