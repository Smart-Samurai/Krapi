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
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'checking':
      case 'connecting':
        return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'disconnected':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const getOverallIcon = () => {
    switch (health.overall) {
      case 'healthy':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'unhealthy':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />;
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
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
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
    <div className={cn("bg-white border rounded-lg p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Connection Status</h3>
        <button
          onClick={retryConnections}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
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
            <span className="text-sm text-gray-700">API</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 capitalize">
              {health.api.status}
            </div>
            {health.api.lastCheck && (
              <div className="text-xs text-gray-400">
                {health.api.lastCheck.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* WebSocket Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(health.websocket.status)}
            <span className="text-sm text-gray-700">WebSocket</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 capitalize">
              {health.websocket.status}
            </div>
            {health.websocket.lastConnected && (
              <div className="text-xs text-gray-400">
                {health.websocket.lastConnected.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {(health.api.error || health.websocket.error) && (
        <div className="pt-2 border-t border-gray-100">
          <div className="text-xs text-red-600 space-y-1">
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