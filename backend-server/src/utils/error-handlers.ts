import { Response } from "express";

import { ApiResponse } from "@/types";

/**
 * Error Handling Utilities
 * 
 * Provides consistent error response formatting across the application.
 */

export interface ErrorDetails {
  message: string;
  code?: string;
  details?: string;
  statusCode?: number;
}

/**
 * Check if error is a database connection error
 */
export function isDatabaseError(error: unknown): boolean {
  const errorMessage =
    error instanceof Error ? error.message : String(error);
  return (
    errorMessage.includes("connection") ||
    errorMessage.includes("ECONNREFUSED") ||
    errorMessage.includes("ECONNRESET")
  );
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Send error response with consistent format
 */
export function sendErrorResponse(
  res: Response,
  error: unknown,
  defaultMessage: string,
  defaultStatusCode = 500
): void {
  const errorMessage = getErrorMessage(error);
  const isDbError = isDatabaseError(error);
  const statusCode = isDbError ? 503 : defaultStatusCode;

  console.error(`[ERROR HANDLER] ${defaultMessage}:`, error);

  res.status(statusCode).json({
    success: false,
    error: defaultMessage,
    details:
      process.env.NODE_ENV === "development" ? errorMessage : undefined,
    code: isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR",
  } as ApiResponse);
}

/**
 * Send not found error response
 */
export function sendNotFoundResponse(
  res: Response,
  resource: string
): void {
  res.status(404).json({
    success: false,
    error: `${resource} not found`,
    code: "NOT_FOUND",
  } as ApiResponse);
}

/**
 * Send validation error response
 */
export function sendValidationErrorResponse(
  res: Response,
  message: string,
  code = "VALIDATION_ERROR"
): void {
  res.status(400).json({
    success: false,
    error: message,
    code,
  } as ApiResponse);
}

/**
 * Send unauthorized error response
 */
export function sendUnauthorizedResponse(res: Response): void {
  res.status(401).json({
    success: false,
    error: "Unauthorized",
    code: "UNAUTHORIZED",
  } as ApiResponse);
}








