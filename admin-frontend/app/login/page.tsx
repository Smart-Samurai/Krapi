"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, Eye, EyeOff, Loader2 } from "lucide-react";
import { loginSchema, LoginFormData } from "@/lib/validations";
import axios, { AxiosError } from "axios";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Check if already authenticated and redirect
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // Handle successful login redirect with status messages
  useEffect(() => {
    if (loginSuccess) {
      const messages = [
        { message: "Authentication successful", delay: 500 },
        { message: "Loading user profile", delay: 800 },
        { message: "Preparing dashboard", delay: 1000 },
        { message: "Redirecting to dashboard...", delay: 1500 },
      ];

      let currentIndex = 0;

      const interval = setInterval(() => {
        if (currentIndex < messages.length) {
          setLoginStatus(messages[currentIndex].message);
          currentIndex++;
        } else {
          clearInterval(interval);
          router.push("/dashboard");
        }
      }, 700);

      return () => clearInterval(interval);
    }
  }, [loginSuccess, router]);

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
      // Simulate a slight delay to show the authentication process
      await new Promise((resolve) => setTimeout(resolve, 800));

      const success = await login(data.username, data.password);

      if (success) {
        setLoginStatus("Verifying credentials...");
        setLoginSuccess(true);
      } else {
        setError("Invalid username or password");
        setLoginStatus(null);
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginStatus(null);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (
          axiosError.code === "ERR_NETWORK" ||
          axiosError.code === "ECONNREFUSED"
        ) {
          setError(
            "Cannot connect to API server. Please check if the server is running."
          );
        } else if (axiosError.response?.status === 404) {
          setError(
            "API endpoint not found. Please check your API configuration."
          );
        } else {
          setError(`Login failed: ${axiosError.message}`);
        }
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      if (!loginSuccess) {
        setIsConnecting(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <LogIn className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Krapi Admin Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
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
                className={`relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
                  form.formState.errors.username
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
                placeholder="Username"
                disabled={
                  form.formState.isSubmitting || isConnecting || loginSuccess
                }
              />
              {form.formState.errors.username && (
                <p className="mt-1 text-sm text-red-600">
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
                className={`relative block w-full px-3 py-2 pr-10 border placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
                  form.formState.errors.password
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
                placeholder="Password"
                disabled={
                  form.formState.isSubmitting || isConnecting || loginSuccess
                }
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isConnecting || loginSuccess}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {form.formState.errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {loginStatus && (
            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex items-center">
                {loginSuccess ? (
                  <div className="flex items-center text-sm text-blue-700">
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    {loginStatus}
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-blue-700">
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    {loginStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={
                form.formState.isSubmitting || isConnecting || loginSuccess
              }
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting || loginSuccess ? (
                <span className="flex items-center">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  {loginSuccess ? "Signing in..." : "Authenticating..."}
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Default credentials:{" "}
              <span className="font-mono">admin / admin123</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
