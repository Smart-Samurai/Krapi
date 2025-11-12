/**
 * Example Form Component
 * 
 * Example form component demonstrating form usage with different types.
 * Supports registration, login, and project creation forms.
 * 
 * @module components/forms/ExampleForm
 * @example
 * <ExampleForm type="registration" onSubmit={handleSubmit} />
 */
import React from "react";

import { Form } from "./Form";
import { FormField } from "./FormField";

import { Button } from "@/components/ui/button";
import {
  userRegistrationSchema,
  projectCreationSchema,
  userLoginSchema,
  type UserRegistrationFormData,
  type ProjectCreationFormData,
  type UserLoginFormData,
} from "@/lib/forms";


/**
 * Example Form Props
 * 
 * @interface ExampleFormProps
 * @property {"registration" | "login" | "project"} type - Form type
 * @property {Function} onSubmit - Submit handler
 * @property {Record<string, unknown>} [defaultValues] - Default form values
 */
interface ExampleFormProps {
  type: "registration" | "login" | "project";
  onSubmit: (data: Record<string, unknown>) => void;
  defaultValues?: Record<string, unknown>;
}

/**
 * Example Form Component
 * 
 * Demonstrates form usage with different types (registration, login, project).
 * 
 * @param {ExampleFormProps} props - Component props
 * @returns {JSX.Element} Example form component
 * 
 * @example
 * <ExampleForm type="registration" onSubmit={handleSubmit} />
 */
export const ExampleForm: React.FC<ExampleFormProps> = ({
  type,
  onSubmit,
  defaultValues,
}) => {
  const renderForm = () => {
    switch (type) {
      case "registration":
        return (
          <Form
            schema={userRegistrationSchema}
            onSubmit={onSubmit as (data: UserRegistrationFormData) => void}
            defaultValues={defaultValues}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                name="firstName"
                label="First Name"
                type="text"
                placeholder="Enter your first name"
                required
                autoComplete="given-name"
              />

              <FormField
                name="lastName"
                label="Last Name"
                type="text"
                placeholder="Enter your last name"
                required
                autoComplete="family-name"
              />
            </div>

            <FormField
              name="email"
              label="Email Address"
              type="email"
              placeholder="Enter your email address"
              required
              autoComplete="email"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                name="password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                required
                autoComplete="new-password"
              />

              <FormField
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                placeholder="Confirm your password"
                required
                autoComplete="new-password"
              />
            </div>

            <FormField
              name="acceptTerms"
              label="I accept the terms and conditions"
              type="checkbox"
              required
            />

            <div className="flex justify-end">
              <Button type="submit" variant="default">
                Register
              </Button>
            </div>
          </Form>
        );

      case "login":
        return (
          <Form
            schema={userLoginSchema}
            onSubmit={onSubmit as (data: UserLoginFormData) => void}
            defaultValues={defaultValues}
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

            <FormField name="rememberMe" label="Remember me" type="checkbox" />

            <div className="flex justify-end">
              <Button type="submit" variant="default">
                Login
              </Button>
            </div>
          </Form>
        );

      case "project":
        return (
          <Form
            schema={projectCreationSchema}
            onSubmit={onSubmit as (data: ProjectCreationFormData) => void}
            defaultValues={defaultValues}
            className="space-y-6"
          >
            <FormField
              name="name"
              label="Project Name"
              type="text"
              placeholder="Enter project name"
              required
              autoComplete="organization"
            />

            <FormField
              name="description"
              label="Description"
              type="textarea"
              placeholder="Enter project description"
              autoComplete="off"
            />

            <FormField
              name="projectId"
              label="Project ID (Optional)"
              type="text"
              placeholder="Enter custom project ID"
              autoComplete="off"
            />

            <FormField
              name="isPublic"
              label="Make project public"
              type="checkbox"
            />

            <div className="flex justify-end">
              <Button type="submit" variant="default">
                Create Project
              </Button>
            </div>
          </Form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="border border-secondary  p-6 bg-background/50">
      <h3 className="text-base font-semibold mb-4 capitalize text-primary">
        {type} Form Example
      </h3>
      {renderForm()}
    </div>
  );
};
