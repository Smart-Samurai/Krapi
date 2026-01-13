/**
 * Login Page
 * 
 * Authentication page for admin users to sign in to the KRAPI admin dashboard.
 * 
 * @module app/(auth)/login/page
 * @example
 * // Automatically rendered at /login route
 */
"use client";
/* eslint-disable no-console */

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useReduxAuth } from "@/contexts/redux-auth-context";
import { clearError } from "@/store/authSlice";
import { useAppDispatch } from "@/store/hooks";

/**
 * Login Form Schema
 * 
 * @constant {z.ZodObject}
 */
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

/**
 * Login Form Data Type
 * 
 * @typedef {z.infer<typeof loginSchema>} LoginFormData
 */
type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Login Page Component
 * 
 * Provides login form for admin authentication.
 * Handles username/password login with optional "remember me" functionality.
 * Redirects to dashboard on successful login.
 * 
 * @returns {JSX.Element} Login page with authentication form
 */
export default function LoginPage() {
  const _router = useRouter();
  const { login, loading, error } = useReduxAuth();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // Clear error when user starts typing
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name && error) {
        // Clear error when user starts editing the form
        dispatch(clearError());
      }
    });
    return () => subscription.unsubscribe();
  }, [form, error, dispatch]);

  const handleLogin = async (data: LoginFormData) => {
    try {
      // Clear any previous errors before attempting login
      dispatch(clearError());
      
      // Store remember me preference before login
      if (data.rememberMe) {
        localStorage.setItem("rememberMe", "true");
      }

      // The login function handles redirect internally
      // Errors are handled by Redux and will be displayed via the error state
      await login(data.username, data.password);
    } catch (err) {
      // Error handling is managed by Redux - error will be set in state
      // This catch is just to prevent unhandled promise rejection
      console.error("Login error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary  flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-base font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive" className="mb-6" data-testid="login-error">
                <AlertDescription>{String(error)}</AlertDescription>
              </Alert>
            ) : null}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleLogin)}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="text"
                              placeholder="Enter your username"
                              className="pl-10"
                              disabled={loading}
                              data-testid="login-username"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className="pl-10 pr-10"
                              disabled={loading}
                              data-testid="login-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={loading}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={loading}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Remember me</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="link"
                    className="px-0"
                    disabled={loading}
                    onClick={() => {
                      // Forgot password functionality will be implemented in a future update
                      toast.info("Forgot password functionality coming soon!");
                    }}
                  >
                    Forgot password?
                  </Button>
                </div>

                <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit">
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-base text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Button
                  variant="link"
                  className="px-0"
                  disabled={loading}
                  asChild
                >
                  <Link href="/register">Sign up</Link>
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
