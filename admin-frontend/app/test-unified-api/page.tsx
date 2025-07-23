"use client";

import { useState } from "react";
import { unifiedAPI } from "@/lib/unified-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/hooks/useNotification";

export default function TestUnifiedApiPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [token, setToken] = useState("");
  const [testResults, setTestResults] = useState<any[]>([]);
  const { showSuccess, showError } = useNotification();

  const addResult = (test: string, success: boolean, data: any) => {
    setTestResults((prev) => [
      ...prev,
      {
        test,
        success,
        data,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const testAuth = async () => {
    try {
      console.log("Testing auth login...");
      const response = await unifiedAPI.auth.login(username, password);
      console.log("Auth response:", response);

      if (response.success && response.token) {
        setToken(response.token);
        localStorage.setItem("auth_token", response.token);
        addResult("Auth Login", true, response);
        showSuccess("Authentication successful!");
      } else {
        addResult("Auth Login", false, response);
        showError(
          "Authentication failed: " + (response.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Auth error:", error);
      addResult("Auth Login", false, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      showError(
        "Authentication error: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const testHealth = async () => {
    try {
      console.log("Testing health check...");
      const response = await unifiedAPI.health();
      console.log("Health response:", response);

      if (response.success) {
        addResult("Health Check", true, response);
        showSuccess("Health check successful!");
      } else {
        addResult("Health Check", false, response);
        showError(
          "Health check failed: " + (response.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Health error:", error);
      addResult("Health Check", false, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      showError(
        "Health check error: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const testProjects = async () => {
    try {
      console.log("Testing projects list...");
      const response = await unifiedAPI.admin.listProjects();
      console.log("Projects response:", response);

      if (response.success) {
        addResult("List Projects", true, response);
        showSuccess("Projects list successful!");
      } else {
        addResult("List Projects", false, response);
        showError(
          "Projects list failed: " + (response.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Projects error:", error);
      addResult("List Projects", false, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      showError(
        "Projects list error: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const testCreateProject = async () => {
    try {
      console.log("Testing project creation...");
      const projectData = {
        name: "Test Project " + Date.now(),
        description: "Test project created via unified API",
        settings: {
          auth: { enabled: true, methods: ["jwt"] },
          storage: { max_file_size: 10485760 },
          api: { rate_limit: 1000 },
          database: { max_collections: 100 },
        },
      };

      const response = await unifiedAPI.admin.createProject(projectData);
      console.log("Create project response:", response);

      if (response.success) {
        addResult("Create Project", true, response);
        showSuccess("Project creation successful!");
      } else {
        addResult("Create Project", false, response);
        showError(
          "Project creation failed: " + (response.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Create project error:", error);
      addResult("Create Project", false, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      showError(
        "Project creation error: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const testDatabaseStats = async () => {
    try {
      console.log("Testing database stats...");
      const response = await unifiedAPI.admin.getDatabaseStats();
      console.log("Database stats response:", response);

      if (response.success) {
        addResult("Database Stats", true, response);
        showSuccess("Database stats successful!");
      } else {
        addResult("Database Stats", false, response);
        showError(
          "Database stats failed: " + (response.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Database stats error:", error);
      addResult("Database Stats", false, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      showError(
        "Database stats error: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Unified API Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={testAuth} variant="default">
              Test Auth
            </Button>
            <Button onClick={testHealth} variant="outline">
              Test Health
            </Button>
            <Button onClick={testProjects} variant="outline" disabled={!token}>
              Test Projects
            </Button>
            <Button
              onClick={testCreateProject}
              variant="outline"
              disabled={!token}
            >
              Test Create Project
            </Button>
            <Button
              onClick={testDatabaseStats}
              variant="outline"
              disabled={!token}
            >
              Test Database Stats
            </Button>
            <Button onClick={clearResults} variant="destructive">
              Clear Results
            </Button>
          </div>

          {token && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Token:</strong> {token.substring(0, 20)}...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <p className="text-gray-500">
              No test results yet. Run some tests to see results here.
            </p>
          ) : (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4
                      className={`font-medium ${
                        result.success
                          ? "text-green-800 dark:text-green-200"
                          : "text-red-800 dark:text-red-200"
                      }`}
                    >
                      {result.test}
                    </h4>
                    <span
                      className={`text-sm px-2 py-1 rounded ${
                        result.success
                          ? "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200"
                          : "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200"
                      }`}
                    >
                      {result.success ? "SUCCESS" : "FAILED"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {result.timestamp}
                  </p>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
