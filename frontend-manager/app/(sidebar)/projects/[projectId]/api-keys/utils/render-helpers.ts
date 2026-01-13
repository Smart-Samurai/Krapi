/**
 * Render Helpers
 * 
 * Utility functions to safely render values in React components.
 * Prevents React error #31 (Objects are not valid as a React child)
 */

import React from "react";

/**
 * Safely converts a value to a string for rendering
 */
export function safeString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    // Don't render objects directly - return empty string or JSON stringified
    if (Array.isArray(value)) {
      return value.length === 0 ? "" : value.map(safeString).join(", ");
    }
    // For objects, return empty string to prevent React error #31
    return "";
  }
  return String(value);
}

/**
 * Checks if a value is safe to render as a React child
 */
export function isRenderable(value: unknown): value is React.ReactNode {
  if (value === null || value === undefined) {
    return true; // null/undefined are valid React children
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (React.isValidElement(value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isRenderable);
  }
  // Objects are NOT renderable
  return false;
}

/**
 * Safely renders a value, converting it to a string if needed
 */
export function safeRender(value: unknown): React.ReactNode {
  if (isRenderable(value)) {
    return value;
  }
  // If not renderable, convert to string
  return safeString(value);
}

/**
 * Validates that a prop is renderable, throws error if not
 */
export function validateRenderable(value: unknown, propName: string): void {
  if (!isRenderable(value)) {
    const valueType = typeof value;
    const valueStr = valueType === "object" 
      ? (Array.isArray(value) ? "array" : "object")
      : valueType;
    throw new Error(
      `[React Error #31 Prevention] Prop "${propName}" contains non-renderable value of type "${valueStr}". ` +
      `Objects and functions cannot be rendered directly as React children. ` +
      `Value: ${JSON.stringify(value).substring(0, 100)}`
    );
  }
}

