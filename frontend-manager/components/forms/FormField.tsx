"use client";

import React from "react";
import { useFormContext, FieldPath, FieldValues } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
  FormField as ShadcnFormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface FormFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  label?: string;
  description?: string;
  type?: "text" | "email" | "password" | "select" | "textarea" | "number" | "checkbox";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

export function FormField<T extends FieldValues>({
  name,
  label,
  description,
  type = "text",
  placeholder,
  options,
}: FormFieldProps<T>) {
  const form = useFormContext<T>();

  return (
    <ShadcnFormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label ? <FormLabel>{label}</FormLabel> : null}
          <FormControl>
            {type === "select" ? (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder={placeholder || `Select ${label || name}`} />
                </SelectTrigger>
                <SelectContent>
                  {options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : type === "textarea" ? (
              <Textarea
                placeholder={placeholder}
                {...field}
              />
            ) : type === "checkbox" ? (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            ) : (
              <Input
                type={type}
                placeholder={placeholder}
                {...field}
              />
            )}
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
