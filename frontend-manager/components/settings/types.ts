/**
 * Settings Component Types
 *
 * Shared types for settings page components.
 *
 * @module components/settings/types
 */

import { z } from "zod";

/**
 * General Settings Schema
 */
export const generalSettingsSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  siteUrl: z.string().url("Please enter a valid URL"),
  adminEmail: z.string().email("Please enter a valid email"),
  timezone: z.string().min(1, "Timezone is required"),
  defaultLanguage: z.string().min(1, "Language is required"),
});

/**
 * Security Settings Schema
 */
export const securitySettingsSchema = z.object({
  requireTwoFactor: z.boolean(),
  sessionTimeout: z.number().min(5).max(1440),
  passwordMinLength: z.number().min(6).max(32),
  passwordRequireUppercase: z.boolean(),
  passwordRequireNumbers: z.boolean(),
  passwordRequireSymbols: z.boolean(),
  maxLoginAttempts: z.number().min(3).max(10),
  networkInterface: z.enum(["localhost", "0.0.0.0"]),
  allowedOrigins: z.string().optional(),
});

/**
 * Email Settings Schema
 */
export const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.number().min(1).max(65535),
  smtpUsername: z.string().min(1, "Username is required"),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean(),
  fromEmail: z.string().email("Please enter a valid email"),
  fromName: z.string().min(1, "From name is required"),
});

/**
 * Database Settings Schema
 */
export const databaseSettingsSchema = z.object({
  connectionPoolSize: z.number().min(5).max(100),
  queryTimeout: z.number().min(1000).max(60000),
  enableQueryLogging: z.boolean(),
  backupSchedule: z.enum(["disabled", "daily", "weekly", "monthly"]),
  backupRetentionDays: z.number().min(1).max(365),
});

export type GeneralSettingsData = z.infer<typeof generalSettingsSchema>;
export type SecuritySettingsData = z.infer<typeof securitySettingsSchema>;
export type EmailSettingsData = z.infer<typeof emailSettingsSchema>;
export type DatabaseSettingsData = z.infer<typeof databaseSettingsSchema>;

export interface SystemSettings {
  general: GeneralSettingsData;
  security: SecuritySettingsData;
  email: EmailSettingsData;
  database: DatabaseSettingsData;
}

/**
 * Default system settings
 */
export const defaultSettings: SystemSettings = {
  general: {
    siteName: "KRAPI Manager",
    siteUrl: "http://localhost:3469",
    adminEmail: "admin@krapi.com",
    timezone: "UTC",
    defaultLanguage: "en",
  },
  security: {
    requireTwoFactor: false,
    sessionTimeout: 60,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: false,
    maxLoginAttempts: 5,
    networkInterface: "localhost",
    allowedOrigins: "",
  },
  email: {
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    smtpSecure: true,
    fromEmail: "noreply@krapi.com",
    fromName: "KRAPI",
  },
  database: {
    connectionPoolSize: 20,
    queryTimeout: 30000,
    enableQueryLogging: false,
    backupSchedule: "daily",
    backupRetentionDays: 30,
  },
};

