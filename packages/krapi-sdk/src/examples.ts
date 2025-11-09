/**
 * KRAPI SDK Usage Examples
 * 
 * This file contains comprehensive examples of how to use the KRAPI SDK
 * in both frontend and backend environments.
 * 
 * @module examples
 * @example
 * import { frontendExample1, backendExample1 } from './examples';
 * await frontendExample1(console);
 */
import { DatabaseConnection, Logger } from "./core";
import { krapi, KrapiWrapper, KrapiConfig } from "./krapi";

/**
 * FRONTEND USAGE EXAMPLES
 * 
 * These examples show how to use the SDK in a frontend application
 * to connect to a KRAPI backend via HTTP API.
 */

/**
 * Frontend Example 1: Basic setup and authentication
 * 
 * Demonstrates basic frontend setup, authentication, and project creation.
 * 
 * @param {Logger} [logger] - Optional logger instance
 * @returns {Promise<string>} Created project ID
 * 
 * @example
 * const projectId = await frontendExample1(console);
 */
// Example 1: Basic frontend setup and authentication
export async function frontendExample1(logger?: Logger) {
  // Connect to KRAPI for frontend use
  await krapi.connect({
    endpoint: "https://api.myapp.com/krapi/k1",
  });

  try {
    // Authenticate with API key and get session
    const session = await krapi.auth.createSession("your-api-key");
    if (logger) {
      logger.info(`Authenticated! Session expires at: ${session.expires_at}`);
    }

    // Session token is automatically set for subsequent requests

    // Create a project
    const project = await krapi.projects.create({
      name: "My Task Manager",
      description: "A simple task management application",
      settings: {
        timezone: "UTC",
        theme: "light",
      },
    });
    if (logger) {
      logger.info(`Project created: ${JSON.stringify(project)}`);
    }

    return project.id;
  } catch (error) {
    if (logger) {
      logger.error("Frontend example 1 failed:", error);
    }
    throw error;
  }
}

/**
 * Frontend Example 2: Creating collections and managing documents
 * 
 * Demonstrates collection creation, document management, and querying.
 * 
 * @param {string} projectId - Project ID
 * @param {Logger} [logger] - Optional logger instance
 * @returns {Promise<Object>} Created collection and documents
 * 
 * @example
 * const result = await frontendExample2('project-id', console);
 */
// Example 2: Creating collections and managing documents
export async function frontendExample2(projectId: string, logger?: Logger) {
  // Connect to KRAPI for frontend use with API key
  await krapi.connect({
    endpoint: "https://api.myapp.com/krapi/k1",
    apiKey: "your-api-key", // Can also set API key during initialization
  });

  try {
    // Create a tasks collection
    const tasksCollection = await krapi.collections.create(projectId, {
      name: "tasks",
      description: "Task management collection",
      fields: [
        { name: "title", type: "string", required: true },
        { name: "description", type: "text" },
        { name: "status", type: "string", default: "pending" },
        { name: "priority", type: "string", default: "medium" },
        { name: "due_date", type: "date" },
        { name: "completed", type: "boolean", default: false },
        { name: "assignee_id", type: "uuid" },
        { name: "tags", type: "json", default: [] },
      ],
      indexes: [
        { name: "status_index", fields: ["status"] },
        { name: "assignee_index", fields: ["assignee_id"] },
        { name: "due_date_index", fields: ["due_date"] },
      ],
    });
    if (logger) {
      logger.info(`Tasks collection created: ${JSON.stringify(tasksCollection)}`);
    }

    // Create some tasks
    const task1 = await krapi.documents.create(projectId, "tasks", {
      data: {
        title: "Setup project structure",
        description:
          "Create the basic folder structure and configuration files",
        status: "in_progress",
        priority: "high",
        due_date: "2024-02-01",
        tags: ["setup", "infrastructure"],
      },
      created_by: "user-123",
    });

    const task2 = await krapi.documents.create(projectId, "tasks", {
      data: {
        title: "Design user interface",
        description: "Create mockups and wireframes for the main interface",
        status: "pending",
        priority: "medium",
        due_date: "2024-02-15",
        tags: ["design", "ui"],
      },
      created_by: "user-123",
    });

    if (logger) {
      logger.info(`Tasks created: ${JSON.stringify([task1, task2])}`);
    }

    // Get all tasks
    const allTasks = await krapi.documents.getAll(projectId, "tasks");
    if (logger) {
      logger.info(`All tasks: ${JSON.stringify(allTasks)}`);
    }

    // Update a task
    const updatedTask = await krapi.documents.update(
      projectId,
      "tasks",
      task1.id,
      {
        data: {
          status: "completed",
          completed: true,
        },
        updated_by: "user-123",
      }
    );
    if (logger) {
      logger.info(`Updated task: ${JSON.stringify(updatedTask)}`);
    }

    // Search tasks by status
    const inProgressTasks = await krapi.documents.getAll(projectId, "tasks", {
      filter: { status: "in_progress" },
    });
    if (logger) {
      logger.info(`In progress tasks: ${JSON.stringify(inProgressTasks)}`);
    }

    return { tasksCollection, tasks: [task1, task2] };
  } catch (error) {
    if (logger) {
      logger.error("Frontend example 2 failed:", error);
    }
    throw error;
  }
}

