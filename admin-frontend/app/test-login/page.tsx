"use client";

import { useState } from "react";
import { unifiedAPI } from "@/lib/unified-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TestLoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [results, setResults] = useState<any[]>([]);

  const addResult = (test: string, success: boolean, data: any) => {
    setResults((prev) => [
      ...prev,
      {
        test,
        success,
        data,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const testHealth = async () => {
    try {
      console.log("🏥 Testing health endpoint...");
      const response = await unifiedAPI.health();
      console.log("🏥 Health response:", response);
      addResult("Health Check", true, response);
    } catch (error: any) {
      console.error("🏥 Health error:", error);
      addResult("Health Check", false, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  };

  const testDirectAuth = async () => {
    try {
      console.log("🔐 Testing direct auth endpoint...");

      // Test the auth endpoint directly with fetch
      const response = await fetch("http://localhost:3470/krapi/v1/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "login",
          username,
          password,
        }),
      });

      const data = await response.json();
      console.log("🔐 Direct auth response:", {
        status: response.status,
        data,
      });

      if (response.ok) {
        addResult("Direct Auth", true, { status: response.status, data });
      } else {
        addResult("Direct Auth", false, { status: response.status, data });
      }
    } catch (error: any) {
      console.error("🔐 Direct auth error:", error);
      addResult("Direct Auth", false, { error: error.message });
    }
  };

  const testUnifiedAuth = async () => {
    try {
      console.log("🔐 Testing unified API auth...");
      const response = await unifiedAPI.auth.login(username, password);
      console.log("🔐 Unified auth response:", response);
      addResult("Unified Auth", true, response);
    } catch (error: any) {
      console.error("🔐 Unified auth error:", error);
      addResult("Unified Auth", false, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  };

  const testOldAuth = async () => {
    try {
      console.log("🔐 Testing old auth endpoint...");

      // Test the old auth endpoint
      const response = await fetch("http://localhost:3470/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();
      console.log("🔐 Old auth response:", { status: response.status, data });

      if (response.ok) {
        addResult("Old Auth", true, { status: response.status, data });
      } else {
        addResult("Old Auth", false, { status: response.status, data });
      }
    } catch (error: any) {
      console.error("🔐 Old auth error:", error);
      addResult("Old Auth", false, { error: error.message });
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Login Debug Test Page</CardTitle>
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
            <Button onClick={testHealth} variant="outline">
              Test Health
            </Button>
            <Button onClick={testDirectAuth} variant="outline">
              Test Direct Auth
            </Button>
            <Button onClick={testUnifiedAuth} variant="outline">
              Test Unified Auth
            </Button>
            <Button onClick={testOldAuth} variant="outline">
              Test Old Auth
            </Button>
            <Button onClick={clearResults} variant="destructive">
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-gray-500">
              No test results yet. Run some tests to see results here.
            </p>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
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
