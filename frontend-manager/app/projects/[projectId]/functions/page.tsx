"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FiCode } from "react-icons/fi";

export default function ProjectFunctionsPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Functions</h1>
          <p className="text-text/60 mt-2">
            Deploy and manage serverless functions
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FiCode className="w-16 h-16 text-text/30 mb-4" />
            <h3 className="text-xl font-semibold text-text mb-2">
              Coming Soon
            </h3>
            <p className="text-text/60 text-center max-w-md">
              Serverless functions will be available in a future update. 
              You'll be able to deploy custom backend logic, handle webhooks, 
              and run scheduled tasks.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}