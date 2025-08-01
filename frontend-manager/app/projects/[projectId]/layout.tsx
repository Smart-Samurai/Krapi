"use client";

import React from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  FiHome, 
  FiUsers, 
  FiSettings, 
  FiDatabase, 
  FiFile, 
  FiCode, 
  FiMail, 
  FiActivity, 
  FiKey 
} from "react-icons/fi";
import { cn } from "@/lib/utils";

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  const navigation = [
    {
      name: "Dashboard",
      href: `/projects/${projectId}`,
      icon: FiHome,
    },
    {
      name: "Users",
      href: `/projects/${projectId}/users`,
      icon: FiUsers,
    },
    {
      name: "Settings",
      href: `/projects/${projectId}/settings`,
      icon: FiSettings,
    },
    {
      name: "Collections",
      href: `/projects/${projectId}/collections`,
      icon: FiDatabase,
    },
    {
      name: "Files",
      href: `/projects/${projectId}/files`,
      icon: FiFile,
    },
    {
      name: "Functions",
      href: `/projects/${projectId}/functions`,
      icon: FiCode,
    },
    {
      name: "Email",
      href: `/projects/${projectId}/email`,
      icon: FiMail,
    },
    {
      name: "Logs",
      href: `/projects/${projectId}/logs`,
      icon: FiActivity,
    },
    {
      name: "API Keys",
      href: `/projects/${projectId}/api-keys`,
      icon: FiKey,
    },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Project Sidebar */}
      <div className="w-64 bg-surface border-r border-border">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text">Project Menu</h2>
          </div>
          
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-text/70 hover:text-text hover:bg-muted"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-border">
            <Link
              href="/projects"
              className="flex items-center gap-2 text-sm text-text/60 hover:text-text"
            >
              ← Back to Projects
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}