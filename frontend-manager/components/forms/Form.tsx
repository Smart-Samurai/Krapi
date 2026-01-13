"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm, FieldValues, DefaultValues } from "react-hook-form";
import { z } from "zod";

import { Form as ShadcnForm } from "@/components/ui/form";

interface FormProps<T extends FieldValues> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
  children: React.ReactNode;
  defaultValues?: DefaultValues<T>;
  className?: string;
}

export function Form<T extends FieldValues>({
  schema,
  onSubmit,
  children,
  defaultValues,
  className,
}: FormProps<T>) {
  const form = useForm<T>({
    // @ts-ignore - zodResolver type compatibility issue with generic types
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<T>,
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
  });

  return (
    <ShadcnForm {...form}>
      <form onSubmit={handleSubmit} className={className}>
        {children}
      </form>
    </ShadcnForm>
  );
}
