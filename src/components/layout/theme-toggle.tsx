"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Monitor className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => {
        if (theme === "light") setTheme("dark");
        else if (theme === "dark") setTheme("system");
        else setTheme("light");
      }}
      aria-label={`Current theme: ${theme}. Click to switch.`}
    >
      {theme === "light" && <Sun className="h-4 w-4 text-electric-500" />}
      {theme === "dark" && <Moon className="h-4 w-4 text-accent-400" />}
      {theme === "system" && <Monitor className="h-4 w-4" />}
    </Button>
  );
}
