/**
 * Utility Functions
 * 
 * Common utility functions for the frontend application.
 * Includes class name merging, error handling, and API call helpers.
 * 
 * @module lib/utils
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind CSS conflict resolution
 * 
 * Combines class names using clsx and resolves Tailwind CSS conflicts using twMerge.
 * 
 * @param {...ClassValue} inputs - Class name inputs (strings, objects, arrays)
 * @returns {string} Merged class names
 * 
 * @example
 * cn('text-base', 'text-lg') // Returns: 'text-lg' (conflict resolved)
 * cn('px-4', { 'py-2': true, 'py-4': false }) // Returns: 'px-4 py-2'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Utility function to check if an error is an authentication error
 * @param error - The error object to check
 * @returns true if the error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const errorObj = error as Record<string, unknown>;

  // Check for status 401
  if ("status" in errorObj && errorObj.status === 401) return true;

  // Check for response with status 401
  if (
    "response" in errorObj &&
    errorObj.response &&
    typeof errorObj.response === "object"
  ) {
    const response = errorObj.response as Record<string, unknown>;
    if ("status" in response && response.status === 401) return true;
  }

  // Check for error message
  if ("message" in errorObj && typeof errorObj.message === "string") {
    const message = errorObj.message;
    if (
      message.includes("Unauthorized") ||
      message.includes("Invalid token") ||
      message.includes("Token expired")
    ) {
      return true;
    }
  }

  // Check for isApiError flag
  if ("isApiError" in errorObj && errorObj.isApiError === true) return true;

  return false;
}

/**
 * Utility function to handle authentication errors
 * This function should be used in components to handle auth errors consistently
 * @param error - The error object
 * @param handleAuthError - Function from auth context to handle auth errors
 * @returns true if the error was an auth error and was handled
 */
export function handleAuthError(
  error: unknown,
  handleAuthError: (error: Error) => void
): boolean {
  if (isAuthError(error)) {
    if (error instanceof Error) {
      handleAuthError(error);
    } else {
      handleAuthError(new Error(String(error)));
    }
    return true;
  }
  return false;
}

/**
 * Utility function to safely call API methods with null checks
 * @param krapi - The krapi instance
 * @param method - The method to call (e.g., 'projects', 'collections', etc.)
 * @param methodName - The specific method name (e.g., 'getAll', 'create', etc.)
 * @param args - Arguments to pass to the method
 * @returns Promise with the result or null if krapi or method is not available
 */
export async function safeApiCall(
  krapi: Record<string, unknown>,
  method: string,
  methodName: string,
  ...args: unknown[]
): Promise<unknown> {
  if (
    !krapi ||
    !krapi[method] ||
    typeof (krapi[method] as Record<string, unknown>)[methodName] !== "function"
  ) {
    throw new Error(`API method ${method}.${methodName} is not available`);
  }

  return (
    (krapi[method] as Record<string, unknown>)[methodName] as (
      ...args: unknown[]
    ) => unknown
  )(...args);
}
