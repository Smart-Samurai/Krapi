import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Utility function to check if an error is an authentication error
 * @param error - The error object to check
 * @returns true if the error is an authentication error
 */
export function isAuthError(error: any): boolean {
  return (
    error?.status === 401 ||
    error?.response?.status === 401 ||
    error?.message?.includes("Unauthorized") ||
    error?.message?.includes("Invalid token") ||
    error?.message?.includes("Token expired") ||
    error?.isApiError === true
  );
}

/**
 * Utility function to handle authentication errors
 * This function should be used in components to handle auth errors consistently
 * @param error - The error object
 * @param handleAuthError - Function from auth context to handle auth errors
 * @returns true if the error was an auth error and was handled
 */
export function handleAuthError(
  error: any,
  handleAuthError: (error: any) => void
): boolean {
  if (isAuthError(error)) {
    handleAuthError(error);
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
  krapi: any,
  method: string,
  methodName: string,
  ...args: any[]
): Promise<any> {
  if (
    !krapi ||
    !krapi[method] ||
    typeof krapi[method][methodName] !== "function"
  ) {
    throw new Error(`API method ${method}.${methodName} is not available`);
  }

  return krapi[method][methodName](...args);
}
