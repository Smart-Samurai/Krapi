"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  FileText,
  Database,
  HardDrive,
  Users,
  Settings,
  Loader2,
} from "lucide-react";
import { Scope } from "@/lib/krapi";

interface TestResult {
  endpoint: string;
  method: string;
  requiredScopes: string[];
  hasAccess: boolean;
  response?: any;
  error?: string;
  timestamp: string;
}

const TEST_ENDPOINTS = [
  // Admin endpoints
  {
    category: "Admin",
    icon: Users,
    tests: [
      {
        endpoint: "/admin/users",
        method: "GET",
        scopes: [Scope.ADMIN_READ],
        description: "List admin users",
      },
      {
        endpoint: "/admin/users",
        method: "POST",
        scopes: [Scope.ADMIN_WRITE],
        description: "Create admin user",
      },
      {
        endpoint: "/admin/users/123",
        method: "PUT",
        scopes: [Scope.ADMIN_WRITE],
        description: "Update admin user",
      },
      {
        endpoint: "/admin/users/123",
        method: "DELETE",
        scopes: [Scope.ADMIN_DELETE],
        description: "Delete admin user",
      },
    ],
  },
  // Project endpoints
  {
    category: "Projects",
    icon: Settings,
    tests: [
      {
        endpoint: "/projects",
        method: "GET",
        scopes: [Scope.PROJECTS_READ],
        description: "List projects",
      },
      {
        endpoint: "/projects",
        method: "POST",
        scopes: [Scope.PROJECTS_WRITE],
        description: "Create project",
      },
      {
        endpoint: "/projects/123",
        method: "GET",
        scopes: [Scope.PROJECTS_READ],
        description: "Get project details",
      },
      {
        endpoint: "/projects/123",
        method: "PUT",
        scopes: [Scope.PROJECTS_WRITE],
        description: "Update project",
      },
      {
        endpoint: "/projects/123",
        method: "DELETE",
        scopes: [Scope.PROJECTS_DELETE],
        description: "Delete project",
      },
    ],
  },
  // Collections endpoints
  {
    category: "Collections",
    icon: Database,
    tests: [
      {
        endpoint: "/projects/123/collections",
        method: "GET",
        scopes: [Scope.COLLECTIONS_READ],
        description: "List collections",
      },
      {
        endpoint: "/projects/123/collections",
        method: "POST",
        scopes: [Scope.COLLECTIONS_WRITE],
        description: "Create collection",
      },
      {
        endpoint: "/projects/123/collections/users",
        method: "PUT",
        scopes: [Scope.COLLECTIONS_WRITE],
        description: "Update collection",
      },
      {
        endpoint: "/projects/123/collections/users",
        method: "DELETE",
        scopes: [Scope.COLLECTIONS_DELETE],
        description: "Delete collection",
      },
    ],
  },
  // Documents endpoints
  {
    category: "Documents",
    icon: FileText,
    tests: [
      {
        endpoint: "/projects/123/collections/users/documents",
        method: "GET",
        scopes: [Scope.DOCUMENTS_READ],
        description: "List documents",
      },
      {
        endpoint: "/projects/123/collections/users/documents",
        method: "POST",
        scopes: [Scope.DOCUMENTS_WRITE],
        description: "Create document",
      },
      {
        endpoint: "/projects/123/collections/users/documents/456",
        method: "PUT",
        scopes: [Scope.DOCUMENTS_WRITE],
        description: "Update document",
      },
      {
        endpoint: "/projects/123/collections/users/documents/456",
        method: "DELETE",
        scopes: [Scope.DOCUMENTS_DELETE],
        description: "Delete document",
      },
    ],
  },
  // Storage endpoints
  {
    category: "Storage",
    icon: HardDrive,
    tests: [
      {
        endpoint: "/projects/123/storage/files",
        method: "GET",
        scopes: [Scope.STORAGE_READ],
        description: "List files",
      },
      {
        endpoint: "/projects/123/storage/upload",
        method: "POST",
        scopes: [Scope.STORAGE_WRITE],
        description: "Upload file",
      },
      {
        endpoint: "/projects/123/storage/files/789",
        method: "GET",
        scopes: [Scope.STORAGE_READ],
        description: "Download file",
      },
      {
        endpoint: "/projects/123/storage/files/789",
        method: "DELETE",
        scopes: [Scope.STORAGE_DELETE],
        description: "Delete file",
      },
    ],
  },
];

