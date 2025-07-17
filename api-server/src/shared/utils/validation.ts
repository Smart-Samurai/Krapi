/**
 * Validation Utilities
 * 
 * Common validation functions used across different features.
 * These utilities help maintain consistency and reduce code duplication.
 */

import { ApiResponse } from "../../types";

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password strength validation
 */
export const validatePassword = (password: string): { 
  valid: boolean; 
  errors: string[] 
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Email validation
 */
export const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
};

/**
 * Username validation
 */
export const validateUsername = (username: string): { 
  valid: boolean; 
  error?: string 
} => {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: "Username is required" };
  }

  if (username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters long" };
  }

  if (username.length > 50) {
    return { valid: false, error: "Username must be less than 50 characters" };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, error: "Username can only contain letters, numbers, hyphens, and underscores" };
  }

  return { valid: true };
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Validate required fields in an object
 */
export const validateRequiredFields = (
  obj: Record<string, any>, 
  requiredFields: string[]
): { valid: boolean; missing: string[] } => {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * Validate JSON string
 */
export const validateJSON = (jsonString: string): { 
  valid: boolean; 
  parsed?: any; 
  error?: string 
} => {
  try {
    const parsed = JSON.parse(jsonString);
    return { valid: true, parsed };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : "Invalid JSON"
    };
  }
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (
  page?: string | number, 
  limit?: string | number
): { page: number; limit: number; valid: boolean; error?: string } => {
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : (page || 1);
  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : (limit || 10);

  if (isNaN(pageNum) || pageNum < 1) {
    return { page: 1, limit: 10, valid: false, error: "Page must be a positive integer" };
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return { page: pageNum, limit: 10, valid: false, error: "Limit must be between 1 and 100" };
  }

  return { page: pageNum, limit: limitNum, valid: true };
};

/**
 * Create standardized error response
 */
export const createErrorResponse = (
  message: string, 
  statusCode: number = 400
): { response: ApiResponse; statusCode: number } => {
  return {
    response: {
      success: false,
      error: message
    },
    statusCode
  };
};

/**
 * Create standardized success response
 */
export const createSuccessResponse = <T>(
  data?: T, 
  message?: string
): ApiResponse<T> => {
  const response: ApiResponse<T> = {
    success: true
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return response;
};