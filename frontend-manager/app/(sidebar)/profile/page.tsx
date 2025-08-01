"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { 
  User, 
  Key, 
  Lock, 
  LogOut, 
  Shield, 
  Mail, 
  Calendar,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  AlertCircle
} from "lucide-react";
import { AdminUser, AdminRole, AccessLevel } from "@/lib/krapi";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function ProfilePage() {
  const { user, krapi, logout, sessionToken, apiKey } = useAuth();
  const router = useRouter();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState<string | null>(null);

  const changePasswordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // If user has an API key stored, use it
    if (apiKey) {
      setCurrentApiKey(apiKey);
    }
  }, [apiKey]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  const handleChangePassword = async (data: ChangePasswordFormData) => {
    if (!krapi) return;

    setIsChangingPassword(true);
    try {
      const response = await krapi.auth.changePassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
      });

      if (response.success) {
        toast.success("Password changed successfully");
        setShowChangePasswordDialog(false);
        changePasswordForm.reset();
      }
    } catch (error: any) {
      console.error("Failed to change password:", error);
      toast.error(error.response?.data?.error || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!krapi) return;

    if (!confirm("Are you sure you want to regenerate your API key? The old key will stop working immediately.")) {
      return;
    }

    setIsRegeneratingKey(true);
    try {
      const response = await krapi.auth.regenerateApiKey();

      if (response.success && response.data) {
        setCurrentApiKey(response.data.api_key);
        toast.success("API key regenerated successfully");
      }
    } catch (error: any) {
      console.error("Failed to regenerate API key:", error);
      toast.error(error.response?.data?.error || "Failed to regenerate API key");
    } finally {
      setIsRegeneratingKey(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case AdminRole.MASTER_ADMIN:
        return "destructive";
      case AdminRole.ADMIN:
        return "default";
      case AdminRole.DEVELOPER:
        return "secondary";
      default:
        return "outline";
    }
  };

  const getAccessLevelBadgeVariant = (level: string) => {
    switch (level) {
      case AccessLevel.FULL:
        return "default";
      case AccessLevel.READ_WRITE:
        return "secondary";
      case AccessLevel.READ_ONLY:
        return "outline";
      default:
        return "outline";
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Not authenticated</p>
              <Button className="mt-4" onClick={() => router.push("/login")}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="space-y-6">
        {/* User Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} />
                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-semibold">{user.username}</h2>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">User ID</Label>
                <p className="font-mono text-sm">{user.id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Role</Label>
                <Badge variant={getRoleBadgeVariant(user.role)} className="mt-1">
                  {user.role.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Access Level</Label>
                <Badge variant={getAccessLevelBadgeVariant(user.access_level)} className="mt-1">
                  {user.access_level.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Account Created</Label>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Last Login</Label>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>

            {/* Permissions */}
            {user.permissions && user.permissions.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Permissions
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.permissions.map((permission) => (
                      <Badge key={permission} variant="secondary" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Authentication Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Session Token */}
            <div>
              <Label className="text-muted-foreground">Session Token</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="text"
                  value={sessionToken ? `${sessionToken.substring(0, 20)}...` : "No active session"}
                  readOnly
                  className="font-mono text-sm"
                />
                {sessionToken && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(sessionToken)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* API Key */}
            <div>
              <Label className="text-muted-foreground">API Key</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={currentApiKey || "No API key generated"}
                  readOnly
                  className="font-mono text-sm"
                />
                {currentApiKey && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(currentApiKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  onClick={handleRegenerateApiKey}
                  disabled={isRegeneratingKey}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRegeneratingKey ? 'animate-spin' : ''}`} />
                  {isRegeneratingKey ? "Regenerating..." : "Regenerate"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Use this API key to authenticate requests to the KRAPI backend
              </p>
            </div>

            <Separator />

            {/* Password Change */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Password</Label>
                <p className="text-sm text-muted-foreground">Change your account password</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowChangePasswordDialog(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new password
            </DialogDescription>
          </DialogHeader>
          <Form {...changePasswordForm}>
            <form onSubmit={changePasswordForm.handleSubmit(handleChangePassword)} className="space-y-4">
              <FormField
                control={changePasswordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={changePasswordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters long
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={changePasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowChangePasswordDialog(false);
                    changePasswordForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}