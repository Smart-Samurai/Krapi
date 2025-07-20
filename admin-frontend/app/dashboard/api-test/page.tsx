"use client";

import { useState } from "react";
import { contentAPI, authAPI, healthAPI, routesAPI, usersAPI } from "@/lib/api";
import { Play, Copy, CheckCircle, AlertCircle } from "lucide-react";

interface TestResult {
  endpoint: string;
  method: string;
  status: "success" | "error" | "pending";
  response?: unknown;
  error?: string;
  duration?: number;
}

export default function ApiTestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testKey, setTestKey] = useState("");
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runTest = async (
    endpoint: string,
    method: string,
    testFn: () => Promise<unknown>
  ): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      const response = await testFn();
      const duration = Date.now() - startTime;
      return {
        endpoint,
        method,
        status: "success",
        response,
        duration,
      };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      return {
        endpoint,
        method,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        duration,
      };
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setResults([]);

    const tests = [
      {
        endpoint: "/api/health",
        method: "GET",
        testFn: () => healthAPI.check(),
      },
      {
        endpoint: "/api/auth/verify",
        method: "GET",
        testFn: () => authAPI.verify(),
      },
      {
        endpoint: "/api/admin/content",
        method: "GET",
        testFn: () => contentAPI.getAllContent(),
      },
      {
        endpoint: "/api/admin/routes",
        method: "GET",
        testFn: () => routesAPI.getAllRoutes(),
      },
      {
        endpoint: "/api/admin/users",
        method: "GET",
        testFn: () => usersAPI.getAllUsers(),
      },
    ];

    if (testKey) {
      tests.push({
        endpoint: `/api/content/default/${testKey}`,
        method: "GET",
        testFn: () => contentAPI.getPublicContent("/default", testKey),
      });
    }

    const testResults: TestResult[] = [];

    for (const test of tests) {
      const result = await runTest(test.endpoint, test.method, test.testFn);
      testResults.push(result);
      setResults([...testResults]);
    }

    setIsRunningTests(false);
  };

  const runSingleTest = async (
    endpoint: string,
    method: string,
    testFn: () => Promise<unknown>
  ) => {
    const result = await runTest(endpoint, method, testFn);
    setResults((prev) => {
      const filtered = prev.filter(
        (r) => r.endpoint !== endpoint || r.method !== method
      );
      return [...filtered, result];
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatResponse = (response: unknown): string => {
    return JSON.stringify(response, null, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-text-900 dark:text-text-50">API Testing</h1>
          <p className="mt-1 text-sm text-text-500 dark:text-text-500">
            Test your API endpoints and view responses
          </p>
        </div>
      </div>

      {/* Test Configuration */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Test Configuration
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Test Content Key (Optional)
              </label>
              <input
                type="text"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., homepage.title"
                value={testKey}
                onChange={(e) => setTestKey(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter a content key to test content-specific endpoints
              </p>
            </div>
            <div className="flex items-end">
              <button
                onClick={runAllTests}
                disabled={isRunningTests}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="h-4 w-4 mr-2" />
                {isRunningTests ? "Running Tests..." : "Run All Tests"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Test Buttons */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Individual Tests
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() =>
                runSingleTest("/api/health", "GET", () => healthAPI.check())
              }
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Play className="h-4 w-4 mr-2" />
              Health Check
            </button>

            <button
              onClick={() =>
                runSingleTest("/api/auth/verify", "GET", () => authAPI.verify())
              }
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Play className="h-4 w-4 mr-2" />
              Auth Verify
            </button>

            <button
              onClick={() =>
                runSingleTest("/api/admin/content", "GET", () =>
                  contentAPI.getAllContent()
                )
              }
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Play className="h-4 w-4 mr-2" />
              Get All Content
            </button>

            {testKey && (
              <>
                <button
                  onClick={() =>
                    runSingleTest(`/api/content/test/${testKey}`, "GET", () =>
                      contentAPI.getPublicContent("test", testKey)
                    )
                  }
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Get Public Content
                </button>

                <button
                  onClick={() =>
                    runSingleTest(`/api/admin/content/1`, "GET", () =>
                      contentAPI.getContentById(1)
                    )
                  }
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Get Admin Content
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Test Results
            </h3>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={`${result.endpoint}-${result.method}-${index}`}
                  className={`border rounded-lg p-4 ${
                    result.status === "success"
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {result.status === "success" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium text-sm">
                        {result.method} {result.endpoint}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({result.duration}ms)
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          result.response
                            ? formatResponse(result.response)
                            : result.error || "No data"
                        )
                      }
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>

                  {result.status === "success" &&
                    result.response !== undefined && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-gray-700 mb-1">
                          Response:
                        </div>
                        <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-40">
                          {formatResponse(result.response)}
                        </pre>
                      </div>
                    )}

                  {result.status === "error" && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-red-700 mb-1">
                        Error:
                      </div>
                      <div className="text-xs text-red-600 bg-white p-2 rounded border">
                        {result.error}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* API Documentation */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            API Endpoints
          </h3>
          <div className="space-y-3">
            <div className="border-l-4 border-green-400 pl-4">
              <h4 className="font-medium text-sm">Public Endpoints</h4>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    GET /api/health
                  </code>{" "}
                  - Health check
                </li>
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    GET /api/content/:key
                  </code>{" "}
                  - Get public content by key
                </li>
              </ul>
            </div>
            <div className="border-l-4 border-blue-400 pl-4">
              <h4 className="font-medium text-sm">
                Protected Endpoints (Require Authentication)
              </h4>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    GET /api/auth/verify
                  </code>{" "}
                  - Verify token
                </li>
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    GET /api/admin/content
                  </code>{" "}
                  - Get all content
                </li>
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    GET /api/admin/content/:key
                  </code>{" "}
                  - Get content by key
                </li>
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    POST /api/admin/content
                  </code>{" "}
                  - Create content
                </li>
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    PUT /api/admin/content/:key
                  </code>{" "}
                  - Update content
                </li>
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    DELETE /api/admin/content/:key
                  </code>{" "}
                  - Delete content
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
