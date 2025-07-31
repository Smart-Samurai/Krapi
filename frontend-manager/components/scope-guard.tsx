'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertCircle } from 'lucide-react';

interface ScopeGuardProps {
  scopes: string | string[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  showRequirements?: boolean;
}

export function ScopeGuard({ 
  scopes, 
  requireAll = false,
  children, 
  fallback,
  showRequirements = true 
}: ScopeGuardProps) {
  const { hasScope } = useAuth();
  
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
        <p>You don't have permission to access this feature.</p>
        <div>
          <p className="text-sm font-medium mb-1">
            Required {requireAll ? 'all' : 'any'} of these scopes:
          </p>
          <div className="flex flex-wrap gap-2">
            {requiredScopes.map(scope => (
              <Badge key={scope} variant="outline" className="text-xs">
                {scope}
              </Badge>
            ))}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface ScopeIndicatorProps {
  scopes: string | string[];
  className?: string;
}

export function ScopeIndicator({ scopes, className }: ScopeIndicatorProps) {
  const { hasScope, hasMasterAccess } = useAuth();
  
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
    <Badge 
      variant={hasAccess ? "secondary" : "outline"} 
      className={className}
    >
      {hasAccess ? (
        <>
          <Shield className="mr-1 h-3 w-3" />
          Access Granted
        </>
      ) : (
        <>
          <AlertCircle className="mr-1 h-3 w-3" />
          {requiredScopes.length === 1 ? requiredScopes[0] : `${requiredScopes.length} scopes`} required
        </>
      )}
    </Badge>
  );
}