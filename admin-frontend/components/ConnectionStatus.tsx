"use client";

import React from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useConnectionHealth } from '@/hooks/useConnectionHealth';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className, 
  showDetails = false 
}) => {
  const { socket } = useAuth();
  const { health, retryConnections } = useConnectionHealth(socket);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-accent-500" />;
      case 'checking':
      case 'connecting':
        return <Clock className="w-4 h-4 text-secondary-500 animate-pulse" />;
      case 'disconnected':
        return <AlertCircle className="w-4 h-4 text-destructive-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-text-500" />;
    }
  };

  const getOverallIcon = () => {
    switch (health.overall) {
      case 'healthy':
        return <Wifi className="w-4 h-4 text-accent-500" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-secondary-500" />;
      case 'unhealthy':
        return <WifiOff className="w-4 h-4 text-destructive-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-text-500" />;
    }
  };

  const getStatusText = () => {
    switch (health.overall) {
      case 'healthy':
        return 'All systems operational';
      case 'degraded':
        return 'Partial connectivity';
      case 'unhealthy':
        return 'Connection issues';
      default:
        return 'Status unknown';
    }
  };

  const getStatusColor = () => {
    switch (health.overall) {
      case 'healthy':
        return 'text-accent-600 bg-accent-50 border-accent-200';
      case 'degraded':
        return 'text-secondary-600 bg-secondary-50 border-secondary-200';
      case 'unhealthy':
        return 'text-destructive-600 bg-destructive-50 border-destructive-200';
      default:
        return 'text-text-600 bg-background-50 border-background-200';
    }
  };

  if (!showDetails) {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full border text-sm",
          getStatusColor(),
          className
        )}
        title={getStatusText()}
      >
        {getOverallIcon()}
        <span className="hidden sm:inline">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className={cn("bg-background-100 dark:bg-background-100 border rounded-lg p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-900">Connection Status</h3>
        <button
          onClick={retryConnections}
          className="p-1 text-text-400 hover:text-text-600 transition-colors"
          title="Retry connections"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {/* API Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(health.api.status)}
            <span className="text-sm text-text-700">API</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-500 capitalize">
              {health.api.status}
            </div>
            {health.api.lastCheck && (
              <div className="text-xs text-text-400">
                {health.api.lastCheck.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* WebSocket Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(health.websocket.status)}
            <span className="text-sm text-text-700">WebSocket</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-500 capitalize">
              {health.websocket.status}
            </div>
            {health.websocket.lastConnected && (
              <div className="text-xs text-text-400">
                {health.websocket.lastConnected.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {(health.api.error || health.websocket.error) && (
        <div className="pt-2 border-t border-background-100">
          <div className="text-xs text-destructive-600 space-y-1">
            {health.api.error && (
              <div>API: {health.api.error}</div>
            )}
            {health.websocket.error && (
              <div>WebSocket: {health.websocket.error}</div>
            )}
          </div>
        </div>
      )}

      {/* Overall Status */}
      <div className={cn(
        "flex items-center gap-2 px-2 py-1 rounded text-xs",
        getStatusColor()
      )}>
        {getOverallIcon()}
        <span>{getStatusText()}</span>
      </div>
    </div>
  );
};

export default ConnectionStatus;