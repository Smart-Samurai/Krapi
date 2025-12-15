/**
 * Theme Toggle Component
 * 
 * Button component for toggling between light and dark themes.
 * Uses next-themes for theme management.
 * 
 * @module components/ThemeToggle
 * @example
 * <ThemeToggle />
 */
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

/**
 * Theme Toggle Component
 * 
 * Toggles between light and dark themes.
 * 
 * @returns {JSX.Element} Theme toggle button
 * 
 * @example
 * <ThemeToggle />
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="h-8 w-8"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
