/**
 * Scope Guard Component
 * 
 * Component that conditionally renders children based on user scopes/permissions.
 * Provides access control at the component level.
 * 
 * @module components/scope-guard
 * @example
 * <ScopeGuard scopes={['projects:read']}>
 *   <ProjectList />
 * </ScopeGuard>
 */
"use client";

import { Shield, AlertCircle } from "lucide-react";
import React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useReduxAuth } from "@/contexts/redux-auth-context";

/**
 * Scope Guard Props
 * 
 * @interface ScopeGuardProps
 * @property {string | string[]} scopes - Required scope(s) for access
 * @property {boolean} [requireAll=false] - If true, all scopes required; if false, any scope sufficient
 * @property {React.ReactNode} children - Content to render if user has access
 * @property {React.ReactNode} [fallback] - Content to render if user lacks access (optional)
 * @property {boolean} [showRequirements=true] - Whether to show access requirements message
 */
interface ScopeGuardProps {
  scopes: string | string[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showRequirements?: boolean;
}

/**
 * Scope Guard Component
 * 
 * Conditionally renders children based on user's scope permissions.
 * Shows access denied message if user lacks required scopes.
 * 
 * @param {ScopeGuardProps} props - Component props
 * @returns {JSX.Element} Children if access granted, fallback or access denied message otherwise
 * 
 * @example
 * // Require any of the specified scopes
 * <ScopeGuard scopes={['projects:read', 'projects:write']}>
 *   <ProjectList />
 * </ScopeGuard>
 * 
 * @example
 * // Require all specified scopes
 * <ScopeGuard scopes={['projects:read', 'projects:write']} requireAll>
 *   <ProjectEditor />
 * </ScopeGuard>
 */
export function ScopeGuard({
  scopes,
  requireAll = false,
  children,
  fallback,
  showRequirements = true,
}: ScopeGuardProps) {
  const { hasScope } = useReduxAuth();

  const requiredScopes = Array.isArray(scopes) ? scopes : [scopes];
  const hasAccess = hasScope(scopes);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showRequirements) {
    return null;
  }

  return (
    <Alert className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Access Restricted</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>You don&apos;t have permission to access this feature.</p>
        <div>
          <p className="text-base font-medium mb-1">
            Required {requireAll ? "all" : "any"} of these scopes:
          </p>
          <div className="flex flex-wrap gap-2">
            {requiredScopes.map((scope) => (
              <Badge key={scope} variant="outline" className="text-base">
                {scope}
              </Badge>
            ))}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Scope Indicator Props
 * 
 * @interface ScopeIndicatorProps
 * @property {string | string[]} scopes - Scope(s) to indicate
 * @property {string} [className] - Additional CSS classes
 */
interface ScopeIndicatorProps {
  scopes: string | string[];
  className?: string;
}

/**
 * Scope Indicator Component
 * 
 * Visual indicator showing whether user has access to specified scopes.
 * Shows "Master Access" badge for master users, "Access Granted" for users with scopes,
 * or scope requirements for users without access.
 * 
 * @param {ScopeIndicatorProps} props - Component props
 * @returns {JSX.Element} Badge indicating scope access status
 * 
 * @example
 * <ScopeIndicator scopes={['projects:read']} />
 */
export function ScopeIndicator({ scopes, className }: ScopeIndicatorProps) {
  const { hasScope, hasMasterAccess } = useReduxAuth();

  const requiredScopes = Array.isArray(scopes) ? scopes : [scopes];
  const hasAccess = hasScope(scopes);

  if (hasMasterAccess()) {
    return (
      <Badge variant="default" className={className}>
        <Shield className="mr-1 h-3 w-3" />
        Master Access
      </Badge>
    );
  }

  return (
    <Badge variant={hasAccess ? "secondary" : "outline"} className={className}>
      {hasAccess ? (
        <>
          <Shield className="mr-1 h-3 w-3" />
          Access Granted
        </>
      ) : (
        <>
          <AlertCircle className="mr-1 h-3 w-3" />
          {requiredScopes.length === 1
            ? requiredScopes[0]
            : `${requiredScopes.length} scopes`}{" "}
          required
        </>
      )}
    </Badge>
  );
}
