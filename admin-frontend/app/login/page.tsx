"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, Eye, EyeOff, Loader2 } from "lucide-react";
import { loginSchema, LoginFormData } from "@/lib/validations";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);

  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Check if already authenticated and redirect
  useEffect(() => {
    if (isAuthenticated) {
      console.log(
        "🔐 Login page: User is authenticated, redirecting to dashboard"
      );
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const handleSubmit: SubmitHandler<LoginFormData> = async (data) => {
    setError("");
    setIsConnecting(true);
    setLoginStatus("Authenticating...");

    try {
      console.log("🔐 Attempting login with AuthContext...");
      console.log("🔐 Credentials:", {
        username: data.username,
        password: data.password ? "***" : "missing",
      });

      // Use AuthContext login function
      const success = await login(data.username, data.password);

      if (success) {
        console.log("✅ Login successful via AuthContext");
        setLoginStatus("Login successful! Redirecting...");
        // AuthContext will handle the redirect automatically
      } else {
        console.error("❌ Login failed via AuthContext");
        setError("Invalid username or password");
        setLoginStatus(null);
        setIsConnecting(false);
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      setLoginStatus(null);
      setIsConnecting(false);

      if (error instanceof Error) {
        if (
          error.message.includes("Network Error") ||
          error.message.includes("ECONNREFUSED")
        ) {
          setError(
            "Cannot connect to API server. Please check if the server is running."
          );
        } else if (error.message.includes("404")) {
          setError(
            "API endpoint not found. Please check your API configuration."
          );
        } else if (error.message.includes("401")) {
          setError(
            "Invalid username or password. Please check your credentials."
          );
        } else {
          setError(`Login failed: ${error.message}`);
        }
      } else {
        setError("Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-background-200 dark:bg-background-200">
            <LogIn className="h-6 w-6 text-text dark:text-text" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text dark:text-text">
            Krapi Admin Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-text-600 dark:text-text-600">
            Sign in to manage your content
          </p>
        </div>

        <form
          className="mt-8 space-y-6"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                type="text"
                {...form.register("username")}
                className={`relative block w-full px-3 py-2 border placeholder-text-500 text-text dark:text-text bg-background-50 dark:bg-background-200 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm ${
                  form.formState.errors.username
                    ? "border-red-500"
                    : "border-background-300 dark:border-background-300"
                }`}
                placeholder="Username"
                disabled={form.formState.isSubmitting || isConnecting}
              />
              {form.formState.errors.username && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...form.register("password")}
                className={`relative block w-full px-3 py-2 pr-10 border placeholder-text-500 text-text dark:text-text bg-background-50 dark:bg-background-200 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm ${
                  form.formState.errors.password
                    ? "border-red-500"
                    : "border-background-300 dark:border-background-300"
                }`}
                placeholder="Password"
                disabled={form.formState.isSubmitting || isConnecting}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isConnecting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-text-400" />
                ) : (
                  <Eye className="h-4 w-4 text-text-400" />
                )}
              </button>
              {form.formState.errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-100 dark:bg-red-900 p-4">
              <div className="text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          )}

          {loginStatus && (
            <div className="rounded-md bg-background-200 dark:bg-background-200 p-4">
              <div className="flex items-center">
                <div className="flex items-center text-sm text-text dark:text-text">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  {loginStatus}
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={form.formState.isSubmitting || isConnecting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-700 dark:bg-primary dark:hover:bg-primary-300 dark:text-background-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <span className="flex items-center">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Authenticating...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-text-600">
              Default credentials:{" "}
              <span className="font-mono">admin / admin123</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
