"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Suppress hydration warnings in development
    if (process.env.NODE_ENV === "development") {
      const originalError = console.error;
      console.error = (...args) => {
        const message = args[0];
        if (
          typeof message === "string" &&
          (message.includes("Hydration") ||
            message.includes("hydration") ||
            message.includes(
              "Text content does not match server-rendered HTML"
            ) ||
            message.includes("Expected server HTML to contain a matching"))
        ) {
          return; // Suppress hydration warnings
        }
        originalError.apply(console, args);
      };
    }
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