export default function TestAccessPage() {
  const {
    user,
    krapi,
    scopes,
    hasScope,
    hasMasterAccess,
    sessionToken,
    apiKey,
  } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const runTest = async (
    endpoint: string,
    method: string,
    requiredScopes: string[]
  ) => {
    if (!krapi) return;

    const hasAccess = hasScope(requiredScopes);
    const timestamp = new Date().toISOString();

    try {
      // Simulate API call - in real implementation, make actual requests
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/krapi/k1";
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey ? `ApiKey ${apiKey}` : `Bearer ${sessionToken}`,
        },
      });

      const data = await response.json();

      const result: TestResult = {
        endpoint,
        method,
        requiredScopes,
        hasAccess,
        timestamp,
        response: data,
        error: !response.ok ? data.error : undefined,
      };

      return result;
    } catch (error: any) {
      return {
        endpoint,
        method,
        requiredScopes,
        hasAccess,
        timestamp,
        error: error.message,
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setTestResults([]);

    const results: TestResult[] = [];

    for (const category of TEST_ENDPOINTS) {
      if (selectedCategory !== "all" && selectedCategory !== category.category)
        continue;

      for (const test of category.tests) {
        const result = await runTest(test.endpoint, test.method, test.scopes);
        if (result) {
          results.push(result);
          setTestResults([...results]);
        }

        // Small delay between tests
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    setTesting(false);
    toast.success(`Completed ${results.length} tests`);
  };

  const exportResults = () => {
    const data = {
      user: {
        username: user?.username,
        role: user?.role,
        scopes,
      },
      testResults,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `access-test-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Test results exported");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Access Control Testing</h1>
        <p className="text-muted-foreground">
          Test your current permissions against all API endpoints
        </p>
      </div>

      {/* Current Access Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Current Access Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Authentication Type</p>
              <Badge variant={apiKey ? "secondary" : "default"}>
                {apiKey ? "API Key" : "Session Token"}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium">User Role</p>
              <Badge
                variant={
                  user?.role === "master_admin" ? "default" : "secondary"
                }
              >
                {user?.role || "Unknown"}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">
              Active Scopes ({scopes.length})
            </p>
            {hasMasterAccess() ? (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Master Access</AlertTitle>
                <AlertDescription>
                  You have the MASTER scope which grants access to all endpoints
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {scopes.map((scope) => (
                  <div key={scope} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{scope}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Endpoints</CardTitle>
          <CardDescription>
            Run tests against API endpoints to verify your access permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Tabs
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              className="flex-1"
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                {TEST_ENDPOINTS.map((cat) => (
                  <TabsTrigger key={cat.category} value={cat.category}>
                    <cat.icon className="mr-2 h-4 w-4" />
                    {cat.category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex gap-2">
              <Button onClick={runAllTests} disabled={testing}>
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Tests
                  </>
                )}
              </Button>

              {testResults.length > 0 && (
                <Button variant="outline" onClick={exportResults}>
                  Export Results
                </Button>
              )}
            </div>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Test Results</h3>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Passed: {testResults.filter((r) => !r.error).length}
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Failed: {testResults.filter((r) => r.error).length}
                  </span>
                </div>
              </div>

              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.error
                          ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                          : "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {result.error ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            <span className="font-mono text-sm">
                              {result.method} {result.endpoint}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            Required: {result.requiredScopes.join(", ")}
                          </div>
                          {result.error && (
                            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                              Error: {result.error}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={result.hasAccess ? "default" : "destructive"}
                        >
                          {result.hasAccess ? "Has Access" : "No Access"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
