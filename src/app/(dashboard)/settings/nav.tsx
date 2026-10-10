"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/privacy", label: "Privacy" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent-500 rounded-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
