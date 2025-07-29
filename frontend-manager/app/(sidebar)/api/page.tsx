"use client";

import React, { useState } from "react";
import { z } from "zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  IconButton,
  InfoBlock,
  Input,
} from "@/components/styled";
import { Form, FormField } from "@/components/forms";
import {
  FiPlus,
  FiCode,
  FiKey,
  FiGlobe,
  FiSettings,
  FiTrash2,
  FiEdit,
  FiEye,
  FiMoreVertical,
  FiSearch,
  FiFilter,
  FiCopy,
  FiDownload,
} from "react-icons/fi";

const apiKeySchema = z.object({
  name: z.string().min(1, "API key name is required"),
  permissions: z
    .array(z.string())
    .min(1, "At least one permission is required"),
  expiresAt: z.string().optional(),
});

type ApiKeyFormData = z.infer<typeof apiKeySchema>;

export default function ApiPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const apiKeys = [
    {
      id: "N/I",
      name: "Not Implemented",
      key: "N/I",
      permissions: ["N/I"],
      status: "N/I",
      createdAt: "N/I",
      lastUsed: "N/I",
    },
  ];

  const endpoints = [
    {
      method: "N/I",
      path: "N/I",
      description: "Not Implemented",
      status: "N/I",
    },
  ];

  const handleCreateApiKey = async (data: ApiKeyFormData) => {
    console.log("Create API key:", data);
    setIsCreateDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      case "expired":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "POST":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "PUT":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "DELETE":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const filteredApiKeys = apiKeys.filter((key) =>
    key.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">API Management</h1>
          <p className="text-text/60 mt-1">
            Manage API keys and explore available endpoints
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary">
            <FiDownload className="mr-2 h-4 w-4" />
            Export Documentation
          </Button>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="default" size="lg">
                <FiPlus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Generate a new API key with specific permissions
                </DialogDescription>
              </DialogHeader>
              <Form schema={apiKeySchema} onSubmit={handleCreateApiKey}>
                <div className="space-y-4">
                  <FormField
                    name="name"
                    label="Key Name"
                    type="text"
                    placeholder="Enter API key name"
                    required
                  />
                  <FormField
                    name="permissions"
                    label="Permissions"
                    type="select"
                    options={[
                      { value: "read", label: "Read Only" },
                      { value: "write", label: "Read & Write" },
                      { value: "admin", label: "Admin Access" },
                    ]}
                    required
                  />
                  <FormField
                    name="expiresAt"
                    label="Expiration Date"
                    type="text"
                    placeholder="Optional expiration date"
                  />
                </div>
                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="default">
                    Create Key
                  </Button>
                </DialogFooter>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Active Keys</p>
              <p className="text-2xl font-bold text-text mt-1">
                {apiKeys.filter((k) => k.status === "active").length}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <FiKey className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">API Endpoints</p>
              <p className="text-2xl font-bold text-text mt-1">
                {endpoints.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FiGlobe className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Requests Today</p>
              <p className="text-2xl font-bold text-text mt-1">1,234</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FiCode className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Error Rate</p>
              <p className="text-2xl font-bold text-text mt-1">0.2%</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <FiSettings className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text">API Keys</h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search API keys..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-secondary rounded-lg bg-background text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="divide-y divide-secondary/50">
          {filteredApiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="p-6 hover:bg-secondary/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FiKey className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-text">{apiKey.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          apiKey.status
                        )}`}
                      >
                        {apiKey.status}
                      </span>
                    </div>
                    <p className="text-sm text-text/60 mt-1 font-mono">
                      {apiKey.key}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-text/60">
                      <span>Permissions: {apiKey.permissions.join(", ")}</span>
                      <span>Created: {apiKey.createdAt}</span>
                      <span>Last used: {apiKey.lastUsed}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <IconButton
                    icon={FiCopy}
                    variant="secondary"
                    size="sm"
                    title="Copy API Key"
                  />
                  <IconButton
                    icon={FiEye}
                    variant="secondary"
                    size="sm"
                    title="View Details"
                  />
                  <IconButton
                    icon={FiEdit}
                    variant="secondary"
                    size="sm"
                    title="Edit Key"
                  />
                  <IconButton
                    icon={FiMoreVertical}
                    variant="secondary"
                    size="sm"
                    title="More Options"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Endpoints */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <h2 className="text-xl font-semibold text-text">
            Available Endpoints
          </h2>
        </div>
        <div className="divide-y divide-secondary/50">
          {endpoints.map((endpoint, index) => (
            <div
              key={index}
              className="p-6 hover:bg-secondary/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${getMethodColor(
                      endpoint.method
                    )}`}
                  >
                    {endpoint.method}
                  </span>
                  <div className="flex-1">
                    <p className="font-mono text-text">{endpoint.path}</p>
                    <p className="text-sm text-text/60 mt-1">
                      {endpoint.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                      endpoint.status
                    )}`}
                  >
                    {endpoint.status}
                  </span>
                  <Button variant="secondary" size="sm">
                    Try it
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Block */}
      <InfoBlock
        title="API Documentation"
        variant="info"
        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      >
        <div className="text-sm space-y-2">
          <p>
            KRAPI provides a comprehensive REST API for integrating with your
            applications.
          </p>
          <p>
            <strong>Authentication:</strong> Use API keys for authentication.
            Include the key in the Authorization header:{" "}
            <code className="bg-secondary/20 px-1 rounded">
              Authorization: Bearer YOUR_API_KEY
            </code>
          </p>
          <p>
            <strong>Rate Limiting:</strong> API requests are limited to 1000
            requests per minute per API key.
          </p>
        </div>
      </InfoBlock>
    </div>
  );
}
