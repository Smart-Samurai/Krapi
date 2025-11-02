import React from "react";
import {
  useForm,
  FormProvider,
  SubmitHandler,
  UseFormProps,
} from "react-hook-form";
import { z } from "zod";

interface FormProps<T extends z.ZodSchema> {
  schema: T;
  onSubmit: SubmitHandler<z.infer<T>>;
  defaultValues?: z.infer<T> | Record<string, unknown> | undefined;
  children: React.ReactNode;
  className?: string;
  formProps?: Omit<UseFormProps<z.infer<T>>, "resolver" | "defaultValues">;
}

export function Form<T extends z.ZodSchema>({
  schema,
  onSubmit,
  defaultValues,
  children,
  className,
  formProps,
}: FormProps<T>) {
  const methods = useForm<z.infer<T>>({
    resolver: async (values, _context, _options) => {
      const result = schema.safeParse(values);
      if (result.success) {
        return { values: result.data, errors: {} };
      }
      return {
        values: {},
        errors: result.error.errors.reduce((acc, error) => {
          const path = error.path.join(".");
          acc[path] = {
            type: error.code,
            message: error.message,
          };
          return acc;
        }, {} as Record<string, { type: string; message: string }>),
      };
    },
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
