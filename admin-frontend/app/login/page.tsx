"use client";

import React, { useState } from "react";
import { Button, Input, InfoBlock, IconButton } from "@/components/styled";
import { Form, FormField } from "@/components/forms";
import { z } from "zod";
import { FiMail, FiLock, FiEye, FiEyeOff, FiShield } from "react-icons/fi";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Login attempt:", data);
    setIsLoading(false);
    // Redirect to dashboard after successful login
    window.location.href = "/dashboard";
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
          <Form
            schema={loginSchema}
            onSubmit={handleLogin}
            className="space-y-6"
          >
            <FormField
              name="email"
              label="Email Address"
              type="email"
              placeholder="Enter your email"
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
                <input
                  type="checkbox"
                  className="rounded border-secondary text-primary focus:ring-primary"
                />
                <span className="text-sm text-text/80">Remember me</span>
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
                <span className="font-medium text-text">Email:</span>
                <span className="text-text/80">admin@krapi.local</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-text">Password:</span>
                <span className="text-text/80">admin</span>
              </div>
            </div>
          </InfoBlock>
        </div>
      </div>
    </div>
  );
}
