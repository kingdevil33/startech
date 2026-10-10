"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { NavSection } from "@/config/navigation";

interface SidebarProps {
  sections: NavSection[];
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ sections, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border shrink-0">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <div className="h-8 w-8 rounded-lg bg-accent-500 flex items-center justify-center shrink-0">
            <Star className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-heading text-lg font-bold text-sidebar-foreground whitespace-nowrap">
              Star<span className="text-accent-400">Tech</span>
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {section.label}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    item.href !== "/admin" &&
                    pathname.startsWith(item.href));
                const Icon = item.icon as LucideIcon;

                return (
                  <li key={item.title}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && (
                        <span className="truncate">{item.title}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="ml-auto inline-flex items-center rounded-full bg-accent-500 px-2 py-0.5 text-xs font-medium text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
