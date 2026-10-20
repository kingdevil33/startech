"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";
import { getNavForRole } from "@/config/navigation";

interface DashboardShellProps {
  children: React.ReactNode;
  role: string;
}

export function DashboardShell({ children, role }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const navSections = getNavForRole(role);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 lg:hidden transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar
          sections={navSections}
          collapsed={false}
          onToggle={() => setMobileOpen(false)}
        />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          sections={navSections}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-64"
        )}
      >
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
