/**
 * Type guards and type validation utilities
 */

import { 
  McpToolResult, 
  OllamaMessage, 
  McpToolCall,
  McpRequest,
  McpResponse 
} from "../types/mcp";
import { User, ContentItem } from "../types";

/**
 * Check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Type guard for McpToolResult
 */
export function isValidToolResult(result: unknown): result is McpToolResult {
  if (!isObject(result)) return false;
  
  const r = result as Record<string, unknown>;
  
  if (!Array.isArray(r.content)) return false;
  
  return r.content.every(item => 
    isObject(item) && 
    item.type === 'text' && 
    typeof item.text === 'string'
  );
}

/**
 * Type guard for OllamaMessage
 */
export function isValidOllamaMessage(message: unknown): message is OllamaMessage {
  if (!isObject(message)) return false;
  
  const m = message as Record<string, unknown>;
  
  const validRoles = ['system', 'user', 'assistant', 'tool'];
  if (!validRoles.includes(m.role as string)) return false;
  
  if (typeof m.content !== 'string') return false;
  
  if (m.tool_calls !== undefined && !Array.isArray(m.tool_calls)) return false;
  
  return true;
}

/**
 * Type guard for McpToolCall
 */
export function isValidToolCall(call: unknown): call is McpToolCall {
  if (!isObject(call)) return false;
  
  const c = call as Record<string, unknown>;
  
  if (!isObject(c.function)) return false;
  
  const func = c.function as Record<string, unknown>;
  
  return isNonEmptyString(func.name) && isObject(func.arguments);
}

/**
 * Type guard for User
 */
export function isValidUser(user: unknown): user is User {
  if (!isObject(user)) return false;
  
  const u = user as Record<string, unknown>;
  
  return (
    isValidNumber(u.id) &&
    isNonEmptyString(u.username) &&
    isNonEmptyString(u.email) &&
    isNonEmptyString(u.role) &&
    typeof u.active === 'boolean'
  );
}

/**
 * Type guard for ContentItem
 */
export function isValidContentItem(item: unknown): item is ContentItem {
  if (!isObject(item)) return false;
  
  const i = item as Record<string, unknown>;
  
  return (
    isValidNumber(i.id) &&
    isNonEmptyString(i.key) &&
    i.data !== undefined &&
    isNonEmptyString(i.content_type)
  );
}

/**
 * Safely parse JSON with type validation
 */
export function safeJsonParse<T>(
  json: string, 
  validator: (value: unknown) => value is T
): T | null {
  try {
    const parsed = JSON.parse(json);
    return validator(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Assert a condition and throw with a custom message
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Ensure a value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * Create a type-safe error response
 */
export function createErrorResponse(
  message: string,
  code: number = -32603,
  data?: unknown
): { error: { code: number; message: string; data?: unknown } } {
  return {
    error: {
      code,
      message,
      ...(data !== undefined && { data })
    }
  };
}

/**
 * Type-safe property access
 */
export function getProperty<T, K extends keyof T>(
  obj: T,
  key: K
): T[K] | undefined {
  try {
    return obj[key];
  } catch {
    return undefined;
  }
}

/**
 * Type-safe array access
 */
export function getArrayElement<T>(
  arr: T[],
  index: number
): T | undefined {
  if (index >= 0 && index < arr.length) {
    return arr[index];
  }
  return undefined;
}

/**
 * Validate and sanitize string input
 */
export function sanitizeString(
  input: unknown,
  maxLength: number = 1000,
  allowEmpty: boolean = false
): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  const trimmed = input.trim();
  
  if (!allowEmpty && trimmed.length === 0) {
    throw new Error('Input cannot be empty');
  }
  
  if (trimmed.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength}`);
  }
  
  // Remove any potential XSS attempts
  return trimmed
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: unknown): email is string {
  if (!isNonEmptyString(email)) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: unknown): url is string {
  if (!isNonEmptyString(url)) return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type-safe environment variable access
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not defined`);
  }
  
  return value;
}

/**
 * Type-safe integer parsing
 */
export function parseIntSafe(
  value: unknown,
  defaultValue?: number
): number {
  if (typeof value === 'number') {
    return Math.floor(value);
  }
  
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  
  throw new Error(`Cannot parse "${value}" as integer`);
}

/**
 * Create a typed error class
 */
export class TypedError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'TypedError';
  }
}

/**
 * Type-safe promise wrapper
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  errorMessage: string = 'Operation failed'
): Promise<[T, null] | [null, Error]> {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    const err = error instanceof Error ? error : new Error(errorMessage);
    return [null, err];
  }
}