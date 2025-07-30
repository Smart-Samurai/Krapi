"use client";

import React, { useState, createContext, useContext, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import {
  FiMenu,
  FiX,
  FiHome,
  FiSettings,
  FiUsers,
  FiDatabase,
  FiFileText,
  FiMail,
  FiActivity,
  FiCode,
  FiShield,
  FiSun,
  FiMoon,
} from "react-icons/fi";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";

// Sidebar Context
interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

// Sidebar Provider
interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({
  children,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);
  const open = () => setIsOpen(true);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close, open }}>
      {children}
    </SidebarContext.Provider>
  );
};

// Sidebar Root
interface SidebarRootProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarRoot: React.FC<SidebarRootProps> = ({
  children,
  className,
}) => {
  return <div className={cn("flex h-screen", className)}>{children}</div>;
};

// Sidebar
interface SidebarProps {
  children: React.ReactNode;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ children, className }) => {
  const { isOpen } = useSidebar();

  return (
    <aside
      className={cn(
        "flex flex-col bg-background border-r border-secondary transition-all duration-300 ease-in-out",
        isOpen ? "w-64" : "w-16",
        className
      )}
    >
      {children}
    </aside>
  );
};

// Sidebar Header
interface SidebarHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  children,
  className,
}) => {
  const { toggle, isOpen } = useSidebar();

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 border-b border-secondary",
        className
      )}
    >
      <div className="flex items-center space-x-3">
        <IconButton
          onClick={toggle}
          icon={FiMenu}
          variant="secondary"
          size="sm"
          className="h-8 w-8"
        />
        <span
          className={cn(
            "text-lg font-semibold text-text transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0"
          )}
        >
          KRAPI
        </span>
      </div>
    </div>
  );
};

// Sidebar Content
interface SidebarContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn("flex-1 overflow-y-auto p-2", className)}>
      {children}
    </div>
  );
};

// Sidebar Footer
interface SidebarFooterProps {
  children?: React.ReactNode;
  className?: string;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  children,
  className,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use a consistent title during SSR
  const buttonTitle = mounted
    ? `Switch to ${theme === "light" ? "dark" : "light"} mode`
    : "Toggle theme";

  return (
    <div className={cn("p-4 border-t border-secondary", className)}>
      <div className="flex items-center justify-between">
        <IconButton
          icon={mounted && theme === "light" ? FiMoon : FiSun}
          onClick={toggleTheme}
          variant="secondary"
          size="sm"
          title={buttonTitle}
        />
        {children}
      </div>
    </div>
  );
};

// Sidebar Navigation Item
interface SidebarNavItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  icon,
  label,
  href,
  isActive = false,
  onClick,
  className,
}) => {
  const { isOpen } = useSidebar();

  const content = (
    <div
      className={cn(
        "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors cursor-pointer",
        isActive ? "bg-primary text-text" : "text-text hover:bg-secondary/20",
        className
      )}
      onClick={onClick}
    >
      <div className="flex-shrink-0">{icon}</div>
      <span
        className={cn(
          "text-sm font-medium truncate transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
      >
        {label}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

// Sidebar Navigation Group
interface SidebarNavGroupProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const SidebarNavGroup: React.FC<SidebarNavGroupProps> = ({
  title,
  children,
  className,
}) => {
  const { isOpen } = useSidebar();

  return (
    <div className={cn("mb-6", className)}>
      <h3
        className={cn(
          "px-3 mb-2 text-xs font-semibold text-text/60 uppercase tracking-wider transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
      >
        {title}
      </h3>
      <nav className="space-y-1">{children}</nav>
    </div>
  );
};

// Sidebar Toggle Button (for external use)
interface SidebarToggleProps {
  className?: string;
}

export const SidebarToggle: React.FC<SidebarToggleProps> = ({ className }) => {
  const { toggle, isOpen } = useSidebar();

  return (
    <IconButton
      onClick={toggle}
      icon={isOpen ? FiX : FiMenu}
      variant="secondary"
      size="sm"
      className={cn("h-8 w-8", className)}
    />
  );
};

// Main Content Area
interface SidebarMainProps {
  children: React.ReactNode;
  className?: string;
}

export const SidebarMain: React.FC<SidebarMainProps> = ({
  children,
  className,
}) => {
  const { isOpen } = useSidebar();

  return (
    <main
      className={cn(
        "flex-1 overflow-auto transition-all duration-300 ease-in-out",
        isOpen ? "ml-64" : "ml-16",
        className
      )}
    >
      {children}
    </main>
  );
};

// Predefined Navigation Items
export const navigationItems = {
  dashboard: {
    icon: <FiHome className="h-4 w-4" />,
    label: "Dashboard",
    href: "/dashboard",
  },
  projects: {
    icon: <FiCode className="h-4 w-4" />,
    label: "Projects",
    href: "/projects",
  },
  users: {
    icon: <FiUsers className="h-4 w-4" />,
    label: "Users",
    href: "/users",
  },
  database: {
    icon: <FiDatabase className="h-4 w-4" />,
    label: "Database",
    href: "/database",
  },
  storage: {
    icon: <FiFileText className="h-4 w-4" />,
    label: "Storage",
    href: "/storage",
  },
  api: {
    icon: <FiCode className="h-4 w-4" />,
    label: "API",
    href: "/api",
  },
  auth: {
    icon: <FiShield className="h-4 w-4" />,
    label: "Auth",
    href: "/auth",
  },
  settings: {
    icon: <FiSettings className="h-4 w-4" />,
    label: "Settings",
    href: "/settings",
  },
};
