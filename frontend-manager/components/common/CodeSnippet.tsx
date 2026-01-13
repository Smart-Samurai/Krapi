"use client";

import { Code2 } from "lucide-react";
import React from "react";


import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CodeSnippetProps {
  context?: string;
  projectId?: string;
  collectionName?: string;
  className?: string;
}

export function CodeSnippet({
  context = "projects",
  projectId,
  collectionName,
  className,
}: CodeSnippetProps) {
  const generateCode = (): string => {
    switch (context) {
      case "projects":
        return `// Connect to KRAPI as a 3rd party application
import { krapi } from "@smartsamurai/krapi-sdk";

// Connect to FRONTEND URL (port 3498), not backend!
await krapi.connect({
  endpoint: "https://your-krapi-instance.com", // Frontend URL
  apiKey: "your-api-key"
});

// Get all projects
const projects = await krapi.projects.getAll();`;
      case "collections":
        return `// Get all collections in a project
const collections = await krapi.collections.getAll("${String(projectId || "project-id")}");`;
      case "documents":
        return `// Get all documents in a collection
const documents = await krapi.documents.getAll(
  "${String(projectId || "project-id")}",
  "${String(collectionName || "collection-name")}"
);`;
      case "api-keys":
        return `// Get all API keys for a project
const apiKeys = await krapi.apiKeys.getAll("${String(projectId || "project-id")}");`;
      default:
        return "// Code snippet";
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Code2 className="mr-2 h-4 w-4" />
          Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Code Example</DialogTitle>
          <DialogDescription>
            Example code for {String(context || "")}
          </DialogDescription>
        </DialogHeader>
        <pre className="bg-muted p-4 rounded overflow-x-auto">
          <code>{String(generateCode() || "")}</code>
        </pre>
      </DialogContent>
    </Dialog>
  );
}

