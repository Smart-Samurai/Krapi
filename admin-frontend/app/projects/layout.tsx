"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const params = useParams();
  const projectId = params?.projectId as string;

  return (
    <ProtectedRoute>
      <div className="h-screen bg-background-50">
        {/* Desktop Layout */}
        <div className="hidden lg:flex lg:h-full">
          {/* Sidebar */}
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            projectId={projectId}
          />

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <Header projectId={projectId} />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="mx-auto max-w-7xl">{children}</div>
              </div>
            </main>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="flex h-full flex-col lg:hidden">
          {/* Mobile Header */}
          <Header
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            isMobileMenuOpen={mobileMenuOpen}
            projectId={projectId}
          />

          {/* Mobile Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4">{children}</div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
