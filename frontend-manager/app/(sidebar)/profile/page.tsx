"use client";

import React, { useState } from "react";
import {
  FiUser,
  FiLock,
  FiKey,
  FiShield,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReduxAuth } from "@/contexts/redux-auth-context";
import { useKrapi } from "@/lib/hooks/useKrapi";
import { Scope } from "@/lib/krapi";
import { ExtendedAdminUser } from "@/lib/types/extended";

export default function ProfilePage() {
  const { user, scopes, sessionToken } = useReduxAuth();
  const krapi = useKrapi();
  const extendedUser = user as ExtendedAdminUser;

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // API Key state
  const [showApiKey, setShowApiKey] = useState(false);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
  const [isCreatingMasterKey, setIsCreatingMasterKey] = useState(false);

  const getInitials = () => {
    if (!user) return "U";
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (!krapi?.auth) {
      toast.error("Authentication not initialized");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await krapi.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (response.success) {
        toast.success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(response.error || "Failed to change password");
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!krapi?.auth) return;

    if (
      !confirm(
        "Are you sure you want to regenerate your API key? The old key will stop working immediately."
      )
    ) {
      return;
    }

    setIsRegeneratingKey(true);
    try {
      const response = await krapi.auth.regenerateApiKey();
      if (response.success && response.data) {
        toast.success("API key regenerated successfully");
        // The user object should be updated automatically
      } else {
        toast.error(response.error || "Failed to regenerate API key");
      }
    } catch {
      toast.error("Failed to regenerate API key");
    } finally {
      setIsRegeneratingKey(false);
    }
  };

  const handleCreateMasterApiKey = async () => {
    if (!sessionToken) {
      toast.error("No session token available");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to create a master API key? This will give full access to the entire system."
      )
    ) {
      return;
    }

    setIsCreatingMasterKey(true);
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3470/krapi/k1"
        }/admin/master-api-keys`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            name: "Master API Key for Debugging",
            scopes: ["master"],
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.data) {
        toast.success("Master API key created successfully");
        // Refresh the page or update the user data
        window.location.reload();
      } else {
        toast.error(data.error || "Failed to create master API key");
      }
    } catch {
      toast.error("Failed to create master API key");
    } finally {
      setIsCreatingMasterKey(false);
    }
  };

  const getRoleDisplay = () => {
    if (!user) return "Unknown";
    switch (user.role) {
      case "master_admin":
        return "Master Administrator";
      case "admin":
        return "Administrator";
      case "developer":
        return "Developer";
      default:
        return user.role;
    }
  };

  const getAccessLevelDisplay = () => {
    if (!user) return "Unknown";
    switch (user.access_level) {
      case "full":
        return "Full Access";
      case "read_write":
        return "Read & Write";
      case "read_only":
        return "Read Only";
      default:
        return user.access_level;
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">My Profile</h1>
          <p className="text-text/60 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold">
                  {user?.username || "User"}
                </h2>
                <p className="text-text/60">{user?.email}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline">{getRoleDisplay()}</Badge>
                  <Badge variant="outline">{getAccessLevelDisplay()}</Badge>
                  {user?.active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">
              <FiUser className="mr-2 h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="security">
              <FiLock className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <FiShield className="mr-2 h-4 w-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="api">
              <FiKey className="mr-2 h-4 w-4" />
              API Access
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your basic account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Username</Label>
                    <Input value={user?.username || ""} disabled />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={user?.email || ""} disabled />
                  </div>
                  <div>
                    <Label>Account ID</Label>
                    <Input
                      value={user?.id || ""}
                      disabled
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label>Member Since</Label>
                    <Input
                      value={
                        user?.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : ""
                      }
                      disabled
                    />
                  </div>
                  <div>
                    <Label>Last Login</Label>
                    <Input
                      value={
                        user?.last_login
                          ? new Date(user.last_login).toLocaleString()
                          : "Never"
                      }
                      disabled
                    />
                  </div>
                  <div>
                    <Label>Login Count</Label>
                    <Input
                      value={extendedUser?.login_count?.toString() || "0"}
                      disabled
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPasswords.current ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          current: !showPasswords.current,
                        })
                      }
                    >
                      {showPasswords.current ? (
                        <FiEyeOff className="h-4 w-4" />
                      ) : (
                        <FiEye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPasswords.new ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          new: !showPasswords.new,
                        })
                      }
                    >
                      {showPasswords.new ? (
                        <FiEyeOff className="h-4 w-4" />
                      ) : (
                        <FiEye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be at least 8 characters long
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          confirm: !showPasswords.confirm,
                        })
                      }
                    >
                      {showPasswords.confirm ? (
                        <FiEyeOff className="h-4 w-4" />
                      ) : (
                        <FiEye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handlePasswordChange}
                  disabled={
                    isChangingPassword ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                >
                  {isChangingPassword
                    ? "Changing Password..."
                    : "Change Password"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>Your Permissions</CardTitle>
                <CardDescription>
                  Scopes and access levels assigned to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scopes.includes(Scope.MASTER) ? (
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="font-medium">Master Administrator</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You have full access to all features and resources in
                      Krapi
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Active Scopes</h4>
                      <div className="flex flex-wrap gap-2">
                        {scopes.length > 0 ? (
                          scopes.map((scope) => (
                            <Badge key={scope} variant="secondary">
                              {scope}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No specific scopes assigned
                          </p>
                        )}
                      </div>
                    </div>

                    {extendedUser?.project_ids &&
                      extendedUser.project_ids.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Project Access</h4>
                          <p className="text-sm text-muted-foreground">
                            You have access to {extendedUser.project_ids.length}{" "}
                            project(s)
                          </p>
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Tab */}
          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle>API Key</CardTitle>
                <CardDescription>
                  Your personal API key for programmatic access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {extendedUser?.api_key ? (
                  <>
                    <div>
                      <Label>API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          value={
                            showApiKey
                              ? extendedUser.api_key
                              : `${extendedUser.api_key.substring(0, 8) 
                                }...${ 
                                extendedUser.api_key.substring(
                                  extendedUser.api_key.length - 4
                                )}`
                          }
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? (
                            <FiEyeOff className="h-4 w-4" />
                          ) : (
                            <FiEye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use this key to authenticate API requests
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Regenerate API Key</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Generate a new API key. The current key will stop
                        working immediately.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={handleRegenerateApiKey}
                        disabled={isRegeneratingKey}
                      >
                        {isRegeneratingKey
                          ? "Regenerating..."
                          : "Regenerate API Key"}
                      </Button>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">
                        Create Master API Key
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Create a new API key with master access. This is for
                        debugging and development purposes.
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleCreateMasterApiKey}
                        disabled={isCreatingMasterKey}
                      >
                        {isCreatingMasterKey
                          ? "Creating..."
                          : "Create Master API Key"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No API key available for your account
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
