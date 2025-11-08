/**
 * Navigation Configuration
 * 
 * Centralized navigation configuration for the application sidebar.
 * Defines navigation items with icons, labels, and routes.
 * 
 * @module lib/navigation-config
 * @example
 * import { navigationItems } from '@/lib/navigation-config';
 * const dashboardItem = navigationItems.dashboard;
 */
import {
  LayoutDashboard,
  Users,
  Settings,
  User,
  TestTube2,
  Key,
  Monitor,
  Mail,
  Server,
  Database,
} from "lucide-react";

/**
 * Navigation Item Interface
 * 
 * @interface NavigationItem
 * @property {React.ComponentType} icon - Icon component
 * @property {string} label - Navigation label
 * @property {string} href - Navigation route
 */
export interface NavigationItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

/**
 * Navigation Items Interface
 * 
 * @interface NavigationItems
 * @property {NavigationItem} dashboard - Dashboard navigation item
 * @property {NavigationItem} projects - Projects navigation item
 * @property {NavigationItem} apiKeys - API Keys navigation item
 * @property {NavigationItem} testSuite - Test Suite navigation item
 * @property {NavigationItem} system - System navigation item
 * @property {NavigationItem} users - Users navigation item
 * @property {NavigationItem} email - Email navigation item
 * @property {NavigationItem} storage - Storage navigation item
 * @property {NavigationItem} settings - Settings navigation item
 * @property {NavigationItem} profile - Profile navigation item
 */
export interface NavigationItems {
  dashboard: NavigationItem;
  projects: NavigationItem;
  apiKeys: NavigationItem;
  testSuite: NavigationItem;
  system: NavigationItem;
  users: NavigationItem;
  email: NavigationItem;
  storage: NavigationItem;
  settings: NavigationItem;
  profile: NavigationItem;
}

/**
 * Navigation Items Configuration
 * 
 * Centralized navigation configuration object.
 * 
 * @constant {NavigationItems}
 * @example
 * const dashboardItem = navigationItems.dashboard;
 * // Returns: { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' }
 */
export const navigationItems: NavigationItems = {
  dashboard: {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
  },
  projects: {
    icon: Database,
    label: "Projects",
    href: "/projects",
  },
  apiKeys: {
    icon: Key,
    label: "API Keys",
    href: "/api-keys",
  },
  testSuite: {
    icon: TestTube2,
    label: "Test Suite",
    href: "/test",
  },
  system: {
    icon: Monitor,
    label: "System",
    href: "/system",
  },
  users: {
    icon: Users,
    label: "Users",
    href: "/users",
  },
  email: {
    icon: Mail,
    label: "Email",
    href: "/email",
  },
  storage: {
    icon: Server,
    label: "Storage",
    href: "/storage",
  },
  settings: {
    icon: Settings,
    label: "Settings",
    href: "/settings",
  },
  profile: {
    icon: User,
    label: "Profile",
    href: "/profile",
  },
};