// Example 3: Advanced frontend operations
export async function frontendExample3(projectId: string, logger?: Logger) {
  // Connect to KRAPI for frontend use
  await krapi.connect({
    endpoint: "https://api.myapp.com/krapi/k1",
  });

  // First authenticate
  await krapi.auth.createSession("your-api-key");

  try {
    // Get project statistics
    const stats = await krapi.projects.getStatistics(projectId);
    if (logger) {
      logger.info(`Project statistics: ${JSON.stringify(stats)}`);
    }

    // Create a users collection for team management
    const usersCollection = await krapi.collections.create(projectId, {
      name: "team_members",
      description: "Team members and their roles",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "email", type: "string", required: true, unique: true },
        { name: "role", type: "string", default: "member" },
        { name: "avatar_url", type: "string" },
        { name: "skills", type: "json", default: [] },
        { name: "joined_date", type: "date", default: "NOW()" },
        { name: "is_active", type: "boolean", default: true },
      ],
      indexes: [
        { name: "email_unique", fields: ["email"], unique: true },
        { name: "role_index", fields: ["role"] },
      ],
    });

    // Add team members
    const members = await Promise.all([
      krapi.documents.create(projectId, "team_members", {
        data: {
          name: "Alice Johnson",
          email: "alice@company.com",
          role: "admin",
          skills: ["javascript", "react", "node.js"],
        },
      }),
      krapi.documents.create(projectId, "team_members", {
        data: {
          name: "Bob Smith",
          email: "bob@company.com",
          role: "developer",
          skills: ["python", "django", "postgresql"],
        },
      }),
      krapi.documents.create(projectId, "team_members", {
        data: {
          name: "Carol Davis",
          email: "carol@company.com",
          role: "designer",
          skills: ["figma", "photoshop", "ux"],
        },
      }),
    ]);

    if (logger) {
      logger.info(`Team members added: ${JSON.stringify(members)}`);
    }

    // Get all collections in the project
    const allCollections = await krapi.collections.getAll(projectId);
    if (logger) {
      logger.info(`All collections: ${JSON.stringify(allCollections)}`);
    }

    return { usersCollection, members };
  } catch (error) {
    if (logger) {
      logger.error("Frontend example 3 failed:", error);
    }
    throw error;
  }
}

/**
 * BACKEND USAGE EXAMPLES
 *
 * These examples show how to use the SDK in a backend application
 * with direct database access.
 */

// Example 4: Backend setup with database connection
export async function backendExample1(databaseConnection: DatabaseConnection, logger?: Logger) {
  // Connect to KRAPI for backend use with database
  const config: KrapiConfig = {
    database: databaseConnection,
  };
  if (logger !== undefined) {
    config.logger = logger;
  }
  await krapi.connect(config);

  try {
    // Perform database health check
    const health = await krapi.database.healthCheck();
    if (logger) {
      logger.info(`Database health: ${JSON.stringify(health)}`);
    }

    // Auto-fix any database issues
    const autoFixResults = await krapi.database.autoFix();
    if (logger) {
      logger.info(`Auto-fix results: ${JSON.stringify(autoFixResults)}`);
    }

    // Validate schema
    const schemaValidation = await krapi.database.validateSchema();
    if (logger) {
      logger.info(`Schema validation: ${JSON.stringify(schemaValidation)}`);
    }

    // Create a project directly in database
    const project = await krapi.projects.create({
      name: "Backend Project",
      description: "Created directly via database SDK",
      settings: {
        environment: "production",
        auto_backup: true,
      },
    });

    if (logger) {
      logger.info(`Project created via database: ${JSON.stringify(project)}`);
    }
    return project.id;
  } catch (error) {
    if (logger) {
      logger.error("Backend example 1 failed:", error);
    }
    throw error;
  }
}

