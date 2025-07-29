import { z } from "zod";

// User validation schemas
export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .max(50, "Username must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(128, "Password must be less than 128 characters"),
  role: z.enum(["admin", "editor", "viewer"], {
    errorMap: () => ({ message: "Role must be admin, editor, or viewer" }),
  }),
  permissions: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .max(50, "Username must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    )
    .optional(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  role: z
    .enum(["admin", "editor", "viewer"], {
      errorMap: () => ({ message: "Role must be admin, editor, or viewer" }),
    })
    .optional(),
  permissions: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters long")
      .max(128, "New password must be less than 128 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Content validation schemas
export const createContentSchema = z.object({
  key: z
    .string()
    .min(1, "Key is required")
    .max(100, "Key must be less than 100 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Key can only contain letters, numbers, underscores, and hyphens"
    ),
  value: z.string().min(1, "Value is required"),
  type: z.enum(["text", "number", "boolean", "json", "object", "array"], {
    errorMap: () => ({ message: "Please select a valid content type" }),
  }),
  route_id: z.number().min(1, "Please select a route"),
  access_level: z.enum(["public", "protected", "private"]).default("public"),
  description: z.string().default(""),
});

export const updateContentSchema = z.object({
  key: z
    .string()
    .min(1, "Key is required")
    .max(100, "Key must be less than 100 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Key can only contain letters, numbers, underscores, and hyphens"
    )
    .optional(),
  value: z.string().min(1, "Value is required").optional(),
  type: z
    .enum(["text", "number", "boolean", "json", "object", "array"], {
      errorMap: () => ({ message: "Please select a valid content type" }),
    })
    .optional(),
  route_id: z.number().min(1, "Please select a route").optional(),
  access_level: z.enum(["public", "protected", "private"]).optional(),
  description: z.string().optional(),
});

// Route validation schemas
export const createRouteSchema = z.object({
  path: z
    .string()
    .min(1, "Path is required")
    .max(200, "Path must be less than 200 characters")
    .regex(
      /^[a-zA-Z0-9/_-]+$/,
      "Path can only contain letters, numbers, underscores, hyphens, and forward slashes"
    ),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
  access_level: z.enum(["public", "protected", "private"]).default("public"),
  parent_id: z.number().optional(),
});

export const updateRouteSchema = createRouteSchema.partial();

// Login validation schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Type exports for TypeScript
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type CreateContentFormData = z.infer<typeof createContentSchema>;
export type UpdateContentFormData = z.infer<typeof updateContentSchema>;
export type CreateRouteFormData = z.infer<typeof createRouteSchema>;
export type UpdateRouteFormData = z.infer<typeof updateRouteSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
