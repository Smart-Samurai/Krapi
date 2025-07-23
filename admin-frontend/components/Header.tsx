"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  LogOut,
  Menu,
  Search,
  Bell,
  Settings,
  ChevronDown,
  X,
  Loader2,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Sidebar from "./Sidebar";
import UserSettingsModal from "./UserSettingsModal";
import { notificationAPI, searchAPI } from "@/lib/api";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
  projectId?: string;
}

interface SearchResult {
  type:
    | "content"
    | "route"
    | "user"
    | "file"
    | "schema"
    | "template"
    | "endpoint";
  id: number;
  title: string;
  description?: string;
  url: string;
  metadata?: Record<string, unknown>;
  relevance: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  took: number;
}

interface Notification {
  id: number;
  user_id: number;
  type:
    | "content_created"
    | "content_updated"
    | "user_created"
    | "file_uploaded"
    | "system_alert";
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

interface NotificationSummary {
  total: number;
  unread: number;
  notifications: Notification[];
}

export default function Header({
  onMobileMenuToggle,
  isMobileMenuOpen,
}: HeaderProps) {
  const { user, logout, isLoading } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(
    null
  );
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "AD";

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications();
  }, []);

  // Handle search input changes with debouncing
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await performSearch(searchQuery);
    }, 300); // Debounce search requests

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle clicking outside search to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearch(false);
        setShowResults(false);
        setSearchQuery("");
        setSearchResults([]);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    setIsLoadingNotifications(true);
    setNotificationError(null);
    try {
      const response = await notificationAPI.getUserNotifications(10);
      if (response.success) {
        const notificationData = response.data as NotificationSummary;
        setNotifications(notificationData.notifications);
        setUnreadCount(notificationData.unread);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
      setNotificationError("Failed to load notifications");
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      await notificationAPI.markNotificationAsRead(notificationId);
      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await notificationAPI.markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      await notificationAPI.deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      );
      // Decrease unread count if the deleted notification was unread
      const deletedNotification = notifications.find(
        (n) => n.id === notificationId
      );
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const performSearch = async (query: string) => {
    if (query.length < 2) return;

    setIsSearching(true);
    setSearchError(null); // Clear previous errors
    try {
      const response = await searchAPI.searchAll(query);
      if (response.success) {
        const searchData = response.data as SearchResponse;
        setSearchResults(searchData.results);
        setShowResults(true);
      } else {
        setSearchError("Failed to perform search. Please try again.");
      }
    } catch (error) {
      console.error("Search failed:", error);
      setSearchError("Failed to perform search. Please try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultClick = (result: SearchResult) => {
    window.location.href = result.url;
    setShowSearch(false);
    setShowResults(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowSearch(false);
      setShowResults(false);
      setSearchQuery("");
      setSearchResults([]);
    } else if (e.key === "Enter" && searchResults.length > 0) {
      // Navigate to first result on Enter
      handleSearchResultClick(searchResults[0]);
    }
  };

  const openSearchMode = () => {
    setShowSearch(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case "content":
        return "bg-secondary-100 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-200";
      case "route":
        return "bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-200";
      case "user":
        return "bg-background-200 text-text-700 dark:bg-background-200 dark:text-text-300";
      case "file":
        return "bg-background-300 text-text-800 dark:bg-background-300 dark:text-text-200";
      default:
        return "bg-background-200 text-text-700 dark:bg-background-200 dark:text-text-300";
    }
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case "system_alert":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 dark:bg-red-900 dark:text-red-200";
      case "content_created":
        return "bg-secondary-100 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-200";
      case "content_updated":
        return "bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-200";
      case "user_created":
        return "bg-background-200 text-text-700 dark:bg-background-200 dark:text-text-300";
      case "file_uploaded":
        return "bg-background-300 text-text-800 dark:bg-background-300 dark:text-text-200";
      default:
        return "bg-background-200 text-text-700 dark:bg-background-200 dark:text-text-300";
    }
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden h-16 border-b border-background-300 bg-background-100 lg:flex lg:items-center lg:justify-between lg:px-6 relative">
        {isLoading ? (
          <div
            className="flex items-center justify-center w-full"
            data-testid="header-loading"
          >
            <Loader2 className="h-6 w-6 animate-spin text-text-400" />
          </div>
        ) : (
          <>
            <div
              className="flex items-center space-x-4 relative"
              ref={searchRef}
            >
              {!showSearch ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openSearchMode}
                  className="text-text-500 hover:text-text-900"
                  data-testid="search-button"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search...
                </Button>
              ) : (
                <div className="relative">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Input
                        ref={inputRef}
                        role="searchbox"
                        placeholder="Search content, users, files..."
                        className="w-80 pr-8"
                        value={searchQuery}
                        onChange={handleSearchInputChange}
                        onKeyDown={handleSearchKeyDown}
                        data-testid="search-input"
                      />
                      {isSearching && (
                        <Loader2
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-text-400"
                          data-testid="search-loading"
                        />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowSearch(false);
                        setShowResults(false);
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      data-testid="search-close-button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Search Results Dropdown */}
                  {showResults && searchResults && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 w-96 mt-1 bg-background-100 border border-background-300 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                      <div className="p-2">
                        <div className="text-xs text-text-500 mb-2">
                          Found {searchResults.length} results
                        </div>
                        {searchResults.map((result) => (
                          <div
                            key={`${result.type}-${result.id}`}
                            className="p-3 hover:bg-background-200 cursor-pointer rounded-md border-b border-background-200 last:border-b-0"
                            onClick={() => handleSearchResultClick(result)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-sm text-text-900 truncate">
                                    {result.title}
                                  </span>
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${getResultTypeColor(
                                      result.type
                                    )}`}
                                  >
                                    {result.type}
                                  </span>
                                </div>
                                {result.description && (
                                  <p className="text-xs text-text-600 truncate">
                                    {result.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results Message */}
                  {showResults &&
                    searchResults &&
                    searchResults.length === 0 &&
                    searchQuery.length >= 2 &&
                    !isSearching && (
                      <div className="absolute top-full left-0 w-96 mt-1 bg-background-100 border border-background-300 rounded-md shadow-lg z-50">
                        <div className="p-4 text-center text-text-500 text-sm">
                          No results found for &quot;{searchQuery}&quot;
                        </div>
                      </div>
                    )}

                  {/* Search Error Message */}
                  {searchError && (
                    <div className="absolute top-full left-0 w-96 mt-1 bg-background-100 border border-destructive rounded-md shadow-lg z-50">
                      <div className="p-4 text-center text-destructive text-sm">
                        {searchError}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications Dropdown */}
              <div className="relative" ref={notificationsRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative"
                  data-testid="notifications-button"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      className="absolute -right-1 -top-1 h-5 w-5 p-0 text-xs bg-destructive text-white"
                      data-testid="desktop-notification-badge"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </Button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute top-full right-0 w-96 mt-1 bg-background-100 border border-background-300 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-background-300">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Notifications</h3>
                        {unreadCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllNotificationsAsRead}
                            className="text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Mark all read
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {isLoadingNotifications ? (
                        <div className="p-4 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-text-400" />
                        </div>
                      ) : notificationError ? (
                        <div className="p-4 text-center text-destructive text-sm">
                          {notificationError}
                        </div>
                      ) : notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b border-background-200 last:border-b-0 hover:bg-background-200 ${
                              !notification.read ? "bg-background-200" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-sm text-text-900">
                                    {notification.title}
                                  </span>
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${getNotificationTypeColor(
                                      notification.type
                                    )}`}
                                  >
                                    {notification.type.replace("_", " ")}
                                  </span>
                                </div>
                                <p className="text-xs text-text-600 mb-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-text-400">
                                    {formatNotificationTime(
                                      notification.created_at
                                    )}
                                  </span>
                                  <div className="flex items-center space-x-1">
                                    {!notification.read && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          markNotificationAsRead(
                                            notification.id
                                          )
                                        }
                                        className="h-6 w-6 p-0"
                                        data-testid={`mark-read-${notification.id}`}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        deleteNotification(notification.id)
                                      }
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                                      data-testid={`delete-notification-${notification.id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-text-500 text-sm">
                          No notifications
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="h-6 w-px bg-background-300" />

              <ThemeToggle />

              <div className="h-6 w-px bg-background-300" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2"
                    data-testid="user-menu-button"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-text text-background text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex sm:flex-col sm:items-start">
                      <span className="text-sm font-medium">
                        {user?.username}
                      </span>
                      <span className="text-xs text-text-500 capitalize">
                        {user?.role || "Admin"}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.username}
                      </p>
                      <p className="text-xs leading-none text-text-500">
                        {user?.email || "admin@krapi.com"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowSettings(true)}
                    data-testid="settings-button"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    data-testid="logout-button"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </header>

      {/* Mobile Header */}
      <header className="flex h-16 items-center justify-between border-b border-background-300 bg-background-100 px-4 lg:hidden">
        <div className="flex items-center space-x-2">
          <Sheet open={isMobileMenuOpen} onOpenChange={onMobileMenuToggle}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-testid="mobile-menu-button"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <Sidebar />
            </SheetContent>
          </Sheet>

          <div className="text-xl font-bold text-text-900">Krapi CMS</div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={openSearchMode}>
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                className="absolute -right-1 -top-1 h-5 w-5 p-0 text-xs bg-destructive text-white"
                data-testid="mobile-notification-badge"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-text text-background text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.username}
                  </p>
                  <p className="text-xs leading-none text-text-500">
                    {user?.email || "admin@krapi.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowSettings(true)}
                data-testid="mobile-settings-button"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                data-testid="mobile-logout-button"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* User Settings Modal */}
      <UserSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
