import React from "react";
import { useFormContext } from "react-hook-form";
import {
  Label,
  TextInput,
  NumberInput,
  EmailInput,
  PasswordInput,
  Textarea,
  Select,
  Radio,
  Checkbox,
} from "@/components/styled";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  name: string;
  label?: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio"
    | "date";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  className?: string;
  inputSize?: "sm" | "md" | "lg";
  variant?: "default" | "error" | "success";
  autoComplete?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
  options = [],
  className,
  inputSize = "md",
  variant = "default",
  autoComplete,
}) => {
  const {
    register,
    formState: { errors },
    watch,
  } = useFormContext();

  const error = errors[name];
  const value = watch(name);
  const hasError = !!error;
  const isSuccess = !hasError && value && value.length > 0;

  const inputVariant = hasError ? "error" : isSuccess ? "success" : variant;

  const renderInput = () => {
    const commonProps = {
      ...register(name),
      placeholder,
      disabled,
      className: cn(className),
      inputSize,
      variant: inputVariant,
      autoComplete,
    };

    switch (type) {
      case "textarea":
        return <Textarea {...commonProps} />;

      case "select":
        return <Select {...commonProps} options={options} />;

      case "checkbox":
        return (
          <Checkbox
            {...register(name)}
            label={label || ""}
            disabled={disabled}
            error={hasError}
          />
        );

      case "radio":
        return (
          <div className="space-y-2">
            {options.map((option) => (
              <Radio
                key={option.value}
                {...register(name)}
                value={option.value}
                label={option.label}
                disabled={disabled}
                error={hasError}
              />
            ))}
          </div>
        );

      case "email":
        return <EmailInput {...commonProps} />;

      case "password":
        return <PasswordInput {...commonProps} />;

      case "number":
        return <NumberInput {...commonProps} />;

      default:
        return <TextInput {...commonProps} />;
    }
  };

  return (
    <div className="space-y-2">
      {label && type !== "checkbox" && type !== "radio" && (
        <Label htmlFor={name} required={required}>
          {label}
        </Label>
      )}

      {renderInput()}

      {hasError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error.message as string}
        </p>
      )}
    </div>
  );
};
