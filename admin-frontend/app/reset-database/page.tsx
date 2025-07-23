"use client";

import { useState } from "react";
import { unifiedAPI } from "@/lib/unified-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotification } from "@/hooks/useNotification";
import { Database, RefreshCw, AlertTriangle } from "lucide-react";

export default function ResetDatabasePage() {
  const [isResetting, setIsResetting] = useState(false);
  const { showSuccess, showError } = useNotification();

  const handleResetDatabase = async () => {
    if (
      !confirm(
        "Are you sure you want to reset the database? This will delete all data and recreate the default admin user."
      )
    ) {
      return;
    }

    setIsResetting(true);

    try {
      console.log("🔄 Resetting database...");
      const response = await unifiedAPI.admin.resetDatabase();

      console.log("🔄 Reset response:", response);

      if (response.success) {
        showSuccess(
          "Database reset successfully! Default admin user created: admin/admin123"
        );
        console.log("✅ Database reset successful");
      } else {
        showError(
          "Failed to reset database: " + (response.error || "Unknown error")
        );
        console.error("❌ Database reset failed:", response);
      }
    } catch (error) {
      console.error("❌ Database reset error:", error);
      showError(
        "Failed to reset database. Please check the console for details."
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <Database className="h-5 w-5" />
            Database Reset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                Reset Database
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                This will completely reset the database and recreate it with
                default data. All existing content, users, and settings will be
                lost. A default admin user will be created with credentials:{" "}
                <strong>admin / admin123</strong>
              </p>

              <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <h5 className="font-medium text-red-800 dark:text-red-200 mb-2">
                  What will be reset:
                </h5>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  <li>• All content items and routes</li>
                  <li>• All users (except the default admin)</li>
                  <li>• All files and uploads</li>
                  <li>• All email templates and settings</li>
                  <li>• All API keys and configurations</li>
                  <li>• All projects and project data</li>
                </ul>
              </div>

              <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                <h5 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  What will be recreated:
                </h5>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• Default admin user (admin/admin123)</li>
                  <li>• Default roles (admin, editor, viewer)</li>
                  <li>• Default content route</li>
                  <li>• Default email templates</li>
                  <li>• Basic database structure</li>
                </ul>
              </div>

              <Button
                onClick={handleResetDatabase}
                disabled={isResetting}
                variant="destructive"
                className="w-full"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resetting Database...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Reset Database
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
