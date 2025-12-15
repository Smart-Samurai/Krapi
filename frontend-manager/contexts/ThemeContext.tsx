/**
 * Theme Context
 * 
 * Provides theme management (light/dark) for the application.
 * Persists theme preference in localStorage.
 * 
 * @module contexts/ThemeContext
 * @example
 * const { theme, toggleTheme } = useTheme();
 */
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * Theme Type
 * 
 * @typedef {"light" | "dark"} Theme
 */
type Theme = "light" | "dark";

/**
 * Theme Context Type
 * 
 * @interface ThemeContextType
 * @property {Theme} theme - Current theme
 * @property {Function} toggleTheme - Toggle between light and dark themes
 * @property {Function} setTheme - Set theme directly
 */
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Get initial theme from localStorage or system preference
 * 
 * @returns {Theme} Initial theme value
 */
function getInitialTheme(): Theme {
  // This runs on the client only
  if (typeof window !== "undefined") {
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme) {
      return savedTheme;
    }
    
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }
  
  return "light";
}

/**
 * Theme Provider Component
 * 
 * Provides theme context to the application.
 * Manages theme state and applies theme to document root.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Theme provider with context
 * 
 * @example
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Apply theme to document
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      // Save theme preference
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", theme);
      }
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Always render the provider to avoid breaking the context chain
  // Use the initial theme value until mounted to prevent hydration issues
  return (
    <ThemeContext.Provider value={{ theme: mounted ? theme : getInitialTheme(), toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Use Theme Hook
 * 
 * Hook to access theme context.
 * 
 * @returns {ThemeContextType} Theme context value
 * @throws {Error} If used outside ThemeProvider
 * 
 * @example
 * const { theme, toggleTheme } = useTheme();
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
