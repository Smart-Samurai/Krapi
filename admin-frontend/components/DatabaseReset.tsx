"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/hooks/useNotification";
import { unifiedAPI } from "@/lib/unified-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Database, RefreshCw, Trash2 } from "lucide-react";

export default function DatabaseReset() {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Only show for admin users
  if (!user || user.role !== "admin") {
    return null;
  }

  const handleResetDatabase = async () => {
    setIsResetting(true);
    setShowConfirmDialog(false);

    try {
      const response = await unifiedAPI.admin.resetDatabase();

      if (response.success) {
        showSuccess("Database reset successfully! Please refresh the page.");

        // Force page refresh after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showError(
          "Failed to reset database: " + (response.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Database reset error:", error);
      showError(
        "Failed to reset database. Please check the console for details."
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
          <Database className="h-5 w-5" />
          Database Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                Reset Database
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                This will completely reset the database and recreate it with
                default data. All existing content, users, and settings will be
                lost. This action cannot be undone.
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
                  <li>• Default roles and permissions</li>
                  <li>• Default content routes</li>
                  <li>• Default email templates</li>
                  <li>• New project database schema</li>
                </ul>
              </div>
            </div>
          </div>

          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resetting Database...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset Database
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Confirm Database Reset
                </DialogTitle>
                <DialogDescription>
                  Are you absolutely sure you want to reset the database? This
                  action will:
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    <li>• Delete ALL existing data</li>
                    <li>• Remove ALL users, content, and settings</li>
                    <li>• Recreate the database from scratch</li>
                    <li>• This action cannot be undone</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <strong>After reset:</strong> You will be logged out and
                    need to log in again with the default admin credentials
                    (admin/admin123).
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isResetting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleResetDatabase}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Yes, Reset Database
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