// Example 5: Complex backend operations
export async function backendExample2(
  databaseConnection: DatabaseConnection,
  projectId: string,
  logger?: Logger
) {
  // Connect to KRAPI for backend use with database
  const config: KrapiConfig = {
    database: databaseConnection,
  };
  if (logger !== undefined) {
    config.logger = logger;
  }
  await krapi.connect(config);

  try {
    // Create multiple collections with relationships
    const blogsCollection = await krapi.collections.create(projectId, {
      name: "blog_posts",
      description: "Blog posts with full content",
      fields: [
        { name: "title", type: "string", required: true },
        { name: "slug", type: "string", required: true, unique: true },
        { name: "content", type: "text", required: true },
        { name: "excerpt", type: "text" },
        { name: "author_id", type: "uuid", required: true },
        { name: "category_id", type: "uuid" },
        { name: "tags", type: "json", default: [] },
        { name: "status", type: "string", default: "draft" },
        { name: "featured_image", type: "string" },
        { name: "published_at", type: "timestamp" },
        { name: "view_count", type: "integer", default: 0 },
        { name: "likes_count", type: "integer", default: 0 },
      ],
      indexes: [
        { name: "slug_unique", fields: ["slug"], unique: true },
        { name: "author_index", fields: ["author_id"] },
        { name: "category_index", fields: ["category_id"] },
        { name: "status_index", fields: ["status"] },
        { name: "published_date_index", fields: ["published_at"] },
      ],
    });

    const commentsCollection = await krapi.collections.create(projectId, {
      name: "blog_comments",
      description: "Comments on blog posts",
      fields: [
        { name: "post_id", type: "uuid", required: true },
        { name: "parent_comment_id", type: "uuid" }, // For nested comments
        { name: "author_name", type: "string", required: true },
        { name: "author_email", type: "string", required: true },
        { name: "content", type: "text", required: true },
        { name: "status", type: "string", default: "pending" },
        { name: "ip_address", type: "string" },
        { name: "user_agent", type: "text" },
      ],
      indexes: [
        { name: "post_index", fields: ["post_id"] },
        { name: "parent_comment_index", fields: ["parent_comment_id"] },
        { name: "status_index", fields: ["status"] },
      ],
    });

    if (logger) {
      logger.info(`Blog collections created: ${JSON.stringify({
        blogsCollection,
        commentsCollection,
      })}`);
    }

    // Create sample blog posts
    const blogPosts = await Promise.all([
      krapi.documents.create(projectId, "blog_posts", {
        data: {
          title: "Getting Started with KRAPI",
          slug: "getting-started-with-krapi",
          content: "KRAPI is a powerful backend-as-a-service platform...",
          excerpt: "Learn how to build applications quickly with KRAPI",
          author_id: "author-1",
          status: "published",
          tags: ["tutorial", "getting-started", "krapi"],
          published_at: new Date().toISOString(),
        },
        created_by: "system",
      }),
      krapi.documents.create(projectId, "blog_posts", {
        data: {
          title: "Advanced Database Operations",
          slug: "advanced-database-operations",
          content:
            "Deep dive into complex database queries and optimizations...",
          excerpt: "Master advanced database techniques",
          author_id: "author-2",
          status: "published",
          tags: ["advanced", "database", "optimization"],
          published_at: new Date().toISOString(),
        },
        created_by: "system",
      }),
    ]);

    // Add comments to the first blog post
    const comments = await Promise.all([
      krapi.documents.create(projectId, "blog_comments", {
        data: {
          post_id: blogPosts[0].id,
          author_name: "John Doe",
          author_email: "john@example.com",
          content: "Great tutorial! Very helpful for beginners.",
          status: "approved",
        },
      }),
      krapi.documents.create(projectId, "blog_comments", {
        data: {
          post_id: blogPosts[0].id,
          author_name: "Jane Smith",
          author_email: "jane@example.com",
          content:
            "Thanks for sharing this. Looking forward to more tutorials.",
          status: "approved",
        },
      }),
    ]);

    // Get all blog posts with their comment counts
    const postsWithComments = await krapi.documents.getAll(
      projectId,
      "blog_posts"
    );

    if (logger) {
      logger.info(`Blog system created: ${JSON.stringify({
        posts: postsWithComments,
        comments,
      })}`);
    }

    return { blogPosts, comments };
  } catch (error) {
    if (logger) {
      logger.error("Backend example 2 failed:", error);
    }
    throw error;
  }
}

