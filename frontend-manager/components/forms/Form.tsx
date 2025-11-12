/**
 * Form Component
 * 
 * Wrapper component for react-hook-form with Zod validation.
 * Provides form context and validation using Zod schemas.
 * 
 * @module components/forms/Form
 * @example
 * <Form schema={userSchema} onSubmit={handleSubmit}>
 *   <FormField name="email" />
 * </Form>
 */
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import {
  useForm,
  FormProvider,
  SubmitHandler,
  UseFormProps,
} from "react-hook-form";
import { z } from "zod";

/**
 * Form Props
 * 
 * @interface FormProps
 * @template T - Zod schema type
 * @property {T} schema - Zod validation schema
 * @property {SubmitHandler<z.infer<T>>} onSubmit - Submit handler
 * @property {z.infer<T> | Record<string, unknown>} [defaultValues] - Default form values
 * @property {ReactNode} children - Form fields
 * @property {string} [className] - Additional CSS classes
 * @property {Omit<UseFormProps<z.infer<T>>, "resolver" | "defaultValues">} [formProps] - Additional form props
 */
interface FormProps<T extends z.ZodSchema> {
  schema: T;
  onSubmit: SubmitHandler<z.infer<T>>;
  defaultValues?: z.infer<T> | Record<string, unknown> | undefined;
  children: React.ReactNode;
  className?: string;
  formProps?: Omit<UseFormProps<z.infer<T>>, "resolver" | "defaultValues">;
}

/**
 * Form Component
 * 
 * Form wrapper with Zod validation and react-hook-form integration.
 * 
 * @template T - Zod schema type
 * @param {FormProps<T>} props - Component props
 * @returns {JSX.Element} Form component
 * 
 * @example
 * <Form schema={userSchema} onSubmit={handleSubmit}>
 *   <FormField name="email" />
 * </Form>
 */
export function Form<T extends z.ZodSchema>({
  schema,
  onSubmit,
  defaultValues,
  children,
  className,
  formProps,
}: FormProps<T>) {
  const methods = useForm<z.infer<T>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: defaultValues as z.infer<T> | undefined,
    ...formProps,
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className={className}>
        {children}
      </form>
    </FormProvider>
  );
}

// Export the useForm hook for components that need direct access
export { useFormContext } from "react-hook-form";
