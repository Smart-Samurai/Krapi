"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, InfoBlock, IconButton } from "@/components/styled";
import { Form, FormField } from "@/components/forms";
import { z } from "zod";
import { FiMail, FiLock, FiEye, FiEyeOff, FiShield } from "react-icons/fi";
import { useAuth } from "@/contexts/auth-context";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Store remember me preference before login
      if (data.rememberMe) {
        localStorage.setItem("rememberMe", "true");
      }

      // The login function handles redirect internally
      await login(data.email, data.password);
    } catch (err) {
      console.error("Login error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <FiShield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text">Welcome back</h1>
          <p className="text-text/60 mt-2">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-background border border-secondary rounded-lg p-8">
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
            <div className="space-y-4">
              <FormField
                name="email"
                label="Email"
                type="email"
                placeholder="Enter your email"
                icon={FiMail}
                required
              />

              <div className="relative">
                <FormField
                  name="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  icon={FiLock}
                  required
                />
                <IconButton
                  icon={showPassword ? FiEyeOff : FiEye}
                  variant="ghost"
                  size="sm"
                  className="absolute right-3 top-[34px]"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <FormField
                name="rememberMe"
                label="Remember me"
                type="checkbox"
              />
            </div>

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                "Sign in"
              )}
            </Button>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text/60">
              Don't have an account?{" "}
              <span className="text-primary">
                Contact administrator
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-text/40">
            © 2024 KRAPI. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