/**
 * HYBRID USAGE EXAMPLES
 *
 * These examples show how to use the same SDK methods
 * across different environments seamlessly.
 */

// Example 6: Shared business logic that works in both environments
export class TaskManager {
  private krapi: KrapiWrapper;

  constructor(krapiClient: KrapiWrapper) {
    this.krapi = krapiClient;
  }

  async createTaskList(
    projectId: string,
    listName: string,
    tasks: Array<{
      title: string;
      description?: string;
      priority?: "low" | "medium" | "high";
      due_date?: string;
    }>
  ) {
    // Create tasks collection if it doesn't exist
    let collection;
    try {
      collection = await this.krapi.collections.get(projectId, "tasks");
    } catch {
      // Collection doesn't exist, create it
      collection = await this.krapi.collections.create(projectId, {
        name: "tasks",
        description: "Task management",
        fields: [
          { name: "title", type: "string", required: true },
          { name: "description", type: "text" },
          { name: "priority", type: "string", default: "medium" },
          { name: "status", type: "string", default: "pending" },
          { name: "due_date", type: "date" },
          { name: "list_name", type: "string" },
          { name: "completed", type: "boolean", default: false },
        ],
      });
    }

    // Create all tasks
    const createdTasks = await Promise.all(
      tasks.map((task) =>
        this.krapi.documents.create(projectId, "tasks", {
          data: {
            ...task,
            list_name: listName,
            status: "pending",
          },
        })
      )
    );

    return {
      collection,
      tasks: createdTasks,
      list_name: listName,
    };
  }

  async getTasksByStatus(projectId: string, status: string) {
    return this.krapi.documents.getAll(projectId, "tasks", {
      filter: { status } as Record<string, unknown>,
    });
  }

  async completeTask(projectId: string, taskId: string, completedBy?: string) {
    const updateData: {
      data: Record<string, unknown>;
      updated_by?: string;
    } = {
      data: {
        status: "completed",
        completed: true,
        completed_at: new Date().toISOString(),
      },
    };
    if (completedBy !== undefined) {
      updateData.updated_by = completedBy;
    }
    return this.krapi.documents.update(projectId, "tasks", taskId, updateData);
  }
}

// Example usage of TaskManager in frontend
export async function useTaskManagerInFrontend(logger?: Logger) {
  // Connect to KRAPI for frontend use
  await krapi.connect({
    endpoint: "https://api.myapp.com/krapi/k1",
    apiKey: "your-api-key",
  });

  const taskManager = new TaskManager(krapi);

  const result = await taskManager.createTaskList("project-123", "Sprint 1", [
    {
      title: "Setup CI/CD pipeline",
      description: "Configure automated testing and deployment",
      priority: "high",
      due_date: "2024-02-01",
    },
    {
      title: "Write unit tests",
      description: "Add comprehensive test coverage",
      priority: "medium",
      due_date: "2024-02-05",
    },
  ]);

  if (logger) {
    logger.info(`Task list created via HTTP: ${JSON.stringify(result)}`);
  }
  return result;
}

// Example usage of TaskManager in backend
export async function useTaskManagerInBackend(
  databaseConnection: DatabaseConnection,
  logger?: Logger
) {
  // Connect to KRAPI for backend use with database
  const config: KrapiConfig = {
    database: databaseConnection,
  };
  if (logger !== undefined) {
    config.logger = logger;
  }
  await krapi.connect(config);

  const taskManager = new TaskManager(krapi);

  const result = await taskManager.createTaskList(
    "project-456",
    "Backend Tasks",
    [
      {
        title: "Optimize database queries",
        description: "Review and optimize slow queries",
        priority: "high",
        due_date: "2024-02-03",
      },
      {
        title: "Add caching layer",
        description: "Implement Redis caching for frequently accessed data",
        priority: "medium",
        due_date: "2024-02-10",
      },
    ]
  );

  if (logger) {
    logger.info(`Task list created via database: ${JSON.stringify(result)}`);
  }
  return result;
}
