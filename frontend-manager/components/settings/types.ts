import { z } from "zod";

export const generalSettingsSchema = z.object({
  siteName: z.string().optional(),
  siteUrl: z.string().url().optional(),
  adminEmail: z.string().email().optional(),
  timezone: z.string().optional(),
  defaultLanguage: z.string().optional(),
});

export const securitySettingsSchema = z.object({
  sessionTimeout: z.number().optional(),
  maxLoginAttempts: z.number().optional(),
  requireMfa: z.boolean().optional(),
  passwordMinLength: z.number().optional(),
  passwordRequireUppercase: z.boolean().optional(),
  passwordRequireLowercase: z.boolean().optional(),
  passwordRequireNumbers: z.boolean().optional(),
  passwordRequireSpecial: z.boolean().optional(),
  networkInterface: z.string().optional(),
  allowedOrigins: z.string().optional(),
  frontendPublicUrl: z.string().url().optional(),
});

export const emailSettingsSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
});

export const databaseSettingsSchema = z.object({
  backupEnabled: z.boolean().optional(),
  backupFrequency: z.string().optional(),
  backupRetention: z.number().optional(),
});

