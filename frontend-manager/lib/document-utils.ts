/**
 * Document Utilities
 * 
 * Utilities for converting and validating document field values
 * based on collection field types.
 */

import type { CollectionField } from "@/lib/krapi";
import { FieldType } from "@/lib/krapi-constants";

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Convert a field value to the appropriate type based on field definition
 */
export function convertFieldValue(
  value: unknown,
  field: CollectionField
): unknown {
  // Handle null/undefined/empty string
  if (value === null || value === undefined || value === "") {
    if (field.required) {
      return value; // Keep as-is, validation will catch it
    }
    return null;
  }

  // Boolean fields
  if (field.type === FieldType.boolean) {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "1" || value === 1) return true;
    if (value === "false" || value === "0" || value === 0) return false;
    return Boolean(value);
  }

  // Integer fields
  if (field.type === FieldType.integer) {
    if (typeof value === "number") {
      return Math.floor(value);
    }
    const num = parseInt(String(value), 10);
    return isNaN(num) ? null : num;
  }

  // Number fields
  if (field.type === FieldType.number) {
    if (typeof value === "number") return value;
    const num = parseFloat(String(value));
    return isNaN(num) ? null : num;
  }

  // Float/decimal fields
  if (field.type === FieldType.float || field.type === FieldType.decimal) {
    if (typeof value === "number") return value;
    const num = parseFloat(String(value));
    return isNaN(num) ? null : num;
  }

  // Date fields
  if (field.type === FieldType.date) {
    if (value instanceof Date) {
      return value.toISOString().split("T")[0]; // YYYY-MM-DD
    }
    if (typeof value === "string") {
      // Try to parse and format as YYYY-MM-DD
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
      // If already in YYYY-MM-DD format, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
    }
    return value;
  }

  // Datetime fields
  if (field.type === FieldType.datetime) {
    if (value instanceof Date) {
      // Format as YYYY-MM-DDTHH:mm
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      const hours = String(value.getHours()).padStart(2, "0");
      const minutes = String(value.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    if (typeof value === "string") {
      // Try to parse and format
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      }
      // If already in correct format, return as-is
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
        return value;
      }
    }
    return value;
  }

  // Timestamp fields
  if (field.type === FieldType.timestamp) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "string") {
      // Try to parse and convert to ISO
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      // If already ISO format, return as-is
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return value;
      }
    }
    if (typeof value === "number") {
      // Assume it's a Unix timestamp
      return new Date(value * 1000).toISOString();
    }
    return value;
  }

  // Email fields - validate format
  if (field.type === FieldType.email) {
    if (typeof value === "string") {
      // More robust email validation regex
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(value) && value !== "") {
        // Invalid email, but return as-is - validation will catch it
        return value;
      }
      // Normalize email (lowercase, trim)
      return value.trim().toLowerCase();
    }
    return value;
  }

  // Phone fields - validate and format
  if (field.type === FieldType.phone) {
    if (typeof value === "string") {
      // Remove all non-digit characters for validation
      const digitsOnly = value.replace(/\D/g, "");
      // Basic phone validation: 7-15 digits (international format)
      if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        // Return formatted phone number (keep original format for display)
        return value.trim();
      }
      // Invalid phone, but return as-is - validation will catch it
      return value.trim();
    }
    return value;
  }

  // URL fields - validate and normalize
  if (field.type === FieldType.url) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return trimmed;
      
      // If URL doesn't have a protocol, add https://
      if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        return `https://${trimmed}`;
      }
      return trimmed;
    }
    return value;
  }

  // All other types (string, text, etc.) - return as string
  return String(value);
}

/**
 * Validate document data against collection schema
 */
export function validateDocumentData(
  data: Record<string, unknown>,
  fields: CollectionField[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    const value = data[field.name];

    // Check required fields
    if (field.required) {
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        errors.push({
          field: field.name,
          message: `${field.name} is required`,
        });
        continue;
      }
    }

    // Skip validation if value is empty and field is not required
    if (value === null || value === undefined || value === "") {
      continue;
    }

    // Type-specific validation
    if (field.type === FieldType.email) {
      // More robust email validation regex (RFC 5322 compliant subset)
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (typeof value !== "string" || !emailRegex.test(value.trim().toLowerCase())) {
        errors.push({
          field: field.name,
          message: `${field.name} must be a valid email address`,
        });
      }
    }

    if (field.type === FieldType.phone) {
      if (typeof value !== "string") {
        errors.push({
          field: field.name,
          message: `${field.name} must be a valid phone number`,
        });
      } else {
        // Remove all non-digit characters for validation
        const digitsOnly = value.replace(/\D/g, "");
        // Phone numbers should have 7-15 digits (international format)
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
          errors.push({
            field: field.name,
            message: `${field.name} must be a valid phone number (7-15 digits)`,
          });
        }
      }
    }

    if (field.type === FieldType.url) {
      if (typeof value !== "string") {
        errors.push({
          field: field.name,
          message: `${field.name} must be a valid URL`,
        });
      } else {
        try {
          // Try to create a URL object to validate
          new URL(value);
        } catch {
          // Also accept URLs without protocol (will add https://)
          const urlWithProtocol = value.startsWith("http://") || value.startsWith("https://") 
            ? value 
            : `https://${value}`;
          try {
            new URL(urlWithProtocol);
          } catch {
            errors.push({
              field: field.name,
              message: `${field.name} must be a valid URL`,
            });
          }
        }
      }
    }

    if (field.type === FieldType.integer) {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        errors.push({
          field: field.name,
          message: `${field.name} must be an integer`,
        });
      }
    }

    if (field.type === FieldType.number || field.type === FieldType.float || field.type === FieldType.decimal) {
      if (typeof value !== "number" || isNaN(value)) {
        errors.push({
          field: field.name,
          message: `${field.name} must be a number`,
        });
      }
    }

    if (field.type === FieldType.boolean) {
      if (typeof value !== "boolean") {
        errors.push({
          field: field.name,
          message: `${field.name} must be a boolean`,
        });
      }
    }

    if (field.type === FieldType.date) {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        errors.push({
          field: field.name,
          message: `${field.name} must be a valid date (YYYY-MM-DD)`,
        });
      }
    }

    if (field.type === FieldType.datetime) {
      if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
      ) {
        errors.push({
          field: field.name,
          message: `${field.name} must be a valid datetime (YYYY-MM-DDTHH:mm)`,
        });
      }
    }
  }

  return errors;
}

/**
 * Convert all document data values to appropriate types
 */
export function convertDocumentData(
  data: Record<string, unknown>,
  fields: CollectionField[]
): Record<string, unknown> {
  const converted: Record<string, unknown> = {};

  for (const field of fields) {
    const value = data[field.name];
    converted[field.name] = convertFieldValue(value, field);
  }

  return converted;
}
