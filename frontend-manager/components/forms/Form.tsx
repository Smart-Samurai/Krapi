import React from "react";
import {
  useForm,
  FormProvider,
  SubmitHandler,
  UseFormProps,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface FormProps<T extends z.ZodSchema> {
  schema: T;
  onSubmit: SubmitHandler<z.infer<T>>;
  defaultValues?: Partial<z.infer<T>> | undefined;
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
    resolver: zodResolver(schema as any),
    defaultValues: defaultValues as any,
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
