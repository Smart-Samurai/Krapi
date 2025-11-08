/**
 * Auth Error Boundary
 * 
 * Error boundary component that handles authentication errors.
 * When an authentication error occurs, it automatically redirects to login.
 * 
 * @module components/auth-error-boundary
 * @example
 * <AuthErrorBoundaryWrapper>
 *   <App />
 * </AuthErrorBoundaryWrapper>
 */
"use client";

import React, { Component, ReactNode } from "react";

import { useReduxAuth } from "@/contexts/redux-auth-context";
import { isAuthError } from "@/lib/utils";

/**
 * Auth Error Boundary Props
 * 
 * @interface Props
 * @property {ReactNode} children - Child components
 * @property {ReactNode} [fallback] - Fallback UI for non-auth errors
 */
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Auth Error Boundary State
 * 
 * @interface State
 * @property {boolean} hasError - Whether an error occurred
 * @property {Error} [error] - Error object
 */
interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Auth Error Boundary Class
 * 
 * Error boundary that catches authentication errors and redirects to login.
 * 
 * @class AuthErrorBoundary
 * @extends {Component}
 * @example
 * <AuthErrorBoundary handleAuthError={handleAuthError}>
 *   <App />
 * </AuthErrorBoundary>
 */
export class AuthErrorBoundary extends Component<
  Props & { handleAuthError: (error: Error) => void },
  State
> {
  constructor(props: Props & { handleAuthError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _errorInfo: React.ErrorInfo) {
    // Error logged for debugging

    // Check if it's an authentication error
    if (isAuthError(error)) {
      this.props.handleAuthError(error);
    }

    // For non-auth errors, just log them
    // Error logged for debugging
  }

  render() {
    if (this.state.hasError) {
      // If it's an auth error, don't show the fallback - the redirect will happen
      if (isAuthError(this.state.error)) {
        return null;
      }

      // For other errors, show the fallback or a default error message
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-base font-bold text-red-600 mb-4">
                Something went wrong
              </h2>
              <p className="text-gray-600 mb-4">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based wrapper component for AuthErrorBoundary
 * 
 * This is the preferred way to use the AuthErrorBoundary.
 * Automatically provides handleAuthError from Redux auth context.
 * 
 * @param {Props} props - Component props
 * @param {ReactNode} props.children - Child components
 * @param {ReactNode} [props.fallback] - Fallback UI for non-auth errors
 * @returns {JSX.Element} Auth error boundary wrapper
 * 
 * @example
 * <AuthErrorBoundaryWrapper>
 *   <App />
 * </AuthErrorBoundaryWrapper>
 */
export function AuthErrorBoundaryWrapper({ children, fallback }: Props) {
  const { handleAuthError } = useReduxAuth();

  return (
    <AuthErrorBoundary handleAuthError={handleAuthError} fallback={fallback}>
      {children}
    </AuthErrorBoundary>
  );
}
