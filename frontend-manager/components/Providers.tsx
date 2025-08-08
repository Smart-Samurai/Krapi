"use client";

import { ReduxAuthProvider } from "@/contexts/redux-auth-context";
import { ThemeProvider } from "next-themes";
import { useEffect, useRef } from "react";
import { AuthErrorBoundaryWrapper } from "@/components/auth-error-boundary";
import { Provider } from "react-redux";
import { store } from "@/store";
import uiReducer from "@/store/uiSlice";
import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "@/store/authSlice";

export function Providers({ children }: { children: React.ReactNode }) {
  const hasSetupErrorHandling = useRef(false);

  useEffect(() => {
    // Dynamically extend reducer map with ui slice to avoid SSR module timing issues
    const rootReducer = combineReducers({ auth: authReducer, ui: uiReducer });
    store.replaceReducer(rootReducer);
  }, []);

  useEffect(() => {
    // Suppress hydration warnings in development
    if (
      process.env.NODE_ENV === "development" &&
      !hasSetupErrorHandling.current
    ) {
      hasSetupErrorHandling.current = true;
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
    <Provider store={store}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ReduxAuthProvider>
          <AuthErrorBoundaryWrapper>{children}</AuthErrorBoundaryWrapper>
        </ReduxAuthProvider>
      </ThemeProvider>
    </Provider>
  );
}
