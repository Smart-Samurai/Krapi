"use client";

import ApiDebugger from "@/components/ApiDebugger";

export default function ApiTestPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-background-100 dark:bg-background-100 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-text-900 dark:text-text-50">
            API Testing & Debugging
          </h1>
          <p className="mt-1 text-sm text-text-500 dark:text-text-500">
            Test your API endpoints with verbose error handling and detailed
            debugging information
          </p>
        </div>
      </div>

      {/* API Debugger Component */}
      <ApiDebugger />
    </div>
  );
}
