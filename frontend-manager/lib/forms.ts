import { z } from "zod";

// Common form schemas
export const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const nameSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

// User registration schema
export const userRegistrationSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// User login schema
export const userLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

// Project creation schema
export const projectCreationSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters"),
  description: z.string().optional(),
  projectId: z.string().optional(),
  isPublic: z.boolean().default(false),
});

// Database collection schema
export const collectionSchema = z.object({
  name: z.string().min(1, "Collection name is required"),
  description: z.string().optional(),
  attributes: z
    .array(
      z.object({
        name: z.string().min(1, "Attribute name is required"),
        type: z.enum(["string", "number", "boolean", "date", "email", "url"]),
        required: z.boolean().default(false),
        unique: z.boolean().default(false),
      })
    )
    .optional(),
});

// API key schema
export const apiKeySchema = z.object({
  name: z.string().min(1, "API key name is required"),
  permissions: z
    .array(z.enum(["read", "write", "delete", "admin"]))
    .min(1, "At least one permission is required"),
  expiresAt: z.date().optional(),
});

// Settings schema
export const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(false),
  }),
  security: z.object({
    twoFactorEnabled: z.boolean().default(false),
    sessionTimeout: z.number().min(5).max(1440).default(30), // minutes
  }),
});

// Generic form field schema
export const formFieldSchema = z.object({
  label: z.string(),
  type: z.enum([
    "text",
    "email",
    "password",
    "number",
    "textarea",
    "select",
    "checkbox",
    "radio",
    "date",
  ]),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    )
    .optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      custom: z.string().optional(),
    })
    .optional(),
});

// Dynamic form schema
export const dynamicFormSchema = z.object({
  fields: z.array(formFieldSchema),
  data: z.record(z.any()),
});

// Type exports
export type EmailFormData = z.infer<typeof emailSchema>;
export type PasswordFormData = z.infer<typeof passwordSchema>;
export type NameFormData = z.infer<typeof nameSchema>;
export type UserRegistrationFormData = z.infer<typeof userRegistrationSchema>;
export type UserLoginFormData = z.infer<typeof userLoginSchema>;
export type ProjectCreationFormData = z.infer<typeof projectCreationSchema>;
export type CollectionFormData = z.infer<typeof collectionSchema>;
export type ApiKeyFormData = z.infer<typeof apiKeySchema>;
export type SettingsFormData = z.infer<typeof settingsSchema>;
export type FormFieldData = z.infer<typeof formFieldSchema>;
export type DynamicFormData = z.infer<typeof dynamicFormSchema>;

// Utility functions for form validation
export const validateEmail = (email: string): boolean => {
  return emailSchema.safeParse({ email }).success;
};

export const validatePassword = (password: string): boolean => {
  return passwordSchema.safeParse({ password }).success;
};

export const validateRequired = (value: any): boolean => {
  return value !== null && value !== undefined && value !== "";
};

// Form error helper
export const getFormError = (error: any): string => {
  if (typeof error === "string") return error;
  if (error?.message) return error.message;
  if (error?.errors?.[0]?.message) return error.errors[0].message;
  return "An error occurred";
};
