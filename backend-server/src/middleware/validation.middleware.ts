import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

export const validate = (schema: z.ZodSchema) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Validation error",
          details: error.issues.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
      return;
    }
  };
};

// Common validation schemas
export const schemas = {
  // ID validation
  id: z.string().uuid("Invalid ID format"),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
  }),

  // Email
  email: z.string().email("Invalid email format"),

  // Password
  password: z.string().min(8, "Password must be at least 8 characters"),

  // Project name
  projectName: z
    .string()
    .min(3, "Project name must be at least 3 characters")
    .max(50),

  // Table name
  tableName: z
    .string()
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Table name must start with lowercase letter and contain only lowercase letters, numbers, and underscores"
    ),

  // Field name
  fieldName: z
    .string()
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      "Field name must start with letter and contain only letters, numbers, and underscores"
    ),

  // API Key
  apiKey: z.string().regex(/^krapi_[a-f0-9]{32}$/, "Invalid API key format"),

  // Session token
  sessionToken: z.string().uuid("Invalid session token format"),

  // Field type
  fieldType: z.enum([
    "string",
    "number",
    "boolean",
    "date",
    "datetime",
    "json",
    "reference",
    "file",
    "uniqueID",
    "relation",
    "text",
  ]),

  // Admin role
  adminRole: z.enum([
    "master_admin",
    "admin",
    "project_admin",
    "limited_admin",
  ]),

  // Access level
  accessLevel: z.enum(["full", "projects_only", "read_only", "custom"]),

  // Sort order
  sortOrder: z.enum(["asc", "desc"]).default("desc"),

  // SMTP config
  smtpConfig: z.object({
    smtp_host: z.string(),
    smtp_port: z.number(),
    smtp_secure: z.boolean(),
    smtp_user: z.string(),
    smtp_pass: z.string(),
    from_email: z.string().email(),
    from_name: z.string().optional(),
  }),

  // Storage config
  storageConfig: z.object({
    max_file_size: z.number().positive(),
    allowed_types: z.array(z.string()),
    storage_path: z.string().optional(),
  }),

  // Auth config
  authConfig: z.object({
    session_duration: z.number().positive(),
    password_min_length: z.number().min(6).max(32),
    require_email_verification: z.boolean(),
  }),

  // Rate limit config
  rateLimitConfig: z.object({
    window_ms: z.number().positive(),
    max_requests: z.number().positive(),
  }),
};

// Request validation schemas
export const validationSchemas = {
  // Create session
  createSession: z.object({
    body: z.object({
      api_key: schemas.apiKey,
    }),
  }),

  // Admin login
  adminLogin: z.object({
    body: z.object({
      email: schemas.email,
      password: schemas.password,
    }),
  }),

  // Create admin user
  createAdminUser: z.object({
    body: z.object({
      email: schemas.email,
      username: z.string().min(3).max(30),
      password: schemas.password,
      role: schemas.adminRole,
      access_level: schemas.accessLevel,
      permissions: z
        .array(
          z.object({
            resource: z.string(),
            actions: z.array(z.string()),
          })
        )
        .optional(),
    }),
  }),

  // Update admin user
  updateAdminUser: z.object({
    params: z.object({
      id: schemas.id,
    }),
    body: z.object({
      email: schemas.email.optional(),
      username: z.string().min(3).max(30).optional(),
      password: schemas.password.optional(),
      role: schemas.adminRole.optional(),
      access_level: schemas.accessLevel.optional(),
      permissions: z
        .array(
          z.object({
            resource: z.string(),
            actions: z.array(z.string()),
          })
        )
        .optional(),
      active: z.boolean().optional(),
    }),
  }),

  // Create project
  createProject: z.object({
    body: z.object({
      name: schemas.projectName,
      description: z.string().optional(),
      project_url: z.string().url().optional(),
      settings: z
        .object({
          email_config: schemas.smtpConfig.optional(),
          storage_config: schemas.storageConfig.optional(),
          auth_config: schemas.authConfig.optional(),
          rate_limits: schemas.rateLimitConfig.optional(),
        })
        .optional(),
    }),
  }),

  // Update project
  updateProject: z.object({
    params: z.object({
      projectId: schemas.id,
    }),
    body: z.object({
      name: schemas.projectName.optional(),
      description: z.string().optional(),
      project_url: z.string().url().optional(),
      settings: z
        .object({
          email_config: schemas.smtpConfig.optional(),
          storage_config: schemas.storageConfig.optional(),
          auth_config: schemas.authConfig.optional(),
          rate_limits: schemas.rateLimitConfig.optional(),
        })
        .optional(),
      active: z.boolean().optional(),
    }),
  }),

  // Create table schema
  createTableSchema: z.object({
    params: z.object({
      projectId: schemas.id,
    }),
    body: z.object({
      name: schemas.tableName,
      description: z.string().optional(),
      fields: z.array(
        z.object({
          name: schemas.fieldName,
          type: schemas.fieldType,
          required: z.boolean(),
          unique: z.boolean(),
          default: z.any().optional(),
          validation: z
            .object({
              min: z.number().optional(),
              max: z.number().optional(),
              pattern: z.string().optional(),
              enum: z.array(z.any()).optional(),
              custom: z.string().optional(),
            })
            .optional(),
        })
      ),
      indexes: z
        .array(
          z.object({
            name: z.string(),
            fields: z.array(z.string()),
            unique: z.boolean(),
          })
        )
        .optional(),
    }),
  }),

  // Create document
  createDocument: z.object({
    params: z.object({
      projectId: schemas.id,
      tableId: schemas.id,
    }),
    body: z.object({
      data: z.record(z.string(), z.unknown()),
    }),
  }),

  // Update document
  updateDocument: z.object({
    params: z.object({
      projectId: schemas.id,
      tableId: schemas.id,
      documentId: schemas.id,
    }),
    body: z.object({
      data: z.record(z.string(), z.any()),
    }),
  }),

  // List documents
  listDocuments: z.object({
    params: z.object({
      projectId: schemas.id,
      tableId: schemas.id,
    }),
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      sort: z.string().optional(),
      order: schemas.sortOrder.optional(),
      filter: z.record(z.string(), z.unknown()).optional(),
    }),
  }),

  // Upload file
  uploadFile: z.object({
    params: z.object({
      projectId: schemas.id,
    }),
  }),

  // Create project user
  createProjectUser: z.object({
    params: z.object({
      projectId: schemas.id,
    }),
    body: z.object({
      email: schemas.email,
      name: z.string().optional(),
      phone: z.string().optional(),
      password: schemas.password.optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
};

/**
 * Validate project access middleware
 * Ensures the user has access to the project specified in the URL
 */
export const validateProjectAccess = async (
  req: Request & { user?: { id: string; type: string; projectId?: string }; app?: { locals: { db: { checkProjectAccess: (projectId: string, userId: string) => Promise<boolean> } } } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = req.params.projectId;
    const user = req.user;

    if (!projectId) {
      res.status(400).json({
        success: false,
        error: "Project ID is required",
      });
      return;
    }

    if (!user) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    // For admin users, check if they have access to the project
    if (user.type === "admin") {
      const db = req.app?.locals.db;
      if (db) {
        const hasAccess = await db.checkProjectAccess(projectId, user.id);

        if (!hasAccess) {
          res.status(403).json({
            success: false,
            error: "Access denied to this project",
          });
          return;
        }
      }
    }

    // For project users, ensure they're accessing their own project
    if (user.type === "project" && user.projectId !== projectId) {
      res.status(403).json({
        success: false,
        error: "Access denied to this project",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Project access validation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
