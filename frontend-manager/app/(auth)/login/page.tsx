"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, InfoBlock, IconButton } from "@/components/styled";
import { Form, FormField } from "@/components/forms";
import { z } from "zod";
import { FiMail, FiLock, FiEye, FiEyeOff, FiShield } from "react-icons/fi";
import { Checkbox } from "@/components/ui/checkbox";
import { createDefaultKrapi } from "@/lib/krapi";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const krapi = createDefaultKrapi();
      const result = await krapi.auth.login(data.email, data.password);

      if (result.success && result.token) {
        // Store user data if needed
        if (result.user) {
          localStorage.setItem("user", JSON.stringify(result.user));
        }

        // Store remember me preference
        if (data.rememberMe) {
          localStorage.setItem("rememberMe", "true");
        }

        // Redirect to dashboard after successful login
        router.push("/dashboard");
      } else {
        setError(result.error || "Invalid username or password");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <FiShield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-text mb-2">Welcome Back</h1>
          <p className="text-text/60">Sign in to your KRAPI admin account</p>
        </div>

        {/* Login Form */}
        <div className="bg-background border border-secondary rounded-lg p-8 shadow-lg">
          {error && (
            <InfoBlock title="Login Failed" variant="error" className="mb-6">
              {error}
            </InfoBlock>
          )}

          <Form
            schema={loginSchema}
            onSubmit={handleLogin}
            className="space-y-6"
          >
            <FormField
              name="email"
              label="Email Address"
              type="email"
              placeholder="Enter your email address"
              required
              autoComplete="email"
            />

            <FormField
              name="password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me"
                  className="rounded border-secondary text-primary focus:ring-primary"
                />
                <label
                  htmlFor="remember-me"
                  className="text-sm text-text/80 cursor-pointer"
                >
                  Remember me
                </label>
              </label>
              <Button variant="link" type="button" className="text-sm">
                Forgot password?
              </Button>
            </div>

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </Form>

          <div className="mt-6 pt-6 border-t border-secondary/50">
            <p className="text-center text-sm text-text/60">
              Don't have an account?{" "}
              <Button variant="link" className="text-sm">
                Contact your administrator
              </Button>
            </p>
          </div>
        </div>

        {/* Info Block */}
        <div className="mt-6">
          <InfoBlock
            title="Default Credentials"
            variant="info"
            className="bg-background border border-secondary"
          >
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text">Username:</span>
                <span className="text-text/80">admin</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-text">Password:</span>
                <span className="text-text/80">admin123</span>
              </div>
            </div>
          </InfoBlock>
        </div>
      </div>
    </div>
  );
}
