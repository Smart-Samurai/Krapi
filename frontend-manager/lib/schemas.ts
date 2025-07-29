import { z } from "zod";

// File upload schema
export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "File is required")
    .refine(
      (file) => file.size <= 50 * 1024 * 1024,
      "File size must be less than 50MB"
    )
    .refine((file) => {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv",
        "application/json",
        "application/octet-stream", // Allow generic binary files
      ];
      return allowedTypes.includes(file.type);
    }, "File type not supported"),
  access_level: z.enum(["public", "protected", "private"]),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
});

export type FileUploadInput = z.infer<typeof fileUploadSchema>;

// Content creation schema
export const contentCreateSchema = z.object({
  key: z
    .string()
    .min(1, "Key is required")
    .max(100, "Key must be less than 100 characters")
    .refine(
      (key) => /^[a-zA-Z0-9\-_]+$/.test(key),
      "Key can only contain letters, numbers, hyphens, and underscores"
    ),
  data: z
    .any()
    .refine((data) => data !== undefined && data !== null, "Data is required"),
});

export type ContentCreateInput = z.infer<typeof contentCreateSchema>;

// Content update schema
export const contentUpdateSchema = z.object({
  data: z
    .any()
    .refine((data) => data !== undefined && data !== null, "Data is required"),
});

export type ContentUpdateInput = z.infer<typeof contentUpdateSchema>;

// Route creation schema
export const routeCreateSchema = z.object({
  path: z
    .string()
    .min(1, "Path is required")
    .max(200, "Path must be less than 200 characters")
    .refine(
      (path) =>
        /^\/[a-zA-Z0-9\-_/]*$/.test(path) || /^[a-zA-Z0-9\-_/]+$/.test(path),
      "Path must be a valid URL path"
    ),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  content: z
    .any()
    .refine(
      (content) => content !== undefined && content !== null,
      "Content is required"
    ),
});

export type RouteCreateInput = z.infer<typeof routeCreateSchema>;

// Route update schema
export const routeUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  content: z
    .any()
    .refine(
      (content) => content !== undefined && content !== null,
      "Content is required"
    ),
});

export type RouteUpdateInput = z.infer<typeof routeUpdateSchema>;

// User creation schema
export const userCreateSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username must be less than 50 characters")
      .refine(
        (username) => /^[a-zA-Z0-9_]+$/.test(username),
        "Username can only contain letters, numbers, and underscores"
      ),
    email: z
      .string()
      .email("Invalid email address")
      .min(1, "Email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be less than 100 characters")
      .refine(
        (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password),
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
    confirmPassword: z.string(),
    role: z.enum(["admin", "editor", "viewer"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type UserCreateInput = z.infer<typeof userCreateSchema>;

// User update schema
export const userUpdateSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be less than 100 characters")
      .refine(
        (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password),
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      )
      .optional(),
    confirmPassword: z.string().optional(),
    role: z.enum(["admin", "editor", "viewer"]).optional(),
  })
  .refine(
    (data) => {
      if (data.password && !data.confirmPassword) return false;
      if (!data.password && data.confirmPassword) return false;
      if (
        data.password &&
        data.confirmPassword &&
        data.password !== data.confirmPassword
      )
        return false;
      return true;
    },
    {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }
  );

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
