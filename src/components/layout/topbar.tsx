"use client";

import Link from "next/link";
import {
  Bell,
  Search,
  Menu,
  LogOut,
  User as UserIcon,
  Settings,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { logoutAction } from "@/app/(auth)/actions";
import { useUser } from "@/hooks/use-user";
import { useState, useRef, useEffect } from "react";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useUser();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 gap-4 border-b border-border bg-background/95 backdrop-blur-sm px-4 sm:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Search */}
      <div className="hidden sm:flex flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses, lessons..."
            className="pl-10 h-9 bg-muted/50 border-none"
          />
        </div>
      </div>

      <div className="flex-1 sm:flex-none" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link href="/notifications">
            <Bell className="h-5 w-5" />
            {/* Notification dot */}
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-electric-500" />
            <span className="sr-only">Notifications</span>
          </Link>
        </Button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={user?.avatar_url || undefined}
                alt={user?.full_name || "User"}
              />
              <AvatarFallback className="bg-primary-600 text-white text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-none">
                {user?.full_name || "User"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                {user?.role || "student"}
              </p>
            </div>
            <ChevronDown className="hidden md:block h-4 w-4 text-muted-foreground" />
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover shadow-xl animate-scale-in origin-top-right">
              <div className="p-3 border-b border-border">
                <p className="font-medium text-sm">
                  {user?.full_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user?.email}
                </p>
              </div>
              <div className="p-1.5">
                <Link
                  href="/settings/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  Profile
                </Link>
                <Link
                  href="/settings/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </Link>
              </div>
              <div className="p-1.5 border-t border-border">
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
