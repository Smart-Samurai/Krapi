"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/hooks/useNotification";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Lock, Bell, Save, Eye, EyeOff, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  content_updates: boolean;
  user_activities: boolean;
  system_alerts: boolean;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function UserSettingsModal({
  isOpen,
  onClose,
}: UserSettingsModalProps) {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useNotification();

  // Profile state
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    username: "",
    email: "",
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password state
  const [passwordForm, setPasswordForm] = useState<PasswordChangeData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPreferences>({
      email_notifications: true,
      push_notifications: true,
      content_updates: true,
      user_activities: false,
      system_alerts: true,
    });
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false);

  const [activeTab, setActiveTab] = useState("profile");

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadUserProfile();
      loadNotificationPreferences();
      setProfileForm({
        username: user.username || "",
        email: user.email || "",
      });
    }
  }, [isOpen, user]);

  const loadUserProfile = async () => {
    try {
      const response = await api.get("/auth/profile");
      if (response.data.success) {
        setProfileData(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const response = await api.get("/notifications/preferences");
      if (response.data.success) {
        setNotificationPrefs(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load notification preferences:", error);
    }
  };

  const handleProfileUpdate = async () => {
    if (!profileForm.username.trim()) {
      showError("Username is required");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const response = await api.put("/auth/profile", {
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
      });

      if (response.data.success) {
        showSuccess("Profile updated successfully");
        await refreshUser();
        setProfileData(response.data.data);
      } else {
        showError(response.data.error || "Failed to update profile");
      }
    } catch (error: unknown) {
      let message = "Failed to update profile";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { error?: string } };
        };
        message =
          axiosError.response?.data?.error || "Failed to update profile";
      }
      showError(message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword) {
      showError("Current password is required");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showError("New password must be at least 6 characters");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError("New passwords don't match");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await api.post("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (response.data.success) {
        showSuccess("Password changed successfully");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        showError(response.data.error || "Failed to change password");
      }
    } catch (error: unknown) {
      let message = "Failed to change password";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { error?: string } };
        };
        message =
          axiosError.response?.data?.error || "Failed to change password";
      }
      showError(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNotificationPrefsUpdate = async () => {
    setIsUpdatingPrefs(true);
    try {
      const response = await api.put(
        "/notifications/preferences",
        notificationPrefs
      );

      if (response.data.success) {
        showSuccess("Notification preferences updated");
      } else {
        showError(response.data.error || "Failed to update preferences");
      }
    } catch (error: unknown) {
      let message = "Failed to update preferences";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { error?: string } };
        };
        message =
          axiosError.response?.data?.error || "Failed to update preferences";
      }
      showError(message);
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  const getUserInitials = () => {
    return user?.username ? user.username.slice(0, 2).toUpperCase() : "U";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>User Settings</span>
          </DialogTitle>
          <DialogDescription>
            Manage your account settings and preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="profile"
              className="flex items-center space-x-2"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger
              value="password"
              className="flex items-center space-x-2"
            >
              <Lock className="h-4 w-4" />
              <span>Password</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center space-x-2"
            >
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary-600 text-white text-lg">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{user?.username}</h3>
                <p className="text-sm text-text-500 capitalize">{user?.role}</p>
                {profileData?.created_at && (
                  <p className="text-xs text-text-400">
                    Member since{" "}
                    {new Date(profileData.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={profileForm.username}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <Label>Role</Label>
                <Input
                  value={user?.role || ""}
                  disabled
                  className="bg-background-50"
                />
              </div>
            </div>

            <Button
              onClick={handleProfileUpdate}
              disabled={isUpdatingProfile}
              className="w-full"
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Profile
                </>
              )}
            </Button>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password" className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        current: !prev.current,
                      }))
                    }
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter new password (min 6 characters)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() =>
                      setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                    }
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        confirm: !prev.confirm,
                      }))
                    }
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Button
              onClick={handlePasswordChange}
              disabled={isChangingPassword}
              className="w-full"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing Password...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </>
              )}
            </Button>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-text-500">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs.email_notifications}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs((prev) => ({
                      ...prev,
                      email_notifications: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-text-500">
                    Receive browser push notifications
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs.push_notifications}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs((prev) => ({
                      ...prev,
                      push_notifications: checked,
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Content Updates</Label>
                  <p className="text-sm text-text-500">
                    Notifications about content changes
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs.content_updates}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs((prev) => ({
                      ...prev,
                      content_updates: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>User Activities</Label>
                  <p className="text-sm text-text-500">
                    Notifications about user actions
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs.user_activities}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs((prev) => ({
                      ...prev,
                      user_activities: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Alerts</Label>
                  <p className="text-sm text-text-500">
                    Important system notifications
                  </p>
                </div>
                <Switch
                  checked={notificationPrefs.system_alerts}
                  onCheckedChange={(checked) =>
                    setNotificationPrefs((prev) => ({
                      ...prev,
                      system_alerts: checked,
                    }))
                  }
                />
              </div>
            </div>

            <Button
              onClick={handleNotificationPrefsUpdate}
              disabled={isUpdatingPrefs}
              className="w-full"
            >
              {isUpdatingPrefs ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Preferences
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
