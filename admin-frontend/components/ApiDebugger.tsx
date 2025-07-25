"use client";

import { useState } from "react";
import { createDefaultKrapi } from "@/lib/krapi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Activity, Play } from "lucide-react";

interface ApiTestResult {
  test: string;
  status: "success" | "error" | "loading";
  response?: any;
  error?: any;
  timestamp: string;
  duration: number;
}

export default function ApiDebugger() {
  const [results, setResults] = useState<ApiTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async (
    testName: string,
    testFunction: () => Promise<any>
  ) => {
    const startTime = Date.now();
    const result: ApiTestResult = {
      test: testName,
      status: "loading",
      timestamp: new Date().toISOString(),
      duration: 0,
    };

    setResults((prev) => [result, ...prev]);
    setIsLoading(true);

    try {
      const response = await testFunction();
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
        error: error instanceof Error ? error.message : String(error),
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

  // Test functions
  const testHealth = () => {
    const krapi = createDefaultKrapi();
    return runTest("Health Check", () => krapi.admin.health());
  };

  const testListProjects = () => {
    const krapi = createDefaultKrapi();
    return runTest("List Projects", () => krapi.admin.listProjects());
  };

  const testListApiKeys = () => {
    const krapi = createDefaultKrapi();
    return runTest("List API Keys", () => krapi.admin.listApiKeys());
  };

  const testDatabaseStats = () => {
    const krapi = createDefaultKrapi();
    return runTest("Database Stats", () => krapi.admin.getDatabaseStats());
  };

  const testListFiles = () => {
    const krapi = createDefaultKrapi();
    return runTest("List Files", () => krapi.storage.listFiles());
  };

  const testListCollections = () => {
    const krapi = createDefaultKrapi();
    return runTest("List Collections", () => krapi.database.listCollections());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Unified API Tester
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Test the unified API endpoints with proper error handling and
            detailed responses.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={testHealth}
              disabled={isLoading}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="flex items-center gap-2 mb-2">
                <Play className="h-4 w-4" />
                <span className="font-medium">Health Check</span>
              </div>
              <span className="text-xs text-gray-500 text-left">
                Test API server health and status
              </span>
            </Button>

            <Button
              onClick={testListProjects}
              disabled={isLoading}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="flex items-center gap-2 mb-2">
                <Play className="h-4 w-4" />
                <span className="font-medium">List Projects</span>
              </div>
              <span className="text-xs text-gray-500 text-left">
                Get all projects (Admin only)
              </span>
            </Button>

            <Button
              onClick={testListApiKeys}
              disabled={isLoading}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="flex items-center gap-2 mb-2">
                <Play className="h-4 w-4" />
                <span className="font-medium">List API Keys</span>
              </div>
              <span className="text-xs text-gray-500 text-left">
                Get all API keys (Admin only)
              </span>
            </Button>

            <Button
              onClick={testDatabaseStats}
              disabled={isLoading}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="flex items-center gap-2 mb-2">
                <Play className="h-4 w-4" />
                <span className="font-medium">Database Stats</span>
              </div>
              <span className="text-xs text-gray-500 text-left">
                Get database statistics (Admin only)
              </span>
            </Button>

            <Button
              onClick={testListFiles}
              disabled={isLoading}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="flex items-center gap-2 mb-2">
                <Play className="h-4 w-4" />
                <span className="font-medium">List Files</span>
              </div>
              <span className="text-xs text-gray-500 text-left">
                Get all uploaded files
              </span>
            </Button>

            <Button
              onClick={testListCollections}
              disabled={isLoading}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start"
            >
              <div className="flex items-center gap-2 mb-2">
                <Play className="h-4 w-4" />
                <span className="font-medium">List Collections</span>
              </div>
              <span className="text-xs text-gray-500 text-left">
                Get all database collections
              </span>
            </Button>
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
                      <span className="font-medium text-sm">{result.test}</span>
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
          <CardTitle>API Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Unified API Endpoint</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All API operations go through the unified endpoint:{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  /krapi/v1/api
                </code>
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Authentication</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Admin operations require Bearer token authentication. Project
                operations use API keys.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Request Format</h4>
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                {`{
  "operation": "admin|database|storage|auth",
  "resource": "projects|collections|files|users",
  "action": "list|create|get|update|delete",
  "params": {
    // Operation-specific parameters
  }
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
