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
} from "@/components/styled";
import { Form, FormField } from "@/components/forms";
import {
  FiPlus,
  FiShield,
  FiUser,
  FiLock,
  FiSettings,
  FiTrash2,
  FiEdit,
  FiEye,
  FiMoreVertical,
  FiSearch,
  FiFilter,
  FiKey,
  FiUsers,
} from "react-icons/fi";

const authProviderSchema = z.object({
  name: z.string().min(1, "Provider name is required"),
  type: z.string().min(1, "Provider type is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  redirectUrl: z.string().url("Valid redirect URL is required"),
});

type AuthProviderFormData = z.infer<typeof authProviderSchema>;

export default function AuthPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const authProviders = [
    {
      id: "N/I",
      name: "Not Implemented",
      type: "N/I",
      status: "N/I",
      users: 0,
      lastUsed: "N/I",
      icon: "❓",
    },
  ];

  const authSessions = [
    {
      id: "N/I",
      userId: "N/I",
      email: "N/I",
      provider: "N/I",
      ipAddress: "N/I",
      userAgent: "N/I",
      createdAt: "N/I",
      lastActivity: "N/I",
      status: "N/I",
    },
  ];

  const handleCreateAuthProvider = async (data: AuthProviderFormData) => {
    console.log("Create auth provider:", data);
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

  const filteredProviders = authProviders.filter((provider) =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Authentication</h1>
          <p className="text-text/60 mt-1">
            Manage authentication providers and user sessions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary">
            <FiSettings className="mr-2 h-4 w-4" />
            Auth Settings
          </Button>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="default" size="lg">
                <FiPlus className="mr-2 h-4 w-4" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Authentication Provider</DialogTitle>
                <DialogDescription>
                  Configure a new authentication provider for your platform
                </DialogDescription>
              </DialogHeader>
              <Form
                schema={authProviderSchema}
                onSubmit={handleCreateAuthProvider}
              >
                <div className="space-y-4">
                  <FormField
                    name="name"
                    label="Provider Name"
                    type="text"
                    placeholder="Enter provider name"
                    required
                  />
                  <FormField
                    name="type"
                    label="Provider Type"
                    type="select"
                    options={[
                      { value: "oauth", label: "OAuth 2.0" },
                      { value: "saml", label: "SAML SSO" },
                      { value: "local", label: "Local Authentication" },
                    ]}
                    required
                  />
                  <FormField
                    name="clientId"
                    label="Client ID"
                    type="text"
                    placeholder="Enter client ID"
                    required
                  />
                  <FormField
                    name="clientSecret"
                    label="Client Secret"
                    type="password"
                    placeholder="Enter client secret"
                    required
                  />
                  <FormField
                    name="redirectUrl"
                    label="Redirect URL"
                    type="text"
                    placeholder="Enter redirect URL"
                    required
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
                    Add Provider
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
              <p className="text-sm font-medium text-text/60">
                Active Providers
              </p>
              <p className="text-2xl font-bold text-text mt-1">
                {authProviders.filter((p) => p.status === "active").length}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <FiShield className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Total Users</p>
              <p className="text-2xl font-bold text-text mt-1">
                {authProviders.reduce((sum, p) => sum + p.users, 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FiUsers className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">
                Active Sessions
              </p>
              <p className="text-2xl font-bold text-text mt-1">
                {authSessions.filter((s) => s.status === "active").length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FiKey className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Failed Logins</p>
              <p className="text-2xl font-bold text-text mt-1">3</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <FiLock className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Auth Providers */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text">
              Authentication Providers
            </h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search providers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-secondary rounded-lg bg-background text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="divide-y divide-secondary/50">
          {filteredProviders.map((provider) => (
            <div
              key={provider.id}
              className="p-6 hover:bg-secondary/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-2xl">
                    {provider.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-text">{provider.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          provider.status
                        )}`}
                      >
                        {provider.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-text/60">
                      <span>Type: {provider.type}</span>
                      <span>Users: {provider.users}</span>
                      <span>Last used: {provider.lastUsed}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
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
                    title="Edit Provider"
                  />
                  <IconButton
                    icon={FiSettings}
                    variant="secondary"
                    size="sm"
                    title="Provider Settings"
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

      {/* Active Sessions */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <h2 className="text-xl font-semibold text-text">Active Sessions</h2>
        </div>
        <div className="divide-y divide-secondary/50">
          {authSessions.map((session) => (
            <div
              key={session.id}
              className="p-6 hover:bg-secondary/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FiUser className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-text">{session.email}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          session.status
                        )}`}
                      >
                        {session.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-text/60">
                      <span>Provider: {session.provider}</span>
                      <span>IP: {session.ipAddress}</span>
                      <span>Created: {session.createdAt}</span>
                      <span>Last activity: {session.lastActivity}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="secondary" size="sm">
                    Revoke
                  </Button>
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

      {/* Info Block */}
      <InfoBlock
        title="Authentication Security"
        variant="info"
        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      >
        <div className="text-sm space-y-2">
          <p>
            KRAPI supports multiple authentication providers for secure user
            access to your platform.
          </p>
          <p>
            <strong>OAuth 2.0:</strong> Support for Google, GitHub, and other
            OAuth providers for seamless social login.
          </p>
          <p>
            <strong>SAML SSO:</strong> Enterprise-grade single sign-on for
            corporate environments.
          </p>
          <p>
            <strong>Session Management:</strong> Monitor and manage active user
            sessions with the ability to revoke access when needed.
          </p>
        </div>
      </InfoBlock>
    </div>
  );
}
