"use client";

import React from "react";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-text mb-4">Test Page</h1>
        <p className="text-text/60">
          If you can see this, basic rendering is working!
        </p>
        <div className="mt-4 p-4 bg-primary/10 rounded-lg">
          <p className="text-primary">Primary color test</p>
        </div>
      </div>
    </div>
  );
}
