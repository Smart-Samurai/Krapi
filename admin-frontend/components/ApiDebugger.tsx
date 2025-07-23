"use client";

import { useState } from "react";
import { errorHandler } from "@/lib/error-handler";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Activity } from "lucide-react";

interface ApiTestResult {
  endpoint: string;
  method: string;
  status: "success" | "error" | "loading";
  response?: any;
  error?: any;
  timestamp: string;
  duration: number;
}

export default function ApiDebugger() {
  const [endpoint, setEndpoint] = useState("/health");
  const [method, setMethod] = useState("GET");
  const [results, setResults] = useState<ApiTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testEndpoint = async () => {
    if (!endpoint) return;

    const startTime = Date.now();
    const result: ApiTestResult = {
      endpoint,
      method,
      status: "loading",
      timestamp: new Date().toISOString(),
      duration: 0,
    };

    setResults((prev) => [result, ...prev]);
    setIsLoading(true);

    try {
      const response = await errorHandler.handleApiCall(
        async () => {
          const url = endpoint.startsWith("http")
            ? endpoint
            : `${config.api.baseUrl}${endpoint}`;
          const options: RequestInit = {
            method,
            headers: {
              "Content-Type": "application/json",
            },
          };

          // Add auth token if available
          if (typeof window !== "undefined") {
            const token = localStorage.getItem("auth_token");
            if (token) {
              options.headers = {
                ...options.headers,
                Authorization: `Bearer ${token}`,
              };
            }
          }

          const res = await fetch(url, options);
          const data = await res.json();

          if (!res.ok) {
            throw new Error(
              `HTTP ${res.status}: ${data.message || res.statusText}`
            );
          }

          return data;
        },
        "ApiDebugger",
        "testEndpoint",
        endpoint,
        method
      );

      const endTime = Date.now();
      const updatedResult: ApiTestResult = {
        ...result,
        status: "success",
        response,
        duration: endTime - startTime,
      };

      setResults((prev) => prev.map((r) => (r === result ? updatedResult : r)));
    } catch (error) {
      const endTime = Date.now();
      const updatedResult: ApiTestResult = {
        ...result,
        status: "error",
        error,
        duration: endTime - startTime,
      };

      setResults((prev) => prev.map((r) => (r === result ? updatedResult : r)));
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "loading":
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "loading":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            API Endpoint Tester
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Endpoint</label>
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/health"
                className="font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={testEndpoint}
                disabled={isLoading || !endpoint}
                className="w-full"
              >
                {isLoading ? "Testing..." : "Test Endpoint"}
              </Button>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p>
              Base URL:{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                {config.api.baseUrl}
              </code>
            </p>
            <p>
              Full URL:{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                {config.api.baseUrl}
                {endpoint}
              </code>
            </p>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Test Results</CardTitle>
              <Button variant="outline" size="sm" onClick={clearResults}>
                Clear Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-mono text-sm">
                        {result.method} {result.endpoint}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(result.status)}>
                        {result.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {result.duration}ms
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    {new Date(result.timestamp).toLocaleString()}
                  </div>

                  {result.status === "success" && result.response && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
                      <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                        Response:
                      </div>
                      <pre className="text-xs text-green-700 dark:text-green-300 overflow-x-auto">
                        {JSON.stringify(result.response, null, 2)}
                      </pre>
                    </div>
                  )}

                  {result.status === "error" && result.error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                      <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                        Error:
                      </div>
                      <pre className="text-xs text-red-700 dark:text-red-300 overflow-x-auto">
                        {JSON.stringify(result.error, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Common Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Health & Status</h4>
              <div className="space-y-1">
                <button
                  onClick={() => setEndpoint("/health")}
                  className="block text-left text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  /health - Health check
                </button>
                <button
                  onClick={() => setEndpoint("/admin/database/stats")}
                  className="block text-left text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  /admin/database/stats - Database stats
                </button>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Content & Data</h4>
              <div className="space-y-1">
                <button
                  onClick={() => setEndpoint("/admin/content/get")}
                  className="block text-left text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  /admin/content/get - All content
                </button>
                <button
                  onClick={() => setEndpoint("/admin/routes")}
                  className="block text-left text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  /admin/routes - All routes
                </button>
                <button
                  onClick={() => setEndpoint("/v2/admin/projects")}
                  className="block text-left text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                >
                  /v2/admin/projects - Projects (Admin Only)
                </button>
                <button
                  onClick={() => setEndpoint("/auth/verify")}
                  className="block text-left text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                >
                  /auth/verify - Verify Token
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
