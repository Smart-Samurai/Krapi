/**
 * Type guards and type validation utilities for the frontend
 */

/**
 * API Response Types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

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
 * Type guard for API response
 */
export function isApiResponse<T>(
  response: unknown,
  dataValidator?: (data: unknown) => data is T
): response is ApiResponse<T> {
  if (!isObject(response)) return false;
  
  if (typeof response.success !== 'boolean') return false;
  
  // If success is true, data should be present
  if (response.success && response.data === undefined) return false;
  
  // If success is false, error should be present
  if (!response.success && !isNonEmptyString(response.error)) return false;
  
  // Validate data if validator provided
  if (dataValidator && response.data !== undefined) {
    return dataValidator(response.data);
  }
  
  return true;
}

/**
 * Type guard for paginated response
 */
export function isPaginatedResponse<T>(
  response: unknown,
  itemValidator?: (item: unknown) => item is T
): response is PaginatedResponse<T> {
  if (!isApiResponse(response)) return false;
  
  const r = response as unknown as Record<string, unknown>;
  
  if (typeof r.total !== 'number') return false;
  if (typeof r.page !== 'number') return false;
  if (typeof r.limit !== 'number') return false;
  
  if (r.data !== undefined && Array.isArray(r.data)) {
    if (itemValidator) {
      return r.data.every(item => itemValidator(item));
    }
  }
  
  return true;
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T = unknown>(
  json: string,
  fallback?: T
): T | undefined {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Type-safe local storage access
 */
export const typedStorage = {
  getItem<T>(key: string, validator?: (value: unknown) => value is T): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      
      if (validator && !validator(parsed)) {
        console.error(`Invalid data in localStorage for key: ${key}`);
        return null;
      }
      
      return parsed as T;
    } catch {
      return null;
    }
  },
  
  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save to localStorage:`, error);
    }
  },
  
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove from localStorage:`, error);
    }
  }
};

/**
 * Type-safe session storage access
 */
export const typedSessionStorage = {
  getItem<T>(key: string, validator?: (value: unknown) => value is T): T | null {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      
      if (validator && !validator(parsed)) {
        console.error(`Invalid data in sessionStorage for key: ${key}`);
        return null;
      }
      
      return parsed as T;
    } catch {
      return null;
    }
  },
  
  setItem<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save to sessionStorage:`, error);
    }
  },
  
  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove from sessionStorage:`, error);
    }
  }
};

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
 * Type-safe event handler
 */
export function createTypedEventHandler<T extends Event>(
  handler: (event: T) => void | Promise<void>
): (event: Event) => void {
  return (event: Event) => {
    try {
      const result = handler(event as T);
      if (result instanceof Promise) {
        result.catch(error => {
          console.error('Async event handler error:', error);
        });
      }
    } catch (error) {
      console.error('Event handler error:', error);
    }
  };
}

/**
 * Debounce with proper typing
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Type-safe form data extraction
 */
export function extractFormData<T extends Record<string, unknown>>(
  form: HTMLFormElement,
  schema: Record<keyof T, (value: FormDataEntryValue | null) => T[keyof T]>
): T {
  const formData = new FormData(form);
  const result = {} as T;
  
  for (const [key, validator] of Object.entries(schema) as Array<[keyof T, (value: FormDataEntryValue | null) => T[keyof T]]>) {
    const value = formData.get(key as string);
    result[key] = validator(value);
  }
  
  return result;
}

/**
 * Create a type-safe error class
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
 * Type-safe async wrapper
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
 * Validate email format
 */
export function isValidEmail(email: unknown): email is string {
  if (!isNonEmptyString(email)) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}